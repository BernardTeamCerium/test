import { getDb } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS: (keyof Lead)[] = [
  "name",
  "email",
  "phone",
  "company",
  "source",
  "status",
  "spend",
  "value",
  "assigned_agent",
  "notes",
  "created_at",
  "updated_at",
];

// GET /api/leads/export -> CSV download of all leads (open in Google Sheets / Excel).
export function GET() {
  const db = getDb();
  const leads = db
    .prepare("SELECT * FROM leads ORDER BY datetime(created_at) DESC, id DESC")
    .all() as Lead[];

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
