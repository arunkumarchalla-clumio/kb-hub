# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**KB-Creator** is a local-only web app for Commvault/Clumio support engineers. It takes structured form input (title, symptoms, cause, resolution steps, audience, etc.) and generates a formatted Knowledge Base article using the Claude API. Articles are persisted to a local SQLite database and synced to teammates via a committed JSON file.

- Framework: Next.js 14 (App Router) + TypeScript
- Styling: Tailwind CSS + `@tailwindcss/typography`
- AI: Anthropic API (`@anthropic-ai/sdk@^0.110.0`), server-side only
- Database: `better-sqlite3` (WAL mode, synchronous, no ORM)
- Export: `.docx` via `docx`, PDF rendering via `pdfjs-dist` (client-side)
- Runs locally only — no Vercel deployment

## Commands

```bash
npm run dev          # start dev server on port 3000 (pinned)
npm run dev:fresh    # kill port 3000 first, then start
npm run build        # production build (run before declaring a change done)
npm run lint         # ESLint
```

No test suite exists. Lint + build are the verification gates.

## Architecture

### Pages and routes

| Path | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Form + live preview — the main authoring UI |
| `/library` | `app/library/page.tsx` | Browse all saved/published articles |
| `/library/[id]` | `app/library/[id]/page.tsx` | View a single article |
| `/library/archived` | `app/library/archived/page.tsx` | Articles archived >3 days |
| `/generate-kb-article/[ticket]` | `app/generate-kb-article/[ticket]/page.tsx` | View generated article by ticket ID |

### API routes (all server-side)

| Route | Purpose |
|---|---|
| `POST /api/generate-kb` | Calls Claude to generate KB article markdown |
| `GET/POST /api/library/list` | List all articles from SQLite |
| `POST /api/library/save` | Insert or update an article + trigger JSON export |
| `GET /api/library/article/[id]` | Fetch one article by ID |
| `POST /api/library/archive/[id]` | Soft-archive an article |
| `GET /api/library/archived` | List permanently archived articles |
| `POST /api/export/docx` | Generate and return a `.docx` file |

### Key library files

- **`lib/anthropic.ts`** — Anthropic client, system prompt builder, `generateKBArticle()`. This is the only file that calls the API. The system prompt enforces fixed section order (Title → Summary → Symptoms → Cause → Resolution → Applies To → FAQ → References → Keywords). Tone is determined by audience via `AUDIENCE_TONE_MAP`.
- **`lib/db/index.ts`** — All SQLite operations (singleton `getDb()`, schema init, CRUD, archive logic, JSON export). Every write calls `exportToJson()` which updates `kb-articles.json`.
- **`lib/types.ts`** — Shared TypeScript types: `KBFormFields`, `KBImage`, `DiagramImage`, `ReferenceLink`, `ArticleTone`, `Audience`.
- **`lib/brand.ts`** — Single source of truth for Commvault/Clumio branding (company name, logo SVGs, footer links, social links). Import from here for any UI that shows brand elements.
- **`lib/docxExport.ts`** — Word document generation logic.
- **`lib/imageTokens.ts`** — Helpers for screenshot token generation/replacement.
- **`lib/keywordCheck.ts`** — Keyword validation utilities.

### Components

- **`KBForm.tsx`** — 4-step wizard: Basics → Symptoms & Cause → Resolution → Review. Manages `KBFormFields` state. Draft auto-saved to `localStorage` under key `kb-creator-draft-v2`. `diagramImage` (base64) is excluded from localStorage to stay under the ~5 MB quota.
- **`KBPreview.tsx`** — Renders generated markdown with `react-markdown`. Handles image token replacement (inline screenshots) and renders reference links split by internal/external.

### Database schema

Three tables in `kb-hub.db` (project root, committed as binary):

- **`kb_articles`** — active articles (`status`: `draft` | `published` | `archived`)
- **`kb_archived_articles`** — articles archived >3 days (moved from `kb_articles` on library page load via `moveExpiredArchives()`)
- **`kb_revisions`** — snapshot of `markdown_content` before each update

**Git sync pattern**: `kb-articles.json` (also in project root) is the human-readable export that teammates pick up on `git pull`. On first run against an empty database, `importFromJsonIfEmpty()` seeds SQLite from the JSON automatically.

### Article generation flow

1. `KBForm.tsx` collects fields → user clicks Generate.
2. `app/page.tsx` POSTs `{ fields, images }` to `/api/generate-kb`.
3. Route handler calls `generateKBArticle()` in `lib/anthropic.ts`.
4. If `useAwsDocs` is true, `client.beta.messages.create()` is called with the AWS Knowledge MCP Server (`https://knowledge-mcp.global.api.aws`) wired in — requires beta header `mcp-client-2025-11-20` and `@anthropic-ai/sdk@^0.110.0`. Adds latency; `maxDuration = 60` is set on the route.
5. Claude returns markdown; `KBPreview.tsx` renders it.
6. User clicks "Save to Library" → POST `/api/library/save` → SQLite + JSON export.

### Image handling

Two distinct image types, kept strictly separate:

- **`DiagramImage`** (Step 1, Basics) — workflow/architecture diagrams uploaded for Claude to *analyze* as context. Sent to Claude as image blocks; never embedded in the article output. PDFs are rasterized client-side to JPEG via `pdfjs-dist` before being sent.
- **`KBImage`** (Steps 2–3) — illustrative screenshots placed *inline* in the article via placeholder tokens (e.g. `{{IMG_1}}`). Tokens are injected into the generated markdown and replaced with actual `<img>` tags in `KBPreview.tsx`.

## Conventions

- Anthropic API is called server-side only — `ANTHROPIC_API_KEY` never reaches client components.
- The KB article's fixed section order lives in `lib/anthropic.ts` (`baseStructure()`). Change structure there, not in the UI.
- Audience drives tone automatically via `AUDIENCE_TONE_MAP` in `lib/types.ts` — don't let form consumers set tone independently.
- All branding changes go through `lib/brand.ts`.
- `db/index.ts` is a synchronous SQLite module — no async/await, no connection pooling. Keep it that way.

## Environment variables

- `ANTHROPIC_API_KEY` — required. Set in `.env.local` (gitignored; see `.env.example`).
