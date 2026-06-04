import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST /api/leads/bulk  body: { ids: number[], action: "status"|"assign"|"delete", value?: string }
// Applies one action to many leads in a single transaction.
export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json().catch(() => ({}));

  const ids = Array.isArray(body.ids)
    ? body.ids.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n) && n > 0)
    : [];
  const action = String(body.action ?? "");

  if (ids.length === 0) {
    return NextResponse.json({ error: "No leads selected." }, { status: 400 });
  }

  const placeholders = ids.map(() => "?").join(",");
  let affected = 0;

  if (action === "delete") {
    // Remove child rows first so deletion works regardless of whether the
    // hosted database enforces ON DELETE CASCADE for this connection.
    await db.batch([
      { sql: `DELETE FROM call_logs WHERE lead_id IN (${placeholders})`, args: ids },
      { sql: `DELETE FROM activities WHERE lead_id IN (${placeholders})`, args: ids },
    ]);
    const info = await db
      .prepare(`DELETE FROM leads WHERE id IN (${placeholders})`)
      .run(...ids);
    affected = info.changes;
  } else if (action === "status") {
    const status = String(body.value ?? "");
    if (!STATUSES.includes(status as any)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const info = await db
      .prepare(
        `UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
      )
      .run(status, ...ids);
    affected = info.changes;
    for (const id of ids) {
      await logActivity(db, id, "status", `Status set to ${status} (bulk)`);
    }
  } else if (action === "assign") {
    const agent = String(body.value ?? "").trim();
    const info = await db
      .prepare(
        `UPDATE leads SET assigned_agent = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
      )
      .run(agent, ...ids);
    affected = info.changes;
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ affected });
}
