/**
 * Synthesised audio. DESIGN.md section 9, docs/style-guide.md section 7.
 * `createAudio(bus, getSettings)` subscribes to game events and plays the
 * matching effects; chapters call `setRegion` (or hook `screen:entered`).
 */

import { TUNING } from '../content/tuning';
import { GameEvents } from '../core/types';
import type { AbilityId, AlarmFightId, AudioSettings, GameEventBus, RegionId } from '../core/types';
import { MusicPlayer } from './music';
import { MAX_BOSS_LEVEL } from './themes';
import { EFFECT_IDS, makeNoiseBuffer, renderEffect } from './synth';
import type { EffectId, Synth } from './synth';

export type { EffectId };
export { EFFECT_IDS };

export interface Audio {
  /** Resume the AudioContext. Also happens automatically on the first key press or click. */
  unlock(): void;
  setRegion(region: RegionId): void;
  stopMusic(): void;
  play(effectId: EffectId): void;
  /** Re-read the settings now (they are also polled a few times a second). */
  applySettings(): void;
  dispose(): void;
}

const MUSIC_LEVEL = 0.45;
const EFFECTS_LEVEL = 0.8;
const ALARM_CYCLE_MS = 600;

/** Text clicks never come faster than this, whatever the typewriter speed. */
const MAX_CLICKS_PER_SECOND = 30;
const BLIPS: ReadonlySet<EffectId> = new Set<EffectId>(['blipAndrew', 'blipMyko', 'blipOther', 'blipAlien']);

const ABILITY_SOUND: Partial<Record<AbilityId, EffectId>> = {
  bottleThrow: 'bottleThrow',
  hurley: 'hurley',
  sliotarStrike: 'sliotar',
  poitinBreath: 'fire',
  borrowedGlove: 'stun',
  stoutSlam: 'haymaker',
};

function noopAudio(): Audio {
  return { unlock: () => undefined, setRegion: () => undefined, stopMusic: () => undefined, play: () => undefined, applySettings: () => undefined, dispose: () => undefined };
}

/**
 * @param context optional context, for offline rendering in tests; defaults to a new AudioContext.
 */
export function createAudio(bus: GameEventBus, getSettings: () => AudioSettings, context?: BaseAudioContext): Audio {
  let ctx: BaseAudioContext;
  if (context !== undefined) ctx = context;
  else {
    const Ctor = typeof AudioContext === 'undefined' ? undefined : AudioContext;
    if (Ctor === undefined) return noopAudio();
    try {
      ctx = new Ctor();
    } catch {
      return noopAudio();
    }
  }
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const sfxGain = ctx.createGain();
  const musicGain = ctx.createGain();
  sfxGain.connect(master);
  musicGain.connect(master);
  const noise = makeNoiseBuffer(ctx);
  const sfx: Synth = { ctx, dest: sfxGain, noise };
  const music = new MusicPlayer(ctx, musicGain, noise);

  const clamp = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
  const applySettings = (): void => {
    const s = getSettings();
    const t = ctx.currentTime;
    musicGain.gain.setTargetAtTime(clamp(s.musicVolume) * MUSIC_LEVEL, t, 0.03);
    sfxGain.gain.setTargetAtTime(clamp(s.effectsVolume) * EFFECTS_LEVEL, t, 0.03);
  };
  applySettings();
  const settingsTimer = setInterval(applySettings, 250);

  const running = (): boolean => ctx.state === 'running';

  let lastClick = -1;
  const play = (id: EffectId): void => {
    if (!running()) return;
    if (BLIPS.has(id)) {
      if (ctx.currentTime - lastClick < 1 / MAX_CLICKS_PER_SECOND) return;
      lastClick = ctx.currentTime;
    }
    applySettings();
    renderEffect(id, sfx, ctx.currentTime + 0.005);
  };

  // Alarm loop: two alternating tones until its fight ends.
  let alarmTimer: ReturnType<typeof setInterval> | null = null;
  let alarmFight: AlarmFightId | null = null;
  const stopAlarm = (): void => {
    if (alarmTimer !== null) clearInterval(alarmTimer);
    alarmTimer = null;
    alarmFight = null;
  };
  const startAlarm = (fight: AlarmFightId): void => {
    stopAlarm();
    alarmFight = fight;
    play('alarm');
    alarmTimer = setInterval(() => play('alarm'), ALARM_CYCLE_MS);
  };

  // Myko call-in: the music cuts out completely until the called section completes.
  let callSection: string | null = null;
  const endCall = (): void => {
    callSection = null;
    music.setSilent(false);
  };

  // Boss music: intense while a boss or set piece is on, one step more at each phase change.
  let bossSection: string | null = null;
  let bossLevel = 0;
  let bossPhases = 0;
  const endBoss = (): void => {
    bossSection = null;
    bossLevel = 0;
    bossPhases = 0;
    music.setIntensity(0);
  };

  const haymakerKnockback = TUNING.abilities.punchCombo.combo?.at(-1)?.knockback ?? Infinity;
  const heatWarnAt = TUNING.heat.max * TUNING.heat.thermalDetectFraction;
  let lastHeat = 0;

  const unlock = (): void => {
    if (ctx.state === 'suspended' && 'resume' in ctx) {
      void (ctx as AudioContext).resume().then(() => music.resumed());
    }
  };
  const gesture = (): void => unlock();
  if (context === undefined && typeof window !== 'undefined') {
    window.addEventListener('pointerdown', gesture);
    window.addEventListener('keydown', gesture);
  }
  ctx.addEventListener?.('statechange', () => {
    if (running()) music.resumed();
  });

  const G = GameEvents;
  const unsubs: Array<() => void> = [
    bus.on(G.PlayerDamaged, () => play('hurt')),
    bus.on(G.PlayerDied, () => {
      stopAlarm();
      endCall();
      endBoss();
      play('fallOver');
    }),
    bus.on(G.PlayerRespawned, () => {
      stopAlarm();
      endCall();
      endBoss();
    }),
    bus.on(G.SectionStarted, ({ sectionId, kind }) => {
      if (kind !== 'boss' && kind !== 'setpiece') return;
      bossSection = sectionId;
      bossLevel = 1;
      bossPhases = 0;
      music.setIntensity(bossLevel);
    }),
    bus.on(G.BuzzBanjaxedPhase, ({ phase }) => {
      if (phase === 'fallen') play('fallOver');
    }),
    bus.on(G.EnemyDamaged, ({ hit }) => {
      const src = hit.source;
      if (src.kind === 'player' && src.abilityId === 'hurley') play('hurley');
      else if (src.kind === 'player' && src.abilityId === 'sliotarStrike') play('hit');
      else if (src.kind === 'player' && src.abilityId === 'punchCombo' && Math.hypot(hit.knockback.x, hit.knockback.y) >= haymakerKnockback) play('haymaker');
      else if (src.kind === 'player' && src.abilityId === 'stoutSlam') play('haymaker');
      else play('hit');
    }),
    bus.on(G.EnemyDefeated, () => play('enemyDown')),
    bus.on(G.AbilityUsed, ({ abilityId }) => {
      const e = ABILITY_SOUND[abilityId];
      if (e !== undefined && e !== 'hurley') play(e);
    }),
    bus.on(G.AbilityUnlocked, () => play('abilityUnlocked')),
    bus.on(G.DrinkConsumed, () => play('drink')),
    bus.on(G.FoodConsumed, () => play('drink')),
    bus.on(G.PickupCollected, () => play('pickup')),
    bus.on(G.PickupRefused, () => play('refuse')),
    bus.on(G.EvidenceFound, () => play('pickup')),
    bus.on(G.DeductionSubmitted, ({ correct }) => play(correct ? 'save' : 'refuse')),
    bus.on(G.StealthNoise, ({ kind }) => {
      if (kind === 'bottle') play('bottleSmash');
      else if (kind === 'footstep' || kind === 'sneakFootstep') play('footstep');
    }),
    bus.on(G.StealthAlertChanged, ({ to }) => {
      if (to === 'detecting') play('detectionTick');
    }),
    bus.on(G.StealthAlarm, ({ fightId }) => startAlarm(fightId)),
    bus.on(G.BossPhaseChanged, () => {
      play('bossPhase');
      // The first phase is announced when the boss starts; later ones step the music up.
      if (bossSection === null) return;
      bossPhases++;
      if (bossPhases > 1) {
        bossLevel = Math.min(MAX_BOSS_LEVEL, bossLevel + 1);
        music.setIntensity(bossLevel);
      }
    }),
    bus.on(G.HeatChanged, ({ active, value }) => {
      if (active && lastHeat < heatWarnAt && value >= heatWarnAt) play('heatWarning');
      lastHeat = active ? value : 0;
    }),
    bus.on(G.SaveWritten, () => play('save')),
    bus.on(G.PropBroken, ({ frame }) => play(/bottle|flowerPot/i.test(frame) ? 'breakGlass' : /barrel|sack|cardboard/i.test(frame) ? 'smallCrash' : 'breakWood')),
    bus.on(G.MykoCallStarted, ({ sectionId }) => {
      callSection = sectionId;
      music.setSilent(true);
      play('mykoCallIn');
    }),
    bus.on(G.SectionCompleted, ({ sectionId }) => {
      if (alarmFight !== null && sectionId === alarmFight) stopAlarm();
      if (bossSection !== null && sectionId === bossSection) endBoss();
      if (callSection !== null && sectionId === callSection) endCall();
    }),
    bus.on(G.ChapterStarted, () => {
      stopAlarm();
      endCall();
      endBoss();
    }),
    bus.on(G.ChapterCompleted, () => {
      stopAlarm();
      endCall();
      endBoss();
    }),
  ];

  return {
    unlock,
    setRegion: (region) => music.setRegion(region),
    stopMusic: () => music.stop(),
    play,
    applySettings,
    dispose: () => {
      for (const u of unsubs) u();
      stopAlarm();
      clearInterval(settingsTimer);
      music.dispose();
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointerdown', gesture);
        window.removeEventListener('keydown', gesture);
      }
      if ('close' in ctx && context === undefined) void (ctx as AudioContext).close();
    },
  };
}
