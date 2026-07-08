---
name: kb-formatting
description: Use whenever writing, editing, or reasoning about the structure of a generated Knowledge Base article — the fixed section order, heading style, and Markdown conventions this project standardizes on. Trigger on tasks touching lib/anthropic.ts, components/KBPreview.tsx, or any request to change how the generated article looks.
---

# KB Article Formatting

KB-Creator always generates articles in this exact Markdown structure, in this order:

```markdown
# {Title}

**Summary:** 1–3 sentence plain-language summary of the issue and fix.

## Symptoms
- Bullet list of observable symptoms, from the Symptoms field.

## Cause
Short paragraph explaining the root cause, from the Cause field.

## Resolution
1. Numbered, imperative-voice steps from the Resolution Steps field.
2. Each step is one action.

## Applies To
- Product/Version, and Audience (e.g. "End Users", "IT Admins"), as a short bullet list.

## FAQ
**Q: ...**
Concise answer, grounded only in the given fields. 2-3 questions, or "No frequently asked questions identified." if there isn't enough to work with.

## References
Real documentation URLs Claude consulted via the AWS documentation tool, as a Markdown bullet list, or "No external references consulted."

## Keywords
Comma-separated keywords for searchability.
```

Rules:

- Headings are always `##` (H2) for sections, `#` (H1) only for the article title.
- Resolution steps are always a numbered list, never bullets — order matters for troubleshooting.
- FAQ questions must be answerable from the given fields — don't invent a question whose honest answer would require information the form didn't collect.
- References must only ever contain real URLs actually returned by a tool call — never a fabricated or guessed link.
- Don't add sections beyond the eight above unless the user explicitly asks for a new one — and if they do, add it consistently in both the system prompt (`lib/anthropic.ts`) and the preview renderer (`components/KBPreview.tsx`).
- Keep the tone plain and instructional, not marketing or conversational.
- If an input field was left blank, the corresponding section should say so plainly (e.g. "No symptoms provided") rather than being omitted or fabricated.
