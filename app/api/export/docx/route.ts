import { NextRequest, NextResponse } from "next/server";
import { buildKBDocx } from "@/lib/docxExport";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const markdown: string = body.markdown || "";
    const images = Array.isArray(body.images) ? body.images : [];
    const filename: string = (body.filename || "kb-article").replace(/[^a-zA-Z0-9-_]/g, "");

    if (!markdown.trim()) {
      return NextResponse.json({ error: "No article content to export." }, { status: 400 });
    }

    const buffer = await buildKBDocx(markdown, images);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}.docx"`,
      },
    });
  } catch (err) {
    console.error("export/docx error:", err);
    return NextResponse.json({ error: "Failed to generate the Word document." }, { status: 500 });
  }
}
