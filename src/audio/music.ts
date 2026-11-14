/**
 * Music: compiles theme sections to timed events and schedules them with Web
 * Audio. The player strings sections together in a shuffled order, never the
 * same one twice running and (when it can) never the same one within
 * `MIN_GAP_SEC` of playing time, and crossfades to an intense version while a
 * boss or set piece is on.
 */

import type { RegionId } from '../core/types';
import { BOSS_TEMPO, MAX_BOSS_LEVEL, PHRASE_STEPS, THEMES, THEME_KEYS, bossify } from './themes';
import type { SectionDef, SectionKind, Voice } from './themes';
import { noiseBurst, tone } from './synth';
import type { Synth } from './synth';

const SEMITONES: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'D5' or 'F#4' or 'A#1' to a frequency in Hz; null for a rest ('-'). */
export function noteFreq(name: string): number | null {
  if (name === '-') return null;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (m === null) throw new Error(`Bad note: ${name}`);
  const base = SEMITONES[m[1] ?? ''];
  if (base === undefined) throw new Error(`Bad note: ${name}`);
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const midi = 12 * (Number(m[3]) + 1) + base + accidental;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface NoteEvent {
  readonly kind: 'note';
  readonly voice: Voice;
  readonly freq: number;
  readonly prevFreq: number;
  readonly steps: number;
  readonly gain: number;
}

export interface PercEvent {
  readonly kind: 'perc';
  readonly hit: string;
  readonly gain: number;
}

export type MusicEvent = NoteEvent | PercEvent;

export interface CompiledSection {
  readonly id: string;
  readonly kind: SectionKind;
  readonly stepSec: number;
  readonly totalSteps: number;
  readonly byStep: ReadonlyArray<readonly MusicEvent[]>;
  readonly durationSec: number;
}

/** Parses one phrase string; returns notes and the total step count (should be 32). */
export function parsePhrase(src: string): { notes: Array<{ at: number; steps: number; freq: number }>; length: number } {
  const notes: Array<{ at: number; steps: number; freq: number }> = [];
  let at = 0;
  for (const tok of src.split(/\s+/).filter((t) => t.length > 0)) {
    const [name = '-', len] = tok.split(':');
    const steps = len === undefined ? 1 : Number(len);
    const freq = noteFreq(name);
    if (freq !== null) notes.push({ at, steps, freq });
    at += steps;
  }
  return { notes, length: at };
}

export function compileSection(section: SectionDef): CompiledSection {
  const phraseCount = Math.max(...section.tracks.map((t) => t.phrases.length));
  const totalSteps = phraseCount * PHRASE_STEPS;
  const byStep: MusicEvent[][] = Array.from({ length: totalSteps }, () => []);
  for (const track of section.tracks) {
    let prev = 0;
    track.phrases.forEach((src, p) => {
      const { notes, length } = parsePhrase(src);
      if (length !== PHRASE_STEPS) throw new Error(`Section ${section.id}: a ${track.voice} phrase has ${length} steps, expected ${PHRASE_STEPS}`);
      for (const n of notes) {
        byStep[p * PHRASE_STEPS + n.at]?.push({ kind: 'note', voice: track.voice, freq: n.freq, prevFreq: prev === 0 ? n.freq : prev, steps: n.steps, gain: track.gain });
        prev = n.freq;
      }
    });
  }
  if (section.perc !== undefined) {
    for (let s = 0; s < totalSteps; s++) {
      const c = section.perc[s % section.perc.length];
      if (c !== undefined && c !== '.') byStep[s]?.push({ kind: 'perc', hit: c, gain: section.percGain ?? 0.4 });
    }
  }
  const stepSec = 60 / section.bpm / 2;
  return { id: section.id, kind: section.kind, stepSec, totalSteps, byStep, durationSec: totalSteps * stepSec };
}

/** The sections a region plays at a boss level (0 = the normal theme), compiled. */
export function sectionsFor(region: RegionId, level: number): CompiledSection[] {
  const theme = THEMES[region];
  const key = THEME_KEYS[region];
  const lv = Math.max(0, Math.min(MAX_BOSS_LEVEL, level));
  if (lv === 0) return theme.sections.map(compileSection);
  return theme.sections.filter((s) => s.kind !== 'sparse').map((s) => compileSection(bossify(s, lv, key.root, key.mode)));
}

/** Tempo multiplier at a boss level, for reports. */
export const bossTempo = (level: number): number => BOSS_TEMPO[Math.max(0, Math.min(MAX_BOSS_LEVEL, level))] ?? 1;

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------

function playVoice(s: Synth, e: NoteEvent, t: number, stepSec: number): void {
  const dur = e.steps * stepSec;
  const ctx = s.ctx;
  const env = (peak: number, attack: number, release: number): GainNode => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
    g.connect(s.dest);
    return g;
  };
  const vibrato = (osc: OscillatorNode, hz: number, cents: number, delay = 0): void => {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = hz;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(cents, t + delay + 0.15);
    lfo.connect(depth).connect(osc.detune);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  };
  const osc = (type: OscillatorType, f: number, out: AudioNode): OscillatorNode => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  };
  const filter = (type: BiquadFilterType, f: number, out: AudioNode): BiquadFilterNode => {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.connect(out);
    return b;
  };
  switch (e.voice) {
    case 'whistle': {
      const o = osc('triangle', e.freq, env(e.gain, 0.06, 0.12));
      vibrato(o, 5.5, 14, dur > 0.5 ? 0.2 : 0);
      break;
    }
    case 'recorder': {
      // Softer and breathier than the whistle: a sine with a little octave, a slow shallow vibrato.
      const out = env(e.gain, 0.09, 0.14);
      const o = osc('sine', e.freq, out);
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      osc('triangle', e.freq * 2, g2).detune.value = 6;
      g2.connect(out);
      vibrato(o, 4.4, 8, 0.3);
      break;
    }
    case 'soft':
      osc('triangle', e.freq, env(e.gain, 0.03, 0.15));
      break;
    case 'pluck': {
      const f = filter('lowpass', 2200, s.dest);
      const g = ctx.createGain();
      g.gain.setValueAtTime(e.gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.2, dur));
      g.connect(f);
      osc('square', e.freq, g);
      break;
    }
    case 'guitar': {
      // A short decaying pluck: a bright attack that closes down fast, a body that rings a little.
      const ring = 0.85;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(3200, t);
      f.frequency.exponentialRampToValueAtTime(700, t + 0.25);
      f.connect(s.dest);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(e.gain, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
      g.connect(f);
      for (const [type, mult, level] of [['triangle', 1, 1], ['square', 1, 0.35], ['sine', 2, 0.3]] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = e.freq * mult;
        const lg = ctx.createGain();
        lg.gain.value = level;
        o.connect(lg).connect(g);
        o.start(t);
        o.stop(t + ring + 0.05);
      }
      break;
    }
    case 'theremin': {
      const o = osc('sine', e.prevFreq, env(e.gain, 0.05, 0.1));
      o.frequency.linearRampToValueAtTime(e.freq, t + 0.09);
      vibrato(o, 6, 14);
      break;
    }
    case 'pad':
    case 'detunedPad': {
      const f = filter('lowpass', 900, env(e.gain, Math.min(1, dur / 3), Math.min(1.2, dur / 3)));
      const spread = e.voice === 'detunedPad' ? 14 : 4;
      const a = osc('sawtooth', e.freq, f);
      a.detune.value = -spread;
      const b = osc('sawtooth', e.freq, f);
      b.detune.value = spread;
      if (e.voice === 'pad') osc('sawtooth', e.freq * 1.5, f); // open fifth
      break;
    }
    case 'sub': {
      const f = filter('lowpass', 500, env(e.gain, 0.03, Math.min(0.3, dur / 2)));
      osc('triangle', e.freq, f);
      break;
    }
    case 'pulse': {
      const f = filter('lowpass', 700, s.dest);
      const g = ctx.createGain();
      g.gain.setValueAtTime(e.gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.1, dur));
      g.connect(f);
      osc('square', e.freq, g);
      break;
    }
    case 'bell': {
      const g = ctx.createGain();
      g.gain.setValueAtTime(e.gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.6, dur * 2));
      g.connect(s.dest);
      const o = ctx.createOscillator();
      o.frequency.value = e.freq;
      o.connect(g);
      o.start(t);
      o.stop(t + Math.max(0.6, dur * 2) + 0.05);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      g2.gain.value = 0.3;
      o2.frequency.value = e.freq * 2.005;
      o2.connect(g2).connect(g);
      o2.start(t);
      o2.stop(t + Math.max(0.6, dur * 2) + 0.05);
      break;
    }
  }
}

function playPerc(s: Synth, e: PercEvent, t: number): void {
  switch (e.hit) {
    case 'k':
      tone(s, { type: 'sine', f0: 150, f1: 40, t, dur: 0.16, gain: e.gain });
      break;
    case 's':
      noiseBurst(s, { t, dur: 0.12, gain: e.gain * 0.6, filter: 'bandpass', f0: 1800, q: 0.8 });
      break;
    case 'h':
      noiseBurst(s, { t, dur: 0.04, gain: e.gain * 0.25, filter: 'highpass', f0: 7000 });
      break;
    case 't':
      tone(s, { type: 'square', f0: 2200, t, dur: 0.015, gain: e.gain * 0.35 });
      break;
  }
}

/** Schedule every event of one step at time `t`. Shared by the live player and offline renders. */
export function scheduleStep(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, section: CompiledSection, step: number, t: number): void {
  const events = section.byStep[step % section.totalSteps];
  if (events === undefined) return;
  const synth: Synth = { ctx, dest, noise };
  for (const e of events) {
    if (e.kind === 'note') playVoice(synth, e, t, section.stepSec);
    else playPerc(synth, e, t);
  }
}

/** Schedules a whole section from time `t0` (offline rendering). */
export function scheduleSection(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, section: CompiledSection, t0: number): void {
  for (let step = 0; step < section.totalSteps; step++) scheduleStep(ctx, dest, noise, section, step, t0 + step * section.stepSec);
}

// ---------------------------------------------------------------------------
// Choosing sections
// ---------------------------------------------------------------------------

/** No section repeats within this much playing time if the theme has enough sections to avoid it. */
export const MIN_GAP_SEC = 90;
/** How often the lively section comes up relative to the others. */
const LIVELY_WEIGHT = 0.5;

export class SectionPicker {
  private played = 0;
  private last: string | null = null;
  private readonly endedAt = new Map<string, number>();

  constructor(
    private readonly sections: readonly CompiledSection[],
    private readonly rng: () => number = Math.random,
    private readonly minGapSec = MIN_GAP_SEC,
  ) {}

  /** The next section to play. The first one is the main section when `startWithMain` is set. */
  next(startWithMain: boolean): CompiledSection {
    let pick: CompiledSection | undefined;
    if (this.last === null && startWithMain) pick = this.sections.find((s) => s.kind === 'main');
    if (pick === undefined) {
      const notLast = this.sections.filter((s) => s.id !== this.last);
      const rested = notLast.filter((s) => {
        const end = this.endedAt.get(s.id);
        return end === undefined || this.played - end >= this.minGapSec;
      });
      const pool = rested.length > 0 ? rested : [...notLast].sort((a, b) => (this.endedAt.get(a.id) ?? -1) - (this.endedAt.get(b.id) ?? -1)).slice(0, 1);
      const weights = pool.map((s) => (s.kind === 'lively' ? LIVELY_WEIGHT : 1));
      let r = this.rng() * weights.reduce((a, b) => a + b, 0);
      pick = pool[pool.length - 1];
      for (let i = 0; i < pool.length; i++) {
        r -= weights[i] ?? 0;
        if (r <= 0) {
          pick = pool[i];
          break;
        }
      }
    }
    const chosen = pick ?? this.sections[0];
    if (chosen === undefined) throw new Error('A theme needs at least one section');
    this.played += chosen.durationSec;
    this.endedAt.set(chosen.id, this.played);
    this.last = chosen.id;
    return chosen;
  }
}

// ---------------------------------------------------------------------------
// The player
// ---------------------------------------------------------------------------

interface Run {
  readonly gain: GainNode;
  readonly extra: AudioScheduledSourceNode[];
  readonly picker: SectionPicker;
  readonly region: RegionId;
  readonly level: number;
  section: CompiledSection;
  step: number;
  nextTime: number;
}

const LOOKAHEAD = 0.3;
/** Seconds to crossfade between runs (regions, boss levels, returning from the call-in). */
const FADE = 1.0;
const CUT_FADE = 0.25;

export class MusicPlayer {
  private run: Run | null = null;
  private readonly cache = new Map<string, CompiledSection[]>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private region: RegionId | null = null;
  private level = 0;
  private silent = false;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly out: AudioNode,
    private readonly noise: AudioBuffer,
    private readonly rng: () => number = Math.random,
  ) {
    this.timer = setInterval(() => this.tick(), 60);
  }

  setRegion(region: RegionId): void {
    if (this.region === region) return;
    this.region = region;
    this.restart(FADE);
  }

  /** 0 is the normal theme; 1 to 3 are the boss versions, each more intense. */
  setIntensity(level: number): void {
    const lv = Math.max(0, Math.min(MAX_BOSS_LEVEL, Math.round(level)));
    if (lv === this.level) return;
    this.level = lv;
    this.restart(FADE);
  }

  /** The Myko call-in: nothing plays at all until it is switched off again. */
  setSilent(on: boolean): void {
    if (this.silent === on) return;
    this.silent = on;
    this.restart(on ? CUT_FADE : FADE);
  }

  /** Called when the context starts running (after the first user gesture). */
  resumed(): void {
    if (this.run === null) this.restart(FADE);
  }

  stop(): void {
    this.region = null;
    this.fadeOut(FADE);
  }

  get currentLevel(): number {
    return this.level;
  }

  /** What is playing, for tests and the dev harness. */
  nowPlaying(): { region: RegionId; level: number; section: string } | null {
    const r = this.run;
    return r === null ? null : { region: r.region, level: r.level, section: r.section.id };
  }

  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.fadeOut(FADE);
  }

  private sections(region: RegionId, level: number): CompiledSection[] {
    const key = `${region}.${level}`;
    let c = this.cache.get(key);
    if (c === undefined) {
      c = sectionsFor(region, level);
      this.cache.set(key, c);
    }
    return c;
  }

  /** Fade out whatever plays and, unless silent, fade in a fresh run for the current region and level. */
  private restart(fade: number): void {
    this.fadeOut(fade);
    if (this.silent || this.region === null || this.ctx.state !== 'running') return;
    this.startRun(this.region, this.level, fade);
  }

  private startRun(region: RegionId, level: number, fade: number): void {
    const picker = new SectionPicker(this.sections(region, level), this.rng, level === 0 ? MIN_GAP_SEC : MIN_GAP_SEC / 2);
    const gain = this.ctx.createGain();
    const t0 = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(1, t0 + fade);
    gain.connect(this.out);
    const extra: AudioScheduledSourceNode[] = [];
    if (THEMES[region].wind === true) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 500;
      f.Q.value = 0.7;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.12;
      const depth = this.ctx.createGain();
      depth.gain.value = 280;
      lfo.connect(depth).connect(f.frequency);
      const g = this.ctx.createGain();
      g.gain.value = 0.22;
      src.connect(f).connect(g).connect(gain);
      src.start();
      lfo.start();
      extra.push(src, lfo);
    }
    this.run = { gain, extra, picker, region, level, section: picker.next(level === 0), step: 0, nextTime: t0 + 0.05 };
  }

  private fadeOut(fade: number): void {
    const r = this.run;
    this.run = null;
    if (r === null) return;
    const t = this.ctx.currentTime;
    r.gain.gain.cancelScheduledValues(t);
    r.gain.gain.setValueAtTime(r.gain.gain.value, t);
    r.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => {
      for (const n of r.extra) {
        try {
          n.stop();
        } catch {
          // already stopped
        }
      }
      r.gain.disconnect();
    }, (fade + 1.5) * 1000);
  }

  private tick(): void {
    const r = this.run;
    if (r === null || this.ctx.state !== 'running') return;
    // If the tab was suspended and time jumped, skip ahead rather than burst-play.
    if (r.nextTime < this.ctx.currentTime - 0.5) r.nextTime = this.ctx.currentTime + 0.05;
    while (r.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      scheduleStep(this.ctx, r.gain, this.noise, r.section, r.step, r.nextTime);
      r.nextTime += r.section.stepSec;
      r.step++;
      if (r.step >= r.section.totalSteps) {
        r.step = 0;
        r.section = r.picker.next(false);
      }
    }
  }
}
