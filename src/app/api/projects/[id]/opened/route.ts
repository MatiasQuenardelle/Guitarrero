import { adminOnly } from "@/lib/admin";
import { NextResponse } from "next/server";
import { getProject, markOpened } from "@/lib/studio/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = adminOnly();
  if (denied) return denied;

  const { id } = await params;
  if (!getProject(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  markOpened(id);
  return NextResponse.json({ ok: true });
}
