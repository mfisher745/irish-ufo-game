/** Music: compiles theme data to timed events and schedules them with Web Audio. */

import type { RegionId } from '../core/types';
import { THEMES, PHRASE_STEPS } from './themes';
import type { Theme, Voice } from './themes';
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
  readonly bus: 'bass' | 'rest';
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

export interface CompiledTheme {
  readonly stepSec: number;
  readonly totalSteps: number;
  readonly byStep: ReadonlyArray<readonly MusicEvent[]>;
  readonly wind: boolean;
}

/** Parses one phrase string; returns events and the total step count (should be 32). */
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

export function compileTheme(theme: Theme): CompiledTheme {
  const totalSteps = theme.form.length * PHRASE_STEPS;
  const byStep: MusicEvent[][] = Array.from({ length: totalSteps }, () => []);
  for (const track of theme.tracks) {
    let prev = 0;
    theme.form.forEach((letter, p) => {
      const src = track.phrases[letter];
      if (src === undefined) return;
      const { notes, length } = parsePhrase(src);
      if (length !== PHRASE_STEPS) throw new Error(`Phrase ${letter} of ${track.voice} has ${length} steps, expected ${PHRASE_STEPS}`);
      for (const n of notes) {
        byStep[p * PHRASE_STEPS + n.at]?.push({ kind: 'note', voice: track.voice, bus: track.bus, freq: n.freq, prevFreq: prev === 0 ? n.freq : prev, steps: n.steps, gain: track.gain });
        prev = n.freq;
      }
    });
  }
  if (theme.perc !== undefined) {
    for (let s = 0; s < totalSteps; s++) {
      const c = theme.perc[s % theme.perc.length];
      if (c !== undefined && c !== '.') byStep[s]?.push({ kind: 'perc', hit: c, gain: theme.percGain ?? 0.4 });
    }
  }
  return { stepSec: 60 / theme.bpm / 2, totalSteps, byStep, wind: theme.wind === true };
}

export interface Buses {
  readonly bass: AudioNode;
  readonly rest: AudioNode;
}

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
  const vibrato = (osc: OscillatorNode, hz: number, cents: number): void => {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = hz;
    depth.gain.value = cents;
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
      vibrato(o, 5.5, 14);
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

/** Schedule every event of one step at time `t`. Shared by the live player and offline tests. */
export function scheduleStep(ctx: BaseAudioContext, buses: Buses, noise: AudioBuffer, theme: CompiledTheme, step: number, t: number): void {
  const events = theme.byStep[step % theme.totalSteps];
  if (events === undefined) return;
  for (const e of events) {
    if (e.kind === 'note') playVoice({ ctx, dest: buses[e.bus], noise }, e, t, theme.stepSec);
    else playPerc({ ctx, dest: buses.rest, noise }, e, t);
  }
}

interface Run {
  readonly region: RegionId;
  readonly theme: CompiledTheme;
  readonly bass: GainNode;
  readonly rest: GainNode;
  readonly extra: AudioScheduledSourceNode[];
  step: number;
  nextTime: number;
}

const LOOKAHEAD = 0.3;
const FADE = 0.8;

export class MusicPlayer {
  private run: Run | null = null;
  private readonly duck: GainNode;
  private readonly compiled = new Map<RegionId, CompiledTheme>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private region: RegionId | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    out: AudioNode,
    private readonly noise: AudioBuffer,
  ) {
    this.duck = ctx.createGain();
    this.duck.connect(out);
    this.timer = setInterval(() => this.tick(), 60);
  }

  setRegion(region: RegionId): void {
    if (this.region === region) return;
    this.region = region;
    this.fadeOut();
    if (this.ctx.state === 'running') this.startRun(region);
  }

  /** Called when the context starts running (after the first user gesture). */
  resumed(): void {
    if (this.run === null && this.region !== null) this.startRun(this.region);
  }

  stop(): void {
    this.region = null;
    this.fadeOut();
  }

  /** Bass line only while true. */
  setBassOnly(on: boolean): void {
    this.restGainTarget(on ? 0 : 1);
  }

  private restGainTarget(v: number): void {
    this.bassOnlyValue = v;
    const r = this.run;
    if (r === null) return;
    const t = this.ctx.currentTime;
    r.rest.gain.cancelScheduledValues(t);
    r.rest.gain.setValueAtTime(r.rest.gain.value, t);
    r.rest.gain.linearRampToValueAtTime(v, t + 0.4);
  }

  private bassOnlyValue = 1;

  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.fadeOut();
  }

  private theme(region: RegionId): CompiledTheme {
    let c = this.compiled.get(region);
    if (c === undefined) {
      c = compileTheme(THEMES[region]);
      this.compiled.set(region, c);
    }
    return c;
  }

  private startRun(region: RegionId): void {
    const theme = this.theme(region);
    const bass = this.ctx.createGain();
    const rest = this.ctx.createGain();
    const t0 = this.ctx.currentTime;
    for (const g of [bass, rest]) {
      g.gain.setValueAtTime(0.0001, t0);
      g.connect(this.duck);
    }
    bass.gain.linearRampToValueAtTime(1, t0 + FADE);
    rest.gain.linearRampToValueAtTime(this.bassOnlyValue, t0 + FADE);
    const extra: AudioScheduledSourceNode[] = [];
    if (theme.wind) {
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
      src.connect(f).connect(g).connect(rest);
      src.start();
      lfo.start();
      extra.push(src, lfo);
    }
    this.run = { region, theme, bass, rest, extra, step: 0, nextTime: t0 + 0.05 };
  }

  private fadeOut(): void {
    const r = this.run;
    this.run = null;
    if (r === null) return;
    const t = this.ctx.currentTime;
    for (const g of [r.bass, r.rest]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + FADE);
    }
    setTimeout(() => {
      for (const n of r.extra) {
        try {
          n.stop();
        } catch {
          // already stopped
        }
      }
      r.bass.disconnect();
      r.rest.disconnect();
    }, (FADE + 1.5) * 1000);
  }

  private tick(): void {
    const r = this.run;
    if (r === null || this.ctx.state !== 'running') return;
    // If the tab was suspended and time jumped, skip ahead rather than burst-play.
    if (r.nextTime < this.ctx.currentTime - 0.5) r.nextTime = this.ctx.currentTime + 0.05;
    while (r.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      scheduleStep(this.ctx, { bass: r.bass, rest: r.rest }, this.noise, r.theme, r.step, r.nextTime);
      r.step = (r.step + 1) % r.theme.totalSteps;
      r.nextTime += r.theme.stepSec;
    }
  }
}
