"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, type Lead } from "@/lib/types";
import { money } from "@/lib/format";

const SOURCES = [
  "Facebook Ads",
  "Google Ads",
  "LinkedIn",
  "Referral",
  "Website",
  "Cold Outreach",
  "Other",
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "Facebook Ads",
  status: "New",
  spend: "",
  value: "",
  assigned_agent: "",
  notes: "",
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/leads?${params.toString()}`);
    setLeads(await res.json());
    setLoading(false);
  }, [q, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 200); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        spend: Number(form.spend) || 0,
        value: Number(form.value) || 0,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save lead.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Importing…");
    const csv = await file.text();
    const res = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const data = await res.json().catch(() => ({}));
    if (e.target) e.target.value = ""; // allow re-importing the same file
    if (!res.ok) {
      setImportMsg(data.error || "Import failed.");
      return;
    }
    setImportMsg(
      `Imported ${data.imported} lead${data.imported === 1 ? "" : "s"}` +
        (data.skipped ? ` · skipped ${data.skipped} (no name)` : "")
    );
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p>Every lead in your pipeline. Click a row to call and update it.</p>
        </div>
        <div className="inline">
          <a className="btn" href="/api/leads/export">
            ↓ Export CSV
          </a>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            ↑ Import CSV
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={onImportFile}
          />
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add lead
          </button>
        </div>
      </div>

      {importMsg && (
        <div
          className="card card-pad"
          style={{ marginBottom: 16, color: "var(--muted)" }}
        >
          {importMsg}
        </div>
      )}

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search name, email, company, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Source</th>
              <th>Status</th>
              <th>Agent</th>
              <th className="num">Spend</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} onClick={() => router.push(`/leads/${l.id}`)}>
                <td>
                  <strong>{l.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {l.email}
                  </div>
                </td>
                <td>{l.company || <span className="muted">—</span>}</td>
                <td>{l.phone || <span className="muted">—</span>}</td>
                <td>{l.source}</td>
                <td>
                  <span className={`badge badge-${l.status}`}>{l.status}</span>
                </td>
                <td>{l.assigned_agent || <span className="muted">—</span>}</td>
                <td className="num">{money(l.spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && leads.length === 0 && (
          <div className="empty">No leads match. Add one to get started.</div>
        )}
        {loading && <div className="empty">Loading…</div>}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submit}>
              <div className="modal-head">
                <h2>Add lead</h2>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowForm(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {error && (
                  <p style={{ color: "var(--red)", marginTop: 0 }}>{error}</p>
                )}
                <div className="form-grid">
                  <div className="field full">
                    <label>Name *</label>
                    <input value={form.name} onChange={set("name")} autoFocus />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                    />
                  </div>
                  <div className="field">
                    <label>Phone</label>
                    <input value={form.phone} onChange={set("phone")} />
                  </div>
                  <div className="field">
                    <label>Company</label>
                    <input value={form.company} onChange={set("company")} />
                  </div>
                  <div className="field">
                    <label>Assigned agent</label>
                    <input
                      value={form.assigned_agent}
                      onChange={set("assigned_agent")}
                    />
                  </div>
                  <div className="field">
                    <label>Source</label>
                    <select value={form.source} onChange={set("source")}>
                      {SOURCES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Status</label>
                    <select value={form.status} onChange={set("status")}>
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Ad spend / acquisition cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.spend}
                      onChange={set("spend")}
                    />
                  </div>
                  <div className="field">
                    <label>Deal value ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.value}
                      onChange={set("value")}
                    />
                  </div>
                  <div className="field full">
                    <label>Notes</label>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={set("notes")}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
