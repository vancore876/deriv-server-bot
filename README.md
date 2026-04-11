# deriv-server-bot

🚀 Deriv Server Trading Bot (StratForge Engine)

A multi-user, server-based trading bot for Deriv volatility indices, featuring real-time dashboards, automated strategies, and an advanced digit analyzer system for data-driven trade execution.

✨ Features
🔐 Multi-user system
Secure login & signup
Individual dashboards per user
Admin panel to manage users and access time
📊 Live trading dashboard
Real-time tick data
Candle charts (not line charts)
Trade logs & recent trades table
Full P&L tracking (session & peak)
🤖 Automated trading modes
Trend strategy (EMA-based)
Digit Analyzer strategy (even/odd bias detection)
🧠 Advanced Digit Analyzer
Rolling analysis (50 / 100 / 200 ticks)
Bias detection for EVEN / ODD markets
Observer mode (analyze only)
Executable mode (auto trade on signal)
Adjustable precision (100 or 200 ticks)
Signal filtering for high-probability entries
⚙️ Risk & trade management
Fixed stake & anti-martingale
Trade cooldown system
Loss streak protection & pause logic
Max trades per session
Stop-loss / take-profit controls
🔄 Session controls
Reset trading session (P&L, trades)
Reset analyzer (clear digit memory)
Live settings update without restart
📘 Built-in manual
Explains bot usage
Shows how to get Deriv API token
Explains analyzer modes & settings
🧠 Strategy Overview
Digit Analyzer (Core System)

The bot analyzes last digits of tick prices and detects statistical bias:

Short-term pressure → last 50 ticks
Confirmation layer → last 100 ticks
Extended memory → up to 200 ticks

Trades are executed only when:

bias exceeds defined thresholds (e.g. 30 / 58)
streak conditions are safe
cooldown & risk filters are satisfied

This creates a filtered, probability-based execution system rather than random entries.

🎯 Example Configuration
Analyzer Precision: 200 ticks
Bias 50 Threshold: 30
Bias 100 Threshold: 58
Bias 200 Threshold: 0 (ignored)

Result:
- Strong signal filtering
- Fewer but higher-quality trades
⚠️ Disclaimer

This bot is for educational and experimental purposes.

Trading carries risk. Always:

Test on demo accounts first
Use small stake sizes
Do not expose your API token
🛠️ Tech Stack
Node.js (Backend)
WebSocket (Deriv API)
Express.js
Vanilla JS frontend
PM2 (process management)
VPS deployment ready
📦 Deployment
git clone https://github.com/your-repo.git
cd deriv-server-bot
npm install
pm2 start src/server.js --name deriv-bot
👑 Admin Features
View all users
Set account expiration timers
Disable users remotely
Control access to bot system
🔮 Future Improvements
AI-assisted signal tuning
Auto-threshold adjustment
Strategy switching engine
Trade analytics dashboard
Mobile optimization
