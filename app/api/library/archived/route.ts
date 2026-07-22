import { NextResponse } from "next/server";
import { getArchivedArticles, syncFromJson } from "@/lib/db";

export async function GET() {
  try {
    const articles = getArchivedArticles();
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("[kb-hub] archived-list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch archived articles." },
      { status: 500 }
    );
  }
}
