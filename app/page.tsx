"use client";

import { useEffect, useRef, useState } from "react";
import KBForm from "@/components/KBForm";
import KBPreview from "@/components/KBPreview";
import {
  COMPANY,
  COPYRIGHT,
  FOOTER_LINKS,
  PRODUCT,
  PROJECT_TITLE,
  SOCIAL_LINKS,
} from "@/lib/brand";
import type { KBFormFields, KBImage } from "@/lib/types";

const EMPTY_FIELDS: KBFormFields = {
  title: "",
  issueType: "",
  primaryEntityType: "",
  category: "",
  productVersion: "",
  audience: "Internal",
  useAwsDocs: true,
  symptoms: "",
  cause: "",
  resolutionSteps: "",
  keywords: "",
  tone: "technical",
  engineerName: "",
  engineerEmail: "",
  referenceLinks: [],
  diagramImage: [],
};

const DRAFT_STORAGE_KEY = "kb-creator-draft-v2"; // bumped: diagramImage excluded from save

// Fields that are safe to persist — excludes diagramImage (base64 images
// would blow the ~5MB localStorage quota). Images/diagrams are session-only.
type DraftFields = Omit<KBFormFields, "diagramImage">;

function hasAnyContent(fields: KBFormFields): boolean {
  return Boolean(
    fields.title.trim() ||
      fields.issueType.trim() ||
      fields.primaryEntityType.trim() ||
      fields.category.trim() ||
      fields.productVersion.trim() ||
      fields.symptoms.trim() ||
      fields.cause.trim() ||
      fields.resolutionSteps.trim() ||
      fields.keywords.trim()
  );
}

function makeTicketNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const nn = String(Math.floor(Math.random() * 9000 + 1000));
  return `KB-${yy}${mm}${dd}-${nn}`;
}

async function makeUniqueTicketNumber(): Promise<string> {
  let attempts = 0;
  while (attempts < 20) {
    const candidate = makeTicketNumber();
    try {
      const res = await fetch(`/api/library/check-ticket?id=${candidate}`);
      const data = await res.json();
      if (!data.exists) return candidate;
    } catch {
      // If check fails, use the candidate anyway — better than blocking
      return candidate;
    }
    attempts++;
  }
  // Fallback: append timestamp to guarantee uniqueness
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `KB-${yy}${mm}${dd}-${Date.now().toString().slice(-4)}`;
}

export default function Home() {
  const [ticket, setTicket] = useState("KB-----");
  const [fields, setFields] = useState<KBFormFields>(EMPTY_FIELDS);
  // Images are kept OUT of the autosaved draft on purpose — base64 screenshots
  // would quickly blow past localStorage's ~5MB quota. They live only for the
  // current session and are cleared on New Article.
  const [images, setImages] = useState<KBImage[]>([]);
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  // Controlled from here so KBPreview's refresh icon can jump the form to step 1.
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  makeUniqueTicketNumber().then(setTicket);
}, []);

  // Restore a saved draft once, on first load, if one exists and isn't empty.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DraftFields;
        if (parsed && typeof parsed.title === "string" && hasAnyContent({ ...EMPTY_FIELDS, ...parsed })) {
          // diagramImage is not persisted — restore everything else.
          setFields({ ...EMPTY_FIELDS, ...parsed, diagramImage: [] });
          setRestoredDraft(true);
        }
      }
    } catch {
      // Corrupted or inaccessible storage — just start with a blank form.
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  // Detect ?new=1 — clear all state and storage for a fresh article.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      try {
        sessionStorage.removeItem("kb-hub-draft-ticket");
        sessionStorage.removeItem("kb-hub-draft-markdown");
        localStorage.removeItem("kb-creator-draft-v2");
      } catch {}
      setFields(EMPTY_FIELDS);
      setImages([]);
      setMarkdown("");
      setError("");
      setRestoredDraft(false);
      setStep(0);
      makeUniqueTicketNumber().then(setTicket);
      // Clean the URL without reloading
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Restore generated article from sessionStorage when navigating back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") return; // skip restore if starting fresh
    try {
      const savedTicket   = sessionStorage.getItem("kb-hub-draft-ticket");
      const savedMarkdown = sessionStorage.getItem("kb-hub-draft-markdown");
      if (savedTicket && savedMarkdown) {
        setTicket(savedTicket);
        setMarkdown(savedMarkdown);
      }
    } catch { /* sessionStorage unavailable */ }
  }, []);

  // Autosave all text fields on every change. diagramImage is excluded —
  // base64 image data would quickly exhaust localStorage's ~5MB quota.
  // Diagram files are session-only and must be re-attached after a restart.
  useEffect(() => {
    if (!draftHydrated) return;
    try {
      const draftFields: DraftFields = (({ diagramImage: _, ...rest }) => rest)(fields);
      if (hasAnyContent(fields)) {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftFields));
      } else {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable (private browsing, quota) — fail silently.
    }
  }, [fields, draftHydrated]);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMarkdown(data.markdown);
      // Keep the generated article in session memory so navigating
      // away and back (e.g. Go to Library → back) doesn't lose it.
      try {
        sessionStorage.setItem("kb-hub-draft-ticket", ticket);
        sessionStorage.setItem("kb-hub-draft-markdown", data.markdown);
      } catch { /* sessionStorage unavailable — fail silently */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Called by the refresh icon in KBPreview: takes the user back to Step 1 so
  // they can review/change any field before the article regenerates on Step 4.
  function handleRefreshRegenerate() {
    setStep(0);
    setError("");
    // Small timeout so the step state settles before scrolling.
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function clearForm() {
    if (hasAnyContent(fields) && !window.confirm("Clear all fields? This can't be undone.")) {
      return;
    }
    setFields(EMPTY_FIELDS);
    setImages([]);
    setStep(0);
  }

  async function handleSave() {
    try {
      const res = await fetch("/api/library/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket, fields, markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      // Redirect to article detail page after publishing
      setTimeout(() => {
        window.location.href = `/library/${ticket}?published=1`;
      }, 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save article.");
    }
  }

  function newArticle() {
    if (
      (hasAnyContent(fields) || markdown) &&
      !window.confirm("Start a new article? This clears the current form and generated article.")
    ) {
      return;
    }
    setFields(EMPTY_FIELDS);
    setImages([]);
    setMarkdown("");
    setError("");
    setRestoredDraft(false);
    setStep(0);
    makeUniqueTicketNumber().then(setTicket);
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      sessionStorage.removeItem("kb-hub-draft-ticket");
      sessionStorage.removeItem("kb-hub-draft-markdown");
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen">
      <header className="bg-black px-6 py-4 text-white md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={newArticle}
            className="flex items-center gap-3"
            title="Start a new article"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/commvault-wordmark-white.svg" alt={COMPANY} className="h-6 w-auto" />
          </button>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-base font-semibold tracking-tight text-white">
              Clumio
            </span>
            <span className="font-display text-base font-semibold tracking-tight text-[#B78BE0]">
              KB Atlas
            </span>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#EAE4F7] via-[#F1DCEE] to-[#F8D9E3] px-6 py-6 md:px-10 md:py-8">
        <div className="relative mx-auto max-w-7xl">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#2D1B4E] md:text-3xl">
            Generate Backup &amp; Restore KB Articles in Minutes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#2D1B4E]/70">
            Fill in what you know about the issue — Claude writes a polished, consistent article ready to publish.
          </p>
          <div className="mt-4">
            
            <a
              href="/library"
              className="inline-flex items-center gap-2 rounded-sm border border-[#2D1B4E]/20 bg-white/60 px-3 py-1.5 text-sm font-semibold text-[#2D1B4E] backdrop-blur-sm hover:bg-white/80 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              KB Library
            </a>
          </div>
        </div>
      </section>

      {restoredDraft && (
        <div className="mx-auto mt-6 flex max-w-7xl items-center justify-between rounded-sm border border-primary/30 bg-primary/5 px-6 py-2 text-sm text-primary-dark md:px-10">
          <span>Restored your unsaved draft from last time.</span>
          <button
            onClick={() => setRestoredDraft(false)}
            className="text-xs underline underline-offset-2 hover:text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      <div ref={formRef} className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-[2fr_3fr] md:px-8">
        <KBForm
          fields={fields}
          onChange={setFields}
          images={images}
          onImagesChange={setImages}
          onSubmit={handleGenerate}
          onClear={clearForm}
          loading={loading}
          error={error}
          step={step}
          onStepChange={setStep}
          ticket={ticket}
        />
        <KBPreview
          markdown={markdown}
          images={images}
          loading={loading}
          ticket={ticket}
          audience={fields.audience}
          onMarkdownChange={setMarkdown}
          onRegenerate={handleRefreshRegenerate}
          onNewArticle={newArticle}
          onSave={handleSave}
        />
      </div>

      <footer className="mt-16 bg-black px-6 py-10 text-white/60 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/commvault-wordmark-white.svg" alt={COMPANY} className="h-6 w-auto" />
          </div>

          <div className="my-6 h-px w-full bg-white/15" />

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <span>{COPYRIGHT}</span>
              {FOOTER_LINKS.map((label) => (
                <span key={label} className="text-white/60">
                  {label}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-5">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="text-white/70 transition hover:text-white"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    dangerouslySetInnerHTML={{ __html: social.svg }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
