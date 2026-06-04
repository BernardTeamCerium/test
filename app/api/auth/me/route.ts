import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me -> { username } if logged in, else 401.
export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    username: session.username,
    role: session.role ?? "agent",
  });
}
