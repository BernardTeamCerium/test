# Lead CRM

A simple, self-contained CRM web app for managing sales leads. Built with
**Next.js** (App Router) and a local **SQLite** database — no external services
to configure.

## What it does

- **Leads page** — see every lead in your pipeline, search/filter them, and add
  new leads through a built-in form. Data is stored in a real database.
- **Lead detail page** — agents open a lead, **click to call** the phone number,
  **log call outcomes**, and **move the lead through the funnel**
  (New → Contacted → Qualified → Converted / Lost).
- **Analytics page** — how many leads converted, your conversion rate, total ad
  spend, **cost per lead**, **cost per conversion**, revenue, ROI, a pipeline
  funnel chart, and a per-source spend breakdown.

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

## Note on Google Sheets

This build uses a built-in database (chosen for reliability and zero setup). If
you later want to push leads to / pull them from a Google Sheet, the API layer
in `app/api/` is the place to add a sync step.
```
