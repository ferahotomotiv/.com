require("dotenv").config();
const crypto = require("node:crypto");
const readline = require("node:readline/promises");
const bcrypt = require("bcryptjs");
const { openDatabase } = require("../src/db");
const path = require("node:path");

(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const username = (await rl.question("Merkez yönetici kullanıcı adı: ")).trim();
  const fullName = (await rl.question("Ad soyad: ")).trim();
  const password = await rl.question("En az 12 karakterli şifre: ");
  rl.close();
  if (!username || !fullName || password.length < 12) throw new Error("Kullanıcı adı/ad soyad gerekli; şifre en az 12 karakter olmalı.");
  const db = openDatabase(path.resolve(process.env.DATA_DIR || "./data"));
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO local_users (id,username,full_name,role,password_hash,is_active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)")
    .run(id, username, fullName, "admin", await bcrypt.hash(password, 12), now, now);
  console.log("Merkez yönetici yerel sunucuya eklendi. Şifrenizi güvenli yerde saklayın.");
  db.close();
})().catch(err => { console.error(err.message); process.exit(1); });
