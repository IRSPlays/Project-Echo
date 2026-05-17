import { GoogleGenerativeAI } from "@google/generative-ai";
import { SEED_TAGS } from "../../src/lib/tags.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TriageResult {
  tier: 1 | 2 | 3;
  label: "Infrastructure" | "Strategic" | "Noise";
  reasoning: string;
  topic_tag: string;
}



const INFRA_KEYWORDS = [
  "broken", "fix", "repair", "leak", "fan", "aircon", "toilet", "light",
  "door", "window", "chair", "desk", "projector", "whiteboard", "plug",
  "socket", "water", "cooler", "lift", "elevator", "staircase", "floor",
  "ceiling", "wall", "paint", "dirty", "clean", "dusty", "smell",
  "canteen", "food", "hygiene", "pest", "cockroach", "ant", "mosquito",
];

const STRATEGIC_KEYWORDS = [
  "policy", "rule", "culture", "bully", "mental", "stress", "pressure",
  "exam", "test", "homework", "workload", "teacher", "curriculum",
  "library", "noise", "recess", "schedule", "timetable", "assembly",
  "cca", "values", "discipline", "unfair", "bias", "feedback",
  "communication", "leadership", "student council", "exco",
];

function classifyByKeywords(content: string): TriageResult {
  const lower = content.toLowerCase();

  const infraScore = INFRA_KEYWORDS.filter((k) => lower.includes(k)).length;
  const strategicScore = STRATEGIC_KEYWORDS.filter((k) => lower.includes(k)).length;

  // Derive a rough topic tag from keywords
  let topic_tag = "General Issue";
  if (lower.includes("canteen") || lower.includes("food")) topic_tag = "Canteen Hygiene";
  else if (lower.includes("fan") || lower.includes("aircon") || lower.includes("temperature")) topic_tag = "Classroom Temperature";
  else if (lower.includes("toilet")) topic_tag = "Toilet Maintenance";
  else if (lower.includes("bully") || lower.includes("harassment")) topic_tag = "Bullying / Harassment";
  else if (lower.includes("exam") || lower.includes("stress") || lower.includes("homework")) topic_tag = "Exam Stress";
  else if (lower.includes("teacher")) topic_tag = "Teacher Conduct";
  else if (lower.includes("wifi") || lower.includes("internet")) topic_tag = "WiFi Connectivity";
  else if (lower.includes("projector") || lower.includes("av")) topic_tag = "Projector / AV Equipment";
  else if (lower.includes("water") || lower.includes("cooler")) topic_tag = "Water Cooler Issues";
  else if (lower.includes("light")) topic_tag = "Lighting Issues";

  if (content.trim().length < 10) {
    return { tier: 3, label: "Noise", reasoning: "Content too short to be actionable.", topic_tag: "General Issue" };
  }

  if (infraScore > strategicScore && infraScore > 0) {
    return { tier: 1, label: "Infrastructure", reasoning: `Keyword match: infrastructure-related terms detected (${infraScore} matches).`, topic_tag };
  }

  if (strategicScore > 0) {
    return { tier: 2, label: "Strategic", reasoning: `Keyword match: culture/policy terms detected (${strategicScore} matches).`, topic_tag };
  }

  if (content.trim().length > 30) {
    return { tier: 2, label: "Strategic", reasoning: "No strong keyword signals. Defaulting to Strategic review.", topic_tag };
  }

  return { tier: 3, label: "Noise", reasoning: "No actionable content detected.", topic_tag: "General Issue" };
}

// ─── Gemini Classifier ───────────────────────────────────────────────────────

const TRIAGE_PROMPT = `You are a school operations triage system for "Project Echo." Classify anonymous student feedback.

TIER DEFINITIONS:
- Tier 1 (Infrastructure): Physical, logistical, or facility-related issues. Examples: "Fan broken in 3E2", "Canteen food is cold", "Toilet on level 3 has no soap."
- Tier 2 (Strategic): Cultural, policy, academic, or systemic issues. Examples: "Library is too loud", "Too much homework", "Students feel unheard."
- Tier 3 (Noise): Non-actionable — jokes, spam, gibberish, rants with no specific issue.

TOPIC TAG INSTRUCTIONS:
Assign a short, specific topic tag (2–5 words) that captures the operational issue.
Prefer tags from this reference list (use the EXACT wording if it fits):
${SEED_TAGS.join(", ")}
If none fit, create a new concise tag. Be consistent — similar issues should get the same tag.

RULES:
1. Give benefit of the doubt. If possibly actionable, use Tier 1 or 2, not 3.
2. Profanity alone ≠ Noise — look for the underlying issue.
3. Reasoning: 1-2 sentences max.

CATEGORY CONTEXT: Student selected "{category}".

STUDENT FEEDBACK:
"{content}"

Respond with ONLY valid JSON:
{"tier": 1|2|3, "label": "Infrastructure"|"Strategic"|"Noise", "reasoning": "...", "topic_tag": "..."}`;

export async function classifySubmission(content: string, category: string): Promise<TriageResult> {
  const prompt = TRIAGE_PROMPT
    .replace("{content}", content.replace(/"/g, '\\"'))
    .replace("{category}", category);

  const apiKeys = [
    process.env.GEMINI_PAID_API_KEY,
    process.env.GEMINI_API_KEY,
  ].filter(Boolean) as string[];

  for (const key of apiKeys) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 250,
          },
        });

        const text = result.response.text();
        const parsed = JSON.parse(text) as TriageResult;

        if (![1, 2, 3].includes(parsed.tier)) throw new Error("Invalid tier");
        if (!["Infrastructure", "Strategic", "Noise"].includes(parsed.label)) throw new Error("Invalid label");
        if (!parsed.topic_tag || typeof parsed.topic_tag !== "string") parsed.topic_tag = "General Issue";

        return parsed;
      } catch (err) {
        console.error(`[Classifier] Attempt ${attempt + 1} with key ...${key.slice(-6)} failed:`, (err as Error).message);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  console.warn("[Classifier] All AI attempts failed, falling back to keywords.");
  return classifyByKeywords(content);
}
