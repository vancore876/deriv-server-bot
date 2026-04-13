export function buildMemoryInsights({ recentTrades = [] } = {}) {
  const trades = recentTrades.slice(0, 30);
  const byMarket = new Map();

  for (const trade of trades) {
    const key = trade.market || "unknown";
    const current = byMarket.get(key) || { market: key, wins: 0, losses: 0, pnl: 0 };
    if (trade.result === "WIN") current.wins += 1;
    if (trade.result === "LOSS") current.losses += 1;
    current.pnl += Number(trade.profit || 0);
    byMarket.set(key, current);
  }

  return {
    insights: Array.from(byMarket.values()).map((item) => ({
      ...item,
      pnl: Number(item.pnl.toFixed(2))
    })),
    notes: trades.length
      ? "Memory insights are based on latest settled trades."
      : "No trades yet for memory insights."
  };
}
