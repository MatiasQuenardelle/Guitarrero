import Link from "next/link";
import NewProjectForm from "@/components/studio/NewProjectForm";
import ProjectList from "@/components/studio/ProjectList";
import { listProjects } from "@/lib/studio/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Studio — Guitarrero",
  description: "Turn a YouTube tab video into a playable score.",
};

export default function StudioPage() {
  const projects = listProjects();

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Studio</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Paste a YouTube tab video. It gets screenshotted, read, and turned into a score you
            can play, slow down and loop.
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm text-amber-400 hover:text-amber-300">
          ← Guitarrero
        </Link>
      </header>

      <NewProjectForm />
      <ProjectList initialProjects={projects} />
    </main>
  );
}
