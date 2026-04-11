import express from "express";
import dotenv from "dotenv";
import path from "path";
import session from "express-session";
import { fileURLToPath } from "url";
import {
  createUser,
  verifyUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  listSafeUsers,
  isBlocked
} from "./authStore.js";
import { getUserBot } from "./botRegistry.js";
import { presets } from "./presets.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "..", "public");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret-now",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

function requireAuth(req, res, next) {
  const username = req.session?.user?.username;
  if (!username) return res.redirect("/login");

  const user = getUser(username);
  if (!user || isBlocked(user)) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }

  if ((user.sessionVersion || 1) !== (req.session.user.sessionVersion || 1)) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }

  req.currentUser = user;
  next();
}

function requireApiAuth(req, res, next) {
  const username = req.session?.user?.username;
  if (!username) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const user = getUser(username);
  if (!user || isBlocked(user)) {
    req.session.destroy(() => {
      res.status(403).json({ ok: false, error: "Account disabled or expired" });
    });
    return;
  }

  if ((user.sessionVersion || 1) !== (req.session.user.sessionVersion || 1)) {
    req.session.destroy(() => {
      res.status(403).json({ ok: false, error: "Session expired" });
    });
    return;
  }

  req.currentUser = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.currentUser || req.currentUser.role !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin only" });
  }
  next();
}

function redirectIfLoggedIn(req, res, next) {
  if (req.session?.user?.username) return res.redirect("/");
  next();
}

app.get("/login", redirectIfLoggedIn, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

app.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "signup.html"));
});

app.get("/admin", requireAuth, (req, res) => {
  if (req.currentUser.role !== "admin") return res.redirect("/");
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

app.get("/manual", requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "manual.html"));
});

app.post("/auth/signup", redirectIfLoggedIn, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters" });
    }

    const role = listUsers().length === 0 || username === "vancore36" ? "admin" : "user";
    const user = await createUser(username, password, { role });

    req.session.user = {
      username: user.username,
      role: user.role,
      sessionVersion: 1
    };

    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/auth/login", redirectIfLoggedIn, async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  const user = await verifyUser(username, password);

  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid username or password" });
  }

  if (user.blocked) {
    return res.status(403).json({ ok: false, error: "Account disabled or expired" });
  }

  req.session.user = {
    username: user.username,
    role: user.role || "user",
    sessionVersion: user.sessionVersion || 1
  };

  res.json({ ok: true, user });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/auth/status", (req, res) => {
  const username = req.session?.user?.username || null;
  const user = username ? getUser(username) : null;

  res.json({
    ok: true,
    loggedIn: Boolean(username && user && !isBlocked(user)),
    username,
    role: user?.role || null,
    expiresAt: user?.expiresAt || null,
    isDisabled: Boolean(user?.isDisabled),
    signupEnabled: true,
    userCount: listUsers().length
  });
});

app.get("/", requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use(express.static(PUBLIC_DIR));
app.use("/api", requireApiAuth);

function currentBot(req) {
  return getUserBot(req.currentUser.username);
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "deriv-multi-user-bot",
    user: req.currentUser.username,
    role: req.currentUser.role
  });
});

app.get("/api/stream", (req, res) => {
  const bot = currentBot(req);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const unsubscribe = bot.addListener((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  res.write(`data: ${JSON.stringify({ type: "snapshot", data: bot.session.snapshot() })}\n\n`);

  req.on("close", () => {
    unsubscribe();
  });
});

app.post("/api/connect", (req, res) => {
  const bot = currentBot(req);
  const token = String(req.body.token || "");
  bot.session.connect(token);
  res.json({ ok: true });
});

app.post("/api/settings", (req, res) => {
  const bot = currentBot(req);
  bot.session.updateSettings({
    settings: req.body.settings || {},
    sizingMode: req.body.sizingMode,
    contractType: req.body.contractType,
    botMode: req.body.botMode,
    digitMode: req.body.digitMode
  });
  bot.session.broadcast("snapshot", { data: bot.session.snapshot() });
  res.json({ ok: true, settings: bot.state.settings });
});

app.post("/api/preset", (req, res) => {
  const bot = currentBot(req);
  const preset = presets[req.body.preset];
  if (!preset) return res.status(400).json({ ok: false, error: "Invalid preset" });

  bot.session.applyPreset(preset);
  bot.session.broadcast("snapshot", { data: bot.session.snapshot() });
  res.json({ ok: true, settings: bot.state.settings });
});

app.post("/api/ticks/start", (req, res) => {
  const bot = currentBot(req);
  const result = bot.session.startTicks(req.body.symbol);
  res.json(result);
});

app.post("/api/bot/start", (req, res) => {
  const bot = currentBot(req);
  bot.session.startBot();
  bot.session.broadcast("log", { message: "Bot started" });
  bot.session.broadcast("snapshot", { data: bot.session.snapshot() });
  res.json({ ok: true });
});

app.post("/api/bot/stop", (req, res) => {
  const bot = currentBot(req);
  bot.session.stopBot();
  bot.session.broadcast("log", { message: "Bot stopped" });
  bot.session.broadcast("snapshot", { data: bot.session.snapshot() });
  res.json({ ok: true });
});

app.post("/api/reset-session", (req, res) => {
  const bot = currentBot(req);
  bot.session.resetSession();
  bot.session.broadcast("log", { message: "Session reset" });
  bot.session.broadcast("snapshot", { data: bot.session.snapshot() });
  res.json({ ok: true });
});

app.post("/api/disconnect", (req, res) => {
  const bot = currentBot(req);
  bot.session.disconnect();
  bot.session.broadcast("log", { message: "Disconnected from Deriv" });
  bot.session.broadcast("snapshot", { data: bot.session.snapshot() });
  res.json({ ok: true });
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({
    ok: true,
    user: {
      username: req.currentUser.username,
      role: req.currentUser.role
    }
  });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  res.json({
    ok: true,
    users: listSafeUsers()
  });
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const role = req.body.role === "admin" ? "admin" : "user";
    const expiresAt = req.body.expiresAt || null;

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters" });
    }

    const user = await createUser(username, password, {
      role,
      expiresAt,
      isDisabled: false
    });

    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/admin/users/update", requireAdmin, (req, res) => {
  const { username, expiresAt, isDisabled, role } = req.body;

  if (!username) {
    return res.status(400).json({ ok: false, error: "Username is required" });
  }

  const updates = {};
  if (expiresAt !== undefined) updates.expiresAt = expiresAt || null;
  if (isDisabled !== undefined) updates.isDisabled = Boolean(isDisabled);
  if (role !== undefined) updates.role = role === "admin" ? "admin" : "user";

  const updated = updateUser(username, updates);
  if (!updated) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  res.json({ ok: true, user: updated });
});

app.post("/api/admin/users/delete", requireAdmin, (req, res) => {
  const username = String(req.body.username || "").trim();

  if (!username) {
    return res.status(400).json({ ok: false, error: "Username is required" });
  }

  if (username === "vancore36") {
    return res.status(400).json({ ok: false, error: "Cannot delete main admin" });
  }

  const ok = deleteUser(username);
  if (!ok) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  res.json({ ok: true });
});

app.post("/api/admin/users/force-logout", requireAdmin, (req, res) => {
  const username = String(req.body.username || "").trim();
  const user = getUser(username);

  if (!user) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const updated = updateUser(username, {
    sessionVersion: (user.sessionVersion || 1) + 1
  });

  res.json({ ok: true, user: updated });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});