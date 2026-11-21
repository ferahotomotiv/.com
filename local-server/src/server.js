require("dotenv").config();
const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const { SignJWT, jwtVerify } = require("jose");
const { z } = require("zod");
const { openDatabase } = require("./db");

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 8787);
const dataDir = path.resolve(process.env.DATA_DIR || "./data");
const secretText = process.env.JWT_SECRET || "";
if (secretText.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters. Set it in local-server/.env.");
  process.exit(1);
}
const secret = new TextEncoder().encode(secretText);
const db = openDatabase(dataDir);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",").map(v => v.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin(origin, cb) {
  if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error("Origin not allowed"));
}}));
app.use(express.json({ limit: "10mb" }));

function audit(actorId, action, tableName, recordId, details) {
  db.prepare("INSERT INTO audit_log (id,actor_id,action,table_name,record_id,details_json,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(crypto.randomUUID(), actorId || null, action, tableName || null, recordId || null,
      details ? JSON.stringify(details) : null, new Date().toISOString());
}
async function issueToken(user) {
  return new SignJWT({ role: user.role, username: user.username, name: user.full_name })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id)
    .setIssuedAt().setExpirationTime("12h").sign(secret);
}
async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Oturum gerekli." });
    const { payload } = await jwtVerify(token, secret);
    const user = db.prepare("SELECT id,username,full_name,role,is_active FROM local_users WHERE id=?").get(payload.sub);
    if (!user || !user.is_active) return res.status(401).json({ error: "Hesap etkin değil." });
    req.user = user; next();
  } catch { return res.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş." }); }
}
function managerOnly(req, res, next) {
  if (!["admin", "manager"].includes(req.user.role)) return res.status(403).json({ error: "Bu işlem için yönetici yetkisi gerekli." });
  next();
}

app.get("/health", (_req, res) => res.json({
  ok: true, service: "FERAH AUTO LOCAL SERVER", version: "1.0.0",
  time: new Date().toISOString(), database: "sqlite-wal",
  cloudSync: process.env.CLOUD_SYNC_ENABLED === "true" ? "configured-pending-integration" : "disabled",
  pendingSync: db.prepare("SELECT count(*) AS n FROM sync_outbox WHERE state='pending'").get().n
}));

app.post("/api/auth/login", async (req, res) => {
  const parsed = z.object({ username: z.string().min(1).max(80), password: z.string().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli." });
  const user = db.prepare("SELECT * FROM local_users WHERE username=? COLLATE NOCASE").get(parsed.data.username);
  if (!user || !user.is_active || !await bcrypt.compare(parsed.data.password, user.password_hash)) {
    return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı." });
  }
  audit(user.id, "local_login", null, null, {});
  res.json({ token: await issueToken(user), user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role } });
});

app.get("/api/session", auth, (req, res) => res.json({ user: req.user }));
app.get("/api/sync/status", auth, (req, res) => {
  const counts = db.prepare("SELECT state, count(*) AS count FROM sync_outbox GROUP BY state").all();
  res.json({ enabled: process.env.CLOUD_SYNC_ENABLED === "true", counts });
});

// Generic record writes are intentionally not exposed yet. They will be enabled only
// after each FERAH AUTO table has a validated schema, role policy and conflict strategy.
app.use("/api", (_req, res) => res.status(501).json({
  error: "Bu yerel sunucu temel aşamadadır. İş kayıtları, rol kuralları ve bulut eşitleme entegrasyonu tamamlanmadan yazma uçları açılmaz."
}));

app.listen(port, host, () => {
  console.log(`FERAH AUTO Local Server listening on http://${host}:${port}`);
  console.log(`Data directory: ${dataDir}`);
});
