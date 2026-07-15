import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const db = getDb();
    const inArticles = db
      .prepare("SELECT id FROM kb_articles WHERE id = ?")
      .get(id);
    const inArchived = db
      .prepare("SELECT id FROM kb_archived_articles WHERE id = ?")
      .get(id);

    return NextResponse.json({ exists: !!(inArticles || inArchived) });
  } catch (err) {
    console.error("[kb-hub] check-ticket error:", err);
    return NextResponse.json({ exists: false });
  }
}
