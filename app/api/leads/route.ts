import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { STATUSES } from "@/lib/types";

// Always run on the server at request time (uses the SQLite file).
export const dynamic = "force-dynamic";

// GET /api/leads  -> list all leads (newest first), with optional ?status= & ?q= filters
export function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  let sql = "SELECT * FROM leads";
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (status && STATUSES.includes(status as any)) {
    where.push("status = @status");
    params.status = status;
  }
  if (q) {
    where.push(
      "(name LIKE @q OR email LIKE @q OR company LIKE @q OR phone LIKE @q)"
    );
    params.q = `%${q}%`;
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY datetime(created_at) DESC, id DESC";

  const leads = db.prepare(sql).all(params);
  return NextResponse.json(leads);
}

// POST /api/leads  -> create a lead
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json().catch(() => ({}));

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const status = STATUSES.includes(body.status) ? body.status : "New";

  const info = db
    .prepare(
      `INSERT INTO leads (name, email, phone, company, source, status, spend, value, assigned_agent, notes)
       VALUES (@name, @email, @phone, @company, @source, @status, @spend, @value, @assigned_agent, @notes)`
    )
    .run({
      name,
      email: String(body.email ?? "").trim(),
      phone: String(body.phone ?? "").trim(),
      company: String(body.company ?? "").trim(),
      source: String(body.source ?? "Other").trim() || "Other",
      status,
      spend: Number(body.spend) || 0,
      value: Number(body.value) || 0,
      assigned_agent: String(body.assigned_agent ?? "").trim(),
      notes: String(body.notes ?? "").trim(),
    });

  logActivity(
    db,
    info.lastInsertRowid as number,
    "created",
    `Lead created with status ${status}`,
    String(body.assigned_agent ?? "").trim()
  );

  const lead = db
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(info.lastInsertRowid);
  return NextResponse.json(lead, { status: 201 });
}
