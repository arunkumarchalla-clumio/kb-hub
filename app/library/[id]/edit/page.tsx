"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import KBForm from "@/components/KBForm";
import KBPreview from "@/components/KBPreview";
import type { KBFormFields, KBImage } from "@/lib/types";
import { AUDIENCE_TONE_MAP } from "@/lib/types";

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

export default function EditArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [fields,     setFields]     = useState<KBFormFields>(EMPTY_FIELDS);
  const [images,     setImages]     = useState<KBImage[]>([]);
  const [markdown,   setMarkdown]   = useState("");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [publishing,    setPublishing]    = useState(false);
  const [published,     setPublished]     = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [step,          setStep]          = useState(0);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [restoreNotice, setRestoreNotice] = useState("");
  const [articleStatus, setArticleStatus] = useState("published");
  const [discarding, setDiscarding] = useState(false);

  // Load the existing article and pre-fill all form fields
  useEffect(() => {
    fetch(`/api/library/article/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        const a = d.article;
        setCurrentVersion(a.current_version ?? 1);
        setArticleStatus(a.status || "published");
        setMarkdown(a.markdown_content);
        setFields({
          title:              a.title || "",
          issueType:          a.issue_type || "",
          primaryEntityType:  a.entity_type || "",
          category:           a.category || "",
          productVersion:     a.product_version || "",
          audience:           a.audience || "Internal",
          useAwsDocs:         a.use_aws_docs === 1,
          symptoms:           a.symptoms || "",
          cause:              a.cause || "",
          resolutionSteps:    a.resolution || "",
          keywords:           a.keywords || "",
          tone:               AUDIENCE_TONE_MAP[a.audience as keyof typeof AUDIENCE_TONE_MAP] || "technical",
          engineerName:       a.engineer_name || "",
          engineerEmail:      a.engineer_email || "",
          referenceLinks:     [],
          diagramImage:       [],
        });
        setLoading(false);

        // Check if a version restore was requested — overwrite fields with restored data
        try {
          const restoreKey = `kb-hub-restore-${d.article.id}`;
          const restoreData = sessionStorage.getItem(restoreKey);
          if (restoreData) {
            const r = JSON.parse(restoreData);
            setFields({
              title:             r.title || "",
              issueType:         r.issueType || "",
              primaryEntityType: r.primaryEntityType || "",
              category:          r.category || "",
              productVersion:    r.productVersion || "",
              audience:          r.audience || "Internal",
              useAwsDocs:        false,
              symptoms:          r.symptoms || "",
              cause:             r.cause || "",
              resolutionSteps:   r.resolutionSteps || "",
              keywords:          r.keywords || "",
              tone:              "technical",
              engineerName:      r.engineerName || "",
              engineerEmail:     r.engineerEmail || "",
              referenceLinks:    [],
              diagramImage:      [],
            });
            setMarkdown(r.markdown || "");
            // Show a banner indicating which version was restored
            setRestoreNotice(`Loaded v${r.restoredFrom} snapshot — make any changes then click Regenerate and Republish.`);
            // Clear the restore data so it doesn't persist on next visit
            sessionStorage.removeItem(restoreKey);
          }
        } catch {}
      })
      .catch(() => { setError("Failed to load article."); setLoading(false); });
  }, [params.id]);

  async function handleRegenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setMarkdown(data.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRepublish() {
    setPublishing(true);
    setError("");
    try {
      const res = await fetch(`/api/library/republish/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, markdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Republish failed.");
      setPublished(true);
      setTimeout(() => { window.location.href = `/library/${params.id}?published=1`; }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Republish failed.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    if (!window.confirm("Discard this draft permanently? This cannot be undone.")) return;
    setDiscarding(true);
    try {
      const res = await fetch(`/api/library/discard/${params.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discard failed.");
      router.push("/library");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to discard draft.");
      setDiscarding(false);
    }
  }

  // For drafts: publish for the first time — uses /save (not /republish),
  // since a draft was never through the version/revision flow.
  async function handlePublishDraft() {
    const res = await fetch("/api/library/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: params.id, fields, markdown, status: "published" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Publish failed.");
    setTimeout(() => { window.location.href = `/library/${params.id}?published=1`; }, 1500);
  }

  // For drafts: re-save as draft with updated content.
  async function handleSaveDraftAgain() {
    const res = await fetch("/api/library/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: params.id, fields, markdown, status: "draft" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed.");
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F7F6FB]">
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

      {/* Edit banner */}
      {!loading && !error && (
        <div className="border-b border-[#7B3F87]/20 bg-[#7B3F87]/5 px-6 py-3 md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#4B2170]">
                Editing
              </span>
              <span className="font-semibold text-[#1E1A2E]">{params.id}</span>
              <span className="rounded-full border border-[#7B3F87]/30 bg-white px-2 py-0.5 font-mono text-[10px] text-[#4B2170]">
                Currently v{currentVersion}
              </span>
            </div>
            <span className="rounded-full border border-[#7B3F87]/30 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#4B2170]">
              🔒 Ticket ID locked
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        {loading && <p className="text-sm text-[#1E1A2E]/50">Loading article...</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            {/* Info bar */}
            <div className="mb-6 rounded-sm border border-[#E3DFEE] bg-white px-4 py-3">
              <p className="text-sm text-[#1E1A2E]/60">
                Walk through the steps below, update any fields, regenerate the article, then click <strong>Republish as v{currentVersion + 1}</strong> in the preview panel.
              </p>
            </div>
            {/* Nav buttons */}
            <div className="mb-6 flex items-center gap-3">
              {articleStatus !== "draft" && (
                <Link href={`/library/${params.id}`}
                  className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-1.5 text-sm text-[#1E1A2E]/70 hover:border-[#7B3F87]/40 hover:text-[#1E1A2E]">
                  ← Back to Article
                </Link>
              )}
              <Link href="/library"
                className="rounded-sm border border-[#E3DFEE] bg-white px-3 py-1.5 text-sm text-[#1E1A2E]/70 hover:border-[#7B3F87]/40 hover:text-[#1E1A2E]">
                KB Library
              </Link>
              {articleStatus === "draft" && (
                <button
                  onClick={handleDiscard}
                  disabled={discarding}
                  className="rounded-sm border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 disabled:opacity-40"
                >
                  {discarding ? "Discarding…" : "Discard Draft"}
                </button>
              )}
            </div>

            {restoreNotice && (
              <div className="mb-4 flex items-center justify-between rounded-sm border border-blue-200 bg-blue-50 px-4 py-2.5">
                <p className="text-sm text-blue-700">ℹ️ {restoreNotice}</p>
                <button onClick={() => setRestoreNotice("")} className="text-xs text-blue-500 hover:text-blue-700">Dismiss</button>
              </div>
            )}
            {error && (
              <p className="mb-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            {/* 4-step wizard + preview — same layout as main page */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[2fr_3fr]">
              <KBForm
                fields={fields}
                onChange={setFields}
                images={images}
                onImagesChange={setImages}
                onSubmit={handleRegenerate}
                onClear={() => {}}
                loading={generating}
                error=""
                step={step}
                onStepChange={setStep}
                submitLabel="Regenerate KB Article"
              />
              <KBPreview
                markdown={markdown}
                images={images}
                loading={generating}
                ticket={params.id}
                audience={fields.audience}
                onMarkdownChange={setMarkdown}
                onRegenerate={() => { setStep(0); }}
                onNewArticle={() => { window.location.href = "/?new=1"; }}
                onSave={articleStatus === "draft" ? handlePublishDraft : handleRepublish}
                onSaveDraft={articleStatus === "draft" ? handleSaveDraftAgain : undefined}
                publishLabel={articleStatus === "draft" ? "Publish" : `Republish as v${currentVersion + 1}`}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black px-6 py-6 text-xs text-white/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span>© {new Date().getFullYear()} Commvault · Clumio Atlas</span>
          <span>Internal use only</span>
        </div>
      </footer>
    </main>
  );
}
