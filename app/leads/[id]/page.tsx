"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUSES, SOURCES, type Lead, type CallLog } from "@/lib/types";
import { money, dateTime } from "@/lib/format";

interface TimelineItem {
  kind: "call" | "created" | "status" | "edited";
  title: string;
  detail: string;
  actor: string;
  created_at: string;
}

type LeadWithCalls = Lead & { calls: CallLog[]; timeline: TimelineItem[] };

const TIMELINE_ICON: Record<TimelineItem["kind"], string> = {
  call: "📞",
  created: "✨",
  status: "🔄",
  edited: "✏️",
};

const OUTCOMES = ["Answered", "Voicemail", "No answer", "Wrong number", "Callback requested"];

const EDIT_FIELDS = [
  "name",
  "email",
  "phone",
  "source",
  "assigned_agent",
  "annuity_production",
  "value",
  "notes",
] as const;

export default function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [lead, setLead] = useState<LeadWithCalls | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Current user + agent list for assignment / call dropdowns
  const [me, setMe] = useState<string | null>(null);
  const [agents, setAgents] = useState<string[]>([]);

  // Call-logging form
  const [agent, setAgent] = useState("");
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [callNote, setCallNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [loggingCall, setLoggingCall] = useState(false);

  // Edit-lead modal
  const [showEdit, setShowEdit] = useState(false);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Timeline filter
  const [tlFilter, setTlFilter] = useState<"all" | "call" | "status" | "edit">(
    "all"
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/leads/${params.id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setLead(data);
    setNewStatus(data.status);
  }, [params.id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Load current user (default caller) and the agent list for dropdowns.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.username ?? null;
        setMe(u);
        setAgent((a) => a || u || "");
      })
      .catch(() => {});
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setAgents(list.map((u: { username: string }) => u.username)))
      .catch(() => {});
  }, []);

  async function changeStatus(status: string) {
    setSavingStatus(true);
    await fetch(`/api/leads/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, actor: me ?? "" }),
    });
    setSavingStatus(false);
    load();
  }

  async function logCall(e: React.FormEvent) {
    e.preventDefault();
    setLoggingCall(true);
    await fetch(`/api/leads/${params.id}/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, outcome, note: callNote, status: newStatus }),
    });
    setLoggingCall(false);
    setCallNote("");
    load();
  }

  function openEdit() {
    if (!lead) return;
    const init: Record<string, string> = {};
    for (const f of EDIT_FIELDS) init[f] = String((lead as any)[f] ?? "");
    setEdit(init);
    setShowEdit(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    await fetch(`/api/leads/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...edit,
        value: Number(edit.value) || 0,
        actor: me ?? "",
      }),
    });
    setSavingEdit(false);
    setShowEdit(false);
    load();
  }

  const setField = (k: string) => (e: React.ChangeEvent<any>) =>
    setEdit((s) => ({ ...s, [k]: e.target.value }));

  async function remove() {
    if (!confirm("Delete this lead permanently?")) return;
    await fetch(`/api/leads/${params.id}`, { method: "DELETE" });
    router.push("/leads");
  }

  if (notFound) {
    return (
      <div className="empty">
        Lead not found. <Link href="/leads">Back to leads</Link>
      </div>
    );
  }
  if (!lead) return <div className="empty">Loading…</div>;

  return (
    <>
      <Link href="/leads" className="back-link">
        ← Back to leads
      </Link>

      <div className="page-head">
        <div>
          <h1>{lead.name}</h1>
          <p>
            {lead.source} ·{" "}
            <span className={`badge badge-${lead.status}`}>{lead.status}</span>
          </p>
        </div>
        <div className="inline">
          {lead.phone && (
            <a className="btn btn-primary" href={`tel:${lead.phone}`}>
              📞 Call {lead.phone}
            </a>
          )}
          <button className="btn" onClick={openEdit}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={remove}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left column: details + status */}
        <div className="row-gap">
          <div className="card card-pad">
            <h3 className="section-title">Lead details</h3>
            <dl className="kv">
              <dt>Email</dt>
              <dd>
                {lead.email ? (
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                ) : (
                  <span className="muted">—</span>
                )}
              </dd>
              <dt>Phone</dt>
              <dd>{lead.phone || <span className="muted">—</span>}</dd>
              <dt>Source</dt>
              <dd>{lead.source}</dd>
              <dt>Assigned agent</dt>
              <dd>{lead.assigned_agent || <span className="muted">Unassigned</span>}</dd>
              <dt>Annuity production</dt>
              <dd>{lead.annuity_production || <span className="muted">—</span>}</dd>
              <dt>Deal value</dt>
              <dd>{money(lead.value)}</dd>
              <dt>Created</dt>
              <dd>{dateTime(lead.created_at)}</dd>
              <dt>Last updated</dt>
              <dd>{dateTime(lead.updated_at)}</dd>
              <dt>Notes</dt>
              <dd>{lead.notes || <span className="muted">—</span>}</dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="section-title">Pipeline status</h3>
            <div className="inline">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${
                    lead.status === s ? "btn-primary" : ""
                  }`}
                  disabled={savingStatus || lead.status === s}
                  onClick={() => changeStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: log a call + history */}
        <div className="row-gap">
          <div className="card card-pad">
            <h3 className="section-title">Log a call</h3>
            <form onSubmit={logCall} className="row-gap">
              <div className="field">
                <label>Agent</label>
                <select value={agent} onChange={(e) => setAgent(e.target.value)}>
                  {/* Keep any pre-existing value selectable even if not a user. */}
                  {agent && !agents.includes(agent) && (
                    <option value={agent}>{agent}</option>
                  )}
                  {agents.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Outcome</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  {OUTCOMES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Set status after call</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Note</label>
                <textarea
                  rows={2}
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  placeholder="What happened on the call?"
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loggingCall}
              >
                {loggingCall ? "Saving…" : "Save call"}
              </button>
            </form>
          </div>

          <div className="card card-pad">
            {(() => {
              const FILTERS: {
                key: typeof tlFilter;
                label: string;
                match: (k: TimelineItem["kind"]) => boolean;
              }[] = [
                { key: "all", label: "All", match: () => true },
                { key: "call", label: "Calls", match: (k) => k === "call" },
                { key: "status", label: "Status", match: (k) => k === "status" },
                {
                  key: "edit",
                  label: "Edits",
                  match: (k) => k === "edited" || k === "created",
                },
              ];
              const active = FILTERS.find((f) => f.key === tlFilter)!;
              const items = lead.timeline.filter((t) => active.match(t.kind));
              return (
                <>
                  <h3 className="section-title">
                    Activity timeline ({items.length})
                  </h3>
                  <div className="inline" style={{ marginBottom: 12 }}>
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        className={`btn btn-sm ${
                          tlFilter === f.key ? "btn-primary" : ""
                        }`}
                        onClick={() => setTlFilter(f.key)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {items.length === 0 && (
                    <p className="muted">No matching activity.</p>
                  )}
                  {items.map((t, i) => (
                    <div className="call-item" key={i}>
                      <div>
                        <span style={{ marginRight: 6 }}>
                          {TIMELINE_ICON[t.kind]}
                        </span>
                        <strong>{t.title}</strong>
                        {t.actor && ` · ${t.actor}`}
                      </div>
                      {t.detail && <div>{t.detail}</div>}
                      <div className="call-meta">{dateTime(t.created_at)}</div>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={saveEdit}>
              <div className="modal-head">
                <h2>Edit lead</h2>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowEdit(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="field full">
                    <label>Name *</label>
                    <input value={edit.name} onChange={setField("name")} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={edit.email}
                      onChange={setField("email")}
                    />
                  </div>
                  <div className="field">
                    <label>Phone</label>
                    <input value={edit.phone} onChange={setField("phone")} />
                  </div>
                  <div className="field">
                    <label>Assigned agent</label>
                    <select
                      value={edit.assigned_agent}
                      onChange={setField("assigned_agent")}
                    >
                      <option value="">Unassigned</option>
                      {/* Preserve a non-user value (e.g. from CSV import). */}
                      {edit.assigned_agent &&
                        !agents.includes(edit.assigned_agent) && (
                          <option value={edit.assigned_agent}>
                            {edit.assigned_agent} (not a user)
                          </option>
                        )}
                      {agents.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Source</label>
                    <select value={edit.source} onChange={setField("source")}>
                      {SOURCES.map((s) => (
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
                      value={edit.value}
                      onChange={setField("value")}
                    />
                  </div>
                  <div className="field full">
                    <label>Annuity production</label>
                    <input
                      value={edit.annuity_production}
                      onChange={setField("annuity_production")}
                      placeholder="e.g. MYGA, 5-year, $120k premium"
                    />
                  </div>
                  <div className="field full">
                    <label>Notes</label>
                    <textarea
                      rows={3}
                      value={edit.notes}
                      onChange={setField("notes")}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
