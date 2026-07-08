"use client";

import { useEffect, useState } from "react";
import KBForm from "@/components/KBForm";
import KBPreview from "@/components/KBPreview";
import type { KBFormFields } from "@/lib/types";

const EMPTY_FIELDS: KBFormFields = {
  title: "",
  category: "",
  productVersion: "",
  audience: "Internal",
  symptoms: "",
  cause: "",
  resolutionSteps: "",
  keywords: "",
  tone: "technical",
};

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

  useEffect(() => {
    setTicket(makeTicketNumber());
  }, []);

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

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-2 md:px-10">
        <KBForm
          fields={fields}
          onChange={setFields}
          onSubmit={handleGenerate}
          loading={loading}
          error={error}
        />
        <KBPreview markdown={markdown} loading={loading} ticket={ticket} />
      </div>
    </main>
  );
}
