"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Sign up failed.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="login-brand">
          <span className="brand-dot" /> Lead CRM
        </div>

        {done ? (
          <>
            <h1 className="login-title">Request received</h1>
            <p className="muted">
              Thanks! Your account <strong>{username}</strong> has been created
              and is <strong>awaiting admin approval</strong>. You&apos;ll be able
              to sign in once an administrator approves it.
            </p>
            <Link
              href="/login"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 18 }}
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 className="login-title">Create an account</h1>
            {error && <p className="login-error">{error}</p>}
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="you@example.com"
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 4 characters"
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 18 }}
            >
              {loading ? "Submitting…" : "Request access"}
            </button>
            <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
              New accounts require admin approval before first sign-in.
            </p>
            <p style={{ textAlign: "center", marginTop: 6, fontSize: 14 }}>
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
