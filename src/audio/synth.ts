/** Web Audio synthesis primitives and the sound effects. No samples, no network. */

export type EffectId =
  | 'hit'
  | 'haymaker'
  | 'hurley'
  | 'bottleThrow'
  | 'bottleSmash'
  | 'drink'
  | 'footstep'
  | 'hurt'
  | 'fallOver'
  | 'pickup'
  | 'refuse'
  | 'alarm'
  | 'detectionTick'
  | 'door'
  | 'push'
  | 'uiMove'
  | 'uiSelect'
  | 'save'
  | 'blipAndrew'
  | 'blipMyko'
  | 'blipOther'
  | 'blipAlien'
  | 'mykoCallIn'
  | 'bossPhase'
  | 'stun'
  | 'fire'
  | 'sliotar'
  | 'deflect'
  | 'heatWarning'
  | 'enemyDown'
  | 'abilityUnlocked';

export const EFFECT_IDS: readonly EffectId[] = [
  'hit', 'haymaker', 'hurley', 'bottleThrow', 'bottleSmash', 'drink', 'footstep', 'hurt', 'fallOver', 'pickup',
  'refuse', 'alarm', 'detectionTick', 'door', 'push', 'uiMove', 'uiSelect', 'save', 'blipAndrew', 'blipMyko',
  'blipOther', 'blipAlien', 'mykoCallIn', 'bossPhase', 'stun', 'fire', 'sliotar', 'deflect', 'heatWarning',
  'enemyDown', 'abilityUnlocked',
];

export interface Synth {
  readonly ctx: BaseAudioContext;
  readonly dest: AudioNode;
  readonly noise: AudioBuffer;
}

export function makeNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic LCG so output is repeatable.
  let s = 12345;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    data[i] = s / 2147483648 - 1;
  }
  return buf;
}

interface ToneOpts {
  readonly type?: OscillatorType;
  readonly f0: number;
  readonly f1?: number;
  readonly t: number;
  readonly dur: number;
  readonly gain?: number;
  readonly attack?: number;
  readonly detune?: number;
}

export function tone(s: Synth, o: ToneOpts): void {
  const osc = s.ctx.createOscillator();
  const g = s.ctx.createGain();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(o.f0, o.t);
  if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), o.t + o.dur);
  if (o.detune !== undefined) osc.detune.value = o.detune;
  const peak = o.gain ?? 0.3;
  const attack = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, o.t);
  g.gain.linearRampToValueAtTime(peak, o.t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
  osc.connect(g).connect(s.dest);
  osc.start(o.t);
  osc.stop(o.t + o.dur + 0.02);
}

interface NoiseOpts {
  readonly t: number;
  readonly dur: number;
  readonly gain?: number;
  readonly filter?: BiquadFilterType;
  readonly f0: number;
  readonly f1?: number;
  readonly q?: number;
}

export function noiseBurst(s: Synth, o: NoiseOpts): void {
  const src = s.ctx.createBufferSource();
  src.buffer = s.noise;
  const f = s.ctx.createBiquadFilter();
  f.type = o.filter ?? 'lowpass';
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.f0, o.t);
  if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), o.t + o.dur);
  const g = s.ctx.createGain();
  g.gain.setValueAtTime(o.gain ?? 0.4, o.t);
  g.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
  src.connect(f).connect(g).connect(s.dest);
  src.start(o.t);
  src.stop(o.t + o.dur + 0.02);
}

/** Play one effect starting at time `t` on the synth's destination. */
export function renderEffect(id: EffectId, s: Synth, t: number): void {
  switch (id) {
    case 'hit':
      noiseBurst(s, { t, dur: 0.09, gain: 0.45, f0: 3200, f1: 500 });
      tone(s, { type: 'triangle', f0: 220, f1: 80, t, dur: 0.08, gain: 0.25 });
      break;
    case 'haymaker':
      noiseBurst(s, { t, dur: 0.16, gain: 0.55, f0: 2400, f1: 200 });
      tone(s, { type: 'sine', f0: 120, f1: 38, t, dur: 0.28, gain: 0.7 });
      break;
    case 'hurley':
      noiseBurst(s, { t, dur: 0.12, gain: 0.35, filter: 'bandpass', f0: 600, f1: 2200, q: 2 });
      noiseBurst(s, { t: t + 0.1, dur: 0.14, gain: 0.55, f0: 1800, f1: 160 });
      tone(s, { type: 'sine', f0: 100, f1: 34, t: t + 0.1, dur: 0.3, gain: 0.7 });
      break;
    case 'bottleThrow':
      noiseBurst(s, { t, dur: 0.18, gain: 0.25, filter: 'bandpass', f0: 500, f1: 1800, q: 3 });
      break;
    case 'bottleSmash':
      noiseBurst(s, { t, dur: 0.35, gain: 0.45, filter: 'highpass', f0: 3000, f1: 6000 });
      for (let i = 0; i < 4; i++) tone(s, { type: 'triangle', f0: 2400 + i * 610, f1: 1800 + i * 300, t: t + i * 0.03, dur: 0.1, gain: 0.12 });
      break;
    case 'drink':
      for (let i = 0; i < 3; i++) tone(s, { type: 'sine', f0: 180 + i * 40, f1: 320 + i * 60, t: t + i * 0.09, dur: 0.08, gain: 0.3 });
      noiseBurst(s, { t, dur: 0.3, gain: 0.06, filter: 'bandpass', f0: 900, q: 4 });
      break;
    case 'footstep':
      noiseBurst(s, { t, dur: 0.05, gain: 0.18, f0: 700, f1: 200 });
      break;
    case 'hurt':
      tone(s, { type: 'square', f0: 330, f1: 110, t, dur: 0.22, gain: 0.3 });
      noiseBurst(s, { t, dur: 0.1, gain: 0.3, f0: 2000, f1: 300 });
      break;
    case 'fallOver':
      tone(s, { type: 'triangle', f0: 260, f1: 60, t, dur: 0.45, gain: 0.4 });
      noiseBurst(s, { t: t + 0.4, dur: 0.18, gain: 0.5, f0: 900, f1: 90 });
      break;
    case 'pickup':
      tone(s, { type: 'square', f0: 660, t, dur: 0.07, gain: 0.2 });
      tone(s, { type: 'square', f0: 990, t: t + 0.07, dur: 0.12, gain: 0.2 });
      break;
    case 'refuse':
      tone(s, { type: 'square', f0: 200, t, dur: 0.09, gain: 0.22 });
      tone(s, { type: 'square', f0: 150, t: t + 0.1, dur: 0.14, gain: 0.22 });
      break;
    case 'alarm':
      tone(s, { type: 'square', f0: 880, t, dur: 0.28, gain: 0.22, attack: 0.01 });
      tone(s, { type: 'square', f0: 660, t: t + 0.3, dur: 0.28, gain: 0.22, attack: 0.01 });
      break;
    case 'detectionTick':
      tone(s, { type: 'square', f0: 1500, t, dur: 0.03, gain: 0.18 });
      break;
    case 'door':
      noiseBurst(s, { t, dur: 0.12, gain: 0.3, f0: 600, f1: 120 });
      tone(s, { type: 'triangle', f0: 90, f1: 60, t: t + 0.05, dur: 0.15, gain: 0.35 });
      break;
    case 'push':
      noiseBurst(s, { t, dur: 0.35, gain: 0.25, filter: 'bandpass', f0: 200, f1: 120, q: 1.5 });
      tone(s, { type: 'sawtooth', f0: 70, f1: 55, t, dur: 0.35, gain: 0.12 });
      break;
    case 'uiMove':
      tone(s, { type: 'square', f0: 520, t, dur: 0.04, gain: 0.14 });
      break;
    case 'uiSelect':
      tone(s, { type: 'square', f0: 520, t, dur: 0.05, gain: 0.16 });
      tone(s, { type: 'square', f0: 780, t: t + 0.05, dur: 0.08, gain: 0.16 });
      break;
    case 'save':
      tone(s, { type: 'triangle', f0: 523, t, dur: 0.1, gain: 0.25 });
      tone(s, { type: 'triangle', f0: 659, t: t + 0.1, dur: 0.1, gain: 0.25 });
      tone(s, { type: 'triangle', f0: 784, t: t + 0.2, dur: 0.18, gain: 0.25 });
      break;
    case 'blipAndrew':
      tone(s, { type: 'square', f0: 880, t, dur: 0.035, gain: 0.1 });
      break;
    case 'blipMyko':
      tone(s, { type: 'square', f0: 440, t, dur: 0.04, gain: 0.12 });
      break;
    case 'blipOther':
      tone(s, { type: 'square', f0: 660, t, dur: 0.035, gain: 0.1 });
      break;
    case 'blipAlien':
      tone(s, { type: 'square', f0: 1320, t, dur: 0.035, gain: 0.1, detune: 18 });
      break;
    case 'mykoCallIn':
      // A low drop, no fanfare.
      tone(s, { type: 'sine', f0: 140, f1: 36, t, dur: 0.7, gain: 0.8 });
      break;
    case 'bossPhase':
      tone(s, { type: 'sawtooth', f0: 110, f1: 55, t, dur: 0.5, gain: 0.3 });
      noiseBurst(s, { t, dur: 0.4, gain: 0.3, f0: 1500, f1: 100 });
      tone(s, { type: 'square', f0: 220, t: t + 0.25, dur: 0.25, gain: 0.2 });
      break;
    case 'stun':
      for (let i = 0; i < 5; i++) tone(s, { type: 'sine', f0: 900 + i * 220, f1: 500 + i * 120, t: t + i * 0.04, dur: 0.14, gain: 0.16 });
      break;
    case 'fire':
      noiseBurst(s, { t, dur: 0.55, gain: 0.5, filter: 'bandpass', f0: 900, f1: 400, q: 0.8 });
      tone(s, { type: 'sawtooth', f0: 90, f1: 60, t, dur: 0.5, gain: 0.14 });
      break;
    case 'sliotar':
      noiseBurst(s, { t, dur: 0.05, gain: 0.5, f0: 4000, f1: 800 });
      tone(s, { type: 'sine', f0: 1400, f1: 300, t, dur: 0.14, gain: 0.35 });
      break;
    case 'deflect':
      tone(s, { type: 'triangle', f0: 1800, f1: 1200, t, dur: 0.12, gain: 0.3 });
      noiseBurst(s, { t, dur: 0.05, gain: 0.3, filter: 'highpass', f0: 4000 });
      break;
    case 'heatWarning':
      tone(s, { type: 'sine', f0: 400, t, dur: 0.12, gain: 0.25 });
      tone(s, { type: 'sine', f0: 400, t: t + 0.18, dur: 0.12, gain: 0.25 });
      break;
    case 'enemyDown':
      tone(s, { type: 'triangle', f0: 180, f1: 50, t, dur: 0.3, gain: 0.35 });
      noiseBurst(s, { t: t + 0.2, dur: 0.1, gain: 0.25, f0: 700, f1: 100 });
      break;
    case 'abilityUnlocked':
      [523, 659, 784, 1047].forEach((f, i) => tone(s, { type: 'square', f0: f, t: t + i * 0.08, dur: 0.12, gain: 0.18 }));
      break;
  }
}
