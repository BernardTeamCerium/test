import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

interface TimelineItem {
  kind: "call" | "created" | "status" | "edited";
  title: string;
  detail: string;
  actor: string;
  created_at: string;
}

// Merge logged calls and recorded activities into one reverse-chronological feed.
function buildTimeline(db: ReturnType<typeof getDb>, leadId: string) {
  const calls = db
    .prepare("SELECT * FROM call_logs WHERE lead_id = ?")
    .all(leadId) as any[];
  const activities = db
    .prepare("SELECT * FROM activities WHERE lead_id = ?")
    .all(leadId) as any[];

  const items: TimelineItem[] = [
    ...calls.map((c) => ({
      kind: "call" as const,
      title: c.outcome || "Call",
      detail: c.note || "",
      actor: c.agent || "",
      created_at: c.created_at,
    })),
    ...activities.map((a) => ({
      kind: a.type as TimelineItem["kind"],
      title:
        a.type === "created"
          ? "Lead created"
          : a.type === "status"
          ? "Status changed"
          : "Details updated",
      detail: a.detail || "",
      actor: a.actor || "",
      created_at: a.created_at,
    })),
  ];

  items.sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
  );
  return items;
}

// GET /api/leads/:id  -> a single lead, its call history, and a merged timeline
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
  const timeline = buildTimeline(db, params.id);
  return NextResponse.json({ ...lead, calls, timeline });
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

  // Record what changed on the lead's timeline.
  const prev = existing as any;
  const actor = String(body.actor ?? "").trim();
  if (
    "status" in updateParams &&
    updateParams.status !== prev.status
  ) {
    logActivity(
      db,
      params.id,
      "status",
      `${prev.status} → ${updateParams.status}`,
      actor
    );
  }
  const nonStatusChanged = Object.keys(updateParams).some(
    (k) => k !== "id" && k !== "status" && updateParams[k] !== prev[k]
  );
  if (nonStatusChanged) {
    logActivity(db, params.id, "edited", "Lead details updated", actor);
  }

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
