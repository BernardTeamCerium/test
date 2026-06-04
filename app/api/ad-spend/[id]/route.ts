import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// DELETE /api/ad-spend/:id  (admin only) -> remove an ad-spend entry.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const db = await getDb();
  const info = await db
    .prepare("DELETE FROM ad_spend WHERE id = ?")
    .run(params.id);
  if (info.changes === 0) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
