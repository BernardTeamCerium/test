import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

// POST /api/auth/signup  body: { username, password }
// Public self-registration. New accounts are created as a *pending* agent and
// cannot log in until an admin approves them.
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username) {
    return NextResponse.json({ error: "Email / username is required." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 }
    );
  }
  const exists = db
    .prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE")
    .get(username);
  if (exists) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  db.prepare(
    "INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, 'agent', 'pending')"
  ).run(username, hashPassword(password));

  return NextResponse.json(
    { ok: true, status: "pending" },
    { status: 201 }
  );
}
