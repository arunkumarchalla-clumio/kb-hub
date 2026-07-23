# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Clumio Atlas** (internal repo name: `kb-hub`) is a local-only web app for Commvault/Clumio support engineers. It takes structured form input (title, symptoms, cause, resolution steps, audience, etc.) and generates a formatted Knowledge Base article using the Claude API. Articles are persisted to a local SQLite database, versioned on every edit, and synced to teammates via a committed JSON file.

- Framework: Next.js 14 (App Router) + TypeScript
- Styling: Tailwind CSS + `@tailwindcss/typography`
- AI: Anthropic API (`@anthropic-ai/sdk@^0.110.0`), server-side only
- Database: `better-sqlite3` (WAL mode, synchronous, no ORM)
- Export: `.docx` via `docx`, PDF via a print window (client-side, reads rendered DOM)
- Runs locally only — no Vercel deployment
- Sibling project: `kb-creator` (prod) — identical codebase, kept in sync manually; see "Two-repo workflow" below

## Commands

```bash
npm run dev          # start dev server on port 3000 (pinned)
npm run dev:fresh    # kill port 3000 first, then start
npm run build        # production build (run before declaring a change done)
npm run lint         # ESLint
```

No test suite exists. Lint + build + manual browser verification are the gates.

## Two-repo workflow

`kb-hub` is **dev**, `kb-creator` is **prod**. New features are built and tested in `kb-hub` first, then copied file-by-file to `kb-creator` once stable. `README.md` and `CLAUDE.md` are the only files expected to differ between the two repos (they document each project's own role) — everything else should be identical. Use `compare-repos.sh` (kept on Desktop) to verify sync before ending a session.

## Architecture

### Pages and routes

| Path | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Form + live preview — the main authoring UI. Hero is compact; ticket number is shown as a read-only field inside Step 1 (not in the header). |
| `/library` | `app/library/page.tsx` | Browse all articles. Search, filter, "Show: N" pagination, Total/Published/Draft counts, per-row Edit/Word/PDF/Archive icons. |
| `/library/[id]` | `app/library/[id]/page.tsx` | Read-only article detail — sidebar (status, version, engineer, dates), Copy MD / Export Word / Export PDF, Edit & Republish, Version History. Supports `?autoexport=pdf` to auto-trigger PDF export on load (used by the library row icon). |
| `/library/[id]/edit` | `app/library/[id]/edit/page.tsx` | Full 4-step wizard pre-filled with the article's current data. Behaves differently for drafts vs published articles — see "Draft vs published editing" below. |
| `/library/[id]/versions` | `app/library/[id]/versions/page.tsx` | Version history sidebar + read-only content viewer + Restore (loads a past version into the edit page without saving). |
| `/library/archived` | `app/library/archived/page.tsx` | Permanently archived articles with a Restore button (restores to `kb_articles` as published, preserving original version). |
| `/generate-kb-article/[ticket]` | `app/generate-kb-article/[ticket]/page.tsx` | Legacy standalone article view by ticket ID; largely superseded by `/library/[id]`. |

### API routes (all server-side)

| Route | Purpose |
|---|---|
| `POST /api/generate-kb` | Calls Claude to generate KB article markdown. Strips any leaked MCP tool-call XML from the response. |
| `GET /api/library/list` | List all articles from SQLite. Calls `syncFromJson()` first. |
| `POST /api/library/save` | Insert or update an article. Accepts `status: "draft" \| "published"`. Only `published` saves create a `kb_revisions` snapshot and bump `current_version` — drafts never touch revisions. |
| `GET /api/library/article/[id]` | Fetch one article by ID, including `last_modified_by` derived from the latest revision. |
| `POST /api/library/republish/[id]` | Used only for already-published articles. Always creates a new revision + increments version. |
| `GET /api/library/versions/[id]` | List all revisions for an article, plus the latest version number. |
| `POST /api/library/archive/[id]` | Immediately moves an article to `kb_archived_articles` (no delay). |
| `GET /api/library/archived` | List permanently archived articles. |
| `POST /api/library/restore/[id]` | Move an archived article back to `kb_articles` as published, preserving its `current_version`. |
| `DELETE /api/library/discard/[id]` | Permanently delete a draft (rejects if the article is not a draft). |
| `GET /api/library/check-ticket` | Check whether a ticket ID already exists (used by `makeUniqueTicketNumber()`). |
| `POST /api/export/docx` | Generate and return a branded `.docx` file. Accepts an optional `ticket` used in the document header (falls back to `PROJECT_TITLE`). |

### Key library files

- **`lib/anthropic.ts`** — Anthropic client, system prompt builder, `generateKBArticle()`. The system prompt enforces fixed section order (Title → Summary → Symptoms → Cause → Resolution → Applies To → FAQ → References → AWS Documentation Tool Usage → Keywords). Tone is determined by audience via `AUDIENCE_TONE_MAP`. Post-processes the response to strip any `<function_calls>`/`<invoke>` XML that leaks into text when the AWS MCP tool is used, and trims any preamble before the first `#` heading.
- **`lib/db/index.ts`** — All SQLite operations (singleton `getDb()`, schema init, CRUD, archive/restore, revisions, JSON export/import). `saveArticle()` only creates a revision when `status === "published"`; this is the mechanism that keeps drafts version-free. `syncFromJson()` merges JSON into SQLite on every list/article load (newer `updated_at` wins); `importFromJsonIfEmpty()` is a lighter one-time seed used elsewhere.
- **`lib/similarity.ts`** — Client-side duplicate-detection scoring (Jaccard similarity on title/symptoms/keywords + exact match on issue/entity type). Used by `SimilarArticles.tsx`.
- **`lib/types.ts`** — Shared TypeScript types: `KBFormFields` (includes `engineerName`, `engineerEmail`, `referenceLinks`, `diagramImage`), `KBImage`, `DiagramImage`, `ReferenceLink`, `ArticleTone`, `Audience`.
- **`lib/brand.ts`** — Single source of truth for branding: `COMPANY` ("Commvault"), `PRODUCT` ("Clumio"), `PROJECT_TITLE` ("Clumio Atlas"), logo SVGs, footer links, social links, `LOGO_PNG_DATA_URI` for docx. Import from here for any UI or export that shows brand elements — never hardcode a project name in a component.
- **`lib/docxExport.ts`** — Word document generation. `buildKBDocx(markdown, images, ticket?)` — header shows the Commvault wordmark + "Commvault | Clumio" + the passed ticket ID (or `PROJECT_TITLE` if omitted).
- **`lib/imageTokens.ts`** / **`lib/keywordCheck.ts`** — screenshot token helpers / keyword validation.

### Components

- **`KBForm.tsx`** — 4-step wizard: Basics → Symptoms & Cause → Resolution → Review. Basics includes Name/Email, a read-only "KB Article Number" field (the ticket, generated via `makeUniqueTicketNumber()`), Title, and the workflow/diagnostic file uploader (`DiagramUploader`). Draft form state auto-saved to `localStorage` under `kb-creator-draft-v2` (diagramImage excluded — base64 would blow the quota). Renders `<SimilarArticles>` below the Generate/Regenerate button on every step (outside the button's flex row — do not nest it inside, it breaks button layout).
- **`KBPreview.tsx`** — Renders generated markdown. Bottom action row: Copy MD, **Save as Draft** (only rendered if `onSaveDraft` prop is passed), Publish/Republish (`publishLabel` customizes the text), Go to Library, New Article. Handles Word/PDF export when used from the article detail page.
- **`SimilarArticles.tsx`** — Fetches `/kb-articles.json` (served from `public/`) and shows up to 5 similar articles based on live form field values, debounced 600ms. Dismissible.

### Database schema

Four tables in `kb-hub.db` (project root, gitignored — never commit the binary):

- **`kb_articles`** — active articles. `status`: `draft` | `published` | `archived`. `current_version` defaults to 1 and is meaningless until the article is actually published — the UI hides the version badge for drafts.
- **`kb_archived_articles`** — permanently archived (moved here immediately on archive, not after a delay — an earlier 3-day-delay design was removed).
- **`kb_revisions`** — one row per **published** version. Never touched by draft saves. `version_number`, `changed_by`, `change_note`, full field snapshot.
- **`kb_reference_links`** — reference links per article (internal/external flag).

**Git sync pattern**: `kb-articles.json` (project root **and** `public/`) is the human-readable export teammates pick up on `git pull`. `exportToJson()` writes both copies on every save — the `public/` copy is what `SimilarArticles.tsx` fetches client-side. `syncFromJson()` runs on every list/article-detail load and merges by `updated_at`, so teammates' new articles appear without needing an empty database.

### Draft vs published editing

This is the trickiest area of the codebase — read carefully before touching the save/publish flow:

- **New article, not yet saved** → `KBPreview` shows Save as Draft + Publish. Both call `/api/library/save` with `status: "draft"` or `"published"` respectively.
- **Draft, opened via `/library/[id]/edit`** → `articleStatus === "draft"` is tracked in local state. The preview's `onSave` is `handlePublishDraft` (calls `/api/library/save` with `status: "published"`, NOT `/api/library/republish`) and `publishLabel` is simply `"Publish"`. `onSaveDraft` is also wired so the draft can be re-saved as a draft. The "Back to Article" nav link is hidden (there's no published detail page yet). A "Discard Draft" button calls `DELETE /api/library/discard/[id]`.
- **Published article, opened via `/library/[id]/edit`** → `onSave` is `handleRepublish` (always `/api/library/republish`, always creates a new revision), `publishLabel` is `` `Republish as v${currentVersion + 1}` ``, no Save as Draft, no Discard.
- **Why this split exists**: `saveArticle()` in `lib/db/index.ts` only creates a `kb_revisions` row when `status === "published"`. If a draft's first "Save as Draft" had gone through the same insert path used for publishing, and then Publish later went through `republish` (which always bumps version), the article would incorrectly land on v2 instead of v1. Do not merge these two flows without re-checking this.

### Article generation flow

1. `KBForm.tsx` collects fields → user clicks Generate.
2. `app/page.tsx` POSTs `{ fields, images }` to `/api/generate-kb`.
3. Route handler calls `generateKBArticle()` in `lib/anthropic.ts`.
4. If `useAwsDocs` is true, the AWS Knowledge MCP Server (`https://knowledge-mcp.global.api.aws`) is wired in via `mcp_servers` — requires beta header `mcp-client-2025-11-20`. The AWS Documentation Tool Usage note is placed *below* References in the output.
5. Claude returns markdown (any leaked tool-call XML stripped); `KBPreview.tsx` renders it.
6. User clicks Save as Draft or Publish → POST `/api/library/save` → SQLite + JSON export (both copies).
7. On the article detail page, Edit & Republish → `/library/[id]/edit` → Regenerate re-runs step 2–5 with updated fields → Publish/Republish → SQLite + JSON export.

### Image handling

Two distinct image types, kept strictly separate:

- **`DiagramImage`** (Step 1, Basics) — workflow/architecture diagrams, screenshots, or text files (TXT/RTF) uploaded for Claude to *analyze* as context. Sent as image or text content blocks; never embedded in the article output. PDFs are rasterized client-side to JPEG via `pdfjs-dist` before being sent (avoids "Could not process PDF" errors from malformed source PDFs).
- **`KBImage`** (Steps 2–3) — illustrative screenshots placed *inline* in the article via placeholder tokens. Tokens are injected into the generated markdown and replaced with actual `<img>` tags in `KBPreview.tsx`.

### Branding

All branding was overhauled in Phase 7 — the app previously used a hand-drawn inline SVG hexagon and the labels "KB-Creator" / "KB Hub". Current state:
- Logo: official Commvault wordmark SVG files in `public/` (`commvault-wordmark-white.svg` for dark headers, `commvault-wordmark-dark.svg` for light backgrounds, `commvault-icon.svg` for icon-only contexts) — loaded via `<img>`, not inline `dangerouslySetInnerHTML`.
- Every page header is now identical: logo (left) + "Clumio KB Atlas" two-tone label (right), zero nav buttons inside the black banner. Nav buttons live below the banner, left-aligned with content.
- `PROJECT_TITLE` in `lib/brand.ts` is `"Clumio Atlas"` — this is the current product name going forward. Do not reintroduce "KB Hub"/"KB Creator" into UI copy; those are legacy repo folder names only.

## Conventions

- Anthropic API is called server-side only — `ANTHROPIC_API_KEY` never reaches client components.
- The KB article's fixed section order lives in `lib/anthropic.ts` (`baseStructure()`). Change structure there, not in the UI.
- Audience drives tone automatically via `AUDIENCE_TONE_MAP` in `lib/types.ts` — don't let form consumers set tone independently.
- All branding changes go through `lib/brand.ts`. Never hardcode "KB Hub", "KB Creator", or the old inline SVG hexagon anywhere.
- `db/index.ts` is a synchronous SQLite module — no async/await inside query calls, no connection pooling. Keep it that way.
- When editing header/footer JSX by hand, watch for a recurring failure mode in this codebase: a leading `<a` or `<img` tag accidentally dropped during multi-file find/replace passes, leaving `href={...}` as the first line inside a fragment. Always re-view the file after a bulk edit before type-checking.
- `<SimilarArticles>` must render as a sibling after the Back/Next button `<div>` in `KBForm.tsx`, never nested inside it.

## Environment variables

- `ANTHROPIC_API_KEY` — required. Set in `.env.local` (gitignored; see `.env.example`).
