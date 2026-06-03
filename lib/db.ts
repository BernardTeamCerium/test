import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Store the SQLite file under ./data so it persists between runs but stays
// out of version control (see .gitignore).
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "crm.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Reuse a single connection across hot reloads in development.
const globalForDb = globalThis as unknown as { _crmDb?: Database.Database };

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      email          TEXT    NOT NULL DEFAULT '',
      phone          TEXT    NOT NULL DEFAULT '',
      company        TEXT    NOT NULL DEFAULT '',
      source         TEXT    NOT NULL DEFAULT 'Other',
      status         TEXT    NOT NULL DEFAULT 'New',
      spend          REAL    NOT NULL DEFAULT 0,
      value          REAL    NOT NULL DEFAULT 0,
      assigned_agent TEXT    NOT NULL DEFAULT '',
      notes          TEXT    NOT NULL DEFAULT '',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS call_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      agent      TEXT    NOT NULL DEFAULT '',
      outcome    TEXT    NOT NULL DEFAULT '',
      note       TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);
  `);

  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM leads").get() as {
    n: number;
  };
  if (count.n > 0) return;

  const insert = db.prepare(`
    INSERT INTO leads (name, email, phone, company, source, status, spend, value, assigned_agent, notes)
    VALUES (@name, @email, @phone, @company, @source, @status, @spend, @value, @assigned_agent, @notes)
  `);

  const sample = [
    { name: "Amara Johnson", email: "amara.j@example.com", phone: "+1-555-0101", company: "Brightside Realty", source: "Facebook Ads", status: "New", spend: 42.5, value: 0, assigned_agent: "Dana", notes: "Downloaded pricing guide." },
    { name: "Carlos Rivera", email: "carlos.r@example.com", phone: "+1-555-0102", company: "Rivera Construction", source: "Google Ads", status: "Contacted", spend: 65.0, value: 0, assigned_agent: "Dana", notes: "Left voicemail, will retry tomorrow." },
    { name: "Destiny Brooks", email: "destiny.b@example.com", phone: "+1-555-0103", company: "", source: "Referral", status: "Qualified", spend: 0, value: 0, assigned_agent: "Miguel", notes: "Budget confirmed, sending proposal." },
    { name: "Ethan Wells", email: "ethan.w@example.com", phone: "+1-555-0104", company: "Wells & Co", source: "Google Ads", status: "Converted", spend: 58.25, value: 2400, assigned_agent: "Miguel", notes: "Signed annual plan." },
    { name: "Fatima Noor", email: "fatima.n@example.com", phone: "+1-555-0105", company: "Noor Designs", source: "Facebook Ads", status: "Converted", spend: 47.8, value: 1800, assigned_agent: "Dana", notes: "Upsold to premium tier." },
    { name: "George Kim", email: "george.k@example.com", phone: "+1-555-0106", company: "", source: "LinkedIn", status: "Lost", spend: 90.0, value: 0, assigned_agent: "Priya", notes: "Went with a competitor." },
    { name: "Hannah Lopez", email: "hannah.l@example.com", phone: "+1-555-0107", company: "Lopez Catering", source: "Referral", status: "Contacted", spend: 0, value: 0, assigned_agent: "Priya", notes: "Interested, scheduling a demo." },
    { name: "Ibrahim Saleh", email: "ibrahim.s@example.com", phone: "+1-555-0108", company: "Saleh Imports", source: "Google Ads", status: "New", spend: 71.4, value: 0, assigned_agent: "", notes: "" },
  ];

  const seed = db.transaction((rows: typeof sample) => {
    for (const r of rows) insert.run(r);
  });
  seed(sample);
}

export function getDb(): Database.Database {
  if (!globalForDb._crmDb) {
    globalForDb._crmDb = createDb();
  }
  return globalForDb._crmDb;
}
