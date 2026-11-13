/**
 * Regional themes as data. docs/style-guide.md section 7.
 *
 * Time unit is one eighth note ("step"). A phrase is 4 bars = 32 steps; every
 * theme plays 4 phrases (16 bars) and loops. Note tokens: `D5:3` is D in octave
 * 5 for 3 steps, `-:2` is a 2-step rest, a bare `A4` lasts one step.
 */

import type { RegionId } from '../core/types';

export type Voice = 'whistle' | 'soft' | 'pluck' | 'theremin' | 'pad' | 'detunedPad' | 'sub' | 'pulse' | 'bell';

export interface TrackDef {
  readonly voice: Voice;
  /** The bass bus keeps playing during a Myko call-in; the rest are muted. */
  readonly bus: 'bass' | 'rest';
  readonly gain: number;
  /** Phrase letter to note string (32 steps). A phrase with no entry is silent for this track. */
  readonly phrases: Readonly<Record<string, string>>;
}

export interface Theme {
  readonly bpm: number;
  readonly form: readonly string[];
  readonly tracks: readonly TrackDef[];
  /** Eight characters per bar: k kick, s snare, h hat, t tick, . rest. Repeats every bar. */
  readonly perc?: string;
  readonly percGain?: number;
  readonly wind?: boolean;
}

export const PHRASE_STEPS = 32;

/** Repeat a one-bar pattern for each root: `pulseBars('{} ...', ['E2','A2'])`. */
const bars = (pattern: string, roots: readonly string[]): string => roots.map((r) => pattern.replaceAll('{}', r)).join(' ');

export const THEMES: Readonly<Record<RegionId, Theme>> = {
  // Kilnamoe: slow D minor, tin-whistle-like lead over a drone.
  kilnamoe: {
    bpm: 72,
    form: ['A', 'B', 'A', 'B'],
    perc: undefined,
    tracks: [
      {
        voice: 'whistle',
        bus: 'rest',
        gain: 0.16,
        phrases: {
          A: 'D5:3 F5:1 A5:4 G5:2 F5:2 E5:4 D5:2 E5:2 F5:2 A5:2 G5:6 -:2',
          B: 'A5:3 C6:1 D6:4 C6:2 A5:2 G5:4 F5:2 G5:2 A5:2 F5:2 E5:4 D5:4',
        },
      },
      { voice: 'pad', bus: 'rest', gain: 0.07, phrases: { A: 'D3:32', B: 'D3:32' } },
      { voice: 'sub', bus: 'bass', gain: 0.3, phrases: { A: 'D2:8 D2:8 A#1:8 C2:8', B: 'F2:8 C2:8 A#1:8 A1:8' } },
    ],
  },
  // Boston and DC: walking bass, hi-hat noise.
  cities: {
    bpm: 110,
    form: ['A', 'B', 'A', 'B'],
    perc: 'khhhshhh',
    percGain: 0.5,
    tracks: [
      {
        voice: 'sub',
        bus: 'bass',
        gain: 0.28,
        phrases: {
          A: 'A2:2 C3:2 E3:2 G3:2 D3:2 F3:2 A3:2 G3:2 E3:2 G3:2 B3:2 A3:2 A2:2 E3:2 C3:2 E3:2',
          B: 'F2:2 A2:2 C3:2 A2:2 G2:2 B2:2 D3:2 B2:2 C3:2 E3:2 G3:2 E3:2 E3:2 G#3:2 B3:2 G#3:2',
        },
      },
      {
        voice: 'pluck',
        bus: 'rest',
        gain: 0.1,
        phrases: {
          A: '-:2 A4:1 C5:1 -:2 E5:2 -:2 D5:1 F5:1 -:2 A5:2 -:2 E5:1 G5:1 -:4 A5:2 E5:2 C5:2 -:2',
          B: '-:2 C5:1 E5:1 -:2 A5:2 -:2 B4:1 D5:1 -:2 G5:2 -:2 C5:1 E5:1 -:2 G5:2 B5:2 G#5:2 E5:4',
        },
      },
    ],
  },
  // Ohio: major, open fifths, unhurried. The happiest tune in the game.
  ohio: {
    bpm: 80,
    form: ['A', 'B', 'A', 'B'],
    tracks: [
      {
        voice: 'soft',
        bus: 'rest',
        gain: 0.15,
        phrases: {
          A: 'G4:2 B4:2 D5:4 E5:2 D5:2 B4:4 C5:2 D5:2 E5:2 G5:2 D5:6 -:2',
          B: 'E5:2 G5:2 A5:4 G5:2 E5:2 D5:4 C5:2 B4:2 A4:2 B4:2 G4:8',
        },
      },
      { voice: 'pad', bus: 'rest', gain: 0.07, phrases: { A: 'G3:16 C3:8 D3:8', B: 'C3:16 C3:8 D3:8' } },
      { voice: 'sub', bus: 'bass', gain: 0.28, phrases: { A: 'G2:8 G2:8 C2:8 D2:8', B: 'C2:8 C2:8 C2:8 D2:8' } },
    ],
  },
  // Roswell: theremin-like sine with portamento over a cheap drum machine.
  roswell: {
    bpm: 118,
    form: ['A', 'B', 'A', 'B'],
    perc: 'k.h.s.hh',
    percGain: 0.45,
    tracks: [
      {
        voice: 'theremin',
        bus: 'rest',
        gain: 0.14,
        phrases: {
          A: 'E5:4 G5:2 F#5:2 E5:2 B4:2 D5:4 E5:4 G5:2 A5:2 B5:6 -:2',
          B: 'B5:4 A5:2 G5:2 F#5:4 E5:4 G5:2 A5:2 B5:2 D6:2 E6:6 -:2',
        },
      },
      {
        voice: 'pulse',
        bus: 'bass',
        gain: 0.2,
        phrases: {
          A: bars('{}:1 -:1 {}:1 -:1 {}:1 -:1 {}:1 -:1', ['E2', 'A2', 'E2', 'B2']),
          B: bars('{}:1 -:1 {}:1 -:1 {}:1 -:1 {}:1 -:1', ['C2', 'D2', 'E2', 'B2']),
        },
      },
    ],
  },
  // Nevada: sparse; one low drone and wind.
  nevada: {
    bpm: 60,
    form: ['A', 'B', 'A', 'B'],
    wind: true,
    tracks: [
      { voice: 'sub', bus: 'bass', gain: 0.32, phrases: { A: 'A1:16 G1:16', B: 'F1:16 E1:16' } },
      {
        voice: 'bell',
        bus: 'rest',
        gain: 0.1,
        phrases: { A: '-:8 E5:3 -:5 A4:2 -:6 -:8', B: '-:8 -:8 D5:3 -:5 C5:2 -:6' },
      },
    ],
  },
  // The base: detuned pads and a clock tick.
  base: {
    bpm: 90,
    form: ['A', 'B', 'A', 'B'],
    perc: 't.t.t.t.',
    percGain: 0.4,
    tracks: [
      { voice: 'detunedPad', bus: 'rest', gain: 0.09, phrases: { A: 'C#3:16 A2:16', B: 'E3:16 B2:16' } },
      { voice: 'sub', bus: 'bass', gain: 0.28, phrases: { A: 'C#2:8 C#2:8 A1:8 A1:8', B: 'E2:8 E2:8 B1:8 B1:8' } },
      {
        voice: 'bell',
        bus: 'rest',
        gain: 0.08,
        phrases: {
          A: '-:6 G#5:2 -:6 E5:2 -:6 C#5:2 -:6 B4:2',
          B: '-:6 B5:2 -:6 G#5:2 -:6 E5:2 -:6 G#5:2',
        },
      },
    ],
  },
};
