import { NextResponse } from "next/server";
import { getAllArticles, importFromJsonIfEmpty, moveExpiredArchives } from "@/lib/db";

export async function GET() {
  try {
    importFromJsonIfEmpty();
    moveExpiredArchives();
    const articles = getAllArticles();
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("[kb-hub] list-articles error:", err);
    return NextResponse.json(
      { error: "Failed to fetch articles." },
      { status: 500 }
    );
  }
}
