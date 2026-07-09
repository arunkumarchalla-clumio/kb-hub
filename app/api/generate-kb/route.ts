import { NextRequest, NextResponse } from "next/server";
import { generateKBArticle } from "@/lib/anthropic";
import type { GenerateKBRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateKBRequest;
    const { fields, images } = body;

    if (!fields || !fields.title?.trim()) {
      return NextResponse.json(
        { error: "A title is required to generate a KB article." },
        { status: 400 }
      );
    }

    const markdown = await generateKBArticle(
      fields,
      images || [],
      Array.isArray(fields.diagramImage) ? fields.diagramImage : []
    );
    return NextResponse.json({ markdown });
  } catch (err) {
    console.error("generate-kb error:", err);
    return NextResponse.json(
      { error: "Failed to generate the KB article. Please try again." },
      { status: 500 }
    );
  }
}
