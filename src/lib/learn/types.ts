export type UnitId = "fundamentals" | "technique" | "repertoire";

export type LessonKind = "video" | "reading" | "piece" | "practice";

export interface Lesson {
  id: string;
  unitId: UnitId;
  kind: LessonKind;
  title: string;
  subtitle?: string;
  xp: number;
  youtubeId?: string;
  body?: string[];
  tips?: string[];
  tabText?: string;
  milestone?: boolean;
}

export interface Unit {
  id: UnitId;
  title: string;
  description: string;
  lessons: Lesson[];
}
