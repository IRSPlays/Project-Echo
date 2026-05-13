import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  getClusters,
  getAllClusters,
  getStats,
  insertReply,
  getRepliesForSubmission,
  escalateToSL,
  insertGlobalUpdate,
  getGlobalUpdates,
  getSubmissionsByDateRange,
} from "../db/queries.js";

const router = Router();

// ─── Auth Middleware ─────────────────────────────────────────────────────────

/** EXCO-only auth */
function excoAuth(req: Request, res: Response, next: NextFunction): void {
  const passphrase = req.headers["x-admin-passphrase"] as string;
  const expected = process.env.ADMIN_PASSPHRASE || "echo_ops_2026";
  if (passphrase && passphrase === expected) {
    (req as any).adminRole = "EXCO";
    return next();
  }
  res.status(401).json({ error: "Unauthorized. Invalid admin passphrase." });
}

/** SL-only auth */
function slAuth(req: Request, res: Response, next: NextFunction): void {
  const passphrase = req.headers["x-sl-passphrase"] as string;
  const expected = process.env.SL_PASSPHRASE || "echo_sl_2026";
  if (passphrase && passphrase === expected) {
    (req as any).adminRole = "School Leader";
    return next();
  }
  res.status(401).json({ error: "Unauthorized SL access." });
}

/** Either EXCO or SL */
function anyAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const excoPass = req.headers["x-admin-passphrase"] as string;
  const slPass = req.headers["x-sl-passphrase"] as string;

  if (excoPass === (process.env.ADMIN_PASSPHRASE || "echo_ops_2026")) {
    (req as any).adminRole = "EXCO";
    return next();
  }
  if (slPass === (process.env.SL_PASSPHRASE || "echo_sl_2026")) {
    (req as any).adminRole = "School Leader";
    return next();
  }
  res.status(401).json({ error: "Unauthorized." });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth — used by Status Board)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/stats", (_req: Request, res: Response) => {
  try {
    res.json(getStats());
  } catch (err) {
    console.error("[Admin] Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

router.get("/clusters", (_req: Request, res: Response) => {
  try {
    res.json(getClusters(5));
  } catch (err) {
    console.error("[Admin] Clusters error:", err);
    res.status(500).json({ error: "Failed to fetch clusters." });
  }
});

router.get("/clusters/all", (_req: Request, res: Response) => {
  try {
    res.json(getAllClusters());
  } catch (err) {
    console.error("[Admin] All clusters error:", err);
    res.status(500).json({ error: "Failed to fetch clusters." });
  }
});

router.get("/global_updates", (_req: Request, res: Response) => {
  try {
    res.json(getGlobalUpdates());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch updates." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXCO ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/submissions", excoAuth, (req: Request, res: Response) => {
  try {
    const { category, tier, status, limit, offset, search, dateFrom, dateTo } = req.query;
    const result = getSubmissions({
      category: category as string,
      tier: tier ? Number(tier) : undefined,
      status: status as string,
      limit: limit ? Number(limit) : 200,
      offset: offset ? Number(offset) : 0,
      search: search as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });
    res.json(result);
  } catch (err) {
    console.error("[Admin] List error:", err);
    res.status(500).json({ error: "Failed to fetch submissions." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS UPDATE (EXCO or SL can both change status)
// ═══════════════════════════════════════════════════════════════════════════════

router.patch("/submissions/:id", anyAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Pending", "Investigating", "Resolved", "Closed", "Archived"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updated = updateSubmissionStatus(id, status);
    if (!updated) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }

    const role = (req as any).adminRole;
    console.log(`[Admin] [${role}] Status update: ${id} → ${status}`);
    res.json(updated);
  } catch (err) {
    console.error("[Admin] Update error:", err);
    res.status(500).json({ error: "Failed to update submission." });
  }
});

router.post("/submissions/:id/escalate", excoAuth, (req: Request, res: Response) => {
  try {
    escalateToSL(req.params.id);
    console.log(`[Admin] Escalated: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to escalate." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TICKET DETAIL & REPLY (EXCO or SL)
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/ticket/:id", anyAdminAuth, (req: Request, res: Response) => {
  try {
    const sub = getSubmissionById(req.params.id);
    if (!sub) { res.status(404).json({ error: "Not found." }); return; }
    const replies = getRepliesForSubmission(sub.id);
    res.json({ ticket: sub, replies });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ticket." });
  }
});

router.post("/ticket/:id/reply", anyAdminAuth, (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: "Content required." });
      return;
    }
    const role = (req as any).adminRole;
    const reply = insertReply(req.params.id, role, content.trim());
    res.json(reply);
  } catch (err) {
    res.status(500).json({ error: "Failed to reply." });
  }
});

router.post("/global_updates", anyAdminAuth, (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: "Content required." });
      return;
    }
    const role = (req as any).adminRole;
    const update = insertGlobalUpdate(content.trim(), role);
    res.json(update);
  } catch (err) {
    res.status(500).json({ error: "Failed to post update." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SL ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/sl/submissions", slAuth, (_req: Request, res: Response) => {
  try {
    const result = getSubmissions({ limit: 200 });
    const escalated = result.data.filter((s) => s.escalated_to_sl === 1);
    res.json({ data: escalated, total: escalated.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch SL submissions." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY & AI SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/history/summary", anyAdminAuth, async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.body;
    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: "dateFrom and dateTo required." });
      return;
    }

    const submissions = getSubmissionsByDateRange(dateFrom, dateTo);

    if (submissions.length === 0) {
      res.json({
        summary: "No submissions found in this date range.",
        submissions: [],
        stats: { total: 0, tier1: 0, tier2: 0, tier3: 0, resolved: 0, closed: 0, pending: 0 },
      });
      return;
    }

    // Compute range stats
    const rangeStats = {
      total: submissions.length,
      tier1: submissions.filter((s) => s.tier === 1).length,
      tier2: submissions.filter((s) => s.tier === 2).length,
      tier3: submissions.filter((s) => s.tier === 3).length,
      resolved: submissions.filter((s) => s.action_status === "Resolved" || s.action_status === "Closed").length,
      closed: submissions.filter((s) => s.action_status === "Closed").length,
      pending: submissions.filter((s) => s.action_status === "Pending" || s.action_status === "Investigating").length,
      categories: {
        facilities: submissions.filter((s) => s.category === "Facilities").length,
        culture: submissions.filter((s) => s.category === "Culture").length,
        academics: submissions.filter((s) => s.category === "Academics").length,
        safety: submissions.filter((s) => s.category === "Safety").length,
      },
    };

    // Try Gemini summary — try free key first, then paid key on failure
    let summary = "";

    const feedbackList = submissions
      .map((s, i) => `${i + 1}. [T${s.tier} ${s.tier_label}] [${s.category}] [${s.action_status}] ${s.content}${s.proposed_solution ? ` | Student solution: ${s.proposed_solution}` : ""}`)
      .join("\n");

    const prompt = `You are an operations analyst for a school triage system (Project Echo). Analyze the following ${submissions.length} student feedback submissions from ${dateFrom} to ${dateTo}.

SUBMISSIONS:
${feedbackList}

STATISTICS:
- Total: ${rangeStats.total}
- Tier 1 (Infrastructure): ${rangeStats.tier1}
- Tier 2 (Strategic): ${rangeStats.tier2}
- Tier 3 (Noise): ${rangeStats.tier3}
- Resolved/Closed: ${rangeStats.resolved}
- Pending: ${rangeStats.pending}
- Facilities: ${rangeStats.categories.facilities}, Culture: ${rangeStats.categories.culture}, Academics: ${rangeStats.categories.academics}, Safety: ${rangeStats.categories.safety}

Provide a concise operational summary in the following format:

## Key Trends
- List the top 3-5 recurring themes or patterns

## Critical Issues
- Highlight any urgent or unresolved problems

## Category Breakdown
- Which categories are most active and what they indicate

## Recommendations
- 3-5 specific, actionable improvements the school operations team should consider

## Resolution Performance
- How well is the team handling the feedback pipeline

Keep it professional, concise, and data-driven. Use bullet points.`;

    // Try both API keys — free first, paid as fallback
    const apiKeys = [
      "AIzaSyC1ygd87K6PoqiqiCHT_CfMi_gF5kxsjD4",  // Paid key (primary)
      process.env.GEMINI_API_KEY,                     // Free key (fallback)
    ].filter(Boolean) as string[];

    let aiSuccess = false;
    for (const key of apiKeys) {
      if (aiSuccess) break;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`[Admin] AI summary attempt ${attempt + 1} with key ...${key.slice(-6)}`);
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

          const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
          });

          summary = result.response.text();
          aiSuccess = true;
          console.log("[Admin] AI summary generated successfully.");
          break;
        } catch (aiErr) {
          console.error(`[Admin] AI attempt ${attempt + 1} failed:`, (aiErr as Error).message);
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1500)); // wait before retry
        }
      }
    }

    if (!aiSuccess) {
      summary = `## Auto-Generated Stats (AI unavailable)\n\n- **Total submissions:** ${rangeStats.total}\n- **Tier 1 (Infrastructure):** ${rangeStats.tier1}\n- **Tier 2 (Strategic):** ${rangeStats.tier2}\n- **Tier 3 (Noise):** ${rangeStats.tier3}\n- **Resolved:** ${rangeStats.resolved}\n- **Still pending:** ${rangeStats.pending}\n\n### Top Categories\n- Facilities: ${rangeStats.categories.facilities}\n- Culture: ${rangeStats.categories.culture}\n- Academics: ${rangeStats.categories.academics}\n- Safety: ${rangeStats.categories.safety}`;
    }

    res.json({ summary, submissions, stats: rangeStats });
  } catch (err) {
    console.error("[Admin] History summary error:", err);
    res.status(500).json({ error: "Failed to generate summary." });
  }
});

export default router;
