# Lead CRM

A CRM web app for managing sales leads. Built with **Next.js** (App Router) and
**libSQL/SQLite**. It runs against a local SQLite file for development and a
hosted **[Turso](https://turso.tech)** database in production — so it works on
serverless hosts like Vercel with real persistence.

## What it does

- **Login** — the app is protected by a sign-in screen; only authenticated
  users can view or change leads.
- **Leads page** — see every lead in your pipeline, search/filter them, toggle
  **"My leads"** to show only those assigned to you, add new leads through a
  built-in form, and run **bulk actions** (set status, assign an agent, or
  delete many leads at once via row checkboxes). Data is stored in a real
  database.
- **Lead detail page** — agents open a lead, **click to call** the phone number,
  **log call outcomes**, **edit details**, **move the lead through the funnel**
  (New → Contacted → Qualified → Converted / Lost), and see a **filterable
  activity timeline** (calls / status changes / edits) combining every event.
- **Analytics page** — how many leads converted, your conversion rate, total ad
  spend, **cost per lead**, **cost per conversion**, revenue, ROI, a pipeline
  funnel chart, a **per-source** spend breakdown, and a **per-agent
  performance** table (leads, calls logged, conversions, spend) — all filterable
  by a **date range** (presets or custom).

CSV export honors the active search/status filters, so you can export just the
slice you're looking at.

## Authentication

The app requires login. There is **no open sign-up** — instead, people request
access and an **admin approves** them (see below). A bootstrap admin is created
automatically and is guaranteed to exist on every start (so you can't be locked
out):

| Variable         | Default                  | Purpose                           |
| ---------------- | ------------------------ | --------------------------------- |
| `ADMIN_USERNAME` | `bernard@teamcerium.com` | The admin account's username      |
| `ADMIN_PASSWORD` | `changeme`               | The admin's initial password      |
| `AUTH_SECRET`    | dev key                  | HMAC secret used to sign sessions |

Default admin: **`bernard@teamcerium.com` / `changeme`** — sign in and change the
password immediately (Settings → Your account). **Before deploying**, set a
strong `AUTH_SECRET` (and optionally override the admin) in `.env.local`:

```
AUTH_SECRET=some-long-random-string
ADMIN_USERNAME=bernard@teamcerium.com
ADMIN_PASSWORD=a-strong-password
```

### Sign-up & approval

1. A new person opens **/signup** (linked from the login page) and requests an
   account with their email + a password.
2. The account is created as **pending** — they can't log in yet.
3. An admin opens **Settings → Pending approvals** and clicks **Approve**
   (or **Reject**). Approved users can now sign in as agents.

Approval is enforced server-side: pending accounts are refused at login, and the
approve endpoint is admin-only.

Sessions are stateless signed cookies (HMAC-SHA256, 7-day expiry); passwords are
hashed with scrypt. The seed user is only created when the `users` table is
empty, so changing the env vars later won't overwrite an existing login —
delete `data/crm.db` (or add more users) to reset.

### Roles & access

Every user is either an **admin** or an **agent**:

- **Agents** can manage leads, log calls, and change their own password.
- **Admins** can additionally add/remove users, set roles, and reset any user's
  password. User-management endpoints are enforced server-side (agents get
  `403`), not just hidden in the UI.

The seeded `admin` user is an admin; the demo agents are agents. Everyone can
change their own password from **Settings → Your account**.

When an admin deletes a user, they choose where that user's leads go — reassign
them to another user or leave them **Unassigned** — so no leads are orphaned.

### Agents & users

People who can log in are managed on the **Settings** page (admins only). Each
agent is a real user, and lead assignment uses a **dropdown of those users**
everywhere (add-lead form, edit, bulk assign, and the call-logging agent) — so
assignments always match a login and the **"My leads"** filter and per-agent
analytics line up reliably.

For convenience the demo seeds three agent logins — **Dana**, **Miguel**, and
**Priya** (password `changeme`) — matching the sample leads. Change or remove
them on the Settings page (or set your own before first run). CSV import still
accepts free-text agent names; if an imported name isn't a user it's preserved
and shown as "(not a user)" in the edit dropdown until you reassign it.

## Continuous integration

Every push and pull request runs **lint + build** via GitHub Actions
(`.github/workflows/ci.yml`) on Node 20, so broken code is caught before merge.
Run the same checks locally with `npm run lint` and `npm run build`.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000. With no Turso env vars set, the app uses a
local SQLite file at `data/crm.db`, created automatically on first run and
seeded with sample leads. Delete `data/crm.db` to start from an empty database.

## Deploying (Vercel + Turso)

Serverless hosts like Vercel have a **read-only, ephemeral filesystem**, so a
local SQLite *file* can't be used in production. Point the app at a hosted
[Turso](https://turso.tech) database instead (Turso speaks libSQL/SQLite, so no
code changes are needed):

1. Create a database with the [Turso CLI](https://docs.turso.tech): `turso db create lead-crm`
2. Get its URL: `turso db show lead-crm --url` (looks like `libsql://…turso.io`)
3. Create a token: `turso db tokens create lead-crm`
4. In your Vercel project settings → Environment Variables, set:

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
AUTH_SECRET=some-long-random-string
ADMIN_PASSWORD=a-strong-password        # optional; defaults to "changeme"
ADMIN_USERNAME=bernard@teamcerium.com   # optional; this is the default
```

On first request the app creates its tables and ensures the admin account
exists in Turso. The data then persists across deploys and instances.

For a local production build:

```bash
npm run build
npm start
```

## Data model

Each **lead** has: name, email, phone, company, source (marketing channel),
status, **spend** (acquisition cost), **value** (deal revenue), assigned agent,
and notes. Each **call** logs the agent, outcome, a note, and a timestamp, and
can update the lead's status in one step.

## How the metrics are calculated

| Metric              | Formula                              |
| ------------------- | ------------------------------------ |
| Conversion rate     | converted leads ÷ total leads        |
| Cost per lead       | total spend ÷ total leads            |
| Cost per conversion | total spend ÷ converted leads        |
| ROI                 | (total revenue − total spend) ÷ spend|

"Converted" counts leads in the **Converted** status. To change which statuses
count as a conversion, edit `CONVERTED_STATUSES` in `lib/types.ts`.

## Project layout

```
app/
  leads/            # list + add-lead form
  leads/[id]/       # detail: call, log calls, update status
  analytics/        # conversion & spend dashboard
  api/              # REST endpoints backed by libSQL
lib/
  db.ts             # libSQL client (Turso or local file), schema, seed
  types.ts          # shared types + the status funnel
  format.ts         # money / percent / date helpers
data/
  crm.db            # local dev database (created at runtime, git-ignored)
```

## Google Sheets / spreadsheet workflow

Data lives in the built-in database, but you can move it in and out of Google
Sheets (or Excel) via CSV — no API keys required:

- **Export** — the **↓ Export CSV** button on the Leads page downloads every
  lead. Open it directly in Google Sheets (File → Import) or Excel.
- **Import** — the **↑ Import CSV** button uploads a CSV; each row with a name
  becomes a lead. In Google Sheets use **File → Download → CSV**, then import
  that file here.

Import header matching is case-insensitive and accepts common aliases
(`agent`/`owner` → assigned agent, `cost`/`ad spend` → spend, `revenue` →
value, `stage` → status, etc.), so a sheet exported from most tools maps
without renaming columns. The recommended columns are:

```
name, email, phone, company, source, status, spend, value, assigned_agent, notes
```

## Editing leads

Open any lead and click **Edit** to update its details (name, contact info,
source, spend, value, notes). Status changes happen from the lead's pipeline
buttons or while logging a call.
```
