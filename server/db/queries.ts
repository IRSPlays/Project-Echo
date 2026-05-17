import { getDb } from "./connection.js";
import { v4 as uuidv4 } from "uuid";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  content: string;
  proposed_solution: string | null;
  category: "Facilities" | "Culture" | "Academics" | "Safety";
  tier: 1 | 2 | 3;
  tier_label: "Infrastructure" | "Strategic" | "Noise";
  ai_reasoning: string;
  ai_topic_tag: string;
  action_status: "Pending" | "Investigating" | "Resolved" | "Closed" | "Archived";
  cluster_id: string | null;
  session_hash: string;
  ticket_pin_hash: string | null;
  escalated_to_sl: number;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface TopicGroup {
  id: string;
  tag: string;
  count: number;
  last_seen: string;
  created_at: string;
}


export interface Cluster {
  id: string;
  keyword: string;
  count: number;
  severity: "low" | "medium" | "high" | "critical";
  first_seen: string;
  last_seen: string;
}

export interface TicketReply {
  id: string;
  submission_id: string;
  author_role: "Student" | "EXCO" | "School Leader";
  content: string;
  created_at: string;
}

export interface GlobalUpdate {
  id: string;
  content: string;
  author_role: "EXCO" | "School Leader";
  created_at: string;
}

export interface SubmissionFilters {
  category?: string;
  tier?: number;
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface Stats {
  total: number;
  pending: number;
  investigating: number;
  resolved: number;
  closed: number;
  archived: number;
  tier1: number;
  tier2: number;
  tier3: number;
  activeClusters: number;
  todayCount: number;
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export function createSubmission(
  sub: Omit<Submission, "created_at" | "resolved_at" | "closed_at" | "escalated_to_sl">
): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO submissions (
      id, content, proposed_solution, category, tier, tier_label, ai_reasoning,
      ai_topic_tag, action_status, session_hash, cluster_id, ticket_pin_hash
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    sub.id,
    sub.content,
    sub.proposed_solution,
    sub.category,
    sub.tier,
    sub.tier_label,
    sub.ai_reasoning,
    sub.ai_topic_tag,
    sub.action_status,
    sub.session_hash,
    sub.cluster_id,
    sub.ticket_pin_hash
  );
}

export function getSubmissionById(id: string): Submission | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as Submission | undefined;
}

export function getSubmissions(filters: SubmissionFilters = {}): { data: Submission[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.category) {
    conditions.push("category = ?");
    params.push(filters.category);
  }
  if (filters.tier) {
    conditions.push("tier = ?");
    params.push(filters.tier);
  }
  if (filters.status) {
    conditions.push("action_status = ?");
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push("content LIKE ?");
    params.push(`%${filters.search}%`);
  }
  if (filters.dateFrom) {
    conditions.push("date(created_at) >= date(?)");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("date(created_at) <= date(?)");
    params.push(filters.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM submissions ${where}`).get(...params) as { count: number }).count;
  const data = db.prepare(`SELECT * FROM submissions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Submission[];

  return { data, total };
}

export function updateSubmissionStatus(id: string, status: string): Submission | undefined {
  const db = getDb();
  const resolvedAt = status === "Resolved" ? new Date().toISOString() : null;
  const closedAt = status === "Closed" ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE submissions
    SET action_status = ?,
        resolved_at = COALESCE(?, resolved_at),
        closed_at = COALESCE(?, closed_at)
    WHERE id = ?
  `).run(status, resolvedAt, closedAt, id);

  return getSubmissionById(id);
}

export function getSubmissionCountBySession(sessionHash: string, windowMinutes: number = 60): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM submissions
    WHERE session_hash = ? AND created_at > datetime('now', ?)
  `).get(sessionHash, `-${windowMinutes} minutes`) as { count: number };

  return result.count;
}

export function getSubmissionsByDateRange(from: string, to: string): Submission[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM submissions
    WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    ORDER BY created_at DESC
  `).all(from, to) as Submission[];
}

// ─── Clusters ────────────────────────────────────────────────────────────────

export function upsertCluster(keyword: string): Cluster {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM clusters WHERE keyword = ?").get(keyword) as Cluster | undefined;

  if (existing) {
    db.prepare(`
      UPDATE clusters SET count = count + 1, last_seen = datetime('now'),
      severity = CASE
        WHEN count + 1 >= 20 THEN 'critical'
        WHEN count + 1 >= 10 THEN 'high'
        WHEN count + 1 >= 5 THEN 'medium'
        ELSE 'low'
      END
      WHERE keyword = ?
    `).run(keyword);

    return db.prepare("SELECT * FROM clusters WHERE keyword = ?").get(keyword) as Cluster;
  }

  const id = uuidv4();
  db.prepare("INSERT INTO clusters (id, keyword) VALUES (?, ?)").run(id, keyword);
  return db.prepare("SELECT * FROM clusters WHERE id = ?").get(id) as Cluster;
}

export function getClusters(minCount: number = 5): Cluster[] {
  const db = getDb();
  return db.prepare("SELECT * FROM clusters WHERE count >= ? ORDER BY count DESC").all(minCount) as Cluster[];
}

export function getAllClusters(): Cluster[] {
  const db = getDb();
  return db.prepare("SELECT * FROM clusters ORDER BY count DESC").all() as Cluster[];
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function getStats(): Stats {
  const db = getDb();

  const total = (db.prepare("SELECT COUNT(*) as c FROM submissions").get() as { c: number }).c;
  const pending = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Pending'").get() as { c: number }).c;
  const investigating = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Investigating'").get() as { c: number }).c;
  const resolved = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Resolved'").get() as { c: number }).c;
  const closed = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Closed'").get() as { c: number }).c;
  const archived = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Archived'").get() as { c: number }).c;
  const tier1 = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE tier = 1").get() as { c: number }).c;
  const tier2 = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE tier = 2").get() as { c: number }).c;
  const tier3 = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE tier = 3").get() as { c: number }).c;
  const activeClusters = (db.prepare("SELECT COUNT(*) as c FROM clusters WHERE count >= 5").get() as { c: number }).c;
  const todayCount = (db.prepare("SELECT COUNT(*) as c FROM submissions WHERE date(created_at) = date('now')").get() as { c: number }).c;

  return { total, pending, investigating, resolved, closed, archived, tier1, tier2, tier3, activeClusters, todayCount };
}

// ─── Ticket Replies ──────────────────────────────────────────────────────────

export function insertReply(submissionId: string, authorRole: "Student" | "EXCO" | "School Leader", content: string): TicketReply {
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO ticket_replies (id, submission_id, author_role, content)
    VALUES (?, ?, ?, ?)
  `).run(id, submissionId, authorRole, content);

  return db.prepare("SELECT * FROM ticket_replies WHERE id = ?").get(id) as TicketReply;
}

export function getRepliesForSubmission(submissionId: string): TicketReply[] {
  const db = getDb();
  return db.prepare("SELECT * FROM ticket_replies WHERE submission_id = ? ORDER BY created_at ASC").all(submissionId) as TicketReply[];
}

export function escalateToSL(submissionId: string): void {
  const db = getDb();
  db.prepare("UPDATE submissions SET escalated_to_sl = 1 WHERE id = ?").run(submissionId);
}

// ─── Global Updates ──────────────────────────────────────────────────────────

export function insertGlobalUpdate(content: string, authorRole: "EXCO" | "School Leader"): GlobalUpdate {
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO global_updates (id, content, author_role)
    VALUES (?, ?, ?)
  `).run(id, content, authorRole);

  return db.prepare("SELECT * FROM global_updates WHERE id = ?").get(id) as GlobalUpdate;
}

export function getGlobalUpdates(): GlobalUpdate[] {
  const db = getDb();
  return db.prepare("SELECT * FROM global_updates ORDER BY created_at DESC").all() as GlobalUpdate[];
}

// ─── Topic Groups ─────────────────────────────────────────────────────────────

export function upsertTopicGroup(tag: string): TopicGroup {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM topic_groups WHERE tag = ?").get(tag) as TopicGroup | undefined;

  if (existing) {
    db.prepare("UPDATE topic_groups SET count = count + 1, last_seen = datetime('now') WHERE tag = ?").run(tag);
    return db.prepare("SELECT * FROM topic_groups WHERE tag = ?").get(tag) as TopicGroup;
  }

  const id = uuidv4();
  db.prepare("INSERT INTO topic_groups (id, tag) VALUES (?, ?)").run(id, tag);
  return db.prepare("SELECT * FROM topic_groups WHERE id = ?").get(id) as TopicGroup;
}

export function getTopicGroups(): TopicGroup[] {
  const db = getDb();
  return db.prepare("SELECT * FROM topic_groups ORDER BY count DESC").all() as TopicGroup[];
}

export function getSubmissionsByTopicTag(tag: string): Submission[] {
  const db = getDb();
  return db.prepare("SELECT * FROM submissions WHERE ai_topic_tag = ? ORDER BY created_at DESC").all(tag) as Submission[];
}

export function massReplyToGroup(
  tag: string,
  content: string,
  authorRole: "EXCO" | "School Leader",
  markInvestigating: boolean = false
): { repliedCount: number } {
  const db = getDb();

  // Get all non-closed, non-archived tickets in this group
  const submissions = db.prepare(`
    SELECT id FROM submissions
    WHERE ai_topic_tag = ?
    AND action_status NOT IN ('Closed', 'Archived')
  `).all(tag) as { id: string }[];

  const insertReplyStmt = db.prepare(`
    INSERT INTO ticket_replies (id, submission_id, author_role, content)
    VALUES (?, ?, ?, ?)
  `);

  const updateStatusStmt = db.prepare(`
    UPDATE submissions SET action_status = 'Investigating' WHERE id = ? AND action_status = 'Pending'
  `);

  const massInsert = db.transaction(() => {
    for (const sub of submissions) {
      insertReplyStmt.run(uuidv4(), sub.id, authorRole, content);
      if (markInvestigating) updateStatusStmt.run(sub.id);
    }
  });

  massInsert();
  return { repliedCount: submissions.length };
}

export function retagSubmission(submissionId: string, newTag: string): void {
  const db = getDb();
  const old = db.prepare("SELECT ai_topic_tag FROM submissions WHERE id = ?").get(submissionId) as { ai_topic_tag: string } | undefined;

  db.prepare("UPDATE submissions SET ai_topic_tag = ? WHERE id = ?").run(newTag, submissionId);

  // Update counts: decrement old tag, upsert new tag
  if (old?.ai_topic_tag && old.ai_topic_tag !== newTag) {
    db.prepare("UPDATE topic_groups SET count = MAX(0, count - 1) WHERE tag = ?").run(old.ai_topic_tag);
    upsertTopicGroup(newTag);
  }
}

export function deleteTopicGroup(tag: string): void {
  const db = getDb();
  // Re-tag all submissions in this group to "General Issue"
  db.prepare("UPDATE submissions SET ai_topic_tag = 'General Issue' WHERE ai_topic_tag = ?").run(tag);
  db.prepare("DELETE FROM topic_groups WHERE tag = ?").run(tag);
}

export function renameTopicGroup(oldTag: string, newTag: string): void {
  const db = getDb();
  db.prepare("UPDATE submissions SET ai_topic_tag = ? WHERE ai_topic_tag = ?").run(newTag, oldTag);
  db.prepare("UPDATE topic_groups SET tag = ? WHERE tag = ?").run(newTag, oldTag);
}
