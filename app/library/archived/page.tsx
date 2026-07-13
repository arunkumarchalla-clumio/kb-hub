"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ArchivedArticle {
  id: string;
  title: string;
  engineer_name: string;
  audience: string;
  issue_type: string;
  status: string;
  created_at: string;
  archived_at: string;
  archived_by: string;
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

export default function ArchivedLibraryPage() {
  const [articles, setArticles] = useState<ArchivedArticle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    fetch("/api/library/archived")
      .then((r) => r.json())
      .then((d) => { setArticles(d.articles || []); setLoading(false); })
      .catch(() => { setError("Failed to load archived articles."); setLoading(false); });
  }, []);

  const filtered = articles.filter((a) => {
    const q = search.toLowerCase();
    return (
      !q ||
      a.id.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.engineer_name.toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-[#F7F6FB]">
      {/* Header */}
      <header className="bg-black px-6 py-4 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path d="M50,5 L89,27.5 L89,72.5 L50,95 L11,72.5 L11,27.5 Z"
                fill="none" stroke="white" strokeWidth="5.5" strokeLinejoin="round"/>
              <polygon points="50,30.1 67.8,39.7 50,49.3 32.2,39.7"
                fill="none" stroke="white" strokeWidth="3.5" strokeLinejoin="round"/>
              <polygon points="32.2,39.7 32.2,64.4 50,74 50,49.3"
                fill="none" stroke="white" strokeWidth="3.5" strokeLinejoin="round"/>
              <polygon points="67.8,39.7 67.8,64.4 50,74 50,49.3"
                fill="none" stroke="white" strokeWidth="3.5" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-lg">Commvault</span>
            <span className="text-white/30">|</span>
            <span className="font-semibold text-[#B78BE0]">Clumio</span>
            <span className="text-white/30">|</span>
            <span className="font-semibold text-white/70">KB Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/library"
              className="rounded-sm border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:border-white/50 hover:text-white">
              ← Library
            </Link>
            <Link href="/"
              className="rounded-sm border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:border-white/50 hover:text-white">
              Article Creator
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-[#1E1A2E]">Archived Articles</h1>
          <p className="mt-1 text-sm text-[#1E1A2E]/60">
            Articles archived more than 3 days ago · {articles.length} total
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by title, ID, engineer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-sm text-[#1E1A2E] placeholder:text-[#1E1A2E]/30 focus:border-[#7B3F87] focus:outline-none w-64"
          />
        </div>

        {/* Table */}
        {loading && <p className="text-sm text-[#1E1A2E]/50">Loading...</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-sm border border-[#E3DFEE] bg-white">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-[#1E1A2E]/40">
                No archived articles found. Articles archived for more than 3 days appear here.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E3DFEE] bg-[#F7F6FB]">
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">ID</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Title</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Engineer</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Audience</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Type</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Created</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Archived On</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Archived By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`border-b border-[#E3DFEE] last:border-0 transition ${
                        i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-amber-700">{a.id}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1A2E]/60 max-w-[260px] truncate">{a.title}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50">{a.engineer_name || "—"}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50 text-xs">{a.audience}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50 text-xs">{a.issue_type || "—"}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/40 text-xs">{fmt(a.created_at)}</td>
                      <td className="px-4 py-3 text-amber-700 text-xs">{fmt(a.archived_at)}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50 text-xs">{a.archived_by || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-black px-6 py-6 text-xs text-white/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span>© {new Date().getFullYear()} Commvault · KB Hub</span>
          <span>Internal use only</span>
        </div>
      </footer>
    </main>
  );
}
