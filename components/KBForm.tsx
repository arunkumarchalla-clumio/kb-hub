"use client";

import { useRef, useState } from "react";
import { analyzeKeywords, parseKeywordList, type KeywordStrength } from "@/lib/keywordCheck";
import { makeImageId, makeImageToken } from "@/lib/imageTokens";
import {
  AUDIENCE_OPTIONS,
  AUDIENCE_TONE_MAP,
  type Audience,
  type DiagramImage,
  type ImageSection,
  type KBFormFields,
  type KBImage,
  type ReferenceLink,
} from "@/lib/types";

interface Props {
  fields: KBFormFields;
  onChange: (fields: KBFormFields) => void;
  images: KBImage[];
  onImagesChange: (images: KBImage[]) => void;
  onSubmit: () => void;
  onClear: () => void;
  loading: boolean;
  error: string;
  step: number;
  onStepChange: (step: number) => void;
}

const STEPS = ["Basics", "Symptoms & Cause", "Resolution", "Review"] as const;

const ISSUE_TYPE_OPTIONS = [
  "Backup Failed",
  "Backup Missed",
  "Restore Failed",
  "Archive Backup Failed",
];

const ENTITY_TYPE_OPTIONS = [
  "RDS Instance",
  "RDS Cluster",
  "DynamoDB",
  "EC2 Instance",
  "EBS Volume",
  "CFT",
  "MSSQL Server",
  "DocumentDB",
];

const OTHER_VALUE = "__other__";

// Guard against attaching enormous screenshots — big base64 images bloat the
// request and slow generation. 4MB per image is a generous ceiling.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

// Anthropic's API rejects images where either dimension exceeds 8000px.
// Retina/HiDPI screenshots on Mac are 2× resolution, so a full-page capture
// can easily be 10 000px+ tall. This function downscales the image in the
// browser using a canvas before it ever leaves the machine — aspect ratio is
// preserved, and anything already within the limit is returned unchanged.
const MAX_DIMENSION_PX = 7800; // stay comfortably under the 8000px hard limit

async function resizeImageIfNeeded(dataUri: string, mediaType: string): Promise<string> {
  // GIFs can be animated; canvas would flatten them, so skip resizing.
  if (mediaType === "image/gif") return dataUri;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;

      // Already within limits — return the original unchanged.
      if (w <= MAX_DIMENSION_PX && h <= MAX_DIMENSION_PX) {
        resolve(dataUri);
        return;
      }

      // Scale down so the longer dimension is exactly MAX_DIMENSION_PX.
      const scale = MAX_DIMENSION_PX / Math.max(w, h);
      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUri); return; }

      ctx.drawImage(img, 0, 0, targetW, targetH);
      // Use JPEG for photos/screenshots (smaller), PNG for transparent images.
      const outputType = mediaType === "image/png" ? "image/png" : "image/jpeg";
      const quality = 0.92; // high quality, ~10–20% smaller than lossless
      resolve(canvas.toDataURL(outputType, quality));
    };
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = dataUri;
  });
}

// ── Screenshot attacher (Steps 2 & 3) ────────────────────────────────────────

const TONE_LABELS: Record<KBFormFields["tone"], string> = {
  technical: "Technical (IT admins)",
  plain: "Plain language (end users)",
  engineering: "Technical, with detailed code explanations (Engineering)",
};

const AUDIENCE_HINTS: Record<Audience, string> = {
  Internal: "IT / support staff — technical language",
  Public: "End users — plain, jargon-free language",
  Engineering: "Engineers — technical, with code walkthroughs",
};

const KEYWORD_STRENGTH_STYLES: Record<
  KeywordStrength,
  { label: string; barClass: string; barWidth: string; textClass: string }
> = {
  empty: { label: "Empty", barClass: "bg-ink/15", barWidth: "0%", textClass: "text-ink/40" },
  weak: { label: "Weak", barClass: "bg-amber", barWidth: "35%", textClass: "text-amber-900" },
  good: { label: "Good", barClass: "bg-primary/70", barWidth: "70%", textClass: "text-primary-dark" },
  strong: { label: "Strong", barClass: "bg-primary", barWidth: "100%", textClass: "text-primary-dark" },
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
        {label}
      </span>
      {hint && <span className="ml-2 text-[11px] text-ink/35">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-primary";

function SelectOrCustom({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const isKnownOption = value !== "" && options.includes(value);
  const [customMode, setCustomMode] = useState(value !== "" && !isKnownOption);

  return (
    <Field label={label}>
      <select
        className={inputClass}
        value={customMode ? OTHER_VALUE : value}
        onChange={(e) => {
          if (e.target.value === OTHER_VALUE) {
            setCustomMode(true);
            onChange("");
          } else {
            setCustomMode(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={OTHER_VALUE}>Other (specify)</option>
      </select>
      {customMode && (
        <input
          className={`${inputClass} mt-2`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}
    </Field>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line py-2 last:border-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink/45">
        {label}
      </div>
      <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink/85">
        {value.trim() || <span className="text-ink/30">Not provided</span>}
      </div>
    </div>
  );
}

// Screenshot attach + list UI, reused in Step 2 (symptoms) and Step 3 (resolution).
function ScreenshotAttacher({
  section,
  images,
  onImagesChange,
}: {
  section: ImageSection;
  images: KBImage[];
  onImagesChange: (images: KBImage[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");

  const sectionImages = images.filter((img) => img.section === section);

  function nextIdNumber(): number {
    const existing = images
      .filter((img) => img.section === section)
      .map((img) => parseInt(img.id.replace(/^\D+/, ""), 10))
      .filter((n) => !Number.isNaN(n));
    return existing.length ? Math.max(...existing) + 1 : 1;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploadError("");
    const additions: KBImage[] = [];
    let counter = nextIdNumber();

    for (const file of Array.from(files)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setUploadError("Only PNG, JPEG, GIF, or WebP images are supported.");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError("Each image must be under 4 MB.");
        continue;
      }
      const rawUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const dataUri = await resizeImageIfNeeded(rawUri, file.type);
      const id = makeImageId(section, counter++);
      additions.push({
        id,
        token: makeImageToken(id),
        section,
        caption: file.name.replace(/\.[^.]+$/, ""),
        dataUri,
        mediaType: file.type,
      });
    }
    if (additions.length) onImagesChange([...images, ...additions]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function updateCaption(id: string, caption: string) {
    onImagesChange(images.map((img) => (img.id === id ? { ...img, caption } : img)));
  }

  function removeImage(id: string) {
    onImagesChange(images.filter((img) => img.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
          Screenshots
        </span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-ink/70 hover:border-primary hover:text-primary-dark"
        >
          + Attach image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uploadError && <p className="mt-1 text-[11px] text-amber-900">{uploadError}</p>}

      {sectionImages.length === 0 ? (
        <p className="mt-2 text-[11px] text-ink/40">
          Attach screenshots here. Claude will see them and automatically place them in the
          article where they fit. Each image gets a token like{" "}
          <code className="rounded bg-ink/5 px-1">{makeImageToken(makeImageId(section, 1))}</code>{" "}
          — you can also paste a token manually in the Edit view after generating if you want
          to move it somewhere specific.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {sectionImages.map((img) => (
            <li key={img.id} className="flex gap-3 rounded-sm border border-line bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUri}
                alt={img.caption}
                className="h-14 w-14 shrink-0 rounded-sm object-cover"
              />
              <div className="min-w-0 flex-1">
                <input
                  className="w-full rounded-sm border border-line px-2 py-1 text-xs"
                  value={img.caption}
                  onChange={(e) => updateCaption(img.id, e.target.value)}
                  placeholder="Caption"
                />
                <div className="mt-1 flex items-center justify-between">
                  <code className="rounded bg-ink/5 px-1 text-[10px] text-ink/50">
                    {img.token}
                  </code>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="text-[11px] text-ink/40 hover:text-amber-900"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Diagram / workflow image uploader (Step 1) ────────────────────────────────
// Accepts multiple optional images or PDFs.
// PDFs are rasterized page-by-page in the browser (using pdfjs-dist) into
// JPEG images before being sent to the API. This sidesteps Anthropic's
// "Could not process PDF" error which occurs with Safari/Chrome exported PDFs
// that use non-standard PDF structures. Rasterized images work reliably with
// Claude's vision and are already the right format.

const MAX_DIAGRAM_BYTES = 32 * 1024 * 1024;
const ACCEPTED_DIAGRAM_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];

// Rasterize every page of a PDF ArrayBuffer to JPEG data-URIs.
// Returns one DiagramImage per page. Uses pdfjs-dist in the browser.
async function pdfToImages(
  arrayBuffer: ArrayBuffer,
  filename: string
): Promise<DiagramImage[]> {
  // Dynamically import pdfjs-dist so it only loads in the browser bundle.
  const pdfjsLib = await import("pdfjs-dist");
  // Point the worker at the bundled worker file served by Next.js.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const results: DiagramImage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // Render at 2× scale for sharpness; cap to stay under the 7800px limit.
    const viewport = page.getViewport({ scale: 2 });
    const scale = Math.min(2, MAX_DIMENSION_PX / Math.max(viewport.width, viewport.height));
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(scaledViewport.width);
    canvas.height = Math.round(scaledViewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    const dataUri = canvas.toDataURL("image/jpeg", 0.92);
    const pageName = pdf.numPages === 1
      ? filename
      : `${filename} (page ${pageNum} of ${pdf.numPages})`;
    results.push({ dataUri, mediaType: "image/jpeg", filename: pageName });
  }

  return results;
}

// Stable ID counter for diagram items (separate from image section tokens).
let diagramCounter = 0;
function newDiagramId() { return `diag-${++diagramCounter}`; }

// DiagramImage extended with a local stable id for React keys and removal.
interface DiagramEntry extends DiagramImage { entryId: string; }

function DiagramUploader({
  diagrams,
  onChange,
}: {
  diagrams: DiagramImage[];
  onChange: (diagrams: DiagramImage[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  // We store entries with stable ids internally; callers receive plain DiagramImage[].
  const [entries, setEntries] = useState<DiagramEntry[]>(() =>
    diagrams.map((d) => ({ ...d, entryId: newDiagramId() }))
  );

  function update(next: DiagramEntry[]) {
    setEntries(next);
    onChange(next.map(({ entryId: _, ...d }) => d));
  }

  async function processFiles(files: File[]) {
    setUploadError("");
    setProcessing(true);
    const additions: DiagramEntry[] = [];

    try {
      for (const file of files) {
        if (!ACCEPTED_DIAGRAM_TYPES.includes(file.type)) {
          setUploadError("Supported formats: PNG, JPEG, WebP, GIF, or PDF.");
          continue;
        }
        if (file.size > MAX_DIAGRAM_BYTES) {
          setUploadError(
            file.type === "application/pdf" ? "PDF must be under 32 MB." : "Image must be under 5 MB."
          );
          continue;
        }

        if (file.type === "application/pdf") {
          // Rasterize each page to a JPEG image client-side.
          // This avoids the Anthropic "Could not process PDF" error caused by
          // non-standard PDF structures from Safari/Chrome export.
          const arrayBuffer = await file.arrayBuffer();
          const pageImages = await pdfToImages(arrayBuffer, file.name);
          for (const img of pageImages) {
            additions.push({ entryId: newDiagramId(), ...img });
          }
        } else {
          const rawUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("read failed"));
            reader.readAsDataURL(file);
          });
          const dataUri = await resizeImageIfNeeded(rawUri, file.type);
          additions.push({ entryId: newDiagramId(), dataUri, mediaType: file.type, filename: file.name });
        }
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? `Failed to process file: ${err.message}` : "Failed to process file."
      );
    } finally {
      setProcessing(false);
    }

    if (additions.length) update([...entries, ...additions]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }

  function remove(entryId: string) {
    update(entries.filter((e) => e.entryId !== entryId));
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
            Workflow / Diagnostic Files
          </span>
          <span className="ml-2 font-mono text-[10px] text-ink/35">optional</span>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-ink/70 hover:border-primary hover:text-primary-dark"
        >
          + Add file
        </button>
      </div>

      {uploadError && <p className="mt-1 text-[11px] text-amber-900">{uploadError}</p>}

      {/* Drop zone — shown when empty */}
      {entries.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !processing && fileRef.current?.click()}
          className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-4 py-6 text-center transition ${
            processing
              ? "border-primary/40 bg-primary/5 cursor-wait"
              : isDragging
              ? "border-primary bg-primary/5"
              : "border-line bg-white/60 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          {processing ? (
            <>
              <svg className="animate-spin text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <p className="text-sm text-primary-dark">Rendering PDF pages…</p>
            </>
          ) : (
            <>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                   strokeLinejoin="round" className="text-ink/30">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-ink/60">Drop files or click to browse</p>
                <p className="mt-1 text-[11px] text-ink/40">
                  AWS topology, backup task graph, error log, architecture diagram —
                  Claude will analyze them all to write a more accurate article.
                </p>
                <p className="mt-1 text-[11px] text-ink/35">
                  PNG, JPEG, WebP, GIF (max 5 MB) &nbsp;·&nbsp; PDF (max 32 MB)
                </p>
                <p className="mt-1.5 rounded bg-primary/5 px-2 py-1 text-[10px] text-primary-dark">
                  💡 Safari → File → Export as PDF captures an entire scrollable page.
                  PDFs are automatically converted to images before sending.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* File list — shown when items exist */}
      {entries.length > 0 && (
        <>
          <ul className="mt-2 space-y-2">
            {entries.map((entry, i) => {
              const isPdf = entry.mediaType === "application/pdf";
              return (
                <li
                  key={entry.entryId}
                  className="flex gap-3 rounded-sm border border-primary/20 bg-primary/5 p-2.5"
                >
                  {/* Thumbnail */}
                  {isPdf ? (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-line bg-white">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                           stroke="#7B3F87" strokeWidth="1.5" strokeLinecap="round"
                           strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="8" y1="13" x2="16" y2="13"/>
                        <line x1="8" y1="17" x2="16" y2="17"/>
                      </svg>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.dataUri}
                      alt={entry.filename}
                      className="h-14 w-14 shrink-0 rounded-sm border border-line object-cover"
                    />
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-xs font-medium text-ink/80">{entry.filename}</p>
                      <button
                        type="button"
                        onClick={() => remove(entry.entryId)}
                        className="shrink-0 text-[11px] text-ink/35 hover:text-amber-900"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-0.5 text-[10px] text-primary-dark">
                      ✓ Analysis file {i + 1} — Claude will read this, not embed it
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Drop zone below list for adding more */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed px-3 py-2 text-[11px] text-ink/45 transition ${
              isDragging ? "border-primary bg-primary/5 text-primary-dark" : "border-line hover:border-primary/40"
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                 strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add another file
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_DIAGRAM_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
      />
    </div>
  );
}

// ── Reference links editor ────────────────────────────────────────────────────
// Used in Step 2. Each row has a URL, an optional display label, and an
// internal/external checkbox. Rows can be added or removed freely.

let refCounter = 0;
function newRefId() {
  return `ref-${++refCounter}`;
}

function ReferenceLinksEditor({
  links,
  onChange,
}: {
  links: ReferenceLink[];
  onChange: (links: ReferenceLink[]) => void;
}) {
  function addRow() {
    onChange([...links, { id: newRefId(), url: "", label: "", isInternal: false }]);
  }

  function updateRow(id: string, patch: Partial<ReferenceLink>) {
    onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeRow(id: string) {
    onChange(links.filter((l) => l.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
          Reference Links
        </span>
        <button
          type="button"
          onClick={addRow}
          className="rounded-sm border border-line px-2.5 py-1 text-[11px] text-ink/70 hover:border-primary hover:text-primary-dark"
        >
          + Add link
        </button>
      </div>

      {links.length === 0 ? (
        <p className="mt-2 text-[11px] text-ink/40">
          Paste URLs here to include as references in the article. Mark each as
          internal (visible only to Internal &amp; Engineering audiences) or external
          (visible to all, including Public).
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {links.map((link, i) => (
            <li
              key={link.id}
              className="rounded-sm border border-line bg-white p-2.5"
            >
              {/* Row header: number + internal toggle + remove */}
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-ink/35">#{i + 1}</span>

                <label className="flex cursor-pointer items-center gap-1.5 select-none">
                  <input
                    type="checkbox"
                    checked={link.isInternal}
                    onChange={(e) => updateRow(link.id, { isInternal: e.target.checked })}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                      link.isInternal
                        ? "bg-amber-light text-amber-900"
                        : "bg-primary/10 text-primary-dark"
                    }`}
                  >
                    {link.isInternal ? "Internal" : "External"}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => removeRow(link.id)}
                  className="ml-auto text-[11px] text-ink/35 hover:text-amber-900"
                  aria-label="Remove link"
                >
                  ✕
                </button>
              </div>

              {/* URL */}
              <input
                className={`${inputClass} text-xs`}
                value={link.url}
                onChange={(e) => updateRow(link.id, { url: e.target.value })}
                placeholder="https://…"
                type="url"
              />

              {/* Label */}
              <input
                className={`${inputClass} mt-1.5 text-xs`}
                value={link.label}
                onChange={(e) => updateRow(link.id, { label: e.target.value })}
                placeholder="Display label (optional — URL used if blank)"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function KBForm({
  fields,
  onChange,
  images,
  onImagesChange,
  onSubmit,
  onClear,
  loading,
  error,
  step,
  onStepChange,
}: Props) {
  // step is now controlled by the parent (page.tsx) so the refresh icon in
  // KBPreview can reset it to 0 without needing a ref or callback chain.
  const setStep = onStepChange;

  function set<K extends keyof KBFormFields>(key: K, value: KBFormFields[K]) {
    onChange({ ...fields, [key]: value });
  }

  function selectAudience(audience: Audience) {
    // Tone always follows audience — see AUDIENCE_TONE_MAP in lib/types.ts.
    onChange({ ...fields, audience, tone: AUDIENCE_TONE_MAP[audience] });
  }

  function addKeyword(word: string) {
    const current = parseKeywordList(fields.keywords);
    if (current.some((k) => k.toLowerCase() === word.toLowerCase())) return;
    set("keywords", [...current, word].join(", "));
  }

  function clearForm() {
    onClear();
    setStep(0);
  }

  const keywordAnalysis = analyzeKeywords(fields);
  const keywordStyle = KEYWORD_STRENGTH_STYLES[keywordAnalysis.strength];

  const basicsValid = fields.title.trim().length > 0;
  const canGoNext = step !== 0 || basicsValid;

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <section className="rounded-sm border border-line bg-white/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Intake</h2>
        <button
          type="button"
          onClick={clearForm}
          className="text-[11px] text-ink/40 underline-offset-2 hover:text-ink/70 hover:underline"
        >
          Clear all
        </button>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Fill in what you know. Leave the rest blank — the article will say so plainly.
      </p>

      {/* Progress bar */}
      <ol className="mt-5 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                i <= step || (i === step + 1 && canGoNext) ? setStep(i) : null
              }
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] transition ${
                i < step
                  ? "bg-primary text-paper"
                  : i === step
                  ? "border-2 border-primary text-primary-dark"
                  : "border border-line text-ink/30"
              }`}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? "✓" : i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${i < step ? "bg-primary" : "bg-line"}`} />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink/50">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </div>

      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === STEPS.length - 1) {
            onSubmit();
          } else {
            next();
          }
        }}
      >
        {step === 0 && (
          <>
            <Field label="Title" hint="required">
              <input
                autoFocus
                className={inputClass}
                value={fields.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. EBS volume backup fails after volume deletion"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <SelectOrCustom
                label="Type"
                options={ISSUE_TYPE_OPTIONS}
                value={fields.issueType}
                onChange={(v) => set("issueType", v)}
                placeholder="e.g. Backup Skipped"
              />
              <SelectOrCustom
                label="Primary Entity Type"
                options={ENTITY_TYPE_OPTIONS}
                value={fields.primaryEntityType}
                onChange={(v) => set("primaryEntityType", v)}
                placeholder="e.g. S3 Bucket"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <input
                  className={inputClass}
                  value={fields.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="Backup & Recovery"
                />
              </Field>
              <Field label="Product / Version">
                <input
                  className={inputClass}
                  value={fields.productVersion}
                  onChange={(e) => set("productVersion", e.target.value)}
                  placeholder="Clumio 6.2"
                />
              </Field>
            </div>

            <div>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
                Audience
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {AUDIENCE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectAudience(option)}
                    className={`rounded-sm border px-3 py-2 text-left text-sm transition ${
                      fields.audience === option
                        ? "border-primary bg-primary/10 text-primary-dark"
                        : "border-line bg-white text-ink/70 hover:bg-ink/5"
                    }`}
                  >
                    <span className="block font-semibold">{option}</span>
                    <span className="block text-[11px] text-ink/45">
                      {AUDIENCE_HINTS[option]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-ink/40">
                The writing tone is set automatically based on this choice.
              </p>
            </div>

            {/* AWS documentation toggle */}
            <div className="flex items-start justify-between gap-4 rounded-sm border border-line bg-white p-3">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
                  Research with AWS docs
                </span>
                <p className="mt-1 text-[11px] text-ink/45">
                  Let Claude check official AWS documentation while writing, and cite
                  sources. More accurate for AWS issues, but slower.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={fields.useAwsDocs}
                onClick={() => set("useAwsDocs", !fields.useAwsDocs)}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
                  fields.useAwsDocs ? "bg-primary" : "bg-ink/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    fields.useAwsDocs ? "left-[1.375rem]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Workflow / diagnostic files — analyzed by Claude, not embedded */}
            <DiagramUploader
              diagrams={fields.diagramImage}
              onChange={(d) => set("diagramImage", d)}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Symptoms">
              <textarea
                autoFocus
                className={inputClass}
                rows={4}
                value={fields.symptoms}
                onChange={(e) => set("symptoms", e.target.value)}
                placeholder="What does the user see or experience?"
              />
            </Field>
            <Field label="Cause">
              <textarea
                className={inputClass}
                rows={3}
                value={fields.cause}
                onChange={(e) => set("cause", e.target.value)}
                placeholder="Root cause, if known"
              />
            </Field>
            <ScreenshotAttacher
              section="symptoms"
              images={images}
              onImagesChange={onImagesChange}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Resolution Steps">
              <textarea
                autoFocus
                className={inputClass}
                rows={6}
                value={fields.resolutionSteps}
                onChange={(e) => set("resolutionSteps", e.target.value)}
                placeholder="One step per line works well"
              />
            </Field>
            <Field label="Keywords">
              <input
                className={inputClass}
                value={fields.keywords}
                onChange={(e) => set("keywords", e.target.value)}
                placeholder="vpn, connection, windows 11"
              />
            </Field>

            <div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full transition-all ${keywordStyle.barClass}`}
                    style={{ width: keywordStyle.barWidth }}
                  />
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${keywordStyle.textClass}`}
                >
                  {keywordStyle.label}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink/50">{keywordAnalysis.message}</p>

              {keywordAnalysis.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {keywordAnalysis.suggestions.map((word) => (
                    <button
                      key={word}
                      type="button"
                      onClick={() => addKeyword(word)}
                      className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] text-ink/60 transition hover:border-primary hover:text-primary-dark"
                    >
                      + {word}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ScreenshotAttacher
              section="resolution"
              images={images}
              onImagesChange={onImagesChange}
            />
            <ReferenceLinksEditor
              links={fields.referenceLinks}
              onChange={(refs) => set("referenceLinks", refs)}
            />
          </>
        )}

        {step === 3 && (
          <>
            <div className="rounded-sm border border-line bg-white/70 px-3 py-2 text-xs text-ink/70">
              Writing tone: <strong>{TONE_LABELS[fields.tone]}</strong>
              <br />
              <span className="text-ink/45">
                Auto-selected because the audience is set to {fields.audience}. Change
                the audience in Basics to change the tone.
              </span>
            </div>

            <div className="rounded-sm border border-line bg-white p-4">
              <ReviewRow label="Title" value={fields.title} />
              <ReviewRow label="Type" value={fields.issueType} />
              <ReviewRow label="Primary Entity Type" value={fields.primaryEntityType} />
              <ReviewRow label="Category" value={fields.category} />
              <ReviewRow label="Product / Version" value={fields.productVersion} />
              <ReviewRow label="Audience" value={fields.audience} />
              <ReviewRow
                label="AWS docs research"
                value={fields.useAwsDocs ? "Enabled" : "Disabled"}
              />
              <ReviewRow
                label="Workflow / diagnostic files"
                value={
                  fields.diagramImage.length
                    ? fields.diagramImage.map((d) => d.filename).join(", ")
                    : ""
                }
              />
              <ReviewRow label="Symptoms" value={fields.symptoms} />
              <ReviewRow label="Cause" value={fields.cause} />
              <ReviewRow label="Resolution Steps" value={fields.resolutionSteps} />
              <ReviewRow label="Keywords" value={fields.keywords} />
              <ReviewRow
                label="Screenshots attached"
                value={images.length ? `${images.length}` : ""}
              />
              <ReviewRow
                label="Reference links"
                value={
                  fields.referenceLinks.filter((l) => l.url.trim()).length
                    ? fields.referenceLinks
                        .filter((l) => l.url.trim())
                        .map((l) => `[${l.isInternal ? "Internal" : "External"}] ${l.label || l.url}`)
                        .join("\n")
                    : ""
                }
              />
            </div>
          </>
        )}

        {error && (
          <p className="rounded-sm border border-amber/40 bg-amber-light/40 px-3 py-2 text-sm text-ink">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="rounded-sm border border-line px-4 py-2.5 text-sm hover:bg-ink/5"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="submit"
              disabled={!canGoNext}
              className="flex-1 rounded-sm bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !basicsValid}
              className="flex-1 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? fields.useAwsDocs
                  ? "Generating (checking AWS docs)…"
                  : "Generating…"
                : "Generate KB Article"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
