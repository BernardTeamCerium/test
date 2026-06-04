"use client";

import { useCallback, useEffect, useState } from "react";
import { money, percent, dateTime, monthLabel } from "@/lib/format";
import { SOURCES, type AdSpend } from "@/lib/types";

interface SourceRow {
  source: string;
  leads: number;
  spend: number;
  converted: number;
  value: number;
  costPerLead: number;
  costPerConversion: number;
  conversionRate: number;
}

interface AgentRow {
  agent: string;
  leads: number;
  converted: number;
  conversionRate: number;
  value: number;
  calls: number;
}

interface Analytics {
  totalLeads: number;
  converted: number;
  conversionRate: number;
  totalSpend: number;
  totalValue: number;
  costPerLead: number;
  costPerConversion: number;
  roi: number;
  funnel: { status: string; count: number }[];
  bySource: SourceRow[];
  byAgent: AgentRow[];
}

// Spend and metrics are viewed by calendar month, so the presets select a
// number of months back (months: 1 = the current month only).
const PRESETS = [
  { key: "all", label: "All time", months: 0 },
  { key: "1", label: "This month", months: 1 },
  { key: "3", label: "Last 3 months", months: 3 },
  { key: "6", label: "Last 6 months", months: 6 },
  { key: "12", label: "Last 12 months", months: 12 },
  { key: "custom", label: "Custom", months: -1 },
];

// YYYY-MM for the calendar month N months before the current one.
function monthsAgo(n: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

// First day (YYYY-MM-01) of a YYYY-MM month.
function monthStart(month: string): string {
  return `${month}-01`;
}

// Last calendar day (YYYY-MM-DD) of a YYYY-MM month.
function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

const emptySpendForm = {
  source: SOURCES[0] as string,
  amount: "",
  spend_month: monthsAgo(0),
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("all");
  // Custom range is chosen by month (YYYY-MM).
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");

  // Admin-only ad-spend management.
  const [isAdmin, setIsAdmin] = useState(false);
  const [adSpend, setAdSpend] = useState<AdSpend[]>([]);
  const [spendForm, setSpendForm] = useState(emptySpendForm);
  const [savingSpend, setSavingSpend] = useState(false);
  const [spendError, setSpendError] = useState("");

  // Derive the effective date range from the chosen preset. Custom uses the
  // month inputs; numeric presets span that many calendar months up to and
  // including the current month.
  const rangeFor = useCallback(
    (p: string): { from: string; to: string } => {
      if (p === "all") return { from: "", to: "" };
      if (p === "custom") {
        return {
          from: fromMonth ? monthStart(fromMonth) : "",
          to: toMonth ? monthEnd(toMonth) : "",
        };
      }
      const months = Number(p);
      return {
        from: monthStart(monthsAgo(months - 1)),
        to: monthEnd(monthsAgo(0)),
      };
    },
    [fromMonth, toMonth]
  );

  // Build the from/to query string for the current range.
  const rangeParams = useCallback(() => {
    const r = rangeFor(preset);
    const qs = new URLSearchParams();
    if (r.from) qs.set("from", r.from);
    if (r.to) qs.set("to", r.to);
    return qs;
  }, [rangeFor, preset]);

  const loadAnalytics = useCallback(() => {
    setLoading(true);
    fetch(`/api/analytics?${rangeParams().toString()}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [rangeParams]);

  const loadAdSpend = useCallback(() => {
    fetch(`/api/ad-spend?${rangeParams().toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((d) => setAdSpend(Array.isArray(d) ? d : []))
      .catch(() => setAdSpend([]));
  }, [rangeParams]);

  // Resolve the current user's role once (controls the ad-spend editor).
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdmin(d?.role === "admin"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAnalytics();
    loadAdSpend();
  }, [loadAnalytics, loadAdSpend]);

  async function addSpend(e: React.FormEvent) {
    e.preventDefault();
    setSpendError("");
    const amount = Number(spendForm.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setSpendError("Enter a valid non-negative amount.");
      return;
    }
    setSavingSpend(true);
    const res = await fetch("/api/ad-spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...spendForm, amount }),
    });
    setSavingSpend(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSpendError(d.error || "Could not save ad spend.");
      return;
    }
    setSpendForm((f) => ({ ...f, amount: "" }));
    loadAdSpend();
    loadAnalytics();
  }

  async function deleteSpend(id: number) {
    if (!confirm("Delete this ad-spend entry?")) return;
    const res = await fetch(`/api/ad-spend/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadAdSpend();
      loadAnalytics();
    }
  }

  const setSpendField = (k: keyof typeof spendForm) => (
    e: React.ChangeEvent<any>
  ) => setSpendForm((f) => ({ ...f, [k]: e.target.value }));

  if (!data) return <div className="empty">Loading…</div>;

  const maxFunnel = Math.max(1, ...data.funnel.map((f) => f.count));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Conversions and spend efficiency across your pipeline.</p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="toolbar">
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        {preset === "custom" && (
          <>
            <input
              type="month"
              value={fromMonth}
              max={toMonth || undefined}
              onChange={(e) => setFromMonth(e.target.value)}
            />
            <span className="muted">to</span>
            <input
              type="month"
              value={toMonth}
              min={fromMonth || undefined}
              onChange={(e) => setToMonth(e.target.value)}
            />
          </>
        )}
        {loading && <span className="muted">Updating…</span>}
      </div>

      {/* Headline metrics */}
      <div className="stat-grid">
        <div className="stat">
          <p className="label">Total leads</p>
          <p className="value">{data.totalLeads}</p>
        </div>
        <div className="stat">
          <p className="label">Converted</p>
          <p className="value">{data.converted}</p>
          <p className="sub">{percent(data.conversionRate)} conversion rate</p>
        </div>
        <div className="stat">
          <p className="label">Total ad spend</p>
          <p className="value">{money(data.totalSpend)}</p>
        </div>
        <div className="stat">
          <p className="label">Cost per lead</p>
          <p className="value">{money(data.costPerLead)}</p>
        </div>
        <div className="stat">
          <p className="label">Cost per conversion</p>
          <p className="value">{money(data.costPerConversion)}</p>
        </div>
        <div className="stat">
          <p className="label">Revenue</p>
          <p className="value">{money(data.totalValue)}</p>
        </div>
        <div className="stat">
          <p className="label">ROI</p>
          <p className={`value ${data.roi >= 0 ? "pos" : "neg"}`}>
            {percent(data.roi)}
          </p>
          <p className="sub">(revenue − spend) / spend</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Pipeline funnel</h3>
        {data.funnel.map((f) => (
          <div className="bar-row" key={f.status}>
            <span className={`badge badge-${f.status}`}>{f.status}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(f.count / maxFunnel) * 100}%` }}
              />
            </div>
            <span className="bar-count">{f.count}</span>
          </div>
        ))}
      </div>

      {/* Per-source breakdown */}
      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <h3 className="section-title">Ad spend by source</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Source</th>
              <th className="num">Leads</th>
              <th className="num">Ad spend</th>
              <th className="num">Cost / lead</th>
              <th className="num">Converted</th>
              <th className="num">Conv. rate</th>
              <th className="num">Cost / conv.</th>
              <th className="num">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.bySource.map((s) => (
              <tr key={s.source} style={{ cursor: "default" }}>
                <td>
                  <strong>{s.source}</strong>
                </td>
                <td className="num">{s.leads}</td>
                <td className="num">{money(s.spend)}</td>
                <td className="num">{s.leads ? money(s.costPerLead) : "—"}</td>
                <td className="num">{s.converted}</td>
                <td className="num">{percent(s.conversionRate)}</td>
                <td className="num">
                  {s.converted ? money(s.costPerConversion) : "—"}
                </td>
                <td className="num">{money(s.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.bySource.length === 0 && (
          <div className="empty">No data yet.</div>
        )}
      </div>

      {/* Admin-only ad-spend entry. Spend is recorded per source and date, and
          flows into the metrics above for the selected range. */}
      {isAdmin && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-pad" style={{ paddingBottom: 0 }}>
            <h3 className="section-title">Manage ad spend</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Record ad spend per source and month. Entries within the selected
              month range feed the metrics above.
            </p>
            <form onSubmit={addSpend} className="toolbar" style={{ marginBottom: 16 }}>
              <select value={spendForm.source} onChange={setSpendField("source")}>
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                type="month"
                value={spendForm.spend_month}
                onChange={setSpendField("spend_month")}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount ($)"
                value={spendForm.amount}
                onChange={setSpendField("amount")}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingSpend}
              >
                {savingSpend ? "Saving…" : "Add spend"}
              </button>
              {spendError && (
                <span style={{ color: "var(--red)" }}>{spendError}</span>
              )}
            </form>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Source</th>
                <th className="num">Amount</th>
                <th className="num">Recorded</th>
                <th className="num"></th>
              </tr>
            </thead>
            <tbody>
              {adSpend.map((e) => (
                <tr key={e.id} style={{ cursor: "default" }}>
                  <td>{monthLabel(e.spend_month)}</td>
                  <td>{e.source}</td>
                  <td className="num">{money(e.amount)}</td>
                  <td className="num muted">{dateTime(e.created_at)}</td>
                  <td className="num">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteSpend(e.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {adSpend.length === 0 && (
            <div className="empty">
              No ad spend recorded for this month range yet.
            </div>
          )}
        </div>
      )}

      {/* Per-agent performance */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <h3 className="section-title">Agent performance</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Agent</th>
              <th className="num">Leads</th>
              <th className="num">Calls logged</th>
              <th className="num">Converted</th>
              <th className="num">Conv. rate</th>
              <th className="num">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.byAgent.map((a) => (
              <tr key={a.agent} style={{ cursor: "default" }}>
                <td>
                  <strong>{a.agent}</strong>
                </td>
                <td className="num">{a.leads}</td>
                <td className="num">{a.calls}</td>
                <td className="num">{a.converted}</td>
                <td className="num">{percent(a.conversionRate)}</td>
                <td className="num">{money(a.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.byAgent.length === 0 && (
          <div className="empty">No data yet.</div>
        )}
      </div>
    </>
  );
}
