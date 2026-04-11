function ema(prev, value, length) {
  const k = 2 / (length + 1);
  return prev == null ? value : value * k + prev * (1 - k);
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function getRecentMoves(ticks, lookback) {
  const moves = [];
  for (let i = Math.max(1, ticks.length - lookback + 1); i < ticks.length; i++) {
    moves.push(ticks[i] - ticks[i - 1]);
  }
  return moves;
}

function getSlope(values, length = 4) {
  if (!values || values.length < length) return 0;
  const slice = values.slice(-length);
  return slice[slice.length - 1] - slice[0];
}

export function updateIndicators(state, price) {
  state.ticks.push(price);
  if (state.ticks.length > 300) state.ticks.shift();

  state.emaFast = ema(state.emaFast, price, state.settings.fastEmaLength);
  state.emaSlow = ema(state.emaSlow, price, state.settings.slowEmaLength);

  state.emaFastHistory.push(state.emaFast);
  state.emaSlowHistory.push(state.emaSlow);

  if (state.emaFastHistory.length > 20) state.emaFastHistory.shift();
  if (state.emaSlowHistory.length > 20) state.emaSlowHistory.shift();
}

export function computeSignal(state) {
  const n = state.ticks.length;
  const s = state.settings;

  if (n < s.warmupTicks) {
    state.lastSignalText = `warming ${n}/${s.warmupTicks}`;
    return null;
  }

  const price = state.ticks[n - 1];
  const prev = state.ticks[n - 2];
  const base = state.ticks[Math.max(0, n - s.moveWindow)];

  const recentMoves = getRecentMoves(state.ticks, s.moveWindow);
  const absMoves = recentMoves.map((m) => Math.abs(m));
  const avgAbsMove = average(absMoves);

  let upMoves = 0;
  let downMoves = 0;
  for (const move of recentMoves) {
    if (move > 0) upMoves++;
    if (move < 0) downMoves++;
  }

  const microMomentumPct = prev ? Math.abs((price - prev) / prev) * 100 : 0;
  const moveRangePct = base ? Math.abs((price - base) / base) * 100 : 0;
  const emaGapPct = price ? Math.abs((state.emaFast - state.emaSlow) / price) * 100 : 0;

  const fastSlope = getSlope(state.emaFastHistory, 4);
  const slowSlope = getSlope(state.emaSlowHistory, 4);

  const bullishTrend = state.emaFast > state.emaSlow;
  const bearishTrend = state.emaFast < state.emaSlow;
  const bullishSlope = fastSlope > 0 && slowSlope >= 0;
  const bearishSlope = fastSlope < 0 && slowSlope <= 0;

  const latestMove = price - prev;
  const chopRatio = avgAbsMove > 0 ? Math.abs(latestMove) / avgAbsMove : 0;

  if (emaGapPct < s.emaGapThreshold) {
    state.lastSignalText = `skip: weak trend gap ${emaGapPct.toFixed(3)}%`;
    return null;
  }

  if (microMomentumPct < s.microMoveThreshold) {
    state.lastSignalText = `skip: weak micro move ${microMomentumPct.toFixed(3)}%`;
    return null;
  }

  if (moveRangePct < s.microMoveThreshold * 2.2) {
    state.lastSignalText = `skip: tiny range ${moveRangePct.toFixed(3)}%`;
    return null;
  }

  if (chopRatio < 0.6) {
    state.lastSignalText = `skip: choppy ratio ${chopRatio.toFixed(2)}`;
    return null;
  }

  if (bullishTrend && bullishSlope && upMoves >= s.confirmTicks && latestMove > 0) {
    state.lastSignalText = `CALL | up ${upMoves}/${s.moveWindow - 1} | gap ${emaGapPct.toFixed(3)}%`;
    return "CALL";
  }

  if (bearishTrend && bearishSlope && downMoves >= s.confirmTicks && latestMove < 0) {
    state.lastSignalText = `PUT | down ${downMoves}/${s.moveWindow - 1} | gap ${emaGapPct.toFixed(3)}%`;
    return "PUT";
  }

  state.lastSignalText = `skip: no clean setup | up ${upMoves} down ${downMoves}`;
  return null;
}