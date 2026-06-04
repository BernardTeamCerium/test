import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { STATUSES, CONVERTED_STATUSES, Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
// Headline metrics, funnel counts, and a per-source breakdown, optionally
// scoped to leads created within an (inclusive) date range.
export async function GET(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // inclusive, by lead created_at date
  const to = searchParams.get("to"); // inclusive

  const where: string[] = [];
  const params: Record<string, string> = {};
  if (from) {
    where.push("date(created_at) >= date(@from)");
    params.from = from;
  }
  if (to) {
    where.push("date(created_at) <= date(@to)");
    params.to = to;
  }
  const sql =
    "SELECT * FROM leads" +
    (where.length ? " WHERE " + where.join(" AND ") : "");
  const leads = (await db.prepare(sql).all(params)) as Lead[];

  const totalLeads = leads.length;
  const totalSpend = leads.reduce((s, l) => s + (l.spend || 0), 0);
  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const converted = leads.filter((l) =>
    CONVERTED_STATUSES.includes(l.status)
  ).length;

  const conversionRate = totalLeads ? converted / totalLeads : 0;
  const costPerLead = totalLeads ? totalSpend / totalLeads : 0;
  const costPerConversion = converted ? totalSpend / converted : 0;
  const roi = totalSpend ? (totalValue - totalSpend) / totalSpend : 0;

  // Funnel counts in pipeline order.
  const funnel = STATUSES.map((status) => ({
    status,
    count: leads.filter((l) => l.status === status).length,
  }));

  // Per-source breakdown for spend efficiency comparison.
  const sourceMap = new Map<
    string,
    { source: string; leads: number; spend: number; converted: number; value: number }
  >();
  for (const l of leads) {
    const key = l.source || "Other";
    const row =
      sourceMap.get(key) ||
      { source: key, leads: 0, spend: 0, converted: 0, value: 0 };
    row.leads += 1;
    row.spend += l.spend || 0;
    row.value += l.value || 0;
    if (CONVERTED_STATUSES.includes(l.status)) row.converted += 1;
    sourceMap.set(key, row);
  }
  const bySource = Array.from(sourceMap.values())
    .map((r) => ({
      ...r,
      costPerLead: r.leads ? r.spend / r.leads : 0,
      costPerConversion: r.converted ? r.spend / r.converted : 0,
      conversionRate: r.leads ? r.converted / r.leads : 0,
    }))
    .sort((a, b) => b.spend - a.spend);

  // Per-agent performance. Leads/conversions/spend are keyed by the lead's
  // assigned agent; calls logged are counted from call_logs by the calling
  // agent (matched by name), within the same date window.
  const agentMap = new Map<
    string,
    { agent: string; leads: number; converted: number; spend: number; value: number; calls: number }
  >();
  const agentRow = (name: string) => {
    const key = name || "Unassigned";
    let row = agentMap.get(key);
    if (!row) {
      row = { agent: key, leads: 0, converted: 0, spend: 0, value: 0, calls: 0 };
      agentMap.set(key, row);
    }
    return row;
  };
  for (const l of leads) {
    const row = agentRow(l.assigned_agent);
    row.leads += 1;
    row.spend += l.spend || 0;
    row.value += l.value || 0;
    if (CONVERTED_STATUSES.includes(l.status)) row.converted += 1;
  }

  // Calls logged per agent in the same range.
  const callWhere: string[] = ["agent != ''"];
  const callParams: Record<string, string> = {};
  if (from) {
    callWhere.push("date(created_at) >= date(@from)");
    callParams.from = from;
  }
  if (to) {
    callWhere.push("date(created_at) <= date(@to)");
    callParams.to = to;
  }
  const callCounts = (await db
    .prepare(
      `SELECT agent, COUNT(*) AS n FROM call_logs WHERE ${callWhere.join(
        " AND "
      )} GROUP BY agent`
    )
    .all(callParams)) as { agent: string; n: number }[];
  for (const c of callCounts) agentRow(c.agent).calls += c.n;

  const byAgent = Array.from(agentMap.values())
    .map((r) => ({
      ...r,
      conversionRate: r.leads ? r.converted / r.leads : 0,
    }))
    .sort((a, b) => b.converted - a.converted || b.leads - a.leads);

  return NextResponse.json({
    totalLeads,
    converted,
    conversionRate,
    totalSpend,
    totalValue,
    costPerLead,
    costPerConversion,
    roi,
    funnel,
    bySource,
    byAgent,
  });
}
