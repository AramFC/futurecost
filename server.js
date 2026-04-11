const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

const SESSION_COOKIE_NAME = "fc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]", "utf8");
  }

  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, "[]", "utf8");
  }
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed reading ${filePath}:`, error);
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function getUsers() {
  return readJsonFile(USERS_FILE, []);
}

function saveUsers(users) {
  writeJsonFile(USERS_FILE, users);
}

function getSessions() {
  return readJsonFile(SESSIONS_FILE, []);
}

function saveSessions(sessions) {
  writeJsonFile(SESSIONS_FILE, sessions);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function hashPassword(password, saltHex = null) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return {
    salt: salt.toString("hex"),
    hash: hash.toString("hex")
  };
}

function verifyPassword(password, saltHex, expectedHashHex) {
  const computed = hashPassword(password, saltHex);
  const expected = Buffer.from(expectedHashHex, "hex");
  const actual = Buffer.from(computed.hash, "hex");

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};

  header.split(";").forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });

  return cookies;
}

function createSession(userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const sessions = getSessions();
  const now = Date.now();

  sessions.push({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });

  saveSessions(sessions);

  return rawToken;
}

function clearExpiredSessions() {
  const sessions = getSessions();
  const now = Date.now();
  const filtered = sessions.filter((session) => Number(session.expiresAt) > now);

  if (filtered.length !== sessions.length) {
    saveSessions(filtered);
  }
}

function getAuthenticatedUser(req) {
  clearExpiredSessions();

  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];

  if (!rawToken) return null;

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const sessions = getSessions();
  const session = sessions.find((item) => item.tokenHash === tokenHash);

  if (!session) return null;

  const users = getUsers();
  const user = users.find((item) => item.id === session.userId);

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function removeSessionByRawToken(rawToken) {
  if (!rawToken) return;

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const sessions = getSessions().filter((item) => item.tokenHash !== tokenHash);
  saveSessions(sessions);
}

function setSessionCookie(res, rawToken) {
  const isProduction = process.env.NODE_ENV === "production";

  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${isProduction ? "; Secure" : ""}`
  );
}

function clearSessionCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";

  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isProduction ? "; Secure" : ""}`
  );
}

function requireAuth(req, res, next) {
  const user = getAuthenticatedUser(req);

  if (!user) {
    return res.status(401).json({
      ok: false,
      message: "You must be signed in."
    });
  }

  req.user = user;
  next();
}

ensureDataFiles();

app.get("/api/health", (req, res) => {
  res.json({
    ok: true
  });
});

// ================================
// MARKET HISTORY API (MERGED)
// ================================

app.get("/api/market-history", async (req, res) => {
  const symbol = req.query.symbol?.trim();

  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol" });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing Twelve Data API key" });
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1month");
  url.searchParams.set("outputsize", "120");
  url.searchParams.set("format", "JSON");
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString());
    const json = await response.json();

    if (!json || !Array.isArray(json.values)) {
      return res.status(502).json({
        error: "Upstream data unavailable",
        details: json?.message || json?.status || null
      });
    }

    const series = json.values
      .map((point) => ({
        date: point.datetime,
        close: Number(point.close)
      }))
      .filter((point) => Number.isFinite(point.close))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      symbol,
      source: "Twelve Data",
      interval: "1month",
      series
    });
  } catch (error) {
    console.error("Market history fetch failed:", error);
    return res.status(500).json({ error: "Server fetch failed" });
  }
});

app.post("/api/auth/signup", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email || "");
  const password = String(req.body?.password || "");

  if (!name || !email || !password) {
    return res.status(400).json({
      ok: false,
      message: "Name, email, and password are required."
    });
  }

  if (name.length < 2) {
    return res.status(400).json({
      ok: false,
      message: "Name must be at least 2 characters."
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      ok: false,
      message: "Enter a valid email address."
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      ok: false,
      message: "Password must be at least 8 characters."
    });
  }

  const users = getUsers();
  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    return res.status(409).json({
      ok: false,
      message: "An account with that email already exists."
    });
  }

  const passwordRecord = hashPassword(password);
  const newUser = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordSalt: passwordRecord.salt,
    passwordHash: passwordRecord.hash,
    createdAt: Date.now()
  };

  users.push(newUser);
  saveUsers(users);

  const rawToken = createSession(newUser.id);
  setSessionCookie(res, rawToken);

  return res.status(201).json({
    ok: true,
    message: "Account created successfully.",
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt
    }
  });
});

app.post("/api/auth/signin", (req, res) => {
  const email = normalizeEmail(req.body?.email || "");
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      message: "Email and password are required."
    });
  }

  const users = getUsers();
  const user = users.find((item) => item.email === email);

  if (!user) {
    return res.status(401).json({
      ok: false,
      message: "Invalid email or password."
    });
  }

  const validPassword = verifyPassword(password, user.passwordSalt, user.passwordHash);

  if (!validPassword) {
    return res.status(401).json({
      ok: false,
      message: "Invalid email or password."
    });
  }

  const rawToken = createSession(user.id);
  setSessionCookie(res, rawToken);

  return res.json({
    ok: true,
    message: "Signed in successfully.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }
  });
});

app.post("/api/auth/signout", (req, res) => {
  const cookies = parseCookies(req);
  const rawToken = cookies[SESSION_COOKIE_NAME];

  if (rawToken) {
    removeSessionByRawToken(rawToken);
  }

  clearSessionCookie(res);

  return res.json({
    ok: true,
    message: "Signed out."
  });
});

app.get("/api/auth/me", (req, res) => {
  const user = getAuthenticatedUser(req);

  if (!user) {
    return res.status(401).json({
      ok: false,
      message: "No active session."
    });
  }

  return res.json({
    ok: true,
    user
  });
});

/*
  OPTIONAL NEXT STEP:
  Put any protected user-only routes below this line, for example:
  - GET /api/user/history
  - POST /api/user/history
  - DELETE /api/user/history/:id
*/

app.use(express.static(ROOT_DIR));

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

app.get("/:page(signin|terms|privacy|contact|disclaimer).html", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, `${req.params.page}.html`));
});

app.listen(PORT, () => {
  console.log(`FutureCost server running on http://localhost:${PORT}`);
});