"use client";

import { useEffect, useState, useRef } from "react";
import { findSimilarArticles, type ArticleSummary, type SimilarityResult, type SearchFields } from "@/lib/similarity";

interface Props {
  fields: SearchFields;
  currentId?: string;  // article being edited — excluded from results
}

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft:     "bg-yellow-100 text-yellow-700",
  archived:  "bg-gray-100 text-gray-500",
};

export default function SimilarArticles({ fields, currentId }: Props) {
  const [results,    setResults]    = useState<SimilarityResult[]>([]);
  const [dismissed,  setDismissed]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [articles,   setArticles]   = useState<ArticleSummary[]>([]);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load kb-articles.json once on mount
  useEffect(() => {
    fetch("/kb-articles.json")
      .then((r) => r.json())
      .then((data) => setArticles(data.articles || []))
      .catch(() => {});
  }, []);

  // Re-run similarity search whenever fields change (debounced 600ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDismissed(false);

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const found = findSimilarArticles(articles, fields, currentId);
      setResults(found);
      setLoading(false);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fields, articles, currentId]);

  if (dismissed || results.length === 0) return null;

  return (
    <div className="mt-4 rounded-sm border border-amber-200 bg-amber-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round"
               strokeLinejoin="round" className="text-amber-600">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="text-sm font-semibold text-amber-800">
            {results.length} Similar Article{results.length !== 1 ? "s" : ""} Found
          </span>
          <span className="text-xs text-amber-600">
            — Review before generating to avoid duplicates
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-amber-500 hover:text-amber-700"
        >
          Dismiss
        </button>
      </div>

      {/* Results */}
      <ul className="divide-y divide-amber-100">
        {results.map(({ article, score, matchedOn }) => (
          <li key={article.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* Title + ID */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-amber-700">{article.id}</span>
                  <span className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase ${STATUS_COLORS[article.status] || "bg-gray-100 text-gray-500"}`}>
                    {article.status}
                  </span>
                  <span className="font-mono text-[9px] text-[#1E1A2E]/40">
                    v{article.current_version ?? 1}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium text-[#1E1A2E]">
                  {article.title}
                </p>
                {/* Match signals */}
                <div className="mt-1 flex flex-wrap gap-1">
                  {matchedOn.map((signal) => (
                    <span key={signal}
                      className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] text-amber-700">
                      {signal}
                    </span>
                  ))}
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] text-amber-600">
                    {score}% match
                  </span>
                </div>
                {/* Engineer + date */}
                <p className="mt-0.5 text-[10px] text-[#1E1A2E]/40">
                  By {article.engineer_name || "—"} ·{" "}
                  {article.updated_at
                    ? new Date(article.updated_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })
                    : "—"}
                </p>
              </div>

              {/* View button */}
              
              <a
                href={`/library/${article.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-sm border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-50 transition"
              >
                View &#8594;
              </a>
            </div>
          </li>
        ))}
      </ul>

      {loading && (
        <p className="px-4 py-2 text-xs text-amber-500">Searching...</p>
      )}
    </div>
  );
}
