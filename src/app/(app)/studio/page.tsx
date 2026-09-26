import NewProjectForm from "@/components/studio/NewProjectForm";
import ProjectList from "@/components/studio/ProjectList";
import { requireAdmin } from "@/lib/admin";
import { listPieces } from "@/lib/catalog/server";
import { listProjects } from "@/lib/studio/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Taller",
  description: "Turn a YouTube tab video into a playable score.",
};

export default function StudioPage() {
  requireAdmin();
  const projects = listProjects();

  return (
    <main>
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-400">Admin</p>
          <h1 className="font-display text-4xl font-medium text-cream-50">Taller</h1>
          <p className="mt-1 text-sm text-sand-400">
            Paste a YouTube tab video. It gets screenshotted, read, and turned into a score. Only
            what you publish reaches the Studio; this page exists only on your machine.
          </p>
        </div>
      </header>

      <NewProjectForm />
      <ProjectList
        initialProjects={projects}
        published={Object.fromEntries(listPieces().map((piece) => [piece.sourceProject, piece.slug]))}
      />
      </div>
    </main>
  );
}
