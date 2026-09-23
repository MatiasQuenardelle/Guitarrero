import type { TabBar, TabScore } from "./types.ts";

export interface BarIssue {
  /** 1-based bar number, as shown in the player. */
  bar: number;
  /** Beats the bar should hold, in quarter notes. */
  expected: number;
  /** Beats it actually holds. */
  actual: number;
}

/** Length of a bar as written, in quarter notes. */
export function barLength(bar: TabBar): number {
  return bar.beats.reduce((total, beat) => {
    if (beat.grace) return total; // takes no time of its own
    const tuplet = beat.tuplet ? beat.tuplet[1] / beat.tuplet[0] : 1;
    return total + (4 / beat.duration) * (beat.dotted ? 1.5 : 1) * tuplet;
  }, 0);
}

/** Whether a bar adds up to its time signature. A sixteenth of slack absorbs rounding. */
export function barFits(bar: TabBar, [numerator, denominator]: [number, number]): boolean {
  return Math.abs(barLength(bar) - (numerator / denominator) * 4) <= 0.24;
}

/**
 * Rhythm is the least reliable part of a transcription: fret numbers are printed, note
 * durations have to be read off stems and beams. Bars that don't add up to their time
 * signature are where to look first.
 */
export function findBarIssues(score: TabScore): BarIssue[] {
  const issues: BarIssue[] = [];
  let [numerator, denominator] = score.timeSignature;

  score.bars.forEach((bar, index) => {
    if (bar.timeSignature) [numerator, denominator] = bar.timeSignature;

    const expected = (numerator / denominator) * 4;
    const actual = barLength(bar);

    if (!barFits(bar, [numerator, denominator])) {
      issues.push({
        bar: index + 1,
        expected: Number(expected.toFixed(2)),
        actual: Number(actual.toFixed(2)),
      });
    }
  });

  return issues;
}
