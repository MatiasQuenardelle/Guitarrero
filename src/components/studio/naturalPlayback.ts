import type * as AlphaTabTypes from "@coderline/alphatab";

type AlphaTab = typeof AlphaTabTypes;
type MidiFile = AlphaTabTypes.midi.MidiFile;
type MidiEvent = AlphaTabTypes.midi.MidiEvent;
type NoteEvent = AlphaTabTypes.midi.NoteOnEvent;
type Note = AlphaTabTypes.model.Note;
type MidiTickLookup = AlphaTabTypes.midi.MidiTickLookup;

/** How long a string may keep ringing after it was plucked, if nothing stops it sooner. */
const MAX_RING_MS = 4000;
/** A chord's strings are released bass first, a few milliseconds apart, like a real hand. */
const ROLL_MS_PER_STRING = 6;
const ROLL_MAX_MS = 24;
/** Random-looking but repeatable, so every play of a tab sounds the same. */
const TIMING_JITTER_MS = 5;
const VELOCITY_JITTER = 4;

interface PlayedNote {
  on: NoteEvent;
  off: NoteEvent;
  note: Note | null;
  /** Tick where the lookup says the note's bar starts, for the metric accent. */
  barStart: number;
  barTempo: number;
  beatTicks: number;
}

/** A tiny deterministic hash of the note's position: -1..1. */
function jitter(tick: number, key: number, salt: number): number {
  let h = (tick * 374761393 + key * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/** Pairs every note-on with its note-off (first in, first out per channel and key). */
function pairNotes(alphaTab: AlphaTab, events: MidiEvent[]): PlayedNote[] {
  const { MidiEventType } = alphaTab.midi;
  const open = new Map<string, PlayedNote[]>();
  const played: PlayedNote[] = [];

  for (const event of events) {
    if (event.type !== MidiEventType.NoteOn && event.type !== MidiEventType.NoteOff) continue;
    const noteEvent = event as NoteEvent;
    const id = `${noteEvent.channel}:${noteEvent.noteKey}`;

    if (event.type === MidiEventType.NoteOn) {
      const entry: PlayedNote = {
        on: noteEvent,
        off: noteEvent,
        note: null,
        barStart: 0,
        barTempo: 120,
        beatTicks: 960,
      };
      const queue = open.get(id) ?? [];
      queue.push(entry);
      open.set(id, queue);
      played.push(entry);
    } else {
      const entry = open.get(id)?.shift();
      if (entry) entry.off = noteEvent;
    }
  }

  // A note-on that never got a note-off can't be reshaped safely.
  return played.filter((entry) => entry.off !== entry.on);
}

/**
 * Finds the score note behind a played MIDI note, which is what knows its string. Grace
 * notes sound before the beat the cursor sits on, so the next couple of beats are checked too.
 */
function attachScoreNotes(played: PlayedNote[], midi: MidiFile, tickCache: MidiTickLookup): void {
  const tracks = new Set([0]);
  let hint: AlphaTabTypes.midi.MidiTickLookupFindBeatResult | null = null;

  for (const entry of played) {
    const result = tickCache.findBeat(tracks, entry.on.tick - midi.tickShift, hint);
    if (!result) continue;
    hint = result;

    entry.barStart = result.masterBar.start + midi.tickShift;
    entry.barTempo = result.masterBar.tempo || 120;
    entry.beatTicks = (midi.division * 4) / (result.masterBar.masterBar.timeSignatureDenominator || 4);

    let beat: AlphaTabTypes.model.Beat | null = result.beat;
    for (let step = 0; beat && step < 3 && !entry.note; step++, beat = beat.nextBeat) {
      const matches = beat.notes.filter(
        (note) => note.calculateRealValue(false, true) === entry.on.noteKey,
      );
      if (matches.length === 1) entry.note = matches[0];
    }
  }
}

const msToTicks = (ms: number, tempo: number, division: number) =>
  Math.round((ms / 1000) * (tempo / 60) * division);

/** Notes that must stay exactly as short as written. */
function mustNotRing(note: Note): boolean {
  return (
    note.isStaccato ||
    note.isPalmMute ||
    note.isDead ||
    note.isTrill ||
    note.ornament !== 0 ||
    note.beat.notes.some((other) => other.isTrill || other.ornament !== 0)
  );
}

/**
 * A plucked nylon string keeps sounding until the same string is plucked again, a rest
 * silences the hand, or it simply dies away. alphaTab cuts every note at the end of its
 * written value (and ignores "let ring" in SongBook notation), which is what makes a tab
 * sound like a sequencer. This moves each note-off to where a guitarist's string would stop.
 */
function letStringsRing(alphaTab: AlphaTab, played: PlayedNote[], events: MidiEvent[], division: number): void {
  const { MidiEventType } = alphaTab.midi;
  const restTicks = events
    .filter((event) => event.type === MidiEventType.AlphaTabRest)
    .map((event) => event.tick);

  // Played order is tick order, so "the next one" is always further along the array.
  for (let i = 0; i < played.length; i++) {
    const entry = played[i];
    const { note } = entry;
    if (!note || mustNotRing(note)) continue;

    const start = entry.on.tick;
    let end = start + msToTicks(MAX_RING_MS, entry.barTempo, division);

    for (let j = i + 1; j < played.length; j++) {
      const later = played[j];
      if (later.on.tick >= end) break;
      if (later.on.tick <= start) continue;
      const sameString = later.note ? later.note.string === note.string : false;
      const sameKey = later.on.channel === entry.on.channel && later.on.noteKey === entry.on.noteKey;
      if (sameString || sameKey) {
        end = later.on.tick;
        break;
      }
    }

    const rest = restTicks.find((tick) => tick > start);
    if (rest !== undefined) end = Math.min(end, rest);

    // Only ever lengthen: ties and legato slides already reach further than their beat.
    if (end > entry.off.tick) entry.off.tick = end;
  }
}

/**
 * Dynamics a classical guitarist plays without thinking: the thumb's bass and the top
 * melody voice sing over the inner arpeggio, the downbeat leans a little, and no two
 * plucks are identical.
 */
function shapeVelocities(played: PlayedNote[]): void {
  for (const entry of played) {
    const { note } = entry;
    if (!note) continue;

    const chord = note.beat.notes;
    let adjust = 0;

    // alphaTab numbers strings from the lowest (1 = low E), the opposite of the tab.
    if (chord.length > 1) {
      const lowest = Math.min(...chord.map((other) => other.string));
      const top = Math.max(...chord.map((other) => other.string));
      if (note.string === lowest) adjust += 6;
      else if (note.string === top) adjust += 4;
      else adjust -= 6;
    } else if (note.string <= 3) {
      adjust += 5; // thumb
    } else if (note.string === 6) {
      adjust += 2; // melody on the high E
    } else {
      adjust -= 4; // inner fingers of an arpeggio
    }

    const positionInBar = entry.on.tick - entry.barStart;
    if (positionInBar === 0) adjust += 6;
    else if (positionInBar % entry.beatTicks === 0) adjust += 2;
    else adjust -= 2;

    adjust += Math.round(jitter(entry.on.tick, entry.on.noteKey, 1) * VELOCITY_JITTER);
    entry.on.noteVelocity = Math.max(20, Math.min(127, entry.on.noteVelocity + adjust));
  }
}

/** Rolls chords from the bass up and loosens the grid by a hair. */
function shapeTiming(played: PlayedNote[], division: number): void {
  const byTick = new Map<number, PlayedNote[]>();
  for (const entry of played) {
    const group = byTick.get(entry.on.tick) ?? [];
    group.push(entry);
    byTick.set(entry.on.tick, group);
  }

  for (const [tick, group] of byTick) {
    const tempo = group[0].barTempo;
    // Only ever later: an earlier pluck would land before the previous same-key note-off.
    const shift = Math.round(((jitter(tick, 0, 2) + 1) / 2) * msToTicks(TIMING_JITTER_MS, tempo, division));

    // A strum or brush the tab asks for is already spread out by alphaTab.
    const strummed = group.some((entry) => entry.note && entry.note.beat.brushType !== 0);
    const ordered = [...group].sort(
      (a, b) => (a.note?.string ?? 0) - (b.note?.string ?? 0),
    );

    ordered.forEach((entry, index) => {
      const roll = strummed || group.length < 2
        ? 0
        : msToTicks(Math.min(ROLL_MAX_MS, index * ROLL_MS_PER_STRING), tempo, division);
      entry.on.tick = Math.min(tick + shift + roll, entry.off.tick - 1);
    });
  }
}

/**
 * Reshapes alphaTab's generated MIDI so the tab sounds played rather than sequenced. Only
 * the audio changes: the score, the cursor and the tick lookup are untouched.
 */
export function makePlaybackNatural(
  alphaTab: AlphaTab,
  midi: MidiFile,
  tickCache: MidiTickLookup | null,
): void {
  if (!tickCache) return;
  const { MidiEventType } = alphaTab.midi;

  for (const track of midi.tracks) {
    const events = track.events;
    const played = pairNotes(alphaTab, events);
    if (played.length === 0) continue;

    attachScoreNotes(played, midi, tickCache);
    letStringsRing(alphaTab, played, events, midi.division);
    shapeVelocities(played);
    shapeTiming(played, midi.division);

    // Moving ticks broke the order the sequencer relies on. At a shared tick, a note-off
    // must come before a note-on of the same key or it would silence the new pluck.
    const rank = (event: MidiEvent) =>
      event.type === MidiEventType.NoteOff ? 0 : event.type === MidiEventType.NoteOn ? 2 : 1;
    events.sort((a, b) => a.tick - b.tick || rank(a) - rank(b));
  }
}
