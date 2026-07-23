import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Database lives in the project root — committed to git as a binary,
// but the JSON export alongside it is what teammates actually share.
const DB_PATH = path.join(process.cwd(), "kb-hub.db");
const JSON_PATH = path.join(process.cwd(), "kb-articles.json");
const JSON_PUBLIC_PATH = path.join(process.cwd(), "public", "kb-articles.json");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initialise(db);
  }
  return db;
}

function initialise(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_articles (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      engineer_name     TEXT NOT NULL DEFAULT "",
      engineer_email    TEXT NOT NULL DEFAULT "",
      audience          TEXT NOT NULL DEFAULT "Internal",
      issue_type        TEXT NOT NULL DEFAULT "",
      entity_type       TEXT NOT NULL DEFAULT "",
      category          TEXT NOT NULL DEFAULT "",
      product_version   TEXT NOT NULL DEFAULT "",
      status            TEXT NOT NULL DEFAULT "draft",
      symptoms          TEXT NOT NULL DEFAULT "",
      cause             TEXT NOT NULL DEFAULT "",
      resolution        TEXT NOT NULL DEFAULT "",
      keywords          TEXT NOT NULL DEFAULT "",
      markdown_content  TEXT NOT NULL DEFAULT "",
      use_aws_docs      INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
      published_at      TEXT,
      archived_at       TEXT,
      archived_by       TEXT NOT NULL DEFAULT "",
      current_version   INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS kb_reference_links (
      id          TEXT PRIMARY KEY,
      article_id  TEXT NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
      url         TEXT NOT NULL,
      label       TEXT NOT NULL DEFAULT "",
      is_internal INTEGER NOT NULL DEFAULT 0,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS kb_archived_articles (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      engineer_name     TEXT NOT NULL DEFAULT "",
      engineer_email    TEXT NOT NULL DEFAULT "",
      audience          TEXT NOT NULL DEFAULT "Internal",
      issue_type        TEXT NOT NULL DEFAULT "",
      entity_type       TEXT NOT NULL DEFAULT "",
      category          TEXT NOT NULL DEFAULT "",
      product_version   TEXT NOT NULL DEFAULT "",
      status            TEXT NOT NULL DEFAULT "archived",
      symptoms          TEXT NOT NULL DEFAULT "",
      cause             TEXT NOT NULL DEFAULT "",
      resolution        TEXT NOT NULL DEFAULT "",
      keywords          TEXT NOT NULL DEFAULT "",
      markdown_content  TEXT NOT NULL DEFAULT "",
      use_aws_docs      INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
      published_at      TEXT,
      archived_at       TEXT NOT NULL DEFAULT (datetime('now')),
      archived_by       TEXT NOT NULL DEFAULT "",
      current_version   INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS kb_revisions (
      id               TEXT PRIMARY KEY,
      article_id       TEXT NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
      version_number   INTEGER NOT NULL DEFAULT 1,
      title            TEXT NOT NULL DEFAULT "",
      engineer_name    TEXT NOT NULL DEFAULT "",
      engineer_email   TEXT NOT NULL DEFAULT "",
      audience         TEXT NOT NULL DEFAULT "Internal",
      issue_type       TEXT NOT NULL DEFAULT "",
      entity_type      TEXT NOT NULL DEFAULT "",
      category         TEXT NOT NULL DEFAULT "",
      product_version  TEXT NOT NULL DEFAULT "",
      symptoms         TEXT NOT NULL DEFAULT "",
      cause            TEXT NOT NULL DEFAULT "",
      resolution       TEXT NOT NULL DEFAULT "",
      keywords         TEXT NOT NULL DEFAULT "",
      markdown_content TEXT NOT NULL DEFAULT "",
      use_aws_docs     INTEGER NOT NULL DEFAULT 0,
      changed_by       TEXT NOT NULL DEFAULT "",
      change_note      TEXT NOT NULL DEFAULT "",
      published_at     TEXT NOT NULL DEFAULT (datetime('now')),
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ── Article operations ────────────────────────────────────────────────────────

export interface ArticleRecord {
  id: string;
  title: string;
  engineer_name: string;
  engineer_email: string;
  audience: string;
  issue_type: string;
  entity_type: string;
  category: string;
  product_version: string;
  status: string;
  symptoms: string;
  cause: string;
  resolution: string;
  keywords: string;
  markdown_content: string;
  use_aws_docs: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ReferenceLink {
  id: string;
  article_id: string;
  url: string;
  label: string;
  is_internal: number;
  sort_order: number;
}

export function saveArticle(article: Omit<ArticleRecord, "created_at" | "updated_at">) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM kb_articles WHERE id = ?")
    .get(article.id);

  const isPublishing = article.status === "published";
  let versionToSet = 1;

  // Only create a revision snapshot when the article is being published.
  // Drafts never touch kb_revisions — so saving/re-saving a draft, then
  // publishing it for the first time, correctly lands on v1 (not v2).
  if (isPublishing) {
    const lastVersion = db
      .prepare("SELECT MAX(version_number) as maxv FROM kb_revisions WHERE article_id = ?")
      .get(article.id) as { maxv: number | null };
    versionToSet = (lastVersion?.maxv ?? 0) + 1;

    db.prepare(`
      INSERT INTO kb_revisions (
        id, article_id, version_number,
        title, engineer_name, engineer_email,
        audience, issue_type, entity_type, category, product_version,
        symptoms, cause, resolution, keywords,
        markdown_content, use_aws_docs,
        changed_by, change_note, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      crypto.randomUUID(),
      article.id,
      versionToSet,
      article.title,
      article.engineer_name,
      article.engineer_email,
      article.audience,
      article.issue_type,
      article.entity_type,
      article.category,
      article.product_version,
      article.symptoms,
      article.cause,
      article.resolution,
      article.keywords,
      article.markdown_content,
      article.use_aws_docs,
      article.engineer_name,
      versionToSet === 1 ? "Initial publish" : `Updated to v${versionToSet}`
    );
  }

  if (existing) {
    db.prepare(`
      UPDATE kb_articles SET
        title = ?, engineer_name = ?, engineer_email = ?,
        audience = ?, issue_type = ?, entity_type = ?,
        category = ?, product_version = ?, status = ?,
        symptoms = ?, cause = ?, resolution = ?,
        keywords = ?, markdown_content = ?, use_aws_docs = ?,
        updated_at = datetime('now'), published_at = ?,
        current_version = ?
      WHERE id = ?
    `).run(
      article.title, article.engineer_name, article.engineer_email,
      article.audience, article.issue_type, article.entity_type,
      article.category, article.product_version, article.status,
      article.symptoms, article.cause, article.resolution,
      article.keywords, article.markdown_content, article.use_aws_docs,
      article.published_at, versionToSet, article.id
    );
  } else {
    db.prepare(`
      INSERT INTO kb_articles (
        id, title, engineer_name, engineer_email,
        audience, issue_type, entity_type, category, product_version,
        status, symptoms, cause, resolution, keywords,
        markdown_content, use_aws_docs, published_at, current_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      article.id, article.title, article.engineer_name, article.engineer_email,
      article.audience, article.issue_type, article.entity_type,
      article.category, article.product_version, article.status,
      article.symptoms, article.cause, article.resolution,
      article.keywords, article.markdown_content, article.use_aws_docs,
      article.published_at, versionToSet
    );
  }

  exportToJson();
}

export function getAllArticles(): ArticleRecord[] {
  return getDb()
    .prepare("SELECT * FROM kb_articles ORDER BY created_at DESC")
    .all() as ArticleRecord[];
}

export function getArticleById(id: string): ArticleRecord | undefined {
  return getDb()
    .prepare("SELECT * FROM kb_articles WHERE id = ?")
    .get(id) as ArticleRecord | undefined;
}

export interface RevisionRecord {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  engineer_name: string;
  engineer_email: string;
  audience: string;
  issue_type: string;
  entity_type: string;
  category: string;
  product_version: string;
  symptoms: string;
  cause: string;
  resolution: string;
  keywords: string;
  markdown_content: string;
  use_aws_docs: number;
  changed_by: string;
  change_note: string;
  published_at: string;
  created_at: string;
}

export function getVersions(articleId: string): RevisionRecord[] {
  return getDb()
    .prepare("SELECT * FROM kb_revisions WHERE article_id = ? ORDER BY version_number ASC")
    .all(articleId) as RevisionRecord[];
}

export function getLatestVersionNumber(articleId: string): number {
  const result = getDb()
    .prepare("SELECT MAX(version_number) as maxv FROM kb_revisions WHERE article_id = ?")
    .get(articleId) as { maxv: number | null };
  return result?.maxv ?? 0;
}

export function getVersionByNumber(articleId: string, versionNumber: number): RevisionRecord | undefined {
  return getDb()
    .prepare("SELECT * FROM kb_revisions WHERE article_id = ? AND version_number = ?")
    .get(articleId, versionNumber) as RevisionRecord | undefined;
}

// ── JSON export for Git sync ──────────────────────────────────────────────────
// Every save writes a human-readable JSON file that teammates get on git pull.
// They import it into their local SQLite automatically on first run.

export function exportToJson() {
  const db = getDb();
  const articles = db
    .prepare("SELECT * FROM kb_articles ORDER BY created_at DESC")
    .all() as ArticleRecord[];

  const archivedArticles = db
    .prepare("SELECT * FROM kb_archived_articles ORDER BY archived_at DESC")
    .all() as ArchivedArticleRecord[];

  const links = db
    .prepare("SELECT * FROM kb_reference_links ORDER BY article_id, sort_order")
    .all() as ReferenceLink[];

  const linksByArticle: Record<string, ReferenceLink[]> = {};
  for (const link of links) {
    if (!linksByArticle[link.article_id]) linksByArticle[link.article_id] = [];
    linksByArticle[link.article_id].push(link);
  }

  const export_data = {
    exported_at: new Date().toISOString(),
    article_count: articles.length,
    archived_count: archivedArticles.length,
    articles: articles.map((a) => ({
      ...a,
      reference_links: linksByArticle[a.id] || [],
    })),
    archived_articles: archivedArticles,
  };

  const jsonStr = JSON.stringify(export_data, null, 2);
  fs.writeFileSync(JSON_PATH, jsonStr, "utf8");
  // Also write to public/ so the client can fetch it for similarity search
  try {
    fs.mkdirSync(path.join(process.cwd(), "public"), { recursive: true });
    fs.writeFileSync(JSON_PUBLIC_PATH, jsonStr, "utf8");
  } catch { /* ignore if public/ not writable */ }
}

// Sync JSON into local SQLite — runs on every page load.
// Merges new and updated articles from kb-articles.json into local DB.
// Never overwrites local articles that are newer than the JSON version.
// Safe to run repeatedly — uses updated_at to detect changes.
export function syncFromJson() {
  if (!fs.existsSync(JSON_PATH)) return;
  const db = getDb();

  try {
    const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

    const upsertArticle = db.prepare(`
      INSERT INTO kb_articles (
        id, title, engineer_name, engineer_email,
        audience, issue_type, entity_type, category, product_version,
        status, symptoms, cause, resolution, keywords,
        markdown_content, use_aws_docs, created_at, updated_at, published_at,
        current_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        engineer_name = excluded.engineer_name,
        engineer_email = excluded.engineer_email,
        audience = excluded.audience,
        issue_type = excluded.issue_type,
        entity_type = excluded.entity_type,
        category = excluded.category,
        product_version = excluded.product_version,
        status = excluded.status,
        symptoms = excluded.symptoms,
        cause = excluded.cause,
        resolution = excluded.resolution,
        keywords = excluded.keywords,
        markdown_content = excluded.markdown_content,
        use_aws_docs = excluded.use_aws_docs,
        updated_at = excluded.updated_at,
        published_at = excluded.published_at,
        current_version = excluded.current_version
      WHERE excluded.updated_at > kb_articles.updated_at
    `);

    const upsertArchived = db.prepare(`
      INSERT OR IGNORE INTO kb_archived_articles (
        id, title, engineer_name, engineer_email,
        audience, issue_type, entity_type, category, product_version,
        status, symptoms, cause, resolution, keywords,
        markdown_content, use_aws_docs, created_at, updated_at, published_at,
        archived_at, archived_by, current_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const syncAll = db.transaction(() => {
      let synced = 0;
      for (const a of (data.articles || [])) {
        upsertArticle.run(
          a.id, a.title, a.engineer_name, a.engineer_email,
          a.audience, a.issue_type, a.entity_type, a.category, a.product_version,
          a.status, a.symptoms, a.cause, a.resolution, a.keywords,
          a.markdown_content, a.use_aws_docs, a.created_at, a.updated_at, a.published_at,
          a.current_version ?? 1
        );
        synced++;
      }
      for (const a of (data.archived_articles || [])) {
        upsertArchived.run(
          a.id, a.title, a.engineer_name, a.engineer_email,
          a.audience, a.issue_type, a.entity_type, a.category, a.product_version,
          a.status, a.symptoms, a.cause, a.resolution, a.keywords,
          a.markdown_content, a.use_aws_docs, a.created_at, a.updated_at, a.published_at,
          a.archived_at, a.archived_by, a.current_version ?? 1
        );
      }
      return synced;
    });

    syncAll();
  } catch (e) {
    console.error("[kb-hub] syncFromJson error:", e);
  }
}

// Import JSON into local SQLite — runs on startup if db is empty but JSON exists.
export function importFromJsonIfEmpty() {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as n FROM kb_articles").get() as { n: number }).n;
  if (count > 0) return;
  if (!fs.existsSync(JSON_PATH)) return;

  try {
    const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

    // Import published articles
    const insertArticle = db.prepare(`
      INSERT OR IGNORE INTO kb_articles (
        id, title, engineer_name, engineer_email,
        audience, issue_type, entity_type, category, product_version,
        status, symptoms, cause, resolution, keywords,
        markdown_content, use_aws_docs, created_at, updated_at, published_at,
        current_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertArchived = db.prepare(`
      INSERT OR IGNORE INTO kb_archived_articles (
        id, title, engineer_name, engineer_email,
        audience, issue_type, entity_type, category, product_version,
        status, symptoms, cause, resolution, keywords,
        markdown_content, use_aws_docs, created_at, updated_at, published_at,
        archived_at, archived_by, current_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction(() => {
      for (const a of (data.articles || [])) {
        insertArticle.run(
          a.id, a.title, a.engineer_name, a.engineer_email,
          a.audience, a.issue_type, a.entity_type, a.category, a.product_version,
          a.status, a.symptoms, a.cause, a.resolution, a.keywords,
          a.markdown_content, a.use_aws_docs, a.created_at, a.updated_at, a.published_at,
          a.current_version ?? 1
        );
      }
      for (const a of (data.archived_articles || [])) {
        insertArchived.run(
          a.id, a.title, a.engineer_name, a.engineer_email,
          a.audience, a.issue_type, a.entity_type, a.category, a.product_version,
          a.status, a.symptoms, a.cause, a.resolution, a.keywords,
          a.markdown_content, a.use_aws_docs, a.created_at, a.updated_at, a.published_at,
          a.archived_at, a.archived_by, a.current_version ?? 1
        );
      }
    });

    insertAll();
    console.log(`[kb-hub] Imported ${data.articles?.length ?? 0} articles and ${data.archived_articles?.length ?? 0} archived from kb-articles.json`);
  } catch (e) {
    console.error("[kb-hub] Failed to import from JSON:", e);
  }
}

// ── Archive operations ────────────────────────────────────────────────────────

// Archive article immediately — moves directly to kb_archived_articles.
// No delay — engineers expect archiving to take effect instantly.
export function archiveArticle(id: string, archivedBy: string) {
  const db = getDb();

  const article = db
    .prepare("SELECT * FROM kb_articles WHERE id = ?")
    .get(id) as ArticleRecord | undefined;

  if (!article) throw new Error(`Article ${id} not found`);

  // Move to archive table immediately — preserve current_version
  db.prepare(`
    INSERT OR REPLACE INTO kb_archived_articles (
      id, title, engineer_name, engineer_email,
      audience, issue_type, entity_type, category, product_version,
      status, symptoms, cause, resolution, keywords,
      markdown_content, use_aws_docs, created_at, updated_at,
      published_at, archived_at, archived_by, current_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
  `).run(
    article.id, article.title, article.engineer_name, article.engineer_email,
    article.audience, article.issue_type, article.entity_type,
    article.category, article.product_version, "archived",
    article.symptoms, article.cause, article.resolution,
    article.keywords, article.markdown_content, article.use_aws_docs,
    article.created_at, article.updated_at, article.published_at,
    archivedBy, (article as any).current_version ?? 1
  );

  // Remove from main table
  db.prepare("DELETE FROM kb_articles WHERE id = ?").run(id);

  exportToJson();
}

// moveExpiredArchives is kept for backward compatibility but is now a no-op
// since archiving is immediate.
export function moveExpiredArchives() {
  // No-op — archiving is now immediate, no delayed migration needed.
}

export interface ArchivedArticleRecord extends ArticleRecord {
  archived_at: string;
  archived_by: string;
  current_version: number;
}

export function getArchivedArticles(): ArchivedArticleRecord[] {
  return getDb()
    .prepare("SELECT * FROM kb_archived_articles ORDER BY archived_at DESC")
    .all() as ArchivedArticleRecord[];
}

// Restore an archived article back to published status in kb_articles
export function restoreArticle(id: string) {
  const db = getDb();

  const article = db
    .prepare("SELECT * FROM kb_archived_articles WHERE id = ?")
    .get(id) as ArchivedArticleRecord | undefined;

  if (!article) throw new Error(`Archived article ${id} not found`);

  // Re-insert into kb_articles as published — preserve original current_version
  db.prepare(`
    INSERT OR REPLACE INTO kb_articles (
      id, title, engineer_name, engineer_email,
      audience, issue_type, entity_type, category, product_version,
      status, symptoms, cause, resolution, keywords,
      markdown_content, use_aws_docs, created_at, updated_at,
      published_at, archived_at, archived_by, current_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, null, null, ?)
  `).run(
    article.id, article.title, article.engineer_name, article.engineer_email,
    article.audience, article.issue_type, article.entity_type,
    article.category, article.product_version, "published",
    article.symptoms, article.cause, article.resolution,
    article.keywords, article.markdown_content, article.use_aws_docs,
    article.created_at, article.published_at,
    article.current_version ?? 1
  );

  // Remove from archive table
  db.prepare("DELETE FROM kb_archived_articles WHERE id = ?").run(id);

  exportToJson();
}
