"use client";

import { useEffect, useSyncExternalStore } from "react";
import { UNITS, ALL_LESSONS } from "@/lib/learn/content";
import {
  subscribeProgress,
  getProgressSnapshot,
  getDefaultProgress,
  getLessonState,
} from "@/lib/learn/progress";
import PathNode from "./PathNode";
import UnitHeader from "./UnitHeader";

const OFFSETS = [0, 56, 88, 56, 0, -56, -88, -56];

const UNIT_START_INDEX = UNITS.map((unit) =>
  ALL_LESSONS.findIndex((l) => l.id === unit.lessons[0].id)
);

export default function LearnPath() {
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getDefaultProgress
  );

  const currentLessonId = ALL_LESSONS.find(
    (l) => getLessonState(l.id, progress) === "unlocked"
  )?.id;

  useEffect(() => {
    const current = document.querySelector("[data-current]");
    current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentLessonId]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      {UNITS.map((unit, unitIndex) => {
        const completedCount = unit.lessons.filter((l) =>
          progress.completedLessonIds.includes(l.id)
        ).length;
        return (
          <section key={unit.id} className="mb-4">
            <UnitHeader unit={unit} index={unitIndex} completedCount={completedCount} />
            <div className="flex flex-col items-center py-6">
              {unit.lessons.map((lesson, lessonIndex) => (
                <PathNode
                  key={lesson.id}
                  lesson={lesson}
                  state={getLessonState(lesson.id, progress)}
                  offset={
                    OFFSETS[(UNIT_START_INDEX[unitIndex] + lessonIndex) % OFFSETS.length]
                  }
                  isCurrent={lesson.id === currentLessonId}
                />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
