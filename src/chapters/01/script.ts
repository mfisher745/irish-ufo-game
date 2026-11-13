/**
 * Chapter 1 script: every beat in the spec, in order. All text is referred to
 * by ID; all numbers that matter come from `TUNING`.
 */

import { TUNING } from '../../content/tuning';
import type { BossHooks, ChapterContext, ChapterScript, FightHooks } from '../../systems';
import { GameEvents } from '../../core/types';
import type { SectionId } from '../../core/types';
import { hidePrompt, showPrompt } from '../../ui/prompts';
import { CHURCH_GATE, MYKO_SEAT, T, TRACTOR } from './maps';

/** Game design says "double damage" for a dazed Big Tom; tuning.ts has no field for it yet. */
const DAZED_DAMAGE_MULTIPLIER = 2;
/** The boss's walking pace is not in tuning.ts either (BossBodyPlacement.moveSpeed). */
export const BIG_TOM_MOVE_SPEED = 48;

/** The fruit machine is in the west wall at (1, 7); Andrew punches it from the tile beside. */
const MACHINE_REACH = 28;
const MACHINE_POS = T(1, 7);

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

const PROMPT_LINGER_MS = 7000;

type Flag = 'pub.step' | 'intro.done' | 'machine.intro' | 'mykoFree' | 'yard.told' | 'street.seen' | 'chipper.started' | 'cp.done' | 'boss.started' | 'road.before' | 'road.done';

const inTiles = (c: { col: number; row: number; width: number; height: number }, col: number, row: number): boolean =>
  col >= c.col && col < c.col + c.width && row >= c.row && row < c.row + c.height;

export function createChapterScript(ctx: ChapterContext): ChapterScript {
  let disposed = false;
  let clock = 0;
  const unsubs: Array<() => void> = [];
  const timers: Array<{ at: number; run: () => void }> = [];
  let punches = 0;
  let lastPunchAt = -1e9;

  const flag = (key: Flag): boolean => ctx.flag(key) === true;
  const setFlag = (key: Flag): void => ctx.setFlag(key, true);
  const step = (): number => Number(ctx.flag('pub.step') ?? 0);
  const setStep = (n: number): void => ctx.setFlag('pub.step', n);
  const after = (ms: number, run: () => void): void => void timers.push({ at: clock + ms, run });
  const prompt = (id: string, lingerMs?: number): void => {
    showPrompt(id);
    if (lingerMs !== undefined) after(lingerMs, () => hidePrompt(id));
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
    await ctx.say('c1.caption.title');
    if (disposed) return;
    void ctx.say('c1.caption.pub');
    await ctx.say('c1.pub.open');
    if (disposed) return;
    setFlag('intro.done');
    ctx.setObjective(OBJ.bar);
    prompt('ui.prompt.move');
  };

  const reachedBar = async (): Promise<void> => {
    setStep(1);
    hidePrompt('ui.prompt.move');
    await ctx.say('c1.pub.stool');
    if (disposed) return;
    ctx.setObjective(OBJ.dympna);
    prompt('ui.prompt.talk');
  };

  const talkedToDympna = async (): Promise<void> => {
    setStep(2);
    hidePrompt('ui.prompt.talk');
    await ctx.say('c1.pub.thursday');
    await ctx.say('c1.pub.pint');
    if (disposed) return;
    ctx.give({ kind: 'drink', drinkId: 'stout', count: 1 });
    ctx.setObjective(OBJ.pint);
    prompt('ui.prompt.drink');
  };

  const drankThePint = async (): Promise<void> => {
    setStep(3);
    hidePrompt('ui.prompt.drink');
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
    prompt('ui.prompt.punch');
  };

  const machinePays = async (): Promise<void> => {
    setStep(5);
    hidePrompt('ui.prompt.punch');
    await ctx.say('c1.machine.payout');
    await ctx.say('c1.lockin.door');
    if (disposed) return;
    ctx.setExitLocked('c1.pub.backdoor', false);
    ctx.setObjective(OBJ.leave);
  };

  const comboWindowMs = (): number => {
    const combo = TUNING.abilities.punchCombo.combo ?? [];
    return Math.max(0, ...combo.map((c) => c.windowMs));
  };

  const onPunch = (): void => {
    if (step() !== 4 || !flag('machine.intro')) return;
    const p = ctx.playerPosition();
    if (Math.hypot(p.x - MACHINE_POS.x, p.y - MACHINE_POS.y) > MACHINE_REACH) return;
    if (clock - lastPunchAt > comboWindowMs()) punches = 0;
    lastPunchAt = clock;
    punches++;
    // The third swing of the combo is the haymaker.
    if (punches >= TUNING.abilities.punchCombo.combo!.length) {
      punches = 0;
      void machinePays();
    }
  };

  // --- Yard and street ----------------------------------------------------

  const enteredYard = (): void => {
    hidePrompt();
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
    prompt('ui.prompt.push');
  };

  const enteredStreet = async (): Promise<void> => {
    hidePrompt('ui.prompt.push');
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
    ctx.startSection('c1.fight.chipper');
    prompt('ui.prompt.punch', PROMPT_LINGER_MS);
  };

  const atCheckpoint = async (): Promise<void> => {
    setFlag('cp.done');
    ctx.reachCheckpoint('c1.cp.boss');
    await ctx.say('c1.call.prompt');
    if (disposed) return;
    prompt('ui.prompt.callMyko', PROMPT_LINGER_MS);
  };

  const bigTomArrives = async (): Promise<void> => {
    setFlag('boss.started');
    await ctx.say('c1.bigTom.intro');
    if (disposed) return;
    ctx.setObjective(OBJ.bigTom);
    ctx.startSection('c1.boss.bigtom');
  };

  // --- Bog road -----------------------------------------------------------

  const enteredRoad = async (): Promise<void> => {
    if (flag('road.before')) return;
    setFlag('road.before');
    ctx.setObjective(OBJ.road);
    void ctx.say('c1.caption.road');
    await ctx.say('c1.lights.before');
  };

  const theLights = async (): Promise<void> => {
    setFlag('road.done');
    await ctx.say('c1.lights.seen');
    await ctx.say('c1.closing');
    if (disposed) return;
    ctx.completeSection('c1.explore.road');
    ctx.completeChapter();
  };

  // --- Hooks --------------------------------------------------------------

  const fightHooks: FightHooks = {
    onWaveCleared: (index) => {
      if (index === 0) void ctx.say('c1.chipper.wave2');
    },
  };

  /** Time left on the double-damage daze. */
  let dazeLeftMs = 0;
  const bigTomHooks: BossHooks = {
    // Workaround: the actor's own daze reset is skipped when the charge's recovery begins right after the stun
    // (src/systems/enemies.ts finishBurstShot), so the multiplier is put back here when the daze time is up.
    onTick: (boss, dtMs) => {
      if (dazeLeftMs <= 0) return;
      dazeLeftMs -= dtMs;
      if (dazeLeftMs <= 0) {
        const body = boss.body('bigtom');
        if (body) body.damageTakenMultiplier = 1;
      }
    },
    onChargeBlocked: (boss, body, col, row) => {
      if (!inTiles(TRACTOR, col, row) && !inTiles(CHURCH_GATE, col, row)) return;
      const charge = boss.phase?.attacks.find((a) => a.id === 'bullCharge');
      // Dazed for the charge's recovery time (2 seconds in tuning), taking double damage.
      dazeLeftMs = charge?.recoveryMs ?? 0;
      boss.daze(body.tag, dazeLeftMs, DAZED_DAMAGE_MULTIPLIER);
      void ctx.say('c1.bigTom.dazed');
    },
    onPhaseChanged: (_boss, phase) => {
      if (phase.id === 'jacketOff') void ctx.say('c1.bigTom.phase2');
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
      unsubs.push(
        ctx.bus.on(GameEvents.DrinkConsumed, () => {
          if (step() === 2) {
            setStep(3);
            after(900, () => void drankThePint());
          }
        }),
        ctx.bus.on(GameEvents.AbilityUsed, ({ abilityId }) => {
          if (abilityId === 'punchCombo') onPunch();
        }),
      );
      if (step() === 0 && !flag('intro.done')) void opening();
      else restoreObjective();
    },

    onScreenEntered: (screenId) => {
      if (screenId === 'c1.yard') enteredYard();
      else if (screenId === 'c1.street') void enteredStreet();
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
        hidePrompt('ui.prompt.push');
        void ctx.say('c1.yard.done');
        ctx.setObjective(OBJ.chipper);
      } else if (sectionId === 'c1.fight.chipper') {
        hidePrompt('ui.prompt.punch');
        void ctx.say('c1.chipper.end');
        ctx.setObjective(OBJ.bigTom);
      }
    },

    onUpdate: (dtMs) => {
      clock += dtMs;
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
      for (const off of unsubs) off();
      hidePrompt();
    },
  };
}
