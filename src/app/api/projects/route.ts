import { adminOnly } from "@/lib/admin";
import { NextResponse } from "next/server";
import { listProjects } from "@/lib/studio/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = adminOnly();
  if (denied) return denied;

  return NextResponse.json({ projects: listProjects() });
}
