#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-/tmp/deriv-arena}"
MODE="${2:---backend-only}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Target directory not found: $TARGET_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR/src/agents"

cat > "$TARGET_DIR/src/agents/strategy-lab.js" <<'EOF'
function reviewStrategy({ recentTrades = [] }) {
  const wins = recentTrades.filter((t) => Number(t?.profit) > 0).length;
  const total = recentTrades.length || 0;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return {
    winRate,
    strategyHealth: winRate >= 55 ? 'good' : winRate >= 45 ? 'neutral' : 'weak',
    recommendation: winRate < 45 ? 'Reduce risk and increase cooldown until win rate improves.' : 'Keep current preset and monitor drawdown.'
  };
}
module.exports = { reviewStrategy };
EOF

cat > "$TARGET_DIR/src/agents/session-reviewer.js" <<'EOF'
function summarizeSession({ snapshot = {}, recentTrades = [] }) {
  const wins = Number(snapshot.wins || 0);
  const losses = Number(snapshot.losses || 0);
  const total = recentTrades.length || wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  return {
    winRate,
    summary: `Session ${snapshot.running ? 'running' : 'idle'} with ${wins}W/${losses}L and ${Number(snapshot.sessionProfit || 0).toFixed(2)} PnL.`
  };
}
module.exports = { summarizeSession };
EOF

cat > "$TARGET_DIR/src/agents/risk-guardian.js" <<'EOF'
function evaluateRisk({ snapshot = {} }) {
  const lossStreak = Number(snapshot.lossStreak || 0);
  if (lossStreak >= 3) return { level: 'high', message: 'Loss streak elevated. Pause and reassess entry quality.' };
  if (lossStreak >= 2) return { level: 'medium', message: 'Caution: tighten risk settings.' };
  return { level: 'low', message: 'Risk state normal.' };
}
module.exports = { evaluateRisk };
EOF

cat > "$TARGET_DIR/src/agents/memory-curator.js" <<'EOF'
function buildMemoryInsights({ recentTrades = [] }) {
  const last = recentTrades.slice(-5);
  return {
    recentSample: last.length,
    note: last.length ? 'Memory updated from latest trades.' : 'No trade memory yet.'
  };
}
module.exports = { buildMemoryInsights };
EOF

cat > "$TARGET_DIR/src/agents/regime-agent.js" <<'EOF'
function detectRegime({ snapshot = {} }) {
  const move = Math.abs(Number(snapshot.movePercent || 0));
  return { regime: move > 0.08 ? 'high-volatility' : 'balanced' };
}
module.exports = { detectRegime };
EOF

cat > "$TARGET_DIR/src/agents/index.js" <<'EOF'
const { reviewStrategy } = require('./strategy-lab.js');
const { summarizeSession } = require('./session-reviewer.js');
const { evaluateRisk } = require('./risk-guardian.js');
const { buildMemoryInsights } = require('./memory-curator.js');
const { detectRegime } = require('./regime-agent.js');

class OpenClawOrchestrator {
  run(snapshot = {}) {
    const recentTrades = snapshot.recentTrades || [];
    return {
      strategy: reviewStrategy({ recentTrades, snapshot }),
      session: summarizeSession({ snapshot, recentTrades }),
      risk: evaluateRisk({ snapshot }),
      regime: detectRegime({ snapshot }),
      memory: buildMemoryInsights({ recentTrades }),
      generatedAt: new Date().toISOString()
    };
  }
}

class OpenJarvisCopilot {
  answer({ query = '', context = {} } = {}) {
    const q = String(query || '').toLowerCase();
    if (q.includes('lose') || q.includes('loss')) return `Risk: ${context.risk?.level || 'n/a'} · ${context.risk?.message || ''}`;
    if (q.includes('preset') || q.includes('best')) return context.strategy?.recommendation || 'Collect more samples before changing presets.';
    return `Session summary: ${context.session?.summary || 'No summary yet.'}`;
  }
}

module.exports = { OpenClawOrchestrator, OpenJarvisCopilot };
EOF

cat > "$TARGET_DIR/src/openclaw-jarvis-routes.js" <<'EOF'
const { OpenClawOrchestrator, OpenJarvisCopilot } = require('./agents/index.js');

function installOpenClawJarvisRoutes({ app, getSnapshot, broadcast }) {
  const orchestrator = new OpenClawOrchestrator();
  const copilot = new OpenJarvisCopilot();

  function runAi(snapshot) {
    const insights = orchestrator.run(snapshot || {});
    return { snapshot, insights };
  }

  app.get('/api/version', (_req, res) => {
    res.json({ ok: true, version: process.env.UI_VERSION || 'arena-ai-bridge-1', aiEnabled: true });
  });

  app.post('/api/copilot/query', (req, res) => {
    const snapshot = getSnapshot(req);
    const { insights } = runAi(snapshot);
    const query = String(req.body?.query || '');
    const reply = copilot.answer({ query, context: insights });
    broadcast(req, 'copilot_reply', { query, reply, generatedAt: new Date().toISOString() });
    res.json({ ok: true, query, reply, context: insights });
  });

  app.get('/api/strategy/review', (req, res) => {
    const snapshot = getSnapshot(req);
    const { insights } = runAi(snapshot);
    broadcast(req, 'strategy_insight', insights.strategy);
    broadcast(req, 'risk_alert', insights.risk);
    res.json({ ok: true, strategy: insights.strategy, risk: insights.risk, regime: insights.regime, session: insights.session });
  });

  app.get('/api/memory/insights', (req, res) => {
    const snapshot = getSnapshot(req);
    const { insights } = runAi(snapshot);
    broadcast(req, 'memory_update', insights.memory);
    res.json({ ok: true, memory: insights.memory, generatedAt: insights.generatedAt });
  });

  app.get('/api/experiments', (req, res) => {
    const snapshot = getSnapshot(req);
    const { insights } = runAi(snapshot);
    res.json({
      ok: true,
      regime: insights.regime,
      experiments: [
        { id: 'arena-exp-1', title: 'Cooldown Stress Test', action: 'Raise cooldown by 20% for 10 trades.' },
        { id: 'arena-exp-2', title: 'Digit Barrier Validation', action: 'Increase digit barrier threshold for one session.' }
      ]
    });
  });
}

module.exports = { installOpenClawJarvisRoutes };
EOF

if [[ "$MODE" == "--include-ui" ]]; then
  mkdir -p "$TARGET_DIR/public/js" "$TARGET_DIR/public/css"
  cp "$ROOT_DIR/public/index.html" "$TARGET_DIR/public/index.html"
  cp "$ROOT_DIR/public/app.js" "$TARGET_DIR/public/js/app.js"
  cp "$ROOT_DIR/public/styles.css" "$TARGET_DIR/public/css/style.css"
  echo "Copied backend + UI files to $TARGET_DIR"
else
  echo "Copied backend AI files only (UI untouched) to $TARGET_DIR"
fi
