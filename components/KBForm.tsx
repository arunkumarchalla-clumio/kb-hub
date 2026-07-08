"use client";

import type { KBFormFields } from "@/lib/types";

interface Props {
  fields: KBFormFields;
  onChange: (fields: KBFormFields) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
}

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

export default function KBForm({ fields, onChange, onSubmit, loading, error }: Props) {
  function set<K extends keyof KBFormFields>(key: K, value: string) {
    onChange({ ...fields, [key]: value });
  }

  return (
    <section className="rounded-sm border border-line bg-white/60 p-6">
      <h2 className="font-display text-lg font-700">Intake</h2>
      <p className="mt-1 text-sm text-ink/60">
        Fill in what you know. Leave the rest blank — the article will say so plainly.
      </p>

      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Title" hint="required">
          <input
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

        <Field label="Symptoms">
          <textarea
            className={inputClass}
            rows={3}
            value={fields.symptoms}
            onChange={(e) => set("symptoms", e.target.value)}
            placeholder="What does the user see or experience?"
          />
        </Field>

        <Field label="Cause">
          <textarea
            className={inputClass}
            rows={2}
            value={fields.cause}
            onChange={(e) => set("cause", e.target.value)}
            placeholder="Root cause, if known"
          />
        </Field>

        <Field label="Resolution Steps">
          <textarea
            className={inputClass}
            rows={4}
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

        {error && (
          <p className="rounded-sm border border-amber/40 bg-amber-light/40 px-3 py-2 text-sm text-ink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !fields.title.trim()}
          className="w-full rounded-sm bg-forest px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Generating…" : "Generate KB Article"}
        </button>
      </form>
    </section>
  );
}
