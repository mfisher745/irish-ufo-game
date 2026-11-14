/** DESIGN.md 7.6: saving, death, chapter carry-over, Chapter Select, audio settings. */

import { afterEach, describe, expect, it } from 'vitest';
import { TUNING } from '../../src/content/tuning';
import { clearChapterRegistry, registerChapter } from '../../src/core/chapter';
import { createSandboxModule } from '../../src/core/sandbox';
import { AUDIO_KEY, MemoryStorage, SAVE_KEY, SaveStore, isSaveState } from '../../src/core/save';
import { SAVE_VERSION } from '../../src/core/types';
import type { ChapterNumber, SaveState } from '../../src/core/types';
import { GameSession, carryOver, chapterOf, chapterSelectSave, emptyProgress, saveAtChapterStart } from '../../src/systems/session';
import type { SceneDriver } from '../../src/systems/session';
import { NO_INPUT, advance, record } from './helpers';

const fresh = (chapter: ChapterNumber = 1): SaveState => saveAtChapterStart(createSandboxModule(chapter), emptyProgress());

describe('SaveStore', () => {
  it('round-trips a save exactly', () => {
    const store = new SaveStore(new MemoryStorage());
    const s: SaveState = {
      ...fresh(3),
      mykoCallsLeft: 1,
      player: { ...fresh().player, buzz: 44, empties: 3, drinkSlots: [{ drinkId: 'stout', count: 2 }, null, null], hangover: { active: true } },
      casebook: [{ kind: 'evidence', evidenceId: 'c2.clue.ring', chapter: 2 }],
      flags: { 'c3.talked': true, 'c3.n': 4, 'c3.s': 'x' },
    };
    store.write(s);
    expect(store.load()).toEqual(s);
  });

  it('no save yet is null', () => {
    expect(new SaveStore(new MemoryStorage()).load()).toBeNull();
  });

  it('a different version, broken JSON or wrong shape is ignored, not half-loaded', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    const s = fresh();
    for (const raw of [
      JSON.stringify({ ...s, version: SAVE_VERSION + 1 }),
      JSON.stringify({ ...s, version: 0 }),
      '{not json',
      'null',
      '[]',
      '"hello"',
      JSON.stringify({ ...s, chapter: 11 }),
      JSON.stringify({ ...s, chapter: 0 }),
      JSON.stringify({ ...s, chapter: 2.5 }),
      JSON.stringify({ ...s, casebook: 'nope' }),
      JSON.stringify({ ...s, mykoCallsLeft: '3' }),
      JSON.stringify({ ...s, player: { ...s.player, drinkSlots: [null] } }),
    ]) {
      storage.setItem(SAVE_KEY, raw);
      expect(store.load(), raw.slice(0, 40)).toBeNull();
    }
  });

  it('clear removes the save', () => {
    const store = new SaveStore(new MemoryStorage());
    store.write(fresh());
    store.clear();
    expect(store.load()).toBeNull();
  });

  it('isSaveState accepts a good save', () => {
    expect(isSaveState(fresh())).toBe(true);
  });

  it('stores the number of Myko calls left in the save', () => {
    expect(fresh().mykoCallsLeft).toBe(TUNING.myko.callsPerGame);
  });
});

describe('audio settings', () => {
  it('live under their own key, apart from the save', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.writeAudio({ musicVolume: 0.3, effectsVolume: 0.6 });
    expect(storage.getItem(AUDIO_KEY)).not.toBeNull();
    expect(AUDIO_KEY).not.toBe(SAVE_KEY);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(store.loadAudio()).toEqual({ musicVolume: 0.3, effectsVolume: 0.6 });
  });

  it('survive clearing the save', () => {
    const store = new SaveStore(new MemoryStorage());
    store.writeAudio({ musicVolume: 0.2, effectsVolume: 0.1 });
    store.write(fresh());
    store.clear();
    expect(store.loadAudio()).toEqual({ musicVolume: 0.2, effectsVolume: 0.1 });
  });

  it('clamp to 0..1 and fall back to defaults on garbage', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    store.writeAudio({ musicVolume: 2, effectsVolume: -1 });
    expect(store.loadAudio()).toEqual({ musicVolume: 1, effectsVolume: 0 });
    storage.setItem(AUDIO_KEY, '{bad');
    const d = store.loadAudio();
    expect(d.musicVolume).toBeGreaterThanOrEqual(0);
    expect(d.musicVolume).toBeLessThanOrEqual(1);
    storage.setItem(AUDIO_KEY, JSON.stringify({ musicVolume: 'loud', effectsVolume: null }));
    expect(store.loadAudio()).toEqual(d);
  });
});

describe('chapter carry-over', () => {
  const at = (chapter: 1 | 2 | 3 | 4 | 5, overrides: Partial<SaveState> = {}): SaveState => ({ ...fresh(), ...overrides, chapter });
  const next = (n: 2 | 3 | 4 | 5 | 6) => createSandboxModule(n);

  it('ending chapter 3 at Locked starts chapter 4 hungover with 75 max health', () => {
    const s = carryOver(at(3), 'locked', next(4));
    expect(s.chapter).toBe(4);
    expect(s.player.hangover.active).toBe(true);
    expect(s.player.health).toBe(75);
  });

  it('chapter 4 starts hungover even after a sober chapter 3', () => {
    expect(carryOver(at(3), 'sober', next(4)).player.hangover.active).toBe(true);
  });

  it('ending chapters 1 or 2 at Banjaxed gives no hangover', () => {
    expect(carryOver(at(1), 'banjaxed', next(2)).player.hangover.active).toBe(false);
    expect(carryOver(at(2), 'banjaxed', next(3)).player.hangover.active).toBe(false);
  });

  it('ending chapter 4 Grand is clean, Locked or Banjaxed hungover', () => {
    expect(carryOver(at(4), 'grand', next(5)).player.hangover.active).toBe(false);
    expect(carryOver(at(4), 'locked', next(5)).player.hangover.active).toBe(true);
    expect(carryOver(at(4), 'banjaxed', next(5)).player.hangover.active).toBe(true);
  });

  it('Buzz goes back to 0 at every chapter start (README carry-over rules)', () => {
    const s = at(2, { player: { ...fresh().player, buzz: 85 } });
    expect(carryOver(s, 'banjaxed', next(3)).player.buzz).toBe(0);
    expect(carryOver(at(4, { player: { ...fresh().player, buzz: 65 } }), 'locked', next(5)).player.buzz).toBe(0);
  });

  it('abilities, empties, drinks, casebook and Myko calls carry', () => {
    const base = fresh();
    const s = at(4, {
      mykoCallsLeft: 1,
      casebook: [{ kind: 'evidence', evidenceId: 'c2.clue.ring', chapter: 2 }],
      player: { ...base.player, empties: 5, unlockedAbilities: ['punchCombo', 'stumble'], drinkSlots: [{ drinkId: 'whiskey', count: 2 }, null, null] },
    });
    const n = carryOver(s, 'grand', next(5));
    expect(n.mykoCallsLeft).toBe(1);
    expect(n.casebook).toEqual(s.casebook);
    expect(n.player.empties).toBe(5);
    expect(n.player.unlockedAbilities).toEqual(['punchCombo', 'stumble']);
    expect(n.player.drinkSlots[0]).toEqual({ drinkId: 'whiskey', count: 2 });
  });

  it('records the finished chapter once', () => {
    const s = carryOver(at(2, { finishedChapters: [2] }), 'sober', next(3));
    expect(s.finishedChapters).toEqual([2]);
    expect(carryOver(at(2), 'sober', next(3)).finishedChapters).toEqual([2]);
  });

  it('the calls count never goes up', () => {
    expect(carryOver(at(2, { mykoCallsLeft: 0 }), 'sober', next(3)).mykoCallsLeft).toBe(0);
  });
});

describe('Chapter Select start state (README)', () => {
  it('gives earlier abilities, three stout, no hangover, full health and keeps the save\'s calls', () => {
    const existing: SaveState = { ...fresh(), mykoCallsLeft: 1, player: { ...fresh().player, health: 10, buzz: 80, hangover: { active: true } } };
    const s = chapterSelectSave(createSandboxModule(5), existing, []);
    expect(s.chapter).toBe(5);
    expect([...s.player.unlockedAbilities].sort()).toEqual(['bottleThrow', 'punchCombo', 'stoutSlam', 'stumble']);
    expect(s.player.drinkSlots).toEqual([{ drinkId: 'stout', count: 3 }, null, null]);
    expect(s.player.hangover.active).toBe(false);
    expect(s.player.health).toBe(TUNING.player.maxHealth);
    expect(s.player.buzz).toBe(0);
    expect(s.mykoCallsLeft).toBe(1);
  });

  it('starts with the evidence of earlier chapters', () => {
    const s = chapterSelectSave(createSandboxModule(4), null, ['c2.clue.ring', 'c3.clue.map']);
    expect(s.casebook.map((e) => (e.kind === 'evidence' ? e.evidenceId : ''))).toEqual(['c2.clue.ring', 'c3.clue.map']);
  });

it('files each earlier clue under its own chapter', () => {
    const s = chapterSelectSave(createSandboxModule(4), null, ['c2.clue.ring', 'c3.clue.map']);
    expect(s.casebook.map((e) => (e.kind === 'evidence' ? e.chapter : 0))).toEqual([2, 3]);
  });

  it('a chapter select does not keep completed sections of this or later chapters', () => {
    const s = chapterSelectSave(createSandboxModule(2), { ...fresh(), completedSectionIds: ['c1.fight.chipper', 'c2.fight.yard', 'c3.fight.bay'] }, []);
    expect(s.completedSectionIds).toEqual(['c1.fight.chipper']);
  });

  it('chapterOf reads the ID prefix', () => {
    expect(chapterOf('c10.boss.administrator')).toBe(10);
    expect(chapterOf('c3.deduction.boston')).toBe(3);
    expect(chapterOf('nothing')).toBe(0);
  });
});

describe('GameSession flow', () => {
  afterEach(() => clearChapterRegistry());
  const setup = () => {
    registerChapter(createSandboxModule(1));
    const store = new SaveStore(new MemoryStorage());
    const session = new GameSession({ store });
    const started: number[] = [];
    const driver: SceneDriver = { showTitle: () => undefined, startGame: () => void started.push(1), pauseGame: () => undefined, resumeGame: () => undefined };
    session.setDriver(driver);
    return { session, store, started };
  };

  it('New Game writes a fresh save and keeps the audio settings', () => {
    const { session, store, started } = setup();
    session.setAudioSettings({ musicVolume: 0.1, effectsVolume: 0.9 });
    store.write({ ...fresh(), mykoCallsLeft: 0 });
    session.newGame();
    expect(started).toHaveLength(1);
    expect(store.load()?.mykoCallsLeft).toBe(TUNING.myko.callsPerGame);
    expect(store.loadAudio()).toEqual({ musicVolume: 0.1, effectsVolume: 0.9 });
    expect(session.audioSettings()).toEqual({ musicVolume: 0.1, effectsVolume: 0.9 });
  });

  it('Continue with no save starts a new game', () => {
    const { session, store } = setup();
    session.continueGame();
    expect(store.load()).not.toBeNull();
  });

  it('Continue resumes a saved game with its calls and position', () => {
    const { session, store } = setup();
    const s = fresh();
    store.write({ ...s, mykoCallsLeft: 1, respawn: { ...s.respawn, position: { x: 200, y: 120 } } });
    session.continueGame();
    const run = session.createRun();
    expect(run?.callsRemaining()).toBe(1);
    expect(run?.player.pos).toEqual({ x: 200, y: 120 });
  });

  it('death restores the saved snapshot, not the state at the moment of death', () => {
    const { session, store, started } = setup();
    session.newGame();
    const run1 = session.createRun();
    if (!run1) throw new Error('no run');
    run1.tick(16, NO_INPUT);
    const saved = store.load();
    expect(saved?.player.buzz).toBe(0);
    // Change state after the save: drink, spend an empty, wander off, then die.
    run1.player.inventory.take({ kind: 'drink', drinkId: 'stout', count: 1 });
    run1.player.buzz.add(70);
    run1.player.inventory.take({ kind: 'empties', count: 4 });
    run1.setPlayerPosition({ x: 400, y: 100 });
    run1.player.takeHit({ source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 1000, knockback: { x: 0, y: 0 }, stunMs: 0, holdMs: 0 });
    const died = record(session.bus, 'player:died');
    advance(run1, 2000);
    expect(died).toHaveLength(1);
    expect(started).toHaveLength(2);
    const run2 = session.createRun();
    if (!run2 || !saved) throw new Error('no run');
    expect(run2).not.toBe(run1);
    expect(run2.player.buzz.value).toBe(saved.player.buzz);
    expect(run2.player.inventory.empties).toBe(saved.player.empties);
    expect(run2.player.inventory.slots()).toEqual(saved.player.drinkSlots);
    expect(run2.player.health.current).toBe(saved.player.health);
    expect(run2.player.dead).toBe(false);
    expect(run2.player.pos).toEqual(saved.respawn.position);
  });

  it('a Myko-call save acts as a checkpoint: dying afterwards returns him where he stood', () => {
    const { session, store } = setup();
    session.newGame();
    const run = session.createRun();
    if (!run) throw new Error('no run');
    run.tick(16, NO_INPUT);
    run.setPlayerPosition({ x: 22 * 16 + 8, y: 13 * 16 + 8 });
    run.tick(16, NO_INPUT);
    for (let t = 100; t <= 1000; t += 100) run.tick(100, { ...NO_INPUT, held: new Set(['callMyko']), holdMs: { callMyko: t } });
    const stood = { ...run.player.pos };
    expect(store.load()?.mykoCallsLeft).toBe(2);
    expect(store.load()?.respawn.position).toEqual(stood);
    run.tick(16, NO_INPUT);
    run.dialogueFinished('c1.call.fight.blackout');
    run.dialogue.finishAll();
    expect(run.isComplete('c1.fight.chipper')).toBe(true);
    run.player.takeHit({ source: { kind: 'hazard', hazardId: 'x' }, targetInstanceId: 'andrew', amount: 1000, knockback: { x: 0, y: 0 }, stunMs: 0, holdMs: 0 });
    advance(run, 2000);
    const again = session.createRun();
    expect(again?.player.pos).toEqual(stood);
    expect(again?.callsRemaining()).toBe(2);
  });

  it('completing a chapter hands the carry-over to the next one (or the title after the last)', () => {
    registerChapter(createSandboxModule(1));
    registerChapter(createSandboxModule(2));
    const store = new SaveStore(new MemoryStorage());
    const session = new GameSession({ store });
    let titles = 0;
    session.setDriver({ showTitle: () => void titles++, startGame: () => undefined, pauseGame: () => undefined, resumeGame: () => undefined });
    session.newGame();
    const run = session.createRun();
    if (!run) throw new Error('no run');
    run.tick(16, NO_INPUT);
    run.walkChapter();
    const saved = store.load();
    expect(saved?.chapter).toBe(2);
    expect(saved?.finishedChapters).toEqual([1]);
    expect(titles).toBe(0);
    const run2 = session.createRun();
    expect(run2?.chapter).toBe(2);
    run2?.tick(16, NO_INPUT);
    run2?.walkChapter();
    expect(titles).toBe(1); // chapter 3 not built: back to the title with the finish recorded
    expect(store.load()?.finishedChapters).toEqual([1, 2]);
  });

  it('pause and resume are idempotent and emit once; pausing with no run does nothing', () => {
    const { session } = setup();
    const paused = record(session.bus, 'game:paused');
    const resumed = record(session.bus, 'game:resumed');
    session.pause();
    expect(paused).toHaveLength(0);
    session.newGame();
    session.createRun();
    session.pause();
    session.pause();
    session.resume();
    session.resume();
    expect(paused).toHaveLength(1);
    expect(resumed).toHaveLength(1);
    expect(session.isPaused).toBe(false);
  });
});
