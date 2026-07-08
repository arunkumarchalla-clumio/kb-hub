"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  markdown: string;
  loading: boolean;
  ticket: string;
  onMarkdownChange: (markdown: string) => void;
}

export default function KBPreview({
  markdown,
  loading,
  ticket,
  onMarkdownChange,
}: Props) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [exportingDocx, setExportingDocx] = useState(false);
  const [copied, setCopied] = useState(false);

  // Drop back to preview mode whenever a new generation starts, so editing
  // a previous draft doesn't linger once fresh content is on the way.
  useEffect(() => {
    if (loading) setMode("preview");
  }, [loading]);

  const status = loading ? "GENERATING" : markdown ? "GENERATED" : "DRAFT";
  const statusClass = loading
    ? "bg-amber-light text-amber-900 border-amber/50"
    : markdown
    ? "bg-primary/10 text-primary-dark border-primary/40"
    : "bg-ink/5 text-ink/50 border-line";

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticket}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copy() {
    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        alert("Couldn't copy to clipboard. Please try selecting and copying manually.");
      });
  }

  async function exportDocx() {
    setExportingDocx(true);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, filename: ticket }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ticket}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Couldn't generate the Word document. Please try again.");
    } finally {
      setExportingDocx(false);
    }
  }

  function exportPdf() {
    // No server-side PDF rendering — this opens a clean, print-styled window
    // and hands off to the browser's own "Save as PDF" in the print dialog.
    // That keeps the export dependency-free and reliably matches what's on
    // screen, rather than a second, separately-maintained PDF renderer.
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      alert("Please allow pop-ups to export as PDF.");
      return;
    }

    const bodyHtml = document.getElementById("kb-article-content")?.innerHTML || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>${ticket}</title>
          <style>
            body { font-family: Georgia, 'Times New Roman', serif; color: #1E1A2E; max-width: 720px; margin: 48px auto; line-height: 1.6; padding: 0 24px; }
            h1 { font-size: 26px; margin-bottom: 4px; }
            h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #4B2170; margin-top: 28px; border-bottom: 1px solid #E3DFEE; padding-bottom: 4px; }
            code { font-family: 'SFMono-Regular', Consolas, monospace; background: #f2f2f0; padding: 1px 4px; border-radius: 2px; font-size: 13px; }
            pre code { display: block; padding: 10px; overflow-x: auto; }
            ol, ul { padding-left: 22px; }
            @media print { body { margin: 0; padding: 24px; } }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return (
    <section className="rounded-sm border border-line bg-white/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Article Preview</h2>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${statusClass}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-1 font-mono text-[11px] text-ink/40">{ticket}</div>

      {markdown && (
        <div className="mt-4 flex gap-1 rounded-sm border border-line bg-white/70 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`flex-1 rounded-sm py-1 transition ${
              mode === "preview" ? "bg-ink text-paper" : "text-ink/60 hover:bg-ink/5"
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`flex-1 rounded-sm py-1 transition ${
              mode === "edit" ? "bg-ink text-paper" : "text-ink/60 hover:bg-ink/5"
            }`}
          >
            Edit
          </button>
        </div>
      )}

      <div className="mt-3 min-h-[280px] rounded-sm border border-dashed border-line bg-white p-5">
        {!markdown && (
          <p className="text-sm text-ink/35">
            Your generated article will appear here once you submit the form.
          </p>
        )}

        {markdown && mode === "preview" && (
          <article
            id="kb-article-content"
            className="prose prose-sm max-w-none prose-headings:font-display prose-headings:font-bold prose-h1:text-xl prose-h2:mt-5 prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-primary-dark prose-ol:pl-4"
          >
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </article>
        )}

        {markdown && mode === "edit" && (
          <textarea
            className="h-full min-h-[260px] w-full resize-y border-none bg-transparent font-mono text-xs text-ink/85 outline-none"
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>

      {markdown && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={copy}
            className={`rounded-sm border px-3 py-1.5 text-sm transition ${
              copied
                ? "border-primary bg-primary/10 text-primary-dark"
                : "border-line hover:bg-ink/5"
            }`}
          >
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
          <button
            onClick={download}
            className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            Download .md
          </button>
          <button
            onClick={exportDocx}
            disabled={exportingDocx}
            className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-ink/5 disabled:opacity-50"
          >
            {exportingDocx ? "Preparing…" : "Export Word (.docx)"}
          </button>
          <button
            onClick={exportPdf}
            className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            Export PDF
          </button>
        </div>
      )}
    </section>
  );
}
