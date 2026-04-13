function winRate(trades = []) {
  if (!trades.length) return 0;
  return trades.filter((t) => t.result === "WIN").length / trades.length;
}

function avgProfit(trades = []) {
  if (!trades.length) return 0;
  return trades.reduce((sum, t) => sum + Number(t.profit || 0), 0) / trades.length;
}

export function reviewStrategy({ recentTrades = [], snapshot = {} } = {}) {
  const window = recentTrades.slice(0, 20);
  const rate = winRate(window);
  const avg = avgProfit(window);

  let recommendation = "Hold current setup and gather more samples.";
  if (window.length >= 8 && rate < 0.45) {
    recommendation = "Reduce risk: lower max stake, increase cooldown, and switch to observer mode for recalibration.";
  } else if (window.length >= 8 && rate > 0.6 && avg > 0) {
    recommendation = "Current edge looks healthy. Keep risk controls and scale slowly with anti-martingale.";
  }

  return {
    strategyHealth: rate >= 0.5 ? "stable" : "fragile",
    sampleSize: window.length,
    winRate: Number((rate * 100).toFixed(2)),
    avgProfit: Number(avg.toFixed(4)),
    recommendation,
    context: {
      botMode: snapshot.botMode,
      market: snapshot.market,
      signal: snapshot.signal
    }
  };
}
