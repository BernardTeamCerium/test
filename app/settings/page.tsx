"use client";

import { useEffect, useState, useCallback } from "react";
import { dateTime } from "@/lib/format";

interface User {
  id: number;
  username: string;
  created_at: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    setUsers(await res.json());
  }, []);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.username ?? null))
      .catch(() => {});
  }, [load]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not create user.");
      return;
    }
    setUsername("");
    setPassword("");
    load();
  }

  async function removeUser(u: User) {
    if (!confirm(`Delete agent "${u.username}"? They will no longer be able to log in.`))
      return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not delete user.");
      return;
    }
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Agents &amp; users</h1>
          <p>
            People who can log in and be assigned leads. New agents appear in the
            assignment dropdowns across the app.
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ cursor: "default" }}>
                  <td>
                    <strong>{u.username}</strong>
                    {u.username === me && (
                      <span className="muted" style={{ fontSize: 12 }}>
                        {" "}
                        (you)
                      </span>
                    )}
                  </td>
                  <td>{dateTime(u.created_at)}</td>
                  <td className="num">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => removeUser(u)}
                      disabled={users.length <= 1}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="empty">No users yet.</div>}
        </div>

        <div className="card card-pad">
          <h3 className="section-title">Add an agent</h3>
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
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add agent"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
