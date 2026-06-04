"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, SOURCES, type Lead } from "@/lib/types";

// Sentinel option value for the bulk "Unassigned" choice (so it's distinct
// from the empty "Assign to…" placeholder).
const UNASSIGN = "__unassigned__";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  source: "Facebook Ads",
  status: "New",
  annuity_production: "",
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
  const [mine, setMine] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Build the query string shared by the list fetch and the CSV export link.
  const filterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    if (mine) params.set("mine", "1");
    return params;
  }, [q, statusFilter, mine]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leads?${filterParams().toString()}`);
    setLeads(await res.json());
    setSelected(new Set());
    setLoading(false);
  }, [filterParams]);

  // Resolve the logged-in user (for the "My leads" label) and the list of
  // agents (for assignment dropdowns).
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUsername(d?.username ?? null))
      .catch(() => {});
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setAgents(list.map((u: { username: string }) => u.username)))
      .catch(() => {});
  }, []);

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === leads.length ? new Set() : new Set(leads.map((l) => l.id))
    );
  }

  async function runBulk(action: string, value?: string) {
    if (selected.size === 0) return;
    if (action === "delete") {
      if (!confirm(`Delete ${selected.size} selected lead(s)? This cannot be undone.`))
        return;
    }
    setBulkBusy(true);
    await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action, value }),
    });
    setBulkBusy(false);
    setBulkStatus("");
    load();
  }

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
          <a className="btn" href={`/api/leads/export?${filterParams().toString()}`}>
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
          placeholder="Search name, email, phone…"
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
        <button
          className={`btn ${mine ? "btn-primary" : ""}`}
          onClick={() => setMine((m) => !m)}
          title={
            username
              ? `Show only leads assigned to ${username}`
              : "Show only your leads"
          }
        >
          {mine ? "✓ " : ""}My leads{username ? ` (${username})` : ""}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <strong>{selected.size} selected</strong>
          <span className="spacer" />
          <select
            value={bulkStatus}
            onChange={(e) => {
              setBulkStatus(e.target.value);
              if (e.target.value) runBulk("status", e.target.value);
            }}
            disabled={bulkBusy}
          >
            <option value="">Set status…</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) runBulk("assign", v === UNASSIGN ? "" : v);
            }}
            disabled={bulkBusy}
          >
            <option value="">Assign to…</option>
            <option value={UNASSIGN}>Unassigned</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => runBulk("delete")}
            disabled={bulkBusy}
          >
            Delete
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setSelected(new Set())}
            disabled={bulkBusy}
          >
            Clear
          </button>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th className="check-col">
                <input
                  type="checkbox"
                  checked={leads.length > 0 && selected.size === leads.length}
                  ref={(el) => {
                    if (el)
                      el.indeterminate =
                        selected.size > 0 && selected.size < leads.length;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th>Name</th>
              <th>Phone</th>
              <th>Source</th>
              <th>Status</th>
              <th>Agent</th>
              <th>Annuity production</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                className={selected.has(l.id) ? "row-selected" : ""}
                onClick={() => router.push(`/leads/${l.id}`)}
              >
                <td
                  className="check-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggleOne(l.id)}
                    aria-label={`Select ${l.name}`}
                  />
                </td>
                <td>
                  <strong>{l.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {l.email}
                  </div>
                </td>
                <td>{l.phone || <span className="muted">—</span>}</td>
                <td>{l.source}</td>
                <td>
                  <span className={`badge badge-${l.status}`}>{l.status}</span>
                </td>
                <td>{l.assigned_agent || <span className="muted">—</span>}</td>
                <td>{l.annuity_production || <span className="muted">—</span>}</td>
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
                    <label>Assigned agent</label>
                    <select
                      value={form.assigned_agent}
                      onChange={set("assigned_agent")}
                    >
                      <option value="">Unassigned</option>
                      {agents.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
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
                    <label>Annuity production</label>
                    <input
                      value={form.annuity_production}
                      onChange={set("annuity_production")}
                      placeholder="e.g. MYGA, 5-year, $120k premium"
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
