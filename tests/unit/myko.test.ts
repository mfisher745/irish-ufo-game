/** DESIGN.md 7.5: Myko hints, comments and the three-call call-in, unit level and run level. */

import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { EventBus } from '../../src/core/events';
import { NO_INPUT } from '../../src/core/input';
import { seededRandom } from '../../src/core/random';
import type { Completable, CompletableKind, CompletableSectionId, DialogueId, MykoCallKind, ObjectiveDef } from '../../src/core/types';
import { Myko, evaluateCall } from '../../src/systems/myko';
import type { CallTarget, MykoHost } from '../../src/systems/myko';
import { hasSequence, sequence } from '../../src/content/dialogue';
import { advance, frame, holdM, makeRun, record, teleport } from './helpers';
import type { RunHarness } from './helpers';

/** The UI's side of the blackout: reports the current blackout's cards finished. */
function finishBlackout(h: RunHarness, seen: { sequenceId: string }[]): void {
  const last = seen.at(-1);
  if (!last) throw new Error('no blackout was shown');
  h.run.dialogueFinished(last.sequenceId);
}

const fakeCompletable = (id: string, kind: CompletableKind = 'fight', log: string[] = []): Completable & { done: boolean } => {
  const c = {
    sectionId: id as CompletableSectionId,
    kind,
    done: false,
    isComplete: () => c.done,
    completeNow: (src: string) => {
      log.push(`complete:${src}`);
      c.done = true;
    },
  };
  return c;
};

describe('evaluateCall (pure rules)', () => {
  const target = (id: string, kind: CompletableKind = 'fight'): CallTarget => ({ completable: fakeCompletable(id, kind), entrance: null });

  it('allows a callable section with calls left', () => {
    expect(evaluateCall({ callsLeft: 3, target: target('c1.fight.chipper'), stealthUncaught: false })).toEqual({ ok: true });
  });
  it.each(['fight', 'boss', 'setpiece', 'puzzle', 'deduction'] as const)('allows a %s', (kind) => {
    expect(evaluateCall({ callsLeft: 1, target: target('c1.x.y', kind), stealthUncaught: false })).toEqual({ ok: true });
  });
  it('refuses with none left', () => {
    expect(evaluateCall({ callsLeft: 0, target: target('c1.fight.chipper'), stealthUncaught: false })).toMatchObject({ ok: false, reason: 'noCallsLeft' });
  });
  it('refuses with no section', () => {
    expect(evaluateCall({ callsLeft: 3, target: null, stealthUncaught: false })).toMatchObject({ ok: false, reason: 'noSection' });
  });
  it('refuses during stealth that has not become a fight', () => {
    expect(evaluateCall({ callsLeft: 3, target: null, stealthUncaught: true })).toMatchObject({ ok: false, reason: 'notCallable' });
  });
  it('refuses a finished section', () => {
    const t = target('c1.fight.chipper');
    t.completable.completeNow('player');
    expect(evaluateCall({ callsLeft: 3, target: t, stealthUncaught: false }).ok).toBe(false);
  });
  it('always refuses c10.boss.administrator, even with calls left', () => {
    expect(evaluateCall({ callsLeft: 3, target: target('c10.boss.administrator', 'boss'), stealthUncaught: false })).toMatchObject({
      ok: false,
      reason: 'notCallable',
      administrator: true,
    });
  });
  it('but allows the anteroom fight and broadcast puzzle in chapter 10', () => {
    expect(evaluateCall({ callsLeft: 1, target: target('c10.fight.anteroom'), stealthUncaught: false }).ok).toBe(true);
    expect(evaluateCall({ callsLeft: 1, target: target('c10.puzzle.broadcast', 'puzzle'), stealthUncaught: false }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------

function fakeHost(opts: { calls?: number; target?: () => CallTarget | null; stealth?: boolean; priorCalls?: number } = {}) {
  const log: string[] = [];
  const bus = new EventBus();
  const state = { calls: opts.calls ?? 3, spent: opts.priorCalls ?? 0, saved: 0, played: [] as DialogueId[], protectedOn: false, repeat: new Map<DialogueId, boolean>() };
  const host: MykoHost = {
    bus,
    rng: seededRandom(2),
    play: (id, repeat) => {
      state.played.push(id);
      state.repeat.set(id, repeat === true);
      log.push(`play:${id}`);
    },
    pool: (id) => [`${id}.01`, `${id}.02`],
    chapter: () => 1,
    callTarget: () => (opts.target ? opts.target() : null),
    stealthUncaught: () => opts.stealth === true,
    callsLeft: () => state.calls,
    callsThisChapter: () => state.spent,
    callLines: (kind: MykoCallKind) => ({ sequenceId: `c1.call.${kind}`, casebookBodyTextId: 'b', casebookMarginTextId: 'm' }),
    spendCall: (id, kind) => {
      state.calls -= 1;
      state.spent += 1;
      state.saved += 1;
      log.push(`spend:${id}:${kind}`);
    },
    saveAfterCall: () => void log.push('saveAfter'),
    defeat: (a, by) => {
      a.knockDown();
      log.push(`defeat:${by}`);
    },
    setPlayerProtected: (on) => void (state.protectedOn = on),
    objective: (): ObjectiveDef | null => ({
      id: 'o',
      textId: 't',
      hint: { objectiveId: 'o', nudgeDialogueId: 'nudge', answerDialogueId: 'answer' },
    }),
    hintsGiven: () => hints,
    setHintsGiven: (_id, n) => void (hints = n),
    playerPos: () => ({ x: 100, y: 100 }),
    tangentPools: () => ({}),
  };
  let hints = 0;
  return { host, state, log, bus, myko: new Myko(host) };
}

describe('Myko call-in (fake host)', () => {
  it('there are three calls for the whole game, and a hold is one second', () => {
    expect(TUNING.myko.callsPerGame).toBe(3);
    expect(TUNING.myko.callHoldMs).toBe(1000);
  });

  it('a puzzle call spends the call and starts the blackout; nothing is solved until the cards are done', () => {
    const log: string[] = [];
    const c = fakeCompletable('c1.puzzle.kegs', 'puzzle', log);
    const f = fakeHost({ target: () => ({ completable: c, entrance: null }) });
    const started = record(f.bus, 'myko:callStarted');
    const blackout = record(f.bus, 'myko:blackout');
    const finished = record(f.bus, 'myko:callFinished');
    expect(f.myko.tryCall()).toBe(true);
    expect(f.log).toEqual(['spend:c1.puzzle.kegs:puzzle']);
    expect(f.state.calls).toBe(2);
    expect(f.myko.callInProgress).toBe(true);
    expect(f.state.protectedOn).toBe(true);
    expect(c.done).toBe(false);
    expect(f.state.played).toEqual([]);
    expect(started).toEqual([{ sectionId: 'c1.puzzle.kegs', kind: 'puzzle', callsLeft: 2 }]);
    expect(blackout).toEqual([{ sectionId: 'c1.puzzle.kegs', kind: 'puzzle', sequenceId: 'c1.call.puzzle.blackout' }]);
    expect(finished).toEqual([]);
    // A second call during the blackout is ignored and spends nothing.
    expect(f.myko.tryCall()).toBe(false);
    expect(f.state.calls).toBe(2);
  });

  it('when the blackout cards finish: post-call scene first, then solved by myko, then saved; Myko stands beside Andrew', () => {
    const log: string[] = [];
    const c = fakeCompletable('c1.puzzle.kegs', 'puzzle', log);
    const f = fakeHost({ target: () => ({ completable: { ...c, completeNow: (src) => (f.log.push('complete'), c.completeNow(src)) }, entrance: null }) });
    const finished = record(f.bus, 'myko:callFinished');
    f.myko.pos = { x: 5, y: 5 };
    f.myko.tryCall();
    expect(f.myko.blackoutFinished('c1.call.fight.blackout')).toBe(false); // not the current blackout
    expect(f.myko.callInProgress).toBe(true);
    expect(f.myko.blackoutFinished('c1.call.puzzle.blackout')).toBe(true);
    expect(f.log).toEqual(['spend:c1.puzzle.kegs:puzzle', 'play:c1.call.puzzle', 'complete', 'saveAfter']);
    expect(log).toEqual(['complete:myko']);
    expect(c.done).toBe(true);
    expect(finished).toEqual([{ sectionId: 'c1.puzzle.kegs', kind: 'puzzle' }]);
    expect(f.myko.callInProgress).toBe(false);
    expect(f.state.protectedOn).toBe(false);
    expect(f.myko.mode).toBe('following');
    expect(Math.hypot(f.myko.pos.x - 100, f.myko.pos.y - 100)).toBeCloseTo(TUNING.myko.followDistance, 5);
    // A late duplicate from the UI does nothing.
    expect(f.myko.blackoutFinished('c1.call.puzzle.blackout')).toBe(false);
    expect(f.log.filter((l) => l === 'saveAfter')).toHaveLength(1);
  });

  it('if the UI never reports back the game carries on by itself after blackoutTimeoutMs', () => {
    const c = fakeCompletable('c1.puzzle.kegs', 'puzzle');
    const f = fakeHost({ target: () => ({ completable: c, entrance: null }) });
    f.myko.tryCall();
    f.myko.tickCall(TUNING.myko.blackoutTimeoutMs - 1);
    expect(c.done).toBe(false);
    f.myko.tickCall(1);
    expect(c.done).toBe(true);
    expect(f.myko.callInProgress).toBe(false);
  });

  it('the call is suspended and frozen during the blackout, resumed at the end', () => {
    const c = fakeCompletable('c1.fight.chipper', 'fight');
    const calls: boolean[] = [];
    const f = fakeHost({ target: () => ({ completable: c, entrance: null, setSuspended: (on) => void calls.push(on) }) });
    f.myko.tryCall();
    expect(calls).toEqual([true]);
    f.myko.blackoutFinished('c1.call.fight.blackout');
    expect(calls).toEqual([true, false]);
  });

  it('a deduction uses the puzzle line set; a boss uses the fight set', () => {
    const d = fakeHost({ target: () => ({ completable: fakeCompletable('c3.deduction.boston', 'deduction'), entrance: null }) });
    d.myko.tryCall();
    expect(d.log).toContain('spend:c3.deduction.boston:puzzle');
    d.myko.blackoutFinished('c1.call.puzzle.blackout');
    expect(d.state.played).toEqual(['c1.call.puzzle']);
    const b = fakeHost({ target: () => ({ completable: fakeCompletable('c1.boss.bigtom', 'boss'), entrance: null }) });
    b.myko.tryCall();
    b.myko.blackoutFinished('c1.call.fight.blackout');
    expect(b.state.played).toEqual(['c1.call.fight']);
  });

  it('the fourth call is refused: three succeed, then the call count stays at zero', () => {
    let n = 0;
    const f = fakeHost({ target: () => ({ completable: fakeCompletable(`c1.puzzle.p${n++}`, 'puzzle'), entrance: null }) });
    const refused = record(f.bus, 'myko:callRefused');
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(f.myko.tryCall());
      f.myko.blackoutFinished('c1.call.puzzle.blackout');
    }
    expect(results).toEqual([true, true, true, false]);
    expect(f.state.calls).toBe(0);
    expect(refused).toEqual([{ reason: 'noCallsLeft' }]);
    expect(f.state.played.at(-1)).toMatch(/^myko\.callRefused\.noCallsLeft/);
  });

  it('a refusal spends nothing and does not complete the section', () => {
    const log: string[] = [];
    const c = fakeCompletable('c1.fight.chipper', 'fight', log);
    const f = fakeHost({ calls: 0, target: () => ({ completable: c, entrance: null }) });
    f.myko.tryCall();
    expect(f.log.filter((l) => !l.startsWith('play:'))).toEqual([]); // no spend, no save
    expect(c.done).toBe(false);
  });

  it('on the Administrator he refuses, says so, and spends nothing', () => {
    const c = fakeCompletable('c10.boss.administrator', 'boss');
    const f = fakeHost({ target: () => ({ completable: c, entrance: null }) });
    const refused = record(f.bus, 'myko:callRefused');
    expect(f.myko.tryCall()).toBe(false);
    expect(f.state.calls).toBe(3);
    expect(c.done).toBe(false);
    expect(f.state.played).toEqual(['myko.callRefused.administrator.callsLeft']);
    expect(refused).toEqual([{ reason: 'notCallable' }]);
  });

  it('on the Administrator with no calls left he uses the other line', () => {
    const f = fakeHost({ calls: 0, target: () => ({ completable: fakeCompletable('c10.boss.administrator', 'boss'), entrance: null }) });
    f.myko.tryCall();
    expect(f.state.played).toEqual(['myko.callRefused.administrator']);
  });

  it('holding M on the Administrator never fills the ring and never calls', () => {
    const f = fakeHost({ target: () => ({ completable: fakeCompletable('c10.boss.administrator', 'boss'), entrance: null }) });
    for (let t = 100; t <= 3000; t += 100) {
      f.myko.update(100, frame({ held: ['callMyko'], pressed: t === 100 ? ['callMyko'] : [], holdMs: { callMyko: t } }), { combatOrStealth: true, inputActive: true });
      expect(f.myko.callHoldProgress()).toBe(0);
    }
    expect(f.state.calls).toBe(3);
  });

  it('releasing before a full second costs nothing', () => {
    const c = fakeCompletable('c1.puzzle.kegs', 'puzzle');
    const f = fakeHost({ target: () => ({ completable: c, entrance: null }) });
    f.myko.update(16, frame({ held: ['callMyko'], holdMs: { callMyko: 999 } }), { combatOrStealth: false, inputActive: true });
    expect(f.myko.callHoldProgress()).toBeCloseTo(0.999, 3);
    f.myko.update(16, frame(), { combatOrStealth: false, inputActive: true });
    expect(f.myko.callHoldProgress()).toBe(0);
    expect(f.state.calls).toBe(3);
    expect(c.done).toBe(false);
  });

  it('a hold of exactly one second fires once, not repeatedly while M stays down', () => {
    let n = 0;
    const f = fakeHost({ target: () => ({ completable: fakeCompletable(`c1.puzzle.p${n++}`, 'puzzle'), entrance: null }) });
    for (let t = 500; t <= 5000; t += 500) f.myko.update(500, frame({ held: ['callMyko'], holdMs: { callMyko: t } }), { combatOrStealth: false, inputActive: true });
    expect(f.state.calls).toBe(2);
  });

  it('H gives a nudge first, then the answer, then keeps giving the answer', () => {
    const f = fakeHost();
    const hints = record(f.bus, 'myko:hintRequested');
    f.myko.hint();
    f.myko.hint();
    f.myko.hint();
    expect(f.state.played).toEqual(['nudge', 'answer', 'answer']);
    expect(hints.map((h) => h.level)).toEqual([1, 2, 2]);
  });

  it('nothing is said twice: hints, pool comments and refusals are repeatable; the post-call scene is not', () => {
    const f = fakeHost();
    f.myko.hint();
    f.myko.comment('clue', 'pool', true);
    expect(f.state.repeat.get('nudge')).toBe(true);
    expect(f.state.repeat.get('pool.01') ?? f.state.repeat.get('pool.02')).toBe(true);
    const refused = fakeHost({ calls: 0, target: () => ({ completable: fakeCompletable('c1.puzzle.kegs', 'puzzle'), entrance: null }) });
    refused.myko.tryCall();
    expect(refused.state.repeat.get(refused.state.played[0] ?? '')).toBe(true);
    const admin = fakeHost({ target: () => ({ completable: fakeCompletable('c10.boss.administrator', 'boss'), entrance: null }) });
    admin.myko.tryCall();
    expect(admin.state.repeat.get('myko.callRefused.administrator.callsLeft')).toBe(true);
    const call = fakeHost({ target: () => ({ completable: fakeCompletable('c1.puzzle.kegs', 'puzzle'), entrance: null }) });
    call.myko.tryCall();
    call.myko.blackoutFinished('c1.call.puzzle.blackout');
    expect(call.state.repeat.get('c1.call.puzzle')).toBe(false);
  });

  it('comment respects the cooldown unless forced and avoids repeating the last line', () => {
    const f = fakeHost();
    expect(f.myko.comment('clue', 'pool')).toBe(true);
    expect(f.myko.comment('clue', 'pool')).toBe(false);
    expect(f.myko.comment('death', 'pool', true)).toBe(true);
    expect(f.state.played[0]).not.toBe(f.state.played[1]);
  });

  it('a pool that does not exist produces no comment', () => {
    const f = fakeHost();
    f.host.pool = () => [];
    expect(new Myko({ ...f.host, pool: () => [] }).comment('idle', 'nope')).toBe(false);
  });

  it('comments unprompted after a long idle spell, but not while input continues', () => {
    const f = fakeHost();
    f.myko.update(TUNING.myko.idleCommentMs - 1, NO_INPUT, { combatOrStealth: false, inputActive: false });
    expect(f.state.played).toEqual([]);
    f.myko.update(1, NO_INPUT, { combatOrStealth: false, inputActive: false });
    expect(f.state.played).toHaveLength(1);
    const g = fakeHost();
    for (let i = 0; i < 10; i++) g.myko.update(TUNING.myko.idleCommentMs, NO_INPUT, { combatOrStealth: false, inputActive: true });
    expect(g.state.played).toEqual([]);
  });

  it('is on the phone during combat and stealth, following otherwise', () => {
    const f = fakeHost();
    f.myko.update(16, NO_INPUT, { combatOrStealth: true, inputActive: true });
    expect(f.myko.mode).toBe('onPhone');
    f.myko.update(16, NO_INPUT, { combatOrStealth: false, inputActive: true });
    expect(f.myko.mode).toBe('following');
  });

  it('follows Andrew at about followDistance', () => {
    const f = fakeHost();
    f.myko.pos = { x: 400, y: 100 };
    for (let i = 0; i < 400; i++) f.myko.update(16, NO_INPUT, { combatOrStealth: false, inputActive: true });
    const d = Math.hypot(f.myko.pos.x - 100, f.myko.pos.y - 100);
    expect(d).toBeLessThanOrEqual(TUNING.myko.followDistance * 1.5 + 1);
    expect(d).toBeGreaterThanOrEqual(TUNING.myko.followDistance / 2 - 1);
  });
});

// ---------------------------------------------------------------------------
// Run level: the real chapter run on the dev sandbox.
// ---------------------------------------------------------------------------

describe('Myko call-in in a chapter run (sandbox)', () => {
  const FIGHT_AT = [22, 13] as const;

  it('fight: spends the call and saves at once, then a blackout; after it all enemies are down, completed by myko', () => {
    const h = makeRun();
    const { run, saves, bus } = h;
    const done = record(bus, 'section:completed');
    const started = record(bus, 'myko:callStarted');
    const blackout = record(bus, 'myko:blackout');
    teleport(run, ...FIGHT_AT);
    expect(run.currentCompletable()?.sectionId).toBe('c1.fight.chipper');
    const before = saves.length;
    run.player.setHealth(run.player.health.max - 40);

    holdM(run, TUNING.myko.callHoldMs);
    expect(run.callsRemaining()).toBe(2);
    expect(started).toEqual([{ sectionId: 'c1.fight.chipper', kind: 'fight', callsLeft: 2 }]);
    expect(blackout).toEqual([{ sectionId: 'c1.fight.chipper', kind: 'fight', sequenceId: 'c1.call.fight.blackout' }]);
    const immediate = saves.slice(before);
    expect(immediate[0]?.reason).toBe('mykoCall');
    expect(immediate[0]?.state.mykoCallsLeft).toBe(2);
    expect(immediate[0]?.state.mykoCalls).toEqual([{ chapter: 1, sectionId: 'c1.fight.chipper', kind: 'fight' }]);
    expect(immediate[0]?.state.casebook.some((e) => e.kind === 'mykoCall' && e.callKind === 'fight')).toBe(true);
    expect(immediate[0]?.state.completedSectionIds).not.toContain('c1.fight.chipper'); // saved before the cut to black
    // During the blackout nothing is decided: the fight is not over, gameplay is paused.
    expect(run.sceneBlocking).toBe(true);
    expect(run.isComplete('c1.fight.chipper')).toBe(false);
    advance(run, 1000);
    expect(run.isComplete('c1.fight.chipper')).toBe(false);

    finishBlackout(h, blackout);
    run.dialogue.finishAll();
    expect(run.sceneBlocking).toBe(false);
    expect(run.enemies().every((e) => e.down)).toBe(true);
    expect(run.isComplete('c1.fight.chipper')).toBe(true);
    expect(done.find((d) => d.sectionId === 'c1.fight.chipper')?.by).toBe('myko');
    // Normal rewards: the sandbox fight gives a spice bag, which heals fully.
    expect(run.player.health.current).toBe(run.player.health.max);
    expect(saves.at(-1)?.state.completedSectionIds).toContain('c1.fight.chipper');
    expect(saves.at(-1)?.reason).toBe('mykoCall');
  });

  it('fight: Andrew cannot be hurt during the blackout, and is hurtable again after', () => {
    const h = makeRun();
    const blackout = record(h.bus, 'myko:blackout');
    teleport(h.run, ...FIGHT_AT);
    holdM(h.run, TUNING.myko.callHoldMs);
    expect(h.run.myko.callInProgress).toBe(true);
    expect(h.run.player.invulnerable).toBe(true);
    finishBlackout(h, blackout);
    expect(h.run.myko.callInProgress).toBe(false);
    expect(h.run.player.invulnerable).toBe(false);
  });

  it('fight: the blackout does not wait forever; blackoutTimeoutMs ends it', () => {
    const { run } = makeRun();
    teleport(run, ...FIGHT_AT);
    holdM(run, TUNING.myko.callHoldMs);
    advance(run, TUNING.myko.blackoutTimeoutMs - 500);
    expect(run.myko.callInProgress).toBe(true);
    advance(run, 1000);
    expect(run.myko.callInProgress).toBe(false);
    expect(run.isComplete('c1.fight.chipper')).toBe(true);
  });

  it('fight: the call records a casebook entry with the section kind', () => {
    const { run } = makeRun();
    teleport(run, ...FIGHT_AT);
    holdM(run, 1000);
    advance(run, TUNING.myko.blackoutTimeoutMs + 200);
    expect(run.casebook.entries().filter((e) => e.kind === 'mykoCall')).toEqual([{ kind: 'mykoCall', sectionId: 'c1.fight.chipper', callKind: 'fight', chapter: 1 }]);
  });

  it('puzzle: solved after the blackout, completed by myko, normal casebook entry', () => {
    const h = makeRun();
    const { run, saves, bus } = h;
    const done = record(bus, 'section:completed');
    const blackout = record(bus, 'myko:blackout');
    run.startSection('c1.puzzle.kegs');
    holdM(run, 1000);
    expect(run.callsRemaining()).toBe(2);
    expect(run.isComplete('c1.puzzle.kegs')).toBe(false);
    expect(blackout.map((b) => b.sequenceId)).toEqual(['c1.call.puzzle.blackout']);
    finishBlackout(h, blackout);
    expect(run.isComplete('c1.puzzle.kegs')).toBe(true);
    expect(done.find((d) => d.sectionId === 'c1.puzzle.kegs')?.by).toBe('myko');
    expect(run.casebook.entries().some((e) => e.kind === 'mykoCall' && e.callKind === 'puzzle')).toBe(true);
    expect(saves.filter((s) => s.reason === 'mykoCall').length).toBeGreaterThanOrEqual(2);
  });

  it('post-call scene order: blackout first, then the post-call scene, then the section end lines', () => {
    const h = makeRun();
    const shown: string[] = [];
    h.bus.on('dialogue:show', (p) => void shown.push(p.sequenceId));
    teleport(h.run, ...FIGHT_AT);
    const blackout = record(h.bus, 'myko:blackout');
    holdM(h.run, 1000);
    expect(shown.filter((id) => id.includes('.call.'))).toEqual([]); // the blackout is the UI's, not a queued sequence
    finishBlackout(h, blackout);
    const i = shown.indexOf('c1.call.fight');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(shown.slice(0, i).some((id) => id.startsWith('c1.fight.'))).toBe(false);
  });

  it('stealth that has not become a fight cannot be called on; once the alarm is raised it can', () => {
    const h = makeRun();
    const { run, saves, bus } = h;
    const refused = record(bus, 'myko:callRefused');
    const blackout = record(bus, 'myko:blackout');
    run.startSection('c2.stealth.bog');
    const before = saves.length;
    holdM(run, 1200);
    expect(refused).toEqual([{ reason: 'notCallable' }]);
    expect(run.callsRemaining()).toBe(3);
    expect(saves.length).toBe(before);
    run.tick(16, NO_INPUT); // M released
    run.stealth('c2.stealth.bog')?.alarm();
    expect(run.currentCompletable()?.sectionId).toBe('c2.stealth.bog.alarm');
    holdM(run, 1000);
    expect(run.callsRemaining()).toBe(2);
    finishBlackout(h, blackout);
    expect(run.isComplete('c2.stealth.bog.alarm')).toBe(true);
  });

  it('nothing to call on: refused as noSection and nothing is spent', () => {
    const { run, bus } = makeRun();
    const refused = record(bus, 'myko:callRefused');
    holdM(run, 1200);
    expect(refused).toEqual([{ reason: 'noSection' }]);
    expect(run.callsRemaining()).toBe(3);
  });

  it('with no calls left the call is refused and the fight carries on', () => {
    const { run, bus } = makeRun({ save: (s) => ({ ...s, mykoCallsLeft: 0 }) });
    const refused = record(bus, 'myko:callRefused');
    teleport(run, ...FIGHT_AT);
    holdM(run, 1200);
    expect(refused).toEqual([{ reason: 'noCallsLeft' }]);
    expect(run.callsRemaining()).toBe(0);
    expect(run.isComplete('c1.fight.chipper')).toBe(false);
    expect(run.enemies().some((e) => !e.down)).toBe(true);
  });

  it('releasing M early costs nothing', () => {
    const { run, saves } = makeRun();
    teleport(run, ...FIGHT_AT);
    const before = saves.length;
    holdM(run, 900);
    run.tick(16, NO_INPUT);
    expect(run.callsRemaining()).toBe(3);
    expect(saves.length).toBe(before);
  });

  it('reloading the Myko-call save does not give the call back; it respawns where Andrew stood', () => {
    const { run, saves } = makeRun();
    teleport(run, ...FIGHT_AT);
    const stood = { ...run.player.pos };
    holdM(run, 1000);
    const callSave = saves.filter((s) => s.reason === 'mykoCall')[0];
    if (!callSave) throw new Error('no save');
    expect(callSave.state.respawn.position).toEqual(stood);
    const again = makeRun({ save: () => callSave.state });
    expect(again.run.callsRemaining()).toBe(2);
    expect(again.run.player.pos).toEqual(stood);
    expect(again.run.casebook.entries().some((e) => e.kind === 'mykoCall')).toBe(true);
  });

  it('three calls over a run: the count never refills across a chapter completion', () => {
    const h = makeRun();
    const { run, completions } = h;
    const blackout = record(h.bus, 'myko:blackout');
    run.startSection('c1.puzzle.kegs');
    holdM(run, 1000);
    finishBlackout(h, blackout);
    run.walkChapter();
    expect(completions).toHaveLength(1);
    expect(completions[0]?.snapshot.mykoCallsLeft).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// DESIGN.md 7.5: a second or third call in one chapter plays the shared myko.call.again.
// ---------------------------------------------------------------------------

describe('second or third call in a chapter (fake host)', () => {
  const targetFor = (kind: CompletableKind, n: number, log: string[] = []) => () => ({ completable: fakeCompletable(`c1.${kind}.s${n}`, kind, log), entrance: null });

  function callSeq(kinds: CompletableKind[]) {
    let n = 0;
    const f = fakeHost({ target: () => targetFor(kinds[n] as CompletableKind, n)() });
    const scenes: DialogueId[] = [];
    for (const k of kinds) {
      expect(k).toBe(kinds[n]);
      expect(f.myko.tryCall()).toBe(true);
      const before = f.state.played.length;
      f.myko.blackoutFinished(`c1.call.${k === 'fight' ? 'fight' : 'puzzle'}.blackout`);
      scenes.push(...f.state.played.slice(before));
      n++;
    }
    return { f, scenes };
  }

  it('the first call plays the chapter own scene, not the shared one', () => {
    const { scenes, f } = callSeq(['fight']);
    expect(scenes).toEqual(['c1.call.fight']);
    expect(f.state.repeat.get('c1.call.fight')).toBe(false);
  });

  it.each([
    [['fight', 'puzzle']],
    [['puzzle', 'fight']],
    [['fight', 'fight']],
    [['puzzle', 'puzzle']],
  ] as const)('second call after %j plays myko.call.again, repeatable', (kinds) => {
    const { scenes, f } = callSeq([...kinds]);
    expect(scenes).toEqual([`c1.call.${kinds[0]}`, 'myko.call.again']);
    expect(f.state.repeat.get('myko.call.again')).toBe(true);
  });

  it.each([
    [['fight', 'puzzle', 'fight']],
    [['puzzle', 'fight', 'puzzle']],
  ] as const)('third call after %j plays myko.call.again again', (kinds) => {
    const { scenes, f } = callSeq([...kinds]);
    expect(scenes).toEqual([`c1.call.${kinds[0]}`, 'myko.call.again', 'myko.call.again']);
    expect(f.state.calls).toBe(0);
  });

  it('a refused call (no calls left) does not count toward "again"', () => {
    const f = fakeHost({ calls: 0, target: targetFor('fight', 0) });
    expect(f.myko.tryCall()).toBe(false);
    expect(f.state.spent).toBe(0);
    // Refusal on the Administrator and on a non-callable stealth also spend nothing.
    const a = fakeHost({ target: () => ({ completable: fakeCompletable('c10.boss.administrator', 'boss'), entrance: null }) });
    expect(a.myko.tryCall()).toBe(false);
    expect(a.state.spent).toBe(0);
    const none = fakeHost({ stealth: true, target: () => null });
    expect(none.myko.tryCall()).toBe(false);
    expect(none.state.spent).toBe(0);
  });

  it('a refusal between two calls leaves the next successful call as the first: own scene', () => {
    const f = fakeHost({ calls: 0, target: targetFor('puzzle', 0) });
    f.myko.tryCall();
    f.state.calls = 3;
    expect(f.myko.tryCall()).toBe(true);
    f.myko.blackoutFinished('c1.call.puzzle.blackout');
    expect(f.state.played.filter((id) => id === 'myko.call.again')).toEqual([]);
    expect(f.state.played).toContain('c1.call.puzzle');
  });

  it('the blackout event with c<N>.call.<kind>.blackout is emitted on second and third calls', () => {
    let n = 0;
    const kinds: CompletableKind[] = ['puzzle', 'fight', 'puzzle'];
    const f = fakeHost({ target: () => targetFor(kinds[n] as CompletableKind, n)() });
    const blackout = record(f.bus, 'myko:blackout');
    for (const k of kinds) {
      f.myko.tryCall();
      f.myko.blackoutFinished(`c1.call.${k}.blackout`);
      n++;
    }
    expect(blackout.map((b) => b.sequenceId)).toEqual(['c1.call.puzzle.blackout', 'c1.call.fight.blackout', 'c1.call.puzzle.blackout']);
  });

  it('on a repeat call the order holds: post-call scene, complete myko, callFinished, save', () => {
    const log: string[] = [];
    const c = fakeCompletable('c1.fight.again', 'fight', log);
    const f = fakeHost({ priorCalls: 1, target: () => ({ completable: { ...c, completeNow: (src) => (f.log.push('complete'), c.completeNow(src)) }, entrance: null }) });
    f.bus.on('myko:callFinished', () => f.log.push('finished'));
    f.myko.tryCall();
    f.myko.blackoutFinished('c1.call.fight.blackout');
    expect(f.log).toEqual(['spend:c1.fight.again:fight', 'play:myko.call.again', 'complete', 'finished', 'saveAfter']);
    expect(log).toEqual(['complete:myko']);
  });

  it('callsThisChapter is read before the call is spent', () => {
    const f = fakeHost({ target: targetFor('fight', 0) });
    const seen: number[] = [];
    const orig = f.host.callsThisChapter;
    f.host.callsThisChapter = () => {
      const v = orig?.() ?? -1;
      seen.push(v);
      return v;
    };
    new Myko(f.host).tryCall();
    expect(seen).toEqual([0]);
  });
});

describe('second or third call in a chapter (sandbox run, real DialogueManager)', () => {
  const FIGHT = [22, 13] as const;

  function showLog(h: RunHarness): string[] {
    const shown: string[] = [];
    h.bus.on('dialogue:show', (p) => void shown.push(p.sequenceId));
    return shown;
  }

  /** One full call on a section: hold M, finish the blackout, drain dialogue. */
  function call(h: RunHarness, blackout: { sequenceId: string }[], section: 'fight' | 'puzzle'): void {
    if (section === 'fight') teleport(h.run, ...FIGHT);
    else h.run.startSection('c1.puzzle.kegs');
    h.run.tick(16, NO_INPUT);
    holdM(h.run, TUNING.myko.callHoldMs);
    finishBlackout(h, blackout);
    h.run.dialogue.finishAll();
  }

  it('myko.call.again exists in the dialogue content and is a scene', () => {
    expect(hasSequence('myko.call.again')).toBe(true);
    expect(sequence('myko.call.again').delivery).toBe('scene');
  });

  it.each([['fight', 'puzzle'], ['puzzle', 'fight']] as const)('%s then %s: own scene first, then the shared one', (a, b) => {
    const h = makeRun();
    const shown = showLog(h);
    const blackout = record(h.bus, 'myko:blackout');
    call(h, blackout, a);
    expect(shown).toContain(`c1.call.${a}`);
    expect(shown).not.toContain('myko.call.again');
    call(h, blackout, b);
    expect(shown.filter((id) => id === 'myko.call.again')).toHaveLength(1);
    expect(shown).not.toContain(`c1.call.${b}`);
    expect(blackout.map((x) => x.sequenceId)).toEqual([`c1.call.${a}.blackout`, `c1.call.${b}.blackout`]);
  });

  it('three calls: the shared scene really shows on both the second and the third', () => {
    const h = makeRun();
    const shown = showLog(h);
    const blackout = record(h.bus, 'myko:blackout');
    call(h, blackout, 'fight');
    call(h, blackout, 'puzzle');
    h.run.tick(16, NO_INPUT);
    h.run.startSection('c2.stealth.bog');
    h.run.stealth('c2.stealth.bog')?.alarm();
    holdM(h.run, TUNING.myko.callHoldMs);
    expect(h.run.callsRemaining()).toBe(0);
    finishBlackout(h, blackout);
    h.run.dialogue.finishAll();
    expect(shown.filter((id) => id === 'myko.call.again')).toHaveLength(2);
    expect(shown.filter((id) => id === 'c1.call.fight')).toHaveLength(1);
    expect(blackout.map((x) => x.sequenceId)).toEqual(['c1.call.fight.blackout', 'c1.call.puzzle.blackout', 'c1.call.fight.blackout']);
  });

  it('order on a repeat call: post-call scene, then the completion by myko, then callFinished, then the save', () => {
    const h = makeRun();
    const blackout = record(h.bus, 'myko:blackout');
    call(h, blackout, 'fight');
    const order: string[] = [];
    h.bus.on('dialogue:show', (p) => void order.push(`show:${p.sequenceId}`));
    h.bus.on('section:completed', (p) => void order.push(`complete:${p.by}`));
    h.bus.on('myko:callFinished', () => void order.push('finished'));
    const savesBefore = h.saves.length;
    h.run.startSection('c1.puzzle.kegs');
    h.run.tick(16, NO_INPUT);
    holdM(h.run, TUNING.myko.callHoldMs);
    const afterSpend = h.saves.length;
    finishBlackout(h, blackout);
    h.run.dialogue.finishAll();
    expect(order.indexOf('show:myko.call.again')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('show:myko.call.again')).toBeLessThan(order.indexOf('complete:myko'));
    expect(order.indexOf('complete:myko')).toBeLessThan(order.indexOf('finished'));
    expect(h.saves.length).toBeGreaterThan(afterSpend);
    expect(afterSpend).toBeGreaterThan(savesBefore);
    expect(h.saves.at(-1)?.reason).toBe('mykoCall');
    expect(h.saves.at(-1)?.state.completedSectionIds).toContain('c1.puzzle.kegs');
  });

  it('the casebook entry on a repeat call is still the chapter line set, one per call', () => {
    const h = makeRun();
    const blackout = record(h.bus, 'myko:blackout');
    call(h, blackout, 'fight');
    call(h, blackout, 'puzzle');
    expect(h.run.casebook.entries().filter((e) => e.kind === 'mykoCall')).toEqual([
      { kind: 'mykoCall', sectionId: 'c1.fight.chipper', callKind: 'fight', chapter: 1 },
      { kind: 'mykoCall', sectionId: 'c1.puzzle.kegs', callKind: 'puzzle', chapter: 1 },
    ]);
  });

  it('save and reload after one call: the next call in the same chapter plays the again scene', () => {
    const h = makeRun();
    const blackout = record(h.bus, 'myko:blackout');
    call(h, blackout, 'fight');
    const saved = h.saves.at(-1)?.state;
    if (!saved) throw new Error('no save');
    const h2 = makeRun({ save: () => saved });
    const shown = showLog(h2);
    const blackout2 = record(h2.bus, 'myko:blackout');
    call(h2, blackout2, 'puzzle');
    expect(shown).toContain('myko.call.again');
    expect(shown).not.toContain('c1.call.puzzle');
  });

  it('first call in a different chapter of the same save plays that chapter own scene', () => {
    const h = makeRun({
      chapter: 2,
      save: (base) => ({ ...base, mykoCallsLeft: 2, mykoCalls: [{ chapter: 1, sectionId: 'c1.fight.chipper', kind: 'fight' }] }),
    });
    const shown = showLog(h);
    const blackout = record(h.bus, 'myko:blackout');
    call(h, blackout, 'puzzle');
    expect(blackout.map((x) => x.sequenceId)).toEqual(['c2.call.puzzle.blackout']);
    expect(shown).toContain('c2.call.puzzle');
    expect(shown).not.toContain('myko.call.again');
    // And a second call in chapter 2 then repeats.
    call(h, blackout, 'fight');
    expect(shown).toContain('myko.call.again');
  });

  it('a refused call (none left) in a run does not make the next call an "again"', () => {
    const h = makeRun({ save: (s) => ({ ...s, mykoCallsLeft: 0 }) });
    const refused = record(h.bus, 'myko:callRefused');
    teleport(h.run, ...FIGHT);
    holdM(h.run, 1200);
    expect(refused).toEqual([{ reason: 'noCallsLeft' }]);
    expect(h.run.snapshot().mykoCalls).toEqual([]);
  });
});
