import { Router } from "express";
import type { Request, Response } from "express";
import { getSubmissionById, getRepliesForSubmission, insertReply } from "../db/queries.js";
import crypto from "node:crypto";

const router = Router();

// Middleware to verify ticket pin
const verifyTicketAuth = (req: Request, res: Response, next: Function) => {
  const { id } = req.params;
  const pin = req.headers["x-ticket-pin"] as string;

  if (!pin) {
    res.status(401).json({ error: "Missing ticket PIN." });
    return;
  }

  const submission = getSubmissionById(id);
  if (!submission) {
    res.status(404).json({ error: "Ticket not found." });
    return;
  }

  const pinHash = crypto.createHash("sha256").update(pin).digest("hex");
  if (submission.ticket_pin_hash !== pinHash) {
    res.status(403).json({ error: "Invalid ticket PIN." });
    return;
  }

  // Attach submission to request for downstream handlers
  (req as any).submission = submission;
  next();
};

/**
 * GET /api/echo/ticket/:id
 * Retrieve a specific ticket and its replies
 */
router.get("/:id", verifyTicketAuth, (req: Request, res: Response) => {
  const submission = (req as any).submission;
  const replies = getRepliesForSubmission(submission.id);

  // Strip sensitive info before returning
  const { session_hash, ticket_pin_hash, ...safeSubmission } = submission;

  res.json({
    ticket: safeSubmission,
    replies,
  });
});

/**
 * POST /api/echo/ticket/:id/reply
 * Student replies to their ticket
 */
router.post("/:id/reply", verifyTicketAuth, (req: Request, res: Response) => {
  const { content } = req.body;
  const submission = (req as any).submission;

  if (!content || typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "Reply content is required." });
    return;
  }

  const reply = insertReply(submission.id, "Student", content.trim());
  res.status(201).json(reply);
});

export default router;
