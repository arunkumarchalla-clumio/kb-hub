import { NextRequest, NextResponse } from "next/server";
import { restoreArticle } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    restoreArticle(params.id);
    return NextResponse.json({ success: true, id: params.id });
  } catch (err) {
    console.error("[kb-hub] restore-article error:", err);
    return NextResponse.json(
      { error: "Failed to restore article." },
      { status: 500 }
    );
  }
}
