import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "fs";
import { hashPassword } from "./password";

// ---------------------------------------------------------------------------
// Hosted database connection (libSQL / Turso).
//
// This app talks to a libSQL database, which speaks SQLite's dialect but can be
// hosted remotely — so it works on serverless platforms (Vercel, etc.) where
// the local filesystem is ephemeral and a local SQLite file would be wiped on
// every deploy/cold start.
//
// Configure with environment variables:
//   TURSO_DATABASE_URL  - libsql://<your-db>.turso.io  (the hosted database)
//   TURSO_AUTH_TOKEN    - the database auth token
//
// With neither set, it falls back to a local file (file:data/crm.db) so
// `npm run dev` still works out of the box with no external services.
// See README "Hosted database" for how to create a free Turso database.
// ---------------------------------------------------------------------------
function dbUrl(): string {
  return (
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "file:data/crm.db"
  );
}

function authToken(): string | undefined {
  return process.env.TURSO_AUTH_TOKEN || undefined;
}

type Row = Record<string, any>;

// Positional params arrive as a list of scalars (`?` placeholders); named
// params arrive as a single object (`@name` placeholders), matching how
// better-sqlite3 was called throughout the app.
function toArgs(args: unknown[]): InValue[] | Record<string, InValue> {
  if (
    args.length === 1 &&
    args[0] !== null &&
    typeof args[0] === "object" &&
    !Array.isArray(args[0])
  ) {
    return args[0] as Record<string, InValue>;
  }
  return args as InValue[];
}

export interface Stmt {
  get<T = Row>(...args: unknown[]): Promise<T | undefined>;
  all<T = Row>(...args: unknown[]): Promise<T[]>;
  run(
    ...args: unknown[]
  ): Promise<{ changes: number; lastInsertRowid: number }>;
}

export interface Db {
  prepare(sql: string): Stmt;
  exec(sql: string): Promise<void>;
  // Run several statements atomically (the async stand-in for the synchronous
  // db.transaction() used by import/seed).
  batch(
    statements: { sql: string; args?: InValue[] | Record<string, InValue> }[]
  ): Promise<void>;
  client: Client;
}

// A thin async wrapper exposing the slice of the better-sqlite3 surface the app
// uses (prepare().get/all/run), backed by the hosted libSQL client.
function wrap(client: Client): Db {
  return {
    client,
    prepare(sql: string): Stmt {
      return {
        async all<T = Row>(...args: unknown[]) {
          const rs = await client.execute({ sql, args: toArgs(args) });
          return rs.rows as unknown as T[];
        },
        async get<T = Row>(...args: unknown[]) {
          const rs = await client.execute({ sql, args: toArgs(args) });
          return (rs.rows[0] as unknown as T) ?? undefined;
        },
        async run(...args: unknown[]) {
          const rs = await client.execute({ sql, args: toArgs(args) });
          return {
            changes: rs.rowsAffected,
            lastInsertRowid:
              rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : 0,
          };
        },
      };
    },
    async exec(sql: string) {
      await client.executeMultiple(sql);
    },
    async batch(statements) {
      await client.batch(
        statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
        "write"
      );
    },
  };
}

// Memoize the (async) connection + schema setup so it runs exactly once and is
// reused across requests and dev hot-reloads.
const globalForDb = globalThis as unknown as { _crmDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb._crmDb) {
    globalForDb._crmDb = init();
  }
  return globalForDb._crmDb;
}

async function init(): Promise<Db> {
  const url = dbUrl();
  // For the local-file fallback (file:<path>), make sure the directory exists —
  // libSQL won't create it. Remote (libsql://) URLs skip this entirely.
  const fileMatch = /^file:(.*)$/.exec(url);
  if (fileMatch) {
    const dir = fileMatch[1].replace(/^\/\//, "").split("/").slice(0, -1).join("/");
    if (dir) fs.mkdirSync(dir, { recursive: true });
  }

  const db = wrap(createClient({ url, authToken: authToken() }));
  await createSchema(db);
  await migrate(db);
  await seedIfEmpty(db);
  await seedAgentsIfEmpty(db);
  await ensureAdmin(db);
  return db;
}

async function createSchema(db: Db) {
  await db.exec(`
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
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);

    CREATE TABLE IF NOT EXISTS activities (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL,
      detail     TEXT    NOT NULL DEFAULT '',
      actor      TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'agent',
      status        TEXT    NOT NULL DEFAULT 'active',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// The bootstrap admin account. Override with env vars; defaults to the project
// owner so the app has a working admin out of the box.
function adminUsername() {
  return process.env.ADMIN_USERNAME || "bernard@teamcerium.com";
}
function adminPassword() {
  return process.env.ADMIN_PASSWORD || "changeme";
}

// Lightweight migrations for databases created before a column existed.
async function migrate(db: Db) {
  const cols = (await db
    .prepare("PRAGMA table_info(users)")
    .all()) as { name: string }[];
  const has = (name: string) => cols.some((c) => c.name === name);

  if (!has("role")) {
    await db.exec(
      "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'agent'"
    );
    await db
      .prepare("UPDATE users SET role = 'admin' WHERE username = ?")
      .run(adminUsername());
  }
  if (!has("status")) {
    // Existing accounts predate approval, so treat them all as active.
    await db.exec(
      "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"
    );
  }
}

// Guarantee the configured admin always exists as an active admin, so you can
// never be locked out (works on fresh and existing databases alike). If the
// account already exists, its password is left untouched.
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
      "INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, 'admin', 'active')"
    )
    .run(username, hashPassword(adminPassword()));
}

// Seed the demo agents referenced by the sample leads (password "changeme")
// so lead assignments line up with real logins. Only runs on an empty table.
async function seedAgentsIfEmpty(db: Db) {
  const count = (await db
    .prepare("SELECT COUNT(*) AS n FROM users")
    .get()) as { n: number };
  if (count.n > 0) return;

  await db.batch(
    ["Dana", "Miguel", "Priya"].map((agent) => ({
      sql: "INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, 'agent', 'active')",
      args: [agent, hashPassword("changeme")],
    }))
  );
}

async function seedIfEmpty(db: Db) {
  const count = (await db
    .prepare("SELECT COUNT(*) AS n FROM leads")
    .get()) as { n: number };
  if (count.n > 0) return;

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

  await db.batch(
    sample.map((r) => ({
      sql: `INSERT INTO leads (name, email, phone, company, source, status, spend, value, assigned_agent, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        r.name, r.email, r.phone, r.company, r.source, r.status,
        r.spend, r.value, r.assigned_agent, r.notes,
      ],
    }))
  );
}
