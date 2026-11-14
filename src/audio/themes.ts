/**
 * Regional themes as data. DESIGN.md section 9, docs/style-guide.md section 7.
 *
 * Time unit is one eighth note ("step"). A phrase is 4 bars = 32 steps. Note
 * tokens: `D5:3` is D in octave 5 for 3 steps, `-:2` is a 2-step rest, a bare
 * `A4` lasts one step.
 *
 * A theme is several sections (a main section, a variation with a second line
 * in harmony, a sparser section with a plucked guitar-like accompaniment and a
 * livelier one in the same key) that the music player plays in a shuffled
 * order. Kilnamoe is written out by hand. The other regions are built from a
 * lead tune and a bass line by the small composition helpers below, so each
 * has the same four sections in its own style.
 *
 * Boss music is derived from a section by `bossify`: about 1.3 times the tempo,
 * a kick and a snare-like hit, a driving bass, and a more insistent lead,
 * stepping up with each level.
 */

import type { RegionId } from '../core/types';

export type Voice = 'whistle' | 'recorder' | 'soft' | 'pluck' | 'guitar' | 'theremin' | 'pad' | 'detunedPad' | 'sub' | 'pulse' | 'bell';

/** What a track does in a section; boss versions treat roles differently. */
export type Role = 'lead' | 'harmony' | 'bass' | 'pad' | 'accompaniment';

export interface TrackDef {
  readonly role: Role;
  readonly voice: Voice;
  readonly gain: number;
  /** One 32-step phrase string per phrase of the section. */
  readonly phrases: readonly string[];
}

export type SectionKind = 'main' | 'harmony' | 'sparse' | 'lively';

export interface SectionDef {
  readonly id: string;
  readonly kind: SectionKind;
  readonly bpm: number;
  readonly tracks: readonly TrackDef[];
  /** Eight characters per bar: k kick, s snare, h hat, t tick, . rest. Repeats every bar. */
  readonly perc?: string;
  readonly percGain?: number;
}

export interface Theme {
  readonly sections: readonly SectionDef[];
  /** Wind noise under the whole theme (Nevada). */
  readonly wind?: boolean;
}

export const PHRASE_STEPS = 32;

// ---------------------------------------------------------------------------
// Note helpers
// ---------------------------------------------------------------------------

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const PITCH: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midiOf(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (m === null) throw new Error(`Bad note: ${name}`);
  return 12 * (Number(m[3]) + 1) + (PITCH[m[1] ?? ''] ?? 0) + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export function nameOf(midi: number): string {
  return `${NAMES[((midi % 12) + 12) % 12] ?? 'C'}${Math.floor(midi / 12) - 1}`;
}

interface Tok {
  readonly name: string;
  readonly steps: number;
}

const toks = (s: string): Tok[] =>
  s
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => {
      const [name = '-', len] = t.split(':');
      return { name, steps: len === undefined ? 1 : Number(len) };
    });

const str = (ts: readonly Tok[]): string => ts.map((t) => `${t.name}:${t.steps}`).join(' ');
const stepsOf = (s: string): number => toks(s).reduce((n, t) => n + t.steps, 0);

export type Mode = 'minor' | 'major' | 'dorian';
const MODES: Readonly<Record<Mode, readonly number[]>> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

/** All the notes of a key as MIDI numbers, low to high. */
function scaleNotes(root: string, mode: Mode): number[] {
  const r = ((midiOf(`${root}4`) % 12) + 12) % 12;
  const out: number[] = [];
  for (let m = 12; m < 120; m++) if (MODES[mode].includes((((m - r) % 12) + 12) % 12)) out.push(m);
  return out;
}

/** Index of the highest scale note at or below `midi`. */
const degreeBelow = (scale: readonly number[], midi: number): number => {
  let idx = 0;
  for (let i = 0; i < scale.length; i++) if ((scale[i] ?? 0) <= midi) idx = i;
  return idx;
};

// ---------------------------------------------------------------------------
// Composition helpers (phrase string in, phrase string out; length preserved)
// ---------------------------------------------------------------------------

/** A second line in harmony: thirds with the odd sixth below, or counter-movement against the lead. */
export function harmonise(phrase: string, root: string, mode: Mode, style: 'parallel' | 'counter'): string {
  const scale = scaleNotes(root, mode);
  // Consonant gaps in scale degrees below the lead: third, fifth, sixth, tenth.
  const consonant = [2, 5, 4, 9];
  let prevH = -1;
  let prevL = -1;
  let n = 0;
  return str(
    toks(phrase).map((t) => {
      if (t.name === '-') return t;
      const l = degreeBelow(scale, midiOf(t.name));
      let h: number;
      if (style === 'parallel' || prevH < 0) {
        h = l - (n % 4 === 3 ? 5 : 2);
      } else {
        // Prefer to move against the lead (or hold) as long as the gap stays consonant.
        const dir = Math.sign(l - prevL);
        const options = [prevH - dir, prevH, prevH - 2 * dir, prevH + dir, l - 2, l - 5].filter((c) => consonant.includes(l - c));
        h = options[0] ?? l - 2;
      }
      prevH = h;
      prevL = l;
      n++;
      return { name: nameOf(scale[Math.max(0, h)] ?? 60), steps: t.steps };
    }),
  );
}

/** A whistle's quick "cut": a note a degree above, a step before each long note. */
export function ornament(phrase: string, root: string, mode: Mode): string {
  const scale = scaleNotes(root, mode);
  const out: Tok[] = [];
  for (const t of toks(phrase)) {
    if (t.name === '-' || t.steps < 4) {
      out.push(t);
      continue;
    }
    const above = scale[degreeBelow(scale, midiOf(t.name)) + 1] ?? midiOf(t.name);
    out.push({ name: nameOf(above), steps: 1 }, { name: t.name, steps: t.steps - 1 });
  }
  return str(out);
}

/** Only the long notes; the rest become rests. */
export function thin(phrase: string): string {
  return str(toks(phrase).map((t) => (t.name !== '-' && t.steps < 3 ? { name: '-', steps: t.steps } : t)));
}

/** Every note replayed in pieces of `n` steps (an insistent lead, a driving bass). */
export function chop(phrase: string, n: number): string {
  const out: Tok[] = [];
  for (const t of toks(phrase)) {
    if (t.name === '-') {
      out.push(t);
      continue;
    }
    for (let left = t.steps; left > 0; left -= n) out.push({ name: t.name, steps: Math.min(n, left) });
  }
  return str(out);
}

/** The same notes an octave up. */
export function octaveUp(phrase: string): string {
  return str(toks(phrase).map((t) => (t.name === '-' ? t : { name: nameOf(midiOf(t.name) + 12), steps: t.steps })));
}

/** A broken chord over each bass note: root, fifth, octave, tenth, back down. */
export function arpeggio(bass: string, root: string, mode: Mode): string {
  const scale = scaleNotes(root, mode);
  const pattern = [0, 2, 4, 7, 4, 2];
  const out: Tok[] = [];
  for (const t of toks(bass)) {
    if (t.name === '-') {
      out.push(t);
      continue;
    }
    const base = degreeBelow(scale, midiOf(t.name)) + 7;
    for (let i = 0; i < t.steps; i++) out.push({ name: nameOf(scale[base + (pattern[i % pattern.length] ?? 0)] ?? 60), steps: 1 });
  }
  return str(out);
}

/** Repeat a one-bar pattern for each root: `bars('{}:1 -:1 ...', ['E2','A2'])`. */
export const bars = (pattern: string, roots: readonly string[]): string => roots.map((r) => pattern.replaceAll('{}', r)).join(' ');

// ---------------------------------------------------------------------------
// Boss versions
// ---------------------------------------------------------------------------

/** Tempo multiplier at each boss level (1 at the start of a boss, up at each phase change). */
export const BOSS_TEMPO = [1, 1.3, 1.38, 1.46] as const;
export const MAX_BOSS_LEVEL = BOSS_TEMPO.length - 1;
const BOSS_PERC = ['', 'k.s.k.s.', 'k.shk.sh', 'kkshkksh'] as const;

/**
 * The intense version of a section. `level` 1 is the start of a boss or set
 * piece: a kick and snare, an eighth-note driving bass and a lead that
 * re-strikes every other step. Level 2 doubles the lead an octave up and
 * thickens the bass; level 3 busies the percussion more.
 */
export function bossify(section: SectionDef, level: number, root: string, mode: Mode): SectionDef {
  const lv = Math.max(1, Math.min(MAX_BOSS_LEVEL, level));
  const tracks: TrackDef[] = [];
  for (const t of section.tracks) {
    switch (t.role) {
      case 'lead':
        tracks.push({ ...t, gain: t.gain * 1.1, phrases: t.phrases.map((p) => chop(p, 2)) });
        if (lv >= 2) tracks.push({ ...t, role: 'harmony', gain: t.gain * 0.4, phrases: t.phrases.map((p) => octaveUp(chop(p, 2))) });
        break;
      case 'bass':
        tracks.push({ role: 'bass', voice: 'pulse', gain: 0.2, phrases: t.phrases.map((p) => chop(p, 1)) });
        if (lv >= 2) tracks.push({ ...t, gain: t.gain * 0.55 });
        break;
      case 'pad':
        tracks.push({ ...t, gain: t.gain * 0.8 });
        break;
      case 'harmony':
        tracks.push({ ...t, phrases: t.phrases.map((p) => chop(p, 2)) });
        break;
      case 'accompaniment':
        break;
    }
  }
  void root;
  void mode;
  return { ...section, id: `${section.id}.boss${lv}`, bpm: section.bpm * (BOSS_TEMPO[lv] ?? 1.3), tracks, perc: BOSS_PERC[lv], percGain: 0.4 };
}

// ---------------------------------------------------------------------------
// Kilnamoe, written out: D minor, slow, a tin whistle over a drone.
// ---------------------------------------------------------------------------

const KILNAMOE_ROOT = 'D';
const KM: Mode = 'minor';

// Main melodies. A and B are the tune; the primed ones answer them and come to rest a little lower.
const KA = 'D5:3 F5:1 A5:4 G5:2 F5:2 E5:4 D5:2 E5:2 F5:2 A5:2 G5:6 -:2';
const KB = 'A5:3 C6:1 D6:4 C6:2 A5:2 G5:4 F5:2 G5:2 A5:2 F5:2 E5:4 D5:4';
const KA2 = 'D5:3 F5:1 A5:4 G5:2 F5:2 E5:3 F5:1 G5:2 E5:2 D5:2 C5:2 D5:6 -:2';
const KB2 = 'A5:3 G5:1 F5:4 G5:2 A5:2 C6:4 A5:2 G5:2 F5:2 E5:2 D5:4 C#5:2 D5:2';

const kilnamoeMain: SectionDef = {
  id: 'main',
  kind: 'main',
  bpm: 72,
  tracks: [
    { role: 'lead', voice: 'whistle', gain: 0.16, phrases: [KA, KB, KA2, KB2] },
    { role: 'pad', voice: 'pad', gain: 0.07, phrases: ['D3:32', 'D3:16 A#2:16', 'D3:32', 'D3:16 A#2:16'] },
    {
      role: 'bass',
      voice: 'sub',
      gain: 0.3,
      phrases: ['D2:8 D2:8 A#1:8 C2:8', 'F2:8 C2:8 A#1:8 A1:8', 'D2:8 A#1:8 C2:8 D2:8', 'F2:8 C2:8 A#1:8 A1:8'],
    },
  ],
};

// The same tune a second time, a recorder following in thirds and sixths, and then answering against it.
const harmonyLead = [ornament(KA2, KILNAMOE_ROOT, KM), KB, KA, ornament(KB2, KILNAMOE_ROOT, KM)];
const kilnamoeHarmony: SectionDef = {
  id: 'harmony',
  kind: 'harmony',
  bpm: 72,
  tracks: [
    { role: 'lead', voice: 'whistle', gain: 0.15, phrases: harmonyLead },
    {
      role: 'harmony',
      voice: 'recorder',
      gain: 0.12,
      phrases: [
        harmonise(harmonyLead[0] ?? KA, KILNAMOE_ROOT, KM, 'parallel'),
        harmonise(harmonyLead[1] ?? KB, KILNAMOE_ROOT, KM, 'counter'),
        harmonise(harmonyLead[2] ?? KA, KILNAMOE_ROOT, KM, 'counter'),
        harmonise(harmonyLead[3] ?? KB, KILNAMOE_ROOT, KM, 'parallel'),
      ],
    },
    { role: 'pad', voice: 'pad', gain: 0.06, phrases: ['D3:32', 'F3:16 A#2:16', 'D3:16 C3:16', 'F3:16 A2:16'] },
    {
      role: 'bass',
      voice: 'sub',
      gain: 0.28,
      phrases: ['D2:8 D2:8 A#1:8 C2:8', 'F2:8 C2:8 A#1:8 A1:8', 'D2:8 A#1:8 C2:8 D2:8', 'F2:8 C2:8 A#1:8 A1:8'],
    },
  ],
};

// A few long notes over a plucked arpeggio, a little slower and a lot emptier.
const kilnamoeSparseBass = ['D2:8 A#1:8 F2:8 C2:8', 'D2:8 C2:8 A#1:8 A1:8', 'A#1:8 F2:8 C2:8 D2:8'];
const kilnamoeSparse: SectionDef = {
  id: 'sparse',
  kind: 'sparse',
  bpm: 66,
  tracks: [
    {
      role: 'lead',
      voice: 'whistle',
      gain: 0.13,
      phrases: ['D5:6 -:2 F5:4 E5:4 -:4 A5:6 G5:2 -:4', 'F5:4 A5:4 -:4 G5:4 F5:2 E5:2 D5:8 -:4', 'A5:6 -:2 C6:4 A5:4 -:2 G5:2 F5:4 E5:4 D5:4'],
    },
    { role: 'accompaniment', voice: 'guitar', gain: 0.1, phrases: kilnamoeSparseBass.map((p) => arpeggio(p, KILNAMOE_ROOT, KM)) },
    { role: 'pad', voice: 'pad', gain: 0.04, phrases: ['D3:32', 'D3:32', 'A#2:16 D3:16'] },
    { role: 'bass', voice: 'sub', gain: 0.22, phrases: kilnamoeSparseBass },
  ],
};

// The same tune cheering up for a moment: quicker, more notes, plucked strum, and a lift toward F at the turn.
const kilnamoeLively: SectionDef = {
  id: 'lively',
  kind: 'lively',
  bpm: 88,
  tracks: [
    {
      role: 'lead',
      voice: 'whistle',
      gain: 0.15,
      phrases: [
        'D5:2 F5:1 G5:1 A5:2 G5:1 F5:1 E5:2 F5:1 G5:1 A5:2 C6:2 A5:2 G5:1 F5:1 E5:2 D5:2 F5:2 A5:4 -:2',
        'A5:2 C6:1 D6:1 F6:2 E6:1 D6:1 C6:2 A5:1 G5:1 A5:2 C6:2 D6:2 C6:1 A5:1 G5:2 F5:2 A5:2 F5:4 -:2',
        'D5:2 F5:1 G5:1 A5:2 G5:1 F5:1 E5:2 F5:1 G5:1 A5:2 C6:2 A5:2 G5:1 F5:1 E5:2 D5:2 E5:2 D5:4 -:2',
        'F5:2 A5:1 C6:1 D6:2 C6:1 A5:1 G5:2 A5:1 C6:1 F6:2 E6:2 D6:2 C6:1 A5:1 G5:2 F5:2 E5:2 D5:4 -:2',
      ],
    },
    {
      role: 'accompaniment',
      voice: 'guitar',
      gain: 0.09,
      phrases: [
        'D2:2 A2:2 D2:2 A2:2 D2:2 A2:2 D2:2 A2:2 A#1:2 F2:2 A#1:2 F2:2 C2:2 G2:2 C2:2 G2:2',
        'F2:2 C3:2 F2:2 C3:2 C2:2 G2:2 C2:2 G2:2 A#1:2 F2:2 A#1:2 F2:2 A1:2 E2:2 A1:2 E2:2',
        'D2:2 A2:2 D2:2 A2:2 D2:2 A2:2 D2:2 A2:2 A#1:2 F2:2 A#1:2 F2:2 C2:2 G2:2 C2:2 G2:2',
        'F2:2 C3:2 F2:2 C3:2 C2:2 G2:2 C2:2 G2:2 A#1:2 F2:2 A#1:2 F2:2 A1:2 E2:2 A1:2 E2:2',
      ].map((p) => arpeggio(p, KILNAMOE_ROOT, KM)),
    },
    {
      role: 'bass',
      voice: 'sub',
      gain: 0.26,
      phrases: [
        'D2:2 A2:2 D2:2 A2:2 D2:2 A2:2 D2:2 A2:2 A#1:2 F2:2 A#1:2 F2:2 C2:2 G2:2 C2:2 G2:2',
        'F2:2 C3:2 F2:2 C3:2 C2:2 G2:2 C2:2 G2:2 A#1:2 F2:2 A#1:2 F2:2 A1:2 E2:2 A1:2 E2:2',
        'D2:2 A2:2 D2:2 A2:2 D2:2 A2:2 D2:2 A2:2 A#1:2 F2:2 A#1:2 F2:2 C2:2 G2:2 C2:2 G2:2',
        'F2:2 C3:2 F2:2 C3:2 C2:2 G2:2 C2:2 G2:2 A#1:2 F2:2 A#1:2 F2:2 A1:2 E2:2 A1:2 E2:2',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// The other regions: a lead tune and a bass line, turned into four sections.
// ---------------------------------------------------------------------------

interface Source {
  readonly root: string;
  readonly mode: Mode;
  readonly bpm: number;
  readonly lead: { readonly voice: Voice; readonly gain: number; readonly A: string; readonly B: string };
  /** Second line in the harmony section. */
  readonly second: { readonly voice: Voice; readonly gain: number };
  readonly bass: { readonly voice: Voice; readonly gain: number; readonly A: string; readonly B: string };
  /** Other tracks (pads, bells, a pluck), the same in every section but the sparse one when `dropInSparse`. */
  readonly extra?: readonly { readonly role: Role; readonly voice: Voice; readonly gain: number; readonly A: string; readonly B: string; readonly dropInSparse?: boolean }[];
  readonly perc?: string;
  readonly percGain?: number;
  /** Keep the kit in the sparse section (ticks, not drums). */
  readonly percInSparse?: boolean;
  readonly wind?: boolean;
}

function build(src: Source): Theme {
  const { root, mode } = src;
  const A = src.lead.A;
  const B = src.lead.B;
  const A2 = ornament(A, root, mode);
  const B2 = ornament(B, root, mode);
  const extras = (letters: readonly ('A' | 'B')[], sparse: boolean): TrackDef[] =>
    (src.extra ?? [])
      .filter((e) => !(sparse && e.dropInSparse === true))
      .map((e) => ({ role: e.role, voice: e.voice, gain: sparse ? e.gain * 0.7 : e.gain, phrases: letters.map((l) => e[l]) }));
  const lead = (phrases: readonly string[], gain = src.lead.gain): TrackDef => ({ role: 'lead', voice: src.lead.voice, gain, phrases });
  const bass = (letters: readonly ('A' | 'B')[], gain = src.bass.gain): TrackDef => ({ role: 'bass', voice: src.bass.voice, gain, phrases: letters.map((l) => src.bass[l]) });

  const main: SectionDef = {
    id: 'main',
    kind: 'main',
    bpm: src.bpm,
    tracks: [lead([A, B, A2, B2]), bass(['A', 'B', 'A', 'B']), ...extras(['A', 'B', 'A', 'B'], false)],
    ...(src.perc === undefined ? {} : { perc: src.perc, percGain: src.percGain ?? 0.4 }),
  };
  const hLead = [A2, B, A, B2];
  const harmony: SectionDef = {
    id: 'harmony',
    kind: 'harmony',
    bpm: src.bpm,
    tracks: [
      lead(hLead, src.lead.gain * 0.95),
      {
        role: 'harmony',
        voice: src.second.voice,
        gain: src.second.gain,
        phrases: hLead.map((p, i) => harmonise(p, root, mode, i % 2 === 0 ? 'parallel' : 'counter')),
      },
      bass(['B', 'A', 'B', 'A']),
      ...extras(['B', 'A', 'B', 'A'], false),
    ],
    ...(src.perc === undefined ? {} : { perc: src.perc, percGain: src.percGain ?? 0.4 }),
  };
  const sparseBass = [src.bass.A, src.bass.B, src.bass.A];
  const sparse: SectionDef = {
    id: 'sparse',
    kind: 'sparse',
    bpm: Math.round(src.bpm * 0.92),
    tracks: [
      lead([thin(A), thin(B), thin(A2)], src.lead.gain * 0.85),
      { role: 'accompaniment', voice: 'guitar', gain: 0.1, phrases: sparseBass.map((p) => arpeggio(p, root, mode)) },
      { role: 'bass', voice: src.bass.voice, gain: src.bass.gain * 0.8, phrases: sparseBass },
      ...extras(['A', 'B', 'A'], true),
    ],
    ...(src.perc !== undefined && src.percInSparse === true ? { perc: src.perc, percGain: (src.percGain ?? 0.4) * 0.7 } : {}),
  };
  const livelyBass = [src.bass.A, src.bass.B, src.bass.A, src.bass.B].map((p) => chop(p, 2));
  const lively: SectionDef = {
    id: 'lively',
    kind: 'lively',
    bpm: Math.round(src.bpm * 1.22),
    tracks: [
      lead([A2, B2, A2, B], src.lead.gain),
      { role: 'accompaniment', voice: 'guitar', gain: 0.09, phrases: livelyBass.map((p) => arpeggio(p, root, mode)) },
      { role: 'bass', voice: src.bass.voice, gain: src.bass.gain, phrases: livelyBass },
      ...extras(['A', 'B', 'A', 'B'], false),
    ],
    ...(src.perc === undefined ? {} : { perc: src.perc, percGain: src.percGain ?? 0.4 }),
  };
  return { sections: [main, harmony, sparse, lively], ...(src.wind === true ? { wind: true } : {}) };
}

const CITIES_BASS_A = 'A2:2 C3:2 E3:2 G3:2 D3:2 F3:2 A3:2 G3:2 E3:2 G3:2 B3:2 A3:2 A2:2 E3:2 C3:2 E3:2';
const CITIES_BASS_B = 'F2:2 A2:2 C3:2 A2:2 G2:2 B2:2 D3:2 B2:2 C3:2 E3:2 G3:2 E3:2 E3:2 G#3:2 B3:2 G#3:2';

export const THEMES: Readonly<Record<RegionId, Theme>> = {
  kilnamoe: { sections: [kilnamoeMain, kilnamoeHarmony, kilnamoeSparse, kilnamoeLively] },

  // Boston and DC: walking bass, hi-hat noise.
  cities: build({
    root: 'A',
    mode: 'minor',
    bpm: 110,
    lead: {
      voice: 'pluck',
      gain: 0.1,
      A: '-:2 A4:1 C5:1 -:2 E5:2 -:2 D5:1 F5:1 -:2 A5:2 -:2 E5:1 G5:1 -:4 A5:2 E5:2 C5:2 -:2',
      B: '-:2 C5:1 E5:1 -:2 A5:2 -:2 B4:1 D5:1 -:2 G5:2 -:2 C5:1 E5:1 -:2 G5:2 B5:2 G#5:2 E5:4',
    },
    second: { voice: 'soft', gain: 0.07 },
    bass: { voice: 'sub', gain: 0.28, A: CITIES_BASS_A, B: CITIES_BASS_B },
    perc: 'khhhshhh',
    percGain: 0.4,
  }),

  // Ohio: major, open fifths, unhurried. The happiest tune in the game.
  ohio: build({
    root: 'G',
    mode: 'major',
    bpm: 80,
    lead: {
      voice: 'soft',
      gain: 0.15,
      A: 'G4:2 B4:2 D5:4 E5:2 D5:2 B4:4 C5:2 D5:2 E5:2 G5:2 D5:6 -:2',
      B: 'E5:2 G5:2 A5:4 G5:2 E5:2 D5:4 C5:2 B4:2 A4:2 B4:2 G4:8',
    },
    second: { voice: 'recorder', gain: 0.11 },
    bass: { voice: 'sub', gain: 0.28, A: 'G2:8 G2:8 C2:8 D2:8', B: 'C2:8 C2:8 C2:8 D2:8' },
    extra: [{ role: 'pad', voice: 'pad', gain: 0.07, A: 'G3:16 C3:8 D3:8', B: 'C3:16 C3:8 D3:8' }],
  }),

  // Roswell: theremin-like sine with portamento over a cheap drum machine.
  roswell: build({
    root: 'E',
    mode: 'minor',
    bpm: 118,
    lead: {
      voice: 'theremin',
      gain: 0.14,
      A: 'E5:4 G5:2 F#5:2 E5:2 B4:2 D5:4 E5:4 G5:2 A5:2 B5:6 -:2',
      B: 'B5:4 A5:2 G5:2 F#5:4 E5:4 G5:2 A5:2 B5:2 D6:2 E6:6 -:2',
    },
    second: { voice: 'theremin', gain: 0.08 },
    bass: {
      voice: 'pulse',
      gain: 0.2,
      A: bars('{}:1 -:1 {}:1 -:1 {}:1 -:1 {}:1 -:1', ['E2', 'A2', 'E2', 'B2']),
      B: bars('{}:1 -:1 {}:1 -:1 {}:1 -:1 {}:1 -:1', ['C2', 'D2', 'E2', 'B2']),
    },
    perc: 'k.h.s.hh',
    percGain: 0.36,
  }),

  // Nevada: sparse; one low drone and wind.
  nevada: build({
    root: 'A',
    mode: 'minor',
    bpm: 60,
    lead: { voice: 'bell', gain: 0.1, A: '-:8 E5:3 -:5 A4:2 -:6 -:8', B: '-:8 -:8 D5:3 -:5 C5:2 -:6' },
    second: { voice: 'bell', gain: 0.06 },
    bass: { voice: 'sub', gain: 0.32, A: 'A1:16 G1:16', B: 'F1:16 E1:16' },
    wind: true,
  }),

  // The base: detuned pads and a clock tick.
  base: build({
    root: 'C#',
    mode: 'minor',
    bpm: 90,
    lead: { voice: 'bell', gain: 0.08, A: '-:6 G#5:2 -:6 E5:2 -:6 C#5:2 -:6 B4:2', B: '-:6 B5:2 -:6 G#5:2 -:6 E5:2 -:6 G#5:2' },
    second: { voice: 'bell', gain: 0.05 },
    bass: { voice: 'sub', gain: 0.28, A: 'C#2:8 C#2:8 A1:8 A1:8', B: 'E2:8 E2:8 B1:8 B1:8' },
    extra: [{ role: 'pad', voice: 'detunedPad', gain: 0.09, A: 'C#3:16 A2:16', B: 'E3:16 B2:16' }],
    perc: 't.t.t.t.',
    percGain: 0.4,
    percInSparse: true,
  }),
};

/** The key a region's theme is in, for `bossify`. */
export const THEME_KEYS: Readonly<Record<RegionId, { readonly root: string; readonly mode: Mode }>> = {
  kilnamoe: { root: KILNAMOE_ROOT, mode: KM },
  cities: { root: 'A', mode: 'minor' },
  ohio: { root: 'G', mode: 'major' },
  roswell: { root: 'E', mode: 'minor' },
  nevada: { root: 'A', mode: 'minor' },
  base: { root: 'C#', mode: 'minor' },
};

/** Length check used by the compiler and the tests: every phrase must be 32 steps. */
export const phraseSteps = stepsOf;
