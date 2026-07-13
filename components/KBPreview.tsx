"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  COMPANY,
  COPYRIGHT,
  FOOTER_LINKS,
  LOGO_SVG_INNER,
  LOGO_SVG_INNER_WHITE,
  PRODUCT,
  PROJECT_TITLE,
  SOCIAL_LINKS,
} from "@/lib/brand";
import { expandImageTokens, referencedImageIds } from "@/lib/imageTokens";
import type { Audience, KBImage } from "@/lib/types";

interface Props {
  markdown: string;
  images: KBImage[];
  loading: boolean;
  ticket: string;
  audience: Audience;
  onMarkdownChange: (markdown: string) => void;
  onRegenerate: () => void;
  onNewArticle: () => void;
  onSave: () => Promise<void>;
}

export default function KBPreview({
  markdown,
  images,
  loading,
  ticket,
  audience,
  onMarkdownChange,
  onRegenerate,
  onNewArticle,
  onSave,
}: Props) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [exportingDocx, setExportingDocx] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  // null = lightbox closed; string = the src of the image currently zoomed.
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (loading) setMode("preview");
  }, [loading]);

  // Close the lightbox on Escape key.
  useEffect(() => {
    if (!zoomed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZoomed(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  // Prevent body scroll while the lightbox is open.
  useEffect(() => {
    document.body.style.overflow = zoomed ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [zoomed]);

  const status = loading ? "GENERATING" : markdown ? "GENERATED" : "DRAFT";
  const statusClass = loading
    ? "bg-amber-light text-amber-900 border-amber/50"
    : markdown
    ? "bg-primary/10 text-primary-dark border-primary/40"
    : "bg-ink/5 text-ink/50 border-line";

  // react-markdown v9's defaultUrlTransform only allows https/http/mailto/xmpp,
  // which silently strips data: URIs — turning every inline screenshot into a
  // broken image icon. This override passes data: through while still blocking
  // dangerous schemes like javascript:.
  function allowDataUris(url: string) {
    if (url.startsWith("data:image/")) return url;
    // Replicate the default safe-protocol check for everything else.
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
    ) {
      return url;
    }
    return "";
  }

  // The content shown/exported has [[img:xx]] tokens replaced with real
  // inline images. Edit mode keeps the tokens so the textarea stays readable.
  const expanded = expandImageTokens(markdown, images);

  // Screenshots attached but not yet placed anywhere in the article.
  const placed = referencedImageIds(markdown);
  const unplaced = images.filter((img) => !placed.has(img.id));

  // ── References section parsing ──────────────────────────────────────────
  // Claude marks internal links with a "[INTERNAL]" prefix. We strip that
  // section out of the rendered markdown and replace it with a custom block
  // so we can apply audience-visibility rules:
  //   Public  → external links only
  //   Internal / Engineering → both, with internal links visually separated
  interface ParsedRef {
    label: string;
    url: string;
    isInternal: boolean;
    raw: string; // original markdown line, for fallback
  }

  function parseReferencesFromMarkdown(md: string): {
    bodyWithoutRefs: string;
    refs: ParsedRef[];
    hasRefsSection: boolean;
  } {
    // Split on the ## References heading (case-insensitive, optional trailing space)
    const refHeadingRx = /^##\s+References\s*$/im;
    const match = md.match(refHeadingRx);
    if (!match || match.index === undefined) {
      return { bodyWithoutRefs: md, refs: [], hasRefsSection: false };
    }

    const beforeRefs = md.slice(0, match.index).trimEnd();
    const afterHeading = md.slice(match.index + match[0].length);

    // The refs section ends at the next ## heading or end-of-string.
    const nextHeadingRx = /^##\s+/m;
    const nextMatch = afterHeading.match(nextHeadingRx);
    const refBlock = nextMatch?.index !== undefined
      ? afterHeading.slice(0, nextMatch.index)
      : afterHeading;
    const rest = nextMatch?.index !== undefined
      ? afterHeading.slice(nextMatch.index)
      : "";

    const bodyWithoutRefs = (beforeRefs + "\n\n" + rest).trim();

    const refs: ParsedRef[] = [];
    for (const line of refBlock.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "-" || /^no references/i.test(trimmed) || /^no external/i.test(trimmed)) continue;

      const isInternal = /^\[INTERNAL\]/i.test(trimmed) || /^-\s+\[INTERNAL\]/i.test(trimmed);
      // Strip leading "- " and "[INTERNAL]" / "[EXTERNAL]" tag
      const stripped = trimmed.replace(/^-\s*/, "").replace(/^\[(INTERNAL|EXTERNAL)\]\s*/i, "").trim();

      // Parse Markdown link: [label](url)
      const mdLink = stripped.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (mdLink) {
        refs.push({ label: mdLink[1], url: mdLink[2], isInternal, raw: line });
      } else if (stripped.startsWith("http")) {
        refs.push({ label: stripped, url: stripped, isInternal, raw: line });
      }
      // Lines that don't look like links are quietly skipped
    }

    return { bodyWithoutRefs, refs, hasRefsSection: true };
  }

  const { bodyWithoutRefs, refs, hasRefsSection } = parseReferencesFromMarkdown(expanded);

  // What the current audience can see:
  const externalRefs = refs.filter((r) => !r.isInternal);
  const internalRefs = refs.filter((r) => r.isInternal);
  const canSeeInternal = audience === "Internal" || audience === "Engineering";

  function copy() {
    navigator.clipboard
      .writeText(expanded)
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
        // Send token-form markdown + images so the server embeds real
        // Word images (ImageRun) rather than data-URI text.
        body: JSON.stringify({ markdown, images, filename: ticket }),
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
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      alert("Please allow pop-ups to export as PDF.");
      return;
    }
    const bodyHtml = document.getElementById("kb-article-content")?.innerHTML || "";

    // White-stroke logo SVG (for dark/black header/footer banners)
    const logoWhiteSvg = `<svg width="28" height="28" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">${LOGO_SVG_INNER_WHITE}</svg>`;

    const socialHtml = SOCIAL_LINKS.map(
      (s) =>
        `<a href="${s.url}" style="color:#aaa;text-decoration:none;font-size:11px;">${s.name}</a>`
    ).join(" &nbsp;·&nbsp; ");

    const footerLinksHtml = [COPYRIGHT, ...FOOTER_LINKS]
      .map((l) => `<span>${l}</span>`)
      .join(" &nbsp;·&nbsp; ");

    // The header and footer are rendered using CSS fixed positioning so they
    // appear on EVERY printed page. @page removes the browser's own header/footer
    // (URL, timestamp, page number). The body has matching top/bottom margins so
    // content never overlaps the fixed banners.
    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>${ticket}</title>
    <style>
      /* ── Reset browser print chrome ── */
      @page {
        size: A4;
        margin: 0;
      }

      /* ── Base ── */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 13px;
        color: #1E1A2E;
        line-height: 1.7;
        background: #fff;
        /* Leave room for fixed header (52px) and footer (52px) + gaps */
        padding: 72px 0 72px 0;
      }

      /* ── Fixed header — prints on every page ── */
      .kb-header {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 52px;
        background: #000;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 36px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        z-index: 1000;
      }
      .kb-header-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .kb-header-company {
        font-weight: 700;
        font-size: 16px;
        letter-spacing: -0.01em;
      }
      .kb-header-sep {
        width: 1px;
        height: 15px;
        background: rgba(255,255,255,0.3);
      }
      .kb-header-product {
        font-weight: 600;
        font-size: 16px;
        color: #B78BE0;
      }
      .kb-header-ticket {
        font-family: ui-monospace, 'SF Mono', Consolas, monospace;
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.5);
      }

      /* ── Fixed footer — prints on every page ── */
      .kb-footer {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: 52px;
        background: #000;
        color: #999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 36px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 10px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        z-index: 1000;
      }
      .kb-footer-links { color: #888; }
      .kb-footer-socials { color: #888; }
      .kb-footer-socials a { color: #aaa; text-decoration: none; }

      /* ── Article content ── */
      .kb-content {
        max-width: 680px;
        margin: 0 auto;
        padding: 20px 32px 40px;
      }
      h1 {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 24px;
        font-weight: 800;
        line-height: 1.25;
        margin-bottom: 16px;
        color: #1E1A2E;
      }
      h2 {
        font-family: ui-monospace, 'SF Mono', Consolas, monospace;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #4B2170;
        margin-top: 28px;
        margin-bottom: 8px;
        border-bottom: 1px solid #E3DFEE;
        padding-bottom: 5px;
      }
      p { margin-bottom: 10px; }
      ul, ol { padding-left: 22px; margin-bottom: 10px; }
      li { margin-bottom: 4px; }
      code {
        font-family: ui-monospace, 'SF Mono', Consolas, monospace;
        background: #f4f2f9;
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 12px;
      }
      pre {
        background: #f4f2f9;
        border-radius: 4px;
        padding: 12px;
        overflow-x: auto;
        margin-bottom: 12px;
      }
      pre code { background: none; padding: 0; }
      strong { font-weight: 700; }
      a { color: #4B2170; }
      img {
        max-width: 100%;
        height: auto;
        border: 1px solid #E3DFEE;
        border-radius: 3px;
        margin: 10px 0;
      }
    </style>
  </head>
  <body>

    <!-- Fixed header (on every page) -->
    <div class="kb-header">
      <div class="kb-header-brand">
        ${logoWhiteSvg}
        <span class="kb-header-company">${COMPANY}</span>
        <span class="kb-header-sep"></span>
        <span class="kb-header-product">${PRODUCT}</span>
      </div>
      <div class="kb-header-ticket">${ticket}</div>
    </div>

    <!-- Fixed footer (on every page) -->
    <div class="kb-footer">
      <div class="kb-footer-links">${footerLinksHtml}</div>
      <div class="kb-footer-socials">${socialHtml}</div>
    </div>

    <!-- Article body -->
    <div class="kb-content">${bodyHtml}</div>

  </body>
</html>`);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      // Short delay so fixed elements settle before the print dialog opens
      setTimeout(() => printWindow.print(), 300);
    };
  }

  // Custom renderer for <img> elements inside the article preview.
  // Adds a magnify cursor and click-to-zoom. The type signature matches what
  // ReactMarkdown passes to a components.img override.
  function ZoomableImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    const { src, alt, ...rest } = props;
    if (!src) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...rest}
        src={src}
        alt={alt ?? ""}
        title="Click to zoom"
        style={{ cursor: "zoom-in" }}
        onClick={() => setZoomed({ src, alt: alt ?? "" })}
      />
    );
  }

  return (
    <>
      {/* ── Lightbox overlay ─────────────────────────────────────────────── */}
      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image zoom"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setZoomed(null)}
        >
          {/* Stop click-inside from closing the overlay */}
          <div
            className="relative flex max-h-full max-w-full flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              aria-label="Close zoom"
              onClick={() => setZoomed(null)}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25"
            >
              ✕
            </button>

            {/* The zoomed image — constrained to viewport with scroll if taller */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomed.src}
              alt={zoomed.alt}
              className="max-h-[85vh] max-w-[90vw] rounded-sm object-contain shadow-2xl"
              style={{ cursor: "zoom-out" }}
              onClick={() => setZoomed(null)}
            />

            {/* Caption, if there is one */}
            {zoomed.alt && (
              <p className="text-center text-sm text-white/70">{zoomed.alt}</p>
            )}

            {/* Dismiss hint */}
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
              Click image or press Esc to close
            </p>
          </div>
        </div>
      )}

      {/* ── Main panel ───────────────────────────────────────────────────── */}
      <section className="rounded-sm border border-line bg-white/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Article Preview</h2>
        <div className="flex items-center gap-2">
          {/* Refresh / Regenerate icon — only shown when an article exists */}
          {markdown && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={loading}
              title="Go back to Step 1 to review your inputs and regenerate"
              aria-label="Regenerate article"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 text-primary-dark transition hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {/* Circular arrow / refresh icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? "animate-spin" : ""}
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${statusClass}`}
          >
            {status}
          </span>
        </div>
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

      {markdown && mode === "edit" && unplaced.length > 0 && (
        <p className="mt-2 rounded-sm border border-amber/40 bg-amber-light/40 px-3 py-2 text-[11px] text-ink/70">
          Attached but not placed yet: insert{" "}
          {unplaced.map((img, i) => (
            <span key={img.id}>
              <code className="rounded bg-ink/5 px-1">{img.token}</code>
              {i < unplaced.length - 1 ? ", " : ""}
            </span>
          ))}{" "}
          where you want{unplaced.length === 1 ? " it" : " them"} to appear.
        </p>
      )}

      <div className="mt-3 min-h-[1000px] rounded-sm border border-dashed border-line bg-white p-8 shadow-sm"
           style={{ minHeight: "calc(297mm * 0.85)" }}>
        {!markdown && (
          <p className="text-sm text-ink/35">
            Your generated article will appear here once you submit the form.
          </p>
        )}

        {markdown && mode === "preview" && (
          <article
            id="kb-article-content"
            className="prose prose-sm max-w-none prose-headings:font-display prose-headings:font-bold prose-h1:text-xl prose-h2:mt-5 prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-primary-dark prose-ol:pl-4 prose-img:rounded-sm prose-img:border prose-img:border-line"
          >
            <ReactMarkdown
              urlTransform={allowDataUris}
              components={{ img: ZoomableImage }}
            >
              {bodyWithoutRefs}
            </ReactMarkdown>

            {/* ── Custom References block ──────────────────────────────── */}
            {hasRefsSection && (externalRefs.length > 0 || (canSeeInternal && internalRefs.length > 0)) && (
              <div className="not-prose mt-6 border-t border-line pt-4">
                <h2 className="font-mono text-[11px] uppercase tracking-widest text-primary-dark">
                  References
                </h2>

                {/* External links — visible to all audiences */}
                {externalRefs.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {externalRefs.map((ref, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm">
                        <span className="mt-0.5 text-ink/30">↗</span>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-dark underline underline-offset-2 hover:text-primary"
                        >
                          {ref.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Internal links — only for Internal & Engineering */}
                {canSeeInternal && internalRefs.length > 0 && (
                  <div className="mt-3">
                    <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-amber-900">
                      <span className="rounded bg-amber-light px-1.5 py-0.5">Internal only</span>
                      <span className="text-ink/35">· not visible to Public audience</span>
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {internalRefs.map((ref, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm">
                          <span className="mt-0.5 text-amber-900/50">🔒</span>
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-900 underline underline-offset-2 hover:text-amber-800"
                          >
                            {ref.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </article>
        )}

        {markdown && mode === "edit" && (
          <textarea
            className="h-full min-h-[900px] w-full resize-y border-none bg-transparent font-mono text-xs text-ink/85 outline-none"
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>

      {markdown && (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={copy}
              className={`rounded-sm border px-3 py-1.5 text-sm transition ${
                copied
                  ? "border-primary bg-primary/10 text-primary-dark"
                  : "border-line hover:bg-ink/5"
              }`}
            >
              {copied ? "Copied!" : "Copy MD"}
            </button>


          </div>

          <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
            <button
              onClick={async () => {
                setSaving(true);
                setSaved(false);
                await onSave();
                setSaving(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
              }}
              disabled={saving}
              className={`rounded-sm border px-3 py-1.5 text-sm transition ${
                saved
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-primary/40 bg-primary/5 text-primary-dark hover:bg-primary/10"
              } disabled:opacity-50`}
            >
              {saving ? "Saving…" : saved ? "✓ Saved to Library" : "Save to Library"}
            </button>
            <button
              onClick={() => window.location.href = '/library'}
              className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-ink/5"
            >
              Go to Library
            </button>
            <button
              onClick={onNewArticle}
              className="rounded-sm border border-line px-3 py-1.5 text-sm hover:bg-ink/5"
            >
              + New Article
            </button>
          </div>
        </>
      )}
    </section>
    </>
  );
}
