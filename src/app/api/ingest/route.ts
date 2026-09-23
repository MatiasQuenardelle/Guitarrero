import { NextResponse } from "next/server";
import { youtubeId } from "@/lib/studio/paths";
import { startIngest } from "@/lib/studio/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string; from?: string };
  const url = body.url?.trim() ?? "";
  const id = youtubeId(url);

  if (!id) {
    return NextResponse.json({ error: "Not a YouTube URL or video id" }, { status: 400 });
  }

  const canonical = /^https?:/.test(url) ? url : `https://www.youtube.com/watch?v=${id}`;
  startIngest(canonical, id, body.from);
  return NextResponse.json({ id });
}
