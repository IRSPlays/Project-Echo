import { upsertCluster, type Cluster } from "../db/queries.js";

// ─── Keyword Extraction ─────────────────────────────────────────────────────

// Common English stop words to filter out
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "must", "need", "dare",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "because", "but", "and", "or", "if", "while", "about", "against",
  "this", "that", "these", "those", "it", "its", "i", "me", "my",
  "we", "our", "you", "your", "he", "him", "his", "she", "her",
  "they", "them", "their", "what", "which", "who", "whom", "up",
  "don", "don't", "doesn", "doesn't", "didn", "didn't", "won", "won't",
  "also", "like", "really", "think", "know", "want", "get", "got",
  "make", "go", "going", "even", "still", "way", "thing", "things",
]);

/**
 * Extract meaningful keywords from submission content.
 * Returns lowercase keywords, 3+ chars, de-duplicated.
 */
export function extractKeywords(content: string): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  return [...new Set(words)];
}

// ─── Cluster Detection ──────────────────────────────────────────────────────

/**
 * Process a submission's content for clustering.
 * Updates keyword counts and returns any clusters that hit the threshold.
 */
export function processForClusters(content: string): Cluster[] {
  const keywords = extractKeywords(content);
  const triggeredClusters: Cluster[] = [];

  for (const keyword of keywords) {
    const cluster = upsertCluster(keyword);
    if (cluster.count >= 5) {
      triggeredClusters.push(cluster);
    }
  }

  return triggeredClusters;
}
