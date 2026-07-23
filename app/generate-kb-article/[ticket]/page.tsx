"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface Article {
  id: string;
  title: string;
  engineer_name: string;
  engineer_email: string;
  audience: string;
  issue_type: string;
  entity_type: string;
  category: string;
  product_version: string;
  status: string;
  symptoms: string;
  cause: string;
  resolution: string;
  keywords: string;
  markdown_content: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
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

function allowDataUris(url: string) {
  if (url.startsWith("data:image/")) return url;
  const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;
  const colon = url.indexOf(":");
  const slash = url.indexOf("/");
  const q = url.indexOf("?");
  const hash = url.indexOf("#");
  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (q !== -1 && colon > q) ||
    (hash !== -1 && colon > hash) ||
    safeProtocol.test(url.slice(0, colon))
  ) return url;
  return "";
}

export default function GeneratedArticlePage({
  params,
}: {
  params: { ticket: string };
}) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [copied,  setCopied]  = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  useEffect(() => {
    fetch(`/api/library/article/${params.ticket}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setArticle(d.article);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load article."); setLoading(false); });
  }, [params.ticket]);

  function copy() {
    if (!article) return;
    navigator.clipboard.writeText(article.markdown_content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function exportDocx() {
    if (!article) return;
    setExportingDocx(true);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: article.markdown_content,
          images: [],
          filename: article.id,
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${article.id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate Word document. Please try again.");
    } finally {
      setExportingDocx(false);
    }
  }

  function exportPdf() {
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) { alert("Please allow pop-ups to export as PDF."); return; }
    const bodyHtml = document.getElementById("generated-article-content")?.innerHTML || "";
    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>${article?.id}</title>
    <style>
      @page { size: A4; margin: 0; }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Georgia, serif; font-size: 13px; color: #1E1A2E;
             line-height: 1.7; background: #fff; padding: 72px 0; }
      .kb-header { position: fixed; top: 0; left: 0; right: 0; height: 52px;
        background: #000; color: #fff; display: flex; align-items: center;
        justify-content: space-between; padding: 0 36px;
        -webkit-print-color-adjust: exact; print-color-adjust: exact; z-index: 1000; }
      .kb-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 52px;
        background: #000; color: #999; display: flex; align-items: center;
        justify-content: space-between; padding: 0 36px; font-family: system-ui;
        font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .kb-content { max-width: 680px; margin: 0 auto; padding: 20px 32px 40px; }
      h1 { font-size: 24px; font-weight: 800; margin-bottom: 16px; }
      h2 { font-size: 10px; font-weight: 700; text-transform: uppercase;
           letter-spacing: 0.1em; color: #4B2170; margin-top: 28px; margin-bottom: 8px;
           border-bottom: 1px solid #E3DFEE; padding-bottom: 5px; }
      p { margin-bottom: 10px; }
      ul, ol { padding-left: 22px; margin-bottom: 10px; }
      code { font-family: monospace; background: #f4f2f9; padding: 1px 5px; border-radius: 3px; }
      img { max-width: 100%; height: auto; border: 1px solid #E3DFEE; border-radius: 3px; margin: 10px 0; }
    </style>
  </head>
  <body>
    <div class="kb-header">
      <span style="font-weight:700;font-size:16px;">Commvault <span style="color:#B78BE0">| Clumio</span></span>
      <span style="font-family:monospace;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.1em">${article?.id}</span>
    </div>
    <div class="kb-content">${bodyHtml}</div>
    <div class="kb-footer">
      <span>© ${new Date().getFullYear()} Commvault · Clumio Atlas</span>
      <span>Internal use only</span>
    </div>
  </body>
</html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.focus(); setTimeout(() => printWindow.print(), 300); };
  }

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
        {/* Nav buttons */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/library"
            className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-1.5 text-sm text-[#1E1A2E]/70 hover:border-[#7B3F87]/40 hover:text-[#1E1A2E]">
            KB Library
          </Link>
          <Link href="/"
            className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-1.5 text-sm text-[#1E1A2E]/70 hover:border-[#7B3F87]/40 hover:text-[#1E1A2E]">
            ← New Article
          </Link>
        </div>
        {loading && <p className="text-sm text-[#1E1A2E]/50">Loading article...</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}

        {article && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="rounded-sm border border-[#E3DFEE] bg-white p-4">
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50 mb-3">
                  Article Info
                </h2>
                {[
                  ["ID",          article.id],
                  ["Status",      article.status],
                  ["Audience",    article.audience],
                  ["Issue Type",  article.issue_type  || "—"],
                  ["Entity Type", article.entity_type || "—"],
                  ["Category",    article.category    || "—"],
                  ["Version",     article.product_version || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-[#E3DFEE] py-2 last:border-0">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-[#1E1A2E]/40">{label}</div>
                    <div className="mt-0.5 text-sm text-[#1E1A2E]/80">{value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-sm border border-[#E3DFEE] bg-white p-4">
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50 mb-3">Engineer</h2>
                <p className="text-sm font-medium text-[#1E1A2E]">{article.engineer_name || "—"}</p>
                <p className="text-xs text-[#1E1A2E]/50">{article.engineer_email || ""}</p>
              </div>

              <div className="rounded-sm border border-[#E3DFEE] bg-white p-4">
                <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/50 mb-3">Dates</h2>
                {[
                  ["Created",   article.created_at],
                  ["Updated",   article.updated_at],
                  ["Published", article.published_at],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-[#E3DFEE] py-2 last:border-0">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-[#1E1A2E]/40">{label}</div>
                    <div className="mt-0.5 text-xs text-[#1E1A2E]/60">{fmt(value ?? null)}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button onClick={copy}
                  className={`w-full rounded-sm border px-3 py-2 text-sm transition ${
                    copied
                      ? "border-[#7B3F87] bg-[#7B3F87]/10 text-[#4B2170]"
                      : "border-[#E3DFEE] bg-white text-[#1E1A2E]/70 hover:bg-[#F7F6FB]"
                  }`}>
                  {copied ? "Copied!" : "Copy MD"}
                </button>
                <button onClick={exportDocx} disabled={exportingDocx}
                  className="w-full rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-sm text-[#1E1A2E]/70 hover:bg-[#F7F6FB] disabled:opacity-50">
                  {exportingDocx ? "Preparing…" : "Export Word (.docx)"}
                </button>
                <button onClick={exportPdf}
                  className="w-full rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-sm text-[#1E1A2E]/70 hover:bg-[#F7F6FB]">
                  Export PDF
                </button>
                <Link href="/"
                  className="block w-full rounded-sm border border-[#E3DFEE] bg-white px-3 py-2 text-center text-sm text-[#1E1A2E]/70 hover:bg-[#F7F6FB]">
                  + New Article
                </Link>
              </div>
            </aside>

            {/* Article content */}
            <div className="rounded-sm border border-[#E3DFEE] bg-white p-8">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#1E1A2E]/40">
                  Generated Article
                </span>
                <span className="rounded-full border border-[#7B3F87]/40 bg-[#7B3F87]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#4B2170]">
                  {article.status}
                </span>
              </div>
              <article
                id="generated-article-content"
                className="prose prose-sm max-w-none
                  prose-headings:font-bold
                  prose-h1:text-xl prose-h1:text-[#1E1A2E]
                  prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest
                  prose-h2:text-[#4B2170] prose-h2:mt-6
                  prose-ol:pl-4 prose-ul:pl-4"
              >
                <ReactMarkdown urlTransform={allowDataUris}>
                  {article.markdown_content}
                </ReactMarkdown>
              </article>
            </div>

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
