"use client";

import { useState } from "react";
import type { KBFormFields } from "@/lib/types";

interface Props {
  fields: KBFormFields;
  onChange: (fields: KBFormFields) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
}

const STEPS = ["Basics", "Symptoms & Cause", "Resolution", "Review"] as const;

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
  "w-full rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-forest";

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

export default function KBForm({ fields, onChange, onSubmit, loading, error }: Props) {
  const [step, setStep] = useState(0);

  function set<K extends keyof KBFormFields>(key: K, value: string) {
    onChange({ ...fields, [key]: value });
  }

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
      <h2 className="font-display text-lg font-700">Intake</h2>
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
                  ? "bg-forest text-paper"
                  : i === step
                  ? "border-2 border-forest text-forest-dark"
                  : "border border-line text-ink/30"
              }`}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? "✓" : i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${i < step ? "bg-forest" : "bg-line"}`} />
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
                placeholder="e.g. VPN client fails to connect on Windows 11"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <input
                  className={inputClass}
                  value={fields.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="Networking"
                />
              </Field>
              <Field label="Product / Version">
                <input
                  className={inputClass}
                  value={fields.productVersion}
                  onChange={(e) => set("productVersion", e.target.value)}
                  placeholder="GlobalProtect 6.2"
                />
              </Field>
            </div>
            <Field label="Audience">
              <input
                className={inputClass}
                value={fields.audience}
                onChange={(e) => set("audience", e.target.value)}
                placeholder="End Users / IT Admins"
              />
            </Field>
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
          </>
        )}

        {step === 3 && (
          <div className="rounded-sm border border-line bg-white p-4">
            <ReviewRow label="Title" value={fields.title} />
            <ReviewRow label="Category" value={fields.category} />
            <ReviewRow label="Product / Version" value={fields.productVersion} />
            <ReviewRow label="Audience" value={fields.audience} />
            <ReviewRow label="Symptoms" value={fields.symptoms} />
            <ReviewRow label="Cause" value={fields.cause} />
            <ReviewRow label="Resolution Steps" value={fields.resolutionSteps} />
            <ReviewRow label="Keywords" value={fields.keywords} />
          </div>
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
              className="flex-1 rounded-sm bg-forest px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Generating…" : "Generate KB Article"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
