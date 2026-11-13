/**
 * The game session: save, scene flow and chapter transitions, plus the
 * `uiState` object the UI reads. Plain TypeScript; Phaser scenes are driven
 * through the injected `SceneDriver`.
 *
 * Flow (DESIGN.md 7.6, docs/chapters/README.md "Carry-over rules"):
 * - New Game: clears the save and starts chapter 1.
 * - Continue: loads the save and resumes at its respawn point.
 * - Chapter Select: the chapter with the abilities it expects (everything
 *   unlocked in earlier chapters), three stout, no hangover, the save's Myko
 *   calls and casebook, full health.
 * - Death: the save is reloaded and Andrew respawns where it says.
 * - Chapter complete: hangover rule, Buzz back to 0, health to max, save,
 *   next chapter (or the title after chapter 10).
 */

import { TUNING } from '../content/tuning';
import { hasSequence, pool as dialoguePool, sequence } from '../content/dialogue';
import type { ChapterModule } from '../core/chapter';
import { getChapter } from '../core/chapter';
import { EventBus } from '../core/events';
import type { Random } from '../core/random';
import { seededRandom } from '../core/random';
import { MemoryStorage, SaveStore } from '../core/save';
import { GameEvents, SAVE_VERSION } from '../core/types';
import type {
  AbilityId,
  AudioSettings,
  BuzzState,
  CasebookEntry,
  ChapterNumber,
  CheckpointId,
  DeductionBoardDef,
  DeductionSectionId,
  DialogueId,
  DrinkSlotIndex,
  DrinkSlots,
  EvidenceId,
  GameEventBus,
  HangoverState,
  Health,
  HeatSnapshot,
  BuzzSnapshot,
  ObjectiveId,
  SaveState,
  SpecialAbilityId,
  BossId,
} from '../core/types';
import { abilitiesForChapterStart } from './abilities';
import { hangoverAtChapterStart, hangoverFromChapterEnd, maxHealthFor } from './conditions';
import type { DialogueLookup } from './dialogue';
import { freshPlayerSnapshot } from './player';
import { ChapterRun } from './run';

/** What the session asks of Phaser. Implemented in `src/main.ts`. */
export interface SceneDriver {
  showTitle(): void;
  /** (Re)starts the Game scene, which calls `session.createRun()`. */
  startGame(): void;
  pauseGame(): void;
  resumeGame(): void;
}

/** Dialogue lookup backed by `src/content/dialogue/`. */
export const contentDialogue: DialogueLookup = {
  delivery: (id) => (hasSequence(id) ? sequence(id).delivery : null),
};

/** Pool lookup that returns [] for unknown pools instead of throwing. */
export function poolOrEmpty(id: string): readonly DialogueId[] {
  try {
    return dialoguePool(id);
  } catch {
    return [];
  }
}

interface PendingRun {
  readonly module: ChapterModule;
  readonly save: SaveState;
  readonly resumed: boolean;
  readonly afterDeath: boolean;
  /** Sandbox and missing-chapter runs never touch the real save. */
  readonly store: SaveStore;
}

export function chapterStartCheckpoint(module: ChapterModule): CheckpointId {
  const def = module.def;
  return def.checkpoints.find((c) => c.kind === 'chapterStart')?.id ?? `c${def.number}.start`;
}

/** A save positioned at the start of a chapter. */
export function saveAtChapterStart(module: ChapterModule, base: Omit<SaveState, 'chapter' | 'checkpointId' | 'respawn'>): SaveState {
  const def = module.def;
  const cpId = chapterStartCheckpoint(module);
  const cp = def.checkpoints.find((c) => c.id === cpId);
  const screen = module.screens.find((s) => s.id === def.startScreenId) ?? module.screens[0];
  const respawn = cp
    ? { screenId: cp.screenId, position: cp.position }
    : { screenId: def.startScreenId, position: screen?.playerStart ?? { x: 0, y: 0 } };
  return { ...base, chapter: def.number, checkpointId: cpId, respawn };
}

export function emptyProgress(): Omit<SaveState, 'chapter' | 'checkpointId' | 'respawn'> {
  return {
    version: SAVE_VERSION,
    player: freshPlayerSnapshot(),
    mykoCallsLeft: TUNING.myko.callsPerGame,
    mykoCalls: [],
    finishedChapters: [],
    completedSectionIds: [],
    cleanStealthRunIds: [],
    collectedPickupIds: [],
    casebook: [],
    hintsGiven: {},
    flags: {},
  };
}

/** Chapter Select start state. docs/chapters/README.md "Carry-over rules". */
export function chapterSelectSave(module: ChapterModule, existing: SaveState | null, priorEvidence: readonly EvidenceId[]): SaveState {
  const n = module.def.number;
  const base = existing ?? { ...emptyProgress(), chapter: n, checkpointId: chapterStartCheckpoint(module), respawn: { screenId: module.def.startScreenId, position: { x: 0, y: 0 } } };
  const abilities = abilitiesForChapterStart(n);
  const casebook: CasebookEntry[] = [...base.casebook];
  for (const id of priorEvidence) {
    if (!casebook.some((e) => e.kind === 'evidence' && e.evidenceId === id)) casebook.push({ kind: 'evidence', evidenceId: id, chapter: n });
  }
  const specials = abilities.filter((a): a is SpecialAbilityId => a === 'stoutSlam' || a === 'poitinBreath' || a === 'borrowedGlove');
  return saveAtChapterStart(module, {
    ...base,
    player: {
      health: TUNING.player.maxHealth,
      buzz: 0,
      empties: 0,
      drinkSlots: TUNING.chapterSelect.startingDrinks,
      selectedDrink: 0,
      selectedSpecial: specials[0] ?? null,
      unlockedAbilities: abilities,
      hangover: { active: false },
    },
    casebook,
    // Sections of this and later chapters start fresh.
    completedSectionIds: base.completedSectionIds.filter((id) => chapterOf(id) < n),
    collectedPickupIds: [],
    flags: Object.fromEntries(Object.entries(base.flags).filter(([k]) => chapterOf(k) < n)),
  });
}

/** Chapter number from an ID prefix like `c3.`; 0 if none. */
export function chapterOf(id: string): number {
  const m = /^c(\d+)\./.exec(id);
  return m ? Number(m[1]) : 0;
}

/** Applies the end-of-chapter rules and positions the save at the next chapter. */
export function carryOver(snapshot: SaveState, endState: BuzzState, next: ChapterModule): SaveState {
  const ended = snapshot.chapter;
  const hungover = hangoverAtChapterStart(next.def.number, hangoverFromChapterEnd(ended, endState));
  const finished = snapshot.finishedChapters.includes(ended) ? snapshot.finishedChapters : [...snapshot.finishedChapters, ended];
  return saveAtChapterStart(next, {
    ...snapshot,
    finishedChapters: finished,
    player: {
      ...snapshot.player,
      buzz: 0,
      health: maxHealthFor(hungover),
      hangover: { active: hungover },
    },
  });
}

export interface SessionOptions {
  readonly store?: SaveStore;
  readonly rng?: Random;
  readonly bus?: EventBus;
  /** Fallback module when a chapter is not registered (the sandbox). */
  readonly fallbackModule?: (chapter: ChapterNumber) => ChapterModule;
}

export class GameSession {
  readonly bus: EventBus;
  readonly store: SaveStore;
  private readonly rng: Random;
  private driver: SceneDriver | null = null;
  private pending: PendingRun | null = null;
  private current: ChapterRun | null = null;
  private paused = false;
  private audio: AudioSettings;

  constructor(private readonly opts: SessionOptions = {}) {
    this.bus = opts.bus ?? new EventBus();
    this.store = opts.store ?? new SaveStore();
    this.rng = opts.rng ?? seededRandom(1);
    this.audio = this.store.loadAudio();
  }

  setDriver(driver: SceneDriver): void {
    this.driver = driver;
  }

  get run(): ChapterRun | null {
    return this.current;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  // -------------------------------------------------------------------------
  // Flow
  // -------------------------------------------------------------------------

  newGame(): void {
    this.store.clear();
    const module = this.moduleFor(1);
    if (!module) return;
    const save = saveAtChapterStart(module.module, emptyProgress());
    module.store.write(save);
    this.begin({ module: module.module, save, resumed: false, afterDeath: false, store: module.store });
  }

  continueGame(): void {
    const save = this.store.load();
    if (!save) {
      this.newGame();
      return;
    }
    const module = this.moduleFor(save.chapter);
    if (!module) return;
    this.begin({ module: module.module, save, resumed: true, afterDeath: false, store: module.store });
  }

  startChapter(chapter: ChapterNumber): void {
    const found = this.moduleFor(chapter);
    if (!found) return;
    const prior: EvidenceId[] = [];
    for (let n = 1; n < chapter; n++) {
      const m = getChapter(n as ChapterNumber);
      if (m) prior.push(...m.def.evidence);
    }
    const save = chapterSelectSave(found.module, found.store === this.store ? this.store.load() : null, prior);
    found.store.write(save);
    this.begin({ module: found.module, save, resumed: false, afterDeath: false, store: found.store });
  }

  /** Starts a module directly with an in-memory save (sandbox, tests). */
  startModule(module: ChapterModule, save?: SaveState): void {
    const store = new SaveStore(new MemoryStorage());
    const s = save ?? saveAtChapterStart(module, emptyProgress());
    store.write(s);
    this.begin({ module, save: s, resumed: false, afterDeath: false, store });
  }

  /** Called by the Game scene when it starts. */
  createRun(): ChapterRun | null {
    const p = this.pending;
    if (!p) return null;
    this.current?.dispose();
    const run = new ChapterRun({
      module: p.module,
      save: p.save,
      bus: this.bus,
      rng: this.rng,
      dialogue: contentDialogue,
      pool: poolOrEmpty,
      resumed: p.resumed,
      afterDeath: p.afterDeath,
      writeSave: (state: SaveState) => p.store.write(state),
      onDeath: () => this.onDeath(),
      onChapterComplete: (endState, snap) => this.onChapterComplete(endState, snap),
    });
    this.current = run;
    this.bus.emit(GameEvents.ChapterStarted, { chapter: p.module.def.number });
    return run;
  }

  pause(): void {
    if (this.paused || !this.current) return;
    this.paused = true;
    this.bus.emit(GameEvents.GamePaused, {});
    this.driver?.pauseGame();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.bus.emit(GameEvents.GameResumed, {});
    this.driver?.resumeGame();
  }

  quitToTitle(): void {
    this.current?.dispose();
    this.current = null;
    this.pending = null;
    this.paused = false;
    this.driver?.showTitle();
  }

  audioSettings(): AudioSettings {
    return this.audio;
  }

  setAudioSettings(settings: AudioSettings): void {
    this.audio = settings;
    this.store.writeAudio(settings);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private begin(p: PendingRun): void {
    this.pending = p;
    this.paused = false;
    this.driver?.startGame();
  }

  private moduleFor(chapter: ChapterNumber): { module: ChapterModule; store: SaveStore } | null {
    const m = getChapter(chapter);
    if (m) return { module: m, store: this.store };
    const fb = this.opts.fallbackModule?.(chapter);
    return fb ? { module: fb, store: new SaveStore(new MemoryStorage()) } : null;
  }

  private onDeath(): void {
    const p = this.pending;
    if (!p) return;
    const save = p.store.load() ?? p.save;
    this.begin({ ...p, save, resumed: true, afterDeath: true });
  }

  private onChapterComplete(endState: BuzzState, snap: SaveState): void {
    const p = this.pending;
    if (!p) return;
    const ended = snap.chapter;
    this.bus.emit(GameEvents.ChapterCompleted, { chapter: ended, endBuzzState: endState });
    if (ended >= 10) {
      const finished = snap.finishedChapters.includes(ended) ? snap.finishedChapters : [...snap.finishedChapters, ended];
      p.store.write({ ...snap, finishedChapters: finished });
      this.bus.emit(GameEvents.SaveWritten, { reason: 'chapterComplete' });
      this.quitToTitle();
      return;
    }
    const nextN = (ended + 1) as ChapterNumber;
    const next = getChapter(nextN) ?? (p.store === this.store ? undefined : this.opts.fallbackModule?.(nextN));
    if (!next) {
      // Next chapter not built yet: record the finish and go to the title.
      const finished = snap.finishedChapters.includes(ended) ? snap.finishedChapters : [...snap.finishedChapters, ended];
      p.store.write({ ...snap, finishedChapters: finished });
      this.bus.emit(GameEvents.SaveWritten, { reason: 'chapterComplete' });
      this.quitToTitle();
      return;
    }
    const save = carryOver(snap, endState, next);
    p.store.write(save);
    this.bus.emit(GameEvents.SaveWritten, { reason: 'chapterComplete' });
    this.begin({ module: next, save, resumed: false, afterDeath: false, store: p.store });
  }
}

/**
 * The object the UI receives (`UiStateSource` in `src/ui/contract.ts`).
 * Satisfies it structurally without importing the UI.
 */
export function createUiState(session: GameSession) {
  const run = () => session.run;
  return {
    get bus(): GameEventBus {
      return session.bus;
    },
    health(): Health {
      return run()?.player.health ?? { current: TUNING.player.maxHealth, max: TUNING.player.maxHealth };
    },
    buzz(): BuzzSnapshot {
      return run()?.player.buzz.snapshot() ?? { value: 0, state: 'sober', banjaxedPhase: 'none', banjaxedPhaseMsLeft: 0 };
    },
    heat(): HeatSnapshot {
      return run()?.player.heat.snapshot() ?? { active: false, value: 0 };
    },
    hangover(): HangoverState {
      return run()?.player.hangover.state() ?? { active: false };
    },
    empties(): number {
      return run()?.player.inventory.empties ?? 0;
    },
    drinkSlots(): DrinkSlots {
      return run()?.player.inventory.slots() ?? [null, null, null];
    },
    selectedDrink(): DrinkSlotIndex {
      return run()?.player.inventory.selected ?? 0;
    },
    selectedSpecial(): SpecialAbilityId | null {
      return run()?.player.abilities.selectedSpecial() ?? null;
    },
    unlockedAbilities(): readonly AbilityId[] {
      return run()?.player.abilities.unlocked() ?? [];
    },
    mykoCallsLeft(): number {
      return run()?.callsRemaining() ?? session.store.load()?.mykoCallsLeft ?? TUNING.myko.callsPerGame;
    },
    mykoCallHoldProgress(): number {
      return run()?.myko.callHoldProgress() ?? 0;
    },
    casebook(): readonly CasebookEntry[] {
      return run()?.casebook.entries() ?? session.store.load()?.casebook ?? [];
    },
    currentObjective(): ObjectiveId | null {
      return run()?.objective() ?? null;
    },
    boss(): { readonly bossId: BossId; readonly health: Health } | null {
      const b = run()?.activeBoss();
      const h = b?.health();
      return b && h ? { bossId: b.bossId, health: h } : null;
    },
    activeDeduction(): DeductionBoardDef | null {
      return run()?.activeDeduction()?.def ?? null;
    },
    submitDeduction(id: DeductionSectionId, evidence: readonly EvidenceId[]): boolean {
      return run()?.submitDeduction(id, evidence) ?? false;
    },
    dialogueFinished(sequenceId: DialogueId): void {
      run()?.dialogue.finished(sequenceId);
    },
    save(): SaveState | null {
      return session.store.load();
    },
    audioSettings(): AudioSettings {
      return session.audioSettings();
    },
    setAudioSettings(settings: AudioSettings): void {
      session.setAudioSettings(settings);
    },
    newGame(): void {
      session.newGame();
    },
    continueGame(): void {
      session.continueGame();
    },
    startChapter(chapter: ChapterNumber): void {
      session.startChapter(chapter);
    },
    pause(): void {
      session.pause();
    },
    resume(): void {
      session.resume();
    },
    quitToTitle(): void {
      session.quitToTitle();
    },
  };
}

export type UiState = ReturnType<typeof createUiState>;
