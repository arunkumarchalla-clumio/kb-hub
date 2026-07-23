# Clumio Atlas (dev — kb-hub)

**Knowledge Base article generation, library, and versioning for Commvault / Clumio support teams.**

Clumio Atlas turns a support ticket's details into a polished, consistently-structured Knowledge Base article using Claude, then stores it in a local SQLite database with full version history, drafts, and archiving — synced across the team via Git.

This repository (`kb-hub`) is the **dev** environment where new features are built and tested. Once stable, changes are promoted to `kb-creator`, the **prod** repository, which runs the identical codebase.

---

## What You Will Achieve

By the end of this guide you will have:

- Cloned the repository and installed dependencies
- Configured your Anthropic API key
- Launched the app at http://localhost:3000
- Generated, saved, and published your first KB article
- Understood how drafts, versions, archiving, and team sync work

---

## Requirements

| Requirement | Details |
|---|---|
| **macOS (Sonoma or later)** | Apple Silicon (M1/M2/M3) or Intel Mac |
| **Node.js v22 or later** | Required |
| **npm** | Bundled with Node.js |
| **Git** | Pre-installed on macOS |
| **Homebrew** | Needed to install Node.js 22 |
| **Anthropic API Key** | From [console.anthropic.com](https://console.anthropic.com) |
| **Internet connection** | Required for setup |

---

## Setup Steps

### 1. Install Homebrew (if needed)

```bash
brew --version
```

If missing:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js 22

```bash
node --version   # if v22.x.x or higher, skip ahead
brew install node@22
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
node --version
npm --version
```

### 3. Clone and install

```bash
cd ~/Downloads
git clone https://github.com/arunkumarchalla-clumio/kb-hub.git
cd kb-hub
npm install
```

### 4. Configure your API key

```bash
cp .env.example .env.local
open -e .env.local
```

Paste your key:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> 🔒 `.env.local` is gitignored — never commit it.

### 5. Launch

```bash
npm run dev
```

Open **http://localhost:3000**.

> 💡 Port 3000 is pinned. If it's busy: `lsof -ti :3000 | xargs kill -9`

### Subsequent launches

```bash
cd ~/Downloads/kb-hub
npm run dev
```

---

## How It Works

### Generating an article

1. Fill in the 4-step form: Basics → Symptoms & Cause → Resolution → Review
2. As you type a title, a **Similar Articles** panel appears below the Generate button if matching articles already exist — check it before generating to avoid duplicates
3. Click **Generate KB Article**

### Publishing vs saving a draft

After generation, the preview shows:

- **Save as Draft** — saves privately, no version history created, no "Published" badge. Shows up in the library with a `DRAFT` badge and an age warning if left untouched for 7+ days.
- **Publish** — saves as the article's `v1`, creates the first entry in its version history, redirects to the article detail page.

Drafts are edited and either re-saved as a draft, published (becomes v1), or permanently discarded via the **Discard Draft** button.

### Editing a published article

From the article detail page, click **Edit & Republish**:

1. The full 4-step wizard opens, pre-filled with the current content
2. Update any fields → click **Regenerate KB Article**
3. Click **Republish as vN** — this creates a new, permanent version snapshot and updates the article's current content
4. Every past version remains viewable and restorable at any time

### Version history

From any article, click **🕐 Version History** to see every published version with author, date, and change note. **Restore** loads a past version's content into the edit page — nothing is saved until you explicitly click Republish, so restoring never silently overwrites anything.

### Archiving

Click the archive icon on any library row to move an article to the permanent archive immediately (no delay). View archived articles at **http://localhost:3000/library/archived**, where each has a **Restore** button that brings it back to the library exactly as it was — including its original version number.

### Exporting

- **Copy MD** — copies the raw Markdown
- **Export Word (.docx)** — branded document with header/footer on every page, ticket ID shown in the header
- **Export PDF** — opens the print dialog with a branded, repeating header/footer
- From the **library table**, one-click Word and PDF icons are available per row without opening the article first

---

## Database

SQLite (`kb-hub.db`, gitignored) with four tables:

| Table | Purpose |
|---|---|
| `kb_articles` | Active articles — drafts, published, and recently-archived-but-not-yet-permanent |
| `kb_archived_articles` | Permanently archived articles |
| `kb_revisions` | One immutable snapshot per **published** version — drafts never appear here |
| `kb_reference_links` | Reference links per article |

Drafts never get a version number until they're published for the first time, at which point they become `v1`.

---

## Team Sync via Git

`kb-articles.json` (committed) is the shareable export of everything in `kb_articles` and `kb_archived_articles`. `kb-hub.db` (gitignored) is never committed.

**After publishing or saving articles:**

```bash
cd ~/Downloads/kb-hub
git add kb-articles.json
git commit -m "Add new KB articles"
git push
```

**To get teammates' new articles:**

```bash
git pull
```

The app automatically merges any new or updated articles from `kb-articles.json` into your local database on the next page load — your own unpublished local work is never overwritten.

---

## Key Pages

| URL | Purpose |
|---|---|
| `/` | Article generation |
| `/library` | Browse, search, filter, paginate all articles |
| `/library/[id]` | View a specific article, export, edit |
| `/library/[id]/edit` | Edit/regenerate/republish (or publish/discard if a draft) |
| `/library/[id]/versions` | Full version history + restore |
| `/library/archived` | Permanently archived articles + restore |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Port 3000 already in use | `lsof -ti :3000 \| xargs kill -9` then `npm run dev` |
| `node: command not found` | `source ~/.zshrc` or open a new terminal |
| API key error / 401 | Check `.env.local` — key must start with `sk-ant-` |
| `npm install` fails | Confirm `node --version` is v22+; try `npm install --legacy-peer-deps` |
| Blank screen / compile error | `rm -rf .next && npm run dev` |
| PDF export is blank | Confirm you're on the latest pulled code — this was a bug fixed by restoring a missing element id |
| Articles not syncing | `git pull`, then restart `npm run dev` |
| Draft shows wrong version after publishing | Confirm you're on the latest pulled code — this was a versioning bug that's since been fixed |

---

## Dev → Prod Workflow

This repo (`kb-hub`) is where features are built and tested. Once verified working:

```bash
# Copy changed files to kb-creator
cp <changed-file> ~/Downloads/kb-creator/<same-path>

cd ~/Downloads/kb-creator
npx tsc --noEmit    # verify
git add -A
git commit -m "Sync from kb-hub: <summary>"
git push
```

Run the repo comparison script periodically to confirm the two stay in sync (only `README.md` and `CLAUDE.md` are expected to differ):

```bash
bash ~/Downloads/compare-repos.sh
```

---

*Internal use only · Commvault / Clumio © 2026*
