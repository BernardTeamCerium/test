import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// GET /api/leads/:id  -> a single lead plus its call history
export function GET(_req: NextRequest, { params }: Params) {
  const db = getDb();
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(params.id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  const calls = db
    .prepare(
      "SELECT * FROM call_logs WHERE lead_id = ? ORDER BY datetime(created_at) DESC, id DESC"
    )
    .all(params.id);
  return NextResponse.json({ ...lead, calls });
}

// PATCH /api/leads/:id  -> update any subset of editable fields
export async function PATCH(req: NextRequest, { params }: Params) {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const allowed: Record<string, (v: unknown) => unknown> = {
    name: (v) => String(v ?? "").trim(),
    email: (v) => String(v ?? "").trim(),
    phone: (v) => String(v ?? "").trim(),
    company: (v) => String(v ?? "").trim(),
    source: (v) => String(v ?? "").trim() || "Other",
    status: (v) => (STATUSES.includes(v as any) ? v : (existing as any).status),
    spend: (v) => Number(v) || 0,
    value: (v) => Number(v) || 0,
    assigned_agent: (v) => String(v ?? "").trim(),
    notes: (v) => String(v ?? "").trim(),
  };

  const sets: string[] = [];
  const updateParams: Record<string, unknown> = { id: params.id };
  for (const [key, normalize] of Object.entries(allowed)) {
    if (key in body) {
      sets.push(`${key} = @${key}`);
      updateParams[key] = normalize(body[key]);
    }
  }

  if (sets.length === 0) {
    return NextResponse.json(existing);
  }

  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = @id`).run(
    updateParams
  );

  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(params.id);
  return NextResponse.json(lead);
}

// DELETE /api/leads/:id
export function DELETE(_req: NextRequest, { params }: Params) {
  const db = getDb();
  const info = db.prepare("DELETE FROM leads WHERE id = ?").run(params.id);
  if (info.changes === 0) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
