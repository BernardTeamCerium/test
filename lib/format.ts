// Client-safe formatting helpers (no server-only imports).

export function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

export function percent(n: number): string {
  return `${((n || 0) * 100).toFixed(1)}%`;
}

// Format a YYYY-MM month string as e.g. "Jun 2026".
export function monthLabel(yyyymm: string): string {
  if (!/^\d{4}-\d{2}$/.test(yyyymm)) return yyyymm || "";
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dateTime(iso: string): string {
  if (!iso) return "";
  // SQLite stores UTC "YYYY-MM-DD HH:MM:SS"; mark it as UTC for the browser.
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
