// ── Similarity scoring for KB article duplicate detection ─────────────────────
// Used by the Similar Articles panel on the intake form (Steps 1–4) and
// the edit page. Runs entirely client-side against kb-articles.json.
// No server round-trip needed.

export interface ArticleSummary {
  id: string;
  title: string;
  issue_type: string;
  entity_type: string;
  audience: string;
  status: string;
  keywords: string;
  symptoms: string;
  engineer_name: string;
  current_version: number;
  updated_at: string;
}

export interface SimilarityResult {
  article: ArticleSummary;
  score: number;
  matchedOn: string[];
}

// Tokenise a string into lowercase words, stripping punctuation
function tokens(str: string): Set<string> {
  if (!str) return new Set();
  return new Set(
    str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

// Jaccard similarity between two token sets
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

export interface SearchFields {
  title: string;
  issueType: string;
  entityType: string;
  keywords: string;
  symptoms: string;
  audience: string;
}

// Score a candidate article against the current form fields.
// Returns a score 0–100 and a list of matched signals.
export function scoreArticle(
  candidate: ArticleSummary,
  fields: SearchFields,
  currentId?: string  // exclude the article being edited
): SimilarityResult | null {
  // Never suggest the article currently being edited
  if (currentId && candidate.id === currentId) return null;

  // Skip archived articles
  if (candidate.status === "archived") return null;

  let score = 0;
  const matchedOn: string[] = [];

  // Title similarity — highest weight (40 points)
  const titleSim = jaccard(tokens(fields.title), tokens(candidate.title));
  if (titleSim > 0.2) {
    score += Math.round(titleSim * 40);
    matchedOn.push("title");
  }

  // Symptoms similarity — high weight (25 points)
  const symptomSim = jaccard(tokens(fields.symptoms), tokens(candidate.symptoms));
  if (symptomSim > 0.15) {
    score += Math.round(symptomSim * 25);
    matchedOn.push("symptoms");
  }

  // Keywords — high weight (20 points)
  const keywordSim = jaccard(tokens(fields.keywords), tokens(candidate.keywords));
  if (keywordSim > 0.2) {
    score += Math.round(keywordSim * 20);
    matchedOn.push("keywords");
  }

  // Issue Type — exact match (8 points)
  if (
    fields.issueType &&
    candidate.issue_type &&
    fields.issueType.toLowerCase() === candidate.issue_type.toLowerCase()
  ) {
    score += 8;
    matchedOn.push("issue type");
  }

  // Entity Type — exact match (7 points)
  if (
    fields.entityType &&
    candidate.entity_type &&
    fields.entityType.toLowerCase() === candidate.entity_type.toLowerCase()
  ) {
    score += 7;
    matchedOn.push("entity type");
  }

  // Minimum threshold — ignore low-signal matches
  if (score < 10 || matchedOn.length === 0) return null;

  return { article: candidate, score, matchedOn };
}

// Run similarity search across all articles and return top results
export function findSimilarArticles(
  allArticles: ArticleSummary[],
  fields: SearchFields,
  currentId?: string,
  maxResults = 5
): SimilarityResult[] {
  // Need at least one meaningful field to search
  const hasContent =
    fields.title.trim().length > 2 ||
    fields.symptoms.trim().length > 10 ||
    fields.keywords.trim().length > 2 ||
    (fields.issueType && fields.entityType);

  if (!hasContent) return [];

  return allArticles
    .map((a) => scoreArticle(a, fields, currentId))
    .filter((r): r is SimilarityResult => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
