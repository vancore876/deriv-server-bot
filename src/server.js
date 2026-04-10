import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { state } from "./state.js";
import { presets } from "./presets.js";
import { initDerivClient, connectDeriv, sendToDeriv, closeDeriv } from "./derivClient.js";
import { handleTickForBot, resetStake, applyStakeResult } from "./botEngine.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

let clients = [];
let socketReady = false;
let wantedMarket = "R_25";
const MINI_MARKETS = ["R_10", "R_25", "R_50"];

function broadcast(data) {
  const payload = JSON.stringify(data);
  clients = clients.filter((res) => {
    try {
      res.write(`data: ${payload}\n\n`);
      return true;
    } catch {
      return false;
    }
  });
}

function snapshot() {
  return {
    connected: state.connected,
    authorized: state.authorized,
    running: state.running,
    market: state.settings.market,
    signal: state.lastSignalText,
    balance: state.balance,
    sessionProfit: state.sessionProfit,
    peakProfit: state.peakProfit,
    tradeCount: state.tradeCount,
    wins: state.wins,
    losses: state.losses,
    lossStreak: state.lossStreak,
    currentStake: state.currentStake,
    contractType: state.contractType,
    sizingMode: state.sizingMode,
    settings: state.settings,
    recentTrades: state.recentTrades.slice(0, 20)
  };
}

function subscribeAllNeededTicks() {
  if (!socketReady) return;
  const allMarkets = [...new Set([wantedMarket, ...MINI_MARKETS])];
  for (const symbol of allMarkets) {
    sendToDeriv({ ticks: symbol, subscribe: 1 });
    broadcast({ type: "log", message: `Subscribed to ${symbol}` });
  }
}

function buildContractType(signal) {
  return signal;
}

initDerivClient({
  derivAppId: process.env.DERIV_APP_ID || "1089",
  onStatus: (msg) => {
    state.connected = msg === "connected";
    socketReady = msg === "connected";

    if (msg === "connected") {
      broadcast({ type: "log", message: "Deriv socket connected" });
      if (state.token) {
        sendToDeriv({ authorize: state.token });
      } else {
        subscribeAllNeededTicks();
      }
    }

    if (msg === "closed") {
      socketReady = false;
      state.authorized = false;
      state.running = false;
      broadcast({ type: "log", message: "Deriv socket closed" });
    }

    broadcast({ type: "snapshot", data: snapshot() });
  },
  onError: (message) => {
    broadcast({ type: "error", message });
  },
  onMessage: (data) => {
    if (data.error) {
      broadcast({ type: "error", message: `${data.error.code}: ${data.error.message}` });
      state.tradeInProgress = false;
      return;
    }

    if (data.msg_type === "authorize" && data.authorize) {
      state.authorized = true;
      state.balance = Number(data.authorize.balance || 0);
      broadcast({ type: "log", message: "Authorized with Deriv" });
      subscribeAllNeededTicks();
      broadcast({ type: "snapshot", data: snapshot() });
      return;
    }

    if (data.msg_type === "tick" && data.tick) {
      const price = Number(data.tick.quote);
      const symbol = data.tick.symbol;

      broadcast({
        type: "tick",
        symbol,
        quote: price,
        epoch: data.tick.epoch
      });

      if (symbol === state.settings.market) {
        const signal = handleTickForBot(state, price);
        broadcast({ type: "snapshot", data: snapshot() });

        if (signal && !state.tradeInProgress && state.running) {
          state.tradeInProgress = true;
          state.lastTradeTime = Date.now();
          state.tradeCount += 1;

          const stakeUsed = Number(state.currentStake);
          const contractType = buildContractType(signal);

          state.lastTradeMeta = {
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now(),
            direction: signal,
            contractType,
            stake: stakeUsed,
            signalReason: state.lastSignalText,
            market: state.settings.market
          };

          sendToDeriv({
            buy: 1,
            price: stakeUsed,
            parameters: {
              amount: stakeUsed,
              basis: "stake",
              contract_type: contractType,
              currency: state.settings.currency,
              duration: state.settings.duration,
              duration_unit: state.settings.durationUnit,
              symbol: state.settings.market
            }
          });

          broadcast({
            type: "log",
            message: `Trade sent: ${signal} | Stake ${stakeUsed.toFixed(2)} | ${state.lastSignalText}`
          });

          broadcast({ type: "snapshot", data: snapshot() });
        }
      }
      return;
    }

    if (data.msg_type === "buy" && data.buy?.contract_id) {
      state.contractId = data.buy.contract_id;
      sendToDeriv({
        proposal_open_contract: 1,
        contract_id: state.contractId,
        subscribe: 1
      });
      broadcast({ type: "log", message: `Watching contract ${state.contractId}` });
      return;
    }

    if (data.msg_type === "proposal_open_contract" && data.proposal_open_contract?.is_sold) {
      const c = data.proposal_open_contract;
      const profit = Number(c.profit || 0);
      const result = profit > 0 ? "WIN" : "LOSS";

      state.sessionProfit += profit;
      state.peakProfit = Math.max(state.peakProfit, state.sessionProfit);
      state.balance = Number(c.balance_after || state.balance);
      state.tradeInProgress = false;
      state.contractId = null;

      if (result === "WIN") {
        state.wins += 1;
        state.lossStreak = 0;
      } else {
        state.losses += 1;
        state.lossStreak += 1;
        state.blockedUntil = Date.now() + state.settings.reentryBlockSeconds * 1000;
        if (state.lossStreak >= state.settings.pauseAfterLosses) {
          state.pauseUntil = Date.now() + state.settings.pauseSeconds * 1000;
        }
      }

      const settledTrade = {
        time: state.lastTradeMeta?.time || new Date().toLocaleTimeString(),
        direction: state.lastTradeMeta?.direction || c.contract_type || "-",
        contractType: state.lastTradeMeta?.contractType || c.contract_type || "-",
        result,
        profit,
        stake: state.lastTradeMeta?.stake ?? state.currentStake,
        market: state.lastTradeMeta?.market || state.settings.market,
        reason: state.lastTradeMeta?.signalReason || "-"
      };

      state.recentTrades.unshift(settledTrade);
      state.recentTrades = state.recentTrades.slice(0, 20);

      applyStakeResult(state, result);

      broadcast({
        type: "log",
        message: `Trade settled: ${result} | Profit ${profit.toFixed(2)} | Session P&L ${state.sessionProfit.toFixed(2)}`
      });

      broadcast({ type: "snapshot", data: snapshot() });
      return;
    }
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "deriv-server-bot", port: PORT });
});

app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.push(res);
  res.write(`data: ${JSON.stringify({ type: "snapshot", data: snapshot() })}\n\n`);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
  });
});

app.post("/api/connect", (req, res) => {
  const { token } = req.body;
  state.token = token || "";
  connectDeriv();
  res.json({ ok: true });
});

app.post("/api/settings", (req, res) => {
  state.settings = { ...state.settings, ...req.body.settings };
  state.sizingMode = req.body.sizingMode || state.sizingMode;
  state.contractType = req.body.contractType || state.contractType;
  state.settings.market = req.body.settings?.market || state.settings.market;
  wantedMarket = state.settings.market;

  resetStake(state);
  broadcast({ type: "snapshot", data: snapshot() });
  res.json({ ok: true, settings: state.settings });
});

app.post("/api/preset", (req, res) => {
  const { preset } = req.body;
  if (!presets[preset]) {
    return res.status(400).json({ ok: false, error: "Invalid preset" });
  }
  state.settings = { ...state.settings, ...presets[preset] };
  resetStake(state);
  broadcast({ type: "snapshot", data: snapshot() });
  res.json({ ok: true, settings: state.settings });
});

app.post("/api/ticks/start", (req, res) => {
  const { symbol } = req.body;
  wantedMarket = symbol || state.settings.market;
  state.settings.market = wantedMarket;

  if (!state.connected) {
    return res.json({ ok: true, message: "Market saved; will subscribe after connect", symbol: wantedMarket });
  }

  subscribeAllNeededTicks();
  res.json({ ok: true, symbol: wantedMarket });
});

app.post("/api/bot/start", (req, res) => {
  state.running = true;
  state.tradeInProgress = false;
  state.lossStreak = 0;
  resetStake(state);

  broadcast({ type: "log", message: "Bot started" });
  broadcast({ type: "snapshot", data: snapshot() });
  res.json({ ok: true });
});

app.post("/api/bot/stop", (req, res) => {
  state.running = false;
  state.tradeInProgress = false;
  broadcast({ type: "log", message: "Bot stopped" });
  broadcast({ type: "snapshot", data: snapshot() });
  res.json({ ok: true });
});

app.post("/api/reset-session", (req, res) => {
  state.sessionProfit = 0;
  state.peakProfit = 0;
  state.tradeCount = 0;
  state.wins = 0;
  state.losses = 0;
  state.lossStreak = 0;
  state.tradeInProgress = false;
  state.contractId = null;
  state.lastTradeMeta = null;
  state.recentTrades = [];
  resetStake(state);

  broadcast({ type: "log", message: "Session reset" });
  broadcast({ type: "snapshot", data: snapshot() });
  res.json({ ok: true });
});

app.post("/api/disconnect", (req, res) => {
  closeDeriv();
  socketReady = false;
  state.connected = false;
  state.authorized = false;
  state.running = false;
  broadcast({ type: "log", message: "Disconnected from Deriv" });
  broadcast({ type: "snapshot", data: snapshot() });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});