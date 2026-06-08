import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import UserMenu from "./UserMenu";

export const metadata: Metadata = {
  title: "Recruiting Lead CRM",
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
            <div className="brand-cluster">
              <Link href="/leads" className="brand">
                <span className="brand-dot" /> Recruiting Lead CRM
              </Link>
              <span className="brand-divider" />
              {/* Client co-brand. Swap this wordmark for the real logo image
                  once available, e.g.:
                  <img src="/allied-elite-financial-logo.svg"
                       alt="Allied Elite Financial" className="client-logo" /> */}
              <span className="client-name">Allied Elite Financial</span>
            </div>
            <UserMenu />
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
