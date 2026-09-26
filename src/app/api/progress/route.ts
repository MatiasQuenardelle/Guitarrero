import { NextResponse } from "next/server";
import { ownerUser } from "@/lib/auth/owner";
import { getPiece } from "@/lib/catalog/server";
import { getProgress, updateProgress } from "@/lib/progress/server";
import type { ProgressUpdate } from "@/lib/progress/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await ownerUser();
  if (!user) return NextResponse.json({ progress: [] }, { status: 401 });
  return NextResponse.json({ progress: await getProgress(user.id) });
}

export async function POST(request: Request) {
  const user = await ownerUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = (await request.json()) as ProgressUpdate;
  if (typeof body.slug !== "string" || !getPiece(body.slug)) {
    return NextResponse.json({ error: "Unknown piece" }, { status: 400 });
  }
  if (body.favorite !== undefined && typeof body.favorite !== "boolean") {
    return NextResponse.json({ error: "Bad favorite" }, { status: 400 });
  }
  if (body.speed !== undefined && !(Number.isFinite(body.speed) && body.speed > 0 && body.speed <= 8)) {
    return NextResponse.json({ error: "Bad speed" }, { status: 400 });
  }

  await updateProgress(user.id, {
    slug: body.slug,
    favorite: body.favorite,
    speed: body.speed,
    opened: body.opened === true,
  });
  return NextResponse.json({ ok: true });
}
