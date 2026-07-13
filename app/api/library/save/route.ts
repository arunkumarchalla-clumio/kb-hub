import { NextRequest, NextResponse } from "next/server";
import { saveArticle, importFromJsonIfEmpty } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    importFromJsonIfEmpty();

    const body = await req.json();
    const { ticket, fields, markdown } = body;

    if (!ticket || !fields || !markdown) {
      return NextResponse.json(
        { error: "ticket, fields, and markdown are required." },
        { status: 400 }
      );
    }

    saveArticle({
      id: ticket,
      title: fields.title || "(untitled)",
      engineer_name: fields.engineerName || "",
      engineer_email: fields.engineerEmail || "",
      audience: fields.audience || "Internal",
      issue_type: fields.issueType || "",
      entity_type: fields.primaryEntityType || "",
      category: fields.category || "",
      product_version: fields.productVersion || "",
      status: "published",
      symptoms: fields.symptoms || "",
      cause: fields.cause || "",
      resolution: fields.resolutionSteps || "",
      keywords: fields.keywords || "",
      markdown_content: markdown,
      use_aws_docs: fields.useAwsDocs ? 1 : 0,
      published_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: ticket });
  } catch (err) {
    console.error("[kb-hub] save-article error:", err);
    return NextResponse.json(
      { error: "Failed to save article." },
      { status: 500 }
    );
  }
}
