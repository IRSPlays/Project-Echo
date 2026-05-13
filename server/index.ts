import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db/connection.js";
import submitRoutes from "./routes/submit.js";
import adminRoutes from "./routes/admin.js";
import exportRoutes from "./routes/export.js";
import ticketRoutes from "./routes/ticket.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:4173"],
  credentials: true,
}));

app.use(express.json({ limit: "10kb" }));

// Trust proxy for correct IP in session hash
app.set("trust proxy", 1);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/api/echo/health", (_req, res) => {
  res.json({
    status: "operational",
    service: "Project Echo VOA V2",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/echo/submit", submitRoutes);
app.use("/api/echo/ticket", ticketRoutes);
app.use("/api/echo/admin", adminRoutes);
app.use("/api/echo/export", exportRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// ─── Initialize & Start ─────────────────────────────────────────────────────

initDb();

app.listen(PORT, () => {
  console.log("");
  console.log("  ╔══════════════════════════════════════╗");
  console.log("  ║       PROJECT ECHO — BACKEND         ║");
  console.log("  ║       Anonymous Triage System         ║");
  console.log(`  ║       http://localhost:${PORT}            ║`);
  console.log("  ╚══════════════════════════════════════╝");
  console.log("");
  console.log(`  [API]    /api/echo/health`);
  console.log(`  [API]    /api/echo/submit       (POST)`);
  console.log(`  [API]    /api/echo/admin/*       (GET/PATCH)`);
  console.log(`  [API]    /api/echo/export        (GET)`);
  console.log("");

  if (!process.env.GEMINI_API_KEY) {
    console.log("  ⚠  GEMINI_API_KEY not set — using keyword fallback classifier");
  } else {
    console.log("  ✓  Gemini 3.1 Flash Lite classifier active");
  }
  console.log("");
});
