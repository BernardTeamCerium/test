"use client";

import { useCallback, useEffect, useState } from "react";
import { money, percent, dateTime } from "@/lib/format";
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

const PRESETS = [
  { key: "all", label: "All time", days: 0 },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "custom", label: "Custom", days: -1 },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const emptySpendForm = {
  source: SOURCES[0] as string,
  amount: "",
  spend_date: isoDaysAgo(0),
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Admin-only ad-spend management.
  const [isAdmin, setIsAdmin] = useState(false);
  const [adSpend, setAdSpend] = useState<AdSpend[]>([]);
  const [spendForm, setSpendForm] = useState(emptySpendForm);
  const [savingSpend, setSavingSpend] = useState(false);
  const [spendError, setSpendError] = useState("");

  // Derive the effective range from the chosen preset (custom uses the inputs).
  const rangeFor = useCallback(
    (p: string): { from: string; to: string } => {
      if (p === "all") return { from: "", to: "" };
      if (p === "custom") return { from, to };
      return { from: isoDaysAgo(Number(p)), to: isoDaysAgo(0) };
    },
    [from, to]
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
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="muted">to</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
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
              Record ad spend per source and date. Entries within the selected
              date range feed the metrics above.
            </p>
            <form onSubmit={addSpend} className="toolbar" style={{ marginBottom: 16 }}>
              <select value={spendForm.source} onChange={setSpendField("source")}>
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                type="date"
                value={spendForm.spend_date}
                onChange={setSpendField("spend_date")}
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
                <th>Date</th>
                <th>Source</th>
                <th className="num">Amount</th>
                <th className="num">Recorded</th>
                <th className="num"></th>
              </tr>
            </thead>
            <tbody>
              {adSpend.map((e) => (
                <tr key={e.id} style={{ cursor: "default" }}>
                  <td>{e.spend_date}</td>
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
              No ad spend recorded for this date range yet.
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
