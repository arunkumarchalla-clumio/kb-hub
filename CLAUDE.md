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
- `components/` — `KBForm.tsx` (a 4-step wizard: Basics → Symptoms & Cause → Resolution → Review) and `KBPreview.tsx` (renders the generated article as Markdown).
- `lib/` — `anthropic.ts` (thin client wrapper + the system prompt that defines KB article structure), `types.ts` (shared TypeScript types for form fields and API payloads).
- `.claude/agents/` — subagents Claude Code can delegate to (see below).
- `.claude/skills/` — reusable instructions Claude Code loads automatically when relevant (see below).
- `.claude/settings.json` — Claude Code permissions and defaults for this repo.

## How KB article generation works

1. The user fills out `KBForm.tsx`: Title, Type, Primary Entity Type, Category, Product/Version, Audience, Symptoms, Cause, Resolution Steps, Keywords.
2. On submit, the form POSTs the field values to `/api/generate-kb`.
3. The route handler builds a prompt from the fields and calls Claude (see `lib/anthropic.ts` for the system prompt — it enforces a consistent KB structure: Title, Summary, Symptoms, Cause, Resolution, Applies To, FAQ, References, Keywords).
4. The response streams or returns Markdown, which `KBPreview.tsx` renders and lets the user copy or download as `.md`.

## External documentation grounding

`lib/anthropic.ts` connects Claude to AWS's public, no-auth **AWS Knowledge MCP Server** (`https://knowledge-mcp.global.api.aws`) via the Anthropic API's MCP connector (beta header `mcp-client-2025-11-20`). When a field references a specific AWS service, API, or error, Claude can search and read real AWS documentation before writing the Cause/Resolution sections, and cites what it used in the article's References section. This adds latency (multiple tool round trips) — the API route sets `maxDuration = 60` to accommodate it, and the SDK version must be recent enough to support `client.beta.messages.create()` with `mcp_servers`/`mcp_toolset` (currently `@anthropic-ai/sdk@^0.110.0`).

Commvault/Clumio documentation grounding was scoped out for now — see git history or ask Claude to re-derive the plan if picking it up later (it would use Anthropic's built-in web search/web fetch tools restricted to `documentation.commvault.com`, since that site has no MCP server).

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
