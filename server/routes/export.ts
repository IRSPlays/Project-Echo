import { Router } from "express";
import type { Request, Response } from "express";
import { getSubmissions, getClusters, getStats } from "../db/queries.js";

const router = Router();

// ─── Auth (same as admin) ────────────────────────────────────────────────────

function adminAuth(req: Request, res: Response, next: Function): void {
  const passphrase = req.headers["x-admin-passphrase"] as string;
  const expected = process.env.ADMIN_PASSPHRASE || "echo_ops_2026";

  if (!passphrase || passphrase !== expected) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  next();
}

router.use(adminAuth);

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * GET /api/echo/export?format=md|json
 * Generate a report for SL meetings.
 */
router.get("/", (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || "md";
    const stats = getStats();
    const { data: submissions } = getSubmissions({ limit: 200 });
    const clusters = getClusters(5);

    if (format === "json") {
      res.json({ stats, submissions, clusters, generated_at: new Date().toISOString() });
      return;
    }

    // Markdown report
    const lines: string[] = [];
    lines.push("# Project Echo — Triage Report");
    lines.push(`**Generated:** ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("## Summary Statistics");
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Submissions | ${stats.total} |`);
    lines.push(`| Pending | ${stats.pending} |`);
    lines.push(`| Investigating | ${stats.investigating} |`);
    lines.push(`| Resolved | ${stats.resolved} |`);
    lines.push(`| Archived (Noise) | ${stats.archived} |`);
    lines.push(`| Active Clusters | ${stats.activeClusters} |`);
    lines.push(`| Today's Reports | ${stats.todayCount} |`);
    lines.push("");

    if (clusters.length > 0) {
      lines.push("## ⚠ Systemic Issues (Clustered Reports)");
      for (const c of clusters) {
        lines.push(`- **"${c.keyword}"** — ${c.count} reports (Severity: ${c.severity.toUpperCase()})`);
      }
      lines.push("");
    }

    lines.push("## Tier Breakdown");
    lines.push(`| Tier | Label | Count |`);
    lines.push(`|------|-------|-------|`);
    lines.push(`| 1 | Infrastructure (Ops) | ${stats.tier1} |`);
    lines.push(`| 2 | Strategic (EXCO) | ${stats.tier2} |`);
    lines.push(`| 3 | Noise (Archived) | ${stats.tier3} |`);
    lines.push("");

    lines.push("## Raw Student Data");
    lines.push("");

    const actionable = submissions.filter((s) => s.tier !== 3);
    for (const s of actionable.slice(0, 50)) {
      lines.push(`### [${s.category}] Tier ${s.tier} — ${s.action_status}`);
      lines.push(`> ${s.content}`);
      lines.push(`*AI Assessment: ${s.ai_reasoning || "N/A"}*`);
      lines.push(`*Submitted: ${s.created_at}*`);
      lines.push("");
    }

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="echo-report-${new Date().toISOString().split("T")[0]}.md"`);
    res.send(lines.join("\n"));
  } catch (err) {
    console.error("[Export] Error:", err);
    res.status(500).json({ error: "Failed to generate report." });
  }
});

export default router;
