const EDGE_URL = "https://yqusqfdaikkvvjflgmmh.supabase.co/functions/v1/scan-ticket-v3";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdXNxZmRhaWtrdnZqZmxnbW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDMxNzYsImV4cCI6MjA4MjY3OTE3Nn0.nWRj48zSZxz5qUK_wkV3PKbkG969rdpsbQ8OAWdBESk";
const STORAGE_KEY = "conwayo_scanner_token";

let memoryToken: string | null = null;

export class TokenInvalidError extends Error {
  constructor(message = "Scanner token invalid") {
    super(message);
    this.name = "TokenInvalidError";
  }
}

export function getToken(): string | null {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t) return t;
  } catch {}
  return memoryToken;
}

export function setToken(t: string) {
  memoryToken = t;
  try { localStorage.setItem(STORAGE_KEY, t); } catch {}
}

export function clearToken() {
  memoryToken = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const token = getToken();
  if (!token) throw new TokenInvalidError("No token");
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      "x-scanner-token": token,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new TokenInvalidError();
  if (!res.ok) throw new Error("Scanner API error: " + res.status);
  return res.json();
}

export type LookupStatus =
  | "found_paid" | "found_invoiced" | "found_unpaid" | "already_scanned"
  | "cancelled" | "wrong_event" | "not_found" | "invalid_qr";

export interface ScannerAttendee {
  id: string;
  first_name?: string;
  last_name?: string;
  scanned_at?: string | null;
  orderStatus?: string;
  services?: string[];
  eventTitle?: string;
  venueName?: string;
  otherEvent?: string;
}

export interface EventInfo {
  id: string; name: string; venue?: string; start_date?: string; end_date?: string;
}

export type CheckinResult =
  | { ok: true }
  | { ok: false; reason: "already_scanned" | "cancelled" | "unpaid" | "wrong_event" | "not_found"; scanned_at?: string };

export const whoami = () => call<{ event: EventInfo }>({ action: "whoami" });
export const stats = () => call<{ checked_in: number; total: number }>({ action: "stats" });
export const lookup = (attendeeId: string) =>
  call<{ status: LookupStatus; attendee?: ScannerAttendee }>({ action: "lookup", attendee_id: attendeeId });
export const checkin = (attendeeId: string, override = false) =>
  call<CheckinResult>({ action: "checkin", attendee_id: attendeeId, override });
export const search = (query: string) =>
  call<{ results: { id: string; name: string; scanned: boolean; cancelled: boolean }[] }>({ action: "search", query });
