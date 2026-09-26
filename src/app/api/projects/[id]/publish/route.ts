import { NextResponse } from "next/server";
import { adminOnly } from "@/lib/admin";
import { publishProject, type PublishOptions } from "@/lib/catalog/publish";

/** Studio → library: copies the project's current score into content/pieces/<slug>. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = adminOnly();
  if (denied) return denied;

  const { id } = await params;
  const options = (await request.json()) as PublishOptions;
  try {
    return NextResponse.json({ piece: publishProject(id, options) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
