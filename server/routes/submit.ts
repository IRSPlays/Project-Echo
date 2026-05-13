import { Router } from "express";
import type { Request, Response } from "express";
import { createSubmission, updateSubmissionStatus, escalateToSL } from "../db/queries.js";
import { classifySubmission } from "../services/classifier.js";
import { processForClusters } from "../services/cluster.js";
import { generateSessionHash, isRateLimited, validateSubmission } from "../services/spam.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";

const router = Router();

/**
 * POST /api/echo/submit
 * Anonymous submission endpoint. No auth required.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { content, category, proposed_solution } = req.body;

    // Validate input
    const error = validateSubmission(content, category);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    // Spam check
    const sessionHash = generateSessionHash(req);
    if (isRateLimited(sessionHash)) {
      res.status(429).json({
        error: "Rate limit exceeded. Maximum 5 submissions per hour.",
      });
      return;
    }

    // Classify with Gemini (or keyword fallback)
    const triage = await classifySubmission(content.trim(), category);
    const tier = triage.tier as 1 | 2 | 3;

    // Generate Ticket PIN (6-digit)
    const ticketPin = Math.floor(100000 + Math.random() * 900000).toString();
    const ticketPinHash = crypto.createHash("sha256").update(ticketPin).digest("hex");

    // Store submission
    const submissionId = uuidv4();
    createSubmission({
      id: submissionId,
      content: content.trim(),
      proposed_solution: proposed_solution?.trim() || null,
      category: category as any,
      tier,
      tier_label: triage.label as any,
      ai_reasoning: triage.reasoning,
      action_status: "Pending",
      session_hash: sessionHash,
      cluster_id: null,
      ticket_pin_hash: ticketPinHash,
    });

    // Process for clustering (fire and forget)
    const clusters = processForClusters(content.trim());

    // Auto-archive noise
    if (tier === 3) {
      updateSubmissionStatus(submissionId, "Archived");
    }

    // Auto-escalate Infrastructure (T1) to School Leaders
    if (tier === 1) {
      escalateToSL(submissionId);
      console.log(`[Echo] Auto-escalated T1 to SL: ${submissionId}`);
    }

    console.log(
      `[Echo] New submission: ${submissionId} | Tier ${tier} (${triage.label}) | Category: ${category}`
    );

    if (clusters.length > 0) {
      console.log(
        `[Echo] Cluster alerts: ${clusters.map((c) => `"${c.keyword}" (${c.count})`).join(", ")}`
      );
    }

    res.status(201).json({
      success: true,
      id: submissionId,
      tier,
      label: triage.label,
      ticket_pin: ticketPin,
    });
  } catch (err) {
    console.error("[Echo] Submit error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
