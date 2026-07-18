import type { Lesson, Unit } from "../types";
import { FUNDAMENTALS } from "./fundamentals";
import { TECHNIQUE } from "./technique";
import { REPERTOIRE } from "./repertoire";

export const UNITS: Unit[] = [FUNDAMENTALS, TECHNIQUE, REPERTOIRE];

export const ALL_LESSONS: Lesson[] = UNITS.flatMap((unit) => unit.lessons);

export function getLesson(id: string): Lesson | undefined {
  return ALL_LESSONS.find((lesson) => lesson.id === id);
}
