"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  markdown: string;
  tldr: string;
  loading: boolean;
  ticket: string;
}

export default function KBPreview({ markdown, tldr, loading, ticket }: Props) {
  const status = loading ? "GENERATING" : markdown ? "GENERATED" : "DRAFT";
  const statusClass = loading
    ? "bg-amber-light text-amber-900 border-amber/50"
    : markdown
    ? "bg-forest/10 text-forest-dark border-forest/40"
    : "bg-ink/5 text-ink/50 border-line";

  // Include the TL;DR as a quoted line above the article in exported/copied
  // content too, so it isn't lost outside the portal's UI.
  function exportableContent() {
    if (tldr) {
      return `> **TL;DR:** ${tldr}\n\n${markdown}`;
    }
    return markdown;
  }

  function download() {
    const blob = new Blob([exportableContent()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticket}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copy() {
    navigator.clipboard.writeText(exportableContent());
  }

  return (
    <section className="rounded-sm border border-line bg-white/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-700">Article Preview</h2>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${statusClass}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-1 font-mono text-[11px] text-ink/40">{ticket}</div>

      {tldr && (
        <div className="mt-4 flex items-start gap-2 rounded-sm border border-amber/40 bg-amber-light/50 px-3 py-2">
          <span className="mt-0.5 shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-900">
            TL;DR
          </span>
          <p className="text-sm text-ink/85">{tldr}</p>
        </div>
      )}

      <div className="mt-4 min-h-[280px] rounded-sm border border-dashed border-line bg-white p-5">
        {markdown ? (
          <article className="prose prose-sm max-w-none prose-headings:font-display prose-headings:font-700 prose-h1:text-xl prose-h2:mt-5 prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-forest-dark prose-ol:pl-4">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </article>
        ) : (
          <p className="text-sm text-ink/35">
            Your generated article will appear here once you submit the form.
          </p>
        )}
      </div>

      {markdown && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={copy}
            className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            Copy Markdown
          </button>
          <button
            onClick={download}
            className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            Download .md
          </button>
        </div>
      )}
    </section>
  );
}
