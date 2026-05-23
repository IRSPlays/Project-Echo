import { getDb } from "./connection.js";
import type { InValue } from "@libsql/client";
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

export async function createSubmission(
  sub: Omit<Submission, "created_at" | "resolved_at" | "closed_at" | "escalated_to_sl">,
): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO submissions (
        id, content, proposed_solution, category, tier, tier_label, ai_reasoning,
        ai_topic_tag, action_status, session_hash, cluster_id, ticket_pin_hash
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `,
    args: [
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
      sub.ticket_pin_hash,
    ],
  });
}

export async function getSubmissionById(id: string): Promise<Submission | undefined> {
  const db = getDb();
  const res = await db.execute({ sql: "SELECT * FROM submissions WHERE id = ?", args: [id] });
  return res.rows[0] as unknown as Submission | undefined;
}

export async function getSubmissions(
  filters: SubmissionFilters = {},
): Promise<{ data: Submission[]; total: number }> {
  const db = getDb();
  const conditions: string[] = [];
  const params: InValue[] = [];

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

  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM submissions ${where}`,
    args: params,
  });
  const total = Number(countRes.rows[0].count);

  const dataRes = await db.execute({
    sql: `SELECT * FROM submissions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...params, limit, offset],
  });

  return { data: dataRes.rows as unknown as Submission[], total };
}

export async function updateSubmissionStatus(
  id: string,
  status: string,
): Promise<Submission | undefined> {
  const db = getDb();
  const resolvedAt = status === "Resolved" ? new Date().toISOString() : null;
  const closedAt = status === "Closed" ? new Date().toISOString() : null;

  await db.execute({
    sql: `
      UPDATE submissions
      SET action_status = ?,
          resolved_at = COALESCE(?, resolved_at),
          closed_at = COALESCE(?, closed_at)
      WHERE id = ?
    `,
    args: [status, resolvedAt, closedAt, id],
  });

  return getSubmissionById(id);
}

export async function getSubmissionCountBySession(
  sessionHash: string,
  windowMinutes: number = 60,
): Promise<number> {
  const db = getDb();
  const res = await db.execute({
    sql: `
      SELECT COUNT(*) as count FROM submissions
      WHERE session_hash = ? AND created_at > datetime('now', ?)
    `,
    args: [sessionHash, `-${windowMinutes} minutes`],
  });
  return Number(res.rows[0].count);
}

export async function getSubmissionsByDateRange(from: string, to: string): Promise<Submission[]> {
  const db = getDb();
  const res = await db.execute({
    sql: `
      SELECT * FROM submissions
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
      ORDER BY created_at DESC
    `,
    args: [from, to],
  });
  return res.rows as unknown as Submission[];
}

// ─── Clusters ────────────────────────────────────────────────────────────────

export async function upsertCluster(keyword: string): Promise<Cluster> {
  const db = getDb();
  const res = await db.execute({
    sql: "SELECT * FROM clusters WHERE keyword = ?",
    args: [keyword],
  });
  const existing = res.rows[0];

  if (existing) {
    await db.execute({
      sql: `
        UPDATE clusters SET count = count + 1, last_seen = datetime('now'),
        severity = CASE
          WHEN count + 1 >= 20 THEN 'critical'
          WHEN count + 1 >= 10 THEN 'high'
          WHEN count + 1 >= 5 THEN 'medium'
          ELSE 'low'
        END
        WHERE keyword = ?
      `,
      args: [keyword],
    });

    const updated = await db.execute({
      sql: "SELECT * FROM clusters WHERE keyword = ?",
      args: [keyword],
    });
    return updated.rows[0] as unknown as Cluster;
  }

  const id = uuidv4();
  await db.execute({
    sql: "INSERT INTO clusters (id, keyword) VALUES (?, ?)",
    args: [id, keyword],
  });
  const newRow = await db.execute({ sql: "SELECT * FROM clusters WHERE id = ?", args: [id] });
  return newRow.rows[0] as unknown as Cluster;
}

export async function getClusters(minCount: number = 5): Promise<Cluster[]> {
  const db = getDb();
  const res = await db.execute({
    sql: "SELECT * FROM clusters WHERE count >= ? ORDER BY count DESC",
    args: [minCount],
  });
  return res.rows as unknown as Cluster[];
}

export async function getAllClusters(): Promise<Cluster[]> {
  const db = getDb();
  const res = await db.execute("SELECT * FROM clusters ORDER BY count DESC");
  return res.rows as unknown as Cluster[];
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats(): Promise<Stats> {
  const db = getDb();

  const [t, p, i, r, c, a, t1, t2, t3, ac, today] = await Promise.all([
    db.execute("SELECT COUNT(*) as c FROM submissions"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Pending'"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Investigating'"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Resolved'"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Closed'"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE action_status = 'Archived'"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE tier = 1"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE tier = 2"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE tier = 3"),
    db.execute("SELECT COUNT(*) as c FROM clusters WHERE count >= 5"),
    db.execute("SELECT COUNT(*) as c FROM submissions WHERE date(created_at) = date('now')"),
  ]);

  return {
    total: Number(t.rows[0].c),
    pending: Number(p.rows[0].c),
    investigating: Number(i.rows[0].c),
    resolved: Number(r.rows[0].c),
    closed: Number(c.rows[0].c),
    archived: Number(a.rows[0].c),
    tier1: Number(t1.rows[0].c),
    tier2: Number(t2.rows[0].c),
    tier3: Number(t3.rows[0].c),
    activeClusters: Number(ac.rows[0].c),
    todayCount: Number(today.rows[0].c),
  };
}

// ─── Ticket Replies ──────────────────────────────────────────────────────────

export async function insertReply(
  submissionId: string,
  authorRole: "Student" | "EXCO" | "School Leader",
  content: string,
): Promise<TicketReply> {
  const db = getDb();
  const id = uuidv4();
  await db.execute({
    sql: `
      INSERT INTO ticket_replies (id, submission_id, author_role, content)
      VALUES (?, ?, ?, ?)
    `,
    args: [id, submissionId, authorRole, content],
  });

  const res = await db.execute({ sql: "SELECT * FROM ticket_replies WHERE id = ?", args: [id] });
  return res.rows[0] as unknown as TicketReply;
}

export async function getRepliesForSubmission(submissionId: string): Promise<TicketReply[]> {
  const db = getDb();
  const res = await db.execute({
    sql: "SELECT * FROM ticket_replies WHERE submission_id = ? ORDER BY created_at ASC",
    args: [submissionId],
  });
  return res.rows as unknown as TicketReply[];
}

export async function escalateToSL(submissionId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: "UPDATE submissions SET escalated_to_sl = 1 WHERE id = ?",
    args: [submissionId],
  });
}

// ─── Global Updates ──────────────────────────────────────────────────────────

export async function insertGlobalUpdate(
  content: string,
  authorRole: "EXCO" | "School Leader",
): Promise<GlobalUpdate> {
  const db = getDb();
  const id = uuidv4();
  await db.execute({
    sql: `
      INSERT INTO global_updates (id, content, author_role)
      VALUES (?, ?, ?)
    `,
    args: [id, content, authorRole],
  });

  const res = await db.execute({ sql: "SELECT * FROM global_updates WHERE id = ?", args: [id] });
  return res.rows[0] as unknown as GlobalUpdate;
}

export async function getGlobalUpdates(): Promise<GlobalUpdate[]> {
  const db = getDb();
  const res = await db.execute("SELECT * FROM global_updates ORDER BY created_at DESC");
  return res.rows as unknown as GlobalUpdate[];
}

// ─── Topic Groups ─────────────────────────────────────────────────────────────

export async function upsertTopicGroup(tag: string): Promise<TopicGroup> {
  const db = getDb();
  const res = await db.execute({ sql: "SELECT * FROM topic_groups WHERE tag = ?", args: [tag] });
  const existing = res.rows[0];

  if (existing) {
    await db.execute({
      sql: "UPDATE topic_groups SET count = count + 1, last_seen = datetime('now') WHERE tag = ?",
      args: [tag],
    });
    const updated = await db.execute({
      sql: "SELECT * FROM topic_groups WHERE tag = ?",
      args: [tag],
    });
    return updated.rows[0] as unknown as TopicGroup;
  }

  const id = uuidv4();
  await db.execute({ sql: "INSERT INTO topic_groups (id, tag) VALUES (?, ?)", args: [id, tag] });
  const newRow = await db.execute({ sql: "SELECT * FROM topic_groups WHERE id = ?", args: [id] });
  return newRow.rows[0] as unknown as TopicGroup;
}

export async function getTopicGroups(): Promise<TopicGroup[]> {
  const db = getDb();
  const res = await db.execute("SELECT * FROM topic_groups ORDER BY count DESC");
  return res.rows as unknown as TopicGroup[];
}

export async function getSubmissionsByTopicTag(tag: string): Promise<Submission[]> {
  const db = getDb();
  const res = await db.execute({
    sql: "SELECT * FROM submissions WHERE ai_topic_tag = ? ORDER BY created_at DESC",
    args: [tag],
  });
  return res.rows as unknown as Submission[];
}

export async function massReplyToGroup(
  tag: string,
  content: string,
  authorRole: "EXCO" | "School Leader",
  markInvestigating: boolean = false,
): Promise<{ repliedCount: number }> {
  const db = getDb();

  // Get all non-closed, non-archived tickets in this group
  const res = await db.execute({
    sql: `
      SELECT id FROM submissions
      WHERE ai_topic_tag = ?
      AND action_status NOT IN ('Closed', 'Archived')
    `,
    args: [tag],
  });

  const submissions = res.rows as unknown as { id: string }[];

  const txn = await db.transaction("write");

  try {
    for (const sub of submissions) {
      await txn.execute({
        sql: `INSERT INTO ticket_replies (id, submission_id, author_role, content) VALUES (?, ?, ?, ?)`,
        args: [uuidv4(), sub.id, authorRole, content],
      });
      if (markInvestigating) {
        await txn.execute({
          sql: `UPDATE submissions SET action_status = 'Investigating' WHERE id = ? AND action_status = 'Pending'`,
          args: [sub.id],
        });
      }
    }
    await txn.commit();
  } catch (err) {
    await txn.rollback();
    throw err;
  }

  return { repliedCount: submissions.length };
}

export async function retagSubmission(submissionId: string, newTag: string): Promise<void> {
  const db = getDb();
  const res = await db.execute({
    sql: "SELECT ai_topic_tag FROM submissions WHERE id = ?",
    args: [submissionId],
  });
  const old = res.rows[0] as unknown as { ai_topic_tag: string } | undefined;

  await db.execute({
    sql: "UPDATE submissions SET ai_topic_tag = ? WHERE id = ?",
    args: [newTag, submissionId],
  });

  // Update counts: decrement old tag, upsert new tag
  if (old?.ai_topic_tag && old.ai_topic_tag !== newTag) {
    await db.execute({
      sql: "UPDATE topic_groups SET count = MAX(0, count - 1) WHERE tag = ?",
      args: [old.ai_topic_tag],
    });
    await upsertTopicGroup(newTag);
  }
}

export async function deleteTopicGroup(tag: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: "UPDATE submissions SET ai_topic_tag = 'General Issue' WHERE ai_topic_tag = ?",
    args: [tag],
  });
  await db.execute({ sql: "DELETE FROM topic_groups WHERE tag = ?", args: [tag] });
}

export async function renameTopicGroup(oldTag: string, newTag: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: "UPDATE submissions SET ai_topic_tag = ? WHERE ai_topic_tag = ?",
    args: [newTag, oldTag],
  });
  await db.execute({
    sql: "UPDATE topic_groups SET tag = ? WHERE tag = ?",
    args: [newTag, oldTag],
  });
}
