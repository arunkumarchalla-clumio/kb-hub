import type { KBFormFields } from "./types";

export type KeywordStrength = "empty" | "weak" | "good" | "strong";

export interface KeywordAnalysis {
  count: number;
  strength: KeywordStrength;
  message: string;
  suggestions: string[];
}

// Small enough to not need a real NLP library — just enough to keep obvious
// filler words out of keyword suggestions pulled from Title/Category/Product.
const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "on", "to", "for", "and", "or", "is", "are",
  "with", "when", "after", "before", "not", "this", "that", "it", "its",
  "be", "from", "by", "at", "as", "fails", "fail", "failed", "failing",
  "error", "errors", "issue", "issues", "problem", "problems", "user",
  "users", "client", "clients", "unable", "cannot", "can't",
]);

function extractCandidateWords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s.-]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    )
  );
}

export function parseKeywordList(keywords: string): string[] {
  return keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export function analyzeKeywords(fields: KBFormFields): KeywordAnalysis {
  const list = parseKeywordList(fields.keywords);
  const uniqueLower = Array.from(new Set(list.map((k) => k.toLowerCase())));
  const count = uniqueLower.length;

  const candidateSource = [fields.title, fields.category, fields.productVersion]
    .filter(Boolean)
    .join(" ");
  const candidates = extractCandidateWords(candidateSource);
  const suggestions = candidates
    .filter((c) => !uniqueLower.some((k) => k.includes(c) || c.includes(k)))
    .slice(0, 6);

  let strength: KeywordStrength;
  let message: string;

  if (count === 0) {
    strength = "empty";
    message = "No keywords yet — add a few so this article can be found later.";
  } else if (count < 3) {
    strength = "weak";
    message = `Only ${count} keyword${count === 1 ? "" : "s"} — aim for at least 4-6 so people can find this by different search terms.`;
  } else if (count <= 5) {
    strength = "good";
    message = `${count} keywords — a solid starting point.`;
  } else {
    strength = "strong";
    message = `${count} keywords — well covered for search.`;
  }

  return { count, strength, message, suggestions };
}
