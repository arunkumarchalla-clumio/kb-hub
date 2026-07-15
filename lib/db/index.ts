import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Database lives in the project root — committed to git as a binary,
// but the JSON export alongside it is what teammates actually share.
const DB_PATH = path.join(process.cwd(), "kb-hub.db");
const JSON_PATH = path.join(process.cwd(), "kb-articles.json");

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
      archived_by       TEXT NOT NULL DEFAULT ""
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

  if (existing) {
    // Save a revision snapshot before updating
    // Get the next version number for this article
const lastVersion = db
  .prepare("SELECT MAX(version_number) as maxv FROM kb_revisions WHERE article_id = ?")
  .get(article.id) as { maxv: number | null };
const nextVersion = (lastVersion?.maxv ?? 0) + 1;

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
  nextVersion,
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
  nextVersion === 1 ? "Initial publish" : `Updated to v${nextVersion}`
);

    const newVersion = (lastVersion?.maxv ?? 0) + 1;

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
  article.published_at, newVersion, article.id
   );
  } else {
    db.prepare(`
      INSERT INTO kb_articles (
        id, title, engineer_name, engineer_email,
        audience, issue_type, entity_type, category, product_version,
        status, symptoms, cause, resolution, keywords,
        markdown_content, use_aws_docs, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      article.id, article.title, article.engineer_name, article.engineer_email,
      article.audience, article.issue_type, article.entity_type,
      article.category, article.product_version, article.status,
      article.symptoms, article.cause, article.resolution,
      article.keywords, article.markdown_content, article.use_aws_docs,
      article.published_at
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
    articles: articles.map((a) => ({
      ...a,
      reference_links: linksByArticle[a.id] || [],
    })),
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(export_data, null, 2), "utf8");
}

// Import JSON into local SQLite — runs on startup if db is empty but JSON exists.
export function importFromJsonIfEmpty() {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as n FROM kb_articles").get() as { n: number }).n;
  if (count > 0) return;
  if (!fs.existsSync(JSON_PATH)) return;

  try {
    const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
    const insert = db.prepare(`
      INSERT OR IGNORE INTO kb_articles (
        id, title, engineer_name, engineer_email,
        audience, issue_type, entity_type, category, product_version,
        status, symptoms, cause, resolution, keywords,
        markdown_content, use_aws_docs, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction((articles: ArticleRecord[]) => {
      for (const a of articles) {
        insert.run(
          a.id, a.title, a.engineer_name, a.engineer_email,
          a.audience, a.issue_type, a.entity_type, a.category, a.product_version,
          a.status, a.symptoms, a.cause, a.resolution, a.keywords,
          a.markdown_content, a.use_aws_docs, a.created_at, a.updated_at, a.published_at
        );
      }
    });

    insertAll(data.articles || []);
    console.log(`[kb-hub] Imported ${data.articles?.length ?? 0} articles from kb-articles.json`);
  } catch (e) {
    console.error("[kb-hub] Failed to import from JSON:", e);
  }
}

// ── Archive operations ────────────────────────────────────────────────────────

// Step 1: Mark as archived in kb_articles (stays here for up to 3 days)
export function archiveArticle(id: string, archivedBy: string) {
  const db = getDb();
  db.prepare(`
    UPDATE kb_articles
    SET status = 'archived', archived_at = datetime('now'), archived_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(archivedBy, id);
  exportToJson();
}

// Step 2: Move articles archived >3 days ago to kb_archived_articles
// Called on library page load so it runs automatically.
export function moveExpiredArchives() {
  const db = getDb();

  const expired = db.prepare(`
    SELECT * FROM kb_articles
    WHERE status = 'archived'
    AND archived_at IS NOT NULL
    AND archived_at <= datetime('now', '-3 days')
  `).all() as ArticleRecord[];

  if (expired.length === 0) return;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO kb_archived_articles (
      id, title, engineer_name, engineer_email,
      audience, issue_type, entity_type, category, product_version,
      status, symptoms, cause, resolution, keywords,
      markdown_content, use_aws_docs, created_at, updated_at,
      published_at, archived_at, archived_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteStmt = db.prepare("DELETE FROM kb_articles WHERE id = ?");

  const moveAll = db.transaction((articles: ArticleRecord[]) => {
    for (const a of articles) {
      insert.run(
        a.id, a.title, a.engineer_name, a.engineer_email,
        a.audience, a.issue_type, a.entity_type,
        a.category, a.product_version, "archived",
        a.symptoms, a.cause, a.resolution,
        a.keywords, a.markdown_content, a.use_aws_docs,
        a.created_at, a.updated_at, a.published_at,
        (a as any).archived_at, (a as any).archived_by
      );
      deleteStmt.run(a.id);
    }
  });

  moveAll(expired);
  exportToJson();
}

export interface ArchivedArticleRecord extends ArticleRecord {
  archived_at: string;
  archived_by: string;
}

export function getArchivedArticles(): ArchivedArticleRecord[] {
  return getDb()
    .prepare("SELECT * FROM kb_archived_articles ORDER BY archived_at DESC")
    .all() as ArchivedArticleRecord[];
}
