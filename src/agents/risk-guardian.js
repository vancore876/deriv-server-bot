export function evaluateRisk({ snapshot = {} } = {}) {
  const maxLosses = Number(snapshot.settings?.maxLosses || 5);
  const lossStreak = Number(snapshot.lossStreak || 0);
  const sessionProfit = Number(snapshot.sessionProfit || 0);
  const stopLossPercent = Number(snapshot.settings?.stopLossPercent || 1);

  let level = "ok";
  let message = "Risk is within configured limits.";

  if (lossStreak >= maxLosses || sessionProfit <= -Math.abs(stopLossPercent)) {
    level = "critical";
    message = "Risk guard triggered: stop bot, reset analyzer, and review strategy before resuming.";
  } else if (lossStreak >= Math.max(2, maxLosses - 1)) {
    level = "warning";
    message = "Loss streak approaching hard-stop threshold. Reduce stake and wait for clearer conditions.";
  }

  return {
    level,
    message,
    lossStreak,
    maxLosses,
    sessionProfit
  };
}
