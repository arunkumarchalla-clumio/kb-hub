import { NextRequest, NextResponse } from "next/server";
import { getDb, exportToJson } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const article = db.prepare("SELECT status FROM kb_articles WHERE id = ?").get(params.id) as { status: string } | undefined;

    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }
    if (article.status !== "draft") {
      return NextResponse.json({ error: "Only drafts can be discarded." }, { status: 400 });
    }

    db.prepare("DELETE FROM kb_articles WHERE id = ?").run(params.id);
    db.prepare("DELETE FROM kb_revisions WHERE article_id = ?").run(params.id);
    exportToJson();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[kb-hub] discard-draft error:", err);
    return NextResponse.json({ error: "Failed to discard draft." }, { status: 500 });
  }
}
