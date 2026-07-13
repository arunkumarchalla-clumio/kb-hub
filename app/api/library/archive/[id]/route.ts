import { NextRequest, NextResponse } from "next/server";
import { archiveArticle } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const archivedBy = body.archivedBy || "Unknown";
    archiveArticle(params.id, archivedBy);
    return NextResponse.json({ success: true, id: params.id });
  } catch (err) {
    console.error("[kb-hub] archive error:", err);
    return NextResponse.json(
      { error: "Failed to archive article." },
      { status: 500 }
    );
  }
}
