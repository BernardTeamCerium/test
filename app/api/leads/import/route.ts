import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import { STATUSES, Status } from "@/lib/types";

export const dynamic = "force-dynamic";

// Accept common header aliases so a sheet exported from anywhere still maps.
const ALIASES: Record<string, string> = {
  name: "name",
  "full name": "name",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  company: "company",
  organization: "company",
  source: "source",
  channel: "source",
  status: "status",
  stage: "status",
  spend: "spend",
  cost: "spend",
  "ad spend": "spend",
  "acquisition cost": "spend",
  value: "value",
  "deal value": "value",
  revenue: "value",
  assigned_agent: "assigned_agent",
  agent: "assigned_agent",
  "assigned agent": "assigned_agent",
  owner: "assigned_agent",
  notes: "notes",
  note: "notes",
};

function normalizeStatus(raw: string): Status {
  const match = STATUSES.find(
    (s) => s.toLowerCase() === raw.trim().toLowerCase()
  );
  return (match as Status) || "New";
}

// POST /api/leads/import  body: { csv: string }
// Each non-empty row with a name becomes a new lead. Returns counts.
export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json().catch(() => ({}));
  const csv = String(body.csv ?? "");
  if (!csv.trim()) {
    return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
  }

  let records: Record<string, string>[];
  try {
    records = parseCsv(csv);
  } catch {
    return NextResponse.json({ error: "Could not parse CSV." }, { status: 400 });
  }

  const insert = db.prepare(`
    INSERT INTO leads (name, email, phone, company, source, status, spend, value, assigned_agent, notes)
    VALUES (@name, @email, @phone, @company, @source, @status, @spend, @value, @assigned_agent, @notes)
  `);

  let imported = 0;
  let skipped = 0;

  for (const raw of records) {
    // Remap headers through the alias table.
    const r: Record<string, string> = {};
    for (const [key, val] of Object.entries(raw)) {
      const canonical = ALIASES[key];
      if (canonical) r[canonical] = val;
    }

    const name = (r.name ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }

    await insert.run({
      name,
      email: r.email ?? "",
      phone: r.phone ?? "",
      company: r.company ?? "",
      source: (r.source ?? "").trim() || "Other",
      status: normalizeStatus(r.status ?? "New"),
      spend: Number(String(r.spend ?? "").replace(/[$,]/g, "")) || 0,
      value: Number(String(r.value ?? "").replace(/[$,]/g, "")) || 0,
      assigned_agent: r.assigned_agent ?? "",
      notes: r.notes ?? "",
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
