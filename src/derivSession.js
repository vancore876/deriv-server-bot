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

function getLastDigit(quote) {
  const str = String(quote);
  const digits = str.replace(/\D/g, "");
  if (!digits.length) return null;
  return Number(digits[digits.length - 1]);
}

function buildFreshDigitStats(previous = {}) {
  return {
    lastDigit: null,
    lastDigits: [],
    counts: { 0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0 },
    evenCount: 0,
    oddCount: 0,
    streakType: null,
    streakLength: 0,
    rolling50: [],
    rolling100: [],
    biasScore: 0,
    signal: "NO TRADE",
    mode: previous.mode || "observer",
    executableEnabled: Boolean(previous.executableEnabled),
    tradeCooldownUntil: 0,
    sampleSize: 0,
    sampleTargetReached: false
  };
}

function updateDigitStats(state, quote) {
  const digit = getLastDigit(quote);
  if (digit === null) return;

  const stats = state.digitStats;
  stats.lastDigit = digit;
  stats.lastDigits.push(digit);
  if (stats.lastDigits.length > 100) stats.lastDigits.shift();

  stats.counts = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0 };
  stats.evenCount = 0;
  stats.oddCount = 0;

  for (const d of stats.lastDigits) {
    stats.counts[d] += 1;
    if (d % 2 === 0) stats.evenCount += 1;
    else stats.oddCount += 1;
  }

  stats.rolling50 = stats.lastDigits.slice(-50);
  stats.rolling100 = stats.lastDigits.slice(-100);
  stats.sampleSize = stats.lastDigits.length;

  const sampleTarget = Number(state.settings.digitSampleTarget || 100);
  stats.sampleTargetReached = stats.sampleSize >= sampleTarget;

  const kind = digit % 2 === 0 ? "EVEN" : "ODD";
  if (stats.streakType === kind) {
    stats.streakLength += 1;
  } else {
    stats.streakType = kind;
    stats.streakLength = 1;
  }

  const even50 = stats.rolling50.filter((d) => d % 2 === 0).length;
  const odd50 = stats.rolling50.length - even50;
  const even100 = stats.rolling100.filter((d) => d % 2 === 0).length;
  const odd100 = stats.rolling100.length - even100;

  stats.biasScore = Math.abs(even50 - odd50);
  stats.signal = "NO TRADE";

  if (!stats.sampleTargetReached) return;

  const bias50 = Number(state.settings.digitBias50Threshold || 30);
  const bias100 = Number(state.settings.digitBias100Threshold || 58);

  if (even50 >= bias50 && even100 >= bias100 && stats.streakType !== "EVEN") {
    stats.signal = "EVEN_BIAS";
  } else if (odd50 >= bias50 && odd100 >= bias100 && stats.streakType !== "ODD") {
    stats.signal = "ODD_BIAS";
  }
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
      botMode: this.state.botMode,
      digitStats: this.state.digitStats,
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

      this.broadcast({
        type: "tick",
        symbol,
        quote: price,
        epoch: data.tick.epoch
      });

      if (symbol === this.state.settings.market) {
        updateDigitStats(this.state, price);

        let signal = null;

        if (this.state.botMode === "trend") {
          signal = this.handleTickForTrend(price);
        } else {
          signal = this.handleTickForDigits();
        }

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

  handleTickForTrend(price) {
    updateIndicators(this.state, price);

    if (!this.state.running || this.state.tradeInProgress || isPaused(this.state) || !canTradeNow(this.state)) {
      return null;
    }

    return computeSignal(this.state);
  }

  handleTickForDigits() {
    const stats = this.state.digitStats;

    if (!this.state.running) return null;

    const mode = stats.mode || "observer";
    const executable = mode === "executable" && Boolean(stats.executableEnabled);

    const target = Number(this.state.settings.digitSampleTarget || 100);
    this.state.lastSignalText = `Digit: ${stats.signal} | ${stats.sampleSize}/${target} | Bias ${stats.biasScore}`;

    if (!executable) return null;
    if (!stats.sampleTargetReached) return null;
    if (this.state.tradeInProgress || isPaused(this.state) || !canTradeNow(this.state)) return null;
    if (Date.now() < (stats.tradeCooldownUntil || 0)) return null;
    if ((this.state.tradeCount || 0) >= Number(this.state.settings.digitMaxTradesPerSession || 3)) return null;

    if (stats.signal === "EVEN_BIAS") {
      stats.tradeCooldownUntil = Date.now() + Number(this.state.settings.digitTradeCooldownMs || 10000);
      return "DIGITEVEN";
    }

    if (stats.signal === "ODD_BIAS") {
      stats.tradeCooldownUntil = Date.now() + Number(this.state.settings.digitTradeCooldownMs || 10000);
      return "DIGITODD";
    }

    return null;
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

    const duration =
      this.state.botMode === "digits"
        ? Number(this.state.settings.digitDuration || 1)
        : Number(this.state.settings.duration);

    const durationUnit =
      this.state.botMode === "digits"
        ? this.state.settings.digitDurationUnit || "t"
        : this.state.settings.durationUnit;

    this.send({
      buy: 1,
      price: stakeUsed,
      parameters: {
        amount: stakeUsed,
        basis: "stake",
        contract_type: contractType,
        currency: this.state.settings.currency,
        duration,
        duration_unit: durationUnit,
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

  updateSettings({ settings, sizingMode, contractType, botMode, digitMode }) {
    this.state.settings = { ...this.state.settings, ...settings };
    this.state.sizingMode = sizingMode || this.state.sizingMode;
    this.state.contractType = contractType || this.state.contractType;
    this.state.botMode = botMode || this.state.botMode;
    this.state.settings.market = settings?.market || this.state.settings.market;
    this.wantedMarket = this.state.settings.market;

    if (digitMode) {
      this.state.digitStats.mode = digitMode;
      this.state.digitStats.executableEnabled = digitMode === "executable";
    }

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

  resetAnalyzer() {
    this.state.digitStats = buildFreshDigitStats(this.state.digitStats);
    this.broadcast("log", { message: "Digit analyzer reset" });
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
    this.state.digitStats.tradeCooldownUntil = 0;
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