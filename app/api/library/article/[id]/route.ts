import { NextRequest, NextResponse } from "next/server";
import { getArticleById, getVersions, importFromJsonIfEmpty } from "@/lib/db";

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

    // Get the latest revision to find who last modified the article
    const versions = getVersions(params.id);
    const latestRevision = versions.length > 0 ? versions[versions.length - 1] : null;
    const last_modified_by = latestRevision?.changed_by || article.engineer_name;

    return NextResponse.json({
      article: {
        ...article,
        last_modified_by,
      }
    });
  } catch (err) {
    console.error("[kb-hub] get-article error:", err);
    return NextResponse.json(
      { error: "Failed to fetch article." },
      { status: 500 }
    );
  }
}
