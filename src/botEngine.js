import { computeSignal, updateIndicators } from "./strategy.js";

function clampStake(state, value) {
  const minStake = Math.max(0.35, Number(state.settings.minStake || 0.35));
  const maxStake = Math.max(minStake, Number(state.settings.maxStake || minStake));
  return Math.round(Math.max(minStake, Math.min(maxStake, value)) * 100) / 100;
}

export function resetStake(state) {
  state.currentStake = clampStake(state, state.settings.baseStake);
}

export function applyStakeResult(state, result) {
  if (state.sizingMode === "fixed") {
    resetStake(state);
    return;
  }

  if (state.sizingMode === "anti_martingale") {
    let nextStake = state.currentStake;

    if (result === "WIN") {
      nextStake *= Number(state.settings.winMultiplier || 1);
    } else {
      nextStake *= Number(state.settings.lossMultiplier || 1);
    }

    state.currentStake = clampStake(state, nextStake);
    return;
  }

  resetStake(state);
}

export function canTradeNow(state) {
  const cooldown = Math.round(state.settings.cooldownMs * (1 + state.lossStreak * 0.8));
  return Date.now() - state.lastTradeTime >= cooldown;
}

export function isPaused(state) {
  return Date.now() < state.pauseUntil || Date.now() < state.blockedUntil;
}

export function handleTickForBot(state, price) {
  updateIndicators(state, price);

  if (!state.running || state.tradeInProgress || isPaused(state) || !canTradeNow(state)) {
    return null;
  }

  return computeSignal(state);
}