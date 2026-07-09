import { NextRequest, NextResponse } from "next/server";
import { generateKBArticle } from "@/lib/anthropic";
import type { GenerateKBRequest } from "@/lib/types";

// The AWS documentation tool can add several round trips before Claude
// finishes writing, so this needs more headroom than Vercel's 10s default.
// Requires a Vercel plan that allows a function duration this high — Hobby
// tops out lower, Pro allows up to 300s. Lower this if you're on Hobby.
export const maxDuration = 60;

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
