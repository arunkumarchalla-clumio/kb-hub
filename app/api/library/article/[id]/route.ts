import { NextRequest, NextResponse } from "next/server";
import { getArticleById, importFromJsonIfEmpty } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    importFromJsonIfEmpty();
    const article = getArticleById(params.id);
    if (!article) {
      return NextResponse.json(
        { error: "Article not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ article });
  } catch (err) {
    console.error("[kb-hub] get-article error:", err);
    return NextResponse.json(
      { error: "Failed to fetch article." },
      { status: 500 }
    );
  }
}
