export function summarizeSession({ snapshot = {}, recentTrades = [] } = {}) {
  const pnl = Number(snapshot.sessionProfit || 0);
  const wins = Number(snapshot.wins || 0);
  const losses = Number(snapshot.losses || 0);
  const total = wins + losses;
  const rate = total ? (wins / total) * 100 : 0;

  let summary = "Session is in warm-up; not enough data yet.";
  if (total >= 5) {
    summary = pnl >= 0
      ? "Session is net positive with controlled drawdown."
      : "Session is net negative; tighten filters and pause after loss streaks.";
  }

  return {
    summary,
    trades: total,
    winRate: Number(rate.toFixed(2)),
    sessionProfit: Number(pnl.toFixed(2)),
    topReason: recentTrades[0]?.reason || "n/a"
  };
}
