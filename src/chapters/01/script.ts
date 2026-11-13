/**
 * Chapter 1 script: every beat in the spec, in order. All text is referred to
 * by ID; all numbers that matter come from `TUNING`.
 */

import { hasSequence, sequence } from '../../content/dialogue';
import type { BossHooks, ChapterContext, ChapterScript, FightHooks } from '../../systems';
import { GameEvents } from '../../core/types';
import type { ScreenAmbient } from '../../core/chapter';
import type { SectionId } from '../../core/types';
import { hidePrompt, showPrompt } from '../../ui/prompts';
import { BOG_LIGHTS_START, CHURCH_GATE, MACHINE_AREA, MYKO_SEAT, ROAD_DARK, TRACTOR } from './maps';

const OBJ = {
  bar: 'c1.bar',
  dympna: 'c1.dympna',
  pint: 'c1.pint',
  machine: 'c1.machine',
  leave: 'c1.leave',
  kegs: 'c1.kegs',
  chipper: 'c1.chipper',
  row: 'c1.row',
  bigTom: 'c1.bigTom',
  road: 'c1.road',
} as const;

/** Presentation only: how long a prompt may linger when nothing the player does can dismiss it. */
const PROMPT_LINGER_MS = 7000;
/** Presentation only: the sighting. The lights drift west over the bog, then sink behind the hill. */
const LIGHTS_DRIFT_MS = 8000;
const LIGHTS_SINK_MS = 4000;
const LIGHTS_DRIFT_TILES = 6;
const LIGHTS_SINK_TILES = 5;
const LIGHTS_TICK_MS = 100;

type Flag =
  | 'pub.step'
  | 'intro.done'
  | 'machine.intro'
  | 'mykoFree'
  | 'yard.told'
  | 'street.seen'
  | 'chipper.started'
  | 'cp.done'
  | 'boss.started'
  | 'jacket.on'
  | 'road.before'
  | 'road.done';

const inTiles = (c: { col: number; row: number; width: number; height: number }, col: number, row: number): boolean =>
  col >= c.col && col < c.col + c.width && row >= c.row && row < c.row + c.height;

export function createChapterScript(ctx: ChapterContext): ChapterScript {
  let disposed = false;
  let clock = 0;
  const unsubs: Array<() => void> = [];
  const timers: Array<{ at: number; run: () => void }> = [];
  let lightsTimer: ReturnType<typeof setInterval> | null = null;

  const flag = (key: Flag): boolean => ctx.flag(key) === true;
  const setFlag = (key: Flag, value = true): void => ctx.setFlag(key, value);
  const step = (): number => Number(ctx.flag('pub.step') ?? 0);
  const setStep = (n: number): void => ctx.setFlag('pub.step', n);
  const after = (ms: number, run: () => void): void => void timers.push({ at: clock + ms, run });

  // --- Tutorial prompts: one at a time, never over a scene, gone when the player has done the thing ---

  let wanted: string | null = null;
  let scenesOpen = 0;
  let moveFrom: { x: number; y: number } | null = null;
  const sync = (): void => {
    if (wanted !== null && scenesOpen === 0) showPrompt(wanted);
    else hidePrompt();
  };
  const setPrompt = (id: string, lingerMs?: number): void => {
    wanted = id;
    moveFrom = id === 'ui.prompt.move' ? { ...ctx.playerPosition() } : null;
    sync();
    if (lingerMs !== undefined) after(lingerMs, () => clearPrompt(id));
  };
  const clearPrompt = (id?: string): void => {
    if (id !== undefined && wanted !== id) return;
    wanted = null;
    moveFrom = null;
    sync();
  };

  /** The objective Andrew should have, from what has happened so far. */
  const restoreObjective = (): void => {
    if (ctx.isComplete('c1.boss.bigtom')) ctx.setObjective(OBJ.road);
    else if (ctx.isComplete('c1.fight.chipper')) ctx.setObjective(OBJ.bigTom);
    else if (flag('chipper.started')) ctx.setObjective(OBJ.row);
    else if (flag('street.seen')) ctx.setObjective(OBJ.chipper);
    else if (ctx.isComplete('c1.puzzle.kegs')) ctx.setObjective(OBJ.chipper);
    else if (flag('mykoFree')) ctx.setObjective(OBJ.kegs);
    else if (step() >= 5) ctx.setObjective(OBJ.leave);
    else if (step() === 4) ctx.setObjective(OBJ.machine);
    else if (step() >= 2) ctx.setObjective(OBJ.pint);
    else if (step() === 1) ctx.setObjective(OBJ.dympna);
    else if (flag('intro.done')) ctx.setObjective(OBJ.bar);
  };

  // --- Pub ----------------------------------------------------------------

  const opening = async (): Promise<void> => {
    // The title card plays over the first scene, not before it.
    void ctx.say('c1.caption.title');
    await ctx.say('c1.pub.open');
    if (disposed) return;
    setFlag('intro.done');
    ctx.setObjective(OBJ.bar);
    setPrompt('ui.prompt.move');
    void ctx.say('c1.caption.pub');
  };

  const reachedBar = async (): Promise<void> => {
    setStep(1);
    clearPrompt('ui.prompt.move');
    await ctx.say('c1.pub.stool');
    if (disposed) return;
    ctx.setObjective(OBJ.dympna);
  };

  const talkedToDympna = async (): Promise<void> => {
    setStep(2);
    await ctx.say('c1.pub.thursday');
    await ctx.say('c1.pub.pint');
    if (disposed) return;
    ctx.give({ kind: 'drink', drinkId: 'stout', count: 1 });
    ctx.setObjective(OBJ.pint);
    setPrompt('ui.prompt.drink');
  };

  const drankThePint = async (): Promise<void> => {
    setStep(3);
    clearPrompt('ui.prompt.drink');
    await ctx.say('c1.pub.buzz');
    await ctx.say('c1.pub.listEnd');
    if (disposed) return;
    setStep(4);
    ctx.setObjective(OBJ.machine);
  };

  const machineIntro = async (): Promise<void> => {
    setFlag('machine.intro');
    await ctx.say('c1.machine.intro');
    if (disposed) return;
    setPrompt('ui.prompt.punch');
  };

  const machinePays = async (): Promise<void> => {
    setStep(5);
    clearPrompt('ui.prompt.punch');
    await ctx.say('c1.machine.payout');
    await ctx.say('c1.lockin.door');
    if (disposed) return;
    ctx.setExitLocked('c1.pub.backdoor', false);
    ctx.setObjective(OBJ.leave);
  };

  // --- Yard and street ----------------------------------------------------

  const enteredYard = (): void => {
    clearPrompt();
    if (!flag('mykoFree')) {
      setFlag('mykoFree');
      ctx.setMykoScripted(null);
    }
    ctx.completeSection('c1.explore.pub');
    if (ctx.isComplete('c1.puzzle.kegs')) return;
    ctx.startSection('c1.puzzle.kegs');
    ctx.setObjective(OBJ.kegs);
    if (!flag('yard.told')) {
      setFlag('yard.told');
      void ctx.say('c1.yard.kegs');
    }
    setPrompt('ui.prompt.push', PROMPT_LINGER_MS);
  };

  const enteredStreet = (): void => {
    clearPrompt();
    if (flag('street.seen')) return;
    setFlag('street.seen');
    void ctx.say('c1.caption.street');
    ctx.setObjective(OBJ.chipper);
  };

  const chipperRow = async (): Promise<void> => {
    setFlag('chipper.started');
    await ctx.say('c1.chipper.intro');
    if (disposed) return;
    ctx.completeSection('c1.explore.street');
    ctx.setObjective(OBJ.row);
    // The lad who took the last spice bag steps out of the queue and into the fight.
    ctx.setNpcVisible('queue3', false);
    ctx.startSection('c1.fight.chipper');
  };

  const atCheckpoint = async (): Promise<void> => {
    setFlag('cp.done');
    ctx.reachCheckpoint('c1.cp.boss');
    await ctx.say('c1.call.prompt');
    if (disposed) return;
    setPrompt('ui.prompt.callMyko', PROMPT_LINGER_MS);
  };

  const bigTomArrives = async (): Promise<void> => {
    setFlag('boss.started');
    clearPrompt();
    await ctx.say('c1.bigTom.intro');
    if (disposed) return;
    ctx.setObjective(OBJ.bigTom);
    ctx.startSection('c1.boss.bigtom');
  };

  // --- Bog road -----------------------------------------------------------

  const stopLights = (): void => {
    if (lightsTimer !== null) clearInterval(lightsTimer);
    lightsTimer = null;
  };

  /** Three lights over the bog: drift, sink behind the hill, and take their glow with them. */
  const lightsAppear = (): void => {
    ctx.setPropVisible('bogLights', true);
    const t0 = performance.now();
    stopLights();
    lightsTimer = setInterval(() => {
      const t = performance.now() - t0;
      const drift = Math.min(1, t / LIGHTS_DRIFT_MS);
      const sink = Math.max(0, Math.min(1, (t - LIGHTS_DRIFT_MS) / LIGHTS_SINK_MS));
      const col = Math.round(BOG_LIGHTS_START.col - LIGHTS_DRIFT_TILES * drift);
      const row = Math.round(BOG_LIGHTS_START.row + LIGHTS_SINK_TILES * sink);
      if (sink >= 1) {
        ctx.setPropVisible('bogLights', false);
        ctx.setAmbient(ROAD_DARK, 'c1.road');
        stopLights();
        return;
      }
      ctx.setPropTile('bogLights', col, row);
      const glow: ScreenAmbient = { ...ROAD_DARK, lights: [{ x: (col + 1.5) * 16, y: (row + 0.5) * 16, radius: 72, colour: 'fluoro' }] };
      ctx.setAmbient(glow, 'c1.road');
    }, LIGHTS_TICK_MS);
  };

  const enteredRoad = async (): Promise<void> => {
    clearPrompt();
    if (flag('road.before')) return;
    setFlag('road.before');
    ctx.setObjective(OBJ.road);
    void ctx.say('c1.caption.road');
    await ctx.say('c1.lights.before');
  };

  const theLights = async (): Promise<void> => {
    setFlag('road.done');
    lightsAppear();
    await ctx.say('c1.lights.seen');
    await ctx.say('c1.closing');
    if (disposed) return;
    stopLights();
    ctx.completeSection('c1.explore.road');
    ctx.completeChapter();
  };

  // --- Hooks --------------------------------------------------------------

  const fightHooks: FightHooks = {
    onWaveCleared: (index) => {
      if (index === 0) void ctx.say('c1.chipper.wave2');
    },
  };

  const bigTomHooks: BossHooks = {
    onStart: () => {
      // A fresh attempt: jacket back on.
      setFlag('jacket.on', false);
      ctx.setPropVisible('jacket', false);
    },
    onChargeBlocked: (boss, body, col, row) => {
      if (!inTiles(TRACTOR, col, row) && !inTiles(CHURCH_GATE, col, row)) return;
      boss.daze(body.tag);
      void ctx.say('c1.bigTom.dazed');
    },
    onPhaseChanged: (boss, phase) => {
      if (phase.id !== 'jacketOff') return;
      boss.setSprite('bigtom', 'boss.c1.boss.bigtom.jacketOff');
      setFlag('jacket.on');
      ctx.setPropVisible('jacket', true);
      void ctx.say('c1.bigTom.phase2');
    },
    onEnd: () => {
      void ctx.say('c1.bigTom.end');
      ctx.setObjective(OBJ.road);
    },
  };

  return {
    onStart: () => {
      ctx.unlockAbility('punchCombo');
      ctx.setExitLocked('c1.pub.backdoor', step() < 5);
      if (ctx.currentScreen() === 'c1.pub' && !flag('mykoFree')) ctx.setMykoScripted(MYKO_SEAT);
      // Run-time dressing state is not saved; put it back from flags.
      if (flag('jacket.on')) ctx.setPropVisible('jacket', true);
      if (flag('chipper.started')) ctx.setNpcVisible('queue3', false);
      unsubs.push(
        ctx.onMeleeHit(
          MACHINE_AREA,
          (hit) => {
            if (hit.haymaker && step() === 4 && flag('machine.intro')) void machinePays();
          },
          'c1.pub',
        ),
        ctx.bus.on(GameEvents.DrinkConsumed, () => {
          clearPrompt('ui.prompt.drink');
          if (step() === 2) {
            setStep(3);
            after(900, () => void drankThePint());
          }
        }),
        ctx.bus.on(GameEvents.AbilityUsed, ({ abilityId }) => {
          if (abilityId === 'punchCombo') clearPrompt('ui.prompt.punch');
        }),
        ctx.bus.on(GameEvents.MykoCallStarted, () => clearPrompt('ui.prompt.callMyko')),
        ctx.bus.on(GameEvents.DialogueShow, ({ sequenceId }) => {
          if (hasSequence(sequenceId) && sequence(sequenceId).delivery === 'scene') {
            scenesOpen++;
            sync();
          }
        }),
        ctx.bus.on(GameEvents.DialogueFinished, ({ sequenceId }) => {
          if (hasSequence(sequenceId) && sequence(sequenceId).delivery === 'scene') {
            scenesOpen = Math.max(0, scenesOpen - 1);
            sync();
          }
        }),
      );
      if (step() === 0 && !flag('intro.done')) void opening();
      else restoreObjective();
    },

    onScreenEntered: (screenId) => {
      if (screenId === 'c1.yard') enteredYard();
      else if (screenId === 'c1.street') enteredStreet();
      else if (screenId === 'c1.road') void enteredRoad();
    },

    onTrigger: (id) => {
      switch (id) {
        case 'c1.trig.bar':
          if (step() === 0 && flag('intro.done')) void reachedBar();
          break;
        case 'c1.trig.machine':
          if (step() === 4 && !flag('machine.intro')) void machineIntro();
          break;
        case 'c1.trig.chipper':
          if (!flag('chipper.started')) void chipperRow();
          break;
        case 'c1.trig.checkpoint':
          if (ctx.isComplete('c1.fight.chipper') && !flag('cp.done')) void atCheckpoint();
          break;
        case 'c1.trig.boss':
          if (flag('cp.done') && !flag('boss.started') && !ctx.isComplete('c1.boss.bigtom')) void bigTomArrives();
          break;
        case 'c1.trig.lights':
          if (flag('road.before') && !flag('road.done')) void theLights();
          break;
      }
    },

    onExamine: (id) => {
      if (id !== 'c1.dympna') return undefined;
      if (step() === 1) void talkedToDympna();
      return true;
    },

    onSectionCompleted: (sectionId: SectionId) => {
      if (sectionId === 'c1.puzzle.kegs') {
        clearPrompt('ui.prompt.push');
        void ctx.say('c1.yard.done');
        ctx.setObjective(OBJ.chipper);
      } else if (sectionId === 'c1.fight.chipper') {
        void ctx.say('c1.chipper.end');
        ctx.setObjective(OBJ.bigTom);
      }
    },

    onUpdate: (dtMs) => {
      clock += dtMs;
      if (moveFrom !== null) {
        const p = ctx.playerPosition();
        if (Math.hypot(p.x - moveFrom.x, p.y - moveFrom.y) > 3) clearPrompt('ui.prompt.move');
      }
      for (let i = timers.length - 1; i >= 0; i--) {
        const t = timers[i];
        if (t && t.at <= clock) {
          timers.splice(i, 1);
          t.run();
        }
      }
    },

    fightHooks: { 'c1.fight.chipper': fightHooks },
    bossHooks: { 'c1.boss.bigtom': bigTomHooks },

    debugWalk: () => {
      setStep(5);
      setFlag('mykoFree');
      ctx.setMykoScripted(null);
    },

    dispose: () => {
      disposed = true;
      stopLights();
      for (const off of unsubs) off();
      hidePrompt();
    },
  };
}
