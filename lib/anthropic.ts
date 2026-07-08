import Anthropic from "@anthropic-ai/sdk";
import type { ArticleTone, KBFormFields } from "./types";

// Server-side only. Never import this file from a "use client" component.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_STRUCTURE = `Always output ONLY Markdown, in exactly this structure and order, with no preamble or closing remarks:

# {Title}

**Summary:** 1-3 sentence summary of the issue and the fix.

## Symptoms
- Bullet list of observable symptoms.

## Cause
Short paragraph explaining the root cause.

## Resolution
1. Numbered, imperative-voice steps.

## Applies To
- Product/Version and Audience as bullet points.

## FAQ
2-3 likely follow-up questions a reader would have after reading this article, each as "**Q: ...**" followed by a concise answer on the next line. Only ask questions you can actually answer from the given fields (e.g. "What if the steps don't fix it?", "Does this affect other versions?", "Is a restart required?") — do not invent questions whose answers would require information not provided.

## Keywords
Comma-separated keywords.

Rules:
- Use only the information given in the fields. Do not invent details.
- If a field is blank or vague, say so plainly in that section (e.g. "No symptoms provided") instead of fabricating content.
- Resolution steps must be a numbered list, one action per step.
- If there isn't enough information to write any genuine, well-grounded FAQ question, write "No frequently asked questions identified." under FAQ instead of forcing one.`;

const TONE_INSTRUCTIONS: Record<ArticleTone, string> = {
  technical: `Write for an IT admin / technical support audience. Use precise technical terminology (service names, exact menu paths, command syntax, error codes) without over-explaining basics. Assume the reader is comfortable with system administration. Keep language direct and instructional, not marketing copy.`,
  plain: `Write for an end user with no technical background. Avoid jargon; when a technical term is unavoidable, briefly explain it in plain words the first time it's used. Prefer short sentences and concrete, everyday language over precise technical terminology. Resolution steps should read like patient, friendly instructions a non-technical person could follow without help.`,
  engineering: `Write for a software engineering audience. Use precise technical terminology freely, and wherever the resolution involves code, configuration, commands, API calls, or scripts, include them as fenced code blocks and briefly explain what each non-obvious line or flag does and why it's needed. Assume strong technical background, but never leave a code snippet unexplained if its purpose isn't self-evident from context. Prefer being thorough over being brief when it comes to implementation detail.`,
};

function buildSystemPrompt(tone: ArticleTone): string {
  return `You write internal Knowledge Base (KB) articles for a support team from structured field input.

${TONE_INSTRUCTIONS[tone]}

${BASE_STRUCTURE}`;
}

export async function generateKBArticle(fields: KBFormFields): Promise<string> {
  const tone: ArticleTone = TONE_INSTRUCTIONS[fields.tone] ? fields.tone : "technical";

  const userPrompt = `Generate a KB article from these fields:

Title: ${fields.title || "(not provided)"}
Category: ${fields.category || "(not provided)"}
Product/Version: ${fields.productVersion || "(not provided)"}
Audience: ${fields.audience || "(not provided)"}
Symptoms: ${fields.symptoms || "(not provided)"}
Cause: ${fields.cause || "(not provided)"}
Resolution Steps: ${fields.resolutionSteps || "(not provided)"}
Keywords: ${fields.keywords || "(not provided)"}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: buildSystemPrompt(tone),
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned from Claude");
  }

  return textBlock.text;
}
