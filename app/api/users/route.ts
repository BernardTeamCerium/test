import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/users -> list of users (for assignment dropdowns and the settings page).
export function GET() {
  const db = getDb();
  const users = db
    .prepare(
      "SELECT id, username, role, created_at FROM users ORDER BY username COLLATE NOCASE"
    )
    .all();
  return NextResponse.json(users);
}

// POST /api/users -> create a login (admin only). body: { username, password, role? }
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const role = body.role === "admin" ? "admin" : "agent";

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
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
      { error: "That username already exists." },
      { status: 409 }
    );
  }

  const info = db
    .prepare(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
    )
    .run(username, hashPassword(password), role);
  return NextResponse.json(
    { id: info.lastInsertRowid, username, role },
    { status: 201 }
  );
}
