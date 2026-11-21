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

app.get("/", (_req, res) => res.type("html").send(`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FERAH AUTO</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#0b0d10;color:#f4f5f7;font:16px Segoe UI,Arial;display:grid;place-items:center;padding:24px}
main{width:min(620px,100%);background:#15191f;border:1px solid #2b313b;border-radius:18px;padding:32px;box-shadow:0 20px 70px #0008}
.mark{color:#f3bd32;font-weight:800;letter-spacing:3px;font-size:14px}h1{font-size:30px;margin:12px 0}p{color:#b8c0cc;line-height:1.6}.status{display:flex;align-items:center;gap:10px;margin:24px 0;padding:14px;border-radius:10px;background:#10271d;color:#9be4b5}.dot{width:10px;height:10px;border-radius:50%;background:#39c875}
small{color:#7f8997}code{color:#f3bd32}
</style></head><body><main><div class="mark">FERAH AUTO</div><h1>Yerel sunucu çalışıyor</h1>
<div class="status"><span class="dot"></span> Sunucu bağlantısı başarılı</div>
<p>Windows sunucu bileşeni kuruldu ve yerel ağ üzerinden erişilebilir durumda.</p>
<p><b>Önemli:</b> Araç, müşteri, servis, stok ve finans yönetim panelinin bu yerel sunucuya entegrasyonu henüz tamamlanmadı. Bu sayfa yalnızca sunucu durumunu gösterir.</p>
<small>FERAH AUTO Local Server · <code>127.0.0.1:8787</code></small></main></body></html>`));

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
