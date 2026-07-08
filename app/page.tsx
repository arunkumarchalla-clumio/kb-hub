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
      <header className="border-b border-line px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between">
          <h1 className="font-display text-2xl font-700 tracking-tight">
            KB-Creator
          </h1>
          <span className="font-mono text-xs uppercase tracking-widest text-ink/50">
            Ticket {ticket}
          </span>
        </div>
      </header>

      {restoredDraft && (
        <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-sm border border-forest/30 bg-forest/5 px-6 py-2 text-sm text-forest-dark md:px-10">
          <span>Restored your unsaved draft from last time.</span>
          <button
            onClick={() => setRestoredDraft(false)}
            className="text-xs underline underline-offset-2 hover:text-forest"
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
    </main>
  );
}
