const tokenInput = document.getElementById("token");
const marketSelect = document.getElementById("market");
const presetSelect = document.getElementById("preset");
const sizingModeSelect = document.getElementById("sizingMode");

const baseStakeInput = document.getElementById("baseStake");
const minStakeInput = document.getElementById("minStake");
const maxStakeInput = document.getElementById("maxStake");
const durationInput = document.getElementById("duration");
const durationUnitInput = document.getElementById("durationUnit");
const currencyInput = document.getElementById("currency");
const winMultiplierInput = document.getElementById("winMultiplier");
const lossMultiplierInput = document.getElementById("lossMultiplier");

const cooldownMsInput = document.getElementById("cooldownMs");
const fastEmaInput = document.getElementById("fastEma");
const slowEmaInput = document.getElementById("slowEma");
const confirmTicksInput = document.getElementById("confirmTicks");
const moveWindowInput = document.getElementById("moveWindow");
const warmupTicksInput = document.getElementById("warmupTicks");
const emaGapThresholdInput = document.getElementById("emaGapThreshold");
const microMoveThresholdInput = document.getElementById("microMoveThreshold");

const stopLossInput = document.getElementById("stopLoss");
const takeProfitInput = document.getElementById("takeProfit");
const pauseAfterLossesInput = document.getElementById("pauseAfterLosses");
const pauseSecondsInput = document.getElementById("pauseSeconds");
const maxLossesInput = document.getElementById("maxLosses");
const maxTradesInput = document.getElementById("maxTrades");
const reentryBlockSecondsInput = document.getElementById("reentryBlockSeconds");
const peakDrawdownLockInput = document.getElementById("peakDrawdownLock");

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminBtn = document.getElementById("adminBtn");
const applyPresetBtn = document.getElementById("applyPresetBtn");
const startTicksBtn = document.getElementById("startTicksBtn");
const startBotBtn = document.getElementById("startBotBtn");
const stopBotBtn = document.getElementById("stopBotBtn");
const resetSessionBtn = document.getElementById("resetSessionBtn");
const resetLogsBtn = document.getElementById("resetLogsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const loadMarketBtn = document.getElementById("loadMarketBtn");
const manualBtn = document.getElementById("manualBtn");

const tickOutput = document.getElementById("tickOutput");
const snapshotOutput = document.getElementById("snapshotOutput");
const logOutput = document.getElementById("logOutput");
const tradesTableBody = document.getElementById("tradesTableBody");

const connectedValue = document.getElementById("connectedValue");
const runningValue = document.getElementById("runningValue");
const marketValue = document.getElementById("marketValue");
const signalValue = document.getElementById("signalValue");
const balanceValue = document.getElementById("balanceValue");
const sessionProfitValue = document.getElementById("sessionProfitValue");
const peakProfitValue = document.getElementById("peakProfitValue");
const moveValue = document.getElementById("moveValue");
const countdownValue = document.getElementById("countdownValue");
const tradesValue = document.getElementById("tradesValue");
const winsValue = document.getElementById("winsValue");
const lossesValue = document.getElementById("lossesValue");
const lossStreakValue = document.getElementById("lossStreakValue");
const stakeValue = document.getElementById("stakeValue");

const chartCanvas = document.getElementById("priceChart");
const chartMeta = document.getElementById("chartMeta");

const miniR10 = document.getElementById("miniR10");
const miniR25 = document.getElementById("miniR25");
const miniR50 = document.getElementById("miniR50");

const selectedCandles = [];
const miniCandles = {
  R_10: [],
  R_25: [],
  R_50: []
};

const TICKS_PER_CANDLE_MAIN = 4;
const TICKS_PER_CANDLE_MINI = 5;

let allowSettingsSync = true;
let lastSyncedSettingsJson = "";
let expiresAtValue = null;
let countdownInterval = null;

adminBtn.style.display = "none";

const allSettingInputs = [
  baseStakeInput,
  minStakeInput,
  maxStakeInput,
  durationInput,
  durationUnitInput,
  currencyInput,
  winMultiplierInput,
  lossMultiplierInput,
  cooldownMsInput,
  fastEmaInput,
  slowEmaInput,
  confirmTicksInput,
  moveWindowInput,
  warmupTicksInput,
  emaGapThresholdInput,
  microMoveThresholdInput,
  stopLossInput,
  takeProfitInput,
  pauseAfterLossesInput,
  pauseSecondsInput,
  maxLossesInput,
  maxTradesInput,
  reentryBlockSecondsInput,
  peakDrawdownLockInput,
  sizingModeSelect
];

allSettingInputs.forEach((el) => {
  el.addEventListener("focus", () => {
    allowSettingsSync = false;
  });
});

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);

  const render = () => {
    if (!expiresAtValue) {
      countdownValue.textContent = "No limit";
      countdownValue.className = "value";
      return;
    }

    const target = new Date(expiresAtValue).getTime();
    const diff = target - Date.now();

    if (diff <= 0) {
      countdownValue.textContent = "Expired";
      countdownValue.className = "value bad";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    countdownValue.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    countdownValue.className = "value good";
  };

  render();
  countdownInterval = setInterval(render, 1000);
}

async function checkAuth() {
  try {
    const res = await fetch("/auth/status");
    const data = await res.json();

    if (!data.loggedIn) {
      window.location.href = "/login";
      return;
    }

    expiresAtValue = data.expiresAt || null;
    startCountdown();
  } catch {
    window.location.href = "/login";
  }
}

async function loadRole() {
  try {
    const res = await fetch("/auth/status");
    const data = await res.json();

    if (data.role === "admin") {
      adminBtn.style.display = "block";
    } else {
      adminBtn.style.display = "none";
    }
  } catch {
    adminBtn.style.display = "none";
  }
}

function addLog(message) {
  const now = new Date().toLocaleTimeString();
  logOutput.textContent = `[${now}] ${message}\n` + logOutput.textContent;
}

function syncSettingsFromSnapshot(settings) {
  if (!settings || !allowSettingsSync) return;

  const json = JSON.stringify(settings);
  if (json === lastSyncedSettingsJson) return;

  baseStakeInput.value = settings.baseStake ?? 0.35;
  minStakeInput.value = settings.minStake ?? 0.35;
  maxStakeInput.value = settings.maxStake ?? 1.0;
  durationInput.value = settings.duration ?? 3;
  durationUnitInput.value = settings.durationUnit ?? "t";
  currencyInput.value = settings.currency ?? "USD";
  winMultiplierInput.value = settings.winMultiplier ?? 1.05;
  lossMultiplierInput.value = settings.lossMultiplier ?? 0.85;

  cooldownMsInput.value = settings.cooldownMs ?? 1200;
  fastEmaInput.value = settings.fastEmaLength ?? 5;
  slowEmaInput.value = settings.slowEmaLength ?? 12;
  confirmTicksInput.value = settings.confirmTicks ?? 3;
  moveWindowInput.value = settings.moveWindow ?? 5;
  warmupTicksInput.value = settings.warmupTicks ?? 18;
  emaGapThresholdInput.value = settings.emaGapThreshold ?? 0.018;
  microMoveThresholdInput.value = settings.microMoveThreshold ?? 0.004;

  stopLossInput.value = settings.stopLossPercent ?? 1;
  takeProfitInput.value = settings.takeProfitPercent ?? 2;
  pauseAfterLossesInput.value = settings.pauseAfterLosses ?? 2;
  pauseSecondsInput.value = settings.pauseSeconds ?? 45;
  maxLossesInput.value = settings.maxLosses ?? 5;
  maxTradesInput.value = settings.maxTrades ?? 35;
  reentryBlockSecondsInput.value = settings.reentryBlockSeconds ?? 30;
  peakDrawdownLockInput.value = settings.peakDrawdownLock ?? 0.8;

  lastSyncedSettingsJson = json;
}

function updateStats(snapshot) {
  connectedValue.textContent = snapshot.connected ? "Yes" : "No";
  runningValue.textContent = snapshot.running ? "Yes" : "No";
  marketValue.textContent = snapshot.market || "-";
  signalValue.textContent = snapshot.signal || "-";

  balanceValue.textContent = Number(snapshot.balance ?? 0).toFixed(2);
  sessionProfitValue.textContent = Number(snapshot.sessionProfit ?? 0).toFixed(2);
  peakProfitValue.textContent = Number(snapshot.peakProfit ?? 0).toFixed(2);

  tradesValue.textContent = snapshot.tradeCount ?? 0;
  winsValue.textContent = snapshot.wins ?? 0;
  lossesValue.textContent = snapshot.losses ?? 0;
  lossStreakValue.textContent = snapshot.lossStreak ?? 0;
  stakeValue.textContent = Number(snapshot.currentStake ?? 0).toFixed(2);

  sessionProfitValue.className = "value " + ((snapshot.sessionProfit ?? 0) >= 0 ? "good" : "bad");
  peakProfitValue.className = "value " + ((snapshot.peakProfit ?? 0) >= 0 ? "good" : "bad");

  syncSettingsFromSnapshot(snapshot.settings);
  renderTrades(snapshot.recentTrades || []);
}

function renderTrades(trades) {
  tradesTableBody.innerHTML = "";

  for (const trade of trades) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${trade.time ?? "-"}</td>
      <td>${trade.market ?? "-"}</td>
      <td>${trade.direction ?? "-"}</td>
      <td>${trade.contractType ?? "-"}</td>
      <td class="${trade.result === "WIN" ? "good" : "bad"}">${trade.result ?? "-"}</td>
      <td>${Number(trade.profit ?? 0).toFixed(2)}</td>
      <td>${Number(trade.stake ?? 0).toFixed(2)}</td>
      <td>${trade.reason ?? "-"}</td>
    `;
    tradesTableBody.appendChild(tr);
  }
}

function pushCandle(candles, price, ticksPerCandle, maxCandles) {
  if (!candles.length) {
    candles.push({ open: price, high: price, low: price, close: price, count: 1 });
    return;
  }

  const last = candles[candles.length - 1];

  if (last.count >= ticksPerCandle) {
    candles.push({ open: price, high: price, low: price, close: price, count: 1 });
    if (candles.length > maxCandles) candles.shift();
    return;
  }

  last.high = Math.max(last.high, price);
  last.low = Math.min(last.low, price);
  last.close = price;
  last.count += 1;
}

function drawCandles(canvas, candles) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.clientWidth;
  const height = canvas.height = canvas.clientHeight;

  ctx.clearRect(0, 0, width, height);
  if (candles.length < 2) return;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = max - min || 1;

  const candleWidth = Math.max(4, (width / candles.length) * 0.6);
  const gap = width / candles.length;

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 1);
  ctx.lineTo(width, height - 1);
  ctx.stroke();

  candles.forEach((candle, index) => {
    const x = index * gap + gap / 2;
    const yHigh = height - (((candle.high - min) / range) * (height - 20) + 10);
    const yLow = height - (((candle.low - min) / range) * (height - 20) + 10);
    const yOpen = height - (((candle.open - min) / range) * (height - 20) + 10);
    const yClose = height - (((candle.close - min) / range) * (height - 20) + 10);

    const bullish = candle.close >= candle.open;
    const color = bullish ? "#4ade80" : "#fb7185";

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    ctx.fillStyle = color;
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  });
}

function drawMainChart() {
  drawCandles(chartCanvas, selectedCandles);

  if (selectedCandles.length < 2) {
    chartMeta.textContent = "Waiting for candles...";
    moveValue.textContent = "0.000%";
    return;
  }

  const first = selectedCandles[0].open;
  const last = selectedCandles[selectedCandles.length - 1].close;
  const movePct = first ? ((last - first) / first) * 100 : 0;

  chartMeta.textContent = `Candles: ${selectedCandles.length} | Last: ${last.toFixed(2)} | Move: ${movePct.toFixed(3)}%`;
  moveValue.textContent = `${movePct.toFixed(3)}%`;
  moveValue.className = "value " + (movePct >= 0 ? "good" : "bad");
}

function drawMiniCharts() {
  drawCandles(miniR10, miniCandles.R_10);
  drawCandles(miniR25, miniCandles.R_25);
  drawCandles(miniR50, miniCandles.R_50);
}

function getSettingsPayload() {
  return {
    market: marketSelect.value,
    baseStake: Number(baseStakeInput.value),
    minStake: Number(minStakeInput.value),
    maxStake: Number(maxStakeInput.value),
    duration: Number(durationInput.value),
    durationUnit: durationUnitInput.value,
    currency: currencyInput.value,
    winMultiplier: Number(winMultiplierInput.value),
    lossMultiplier: Number(lossMultiplierInput.value),
    cooldownMs: Number(cooldownMsInput.value),
    fastEmaLength: Number(fastEmaInput.value),
    slowEmaLength: Number(slowEmaInput.value),
    confirmTicks: Number(confirmTicksInput.value),
    moveWindow: Number(moveWindowInput.value),
    warmupTicks: Number(warmupTicksInput.value),
    emaGapThreshold: Number(emaGapThresholdInput.value),
    microMoveThreshold: Number(microMoveThresholdInput.value),
    stopLossPercent: Number(stopLossInput.value),
    takeProfitPercent: Number(takeProfitInput.value),
    pauseAfterLosses: Number(pauseAfterLossesInput.value),
    pauseSeconds: Number(pauseSecondsInput.value),
    maxLosses: Number(maxLossesInput.value),
    maxTrades: Number(maxTradesInput.value),
    reentryBlockSeconds: Number(reentryBlockSecondsInput.value),
    peakDrawdownLock: Number(peakDrawdownLockInput.value)
  };
}

const eventSource = new EventSource("/api/stream");

eventSource.onmessage = (event) => {
  const payload = JSON.parse(event.data);

  if (payload.type === "tick") {
    tickOutput.textContent = JSON.stringify(payload, null, 2);

    const quote = Number(payload.quote);
    const symbol = payload.symbol;

    if (symbol === marketSelect.value) {
      pushCandle(selectedCandles, quote, TICKS_PER_CANDLE_MAIN, 60);
      drawMainChart();
    }

    if (miniCandles[symbol]) {
      pushCandle(miniCandles[symbol], quote, TICKS_PER_CANDLE_MINI, 24);
      drawMiniCharts();
    }
  }

  if (payload.type === "snapshot") {
    snapshotOutput.textContent = JSON.stringify(payload.data, null, 2);
    updateStats(payload.data);
  }

  if (payload.type === "log") addLog(payload.message);
  if (payload.type === "error") addLog("ERROR: " + payload.message);
};

connectBtn.addEventListener("click", async () => {
  await fetch("/api/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: tokenInput.value })
  });

  addLog("Connect requested");
});

manualBtn.addEventListener("click", () => {
  window.location.href = "/manual";
});

disconnectBtn.addEventListener("click", async () => {
  await fetch("/api/disconnect", { method: "POST" });
  addLog("Disconnect requested");
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST" });
  window.location.href = "/login";
});

adminBtn.addEventListener("click", () => {
  window.location.href = "/admin";
});

applyPresetBtn.addEventListener("click", async () => {
  allowSettingsSync = true;

  await fetch("/api/preset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset: presetSelect.value })
  });

  addLog(`Preset applied: ${presetSelect.value}`);
});

saveSettingsBtn.addEventListener("click", async () => {
  allowSettingsSync = true;
  lastSyncedSettingsJson = "";

  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sizingMode: sizingModeSelect.value,
      settings: getSettingsPayload()
    })
  });

  addLog("Settings saved");
});

loadMarketBtn.addEventListener("click", async () => {
  selectedCandles.length = 0;
  drawMainChart();

  allowSettingsSync = true;
  lastSyncedSettingsJson = "";

  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sizingMode: sizingModeSelect.value,
      settings: getSettingsPayload()
    })
  });

  await fetch("/api/ticks/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol: marketSelect.value })
  });

  addLog(`Loaded market: ${marketSelect.value}`);
});

startTicksBtn.addEventListener("click", async () => {
  selectedCandles.length = 0;
  drawMainChart();

  allowSettingsSync = true;
  lastSyncedSettingsJson = "";

  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sizingMode: sizingModeSelect.value,
      settings: getSettingsPayload()
    })
  });

  await fetch("/api/ticks/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol: marketSelect.value })
  });

  addLog(`Ticks requested: ${marketSelect.value}`);
});

startBotBtn.addEventListener("click", async () => {
  await fetch("/api/bot/start", { method: "POST" });
  addLog("Bot start requested");
});

stopBotBtn.addEventListener("click", async () => {
  await fetch("/api/bot/stop", { method: "POST" });
  addLog("Bot stop requested");
});

resetSessionBtn.addEventListener("click", async () => {
  await fetch("/api/reset-session", { method: "POST" });
  selectedCandles.length = 0;
  drawMainChart();
  addLog("Session reset requested");
});

resetLogsBtn.addEventListener("click", () => {
  logOutput.textContent = "";
});

document.querySelectorAll(".tabBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabBtn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tabPanel").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

window.addEventListener("resize", () => {
  drawMainChart();
  drawMiniCharts();
});

checkAuth();
loadRole();