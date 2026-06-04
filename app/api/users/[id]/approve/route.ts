import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// POST /api/users/:id/approve  (admin only) -> activate a pending sign-up.
export async function POST(_req: NextRequest, { params }: Params) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const db = await getDb();
  const info = await db
    .prepare("UPDATE users SET status = 'active' WHERE id = ?")
    .run(params.id);
  if (info.changes === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
