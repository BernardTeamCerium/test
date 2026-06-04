"use client";

import { useEffect, useState, useCallback } from "react";
import { dateTime } from "@/lib/format";

interface User {
  id: number;
  username: string;
  role: string;
  status: string;
  created_at: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);

  // Add-agent form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Change-own-password form
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  // Delete-with-reassign modal
  const [deleting, setDeleting] = useState<User | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const isAdmin = me?.role === "admin";

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    setUsers(res.ok ? await res.json() : []);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d ? { username: d.username, role: d.role } : null))
      .catch(() => {});
  }, [load]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not create user.");
      return;
    }
    setUsername("");
    setPassword("");
    setRole("agent");
    load();
  }

  async function changeMyPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPwMsg(d.error || "Could not change password.");
      return;
    }
    setCurPw("");
    setNewPw("");
    setPwMsg("Password updated.");
  }

  async function approve(u: User) {
    const res = await fetch(`/api/users/${u.id}/approve`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not approve user.");
      return;
    }
    load();
  }

  async function reject(u: User) {
    if (!confirm(`Reject and remove the access request from "${u.username}"?`))
      return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not reject user.");
      return;
    }
    load();
  }

  async function resetPassword(u: User) {
    const pw = prompt(`Set a new password for "${u.username}" (min 4 chars):`);
    if (pw == null) return;
    const res = await fetch(`/api/users/${u.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const d = await res.json().catch(() => ({}));
    alert(res.ok ? `Password updated for ${u.username}.` : d.error || "Failed.");
  }

  function openDelete(u: User) {
    setReassignTo("");
    setDeleting(u);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const qs = reassignTo
      ? `?reassignTo=${encodeURIComponent(reassignTo)}`
      : "";
    const res = await fetch(`/api/users/${deleting.id}${qs}`, {
      method: "DELETE",
    });
    const d = await res.json().catch(() => ({}));
    setDeleting(null);
    if (!res.ok) {
      alert(d.error || "Could not delete user.");
      return;
    }
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your account{isAdmin ? " and the people who can log in" : ""}.</p>
        </div>
      </div>

      <div className="detail-grid">
        {/* Your account — available to everyone */}
        <div className="card card-pad">
          <h3 className="section-title">Your account</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Signed in as <strong>{me?.username}</strong>
            {me ? ` · ${me.role}` : ""}
          </p>
          <form onSubmit={changeMyPassword} className="row-gap">
            {pwMsg && (
              <p
                style={{
                  color: pwMsg === "Password updated." ? "var(--green)" : "var(--red)",
                  margin: 0,
                }}
              >
                {pwMsg}
              </p>
            )}
            <div className="field">
              <label>Current password</label>
              <input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Change password
            </button>
          </form>
        </div>

        {/* Add an agent — admins only */}
        {isAdmin && (
          <div className="card card-pad">
            <h3 className="section-title">Add a user</h3>
            <form onSubmit={addUser} className="row-gap">
              {error && <p className="login-error">{error}</p>}
              <div className="field">
                <label>Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jordan"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add user"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Pending approvals — admins only */}
      {isAdmin && users.some((u) => u.status === "pending") && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-pad" style={{ paddingBottom: 0 }}>
            <h3 className="section-title">
              Pending approvals (
              {users.filter((u) => u.status === "pending").length})
            </h3>
            <p className="muted" style={{ marginTop: 0 }}>
              People who requested access. Approve to let them sign in.
            </p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Email / username</th>
                <th>Requested</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => u.status === "pending")
                .map((u) => (
                  <tr key={u.id} style={{ cursor: "default" }}>
                    <td>
                      <strong>{u.username}</strong>
                    </td>
                    <td>{dateTime(u.created_at)}</td>
                    <td className="num">
                      <div
                        className="inline"
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => approve(u)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => reject(u)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User list — admins only */}
      {isAdmin && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-pad" style={{ paddingBottom: 0 }}>
            <h3 className="section-title">Users</h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ cursor: "default" }}>
                  <td>
                    <strong>{u.username}</strong>
                    {u.username === me?.username && (
                      <span className="muted" style={{ fontSize: 12 }}>
                        {" "}
                        (you)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${u.role === "admin" ? "Converted" : "New"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-${u.status === "pending" ? "Contacted" : "Qualified"}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td>{dateTime(u.created_at)}</td>
                  <td className="num">
                    <div className="inline" style={{ justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => resetPassword(u)}
                      >
                        Reset password
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => openDelete(u)}
                        disabled={users.length <= 1}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="empty">No users yet.</div>}
        </div>
      )}

      {!isAdmin && me && (
        <p className="muted" style={{ marginTop: 16 }}>
          Only admins can manage users and assignments.
        </p>
      )}

      {/* Delete + reassign modal */}
      {deleting && (
        <div className="modal-backdrop" onClick={() => setDeleting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Delete {deleting.username}</h2>
              <button
                className="icon-btn"
                onClick={() => setDeleting(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>
                Reassign any leads currently owned by{" "}
                <strong>{deleting.username}</strong> to:
              </p>
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users
                  .filter((u) => u.id !== deleting.id)
                  .map((u) => (
                    <option key={u.id} value={u.username}>
                      {u.username}
                    </option>
                  ))}
              </select>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
