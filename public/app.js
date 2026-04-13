const tokenInput = document.getElementById("token");
const marketSelect = document.getElementById("market");
const presetSelect = document.getElementById("preset");
const sizingModeSelect = document.getElementById("sizingMode");
const botModeSelect = document.getElementById("botMode");
const digitModeSelect = document.getElementById("digitMode");

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

const digitDurationInput = document.getElementById("digitDuration");
const digitDurationUnitInput = document.getElementById("digitDurationUnit");
const digitSampleTargetInput = document.getElementById("digitSampleTarget");
const digitBias50ThresholdInput = document.getElementById("digitBias50Threshold");
const digitBias100ThresholdInput = document.getElementById("digitBias100Threshold");
const digitOverUnder50ThresholdInput = document.getElementById("digitOverUnder50Threshold");
const digitOverUnder100ThresholdInput = document.getElementById("digitOverUnder100Threshold");
const digitBarrierInput = document.getElementById("digitBarrier");
const digitTradeCooldownMsInput = document.getElementById("digitTradeCooldownMs");
const digitMaxTradesPerSessionInput = document.getElementById("digitMaxTradesPerSession");

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const logoutBtn = document.getElementById("logoutBtn");
const manualBtn = document.getElementById("manualBtn");
const adminBtn = document.getElementById("adminBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const applyPresetBtn = document.getElementById("applyPresetBtn");
const startTicksBtn = document.getElementById("startTicksBtn");
const startBotBtn = document.getElementById("startBotBtn");
const stopBotBtn = document.getElementById("stopBotBtn");
const resetSessionBtn = document.getElementById("resetSessionBtn");
const resetAnalyzerBtn = document.getElementById("resetAnalyzerBtn");
const resetLogsBtn = document.getElementById("resetLogsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const loadMarketBtn = document.getElementById("loadMarketBtn");

const tickOutput = document.getElementById("tickOutput");
const snapshotOutput = document.getElementById("snapshotOutput");
const digitOutput = document.getElementById("digitOutput");
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
const analyzerProgressValue = document.getElementById("analyzerProgressValue");
const analyzerReadyValue = document.getElementById("analyzerReadyValue");
const tradesValue = document.getElementById("tradesValue");
const winsValue = document.getElementById("winsValue");
const lossesValue = document.getElementById("lossesValue");
const lossStreakValue = document.getElementById("lossStreakValue");
const stakeValue = document.getElementById("stakeValue");
const gameLevelValue = document.getElementById("gameLevelValue");
const gameXpValue = document.getElementById("gameXpValue");
const gameXpBar = document.getElementById("gameXpBar");
const gameMissionText = document.getElementById("gameMissionText");
const gameMissionProgress = document.getElementById("gameMissionProgress");

const chartCanvas = document.getElementById("priceChart");
const chartMeta = document.getElementById("chartMeta");
const uiVersionValue = document.getElementById("uiVersion");
const aiSections = Array.from(document.querySelectorAll("[data-ai-section='true']"));
const aiInsightOutput = document.getElementById("aiInsightOutput");
const aiEventsOutput = document.getElementById("aiEventsOutput");
const copilotQueryInput = document.getElementById("copilotQueryInput");
const copilotAskBtn = document.getElementById("copilotAskBtn");
const strategyReviewBtn = document.getElementById("strategyReviewBtn");
const memoryRefreshBtn = document.getElementById("memoryRefreshBtn");
const experimentsRefreshBtn = document.getElementById("experimentsRefreshBtn");
const copilotOutput = document.getElementById("copilotOutput");
const memoryOutput = document.getElementById("memoryOutput");
const experimentsOutput = document.getElementById("experimentsOutput");

const selectedCandles = [];
const TICKS_PER_CANDLE_MAIN = 4;

let allowSettingsSync = true;
let lastSyncedSettingsJson = "";
let expiresAtValue = null;
let countdownInterval = null;
const THEME_STORAGE_KEY = "deriv-ui-theme";

adminBtn.style.display = "none";

const allSettingInputs = [
  baseStakeInput, minStakeInput, maxStakeInput, durationInput, durationUnitInput, currencyInput,
  winMultiplierInput, lossMultiplierInput, cooldownMsInput, fastEmaInput, slowEmaInput,
  confirmTicksInput, moveWindowInput, warmupTicksInput, emaGapThresholdInput, microMoveThresholdInput,
  stopLossInput, takeProfitInput, pauseAfterLossesInput, pauseSecondsInput, maxLossesInput, maxTradesInput,
  reentryBlockSecondsInput, peakDrawdownLockInput, sizingModeSelect, botModeSelect, digitModeSelect,
  digitDurationInput, digitDurationUnitInput, digitSampleTargetInput, digitBias50ThresholdInput,
  digitBias100ThresholdInput, digitOverUnder50ThresholdInput, digitOverUnder100ThresholdInput, digitBarrierInput,
  digitTradeCooldownMsInput,
  digitMaxTradesPerSessionInput
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

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff / 3600000) % 24);
    const minutes = Math.floor((diff / 60000) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    countdownValue.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    countdownValue.className = "value " + (diff < 3600000 ? "bad" : diff < 86400000 ? "" : "good");
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
    adminBtn.style.display = data.role === "admin" ? "block" : "none";
  } catch {
    adminBtn.style.display = "none";
  }
}

function addLog(message) {
  const now = new Date().toLocaleTimeString();
  logOutput.textContent = `[${now}] ${message}\n` + logOutput.textContent;
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  if (themeToggleBtn) themeToggleBtn.textContent = nextTheme === "light" ? "🌞 Light" : "🌙 Dark";
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function initTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(stored || "dark");
}

async function loadVersion() {
  if (!uiVersionValue) return;
  try {
    const res = await fetch('/api/version');
    const data = await res.json();
    const version = data.version || 'unknown';
    uiVersionValue.textContent = version;
    document.title = `Deriv Server Bot (Updated UI ${version})`;
    const aiEnabled = data.aiEnabled !== false;
    configureAiVisibility(aiEnabled);
  } catch {
    uiVersionValue.textContent = 'unavailable';
    configureAiVisibility(false);
  }
}

function configureAiVisibility(enabled) {
  aiSections.forEach((el) => {
    if (enabled) {
      el.style.removeProperty("display");
    } else {
      el.style.display = "none";
      el.classList.remove("active");
    }
  });

  if (!enabled) {
    aiInsightOutput.textContent = "AI gateway is disabled for this environment.";
    aiEventsOutput.textContent = "AI events are unavailable while AI gateway is disabled.";
  }
}

function syncSettingsFromSnapshot(settings, snapshot) {
  if (!settings || !allowSettingsSync) return;

  const json = JSON.stringify({
    settings,
    botMode: snapshot.botMode,
    digitMode: snapshot.digitStats?.mode
  });

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

  digitDurationInput.value = settings.digitDuration ?? 1;
  digitDurationUnitInput.value = settings.digitDurationUnit ?? "t";
  digitSampleTargetInput.value = String(settings.digitSampleTarget ?? 100);
  digitBias50ThresholdInput.value = settings.digitBias50Threshold ?? 28;
  digitBias100ThresholdInput.value = settings.digitBias100Threshold ?? 55;
  digitOverUnder50ThresholdInput.value = settings.digitOverUnder50Threshold ?? 28;
  digitOverUnder100ThresholdInput.value = settings.digitOverUnder100Threshold ?? 55;
  digitBarrierInput.value = settings.digitBarrier ?? 4;
  digitTradeCooldownMsInput.value = settings.digitTradeCooldownMs ?? 10000;
  digitMaxTradesPerSessionInput.value = settings.digitMaxTradesPerSession ?? 3;

  botModeSelect.value = snapshot.botMode ?? "trend";
  digitModeSelect.value = snapshot.digitStats?.mode ?? "observer";

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

  const sampleSize = snapshot.digitStats?.sampleSize ?? 0;
  const sampleTarget = Number(snapshot.settings?.digitSampleTarget ?? 100);
  const ready = Boolean(snapshot.digitStats?.sampleTargetReached);

  analyzerProgressValue.textContent = `${sampleSize} / ${sampleTarget}`;
  analyzerReadyValue.textContent = ready ? "Yes" : "No";
  analyzerReadyValue.className = "value " + (ready ? "good" : "");

  updateGameProgress(snapshot);

  syncSettingsFromSnapshot(snapshot.settings, snapshot);
  renderTrades(snapshot.recentTrades || []);
  renderDigitStats(snapshot.digitStats || {}, snapshot.settings || {});
}

function updateGameProgress(snapshot) {
  if (!gameLevelValue || !gameXpValue || !gameXpBar) return;

  const wins = Number(snapshot.wins || 0);
  const losses = Number(snapshot.losses || 0);
  const tradeCount = Number(snapshot.tradeCount || 0);

  const xp = Math.max(0, (wins * 30) + (tradeCount * 5) - (losses * 10));
  const levels = [0, 150, 400, 800, 1400, 2200, 3200];

  let level = 1;
  for (let i = 0; i < levels.length; i += 1) {
    if (xp >= levels[i]) level = i + 1;
  }

  const currentFloor = levels[Math.max(0, level - 1)] || 0;
  const nextCeil = levels[Math.min(level, levels.length - 1)] || levels[levels.length - 1];
  const span = Math.max(1, nextCeil - currentFloor);
  const progress = Math.max(0, Math.min(100, ((xp - currentFloor) / span) * 100));

  gameLevelValue.textContent = String(level);
  gameXpValue.textContent = `${xp} / ${nextCeil}`;
  gameXpBar.style.width = `${progress}%`;

  const missionTarget = 5;
  const missionProgress = Math.min(missionTarget, wins);
  gameMissionText.textContent = "Win 5 trades";
  gameMissionProgress.textContent = `${missionProgress} / ${missionTarget}`;
}

function signalClass(signal) {
  const s = String(signal || "").toUpperCase();
  if (s.includes("TRADE") && !s.includes("NO")) return "good";
  if (s.includes("WAIT") || s.includes("BUILD")) return "warn";
  if (s.includes("BLOCK") || s.includes("AVOID")) return "bad";
  return "neutral";
}

function renderDigitStats(stats, settings) {
  const target = Number(settings.digitSampleTarget || 100);
  const last20 = (stats.lastDigits || []).slice(-20);
  const rolling50 = stats.rolling50 || [];
  const rolling100 = stats.rolling100 || [];

  const payload = {
    mode: stats.mode || "observer",
    executableEnabled: Boolean(stats.executableEnabled),
    sampleSize: stats.sampleSize ?? last20.length,
    sampleTarget: target,
    sampleReady: Boolean(stats.sampleTargetReached),
    lastDigit: stats.lastDigit ?? null,
    last20,
    evenCount: stats.evenCount ?? 0,
    oddCount: stats.oddCount ?? 0,
    streakType: stats.streakType || null,
    streakLength: stats.streakLength ?? 0,
    rolling50Even: rolling50.filter((d) => d % 2 === 0).length,
    rolling50Odd: rolling50.filter((d) => d % 2 !== 0).length,
    rolling100Even: rolling100.filter((d) => d % 2 === 0).length,
    rolling100Odd: rolling100.filter((d) => d % 2 !== 0).length,
    signal: stats.signal || "NO TRADE"
  };

  const digitModeBadge = document.getElementById("digitModeBadge");
  const digitSignalBadge = document.getElementById("digitSignalBadge");
  const digitSampleValue = document.getElementById("digitSampleValue");
  const digitReadyValue2 = document.getElementById("digitReadyValue2");
  const digitLastValue = document.getElementById("digitLastValue");
  const digitStreakValue = document.getElementById("digitStreakValue");
  const digitEvenValue = document.getElementById("digitEvenValue");
  const digitOddValue = document.getElementById("digitOddValue");
  const digitProgressBar = document.getElementById("digitProgressBar");
  const digitLast20 = document.getElementById("digitLast20");
  const digitRolling50Value = document.getElementById("digitRolling50Value");
  const digitRolling100Value = document.getElementById("digitRolling100Value");

  digitModeBadge.textContent = payload.mode === "executable" ? "Executable" : "Observer";
  digitSignalBadge.textContent = payload.signal;
  digitSignalBadge.className = `digitSignal ${signalClass(payload.signal)}`;

  digitSampleValue.textContent = `${payload.sampleSize} / ${payload.sampleTarget}`;
  digitReadyValue2.textContent = payload.sampleReady ? "Yes" : "No";
  digitLastValue.textContent = payload.lastDigit ?? "-";
  digitStreakValue.textContent = payload.streakType ? `${payload.streakType} x${payload.streakLength}` : "None";
  digitEvenValue.textContent = String(payload.evenCount);
  digitOddValue.textContent = String(payload.oddCount);
  digitRolling50Value.textContent = `${payload.rolling50Even} / ${payload.rolling50Odd}`;
  digitRolling100Value.textContent = `${payload.rolling100Even} / ${payload.rolling100Odd}`;

  const pct = payload.sampleTarget > 0
    ? Math.min(100, (payload.sampleSize / payload.sampleTarget) * 100)
    : 0;

  digitProgressBar.style.width = `${pct}%`;

  digitLast20.innerHTML = "";
  payload.last20.forEach((digit) => {
    const chip = document.createElement("span");
    chip.className = `digitChip ${Number(digit) % 2 === 0 ? "even" : "odd"}`;
    chip.textContent = String(digit);
    digitLast20.appendChild(chip);
  });
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

  if (selectedCandles.length < 1) {
    chartMeta.textContent = `Waiting for candles... selected market: ${marketSelect.value}`;
    moveValue.textContent = "0.000%";
    moveValue.className = "value";
    return;
  }

  const first = selectedCandles[0].open;
  const last = selectedCandles[selectedCandles.length - 1].close;
  const movePct = first ? ((last - first) / first) * 100 : 0;

  chartMeta.textContent = `Candles: ${selectedCandles.length} | Last: ${last.toFixed(2)} | Move: ${movePct.toFixed(3)}%`;
  moveValue.textContent = `${movePct.toFixed(3)}%`;
  moveValue.className = "value " + (movePct >= 0 ? "good" : "bad");
}


function renderAiInsightFromSnapshot(snapshot) {
  if (!aiInsightOutput) return;
  const regime = snapshot?.digitStats?.signal && snapshot?.digitStats?.signal !== "NO TRADE"
    ? "digit-bias"
    : "neutral";

  aiInsightOutput.textContent =
    `Regime: ${regime}
` +
    `Signal: ${snapshot?.signal || "-"}
` +
    `Session P&L: ${Number(snapshot?.sessionProfit || 0).toFixed(2)}
` +
    `Loss Streak: ${snapshot?.lossStreak || 0}
` +
    `Last Edge: ${snapshot?.digitStats?.signal || "NO TRADE"}`;
}

function writeAiEvent(title, payload) {
  if (!aiEventsOutput) return;
  const line = `[${new Date().toLocaleTimeString()}] ${title}: ${JSON.stringify(payload)}`;
  aiEventsOutput.textContent = `${line}
${aiEventsOutput.textContent}`;
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
    peakDrawdownLock: Number(peakDrawdownLockInput.value),
    digitDuration: Number(digitDurationInput.value),
    digitDurationUnit: digitDurationUnitInput.value,
    digitSampleTarget: Number(digitSampleTargetInput.value),
    digitBias50Threshold: Number(digitBias50ThresholdInput.value),
    digitBias100Threshold: Number(digitBias100ThresholdInput.value),
    digitOverUnder50Threshold: Number(digitOverUnder50ThresholdInput.value),
    digitOverUnder100Threshold: Number(digitOverUnder100ThresholdInput.value),
    digitBarrier: Number(digitBarrierInput.value),
    digitTradeCooldownMs: Number(digitTradeCooldownMsInput.value),
    digitMaxTradesPerSession: Number(digitMaxTradesPerSessionInput.value)
  
  
  };
}

// ✅ helper for API calls
async function postJson(url, body = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || (data && data.ok === false)) {
    const message = data?.error || `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return data;
}

async function saveSettingsAndModes() {
  allowSettingsSync = true;
  lastSyncedSettingsJson = "";

  const result = await postJson("/api/settings", {
    sizingMode: sizingModeSelect.value,
    botMode: botModeSelect.value,
    digitMode: digitModeSelect.value,
    settings: getSettingsPayload()
  });

  return result;
}

const eventSource = new EventSource("/api/stream");

eventSource.onmessage = (event) => {
  const payload = JSON.parse(event.data);

  if (payload.type === "tick") {
    const tick = payload.data || payload.tick || payload;
    const quote = Number(tick.quote ?? tick.price ?? tick.close);
    const symbol = tick.symbol ?? tick.market ?? tick.subscription?.symbol ?? marketSelect.value;

    tickOutput.textContent =
  `Symbol: ${symbol}\n` +
  `Quote: ${Number.isFinite(quote) ? quote.toFixed(3) : "-"}\n` +
  `Time: ${tick.epoch || tick.time || "-"}\n` +
  `Mode: ${botModeSelect.value}\n` +
  `Digit Mode: ${digitModeSelect.value}`;

    if (symbol === marketSelect.value && Number.isFinite(quote)) {
      pushCandle(selectedCandles, quote, TICKS_PER_CANDLE_MAIN, 60);
      drawMainChart();
    } else {
      addLog(`Tick ignored: symbol=${symbol} selected=${marketSelect.value} quote=${tick.quote ?? tick.price ?? "n/a"}`);
    }
  }

  if (payload.type === "snapshot") {
    const snap = payload.data || payload.snapshot || payload;
   snapshotOutput.textContent =
  `Connected: ${snap.connected ? "Yes" : "No"}\n` +
  `Authorized: ${snap.authorized ? "Yes" : "No"}\n` +
  `Running: ${snap.running ? "Yes" : "No"}\n` +
  `Market: ${snap.market || "-"}\n` +
  `Signal: ${snap.signal || "-"}\n` +
  `Balance: ${Number(snap.balance ?? 0).toFixed(2)}\n` +
  `Session Profit: ${Number(snap.sessionProfit ?? 0).toFixed(2)}\n` +
  `Trades: ${snap.tradeCount ?? 0}\n` +
  `Wins: ${snap.wins ?? 0}\n` +
  `Losses: ${snap.losses ?? 0}\n` +
  `Bot Mode: ${snap.botMode || "-"}\n` +
  `Digit Mode: ${snap.digitStats?.mode || "-"}`;
    updateStats(snap);
    renderAiInsightFromSnapshot(snap);
  }

  if (payload.type === "log") addLog(payload.message);
  if (payload.type === "error") addLog("ERROR: " + payload.message);
  if (payload.type === "copilot_reply") writeAiEvent("copilot_reply", payload.data || payload);
  if (payload.type === "strategy_insight") writeAiEvent("strategy_insight", payload.data || payload);
  if (payload.type === "risk_alert") writeAiEvent("risk_alert", payload.data || payload);
  if (payload.type === "memory_update") writeAiEvent("memory_update", payload.data || payload);
};

connectBtn.addEventListener("click", async () => {
  await fetch("/api/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: tokenInput.value })
  });
  addLog("Connect requested");
});

disconnectBtn.addEventListener("click", async () => {
  await fetch("/api/disconnect", { method: "POST" });
  addLog("Disconnect requested");
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST" });
  window.location.href = "/login";
});

manualBtn.addEventListener("click", () => {
  window.location.href = "/manual";
});

adminBtn.addEventListener("click", () => {
  window.location.href = "/admin";
});

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

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
      botMode: botModeSelect.value,
      digitMode: digitModeSelect.value,
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
      botMode: botModeSelect.value,
      digitMode: digitModeSelect.value,
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
      botMode: botModeSelect.value,
      digitMode: digitModeSelect.value,
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
  startBotBtn.disabled = true;

  try {
    addLog("Saving settings...");
    await saveSettingsAndModes();

    addLog(`Starting ticks for ${marketSelect.value}...`);
    await postJson("/api/ticks/start", {
      symbol: marketSelect.value
    });

    addLog(`Starting bot (${botModeSelect.value}/${digitModeSelect.value})...`);
    const result = await postJson("/api/bot/start", {
      sizingMode: sizingModeSelect.value,
      botMode: botModeSelect.value,
      digitMode: digitModeSelect.value,
      settings: getSettingsPayload()
    });

    addLog(result?.message || "Bot started successfully");
  } catch (err) {
    addLog(`START FAILED: ${err.message}`);
    console.error("Bot start failed:", err);
  } finally {
    startBotBtn.disabled = false;
  }
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

resetAnalyzerBtn.addEventListener("click", async () => {
  await fetch("/api/reset-analyzer", { method: "POST" });
  addLog("Analyzer reset requested");
});

resetLogsBtn.addEventListener("click", () => {
  logOutput.textContent = "";
});

if (copilotAskBtn) {
  copilotAskBtn.addEventListener("click", async () => {
    const query = copilotQueryInput?.value?.trim() || "Summarize my session";
    const data = await postJson("/api/copilot/query", { query });
    if (copilotOutput) {
      copilotOutput.textContent = `Q: ${data.query}
A: ${data.reply}`;
    }
  });
}

if (strategyReviewBtn) {
  strategyReviewBtn.addEventListener("click", async () => {
    const res = await fetch("/api/strategy/review");
    const data = await res.json();
    if (copilotOutput) {
      copilotOutput.textContent = JSON.stringify(data, null, 2);
    }
  });
}

if (memoryRefreshBtn) {
  memoryRefreshBtn.addEventListener("click", async () => {
    const res = await fetch("/api/memory/insights");
    const data = await res.json();
    if (memoryOutput) memoryOutput.textContent = JSON.stringify(data.memory || {}, null, 2);
  });
}

if (experimentsRefreshBtn) {
  experimentsRefreshBtn.addEventListener("click", async () => {
    const res = await fetch("/api/experiments");
    const data = await res.json();
    if (experimentsOutput) experimentsOutput.textContent = JSON.stringify(data, null, 2);
  });
}

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
});

checkAuth();
loadRole();
initTheme();
loadVersion();
