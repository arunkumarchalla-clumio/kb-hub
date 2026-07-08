# CLAUDE.md

This file is the first thing Claude Code reads when it opens this project. Keep it accurate — it's the source of truth for what KB-Creator is and how to work on it.

## What this project is

**KB-Creator** is a small web app with one job: take structured input from a form (problem, symptoms, cause, resolution steps, product/version, audience) and turn it into a well-formatted Knowledge Base article, using the Claude API to do the writing.

- Framework: Next.js 14 (App Router) + TypeScript
- Styling: Tailwind CSS
- AI: Anthropic API (`@anthropic-ai/sdk`), called server-side only, from `app/api/generate-kb/route.ts`
- Hosting target: Vercel

## Folder map

- `app/` — pages and the API route. `app/page.tsx` is the single-page UI (form + live preview). `app/api/generate-kb/route.ts` is the only place that talks to the Anthropic API.
- `components/` — `KBForm.tsx` (the intake form) and `KBPreview.tsx` (renders the generated article as Markdown).
- `lib/` — `anthropic.ts` (thin client wrapper + the system prompt that defines KB article structure), `types.ts` (shared TypeScript types for form fields and API payloads).
- `.claude/agents/` — subagents Claude Code can delegate to (see below).
- `.claude/skills/` — reusable instructions Claude Code loads automatically when relevant (see below).
- `.claude/settings.json` — Claude Code permissions and defaults for this repo.

## How KB article generation works

1. The user fills out `KBForm.tsx`: Title, Category, Product/Version, Problem/Symptoms, Cause, Resolution Steps, Audience, Keywords.
2. On submit, the form POSTs the field values to `/api/generate-kb`.
3. The route handler builds a prompt from the fields and calls Claude (see `lib/anthropic.ts` for the system prompt — it enforces a consistent KB structure: Title, Summary, Symptoms, Cause, Resolution, Applies To, Keywords).
4. The response streams or returns Markdown, which `KBPreview.tsx` renders and lets the user copy or download as `.md`.

## Conventions to follow

- Never call the Anthropic API from client components — API keys stay server-side, in the route handler, read from `process.env.ANTHROPIC_API_KEY`.
- Keep the KB article's structure consistent (see `lib/anthropic.ts` system prompt) so output is predictable — don't let the model freelance the section headings.
- Prefer editing the system prompt in `lib/anthropic.ts` over hardcoding formatting logic in the UI.
- Run `npm run lint` and `npm run build` before considering a change done.

## Environment variables

- `ANTHROPIC_API_KEY` — required. Set locally in `.env.local` (never commit it) and in Vercel's project settings for deployed environments.

## Out of scope for now

- No database or persistence — generated articles are not saved anywhere yet. If persistence is added later, note the chosen storage here.
- No authentication — this is currently a single-user/internal tool.
