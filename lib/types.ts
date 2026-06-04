// Shared types for the CRM.

// The status funnel agents move a lead through.
export const STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Converted",
  "Lost",
] as const;

export type Status = (typeof STATUSES)[number];

// Statuses that count as a successful conversion in analytics.
export const CONVERTED_STATUSES: Status[] = ["Converted"];

// Marketing channels a lead can come from. Shared by the lead forms and the
// analytics ad-spend entry form so the source lists stay in sync.
export const SOURCES = [
  "Facebook Ads",
  "Google Ads",
  "LinkedIn",
  "Referral",
  "Website",
  "Cold Outreach",
  "Other",
] as const;

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  source: string; // marketing channel, e.g. "Facebook Ads", used for spend analysis
  status: Status;
  annuity_production: string; // free-text annuity production detail
  value: number; // deal value once converted (revenue)
  assigned_agent: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// Admin-entered ad spend, recorded per source and per calendar month. Ad spend
// lives only on the analytics side now (it is no longer a per-lead field).
export interface AdSpend {
  id: number;
  source: string;
  amount: number; // dollars spent
  spend_month: string; // YYYY-MM the spend is attributed to
  created_at: string;
}

export interface CallLog {
  id: number;
  lead_id: number;
  agent: string;
  outcome: string; // e.g. "Answered", "Voicemail", "No answer"
  note: string;
  created_at: string;
}
