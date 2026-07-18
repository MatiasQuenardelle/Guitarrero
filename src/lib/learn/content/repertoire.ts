import type { Unit } from "../types";

const SPANISH_ROMANCE_TAB = `Title: Spanish Romance (Part 1)
Artist: Anonymous

[Part A - E minor]
e|--7--7--7--|--5--5--5--|--3--3--3--|--2--2--2--|
B|----0--0---|----0--0---|----0--0---|----0--0---|
G|-----0---0-|-----0---0-|-----0---0-|-----0---0-|
D|-----------|-----------|-----------|-----------|
A|-----------|-----------|-----------|-----------|
E|--0--------|--0--------|--0--------|--0--------|

e|--0--0--0--|--2--2--2--|--3--3--3--|--2--2--0--|
B|----0--0---|----0--0---|----0--0---|----0--0---|
G|-----0---0-|-----0---0-|-----0---0-|-----0---0-|
D|-----------|-----------|-----------|-----------|
A|-----------|-----------|-----------|-----------|
E|--0--------|--0--------|--0--------|--0--------|`;

const LAGRIMA_TAB = `Title: Lagrima (opening excerpt)
Artist: Francisco Tarrega

[Part A - E major]
e|--7-----5-----|--4-----2-----|--0-----------|--------------|
B|-----0-----0--|-----0-----0--|-----0--2--0--|--0-----------|
G|--------------|--------------|--------------|--1-----------|
D|--------------|--------------|--------------|--2-----------|
A|--------------|--------------|--------------|--------------|
E|--0-----------|--0-----------|--0-----------|--0-----------|`;

const MINUET_IN_G_TAB = `Title: Minuet in G (opening excerpt)
Artist: J.S. Bach / Christian Petzold

[Part A]
e|--------------|--------------|--0-----0--2--|--3-----------|
B|--3-----0--1--|--3-----------|-----1--------|--------------|
G|-----0--------|-----0-----0--|--------------|--0-----0-----|
D|--0-----------|--------------|--0-----------|--------------|
A|--------------|--------------|--------------|--------------|
E|--------------|--3-----------|--------------|--3-----------|`;

export const REPERTOIRE: Unit = {
  id: "repertoire",
  title: "Classical Repertoire",
  description: "A graded path through the most beautiful pieces of the classical guitar, from first study to Capricho Árabe.",
  lessons: [
    {
      id: "rep-aguado-am",
      unitId: "repertoire",
      kind: "piece",
      title: "Study in A minor",
      subtitle: "Dionisio Aguado",
      xp: 25,
      youtubeId: "ny56CJVddXU",
      tips: [
        "A gentle waltz over open basses — perfect first piece.",
        "Let the bass notes ring under the melody.",
        "Aim for an even, unhurried three-beat feel.",
      ],
    },
    {
      id: "rep-carulli-andante",
      unitId: "repertoire",
      kind: "piece",
      title: "Andante in C, Op. 241 No. 2",
      subtitle: "Ferdinando Carulli",
      xp: 25,
      youtubeId: "BuCXtq8zwGI",
      tips: [
        "A staple student piece: melody and bass in dialogue.",
        "Practice hands separately at first — melody with rest stroke.",
        "Phrase in 4-bar sentences; breathe at the ends of phrases.",
      ],
    },
    {
      id: "rep-sor-op60-1",
      unitId: "repertoire",
      kind: "piece",
      title: "Study Op. 60 No. 1",
      subtitle: "Fernando Sor",
      xp: 25,
      youtubeId: "jdz0uk6evEM",
      tips: [
        "Sor's studies teach legato playing above all — connect every note.",
        "Keep the right hand quiet and close to the strings.",
        "Notice how the voices move: melody, middle, bass.",
      ],
    },
    {
      id: "rep-carcassi-1",
      unitId: "repertoire",
      kind: "piece",
      title: "Etude Op. 60 No. 1",
      subtitle: "Matteo Carcassi",
      xp: 25,
      youtubeId: "-FCBpTNM5s8",
      tips: [
        "Flowing arpeggios with a hidden melody on top — bring it out.",
        "Steady sixteenths: the metronome is your friend here.",
        "Prepare left-hand chord shapes a beat ahead.",
      ],
    },
    {
      id: "rep-lagrima",
      unitId: "repertoire",
      kind: "piece",
      title: "Lágrima",
      subtitle: "Francisco Tárrega",
      xp: 25,
      youtubeId: "z_dbUL9T4Yg",
      milestone: true,
      tabText: LAGRIMA_TAB,
      tips: [
        "'Teardrop' — Tárrega's most tender miniature. Sing the top voice.",
        "The E major section lies high on the neck: shift smoothly, no jerks.",
        "Rubato is welcome, but keep the pulse honest first.",
      ],
    },
    {
      id: "rep-sor-op35-22",
      unitId: "repertoire",
      kind: "piece",
      title: "Study in B minor, Op. 35 No. 22",
      subtitle: "Fernando Sor",
      xp: 25,
      youtubeId: "VawTqpJaE_c",
      tips: [
        "Famous as Segovia's Study No. 5 — melody floating over repeated chords.",
        "Balance: melody loud (a with rest stroke), accompaniment soft.",
        "Watch the half-barre passages — precision, not pressure.",
      ],
    },
    {
      id: "rep-romance-1",
      unitId: "repertoire",
      kind: "piece",
      title: "Spanish Romance (Part 1)",
      subtitle: "Anonymous",
      xp: 25,
      youtubeId: "diYzEvWQvPU",
      tabText: SPANISH_ROMANCE_TAB,
      tips: [
        "The most famous guitar melody in the world: p-a-m-i triplets throughout.",
        "The melody lives on the top string — let it sing over the arpeggio.",
        "Practice the right-hand pattern on open strings before adding the left hand.",
      ],
    },
    {
      id: "rep-adelita",
      unitId: "repertoire",
      kind: "piece",
      title: "Adelita",
      subtitle: "Francisco Tárrega",
      xp: 25,
      youtubeId: "iOd3bx2lMfs",
      tips: [
        "A mazurka in E minor — elegant, with slides and slurs.",
        "The grace notes are ornaments: melody first, decoration second.",
        "Study the E major middle section slowly; it shifts up the neck.",
      ],
    },
    {
      id: "rep-bach-minuet",
      unitId: "repertoire",
      kind: "piece",
      title: "Minuet in G",
      subtitle: "J.S. Bach / Petzold, BWV Anh. 114",
      xp: 25,
      youtubeId: "p1B71GKoYls",
      tabText: MINUET_IN_G_TAB,
      tips: [
        "Your first Baroque dance: two voices, melody and bass.",
        "Keep the bass line as musical as the melody — Bach demands both.",
        "Detach the repeated notes slightly for a dance-like lift.",
      ],
    },
    {
      id: "rep-carcassi-7",
      unitId: "repertoire",
      kind: "piece",
      title: "Etude Op. 60 No. 7",
      subtitle: "Matteo Carcassi",
      xp: 25,
      youtubeId: "RRAVzEeXEX4",
      tips: [
        "Fast scale bursts over chords — a right-hand alternation workout.",
        "Slow practice with strict i-m fingering pays off here.",
        "Shape each run toward its arrival note.",
      ],
    },
    {
      id: "rep-bach-bourree",
      unitId: "repertoire",
      kind: "piece",
      title: "Bourrée in E minor",
      subtitle: "J.S. Bach, BWV 996",
      xp: 25,
      youtubeId: "Ipo0ycATcNY",
      milestone: true,
      tips: [
        "The most famous Bach on guitar: two independent voices in counterpoint.",
        "Learn each voice alone — sing one while playing the other.",
        "Steady walking bass; the dance character comes from articulation.",
      ],
    },
    {
      id: "rep-romance-2",
      unitId: "repertoire",
      kind: "piece",
      title: "Spanish Romance (Part 2)",
      subtitle: "Anonymous — E major section",
      xp: 25,
      youtubeId: "diYzEvWQvPU",
      tips: [
        "The major-key section: same pattern, much harder left hand.",
        "Full barres at frets 2, 4 and 7 — your barre prep pays off now.",
        "Shift during the open-string moments to hide position changes.",
      ],
    },
    {
      id: "rep-lauro-vals",
      unitId: "repertoire",
      kind: "piece",
      title: "Vals Venezolano No. 2 'Andreína'",
      subtitle: "Antonio Lauro",
      xp: 25,
      youtubeId: "CZBr5rCV2Hk",
      tips: [
        "Venezuelan waltz rhythm: feel the 3/4 vs 6/8 hemiola.",
        "Lauro's basses swing — keep the thumb light and rhythmic.",
        "Memorize in short sections; the harmony guides your hands.",
      ],
    },
    {
      id: "rep-capricho-arabe",
      unitId: "repertoire",
      kind: "piece",
      title: "Capricho Árabe",
      subtitle: "Francisco Tárrega",
      xp: 25,
      youtubeId: "okgfUhQX7ac",
      milestone: true,
      tips: [
        "The summit of this path: barres, shifts, slurs and singing lines.",
        "Learn the opening cadenza freely — it is a written-out improvisation.",
        "Work in 4-bar chunks; polish tone before speed.",
      ],
    },
  ],
};
