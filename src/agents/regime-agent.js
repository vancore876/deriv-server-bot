export function detectRegime({ snapshot = {} } = {}) {
  const moveText = String(snapshot.signal || "").toUpperCase();
  const analyzer = snapshot.digitStats || {};

  if (moveText.includes("TRADE BUY") || moveText.includes("TRADE SELL")) {
    return { regime: "trend", confidence: 0.62 };
  }

  if (analyzer.signal && analyzer.signal !== "NO TRADE") {
    return { regime: "digit-bias", confidence: 0.68 };
  }

  return { regime: "chop", confidence: 0.51 };
}
