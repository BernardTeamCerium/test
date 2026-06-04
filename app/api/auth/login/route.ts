import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/login  body: { username, password }
export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  // Username match is case-insensitive so "Bernard@..." works like "bernard@...".
  const user = (await db
    .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(username)) as
    | { username: string; password_hash: string; role: string; status: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  // Accounts created via self-service sign-up start as "pending" and can't log
  // in until an admin approves them.
  if (user.status === "pending") {
    return NextResponse.json(
      { error: "Your account is awaiting admin approval." },
      { status: 403 }
    );
  }

  const token = await signToken(user.username, user.role);
  const res = NextResponse.json({ username: user.username, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
