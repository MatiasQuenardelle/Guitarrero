export interface ChordDiagramData {
  name: string;
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  notes: string[];
}

const DIAGRAMS: Record<string, ChordDiagramData> = {
  // C variants
  "C":     { name: "C",     frets: [-1,3,2,0,1,0], fingers: [0,3,2,0,1,0], baseFret: 1, barres: [], notes: ["X","C","E","G","C","E"] },
  "Cm":    { name: "Cm",    frets: [-1,3,5,5,4,3], fingers: [0,1,3,4,2,1], baseFret: 1, barres: [1], notes: ["X","C","G","C","Eb","G"] },
  "C7":    { name: "C7",    frets: [-1,3,2,3,1,0], fingers: [0,3,2,4,1,0], baseFret: 1, barres: [], notes: ["X","C","E","Bb","C","E"] },
  "Cm7":   { name: "Cm7",   frets: [-1,3,5,3,4,3], fingers: [0,1,3,1,2,1], baseFret: 1, barres: [1], notes: ["X","C","G","Bb","Eb","G"] },
  "Cmaj7": { name: "Cmaj7", frets: [-1,3,2,0,0,0], fingers: [0,3,2,0,0,0], baseFret: 1, barres: [], notes: ["X","C","E","G","B","E"] },
  "Csus2": { name: "Csus2", frets: [-1,3,3,0,1,3], fingers: [0,2,3,0,1,4], baseFret: 1, barres: [], notes: ["X","C","G","C","D","G"] },
  "Csus4": { name: "Csus4", frets: [-1,3,3,0,1,1], fingers: [0,3,4,0,1,1], baseFret: 1, barres: [], notes: ["X","C","G","C","F","G"] },
  "Cdim":  { name: "Cdim",  frets: [-1,3,4,5,4,-1], fingers: [0,1,2,4,3,0], baseFret: 1, barres: [], notes: ["X","C","Gb","B","Eb","X"] },
  "Caug":  { name: "Caug",  frets: [-1,3,2,1,1,0], fingers: [0,4,3,2,1,0], baseFret: 1, barres: [], notes: ["X","C","E","G#","C","E"] },
  "Cadd9": { name: "Cadd9", frets: [-1,3,2,0,3,0], fingers: [0,2,1,0,3,0], baseFret: 1, barres: [], notes: ["X","C","E","G","D","E"] },

  // C# / Db variants
  "C#":     { name: "C#",     frets: [-1,4,3,1,2,1], fingers: [0,4,3,1,2,1], baseFret: 1, barres: [1], notes: ["X","C#","F","G#","C#","F"] },
  "Db":     { name: "Db",     frets: [-1,4,3,1,2,1], fingers: [0,4,3,1,2,1], baseFret: 1, barres: [1], notes: ["X","Db","F","Ab","Db","F"] },
  "C#m":    { name: "C#m",    frets: [-1,4,6,6,5,4], fingers: [0,1,3,4,2,1], baseFret: 1, barres: [1], notes: ["X","C#","G#","C#","E","G#"] },
  "Dbm":    { name: "Dbm",    frets: [-1,4,6,6,5,4], fingers: [0,1,3,4,2,1], baseFret: 1, barres: [1], notes: ["X","Db","Ab","Db","E","Ab"] },
  "C#7":    { name: "C#7",    frets: [-1,4,3,4,2,1], fingers: [0,3,2,4,1,1], baseFret: 1, barres: [], notes: ["X","C#","F","B","C#","F"] },
  "C#m7":   { name: "C#m7",   frets: [-1,4,2,4,5,4], fingers: [0,2,1,3,4,3], baseFret: 1, barres: [], notes: ["X","C#","E","B","C#","G#"] },

  // D variants
  "D":     { name: "D",     frets: [-1,-1,0,2,3,2], fingers: [0,0,0,1,3,2], baseFret: 1, barres: [], notes: ["X","X","D","A","D","F#"] },
  "Dm":    { name: "Dm",    frets: [-1,-1,0,2,3,1], fingers: [0,0,0,2,3,1], baseFret: 1, barres: [], notes: ["X","X","D","A","D","F"] },
  "D7":    { name: "D7",    frets: [-1,-1,0,2,1,2], fingers: [0,0,0,2,1,3], baseFret: 1, barres: [], notes: ["X","X","D","A","C","F#"] },
  "Dm7":   { name: "Dm7",   frets: [-1,-1,0,2,1,1], fingers: [0,0,0,2,1,1], baseFret: 1, barres: [], notes: ["X","X","D","A","C","F"] },
  "Dmaj7": { name: "Dmaj7", frets: [-1,-1,0,2,2,2], fingers: [0,0,0,1,1,1], baseFret: 1, barres: [1], notes: ["X","X","D","A","C#","F#"] },
  "Dsus2": { name: "Dsus2", frets: [-1,-1,0,2,3,0], fingers: [0,0,0,1,2,0], baseFret: 1, barres: [], notes: ["X","X","D","A","D","E"] },
  "Dsus4": { name: "Dsus4", frets: [-1,-1,0,2,3,3], fingers: [0,0,0,1,2,3], baseFret: 1, barres: [], notes: ["X","X","D","A","D","G"] },
  "Ddim":  { name: "Ddim",  frets: [-1,-1,0,1,3,1], fingers: [0,0,0,1,3,2], baseFret: 1, barres: [], notes: ["X","X","D","Ab","D","F"] },
  "Daug":  { name: "Daug",  frets: [-1,-1,0,3,3,2], fingers: [0,0,0,2,3,1], baseFret: 1, barres: [], notes: ["X","X","D","A#","D","F#"] },
  "Dadd9": { name: "Dadd9", frets: [-1,-1,0,2,3,0], fingers: [0,0,0,1,2,0], baseFret: 1, barres: [], notes: ["X","X","D","A","D","E"] },

  // D# / Eb variants
  "Eb":    { name: "Eb",    frets: [-1,-1,1,3,4,3], fingers: [0,0,1,2,4,3], baseFret: 1, barres: [], notes: ["X","X","Eb","Bb","Eb","G"] },
  "D#":    { name: "D#",    frets: [-1,-1,1,3,4,3], fingers: [0,0,1,2,4,3], baseFret: 1, barres: [], notes: ["X","X","D#","A#","D#","G"] },
  "Ebm":   { name: "Ebm",   frets: [-1,-1,1,3,4,2], fingers: [0,0,1,3,4,2], baseFret: 1, barres: [], notes: ["X","X","Eb","Bb","Eb","Gb"] },
  "D#m":   { name: "D#m",   frets: [-1,-1,1,3,4,2], fingers: [0,0,1,3,4,2], baseFret: 1, barres: [], notes: ["X","X","D#","A#","D#","F#"] },
  "Eb7":   { name: "Eb7",   frets: [-1,-1,1,3,2,3], fingers: [0,0,1,3,2,4], baseFret: 1, barres: [], notes: ["X","X","Eb","Bb","Db","G"] },
  "Ebm7":  { name: "Ebm7",  frets: [-1,-1,1,3,2,2], fingers: [0,0,1,4,2,3], baseFret: 1, barres: [], notes: ["X","X","Eb","Bb","Db","Gb"] },

  // E variants
  "E":     { name: "E",     frets: [0,2,2,1,0,0], fingers: [0,2,3,1,0,0], baseFret: 1, barres: [], notes: ["E","B","E","G#","B","E"] },
  "Em":    { name: "Em",    frets: [0,2,2,0,0,0], fingers: [0,2,3,0,0,0], baseFret: 1, barres: [], notes: ["E","B","E","G","B","E"] },
  "E7":    { name: "E7",    frets: [0,2,0,1,0,0], fingers: [0,2,0,1,0,0], baseFret: 1, barres: [], notes: ["E","B","D","G#","B","E"] },
  "Em7":   { name: "Em7",   frets: [0,2,0,0,0,0], fingers: [0,2,0,0,0,0], baseFret: 1, barres: [], notes: ["E","B","D","G","B","E"] },
  "Emaj7": { name: "Emaj7", frets: [0,2,1,1,0,0], fingers: [0,3,1,2,0,0], baseFret: 1, barres: [], notes: ["E","B","D#","G#","B","E"] },
  "Esus2": { name: "Esus2", frets: [0,2,4,4,0,0], fingers: [0,1,3,4,0,0], baseFret: 1, barres: [], notes: ["E","B","E","F#","B","E"] },
  "Esus4": { name: "Esus4", frets: [0,2,2,2,0,0], fingers: [0,2,3,4,0,0], baseFret: 1, barres: [], notes: ["E","B","E","A","B","E"] },
  "Edim":  { name: "Edim",  frets: [0,1,2,0,2,-1], fingers: [0,1,2,0,3,0], baseFret: 1, barres: [], notes: ["E","Bb","E","G","Bb","X"] },
  "Eaug":  { name: "Eaug",  frets: [0,3,2,1,1,0], fingers: [0,4,3,2,1,0], baseFret: 1, barres: [], notes: ["E","C","E","G#","C","E"] },
  "Eadd9": { name: "Eadd9", frets: [0,2,2,1,0,2], fingers: [0,2,3,1,0,4], baseFret: 1, barres: [], notes: ["E","B","E","G#","B","F#"] },

  // F variants
  "F":     { name: "F",     frets: [1,3,3,2,1,1], fingers: [1,3,4,2,1,1], baseFret: 1, barres: [1], notes: ["F","C","F","A","C","F"] },
  "Fm":    { name: "Fm",    frets: [1,3,3,1,1,1], fingers: [1,3,4,1,1,1], baseFret: 1, barres: [1], notes: ["F","C","F","Ab","C","F"] },
  "F7":    { name: "F7",    frets: [1,3,1,2,1,1], fingers: [1,3,1,2,1,1], baseFret: 1, barres: [1], notes: ["F","C","Eb","A","C","F"] },
  "Fm7":   { name: "Fm7",   frets: [1,3,1,1,1,1], fingers: [1,3,1,1,1,1], baseFret: 1, barres: [1], notes: ["F","C","Eb","Ab","C","F"] },
  "Fmaj7": { name: "Fmaj7", frets: [-1,-1,3,2,1,0], fingers: [0,0,3,2,1,0], baseFret: 1, barres: [], notes: ["X","X","F","A","C","E"] },
  "Fsus2": { name: "Fsus2", frets: [-1,-1,3,0,1,1], fingers: [0,0,3,0,1,1], baseFret: 1, barres: [], notes: ["X","X","F","C","F","G"] },
  "Fsus4": { name: "Fsus4", frets: [1,3,3,3,1,1], fingers: [1,2,3,4,1,1], baseFret: 1, barres: [1], notes: ["F","C","F","Bb","C","F"] },
  "Fdim":  { name: "Fdim",  frets: [-1,-1,3,1,0,1], fingers: [0,0,3,1,0,2], baseFret: 1, barres: [], notes: ["X","X","F","B","D","Ab"] },
  "Faug":  { name: "Faug",  frets: [-1,-1,3,2,2,1], fingers: [0,0,4,2,3,1], baseFret: 1, barres: [], notes: ["X","X","F","A","C#","F"] },
  "Fadd9": { name: "Fadd9", frets: [-1,-1,3,2,1,3], fingers: [0,0,3,2,1,4], baseFret: 1, barres: [], notes: ["X","X","F","A","C","G"] },

  // F# / Gb variants
  "F#":    { name: "F#",    frets: [2,4,4,3,2,2], fingers: [1,3,4,2,1,1], baseFret: 1, barres: [1], notes: ["F#","C#","F#","A#","C#","F#"] },
  "Gb":    { name: "Gb",    frets: [2,4,4,3,2,2], fingers: [1,3,4,2,1,1], baseFret: 1, barres: [1], notes: ["Gb","Db","Gb","Bb","Db","Gb"] },
  "F#m":   { name: "F#m",   frets: [2,4,4,2,2,2], fingers: [1,3,4,1,1,1], baseFret: 1, barres: [1], notes: ["F#","C#","F#","A","C#","F#"] },
  "Gbm":   { name: "Gbm",   frets: [2,4,4,2,2,2], fingers: [1,3,4,1,1,1], baseFret: 1, barres: [1], notes: ["Gb","Db","Gb","A","Db","Gb"] },
  "F#7":   { name: "F#7",   frets: [2,4,2,3,2,2], fingers: [1,3,1,2,1,1], baseFret: 1, barres: [1], notes: ["F#","C#","E","A#","C#","F#"] },
  "F#m7":  { name: "F#m7",  frets: [2,4,2,2,2,2], fingers: [1,3,1,1,1,1], baseFret: 1, barres: [1], notes: ["F#","C#","E","A","C#","F#"] },

  // G variants
  "G":     { name: "G",     frets: [3,2,0,0,0,3], fingers: [2,1,0,0,0,3], baseFret: 1, barres: [], notes: ["G","B","D","G","B","G"] },
  "Gm":    { name: "Gm",    frets: [3,5,5,3,3,3], fingers: [1,3,4,1,1,1], baseFret: 1, barres: [1], notes: ["G","D","G","Bb","D","G"] },
  "G7":    { name: "G7",    frets: [3,2,0,0,0,1], fingers: [3,2,0,0,0,1], baseFret: 1, barres: [], notes: ["G","B","D","G","B","F"] },
  "Gm7":   { name: "Gm7",   frets: [3,5,3,3,3,3], fingers: [1,3,1,1,1,1], baseFret: 1, barres: [1], notes: ["G","D","F","Bb","D","G"] },
  "Gmaj7": { name: "Gmaj7", frets: [3,2,0,0,0,2], fingers: [3,1,0,0,0,2], baseFret: 1, barres: [], notes: ["G","B","D","G","B","F#"] },
  "Gsus2": { name: "Gsus2", frets: [3,0,0,0,3,3], fingers: [1,0,0,0,2,3], baseFret: 1, barres: [], notes: ["G","A","D","G","B","G"] },
  "Gsus4": { name: "Gsus4", frets: [3,3,0,0,1,3], fingers: [2,3,0,0,1,4], baseFret: 1, barres: [], notes: ["G","C","D","G","C","G"] },
  "Gdim":  { name: "Gdim",  frets: [3,4,5,3,5,-1], fingers: [1,2,3,1,4,0], baseFret: 1, barres: [], notes: ["G","Db","F","Bb","Db","X"] },
  "Gaug":  { name: "Gaug",  frets: [3,2,1,0,0,3], fingers: [3,2,1,0,0,4], baseFret: 1, barres: [], notes: ["G","B","D#","G","B","G"] },
  "Gadd9": { name: "Gadd9", frets: [3,2,0,2,0,3], fingers: [2,1,0,3,0,4], baseFret: 1, barres: [], notes: ["G","B","D","A","B","G"] },

  // G# / Ab variants
  "Ab":    { name: "Ab",    frets: [4,6,6,5,4,4], fingers: [1,3,4,2,1,1], baseFret: 1, barres: [1], notes: ["Ab","Eb","Ab","C","Eb","Ab"] },
  "G#":    { name: "G#",    frets: [4,6,6,5,4,4], fingers: [1,3,4,2,1,1], baseFret: 1, barres: [1], notes: ["G#","D#","G#","C","D#","G#"] },
  "Abm":   { name: "Abm",   frets: [4,6,6,4,4,4], fingers: [1,3,4,1,1,1], baseFret: 1, barres: [1], notes: ["Ab","Eb","Ab","B","Eb","Ab"] },
  "G#m":   { name: "G#m",   frets: [4,6,6,4,4,4], fingers: [1,3,4,1,1,1], baseFret: 1, barres: [1], notes: ["G#","D#","G#","B","D#","G#"] },
  "Ab7":   { name: "Ab7",   frets: [4,6,4,5,4,4], fingers: [1,3,1,2,1,1], baseFret: 1, barres: [1], notes: ["Ab","Eb","Gb","C","Eb","Ab"] },
  "Abm7":  { name: "Abm7",  frets: [4,6,4,4,4,4], fingers: [1,3,1,1,1,1], baseFret: 1, barres: [1], notes: ["Ab","Eb","Gb","B","Eb","Ab"] },

  // A variants
  "A":     { name: "A",     frets: [-1,0,2,2,2,0], fingers: [0,0,1,2,3,0], baseFret: 1, barres: [], notes: ["X","A","E","A","C#","E"] },
  "Am":    { name: "Am",    frets: [-1,0,2,2,1,0], fingers: [0,0,2,3,1,0], baseFret: 1, barres: [], notes: ["X","A","E","A","C","E"] },
  "A7":    { name: "A7",    frets: [-1,0,2,0,2,0], fingers: [0,0,1,0,2,0], baseFret: 1, barres: [], notes: ["X","A","E","G","C#","E"] },
  "Am7":   { name: "Am7",   frets: [-1,0,2,0,1,0], fingers: [0,0,2,0,1,0], baseFret: 1, barres: [], notes: ["X","A","E","G","C","E"] },
  "Amaj7": { name: "Amaj7", frets: [-1,0,2,1,2,0], fingers: [0,0,2,1,3,0], baseFret: 1, barres: [], notes: ["X","A","E","G#","C#","E"] },
  "Asus2": { name: "Asus2", frets: [-1,0,2,2,0,0], fingers: [0,0,1,2,0,0], baseFret: 1, barres: [], notes: ["X","A","E","A","B","E"] },
  "Asus4": { name: "Asus4", frets: [-1,0,2,2,3,0], fingers: [0,0,1,2,3,0], baseFret: 1, barres: [], notes: ["X","A","E","A","D","E"] },
  "Adim":  { name: "Adim",  frets: [-1,0,1,2,1,-1], fingers: [0,0,1,3,2,0], baseFret: 1, barres: [], notes: ["X","A","Eb","A","C","X"] },
  "Aaug":  { name: "Aaug",  frets: [-1,0,3,2,2,1], fingers: [0,0,4,3,2,1], baseFret: 1, barres: [], notes: ["X","A","F","A","C#","F"] },
  "Aadd9": { name: "Aadd9", frets: [-1,0,2,4,2,0], fingers: [0,0,1,3,2,0], baseFret: 1, barres: [], notes: ["X","A","E","B","C#","E"] },

  // A# / Bb variants
  "Bb":    { name: "Bb",    frets: [-1,1,3,3,3,1], fingers: [0,1,2,3,4,1], baseFret: 1, barres: [1], notes: ["X","Bb","F","Bb","D","F"] },
  "A#":    { name: "A#",    frets: [-1,1,3,3,3,1], fingers: [0,1,2,3,4,1], baseFret: 1, barres: [1], notes: ["X","A#","F","A#","D","F"] },
  "Bbm":   { name: "Bbm",   frets: [-1,1,3,3,2,1], fingers: [0,1,3,4,2,1], baseFret: 1, barres: [1], notes: ["X","Bb","F","Bb","Db","F"] },
  "A#m":   { name: "A#m",   frets: [-1,1,3,3,2,1], fingers: [0,1,3,4,2,1], baseFret: 1, barres: [1], notes: ["X","A#","F","A#","C#","F"] },
  "Bb7":   { name: "Bb7",   frets: [-1,1,3,1,3,1], fingers: [0,1,3,1,4,1], baseFret: 1, barres: [1], notes: ["X","Bb","F","Ab","D","F"] },
  "Bbm7":  { name: "Bbm7",  frets: [-1,1,3,1,2,1], fingers: [0,1,3,1,2,1], baseFret: 1, barres: [1], notes: ["X","Bb","F","Ab","Db","F"] },
  "Bbmaj7": { name: "Bbmaj7", frets: [-1,1,3,2,3,1], fingers: [0,1,3,2,4,1], baseFret: 1, barres: [1], notes: ["X","Bb","F","A","D","F"] },

  // B variants
  "B":     { name: "B",     frets: [-1,2,4,4,4,2], fingers: [0,1,2,3,4,1], baseFret: 1, barres: [1], notes: ["X","B","F#","B","D#","F#"] },
  "Bm":    { name: "Bm",    frets: [-1,2,4,4,3,2], fingers: [0,1,3,4,2,1], baseFret: 1, barres: [1], notes: ["X","B","F#","B","D","F#"] },
  "B7":    { name: "B7",    frets: [-1,2,1,2,0,2], fingers: [0,2,1,3,0,4], baseFret: 1, barres: [], notes: ["X","B","D#","A","B","F#"] },
  "Bm7":   { name: "Bm7",   frets: [-1,2,4,2,3,2], fingers: [0,1,3,1,2,1], baseFret: 1, barres: [1], notes: ["X","B","F#","A","D","F#"] },
  "Bmaj7": { name: "Bmaj7", frets: [-1,2,4,3,4,2], fingers: [0,1,3,2,4,1], baseFret: 1, barres: [1], notes: ["X","B","F#","A#","D#","F#"] },
  "Bsus2": { name: "Bsus2", frets: [-1,2,4,4,2,2], fingers: [0,1,3,4,1,1], baseFret: 1, barres: [1], notes: ["X","B","F#","B","C#","F#"] },
  "Bsus4": { name: "Bsus4", frets: [-1,2,4,4,5,2], fingers: [0,1,2,3,4,1], baseFret: 1, barres: [1], notes: ["X","B","F#","B","E","F#"] },
  "Bdim":  { name: "Bdim",  frets: [-1,2,3,4,3,-1], fingers: [0,1,2,4,3,0], baseFret: 1, barres: [], notes: ["X","B","F","A","D","X"] },
  "Baug":  { name: "Baug",  frets: [-1,2,1,0,0,3], fingers: [0,2,1,0,0,3], baseFret: 1, barres: [], notes: ["X","B","D#","G","B","G"] },

  // Common extended chords
  "A7sus4":  { name: "A7sus4",  frets: [-1,0,2,0,3,0], fingers: [0,0,1,0,3,0], baseFret: 1, barres: [], notes: ["X","A","E","G","D","E"] },
  "D/F#":    { name: "D/F#",    frets: [2,-1,0,2,3,2], fingers: [1,0,0,2,4,3], baseFret: 1, barres: [], notes: ["F#","X","D","A","D","F#"] },
  "G/B":     { name: "G/B",     frets: [-1,2,0,0,0,3], fingers: [0,1,0,0,0,2], baseFret: 1, barres: [], notes: ["X","B","D","G","B","G"] },
  "C/G":     { name: "C/G",     frets: [3,3,2,0,1,0], fingers: [3,4,2,0,1,0], baseFret: 1, barres: [], notes: ["G","C","E","G","C","E"] },
  "Am/G":    { name: "Am/G",    frets: [3,0,2,2,1,0], fingers: [4,0,3,2,1,0], baseFret: 1, barres: [], notes: ["G","A","E","A","C","E"] },
  "Em/D":    { name: "Em/D",    frets: [-1,-1,0,0,0,0], fingers: [0,0,0,0,0,0], baseFret: 1, barres: [], notes: ["X","X","D","G","B","E"] },
};

export function getChordDiagram(chordName: string): ChordDiagramData | null {
  // Direct lookup
  if (DIAGRAMS[chordName]) return DIAGRAMS[chordName];

  // Try normalized: min → m
  const normalized = chordName.replace("min", "m");
  if (DIAGRAMS[normalized]) return DIAGRAMS[normalized];

  // Strip trailing numbers for basic lookup (e.g., "Em7" → already there)
  return null;
}
