import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// DELETE /api/users/:id  -> remove an agent login. Leads previously assigned to
// them keep the name on record (assigned_agent is stored as text); they simply
// no longer appear in assignment dropdowns. The last remaining user can't be
// deleted, so you're never locked out.
export function DELETE(_req: NextRequest, { params }: Params) {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as {
    n: number;
  };
  if (count.n <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last remaining user." },
      { status: 400 }
    );
  }
  const info = db.prepare("DELETE FROM users WHERE id = ?").run(params.id);
  if (info.changes === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
