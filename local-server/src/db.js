const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

function openDatabase(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "ferah-auto.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = FULL");
  const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  db.exec(schema);
  return db;
}

module.exports = { openDatabase };
