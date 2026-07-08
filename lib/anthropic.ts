import Anthropic from "@anthropic-ai/sdk";
import type { KBFormFields } from "./types";

// Server-side only. Never import this file from a "use client" component.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You write internal Knowledge Base (KB) articles for an IT/support team from structured field input.

Always output ONLY Markdown, in exactly this structure and order, with no preamble or closing remarks:

# {Title}

**Summary:** 1-3 sentence plain-language summary of the issue and the fix.

## Symptoms
- Bullet list of observable symptoms.

## Cause
Short paragraph explaining the root cause.

## Resolution
1. Numbered, imperative-voice steps.

## Applies To
- Product/Version and Audience as bullet points.

## Keywords
Comma-separated keywords.

Rules:
- Use only the information given in the fields. Do not invent details.
- If a field is blank or vague, say so plainly in that section (e.g. "No symptoms provided") instead of fabricating content.
- Resolution steps must be a numbered list, one action per step.
- Keep language plain and instructional, not marketing copy.`;

export async function generateKBArticle(fields: KBFormFields): Promise<string> {
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
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned from Claude");
  }

  return textBlock.text;
}
