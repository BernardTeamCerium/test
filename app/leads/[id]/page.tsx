"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUSES, type Lead, type CallLog } from "@/lib/types";
import { money, dateTime } from "@/lib/format";

type LeadWithCalls = Lead & { calls: CallLog[] };

const OUTCOMES = ["Answered", "Voicemail", "No answer", "Wrong number", "Callback requested"];

const SOURCES = [
  "Facebook Ads",
  "Google Ads",
  "LinkedIn",
  "Referral",
  "Website",
  "Cold Outreach",
  "Other",
];

const EDIT_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "source",
  "assigned_agent",
  "spend",
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

  const load = useCallback(async () => {
    const res = await fetch(`/api/leads/${params.id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setLead(data);
    setNewStatus(data.status);
    if (!agent && data.assigned_agent) setAgent(data.assigned_agent);
  }, [params.id, agent]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function changeStatus(status: string) {
    setSavingStatus(true);
    await fetch(`/api/leads/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
        spend: Number(edit.spend) || 0,
        value: Number(edit.value) || 0,
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
            {lead.company || "No company"} ·{" "}
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
              <dt>Company</dt>
              <dd>{lead.company || <span className="muted">—</span>}</dd>
              <dt>Source</dt>
              <dd>{lead.source}</dd>
              <dt>Assigned agent</dt>
              <dd>{lead.assigned_agent || <span className="muted">Unassigned</span>}</dd>
              <dt>Ad spend</dt>
              <dd>{money(lead.spend)}</dd>
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
                <input
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  placeholder="Your name"
                />
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
            <h3 className="section-title">
              Call history ({lead.calls.length})
            </h3>
            {lead.calls.length === 0 && (
              <p className="muted">No calls logged yet.</p>
            )}
            {lead.calls.map((c) => (
              <div className="call-item" key={c.id}>
                <div>
                  <strong>{c.outcome || "Call"}</strong>
                  {c.agent && ` · ${c.agent}`}
                </div>
                {c.note && <div>{c.note}</div>}
                <div className="call-meta">{dateTime(c.created_at)}</div>
              </div>
            ))}
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
                    <label>Company</label>
                    <input
                      value={edit.company}
                      onChange={setField("company")}
                    />
                  </div>
                  <div className="field">
                    <label>Assigned agent</label>
                    <input
                      value={edit.assigned_agent}
                      onChange={setField("assigned_agent")}
                    />
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
                    <label>Ad spend / acquisition cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={edit.spend}
                      onChange={setField("spend")}
                    />
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
