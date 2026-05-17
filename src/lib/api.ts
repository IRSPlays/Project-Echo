const API_BASE = "/api/echo";

// ─── Submit (Anonymous) ──────────────────────────────────────────────────────

export async function submitReport(content: string, category: string, proposed_solution?: string) {
  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, category, proposed_solution }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Submission failed.");
  }

  return res.json();
}

// ─── Admin Helpers ───────────────────────────────────────────────────────────

function adminHeaders(passphrase: string, isSL: boolean): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isSL) headers["X-SL-Passphrase"] = passphrase;
  else headers["X-Admin-Passphrase"] = passphrase;
  return headers;
}

// ─── Public (No Auth) ────────────────────────────────────────────────────────

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/admin/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats.");
  return res.json();
}

export async function fetchClusters() {
  const res = await fetch(`${API_BASE}/admin/clusters`);
  if (!res.ok) throw new Error("Failed to fetch clusters.");
  return res.json();
}

export async function fetchGlobalUpdates() {
  const res = await fetch(`${API_BASE}/admin/global_updates`);
  if (!res.ok) throw new Error("Failed to fetch updates.");
  return res.json();
}

// ─── EXCO Admin ──────────────────────────────────────────────────────────────

export async function fetchSubmissions(
  passphrase: string,
  filters: Record<string, string | number> = {}
) {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== "") params.set(key, String(val));
  }

  const res = await fetch(`${API_BASE}/admin/submissions?${params}`, {
    headers: { "X-Admin-Passphrase": passphrase },
  });

  if (!res.ok) throw new Error("Failed to fetch submissions.");
  return res.json();
}

export async function updateSubmissionStatus(
  passphrase: string,
  id: string,
  status: string,
  isSL: boolean = false
) {
  const res = await fetch(`${API_BASE}/admin/submissions/${id}`, {
    method: "PATCH",
    headers: adminHeaders(passphrase, isSL),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) throw new Error("Failed to update status.");
  return res.json();
}

export async function escalateSubmission(passphrase: string, id: string) {
  const res = await fetch(`${API_BASE}/admin/submissions/${id}/escalate`, {
    method: "POST",
    headers: { "X-Admin-Passphrase": passphrase },
  });
  if (!res.ok) throw new Error("Failed to escalate.");
  return res.json();
}

export async function exportReport(passphrase: string, format: "md" | "json" = "md") {
  const res = await fetch(`${API_BASE}/export?format=${format}`, {
    headers: { "X-Admin-Passphrase": passphrase },
  });

  if (!res.ok) throw new Error("Failed to export.");

  if (format === "json") return res.json();
  return res.text();
}

// ─── Admin Ticket View & Reply ───────────────────────────────────────────────

export async function fetchAdminTicket(id: string, passphrase: string, isSL: boolean) {
  const headers: Record<string, string> = {};
  if (isSL) headers["X-SL-Passphrase"] = passphrase;
  else headers["X-Admin-Passphrase"] = passphrase;

  const res = await fetch(`${API_BASE}/admin/ticket/${id}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch admin ticket.");
  return res.json();
}

export async function replyToTicketAdmin(id: string, passphrase: string, isSL: boolean, content: string) {
  const res = await fetch(`${API_BASE}/admin/ticket/${id}/reply`, {
    method: "POST",
    headers: adminHeaders(passphrase, isSL),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to reply.");
  return res.json();
}

export async function postGlobalUpdate(passphrase: string, isSL: boolean, content: string) {
  const res = await fetch(`${API_BASE}/admin/global_updates`, {
    method: "POST",
    headers: adminHeaders(passphrase, isSL),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to post update.");
  return res.json();
}

// ─── History & AI Summary ────────────────────────────────────────────────────

export async function fetchHistorySummary(passphrase: string, isSL: boolean, dateFrom: string, dateTo: string) {
  const res = await fetch(`${API_BASE}/admin/history/summary`, {
    method: "POST",
    headers: adminHeaders(passphrase, isSL),
    body: JSON.stringify({ dateFrom, dateTo }),
  });
  if (!res.ok) throw new Error("Failed to fetch history summary.");
  return res.json();
}

// ─── Student Ticket Tracker ──────────────────────────────────────────────────

export async function fetchTicket(id: string, pin: string) {
  const res = await fetch(`${API_BASE}/ticket/${id}`, {
    headers: { "x-ticket-pin": pin },
  });
  if (!res.ok) throw new Error("Invalid ticket ID or PIN.");
  return res.json();
}

export async function replyToTicketStudent(id: string, pin: string, content: string) {
  const res = await fetch(`${API_BASE}/ticket/${id}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ticket-pin": pin,
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to reply.");
  return res.json();
}

// ─── SL ──────────────────────────────────────────────────────────────────────

export async function fetchSLSubmissions(slPassphrase: string) {
  const res = await fetch(`${API_BASE}/admin/sl/submissions`, {
    headers: { "X-SL-Passphrase": slPassphrase },
  });
  if (!res.ok) throw new Error("Unauthorized.");
  return res.json();
}

// ─── Topic Groups ─────────────────────────────────────────────────────────────

export async function fetchTopicGroups(passphrase: string, isSL: boolean) {
  const res = await fetch(`${API_BASE}/admin/topic-groups`, {
    headers: adminHeaders(passphrase, isSL),
  });
  if (!res.ok) throw new Error("Failed to fetch topic groups.");
  return res.json();
}

export async function fetchTopicGroup(passphrase: string, isSL: boolean, tag: string) {
  const res = await fetch(`${API_BASE}/admin/topic-groups/${encodeURIComponent(tag)}`, {
    headers: adminHeaders(passphrase, isSL),
  });
  if (!res.ok) throw new Error("Failed to fetch topic group.");
  return res.json();
}

export async function sendMassReply(
  passphrase: string, isSL: boolean, tag: string,
  content: string, markInvestigating: boolean
) {
  const res = await fetch(`${API_BASE}/admin/topic-groups/${encodeURIComponent(tag)}/mass-reply`, {
    method: "POST",
    headers: adminHeaders(passphrase, isSL),
    body: JSON.stringify({ content, markInvestigating }),
  });
  if (!res.ok) throw new Error("Mass reply failed.");
  return res.json();
}

export async function renameTopicGroup(passphrase: string, isSL: boolean, oldTag: string, newTag: string) {
  const res = await fetch(`${API_BASE}/admin/topic-groups/${encodeURIComponent(oldTag)}/rename`, {
    method: "PATCH",
    headers: adminHeaders(passphrase, isSL),
    body: JSON.stringify({ newTag }),
  });
  if (!res.ok) throw new Error("Rename failed.");
  return res.json();
}

export async function deleteTopicGroup(passphrase: string, isSL: boolean, tag: string) {
  const res = await fetch(`${API_BASE}/admin/topic-groups/${encodeURIComponent(tag)}`, {
    method: "DELETE",
    headers: adminHeaders(passphrase, isSL),
  });
  if (!res.ok) throw new Error("Delete failed.");
  return res.json();
}

export async function retagSubmission(passphrase: string, isSL: boolean, id: string, newTag: string) {
  const res = await fetch(`${API_BASE}/admin/submissions/${id}/retag`, {
    method: "PATCH",
    headers: adminHeaders(passphrase, isSL),
    body: JSON.stringify({ newTag }),
  });
  if (!res.ok) throw new Error("Retag failed.");
  return res.json();
}
