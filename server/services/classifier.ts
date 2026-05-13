import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TriageResult {
  tier: 1 | 2 | 3;
  label: "Infrastructure" | "Strategic" | "Noise";
  reasoning: string;
}

// ─── Keyword Fallback ────────────────────────────────────────────────────────

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

  // Too short or no keywords → noise
  if (content.trim().length < 10) {
    return { tier: 3, label: "Noise", reasoning: "Content too short to be actionable." };
  }

  if (infraScore > strategicScore && infraScore > 0) {
    return { tier: 1, label: "Infrastructure", reasoning: `Keyword match: infrastructure-related terms detected (${infraScore} matches).` };
  }

  if (strategicScore > 0) {
    return { tier: 2, label: "Strategic", reasoning: `Keyword match: culture/policy terms detected (${strategicScore} matches).` };
  }

  // Default: strategic (benefit of the doubt — don't discard student voice)
  if (content.trim().length > 30) {
    return { tier: 2, label: "Strategic", reasoning: "No strong keyword signals. Defaulting to Strategic review." };
  }

  return { tier: 3, label: "Noise", reasoning: "No actionable content detected." };
}

// ─── Gemini Classifier ──────────────────────────────────────────────────────

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (genAI) return genAI;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Classifier] No GEMINI_API_KEY set. Falling back to keyword matching.");
    return null;
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

const TRIAGE_PROMPT = `You are a school operations triage system for "Project Echo." Your job is to classify anonymous student feedback into exactly one of three tiers.

TIER DEFINITIONS:
- Tier 1 (Infrastructure): Physical, logistical, or facility-related issues that the Operations team can directly fix. Examples: "Fan broken in 3E2", "Canteen food is cold", "Toilet on level 3 has no soap."
- Tier 2 (Strategic): Cultural, policy, academic, or systemic issues requiring EXCO/leadership strategy. Examples: "Library is too loud during recess", "Too much homework from Math dept", "Students feel unheard in assembly."
- Tier 3 (Noise): Non-actionable content — jokes, spam, profanity-only, gibberish, or rants with no specific issue. Examples: "lol", "this school sucks", "asdfghjkl", "I hate everything."

RULES:
1. Give students the benefit of the doubt. If a report COULD be actionable, classify it as Tier 1 or 2, NOT Tier 3.
2. Profanity alone does not make something Noise — look for the underlying issue.
3. Be specific in your reasoning (1-2 sentences max).

CATEGORY CONTEXT: The student selected the category "{category}" when submitting.

STUDENT FEEDBACK:
"{content}"

Respond with ONLY valid JSON:
{"tier": 1|2|3, "label": "Infrastructure"|"Strategic"|"Noise", "reasoning": "..."}`;

export async function classifySubmission(content: string, category: string): Promise<TriageResult> {
  const prompt = TRIAGE_PROMPT
    .replace("{content}", content.replace(/"/g, '\\"'))
    .replace("{category}", category);

  // Try both API keys — free first, paid fallback
  const apiKeys = [
    "AIzaSyC1ygd87K6PoqiqiCHT_CfMi_gF5kxsjD4",  // Paid key (primary)
    process.env.GEMINI_API_KEY,                     // Free key (fallback)
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
            maxOutputTokens: 200,
          },
        });

        const text = result.response.text();
        const parsed = JSON.parse(text) as TriageResult;

        if (![1, 2, 3].includes(parsed.tier)) throw new Error("Invalid tier");
        if (!["Infrastructure", "Strategic", "Noise"].includes(parsed.label)) throw new Error("Invalid label");

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
