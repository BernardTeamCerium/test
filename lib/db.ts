import { createClient, type Client, type InArgs } from "@libsql/client";
import path from "path";
import fs from "fs";
import { hashPassword } from "./password";

// ── Async wrapper ───────────────────────────────────────────────────────────
// libSQL's client is async, so we expose a tiny wrapper that mimics the slice
// of the better-sqlite3 API the app uses (prepare().get/all/run). Call sites
// only had to add `await`. Storage is Turso/libSQL in production
// (TURSO_DATABASE_URL) and an embedded SQLite file locally.

export interface Preparedish {
  get<T = any>(...args: any[]): Promise<T | undefined>;
  all<T = any>(...args: any[]): Promise<T[]>;
  run(
    ...args: any[]
  ): Promise<{ changes: number; lastInsertRowid: number }>;
}

export interface Db {
  prepare(sql: string): Preparedish;
  client: Client;
}

// better-sqlite3 accepts either a single named-params object or positional
// arguments; map both onto libSQL's InArgs.
function normalizeArgs(a: any[]): InArgs | undefined {
  if (a.length === 0) return undefined;
  if (
    a.length === 1 &&
    a[0] !== null &&
    typeof a[0] === "object" &&
    !Array.isArray(a[0])
  ) {
    return a[0] as InArgs; // named params
  }
  return a as InArgs; // positional
}

function wrap(client: Client): Db {
  const prepare = (sql: string): Preparedish => ({
    async get(...a) {
      const args = normalizeArgs(a);
      const r = await client.execute(args ? { sql, args } : sql);
      return r.rows[0] as any;
    },
    async all(...a) {
      const args = normalizeArgs(a);
      const r = await client.execute(args ? { sql, args } : sql);
      return r.rows as any;
    },
    async run(...a) {
      const args = normalizeArgs(a);
      const r = await client.execute(args ? { sql, args } : sql);
      return {
        changes: r.rowsAffected,
        lastInsertRowid: Number(r.lastInsertRowid ?? 0),
      };
    },
  });
  return { prepare, client };
}

const globalForDb = globalThis as unknown as {
  _crmDb?: Db;
  _crmInit?: Promise<void>;
};

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    return createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
      intMode: "number",
    });
  }
  // Local dev / fallback: embedded SQLite file under ./data.
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return createClient({
    url: `file:${path.join(dir, "crm.db")}`,
    intMode: "number",
  });
}

// Lazily create the client and run schema/seed once per instance.
export async function getDb(): Promise<Db> {
  if (!globalForDb._crmDb) {
    globalForDb._crmDb = wrap(makeClient());
  }
  const db = globalForDb._crmDb;
  if (!globalForDb._crmInit) {
    globalForDb._crmInit = init(db).catch((e) => {
      globalForDb._crmInit = undefined; // allow a later retry
      throw e;
    });
  }
  await globalForDb._crmInit;
  return db;
}

// ── Schema & seed ───────────────────────────────────────────────────────────

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS leads (
     id                 INTEGER PRIMARY KEY AUTOINCREMENT,
     name               TEXT NOT NULL,
     email              TEXT NOT NULL DEFAULT '',
     phone              TEXT NOT NULL DEFAULT '',
     source             TEXT NOT NULL DEFAULT 'Other',
     status             TEXT NOT NULL DEFAULT 'New',
     annuity_production TEXT NOT NULL DEFAULT '',
     value              REAL NOT NULL DEFAULT 0,
     assigned_agent     TEXT NOT NULL DEFAULT '',
     notes              TEXT NOT NULL DEFAULT '',
     created_at         TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE TABLE IF NOT EXISTS ad_spend (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     source     TEXT NOT NULL,
     amount     REAL NOT NULL DEFAULT 0,
     spend_date TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_ad_spend_date ON ad_spend(spend_date)`,
  `CREATE TABLE IF NOT EXISTS call_logs (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
     agent      TEXT NOT NULL DEFAULT '',
     outcome    TEXT NOT NULL DEFAULT '',
     note       TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id)`,
  `CREATE TABLE IF NOT EXISTS activities (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
     type       TEXT NOT NULL,
     detail     TEXT NOT NULL DEFAULT '',
     actor      TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now'))
   )`,
  `CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id)`,
  `CREATE TABLE IF NOT EXISTS users (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     username      TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     role          TEXT NOT NULL DEFAULT 'agent',
     status        TEXT NOT NULL DEFAULT 'active',
     created_at    TEXT NOT NULL DEFAULT (datetime('now'))
   )`,
];

function adminUsername() {
  return process.env.ADMIN_USERNAME || "bernard@teamcerium.com";
}
function adminPassword() {
  return process.env.ADMIN_PASSWORD || "changeme";
}

async function init(db: Db) {
  for (const stmt of SCHEMA) await db.client.execute(stmt);
  await migrate(db);
  await seedLeadsIfEmpty(db);
  await seedAdSpendIfEmpty(db);
  await seedAgentsIfEmpty(db);
  await ensureAdmin(db);
}

// Add/remove columns on databases created before the current schema.
async function migrate(db: Db) {
  const cols = (await db.prepare("PRAGMA table_info(users)").all()).map(
    (c: any) => c.name as string
  );
  if (!cols.includes("role")) {
    await db.client.execute(
      "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'agent'"
    );
    await db
      .prepare("UPDATE users SET role = 'admin' WHERE username = ?")
      .run(adminUsername());
  }
  if (!cols.includes("status")) {
    await db.client.execute(
      "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"
    );
  }

  // Leads: company and per-lead ad spend were removed in favour of admin-entered
  // ad spend (the ad_spend table); annuity production was added.
  const leadCols = (await db.prepare("PRAGMA table_info(leads)").all()).map(
    (c: any) => c.name as string
  );
  if (!leadCols.includes("annuity_production")) {
    await db.client.execute(
      "ALTER TABLE leads ADD COLUMN annuity_production TEXT NOT NULL DEFAULT ''"
    );
  }
  if (leadCols.includes("company")) {
    await db.client.execute("ALTER TABLE leads DROP COLUMN company");
  }
  if (leadCols.includes("spend")) {
    await db.client.execute("ALTER TABLE leads DROP COLUMN spend");
  }
}

// Guarantee the configured admin always exists as an active admin (fresh and
// existing DBs alike). An existing account's password is left untouched.
async function ensureAdmin(db: Db) {
  const username = adminUsername();
  const existing = await db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) {
    await db
      .prepare(
        "UPDATE users SET role = 'admin', status = 'active' WHERE username = ?"
      )
      .run(username);
    return;
  }
  await db
    .prepare(
      "INSERT OR IGNORE INTO users (username, password_hash, role, status) VALUES (?, ?, 'admin', 'active')"
    )
    .run(username, hashPassword(adminPassword()));
}

async function seedAgentsIfEmpty(db: Db) {
  const count = (await db
    .prepare("SELECT COUNT(*) AS n FROM users")
    .get()) as { n: number };
  if (count.n > 0) return;
  for (const agent of ["Dana", "Miguel", "Priya"]) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO users (username, password_hash, role, status) VALUES (?, ?, 'agent', 'active')"
      )
      .run(agent, hashPassword("changeme"));
  }
}

async function seedLeadsIfEmpty(db: Db) {
  const count = (await db
    .prepare("SELECT COUNT(*) AS n FROM leads")
    .get()) as { n: number };
  if (count.n > 0) return;

  const sample = [
    { name: "Amara Johnson", email: "amara.j@example.com", phone: "+1-555-0101", source: "Facebook Ads", status: "New", annuity_production: "", value: 0, assigned_agent: "Dana", notes: "Downloaded pricing guide." },
    { name: "Carlos Rivera", email: "carlos.r@example.com", phone: "+1-555-0102", source: "Google Ads", status: "Contacted", annuity_production: "", value: 0, assigned_agent: "Dana", notes: "Left voicemail, will retry tomorrow." },
    { name: "Destiny Brooks", email: "destiny.b@example.com", phone: "+1-555-0103", source: "Referral", status: "Qualified", annuity_production: "Fixed indexed annuity, $50k premium", value: 0, assigned_agent: "Miguel", notes: "Budget confirmed, sending proposal." },
    { name: "Ethan Wells", email: "ethan.w@example.com", phone: "+1-555-0104", source: "Google Ads", status: "Converted", annuity_production: "MYGA, 5-year, $120k premium", value: 2400, assigned_agent: "Miguel", notes: "Signed annual plan." },
    { name: "Fatima Noor", email: "fatima.n@example.com", phone: "+1-555-0105", source: "Facebook Ads", status: "Converted", annuity_production: "SPIA, $85k premium", value: 1800, assigned_agent: "Dana", notes: "Upsold to premium tier." },
    { name: "George Kim", email: "george.k@example.com", phone: "+1-555-0106", source: "LinkedIn", status: "Lost", annuity_production: "", value: 0, assigned_agent: "Priya", notes: "Went with a competitor." },
    { name: "Hannah Lopez", email: "hannah.l@example.com", phone: "+1-555-0107", source: "Referral", status: "Contacted", annuity_production: "", value: 0, assigned_agent: "Priya", notes: "Interested, scheduling a demo." },
    { name: "Ibrahim Saleh", email: "ibrahim.s@example.com", phone: "+1-555-0108", source: "Google Ads", status: "New", annuity_production: "", value: 0, assigned_agent: "", notes: "" },
  ];

  for (const r of sample) {
    await db
      .prepare(
        `INSERT INTO leads (name, email, phone, source, status, annuity_production, value, assigned_agent, notes)
         VALUES (@name, @email, @phone, @source, @status, @annuity_production, @value, @assigned_agent, @notes)`
      )
      .run(r);
  }
}

// Seed a little ad spend so the analytics dashboard isn't empty on a fresh DB.
// Admins manage these going forward from the Analytics tab.
async function seedAdSpendIfEmpty(db: Db) {
  const count = (await db
    .prepare("SELECT COUNT(*) AS n FROM ad_spend")
    .get()) as { n: number };
  if (count.n > 0) return;

  const today = new Date();
  const isoDaysAgo = (d: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() - d);
    return x.toISOString().slice(0, 10);
  };

  const sample = [
    { source: "Facebook Ads", amount: 320.0, spend_date: isoDaysAgo(1) },
    { source: "Google Ads", amount: 480.0, spend_date: isoDaysAgo(1) },
    { source: "LinkedIn", amount: 150.0, spend_date: isoDaysAgo(3) },
    { source: "Facebook Ads", amount: 300.0, spend_date: isoDaysAgo(10) },
    { source: "Google Ads", amount: 420.0, spend_date: isoDaysAgo(10) },
  ];

  for (const r of sample) {
    await db
      .prepare(
        "INSERT INTO ad_spend (source, amount, spend_date) VALUES (@source, @amount, @spend_date)"
      )
      .run(r);
  }
}
