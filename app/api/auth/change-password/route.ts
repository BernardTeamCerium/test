import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST /api/auth/change-password  body: { currentPassword, newPassword }
// Lets any logged-in user change their own password.
export async function POST(req: NextRequest) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (newPassword.length < 4) {
    return NextResponse.json(
      { error: "New password must be at least 4 characters." },
      { status: 400 }
    );
  }

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(session.username) as { id: number; password_hash: string } | undefined;
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 401 }
    );
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hashPassword(newPassword),
    user.id
  );
  return NextResponse.json({ ok: true });
}
