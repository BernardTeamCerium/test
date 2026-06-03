"use client";

import { useEffect, useState } from "react";
import { money, percent } from "@/lib/format";

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
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

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
          <p className="label">Total spend</p>
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
          <h3 className="section-title">Spend by source</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Source</th>
              <th className="num">Leads</th>
              <th className="num">Spend</th>
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
                <td className="num">{money(s.costPerLead)}</td>
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
    </>
  );
}
