import { NextRequest, NextResponse } from "next/server";
import { getVersions, getLatestVersionNumber } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const versions = getVersions(params.id);
    const latest = getLatestVersionNumber(params.id);
    return NextResponse.json({ versions, latest });
  } catch (err) {
    console.error("[kb-hub] get-versions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch versions." },
      { status: 500 }
    );
  }
}
