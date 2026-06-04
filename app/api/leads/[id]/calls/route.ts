import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// POST /api/leads/:id/calls  -> log a call outcome, optionally updating the
// lead's status in the same step (the common agent workflow).
export async function POST(req: NextRequest, { params }: Params) {
  const db = await getDb();
  const lead = await db
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(params.id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  await db
    .prepare(
      `INSERT INTO call_logs (lead_id, agent, outcome, note)
       VALUES (@lead_id, @agent, @outcome, @note)`
    )
    .run({
      lead_id: params.id,
      agent: String(body.agent ?? "").trim(),
      outcome: String(body.outcome ?? "").trim(),
      note: String(body.note ?? "").trim(),
    });

  // If the agent picked a new status while logging the call, apply it.
  if (
    body.status &&
    STATUSES.includes(body.status) &&
    body.status !== (lead as any).status
  ) {
    await logActivity(
      db,
      params.id,
      "status",
      `${(lead as any).status} → ${body.status}`,
      String(body.agent ?? "").trim()
    );
    await db
      .prepare(
        "UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(body.status, params.id);
  } else if (body.status && STATUSES.includes(body.status)) {
    await db
      .prepare(
        "UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .run(body.status, params.id);
  } else {
    await db
      .prepare("UPDATE leads SET updated_at = datetime('now') WHERE id = ?")
      .run(params.id);
  }

  const updated = await db
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(params.id);
  const calls = await db
    .prepare(
      "SELECT * FROM call_logs WHERE lead_id = ? ORDER BY datetime(created_at) DESC, id DESC"
    )
    .all(params.id);
  return NextResponse.json({ ...(updated as object), calls }, { status: 201 });
}
