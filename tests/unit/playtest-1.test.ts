/**
 * Behaviour added after the chapter 1 playtest (DESIGN.md 7.1 and 7.5):
 * Buzz drain delay, "nothing is said twice", stale queued remarks, breakables.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { clearChapterRegistry, registerChapter } from '../../src/core/chapter';
import type { ChapterModule } from '../../src/core/chapter';
import { EventBus } from '../../src/core/events';
import { MemoryStorage, SaveStore } from '../../src/core/save';
import { createSandboxModule } from '../../src/core/sandbox';
import type { PickupItem, SaveState, Vec2 } from '../../src/core/types';
import { Buzz } from '../../src/systems/buzz';
import { DialogueRunner } from '../../src/systems/dialogue';
import type { DialogueContext } from '../../src/systems/dialogue';
import { GameSession } from '../../src/systems/session';
import type { SceneDriver } from '../../src/systems/session';
import { NO_INPUT, advance, frame, makeRun, record, teleport } from './helpers';

const T = (col: number, row: number): Vec2 => ({ x: col * 16 + 8, y: row * 16 + 8 });

// ---------------------------------------------------------------------------
// Buzz does not drain just after a drink (DESIGN.md 7.1)
// ---------------------------------------------------------------------------

describe('Buzz drain delay after a drink', () => {
  const delay = TUNING.buzz.drainDelayAfterDrinkMs;

  it('the delay is "a few seconds": positive and well under a minute', () => {
    expect(delay).toBeGreaterThanOrEqual(3000);
    expect(delay).toBeLessThanOrEqual(30_000);
  });

  it('holds the value for the whole delay, then drains at the normal rate', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(20);
    b.tick(delay - 1);
    expect(b.value).toBe(20);
    b.tick(1);
    expect(b.value).toBe(20);
    b.tick(10_000);
    expect(b.value).toBeCloseTo(20 - TUNING.buzz.drainPerSecond * 10, 5);
  });

  it('a tick that straddles the end of the delay only drains for the part after it', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(30);
    b.tick(delay);
    b.tick(1000);
    expect(b.value).toBeCloseTo(30 - TUNING.buzz.drainPerSecond, 5);
  });

  it('a second drink restarts the delay', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(10);
    b.tick(delay - 100);
    b.add(10);
    b.tick(delay - 1);
    expect(b.value).toBe(20);
  });

  it('with no drink there is no delay: drain starts at once', () => {
    const b = new Buzz(new EventBus(), 50);
    b.tick(1000);
    expect(b.value).toBeCloseTo(50 - TUNING.buzz.drainPerSecond, 5);
  });

  it('tea (negative add) and spending Buzz do not start the delay', () => {
    const b = new Buzz(new EventBus(), 50);
    b.add(-25);
    b.tick(1000);
    expect(b.value).toBeCloseTo(25 - TUNING.buzz.drainPerSecond, 5);
    const c = new Buzz(new EventBus(), 50);
    expect(c.spend(20)).toBe(true);
    c.tick(1000);
    expect(c.value).toBeCloseTo(30 - TUNING.buzz.drainPerSecond, 5);
  });

  it('restoring a save (load, respawn) clears any delay', () => {
    const b = new Buzz(new EventBus(), 0);
    b.add(40);
    b.restore(40);
    b.tick(1000);
    expect(b.value).toBeCloseTo(40 - TUNING.buzz.drainPerSecond, 5);
  });

  it('the delay does not stop Banjaxed from running its course (fall, then reset)', () => {
    const b = new Buzz(new EventBus(), 70);
    b.add(30);
    expect(b.state).toBe('banjaxed');
    b.tick(TUNING.buzz.banjaxedPeakMs);
    expect(b.fallen).toBe(true);
    b.tick(TUNING.buzz.banjaxedFallenMs);
    expect(b.value).toBe(TUNING.buzz.banjaxedResetTo);
  });

  it('crossing a threshold on a drink still fires the state change while draining is held', () => {
    const bus = new EventBus();
    const changes = record(bus, 'buzz:stateChanged');
    const b = new Buzz(bus, 15);
    b.add(10);
    expect(changes).toHaveLength(1);
    b.tick(delay - 1);
    expect(changes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Nothing is said twice (DESIGN.md 7.5)
// ---------------------------------------------------------------------------

describe('DialogueRunner: nothing is said twice', () => {
  const lookup = { delivery: (id: string) => (id.startsWith('s') ? ('scene' as const) : id.startsWith('b') ? ('box' as const) : null) };
  const shownOf = (bus: EventBus): string[] => {
    const shown: string[] = [];
    bus.on('dialogue:show', ({ sequenceId }) => void shown.push(sequenceId));
    return shown;
  };

  it('a sequence played once is never shown again, and the second play resolves at once', async () => {
    const bus = new EventBus();
    const shown = shownOf(bus);
    const d = new DialogueRunner(bus, lookup);
    void d.play('b1');
    d.finished('b1');
    await d.play('b1');
    expect(shown).toEqual(['b1']);
    expect(d.showing('box')).toBeNull();
  });

  it('a repeat play (hint, pool line, deliberate re-examine) shows again every time', () => {
    const bus = new EventBus();
    const shown = shownOf(bus);
    const d = new DialogueRunner(bus, lookup);
    for (let i = 0; i < 3; i++) {
      void d.play('b1', { repeat: true });
      d.finished('b1');
    }
    expect(shown).toEqual(['b1', 'b1', 'b1']);
    expect(d.hasPlayed('b1')).toBe(false);
  });

  it('a scene is also once only, and does not block when it is skipped', async () => {
    const bus = new EventBus();
    const d = new DialogueRunner(bus, lookup);
    void d.play('s1');
    expect(d.blocking).toBe(true);
    d.finished('s1');
    await d.play('s1');
    expect(d.blocking).toBe(false);
  });

  it('a sequence already played in the save (loaded) does not show', async () => {
    const bus = new EventBus();
    const shown = shownOf(bus);
    const d = new DialogueRunner(bus, lookup, { played: ['b1', 's1'] });
    await d.play('b1');
    await d.play('s1');
    expect(shown).toEqual([]);
    expect(d.blocking).toBe(false);
    expect(d.playedIds().sort()).toEqual(['b1', 's1']);
  });

  it('the same line queued twice at once shows once', () => {
    const bus = new EventBus();
    const shown = shownOf(bus);
    const d = new DialogueRunner(bus, lookup);
    void d.play('b1');
    void d.play('b1');
    d.finished('b1');
    expect(shown).toEqual(['b1']);
  });

  it('unknown IDs are not recorded as played', () => {
    const d = new DialogueRunner(new EventBus(), lookup);
    void d.play('zzz');
    expect(d.playedIds()).toEqual([]);
  });
});

describe('DialogueRunner: stale queued remarks are dropped', () => {
  const lookup = { delivery: (id: string) => (id.startsWith('s') ? ('scene' as const) : ('box' as const)) };
  const world = { now: 0, screen: 'A', section: null as string | null, done: new Set<string>() };
  const ctx: DialogueContext = {
    clock: () => world.now,
    screenId: () => world.screen,
    sectionId: () => world.section,
    isComplete: (id) => world.done.has(id),
    staleMs: TUNING.myko.commentStaleMs,
  };
  const reset = (): void => {
    world.now = 0;
    world.screen = 'A';
    world.section = null;
    world.done = new Set();
  };
  const make = () => {
    reset();
    const bus = new EventBus();
    const shown: string[] = [];
    bus.on('dialogue:show', ({ sequenceId }) => void shown.push(sequenceId));
    return { d: new DialogueRunner(bus, lookup, { context: ctx }), shown };
  };

  it('a line waiting behind another is dropped once Andrew has left the screen', async () => {
    const { d, shown } = make();
    void d.play('b1');
    const waiting = d.play('b2');
    world.screen = 'B';
    d.dropStale();
    await waiting; // resolves, does not hang the script
    d.finished('b1');
    expect(shown).toEqual(['b1']);
    expect(d.showing('box')).toBeNull();
  });

  it('a dropped line did not play, so it is not recorded and may be said later', async () => {
    const { d, shown } = make();
    void d.play('b1');
    void d.play('b2');
    world.screen = 'B';
    d.dropStale();
    expect(d.hasPlayed('b2')).toBe(false);
    d.finished('b1');
    void d.play('b2');
    expect(shown).toEqual(['b1', 'b2']);
  });

  it('a line waiting behind another is dropped once the section it was about is complete', () => {
    const { d, shown } = make();
    void d.play('b1');
    world.section = 'c1.fight.chipper';
    void d.play('b2');
    world.done.add('c1.fight.chipper');
    d.dropStale();
    d.finished('b1');
    expect(shown).toEqual(['b1']);
  });

  it('a line waiting longer than commentStaleMs is dropped; one at the limit is kept', () => {
    const { d, shown } = make();
    void d.play('b1');
    void d.play('b2');
    world.now = TUNING.myko.commentStaleMs;
    d.dropStale();
    d.finished('b1');
    expect(shown).toEqual(['b1', 'b2']);
    d.finished('b2');
    void d.play('b3');
    void d.play('b4');
    world.now += TUNING.myko.commentStaleMs + 1;
    d.dropStale();
    d.finished('b3');
    expect(shown).toEqual(['b1', 'b2', 'b3']);
  });

  it('a stale line is dropped when its turn comes even if dropStale was not called', () => {
    const { d, shown } = make();
    void d.play('b1');
    void d.play('b2');
    world.screen = 'B';
    d.finished('b1');
    expect(shown).toEqual(['b1']);
  });

  it('a line already showing is not pulled, and scenes are never dropped', () => {
    const { d, shown } = make();
    void d.play('b1');
    void d.play('s1');
    world.screen = 'B';
    world.now = TUNING.myko.commentStaleMs * 5;
    d.dropStale();
    expect(d.showing('box')).toBe('b1');
    expect(d.showing('scene')).toBe('s1');
    expect(shown).toEqual(['b1', 's1']);
  });

  it('repeatable lines that go stale are dropped too and stay repeatable', () => {
    const { d, shown } = make();
    void d.play('b1');
    void d.play('b2', { repeat: true });
    world.screen = 'B';
    d.dropStale();
    d.finished('b1');
    void d.play('b2', { repeat: true });
    expect(shown).toEqual(['b1', 'b2']);
  });
});

describe('Nothing is said twice across death and reload (session)', () => {
  afterEach(() => clearChapterRegistry());
  const examineModule = (): ChapterModule => {
    const base = createSandboxModule(1);
    return { ...base, examinables: base.examinables.map((e) => (e.id === 'sandbox.lever' ? { ...e, dialogueId: 'c1.pub.photo' } : e)) };
  };
  const setup = (module: ChapterModule = createSandboxModule(1)) => {
    registerChapter(module);
    const store = new SaveStore(new MemoryStorage());
    const session = new GameSession({ store });
    const driver: SceneDriver = { showTitle: () => undefined, startGame: () => undefined, pauseGame: () => undefined, resumeGame: () => undefined };
    session.setDriver(driver);
    return { session, store };
  };
  const shownOn = (bus: EventBus): string[] => {
    const shown: string[] = [];
    bus.on('dialogue:show', ({ sequenceId }) => void shown.push(sequenceId));
    return shown;
  };
  const kill = (run: NonNullable<ReturnType<GameSession['createRun']>>): void => {
    run.player.takeHit({ source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 1000, knockback: { x: 0, y: 0 }, stunMs: 0, holdMs: 0 });
    advance(run, 2000);
  };

  it('a played line is written to the save as it is shown, before any checkpoint', () => {
    const { session, store } = setup();
    session.newGame();
    const run = session.createRun();
    if (!run) throw new Error('no run');
    run.tick(16, NO_INPUT);
    expect(store.load()?.playedDialogue ?? []).not.toContain('c1.pub.photo');
    void run.say('c1.pub.photo');
    expect(store.load()?.playedDialogue).toContain('c1.pub.photo');
  });

  it('after a death the line is not said again, and the scene does not block', () => {
    const { session } = setup();
    session.newGame();
    const run1 = session.createRun();
    if (!run1) throw new Error('no run');
    run1.tick(16, NO_INPUT);
    void run1.say('c1.pub.photo');
    run1.dialogue.finishAll();
    kill(run1);
    const run2 = session.createRun();
    if (!run2) throw new Error('no run');
    expect(run2).not.toBe(run1);
    const shown = shownOn(run2.bus as EventBus);
    run2.tick(16, NO_INPUT);
    run2.dialogue.finishAll(); // Myko's death remark is a pool line and may show
    void run2.say('c1.pub.photo');
    expect(shown.filter((id) => id === 'c1.pub.photo')).toEqual([]);
    expect(run2.dialogue.showing('box')).toBeNull();
  });

  it('after quit and Continue (a new session on the same store) it is not said again', () => {
    const a = setup();
    a.session.newGame();
    const run = a.session.createRun();
    if (!run) throw new Error('no run');
    run.tick(16, NO_INPUT);
    void run.say('c1.pub.photo');
    clearChapterRegistry();
    const b = setup();
    b.store.write(a.store.load() as SaveState);
    b.session.continueGame();
    const run2 = b.session.createRun();
    if (!run2) throw new Error('no run');
    const shown = shownOn(run2.bus as EventBus);
    void run2.say('c1.pub.photo');
    expect(shown).toEqual([]);
  });

  it('a new game starts with nothing played', () => {
    const a = setup();
    a.session.newGame();
    const run = a.session.createRun();
    if (!run) throw new Error('no run');
    run.tick(16, NO_INPUT);
    void run.say('c1.pub.photo');
    a.session.newGame();
    expect(a.store.load()?.playedDialogue ?? []).toEqual([]);
    const run2 = a.session.createRun();
    if (!run2) throw new Error('no run');
    const shown = shownOn(run2.bus as EventBus);
    void run2.say('c1.pub.photo');
    expect(shown).toEqual(['c1.pub.photo']);
  });

  it('a deliberate re-examine repeats the object line every time, even after a death', () => {
    const { session } = setup(examineModule());
    session.newGame();
    const run1 = session.createRun();
    if (!run1) throw new Error('no run');
    run1.tick(16, NO_INPUT);
    const shown1 = shownOn(run1.bus as EventBus);
    teleport(run1, 12, 12);
    for (let i = 0; i < 2; i++) {
      run1.tick(16, frame({ pressed: ['interact'] }));
      run1.dialogue.finishAll();
    }
    expect(shown1.filter((id) => id === 'c1.pub.photo')).toHaveLength(2);
    kill(run1);
    const run2 = session.createRun();
    if (!run2) throw new Error('no run');
    run2.tick(16, NO_INPUT);
    run2.dialogue.finishAll(); // the death remark would otherwise queue it
    const shown2 = shownOn(run2.bus as EventBus);
    teleport(run2, 12, 12);
    run2.tick(16, frame({ pressed: ['interact'] }));
    expect(shown2.filter((id) => id === 'c1.pub.photo')).toHaveLength(1);
  });

  it('Chapter Select replays the lines of the chosen chapter but keeps earlier chapters played', () => {
    const base = createSandboxModule(2);
    const withPlayed: SaveState = { ...makeRun({ chapter: 2 }).run.snapshot(), playedDialogue: ['c1.pub.photo', 'c2.bog.x', 'c3.later'], brokenProps: ['c1.a', 'c2.b'] };
    // chapterSelectSave is covered in save.test.ts; here only the played and broken lists.
    return import('../../src/systems/session').then(({ chapterSelectSave }) => {
      const s = chapterSelectSave(base, withPlayed, []);
      expect(s.playedDialogue).toEqual(['c1.pub.photo']);
      expect(s.brokenProps).toEqual(['c1.a']);
    });
  });
});

describe('older saves without the new fields still load', () => {
  it('isSaveState accepts a save with no playedDialogue, brokenProps or lootSeed, and rejects bad ones', async () => {
    const { isSaveState } = await import('../../src/core/save');
    const s = makeRun().run.snapshot();
    const old: Record<string, unknown> = { ...s };
    delete old['playedDialogue'];
    delete old['brokenProps'];
    delete old['lootSeed'];
    expect(isSaveState(old)).toBe(true);
    expect(isSaveState({ ...old, playedDialogue: ['a'], brokenProps: ['b'], lootSeed: 5 })).toBe(true);
    expect(isSaveState({ ...old, playedDialogue: 'a' })).toBe(false);
    expect(isSaveState({ ...old, brokenProps: [1] })).toBe(false);
    expect(isSaveState({ ...old, lootSeed: '5' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Breakables (DESIGN.md 7.1)
// ---------------------------------------------------------------------------

describe('Breakables', () => {
  const BARREL = 'sandbox.barrel';
  const CRATE = 'sandbox.bottleCrate';
  const BOX = 'sandbox.box';
  const lootId = (key: string) => `break.${key}` as const;
  type Run = ReturnType<typeof makeRun>['run'];
  const screenId = createSandboxModule(1).def.startScreenId;
  const propOf = (run: Run, key: string) => run.dressing.propsOn(screenId).find((p) => p.key === key);
  /** The loot a prop dropped: still lying there, or already auto-collected by Andrew standing next to it. */
  const dropOf = (run: Run, got: { pickupId: string; item: PickupItem }[], key: string): PickupItem | undefined =>
    run.pickups().find((p) => p.def.id === lootId(key))?.item ?? got.find((g) => g.pickupId === lootId(key))?.item;

  /** One full melee swing from a tile below the prop, facing it, with time to recover. */
  const punch = (run: Run, from: Vec2, at: Vec2): void => {
    run.setPlayerPosition(from);
    run.tick(16, frame({ pressed: ['melee'], aim: at }));
    advance(run, 700);
  };
  const regionTable = (): readonly { item: PickupItem | null; weight: number }[] => {
    const module = createSandboxModule(1);
    const region = module.def.screens[0]?.region ?? 'kilnamoe';
    return TUNING.breakables.loot[region];
  };

  it('every region has a loot table with a positive total weight', () => {
    for (const [region, table] of Object.entries(TUNING.breakables.loot)) {
      expect(table.reduce((n, e) => n + e.weight, 0), region).toBeGreaterThan(0);
    }
  });

  it('a melee hit breaks a one-hit breakable: event, debris frame, no longer solid', () => {
    const { run, bus } = makeRun();
    const broken = record(bus, 'prop:broken');
    const prop = propOf(run, BARREL);
    expect(prop?.broken).toBe(false);
    expect(run.dressing.breakablesOn(screenId).some((p) => p.key === BARREL)).toBe(true);
    punch(run, T(6, 9), T(6, 8));
    expect(broken.map((b) => b.propId)).toEqual([BARREL]);
    expect(propOf(run, BARREL)?.broken).toBe(true);
    expect(propOf(run, BARREL)?.frame).not.toBe('barrel');
    expect(run.dressing.brokenKeys()).toEqual([BARREL]);
    // Andrew can now walk through where it stood.
    run.setPlayerPosition(T(6, 9));
    for (let i = 0; i < 40; i++) run.tick(16, frame({ move: { x: 0, y: -1 }, aim: T(6, 0) }));
    expect(run.player.pos.y).toBeLessThan(8 * 16);
  });

  it('a two-hit breakable takes two hits: the first leaves it standing', () => {
    const { run, bus } = makeRun();
    const broken = record(bus, 'prop:broken');
    punch(run, T(11, 9), T(11, 8));
    expect(propOf(run, CRATE)?.broken).toBe(false);
    expect(propOf(run, CRATE)?.hitsLeft).toBe(1);
    expect(broken).toEqual([]);
    punch(run, T(11, 9), T(11, 8));
    expect(propOf(run, CRATE)?.broken).toBe(true);
    expect(broken.map((b) => b.propId)).toEqual([CRATE]);
  });

  it('a swing facing away does not break it', () => {
    const { run } = makeRun();
    punch(run, T(6, 9), T(6, 14));
    expect(propOf(run, BARREL)?.broken).toBe(false);
  });

  it('a thrown bottle breaks a breakable and uses up the empty', () => {
    const { run, bus } = makeRun({ save: (s) => ({ ...s, player: { ...s.player, empties: 2 } }) });
    const broken = record(bus, 'prop:broken');
    run.unlockAbility('bottleThrow');
    run.setPlayerPosition(T(6, 12));
    const aim = T(6, 8);
    run.tick(16, frame({ pressed: ['ranged'], aim }));
    run.tick(16, frame({ released: ['ranged'], holdMs: { ranged: 50 }, aim }));
    advance(run, 1500);
    expect(run.player.inventory.empties).toBeLessThan(2);
    expect(broken.map((b) => b.propId)).toEqual([BARREL]);
  });

  it('a broken breakable makes a noise of kind breakable at TUNING.breakables.noiseRadius', () => {
    const { run, bus } = makeRun();
    const noise = record(bus, 'stealth:noise');
    punch(run, T(6, 9), T(6, 8));
    const n = noise.find((x) => x.kind === 'breakable');
    expect(n?.radius).toBe(TUNING.breakables.noiseRadius);
  });

  it('a fixed-loot breakable drops exactly that item, as a pickup that can be collected', () => {
    const { run, bus } = makeRun();
    const got = record(bus, 'pickup:collected');
    punch(run, T(11, 9), T(11, 8));
    punch(run, T(11, 9), T(11, 8));
    expect(dropOf(run, got, CRATE)).toEqual({ kind: 'drink', drinkId: 'stout', count: 1 });
  });

  it('table loot comes from the region table (or nothing), and is fixed for a given save seed', () => {
    const table = regionTable().map((e) => e.item);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const drops: (PickupItem | undefined)[] = [];
      for (let rep = 0; rep < 2; rep++) {
        const { run, bus } = makeRun({ save: (s) => ({ ...s, lootSeed: seed }) });
        const got = record(bus, 'pickup:collected');
        punch(run, T(11, 4), T(11, 3));
        expect(propOf(run, BOX)?.broken).toBe(true);
        drops.push(dropOf(run, got, BOX));
      }
      expect(drops[0], `seed ${seed} repeatable`).toEqual(drops[1]);
      const d = drops[0];
      if (d) {
        expect(table.some((t) => JSON.stringify(t) === JSON.stringify(d)), `seed ${seed} in table`).toBe(true);
        seen.add(JSON.stringify(d));
      }
    }
    // More than one kind of thing comes out across seeds (it really is a table, not a constant).
    expect(seen.size).toBeGreaterThan(1);
  });

  it('a broken prop and its undropped loot survive a death; loot picked up stays picked up', () => {
    registerChapter(createSandboxModule(1));
    const store = new SaveStore(new MemoryStorage());
    const session = new GameSession({ store });
    session.setDriver({ showTitle: () => undefined, startGame: () => undefined, pauseGame: () => undefined, resumeGame: () => undefined });
    try {
      session.newGame();
      const run1 = session.createRun();
      if (!run1) throw new Error('no run');
      run1.tick(16, NO_INPUT);
      punch(run1, T(11, 9), T(11, 8));
      punch(run1, T(11, 9), T(11, 8));
      expect(store.load()?.brokenProps).toContain(CRATE);
      run1.player.takeHit({ source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 1000, knockback: { x: 0, y: 0 }, stunMs: 0, holdMs: 0 });
      advance(run1, 2000);
      const run2 = session.createRun();
      if (!run2) throw new Error('no run');
      run2.tick(16, NO_INPUT);
      expect(propOf(run2, CRATE)?.broken).toBe(true);
      expect(run2.dressing.brokenKeys()).toContain(CRATE);
      expect(run2.pickups().some((p) => p.def.id === lootId(CRATE))).toBe(true);
      // Not solid after reload either.
      run2.setPlayerPosition(T(11, 9));
      for (let i = 0; i < 40; i++) run2.tick(16, frame({ move: { x: 0, y: -1 }, aim: T(11, 0) }));
      expect(run2.player.pos.y).toBeLessThan(8 * 16);
    } finally {
      clearChapterRegistry();
    }
  });

  it('breaking an already broken prop does nothing more (one event, one pickup)', () => {
    const { run, bus } = makeRun();
    const broken = record(bus, 'prop:broken');
    punch(run, T(6, 9), T(6, 8));
    punch(run, T(6, 9), T(6, 8));
    punch(run, T(6, 9), T(6, 8));
    expect(broken).toHaveLength(1);
    expect(run.pickups().filter((p) => p.def.id === lootId(BARREL)).length).toBeLessThanOrEqual(1);
  });
});
