"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Article {
  id: string;
  title: string;
  engineer_name: string;
  audience: string;
  issue_type: string;
  entity_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_version: number;
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft:     "bg-yellow-100 text-yellow-800",
  archived:  "bg-gray-100 text-gray-600",
};

const AUDIENCE_STYLES: Record<string, string> = {
  Internal:    "bg-purple-100 text-purple-800",
  Public:      "bg-blue-100 text-blue-800",
  Engineering: "bg-orange-100 text-orange-800",
};

function fmt(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function LibraryPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const [archiving,    setArchiving]    = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [filterEng,    setFilterEng]    = useState("All");
  const [filterType,   setFilterType]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    fetch("/api/library/list")
      .then((r) => r.json())
      .then((d) => { setArticles(d.articles || []); setLoading(false); })
      .catch(() => { setError("Failed to load articles."); setLoading(false); });
  }, []);

  async function handleArchive(e: React.MouseEvent, id: string, engineerName: string) {
    e.stopPropagation();
    if (!window.confirm(`Archive article ${id}? It will be moved to the archive.`)) return;
    setArchiving(id);
    try {
      const res = await fetch(`/api/library/archive/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedBy: engineerName || "Unknown" }),
      });
      if (!res.ok) throw new Error("Archive failed");
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Failed to archive article. Please try again.");
    } finally {
      setArchiving(null);
    }
  }

  const engineers   = ["All", ...Array.from(new Set(articles.map((a) => a.engineer_name))).filter(Boolean)];
  const issueTypes  = ["All", ...Array.from(new Set(articles.map((a) => a.issue_type))).filter(Boolean)];
  const statuses    = ["All", "published", "archived"];

  const filtered = articles.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.id.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.engineer_name.toLowerCase().includes(q) ||
      a.issue_type.toLowerCase().includes(q) ||
      a.entity_type.toLowerCase().includes(q);
    return (
      matchSearch &&
      (filterEng    === "All" || a.engineer_name === filterEng) &&
      (filterType   === "All" || a.issue_type    === filterType) &&
      (filterStatus === "All" || a.status        === filterStatus)
    );
  });

  return (
    <main className="min-h-screen bg-[#F7F6FB]">
      {/* Header */}
      <header className="bg-black px-6 py-4 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/commvault-wordmark-white.svg" alt="Commvault" className="h-6 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-base font-semibold tracking-tight text-white">
                Clumio
              </span>
              <span className="font-display text-base font-semibold tracking-tight text-[#B78BE0]">
                KB Atlas
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-[#1E1A2E]">KB Article Library</h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-sm text-[#1E1A2E]/60">
              {articles.length} article{articles.length !== 1 ? "s" : ""} saved
            </p>
            
            <a
              href="/library/archived"
              className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-mono uppercase tracking-widest text-amber-700 hover:bg-amber-100 transition"
            >
              View Archived
            </a>
          </div>
        </div>

        {/* Nav buttons */}
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-1.5 text-sm text-[#1E1A2E]/70 hover:border-[#7B3F87]/40 hover:text-[#1E1A2E]"
          >
            ← New Article
          </Link>
        </div>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by title, ID, engineer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-sm text-[#1E1A2E] placeholder:text-[#1E1A2E]/30 focus:border-[#7B3F87] focus:outline-none w-64"
          />
          <select
            value={filterEng}
            onChange={(e) => setFilterEng(e.target.value)}
            className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-sm text-[#1E1A2E]"
          >
            {engineers.map((e) => <option key={e}>{e}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-sm text-[#1E1A2E]"
          >
            {issueTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              if (e.target.value === "archived") {
                window.location.href = "/library/archived";
              } else {
                setFilterStatus(e.target.value);
              }
            }}
            className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-sm text-[#1E1A2E]"
          >
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          {(search || filterEng !== "All" || filterType !== "All" || filterStatus !== "All") && (
            <button
              onClick={() => { setSearch(""); setFilterEng("All"); setFilterType("All"); setFilterStatus("All"); }}
              className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-sm text-[#1E1A2E]/50 hover:text-[#1E1A2E]"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {loading && (
          <p className="text-sm text-[#1E1A2E]/50">Loading articles...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && (
          <div className="overflow-hidden rounded-sm border border-[#E3DFEE] bg-white">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-[#1E1A2E]/40">
                No articles found. Generate and save one from the Article Creator at http://localhost:3000.
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
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Status</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Version</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Created</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Updated</th>
                    <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`border-b border-[#E3DFEE] last:border-0 hover:bg-[#F7F6FB] transition ${
                        i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[#7B3F87] cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>{a.id}</td>
                      <td className="px-4 py-3 font-medium text-[#1E1A2E] max-w-[260px] truncate cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>{a.title}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/70 cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>{a.engineer_name || "—"}</td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${AUDIENCE_STYLES[a.audience] || "bg-gray-100 text-gray-600"}`}>
                          {a.audience}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#1E1A2E]/60 text-xs cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>{a.issue_type || "—"}</td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${STATUS_STYLES[a.status] || "bg-gray-100 text-gray-600"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                          (a.current_version ?? 1) > 1
                            ? "bg-[#7B3F87]/10 text-[#4B2170]"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          v{a.current_version ?? 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50 text-xs cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>{fmt(a.created_at)}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50 text-xs cursor-pointer" onClick={() => window.location.href = `/library/${a.id}`}>{fmt(a.updated_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); window.location.href = `/library/${a.id}/edit`; }}
                          title="Edit this article"
                          className="rounded p-1.5 text-[#1E1A2E]/30 hover:bg-[#7B3F87]/10 hover:text-[#4B2170] transition"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleArchive(e, a.id, a.engineer_name)}
                          disabled={archiving === a.id}
                          title="Archive this article"
                          className="rounded p-1.5 text-[#1E1A2E]/30 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40 transition"
                        >
                          {archiving === a.id ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="21 8 21 21 3 21 3 8"/>
                              <rect x="1" y="3" width="22" height="5"/>
                              <line x1="10" y1="12" x2="14" y2="12"/>
                            </svg>
                          )}
                        </button>
                        </div>
                      </td>
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
          <span>© {new Date().getFullYear()} Commvault · Clumio Atlas</span>
          <span>Internal use only</span>
        </div>
      </footer>
    </main>
  );
}
