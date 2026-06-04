import type { Db } from "./db";

export type ActivityType = "created" | "status" | "edited";

// Record a non-call event (lead created, status moved, details edited) so the
// lead's timeline shows the full history alongside logged calls.
export async function logActivity(
  db: Db,
  leadId: number | string,
  type: ActivityType,
  detail: string,
  actor = ""
) {
  await db
    .prepare(
      "INSERT INTO activities (lead_id, type, detail, actor) VALUES (?, ?, ?, ?)"
    )
    .run(leadId, type, detail, actor);
}
