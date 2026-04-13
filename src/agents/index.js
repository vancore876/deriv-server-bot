import { reviewStrategy } from "./strategy-lab.js";
import { summarizeSession } from "./session-reviewer.js";
import { evaluateRisk } from "./risk-guardian.js";
import { buildMemoryInsights } from "./memory-curator.js";
import { detectRegime } from "./regime-agent.js";

export class OpenClawOrchestrator {
  run(snapshot = {}) {
    const recentTrades = snapshot.recentTrades || [];
    const strategy = reviewStrategy({ recentTrades, snapshot });
    const session = summarizeSession({ snapshot, recentTrades });
    const risk = evaluateRisk({ snapshot });
    const regime = detectRegime({ snapshot });
    const memory = buildMemoryInsights({ recentTrades });

    return {
      strategy,
      session,
      risk,
      regime,
      memory,
      generatedAt: new Date().toISOString()
    };
  }
}

export class OpenJarvisCopilot {
  answer({ query = "", context = {} } = {}) {
    const q = String(query || "").toLowerCase();
    const { strategy = {}, risk = {}, session = {}, regime = {} } = context;

    if (q.includes("lose") || q.includes("loss")) {
      return `Recent performance shows ${session.winRate || 0}% win rate. Risk level is ${risk.level || "ok"}. ${risk.message || ""}`;
    }

    if (q.includes("preset") || q.includes("best")) {
      return `${strategy.recommendation || "Collect more samples before changing presets."} Current regime: ${regime.regime || "unknown"}.`;
    }

    if (q.includes("switch") || q.includes("mode")) {
      return regime.regime === "digit-bias"
        ? "Digit bias regime detected; executable digit mode can be used with strict trade limits."
        : "Regime is not strongly biased; observer mode is safer until conviction improves.";
    }

    return `Session summary: ${session.summary || "No active summary."} Strategy health: ${strategy.strategyHealth || "n/a"}.`;
  }
}
