"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Version {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  engineer_name: string;
  engineer_email: string;
  audience: string;
  issue_type: string;
  entity_type: string;
  category: string;
  product_version: string;
  symptoms: string;
  cause: string;
  resolution: string;
  keywords: string;
  markdown_content: string;
  changed_by: string;
  change_note: string;
  published_at: string;
  created_at: string;
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

export default function VersionHistoryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [versions,  setVersions]  = useState<Version[]>([]);
  const [selected,  setSelected]  = useState<Version | null>(null);
  const [latest,    setLatest]    = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetch(`/api/library/versions/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        const vers: Version[] = d.versions || [];
        setVersions(vers);
        setLatest(d.latest ?? vers.length);
        // Default: show the latest version
        if (vers.length > 0) setSelected(vers[vers.length - 1]);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load version history."); setLoading(false); });
  }, [params.id]);

  function handleRestore(version: Version) {
    if (!window.confirm(
      `Load v${version.version_number} into the edit page? ` +
      `No changes will be saved until you click Republish.`
    )) return;

    // Store the version data in sessionStorage so the edit page can pre-fill from it.
    // No API call here — restoring only loads data, never creates a new version.
    try {
      sessionStorage.setItem(
        `kb-hub-restore-${params.id}`,
        JSON.stringify({
          title:             version.title,
          engineerName:      version.engineer_name,
          engineerEmail:     version.engineer_email,
          audience:          version.audience,
          issueType:         version.issue_type,
          primaryEntityType: version.entity_type,
          category:          version.category,
          productVersion:    version.product_version,
          symptoms:          version.symptoms,
          cause:             version.cause,
          resolutionSteps:   version.resolution,
          keywords:          version.keywords,
          markdown:          version.markdown_content,
          restoredFrom:      version.version_number,
        })
      );
    } catch {}

    router.push(`/library/${params.id}/edit`);
  }

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
            <Link href={`/library/${params.id}`}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:border-white/50 hover:text-white">
              ← Back to Article
            </Link>
            <Link href="/library"
              className="rounded-sm border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:border-white/50 hover:text-white">
              KB Library
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-[#1E1A2E]">Version History</h1>
          <p className="mt-1 font-mono text-sm text-[#1E1A2E]/50">
            {params.id} · {versions.length} version{versions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {loading && <p className="text-sm text-[#1E1A2E]/50">Loading versions...</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && versions.length === 0 && (
          <p className="text-sm text-[#1E1A2E]/50">No version history found for this article.</p>
        )}

        {!loading && !error && versions.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr]">

            {/* Left — version list */}
            <aside className="space-y-2">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50 mb-3">
                All Versions
              </h2>
              {[...versions].reverse().map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`cursor-pointer rounded-sm border p-3 transition ${
                    selected?.id === v.id
                      ? "border-[#7B3F87] bg-[#7B3F87]/5"
                      : "border-[#E3DFEE] bg-white hover:border-[#7B3F87]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                      v.version_number === latest
                        ? "bg-[#7B3F87] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      v{v.version_number}
                      {v.version_number === latest ? " · latest" : ""}
                    </span>
                    {v.version_number !== latest && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestore(v); }}
                        disabled={restoring}
                        className="text-[10px] font-mono text-[#7B3F87] underline underline-offset-2 hover:text-[#4B2170] disabled:opacity-40"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-[#1E1A2E]/80 truncate">{v.title}</p>
                  <p className="mt-0.5 text-[10px] text-[#1E1A2E]/50">{v.changed_by}</p>
                  <p className="mt-0.5 text-[10px] text-[#1E1A2E]/40">{fmt(v.published_at)}</p>
                  <p className="mt-1 text-[10px] text-[#1E1A2E]/40 italic">{v.change_note}</p>
                </div>
              ))}
            </aside>

            {/* Right — selected version content */}
            {selected && (
              <div className="space-y-4">
                {/* Version info bar */}
                <div className="flex items-center justify-between rounded-sm border border-[#E3DFEE] bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] ${
                      selected.version_number === latest
                        ? "bg-[#7B3F87] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      v{selected.version_number}
                    </span>
                    <span className="text-sm font-medium text-[#1E1A2E]">{selected.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#1E1A2E]/50">
                    <span>By {selected.changed_by}</span>
                    <span>·</span>
                    <span>{fmt(selected.published_at)}</span>
                    {selected.version_number !== latest && (
                      <button
                        onClick={() => handleRestore(selected)}
                        disabled={restoring}
                        className="rounded-sm border border-[#7B3F87]/40 px-3 py-1 text-[11px] text-[#4B2170] hover:bg-[#7B3F87]/5 disabled:opacity-40"
                      >
                        {restoring ? "Restoring…" : "Restore this version"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Article content */}
                <div className="rounded-sm border border-[#E3DFEE] bg-white p-8">
                  <article className="prose prose-sm max-w-none
                    prose-headings:font-bold prose-h1:text-xl prose-h1:text-[#1E1A2E]
                    prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest
                    prose-h2:text-[#4B2170] prose-h2:mt-6 prose-ol:pl-4 prose-ul:pl-4">
                    <ReactMarkdown>{selected.markdown_content}</ReactMarkdown>
                  </article>
                </div>
              </div>
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
