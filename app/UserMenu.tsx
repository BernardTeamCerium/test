"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Renders the nav links + signed-in user + logout, but only once we've
// confirmed there's a session. On the login page (or when logged out) it
// renders nothing, so the top bar stays clean.
export default function UserMenu() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setUsername(d?.username ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!username) return null;

  return (
    <nav className="nav">
      <Link href="/leads">Leads</Link>
      <Link href="/analytics">Analytics</Link>
      <span className="nav-user">{username}</span>
      <button className="nav-logout" onClick={logout}>
        Log out
      </button>
    </nav>
  );
}
