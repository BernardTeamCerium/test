import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { STATUSES, CONVERTED_STATUSES, Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
// Headline metrics, funnel counts, and a per-source breakdown, optionally
// scoped to a date range. Leads are scoped by created_at; ad spend (entered by
// admins, per source/date) is scoped by spend_date over the same window.
export async function GET(req: NextRequest) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // inclusive
  const to = searchParams.get("to"); // inclusive

  // ── Leads in range ─────────────────────────────────────────────────────────
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

  // ── Ad spend in range, grouped by source ───────────────────────────────────
  const spendWhere: string[] = [];
  const spendParams: Record<string, string> = {};
  if (from) {
    spendWhere.push("date(spend_date) >= date(@from)");
    spendParams.from = from;
  }
  if (to) {
    spendWhere.push("date(spend_date) <= date(@to)");
    spendParams.to = to;
  }
  const spendRows = (await db
    .prepare(
      "SELECT source, SUM(amount) AS amount FROM ad_spend" +
        (spendWhere.length ? " WHERE " + spendWhere.join(" AND ") : "") +
        " GROUP BY source"
    )
    .all(spendParams)) as { source: string; amount: number }[];

  const spendBySource = new Map<string, number>();
  for (const r of spendRows) spendBySource.set(r.source || "Other", r.amount || 0);
  const totalSpend = spendRows.reduce((s, r) => s + (r.amount || 0), 0);

  const totalLeads = leads.length;
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

  // Per-source breakdown for spend efficiency comparison. Sources are the union
  // of those with leads and those with ad spend, so an admin can see spend even
  // for a source that produced no leads yet.
  const sourceMap = new Map<
    string,
    { source: string; leads: number; spend: number; converted: number; value: number }
  >();
  const sourceRow = (key: string) => {
    let row = sourceMap.get(key);
    if (!row) {
      row = { source: key, leads: 0, spend: 0, converted: 0, value: 0 };
      sourceMap.set(key, row);
    }
    return row;
  };
  for (const l of leads) {
    const row = sourceRow(l.source || "Other");
    row.leads += 1;
    row.value += l.value || 0;
    if (CONVERTED_STATUSES.includes(l.status)) row.converted += 1;
  }
  for (const [source, amount] of spendBySource) {
    sourceRow(source).spend += amount;
  }
  const bySource = Array.from(sourceMap.values())
    .map((r) => ({
      ...r,
      costPerLead: r.leads ? r.spend / r.leads : 0,
      costPerConversion: r.converted ? r.spend / r.converted : 0,
      conversionRate: r.leads ? r.converted / r.leads : 0,
    }))
    .sort((a, b) => b.spend - a.spend);

  // Per-agent performance. Leads/conversions/revenue are keyed by the lead's
  // assigned agent; calls logged are counted from call_logs by the calling
  // agent (matched by name), within the same date window. Spend is no longer
  // attributable to an agent (it's tracked per source), so it isn't shown here.
  const agentMap = new Map<
    string,
    { agent: string; leads: number; converted: number; value: number; calls: number }
  >();
  const agentRow = (name: string) => {
    const key = name || "Unassigned";
    let row = agentMap.get(key);
    if (!row) {
      row = { agent: key, leads: 0, converted: 0, value: 0, calls: 0 };
      agentMap.set(key, row);
    }
    return row;
  };
  for (const l of leads) {
    const row = agentRow(l.assigned_agent);
    row.leads += 1;
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
