import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { type AdSpend } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/ad-spend?from=YYYY-MM-DD&to=YYYY-MM-DD
// List ad-spend entries (newest first), optionally scoped to a date range by
// spend_date. Any signed-in user can read; only admins can mutate (POST/DELETE).
export async function GET(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: string[] = [];
  const params: Record<string, string> = {};
  if (from) {
    where.push("date(spend_date) >= date(@from)");
    params.from = from;
  }
  if (to) {
    where.push("date(spend_date) <= date(@to)");
    params.to = to;
  }

  const sql =
    "SELECT * FROM ad_spend" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY date(spend_date) DESC, id DESC";
  const entries = (await db.prepare(sql).all(params)) as AdSpend[];
  return NextResponse.json(entries);
}

// POST /api/ad-spend  (admin only)  body: { source, amount, spend_date }
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const db = await getDb();
  const body = await req.json().catch(() => ({}));

  const source = String(body.source ?? "").trim();
  if (!source) {
    return NextResponse.json({ error: "Source is required." }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json(
      { error: "Amount must be a non-negative number." },
      { status: 400 }
    );
  }
  // Expect a YYYY-MM-DD date; fall back to today if missing/invalid.
  const raw = String(body.spend_date ?? "").trim();
  const spend_date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : new Date().toISOString().slice(0, 10);

  const info = await db
    .prepare(
      "INSERT INTO ad_spend (source, amount, spend_date) VALUES (@source, @amount, @spend_date)"
    )
    .run({ source, amount, spend_date });

  const entry = await db
    .prepare("SELECT * FROM ad_spend WHERE id = ?")
    .get(info.lastInsertRowid);
  return NextResponse.json(entry, { status: 201 });
}
