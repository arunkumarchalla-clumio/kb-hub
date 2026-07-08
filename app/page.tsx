"use client";

import { useEffect, useState } from "react";
import KBForm from "@/components/KBForm";
import KBPreview from "@/components/KBPreview";
import type { KBFormFields } from "@/lib/types";

const EMPTY_FIELDS: KBFormFields = {
  title: "",
  issueType: "",
  primaryEntityType: "",
  category: "",
  productVersion: "",
  audience: "Internal",
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
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

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
          setFields(parsed);
          setRestoredDraft(true);
        }
      }
    } catch {
      // Corrupted or inaccessible storage — just start with a blank form.
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  // Autosave the draft as fields change, once initial restore has happened
  // (so we don't immediately overwrite a saved draft with the blank initial
  // state before it's had a chance to load).
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
        body: JSON.stringify({ fields }),
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

  return (
    <main className="min-h-screen">
      <header className="bg-charcoal px-6 py-4 text-white md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 1.5 22 7v10l-10 5.5L2 17V7l10-5.5Z"
                stroke="#B78BE0"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M12 1.5v21M2 7l10 5.5L22 7M2 17l10-5.5L22 17" stroke="#B78BE0" strokeWidth="1.2" />
            </svg>
            <span className="font-display text-lg font-bold tracking-tight">KB-Creator</span>
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-white/50">
            Ticket {ticket}
          </span>
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

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-2 md:px-10">
        <KBForm
          fields={fields}
          onChange={setFields}
          onSubmit={handleGenerate}
          loading={loading}
          error={error}
        />
        <KBPreview
          markdown={markdown}
          loading={loading}
          ticket={ticket}
          onMarkdownChange={setMarkdown}
        />
      </div>

      <footer className="mt-16 bg-charcoal px-6 py-6 text-xs text-white/50 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>© {new Date().getFullYear()} KB-Creator</span>
          <span>Knowledge Base Article Generator</span>
        </div>
      </footer>
    </main>
  );
}
