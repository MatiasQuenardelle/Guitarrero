import { notFound, redirect } from "next/navigation";
import StudioProject from "@/components/studio/StudioProject";
import { getProject, listProjects, projectSlugs, resolveProjectId } from "@/lib/studio/server";

export const dynamic = "force-dynamic";

export default async function StudioProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const id = resolveProjectId(projectId);
  if (!id) notFound();
  // Old links and the id the ingest form lands on: send them to the readable address.
  const slug = projectSlugs().get(id);
  if (slug && slug !== projectId) redirect(`/studio/${slug}`);

  const project = getProject(id);
  if (!project) notFound();

  // Keyed so switching tabs remounts with the new piece's state.
  return <StudioProject key={id} initial={project} projects={listProjects()} />;
}
