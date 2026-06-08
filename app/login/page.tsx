"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/leads";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed.");
      return;
    }
    // Full navigation so middleware re-evaluates with the new cookie.
    window.location.href = next;
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="brand-dot" /> Recruiting Lead CRM
        </div>
        <p className="login-client">Allied Elite Financial</p>
        <h1 className="login-title">Sign in</h1>
        {error && <p className="login-error">{error}</p>}
        <div className="field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", marginTop: 18 }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
          Need access? <Link href="/signup">Request an account</Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={<div className="empty">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
