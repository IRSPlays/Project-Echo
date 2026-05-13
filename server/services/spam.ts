import crypto from "node:crypto";
import type { Request } from "express";
import { getSubmissionCountBySession } from "../db/queries.js";

const MAX_SUBMISSIONS_PER_HOUR = 5;

/**
 * Generate a session hash from request fingerprint.
 * Uses IP + User-Agent, hashed with SHA-256.
 * No PII is stored — only the hash.
 */
export function generateSessionHash(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  const raw = `${ip}::${ua}`;

  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

/**
 * Check if a session has exceeded the rate limit.
 * Returns true if the session is rate-limited.
 */
export function isRateLimited(sessionHash: string): boolean {
  const count = getSubmissionCountBySession(sessionHash, 60);
  return count >= MAX_SUBMISSIONS_PER_HOUR;
}

/**
 * Validate submission content.
 * Returns an error message or null if valid.
 */
export function validateSubmission(content: string, category: string): string | null {
  if (!content || typeof content !== "string") {
    return "Content is required.";
  }

  const trimmed = content.trim();

  if (trimmed.length < 5) {
    return "Report must be at least 5 characters.";
  }

  if (trimmed.length > 2000) {
    return "Report must be under 2000 characters.";
  }

  const validCategories = ["Facilities", "Culture", "Academics", "Safety"];
  if (!validCategories.includes(category)) {
    return `Invalid category. Must be one of: ${validCategories.join(", ")}`;
  }

  return null;
}
