"use client";

import { useRef, useState } from "react";
import { analyzeKeywords, parseKeywordList, type KeywordStrength } from "@/lib/keywordCheck";
import { makeImageId, makeImageToken } from "@/lib/imageTokens";
import {
  AUDIENCE_OPTIONS,
  AUDIENCE_TONE_MAP,
  type Audience,
  type ImageSection,
  type KBFormFields,
  type KBImage,
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
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
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
              <ReviewRow label="Symptoms" value={fields.symptoms} />
              <ReviewRow label="Cause" value={fields.cause} />
              <ReviewRow label="Resolution Steps" value={fields.resolutionSteps} />
              <ReviewRow label="Keywords" value={fields.keywords} />
              <ReviewRow
                label="Screenshots attached"
                value={images.length ? `${images.length}` : ""}
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
