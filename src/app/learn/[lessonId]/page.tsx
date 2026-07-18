import { notFound } from "next/navigation";
import { ALL_LESSONS, getLesson } from "@/lib/learn/content";
import TopBar from "@/components/learn/TopBar";
import LessonView from "@/components/learn/LessonView";

export function generateStaticParams() {
  return ALL_LESSONS.map((lesson) => ({ lessonId: lesson.id }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();

  return (
    <div className="min-h-screen bg-zinc-950">
      <TopBar />
      <LessonView lesson={lesson} />
    </div>
  );
}
