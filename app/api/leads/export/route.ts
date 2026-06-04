import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";
import { Lead, STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS: (keyof Lead)[] = [
  "name",
  "email",
  "phone",
  "source",
  "status",
  "annuity_production",
  "value",
  "assigned_agent",
  "notes",
  "created_at",
  "updated_at",
];

// GET /api/leads/export?status=&q=&agent=&mine=1 -> CSV download of leads
// matching the same filters as the Leads page (open in Google Sheets / Excel).
export async function GET(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const agent = searchParams.get("agent");
  const mine = searchParams.get("mine");

  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (status && STATUSES.includes(status as any)) {
    where.push("status = @status");
    params.status = status;
  }
  if (q) {
    where.push("(name LIKE @q OR email LIKE @q OR phone LIKE @q)");
    params.q = `%${q}%`;
  }
  let agentFilter = agent;
  if (mine === "1") {
    const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
    agentFilter = session?.username ?? " ";
  }
  if (agentFilter != null) {
    where.push("assigned_agent = @agent");
    params.agent = agentFilter;
  }

  const sql =
    "SELECT * FROM leads" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY datetime(created_at) DESC, id DESC";
  const leads = (await db.prepare(sql).all(params)) as Lead[];

  const rows = leads.map((l) => COLUMNS.map((c) => l[c] as string | number));
  const csv = toCsv(COLUMNS as string[], rows);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${date}.csv"`,
    },
  });
}
