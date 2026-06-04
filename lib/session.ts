// Server-only helpers to read the current session inside route handlers.
// Kept separate from lib/auth.ts (which must stay Edge-safe for middleware).
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE, SessionPayload } from "./auth";

export async function currentSession(): Promise<SessionPayload | null> {
  return verifyToken(cookies().get(SESSION_COOKIE)?.value);
}

// Returns the session if the caller is an admin, otherwise a 403 response.
// Usage: const gate = await requireAdmin(); if (gate instanceof NextResponse) return gate;
export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json(
      { error: "Admins only." },
      { status: 403 }
    );
  }
  return session;
}
