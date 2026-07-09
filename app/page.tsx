"use client";

import { useEffect, useRef, useState } from "react";
import KBForm from "@/components/KBForm";
import KBPreview from "@/components/KBPreview";
import {
  COMPANY,
  COPYRIGHT,
  FOOTER_LINKS,
  LOGO_SVG_INNER,
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
};

const DRAFT_STORAGE_KEY = "kb-creator-draft-v1";

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
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `KB-${year}-${seq}`;
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
    setTicket(makeTicketNumber());
  }, []);

  // Restore a saved draft once, on first load, if one exists and isn't empty.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as KBFormFields;
        if (parsed && typeof parsed.title === "string" && hasAnyContent(parsed)) {
          setFields({ ...EMPTY_FIELDS, ...parsed });
          setRestoredDraft(true);
        }
      }
    } catch {
      // Corrupted or inaccessible storage — just start with a blank form.
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  // Autosave the draft (text fields only) as they change.
  useEffect(() => {
    if (!draftHydrated) return;
    try {
      if (hasAnyContent(fields)) {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(fields));
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
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      setMarkdown(data.markdown);
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
    setTicket(makeTicketNumber());
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen">
      <header className="bg-black px-6 py-4 text-white md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={newArticle}
            className="flex items-center gap-3"
            title="Start a new article"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: LOGO_SVG_INNER }}
            />
            <span className="flex items-baseline gap-2">
              <span className="font-display text-lg font-bold tracking-tight">{COMPANY}</span>
              <span className="h-4 w-px bg-white/25" aria-hidden="true" />
              <span className="font-display text-lg font-semibold tracking-tight text-[#B78BE0]">
                {PRODUCT}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-4">
            <span className="hidden font-display text-sm font-semibold uppercase tracking-widest text-white/70 sm:inline">
              {PROJECT_TITLE}
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-white/40">
              {ticket}
            </span>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#EAE4F7] via-[#F1DCEE] to-[#F8D9E3] px-6 py-16 md:px-10 md:py-24">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/50 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-32 bottom-[-4rem] h-56 w-56 rounded-full bg-pink-200/50 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-0 h-40 w-96 rounded-full bg-white/40 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl">
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[1.1] tracking-tight text-[#2D1B4E] md:text-6xl">
            The fastest way to write
            <br />
            backup &amp; restore KB articles
          </h1>
          <p className="mt-5 max-w-xl text-sm text-[#2D1B4E]/70 md:text-base">
            Turn ticket details into a polished, consistently-structured knowledge base
            article in minutes — built for backup, restore, and cloud infrastructure issues.
          </p>
        </div>
      </section>

      {restoredDraft && (
        <div className="mx-auto mt-6 flex max-w-6xl items-center justify-between rounded-sm border border-primary/30 bg-primary/5 px-6 py-2 text-sm text-primary-dark md:px-10">
          <span>Restored your unsaved draft from last time.</span>
          <button
            onClick={() => setRestoredDraft(false)}
            className="text-xs underline underline-offset-2 hover:text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      <div ref={formRef} className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-2 md:px-10">
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
        />
        <KBPreview
          markdown={markdown}
          images={images}
          loading={loading}
          ticket={ticket}
          onMarkdownChange={setMarkdown}
          onRegenerate={handleRefreshRegenerate}
          onNewArticle={newArticle}
        />
      </div>

      <footer className="mt-16 bg-black px-6 py-10 text-white/60 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: LOGO_SVG_INNER }}
            />
            <span className="font-display text-lg font-bold tracking-tight text-white">
              {COMPANY}
            </span>
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
