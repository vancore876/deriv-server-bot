import WebSocket from "ws";
import { computeSignal, updateIndicators } from "./strategy.js";

function clampStake(state, value) {
  const minStake = Math.max(0.35, Number(state.settings.minStake || 0.35));
  const maxStake = Math.max(minStake, Number(state.settings.maxStake || minStake));
  return Math.round(Math.max(minStake, Math.min(maxStake, value)) * 100) / 100;
}

function resetStake(state) {
  state.currentStake = clampStake(state, state.settings.baseStake);
}

function applyStakeResult(state, result) {
  if (state.sizingMode === "fixed") {
    resetStake(state);
    return;
  }

  if (state.sizingMode === "anti_martingale") {
    let nextStake = state.currentStake;
    if (result === "WIN") nextStake *= Number(state.settings.winMultiplier || 1);
    else nextStake *= Number(state.settings.lossMultiplier || 1);
    state.currentStake = clampStake(state, nextStake);
    return;
  }

  resetStake(state);
}

function canTradeNow(state) {
  const cooldown = Math.round(state.settings.cooldownMs * (1 + state.lossStreak * 0.8));
  return Date.now() - state.lastTradeTime >= cooldown;
}

function isPaused(state) {
  return Date.now() < state.pauseUntil || Date.now() < state.blockedUntil;
}

export class DerivSession {
  constructor(state, emit, appId = "1089") {
    this.state = state;
    this.emit = emit;
    this.appId = appId;
    this.ws = null;
    this.socketReady = false;
    this.wantedMarket = state.settings.market;
    this.miniMarkets = ["R_10", "R_25", "R_50"];
  }

  snapshot() {
    return {
      connected: this.state.connected,
      authorized: this.state.authorized,
      running: this.state.running,
      market: this.state.settings.market,
      signal: this.state.lastSignalText,
      balance: this.state.balance,
      sessionProfit: this.state.sessionProfit,
      peakProfit: this.state.peakProfit,
      tradeCount: this.state.tradeCount,
      wins: this.state.wins,
      losses: this.state.losses,
      lossStreak: this.state.lossStreak,
      currentStake: this.state.currentStake,
      contractType: this.state.contractType,
      sizingMode: this.state.sizingMode,
      settings: this.state.settings,
      recentTrades: this.state.recentTrades.slice(0, 20)
    };
  }

  broadcast(type, payload = {}) {
    this.emit({ type, ...payload });
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  subscribeAllNeededTicks() {
    if (!this.socketReady) return;
    const markets = [...new Set([this.wantedMarket, ...this.miniMarkets])];
    for (const symbol of markets) {
      this.send({ ticks: symbol, subscribe: 1 });
      this.broadcast("log", { message: `Subscribed to ${symbol}` });
    }
  }

  connect(token) {
    this.state.token = token || this.state.token || "";

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`);

    this.ws.on("open", () => {
      this.state.connected = true;
      this.socketReady = true;
      this.broadcast("log", { message: "Deriv socket connected" });

      if (this.state.token) {
        this.send({ authorize: this.state.token });
      } else {
        this.subscribeAllNeededTicks();
      }

      this.broadcast("snapshot", { data: this.snapshot() });
    });

    this.ws.on("close", () => {
      this.socketReady = false;
      this.state.connected = false;
      this.state.authorized = false;
      this.state.running = false;
      this.broadcast("log", { message: "Deriv socket closed" });
      this.broadcast("snapshot", { data: this.snapshot() });
    });

    this.ws.on("error", (err) => {
      this.broadcast("error", { message: err.message });
    });

    this.ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        this.handleMessage(data);
      } catch (err) {
        this.broadcast("error", { message: err.message });
      }
    });
  }

  handleMessage(data) {
    if (data.error) {
      this.broadcast("error", { message: `${data.error.code}: ${data.error.message}` });
      this.state.tradeInProgress = false;
      return;
    }

    if (data.msg_type === "authorize" && data.authorize) {
      this.state.authorized = true;
      this.state.balance = Number(data.authorize.balance || 0);
      this.broadcast("log", { message: "Authorized with Deriv" });
      this.subscribeAllNeededTicks();
      this.broadcast("snapshot", { data: this.snapshot() });
      return;
    }

    if (data.msg_type === "tick" && data.tick) {
      const price = Number(data.tick.quote);
      const symbol = data.tick.symbol;

      this.broadcast("tick", {
        symbol,
        quote: price,
        epoch: data.tick.epoch
      });

      if (symbol === this.state.settings.market) {
        const signal = this.handleTickForBot(price);
        this.broadcast("snapshot", { data: this.snapshot() });

        if (signal && !this.state.tradeInProgress && this.state.running) {
          this.placeTrade(signal);
        }
      }
      return;
    }

    if (data.msg_type === "buy" && data.buy?.contract_id) {
      this.state.contractId = data.buy.contract_id;
      this.send({
        proposal_open_contract: 1,
        contract_id: this.state.contractId,
        subscribe: 1
      });
      this.broadcast("log", { message: `Watching contract ${this.state.contractId}` });
      return;
    }

    if (data.msg_type === "proposal_open_contract" && data.proposal_open_contract?.is_sold) {
      const c = data.proposal_open_contract;
      const profit = Number(c.profit || 0);
      const result = profit > 0 ? "WIN" : "LOSS";

      this.state.sessionProfit += profit;
      this.state.peakProfit = Math.max(this.state.peakProfit, this.state.sessionProfit);
      this.state.balance = Number(c.balance_after || this.state.balance);
      this.state.tradeInProgress = false;
      this.state.contractId = null;

      if (result === "WIN") {
        this.state.wins += 1;
        this.state.lossStreak = 0;
      } else {
        this.state.losses += 1;
        this.state.lossStreak += 1;
        this.state.blockedUntil = Date.now() + this.state.settings.reentryBlockSeconds * 1000;
        if (this.state.lossStreak >= this.state.settings.pauseAfterLosses) {
          this.state.pauseUntil = Date.now() + this.state.settings.pauseSeconds * 1000;
        }
      }

      const settledTrade = {
        time: this.state.lastTradeMeta?.time || new Date().toLocaleTimeString(),
        direction: this.state.lastTradeMeta?.direction || c.contract_type || "-",
        contractType: this.state.lastTradeMeta?.contractType || c.contract_type || "-",
        result,
        profit,
        stake: this.state.lastTradeMeta?.stake ?? this.state.currentStake,
        market: this.state.lastTradeMeta?.market || this.state.settings.market,
        reason: this.state.lastTradeMeta?.signalReason || "-"
      };

      this.state.recentTrades.unshift(settledTrade);
      this.state.recentTrades = this.state.recentTrades.slice(0, 20);

      applyStakeResult(this.state, result);

      this.broadcast("log", {
        message: `Trade settled: ${result} | Profit ${profit.toFixed(2)} | Session P&L ${this.state.sessionProfit.toFixed(2)}`
      });

      this.broadcast("snapshot", { data: this.snapshot() });
    }
  }

  handleTickForBot(price) {
    updateIndicators(this.state, price);

    if (!this.state.running || this.state.tradeInProgress || isPaused(this.state) || !canTradeNow(this.state)) {
      return null;
    }

    return computeSignal(this.state);
  }

  placeTrade(signal) {
    this.state.tradeInProgress = true;
    this.state.lastTradeTime = Date.now();
    this.state.tradeCount += 1;

    const stakeUsed = Number(this.state.currentStake);
    const contractType = signal;

    this.state.lastTradeMeta = {
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      direction: signal,
      contractType,
      stake: stakeUsed,
      signalReason: this.state.lastSignalText,
      market: this.state.settings.market
    };

    this.send({
      buy: 1,
      price: stakeUsed,
      parameters: {
        amount: stakeUsed,
        basis: "stake",
        contract_type: contractType,
        currency: this.state.settings.currency,
        duration: this.state.settings.duration,
        duration_unit: this.state.settings.durationUnit,
        symbol: this.state.settings.market
      }
    });

    this.broadcast("log", {
      message: `Trade sent: ${signal} | Stake ${stakeUsed.toFixed(2)} | ${this.state.lastSignalText}`
    });

    this.broadcast("snapshot", { data: this.snapshot() });
  }

  startTicks(symbol) {
    this.wantedMarket = symbol || this.state.settings.market;
    this.state.settings.market = this.wantedMarket;

    if (!this.state.connected) {
      return { ok: true, message: "Market saved; will subscribe after connect", symbol: this.wantedMarket };
    }

    this.subscribeAllNeededTicks();
    return { ok: true, symbol: this.wantedMarket };
  }

  updateSettings({ settings, sizingMode, contractType }) {
    this.state.settings = { ...this.state.settings, ...settings };
    this.state.sizingMode = sizingMode || this.state.sizingMode;
    this.state.contractType = contractType || this.state.contractType;
    this.state.settings.market = settings?.market || this.state.settings.market;
    this.wantedMarket = this.state.settings.market;
    resetStake(this.state);
  }

  applyPreset(preset) {
    this.state.settings = { ...this.state.settings, ...preset };
    resetStake(this.state);
  }

  startBot() {
    this.state.running = true;
    this.state.tradeInProgress = false;
    this.state.lossStreak = 0;
    resetStake(this.state);
  }

  stopBot() {
    this.state.running = false;
    this.state.tradeInProgress = false;
  }

  resetSession() {
    this.state.sessionProfit = 0;
    this.state.peakProfit = 0;
    this.state.tradeCount = 0;
    this.state.wins = 0;
    this.state.losses = 0;
    this.state.lossStreak = 0;
    this.state.tradeInProgress = false;
    this.state.contractId = null;
    this.state.lastTradeMeta = null;
    this.state.recentTrades = [];
    resetStake(this.state);
  }

  disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.socketReady = false;
    this.state.connected = false;
    this.state.authorized = false;
    this.state.running = false;
  }
}