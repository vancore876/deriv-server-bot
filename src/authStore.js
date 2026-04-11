import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf-8");

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function listUsers() {
  return readUsers();
}

export function getUser(username) {
  return readUsers().find((u) => u.username === username) || null;
}

export function isExpired(user) {
  if (!user?.expiresAt) return false;
  return Date.now() > new Date(user.expiresAt).getTime();
}

export function isBlocked(user) {
  if (!user) return true;
  return Boolean(user.isDisabled) || isExpired(user);
}

export async function createUser(username, password, extra = {}) {
  const users = readUsers();
  const exists = users.find((u) => u.username === username);
  if (exists) throw new Error("Username already exists");

  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    username,
    passwordHash,
    role: extra.role || "user",
    expiresAt: extra.expiresAt || null,
    isDisabled: extra.isDisabled || false,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    sessionVersion: 1
  };

  users.push(user);
  writeUsers(users);

  return {
    username: user.username,
    role: user.role,
    expiresAt: user.expiresAt,
    isDisabled: user.isDisabled
  };
}

export async function verifyUser(username, password) {
  const users = readUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  if (isBlocked(user)) return { blocked: true };

  user.lastLoginAt = new Date().toISOString();
  writeUsers(users);

  return {
    username: user.username,
    role: user.role || "user",
    sessionVersion: user.sessionVersion || 1
  };
}

export function updateUser(username, updates) {
  const users = readUsers();
  const index = users.findIndex((u) => u.username === username);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...updates
  };

  writeUsers(users);
  return users[index];
}

export function deleteUser(username) {
  const users = readUsers();
  const next = users.filter((u) => u.username !== username);
  if (next.length === users.length) return false;
  writeUsers(next);
  return true;
}

export function listSafeUsers() {
  return readUsers().map((u) => ({
    username: u.username,
    role: u.role || "user",
    isDisabled: Boolean(u.isDisabled),
    expiresAt: u.expiresAt || null,
    createdAt: u.createdAt || null,
    lastLoginAt: u.lastLoginAt || null,
    sessionVersion: u.sessionVersion || 1,
    isExpired: isExpired(u)
  }));
}