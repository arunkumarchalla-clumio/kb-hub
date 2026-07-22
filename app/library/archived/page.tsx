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
  updated_at: string;
  published_at: string | null;
  archived_at: string;
  archived_by: string;
  current_version: number;
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
  const [articles,  setArticles]  = useState<ArchivedArticle[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [restoring, setRestoring] = useState<string | null>(null);
  const [blinking,  setBlinking]  = useState<string | null>(null);
  const [restored,  setRestored]  = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/library/archived")
      .then((r) => r.json())
      .then((d) => { setArticles(d.articles || []); setLoading(false); })
      .catch(() => { setError("Failed to load archived articles."); setLoading(false); });
  }, []);

  async function handleRestore(id: string) {
    if (!window.confirm(`Restore ${id} back to the library as published?`)) return;
    setRestoring(id);
    try {
      const res = await fetch(`/api/library/restore/${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Restore failed");
      // Green blink before removing from list
      setBlinking(id);
      setRestoring(null);
      setTimeout(() => {
        setBlinking(null);
        setRestored(id);
        setArticles((prev) => prev.filter((a) => a.id !== id));
      }, 1200);
    } catch {
      alert("Failed to restore article. Please try again.");
      setRestoring(null);
    }
  }

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
              ← KB Library
            </Link>
            <button
              onClick={() => { window.location.href = "/?new=1"; }}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:border-white/50 hover:text-white">
              New Article
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-[#1E1A2E]">🗄 Archived Articles</h1>
          <p className="mt-1 text-sm text-[#1E1A2E]/60">
            {articles.length} archived article{articles.length !== 1 ? "s" : ""} ·
            Restore any article to bring it back to the KB Library
          </p>
        </div>

        {/* Restored success banner */}
        {restored && (
          <div className="mb-4 flex items-center justify-between rounded-sm border border-green-200 bg-green-50 px-4 py-2.5">
            <p className="text-sm text-green-700">✓ {restored} restored to KB Library successfully</p>
            <button onClick={() => setRestored(null)} className="text-xs text-green-500 hover:text-green-700">Dismiss</button>
          </div>
        )}

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

        {loading && <p className="text-sm text-[#1E1A2E]/50">Loading...</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-sm border border-[#E3DFEE] bg-white">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-2xl mb-2">🗄</p>
                <p className="text-sm font-medium text-[#1E1A2E]/60">No archived articles found</p>
                <p className="mt-1 text-xs text-[#1E1A2E]/40">
                  Articles you archive from the KB Library appear here.
                  You can restore them at any time.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E3DFEE] bg-[#F7F6FB]">
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">ID</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Title</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Engineer</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Audience</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Version</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Published</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Archived On</th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Archived By</th>
                    <th className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50">Restore</th>
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
                      <td className="px-4 py-3 font-medium text-[#1E1A2E]/60 max-w-[220px] truncate">{a.title}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50 text-xs">{a.engineer_name || "—"}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50 text-xs">{a.audience}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-500">
                          v{a.current_version ?? 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#1E1A2E]/40 text-xs">{fmt(a.published_at)}</td>
                      <td className="px-4 py-3 text-amber-700 text-xs font-medium">{fmt(a.archived_at)}</td>
                      <td className="px-4 py-3 text-[#1E1A2E]/50 text-xs">{a.archived_by || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRestore(a.id)}
                          disabled={restoring === a.id || blinking === a.id}
                          title="Restore to library"
                          className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition ${
                            blinking === a.id
                              ? "animate-pulse border-green-500 bg-green-500 text-white"
                              : restoring === a.id
                              ? "border-green-300 bg-green-50 text-green-700 opacity-60"
                              : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {blinking === a.id
                            ? "✓ Restored!"
                            : restoring === a.id
                            ? "Restoring…"
                            : "↩ Restore to Library"}
                        </button>
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
          <span>© {new Date().getFullYear()} Commvault · KB Hub</span>
          <span>Internal use only</span>
        </div>
      </footer>
    </main>
  );
}
