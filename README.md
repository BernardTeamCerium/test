# Lead CRM

A simple, self-contained CRM web app for managing sales leads. Built with
**Next.js** (App Router) and a local **SQLite** database — no external services
to configure.

## What it does

- **Login** — the app is protected by a sign-in screen; only authenticated
  users can view or change leads.
- **Leads page** — see every lead in your pipeline, search/filter them, add new
  leads through a built-in form, and run **bulk actions** (set status, assign an
  agent, or delete many leads at once via row checkboxes). Data is stored in a
  real database.
- **Lead detail page** — agents open a lead, **click to call** the phone number,
  **log call outcomes**, **edit details**, and **move the lead through the
  funnel** (New → Contacted → Qualified → Converted / Lost).
- **Analytics page** — how many leads converted, your conversion rate, total ad
  spend, **cost per lead**, **cost per conversion**, revenue, ROI, a pipeline
  funnel chart, and a per-source spend breakdown — all filterable by a
  **date range** (presets or custom).

## Authentication

The app requires login. On first run a single user is seeded:

| Variable         | Default | Purpose                          |
| ---------------- | ------- | -------------------------------- |
| `ADMIN_USERNAME` | `admin` | Seed user's username             |
| `ADMIN_PASSWORD` | `admin` | Seed user's password             |
| `AUTH_SECRET`    | dev key | HMAC secret used to sign sessions|

**Before deploying**, set a strong `AUTH_SECRET` and your own admin
credentials, e.g. in a `.env.local` file:

```
AUTH_SECRET=some-long-random-string
ADMIN_USERNAME=you@example.com
ADMIN_PASSWORD=a-strong-password
```

Sessions are stateless signed cookies (HMAC-SHA256, 7-day expiry); passwords are
hashed with scrypt. The seed user is only created when the `users` table is
empty, so changing the env vars later won't overwrite an existing login —
delete `data/crm.db` (or add more users) to reset.

## Continuous integration

Every push and pull request runs **lint + build** via GitHub Actions
(`.github/workflows/ci.yml`) on Node 20, so broken code is caught before merge.
Run the same checks locally with `npm run lint` and `npm run build`.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The database (`data/crm.db`) is created
automatically on first run and seeded with sample leads so you can see how it
works. Delete `data/crm.db` to start from an empty database.

For production:

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
  api/              # REST endpoints backed by SQLite
lib/
  db.ts             # SQLite connection, schema, seed data
  types.ts          # shared types + the status funnel
  format.ts         # money / percent / date helpers
data/
  crm.db            # the database (created at runtime, git-ignored)
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
