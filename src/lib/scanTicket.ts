const EDGE_URL = "https://yqusqfdaikkvvjflgmmh.supabase.co/functions/v1/scan-ticket";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdXNxZmRhaWtrdnZqZmxnbW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDMxNzYsImV4cCI6MjA4MjY3OTE3Nn0.nWRj48zSZxz5qUK_wkV3PKbkG969rdpsbQ8OAWdBESk";

export async function lookupTicket(attendeeId: string) {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({ attendee_id: attendeeId, action: "lookup" }),
  });
  if (!res.ok) throw new Error("Edge function error: " + res.status);
  return res.json();
}

export async function checkinAttendee(attendeeId: string) {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({ attendee_id: attendeeId, action: "checkin" }),
  });
  if (!res.ok) throw new Error("Checkin error: " + res.status);
  return res.json();
}
