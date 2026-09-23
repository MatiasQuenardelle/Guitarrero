import { NextResponse } from "next/server";
import { getProject, saveAlphaTex } from "@/lib/studio/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!getProject(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as { tex?: string };
  if (typeof body.tex !== "string") {
    return NextResponse.json({ error: "Missing tex" }, { status: 400 });
  }

  saveAlphaTex(id, body.tex);
  return NextResponse.json({ ok: true });
}
