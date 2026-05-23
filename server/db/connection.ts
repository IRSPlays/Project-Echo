import { createClient, Client } from "@libsql/client";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_PATH = `file:${path.join(__dirname, "..", "..", "echo.db")}`;

let db: Client | null = null;

export function getDb(): Client {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL || LOCAL_DB_PATH,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

export async function initDb(): Promise<void> {
  const database = getDb();

  // ── Step 1: Migrations first (must run before schema that refs new columns) ──
  try {
    await database.execute(`ALTER TABLE submissions ADD COLUMN ai_topic_tag TEXT DEFAULT 'General Issue'`);
  } catch { /* column already exists, safe to ignore */ }

  // ── Step 2: Create tables and indexes ───────────────────────────────────────
  await database.executeMultiple(`
    CREATE TABLE IF NOT EXISTS submissions (
      id            TEXT PRIMARY KEY,
      content       TEXT NOT NULL,
      proposed_solution TEXT,
      category      TEXT NOT NULL CHECK (category IN ('Facilities', 'Culture', 'Academics', 'Safety')),
      tier          INTEGER CHECK (tier IN (1, 2, 3)),
      tier_label    TEXT CHECK (tier_label IN ('Infrastructure', 'Strategic', 'Noise')),
      ai_reasoning  TEXT,
      ai_topic_tag  TEXT DEFAULT 'General Issue',
      action_status TEXT DEFAULT 'Pending' CHECK (action_status IN ('Pending', 'Investigating', 'Resolved', 'Closed', 'Archived')),
      cluster_id    TEXT,
      session_hash  TEXT NOT NULL,
      ticket_pin_hash TEXT,
      escalated_to_sl INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      resolved_at   TEXT,
      closed_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS topic_groups (
      id          TEXT PRIMARY KEY,
      tag         TEXT NOT NULL UNIQUE,
      count       INTEGER DEFAULT 1,
      last_seen   TEXT DEFAULT (datetime('now')),
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clusters (
      id            TEXT PRIMARY KEY,
      keyword       TEXT NOT NULL UNIQUE,
      count         INTEGER DEFAULT 1,
      severity      TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      first_seen    TEXT DEFAULT (datetime('now')),
      last_seen     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_replies (
      id            TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      author_role   TEXT NOT NULL CHECK (author_role IN ('Student', 'EXCO', 'School Leader')),
      content       TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );

    CREATE TABLE IF NOT EXISTS global_updates (
      id            TEXT PRIMARY KEY,
      content       TEXT NOT NULL,
      author_role   TEXT NOT NULL CHECK (author_role IN ('EXCO', 'School Leader')),
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category);
    CREATE INDEX IF NOT EXISTS idx_submissions_tier ON submissions(tier);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(action_status);
    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_session ON submissions(session_hash);
    CREATE INDEX IF NOT EXISTS idx_submissions_topic ON submissions(ai_topic_tag);
    CREATE INDEX IF NOT EXISTS idx_clusters_keyword ON clusters(keyword);
  `);

  console.log("[DB] Database initialized at", process.env.TURSO_DATABASE_URL ? "Turso" : LOCAL_DB_PATH);
}
