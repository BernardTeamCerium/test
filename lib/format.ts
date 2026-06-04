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

export function dateTime(iso: string): string {
  if (!iso) return "";
  // SQLite stores UTC "YYYY-MM-DD HH:MM:SS"; mark it as UTC for the browser.
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
