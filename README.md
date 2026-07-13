# KB-Hub

**Knowledge Base article library and team database for Commvault / Clumio.**

KB-Hub is the companion project to KB-Creator. While KB-Creator generates KB articles, KB-Hub stores them in a local SQLite database, lets you browse and search the full article library, archive old articles, and sync the library with your team via Git.

---

## Objective

This guide explains how to clone the KB-Hub project from GitHub, set it up on your local machine, and use it to manage your team's KB article library.

---

## What You Will Achieve

By the end of this guide you will have:

- Cloned the KB-Hub repository from GitHub to your local machine
- Installed all required dependencies (Node.js 22, npm packages)
- Configured your Anthropic API key in a local environment file
- Launched KB-Hub at http://localhost:3000
- Saved your first KB article to the library
- Understood how to sync articles with your team via Git

---

## Requirements

| Requirement | Details |
|---|---|
| **macOS (Sonoma or later)** | Apple Silicon (M1/M2/M3) or Intel Mac |
| **Node.js v22 or later** | Required by KB-Hub |
| **npm** | Bundled with Node.js — no separate install needed |
| **Git** | Pre-installed on macOS. Confirm with: `git --version` |
| **Homebrew** | macOS package manager — needed to install Node.js 22 |
| **Anthropic API Key** | Obtain from [console.anthropic.com](https://console.anthropic.com). Keep this private. |
| **Internet connection** | Required during setup to clone repo and install packages |

---

## Setup Steps

### 1. Install Homebrew (if not already installed)

Check if Homebrew is already installed:

```bash
brew --version
```

If you see a version number (e.g. `Homebrew 4.x.x`), skip to Step 2. Otherwise install it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

> 💡 After installation, Homebrew may ask you to run two additional commands to add it to your PATH. Follow the instructions it prints before continuing.

---

### 2. Install Node.js 22

Check your current Node.js version:

```bash
node --version
```

If the output shows `v22.x.x` or higher, skip to Step 3. Otherwise install Node.js 22:

```bash
brew install node@22
```

Add Node.js 22 to your PATH:

```bash
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify:

```bash
node --version   # should show v22.x.x
npm --version    # should show 10.x.x or higher
```

---

### 3. Clone the Repository

```bash
cd ~/Downloads
git clone https://github.com/arunkumarchalla-clumio/kb-hub.git
cd kb-hub
```

---

### 4. Install Project Dependencies

```bash
npm install
```

This will take 1–2 minutes on first run.

---

### 5. Configure Your Anthropic API Key

```bash
cp .env.example .env.local
open -e .env.local
```

Replace the placeholder with your real API key:

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Save and close the file.

> 🔒 Never commit `.env.local` to Git. It is already listed in `.gitignore`.

---

### 6. Launch the Application

```bash
npm run dev
```

Wait for the ready message:

```
▲ Next.js 14.2.35
  - Local: http://localhost:3000
 ✓ Ready in 1279ms
```

Open your browser and navigate to:

```
http://localhost:3000
```

> 💡 The server is pinned to port 3000. If another process is using it:
> ```bash
> lsof -ti :3000 | xargs kill -9
> ```

---

## Subsequent Launches

```bash
cd ~/Downloads/kb-hub
npm run dev
```

---

## How the Library Works

### Saving an Article

1. Generate an article in KB-Hub (same 4-step wizard as KB-Creator)
2. Click **Save to Library** in the article preview
3. The article is saved to your local SQLite database (`kb-hub.db`)
4. A `kb-articles.json` file is automatically exported — this is what you commit to Git

### Browsing the Library

Go to **http://localhost:3000/library** to see all saved articles. You can:

- Search by title, ID, or engineer name
- Filter by engineer, issue type, and status
- Click any row to view the full article
- Click the archive icon to archive an article

### Archiving Articles

- Clicking the archive icon sets the article status to **archived** — it stays visible in the library with an "archived" filter
- After **3 days**, archived articles are automatically moved to a separate archive table
- View permanently archived articles at **http://localhost:3000/library/archived**

### Exporting Articles

From the article detail page (`/library/KB-XXXX`):

- **Copy MD** — copies the Markdown to your clipboard
- **Export Word (.docx)** — downloads a branded Word document
- **Export PDF** — opens the print dialog with branded header/footer on every page

---

## Database Structure

KB-Hub uses a local SQLite database (`kb-hub.db`) with three tables:

| Table | Purpose |
|---|---|
| `kb_articles` | All active and archived (< 3 days) articles |
| `kb_archived_articles` | Articles archived for more than 3 days |
| `kb_revisions` | Revision history — snapshot saved on every update |

Each article stores: ticket ID, title, engineer name & email, audience, issue type, entity type, category, product version, status, symptoms, cause, resolution, keywords, full markdown content, and timestamps.

---

## Team Sync via Git

KB-Hub uses a two-file approach for team sharing:

| File | Purpose |
|---|---|
| `kb-hub.db` | Your local database — **gitignored**, never committed |
| `kb-articles.json` | Human-readable JSON export — **committed to Git** |

### Sharing new articles with the team

After saving articles, commit and push `kb-articles.json`:

```bash
cd ~/Downloads/kb-hub
git add kb-articles.json
git commit -m "Add new KB articles"
git push
```

### Getting articles from teammates

```bash
git pull
```

On the next page load, KB-Hub automatically imports any new articles from `kb-articles.json` into your local SQLite database.

---

## Keeping the Project Up to Date

```bash
cd ~/Downloads/kb-hub
git pull
npm install   # only needed if new packages were added
npm run dev
```

---

## Key Pages

| URL | Purpose |
|---|---|
| `http://localhost:3000/` | KB article generation (4-step wizard) |
| `http://localhost:3000/library` | Browse all saved articles |
| `http://localhost:3000/library/KB-XXXX` | View a specific article with export options |
| `http://localhost:3000/library/archived` | View permanently archived articles |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Port 3000 already in use | `lsof -ti :3000 \| xargs kill -9` then `npm run dev` |
| `node: command not found` | `source ~/.zshrc` or open a new terminal window |
| API key error / 401 | Check `.env.local` — ensure key starts with `sk-ant-` |
| `npm install` fails | Ensure `node --version` shows v22. Try: `npm install --legacy-peer-deps` |
| Blank screen / compile error | `rm -rf .next && npm run dev` |
| Articles not syncing | Make sure you `git pull` and restart `npm run dev` |

---

## Version Control

```bash
git add kb-articles.json
git commit -m "your message"
git push
```

> ⚠️ Only commit `kb-articles.json` — never commit `kb-hub.db` (it's gitignored). The `.env.local` file is also gitignored.

---

*Internal use only · Commvault / Clumio © 2026*
