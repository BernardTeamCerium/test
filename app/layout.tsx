import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead CRM",
  description: "Manage leads, log agent calls, and track conversion spend.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/leads" className="brand">
              <span className="brand-dot" /> Lead CRM
            </Link>
            <nav className="nav">
              <Link href="/leads">Leads</Link>
              <Link href="/analytics">Analytics</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
