import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "..", "echo.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id            TEXT PRIMARY KEY,
      content       TEXT NOT NULL,
      proposed_solution TEXT,
      category      TEXT NOT NULL CHECK (category IN ('Facilities', 'Culture', 'Academics', 'Safety')),
      tier          INTEGER CHECK (tier IN (1, 2, 3)),
      tier_label    TEXT CHECK (tier_label IN ('Infrastructure', 'Strategic', 'Noise')),
      ai_reasoning  TEXT,
      action_status TEXT DEFAULT 'Pending' CHECK (action_status IN ('Pending', 'Investigating', 'Resolved', 'Closed', 'Archived')),
      cluster_id    TEXT,
      session_hash  TEXT NOT NULL,
      ticket_pin_hash TEXT,
      escalated_to_sl INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      resolved_at   TEXT,
      closed_at     TEXT
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
    CREATE INDEX IF NOT EXISTS idx_clusters_keyword ON clusters(keyword);
  `);

  console.log("[DB] Database initialized at", DB_PATH);
}
