import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// POST /api/users/:id/password  (admin only) body: { password }
// Reset another user's password without knowing their current one.
export async function POST(req: NextRequest, { params }: Params) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const db = await getDb();
  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 }
    );
  }

  const info = await db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(password), params.id);
  if (info.changes === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
