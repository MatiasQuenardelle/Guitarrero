import { NextResponse } from "next/server";
import { listProjects } from "@/lib/studio/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}
