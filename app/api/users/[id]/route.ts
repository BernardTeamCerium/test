import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// DELETE /api/users/:id?reassignTo=<username>  (admin only)
// Removes an agent login and reassigns any leads they owned. reassignTo may be
// another existing username, or empty/omitted to leave those leads Unassigned.
// The last remaining user can't be deleted, so you're never locked out.
export async function DELETE(req: NextRequest, { params }: Params) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const db = await getDb();
  const count = (await db
    .prepare("SELECT COUNT(*) AS n FROM users")
    .get()) as { n: number };
  if (count.n <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last remaining user." },
      { status: 400 }
    );
  }

  const user = (await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(params.id)) as { username: string } | undefined;
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Resolve the reassignment target (must be an existing user, or Unassigned).
  const { searchParams } = new URL(req.url);
  let reassignTo = (searchParams.get("reassignTo") || "").trim();
  if (reassignTo) {
    const target = await db
      .prepare("SELECT 1 FROM users WHERE username = ?")
      .get(reassignTo);
    if (!target) reassignTo = "";
  }

  const reassigned = (
    await db
      .prepare(
        "UPDATE leads SET assigned_agent = ?, updated_at = datetime('now') WHERE assigned_agent = ?"
      )
      .run(reassignTo, user.username)
  ).changes;

  await db.prepare("DELETE FROM users WHERE id = ?").run(params.id);

  return NextResponse.json({
    ok: true,
    reassigned,
    reassignedTo: reassignTo || "Unassigned",
  });
}
