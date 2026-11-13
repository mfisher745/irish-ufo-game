/**
 * One play of a chapter from a save point: the simulation behind the Game
 * scene. Plain TypeScript (no Phaser), so it can be stepped headless in
 * tests and by QA. The Phaser view in `src/systems/view/` only reads it.
 *
 * Owns the player, Myko, the dialogue runner, the casebook, every section
 * of the chapter (fights, bosses, stealth, puzzles, deduction, scripted
 * completables), the current screen's actors, projectiles, pickups and
 * examinables, and the chapter script. Implements `ChapterContext` for the
 * script and the host interfaces the systems need.
 */

import { TUNING } from '../content/tuning';
import type {
  AreaRect,
  BossPlacement,
  ChapterContext,
  ChapterModule,
  ChapterScript,
  FightPlacement,
  PushPuzzlePlacement,
  ScreenLayout,
  ScriptedCompletableHandle,
  StealthControl,
  StealthPlacement,
} from '../core/chapter';
import { BusScope } from '../core/events';
import type { Random } from '../core/random';
import { GameEvents } from '../core/types';
import type {
  AbilityId,
  AlarmFightId,
  AttackShape,
  BossId,
  BuzzState,
  ChapterFlagValue,
  ChapterNumber,
  CheckpointId,
  Completable,
  CompletableKind,
  CompletableSectionId,
  CompletionSource,
  DialogueId,
  EnemyId,
  EvidenceId,
  ExaminableDef,
  FightDef,
  FightSectionId,
  GameEventBus,
  HitInfo,
  InputFrame,
  MykoCallKind,
  MykoCallLineSet,
  MykoCallRecord,
  NoiseEvent,
  ObjectiveDef,
  ObjectiveId,
  PickupDef,
  PickupItem,
  PickupId,
  RespawnPoint,
  Reward,
  SaveReason,
  SaveState,
  ScreenId,
  SectionId,
  SectionKind,
  StealthSectionDef,
  StealthSectionId,
  TileGrid,
  Vec2,
} from '../core/types';
import { SAVE_VERSION } from '../core/types';
import type { AbilityAction } from './abilities';
import { BossRunner } from './boss';
import { knockbackVector, scaledDamage, shapeHits } from './combat';
import { buzzStateRank } from './buzz';
import { DialogueRunner } from './dialogue';
import type { DialogueLookup } from './dialogue';
import { EnemyActor, statsFromDef } from './enemies';
import type { ActorStats, CombatWorld } from './enemies';
import { FightRunner } from './fight';
import { distance, rectContains } from './geometry';
import { isShade } from './grid';
import { Casebook, DeductionBoard, PuzzleBase } from './investigation';
import { applyConsumable, isAlcoholic, wouldHaveEffect } from './inventory';
import { Myko } from './myko';
import type { CallTarget, MykoHost } from './myko';
import { Player } from './player';
import { deflect, projectileTouches, spawnProjectile, stepProjectile } from './projectiles';
import type { Projectile, ProjectileSpawn } from './projectiles';
import { PushPuzzle } from './puzzles';
import { CompletableSection, ScriptedCompletable } from './sections';
import type { SectionHost } from './sections';
import { StealthRunner, actingNatural } from './stealth';
import type { Guard, StealthHost } from './stealth';

/** Short-lived things for the view to draw (swings, slams, impacts). */
export interface FxEvent {
  readonly kind: 'swing' | 'slam' | 'breath' | 'glove' | 'impact' | 'blocked' | 'hit';
  readonly pos: Vec2;
  readonly angleDeg: number;
  readonly radius: number;
  readonly arcDeg: number;
  ttlMs: number;
}

export interface LivePickup {
  readonly def: PickupDef;
  item: PickupItem;
}

/** Effects the run triggers directly, because they have no bus event. */
export type RunEffect = 'door' | 'push' | 'deflect';

export interface RunOptions {
  readonly module: ChapterModule;
  readonly save: SaveState;
  readonly bus: GameEventBus;
  readonly rng: Random;
  readonly dialogue: DialogueLookup;
  /** Sequence IDs of a dialogue pool, [] if unknown. */
  readonly pool: (poolId: string) => readonly DialogueId[];
  /** True after a death or Continue. */
  readonly resumed: boolean;
  /** True right after a death (Myko comments). */
  readonly afterDeath: boolean;
  readonly writeSave: (state: SaveState, reason: SaveReason) => void;
  readonly onDeath: () => void;
  readonly onChapterComplete: (endState: BuzzState, snapshot: SaveState) => void;
  /** Sound effects with no bus event (door, push, deflect). */
  readonly playEffect?: (id: RunEffect) => void;
}

interface SectionEntry {
  readonly completable: CompletableSection;
  readonly kind: CompletableKind;
  readonly screenId: ScreenId | null;
  readonly entrance: Vec2 | null;
  start(): void;
  aliveActors?(): EnemyActor[];
  setSuspended?(on: boolean): void;
}

export class ChapterRun implements ChapterContext, SectionHost, CombatWorld {
  readonly bus: GameEventBus;
  readonly rng: Random;
  readonly module: ChapterModule;
  readonly chapter: ChapterNumber;
  readonly player: Player;
  readonly myko: Myko;
  readonly dialogue: DialogueRunner;
  readonly casebook: Casebook;
  readonly sectionHost: SectionHost = this;

  // Progress (persisted)
  private readonly completed: Set<SectionId>;
  private readonly cleanRuns: Set<StealthSectionId>;
  private readonly collected: Set<PickupId>;
  private readonly hints: Record<ObjectiveId, number>;
  private readonly flags: Record<string, ChapterFlagValue>;
  private callsLeft: number;
  private readonly calls: MykoCallRecord[];
  private readonly finished: readonly ChapterNumber[];
  private checkpointId: CheckpointId;
  private respawn: RespawnPoint;
  private readonly reachedCheckpoints = new Set<CheckpointId>();

  // Sections
  private readonly sections = new Map<CompletableSectionId, SectionEntry>();
  private readonly fights = new Map<FightSectionId | AlarmFightId, FightRunner>();
  private readonly bosses = new Map<BossId, BossRunner>();
  private readonly stealthRunners = new Map<StealthSectionId, { runner: StealthRunner; placement: StealthPlacement | null }>();
  private deduction: DeductionBoard | null = null;
  private currentSection: CompletableSectionId | null = null;

  // Screen
  private screen: ScreenLayout;
  private actorList: EnemyActor[] = [];
  private projectileList: Projectile[] = [];
  private readonly pickupsLive = new Map<PickupId, LivePickup>();
  private readonly refusedNear = new Set<PickupId>();
  private readonly exitLocks = new Map<string, boolean>();
  private readonly firedTriggers = new Set<string>();
  private readonly insideTriggers = new Set<string>();
  readonly fx: FxEvent[] = [];
  private deflectUntil = 0;
  private clock = 0;
  private footstepMs = 0;
  private defeatedEmitted = new Set<string>();

  // State
  private objectiveId: ObjectiveId | null = null;
  private controlsLocked = false;
  private deathTimer = -1;
  private ended = false;
  private readonly script: ChapterScript;
  private readonly scope: BusScope;
  private msSinceGrandOrAbove = 0;
  private begun = false;

  constructor(private readonly opts: RunOptions) {
    const save = opts.save;
    this.bus = opts.bus;
    this.rng = opts.rng;
    this.module = opts.module;
    this.chapter = opts.module.def.number;
    this.scope = new BusScope(this.bus);
    this.completed = new Set(save.completedSectionIds);
    this.cleanRuns = new Set(save.cleanStealthRunIds);
    this.collected = new Set(save.collectedPickupIds);
    this.hints = { ...save.hintsGiven };
    this.flags = { ...save.flags };
    this.callsLeft = save.mykoCallsLeft;
    this.calls = [...save.mykoCalls];
    this.finished = save.finishedChapters;
    this.checkpointId = save.checkpointId;
    this.respawn = save.respawn;
    this.reachedCheckpoints.add(save.checkpointId);

    this.player = new Player(this.bus, save.player);
    this.dialogue = new DialogueRunner(this.bus, opts.dialogue);
    this.casebook = new Casebook(this.bus, save.casebook);
    this.myko = new Myko(this.mykoHost());

    const screen = this.layout(save.respawn.screenId) ?? this.layout(this.module.def.startScreenId) ?? this.module.screens[0];
    if (!screen) throw new Error(`Chapter ${this.chapter} has no screens`);
    this.screen = screen;

    this.buildSections();
    this.script = this.module.createScript?.(this) ?? {};
    this.wireBus();

    this.loadScreen(screen.id, save.respawn.position);
  }

  /**
   * Runs once, on the first tick, so the HUD and audio (started with the
   * scene) see the opening lines and events.
   */
  private begin(): void {
    const save = this.opts.save;
    this.script.onStart?.({ checkpointId: save.checkpointId, resumed: this.opts.resumed });
    if (this.opts.afterDeath) {
      this.bus.emit(GameEvents.PlayerRespawned, { respawn: save.respawn });
      this.myko.comment('death', 'myko.death', true);
    } else if (!this.opts.resumed && this.player.hangover.active) {
      this.myko.comment('hangover', 'myko.hangover', true);
    }
    const region = this.module.def.screens.find((x) => x.id === this.screen.id)?.region;
    if (region) this.bus.emit(GameEvents.ScreenEntered, { screenId: this.screen.id, region });
  }

  // -------------------------------------------------------------------------
  // Read access for the view, UI and tests
  // -------------------------------------------------------------------------

  get screenLayout(): ScreenLayout {
    return this.screen;
  }

  get grid(): TileGrid {
    return this.screen.grid;
  }

  get screenId(): ScreenId {
    return this.screen.id;
  }

  get isEnded(): boolean {
    return this.ended;
  }

  get dying(): boolean {
    return this.deathTimer >= 0;
  }

  /** Gameplay is paused by a scripted scene. */
  get sceneBlocking(): boolean {
    return this.dialogue.blocking;
  }

  enemies(): readonly EnemyActor[] {
    return this.actorList;
  }

  projectiles(): readonly Projectile[] {
    return this.projectileList;
  }

  pickups(): readonly LivePickup[] {
    return [...this.pickupsLive.values()];
  }

  examinablesHere(): readonly ExaminableDef[] {
    return this.module.examinables.filter((e) => e.screenId === this.screen.id);
  }

  guardsHere(): readonly Guard[] {
    return this.stealthHere().flatMap((s) => (s.runner.active ? s.runner.guards : []));
  }

  stealthHere(): { runner: StealthRunner; placement: StealthPlacement | null }[] {
    return [...this.stealthRunners.values()].filter((s) => s.placement?.screenId === this.screen.id);
  }

  pushPuzzlesHere(): { puzzle: PushPuzzle; placement: PushPuzzlePlacement }[] {
    const out: { puzzle: PushPuzzle; placement: PushPuzzlePlacement }[] = [];
    for (const p of this.module.pushPuzzles ?? []) {
      if (p.screenId !== this.screen.id) continue;
      const e = this.sections.get(p.sectionId);
      if (e && e.completable instanceof PushPuzzle) out.push({ puzzle: e.completable, placement: p });
    }
    return out;
  }

  callsRemaining(): number {
    return this.callsLeft;
  }

  currentCompletable(): Completable | null {
    const id = this.currentSection;
    if (!id) return null;
    const e = this.sections.get(id);
    return e && !e.completable.isComplete() ? e.completable : null;
  }

  activeBoss(): BossRunner | null {
    for (const b of this.bosses.values()) if (b.active) return b;
    return null;
  }

  activeDeduction(): DeductionBoard | null {
    return this.deduction?.isOpen ? this.deduction : null;
  }

  submitDeduction(id: string, evidence: readonly EvidenceId[]): boolean {
    if (!this.deduction || this.deduction.def.id !== id) return false;
    return this.deduction.submit(evidence, this.bus);
  }

  objectiveDef(): ObjectiveDef | null {
    return this.module.def.objectives.find((o) => o.id === this.objectiveId) ?? null;
  }

  /** Builds the SaveState for the current progress at a respawn point. */
  snapshot(checkpointId: CheckpointId = this.checkpointId, respawn: RespawnPoint = this.respawn): SaveState {
    return {
      version: SAVE_VERSION,
      chapter: this.chapter,
      checkpointId,
      respawn,
      player: this.player.snapshot(),
      mykoCallsLeft: this.callsLeft,
      mykoCalls: [...this.calls],
      finishedChapters: [...this.finished],
      completedSectionIds: [...this.completed],
      cleanStealthRunIds: [...this.cleanRuns],
      collectedPickupIds: [...this.collected],
      casebook: [...this.casebook.entries()],
      hintsGiven: { ...this.hints },
      flags: { ...this.flags },
    };
  }

  dispose(): void {
    this.script.dispose?.();
    this.scope.dispose();
    this.dialogue.clear();
  }

  // -------------------------------------------------------------------------
  // Tick
  // -------------------------------------------------------------------------

  tick(dtMs: number, input: InputFrame): void {
    if (this.ended) return;
    if (!this.begun) {
      this.begun = true;
      this.begin();
    }
    this.clock += dtMs;
    for (const f of this.fx) f.ttlMs -= dtMs;
    while (this.fx.length > 0 && (this.fx[0]?.ttlMs ?? 1) <= 0) this.fx.shift();

    if (this.deathTimer >= 0) {
      this.deathTimer -= dtMs;
      if (this.deathTimer < 0) {
        this.ended = true;
        this.opts.onDeath();
      }
      return;
    }
    if (this.dialogue.blocking) return;

    const live = this.controlsLocked || this.myko.callInProgress || this.deduction?.isOpen === true ? lockedInput(input) : input;
    const p = this.player;

    // Player conditions.
    p.buzz.tick(dtMs);
    p.timed.tick(dtMs);
    p.move(dtMs, live, this.grid, (c, r) => this.extraBlocked(c, r));
    const heatDamage = p.heat.tick(dtMs, { inShade: isShade(this.grid, p.pos), running: p.moving && !p.sneaking });
    p.drain(heatDamage);
    if (p.heat.active && p.heat.fraction() >= TUNING.myko.heatWarnFraction) this.myko.comment('heat', 'myko.heat');
    this.trackSober(dtMs);

    this.handleInventoryInput(live);
    const actions = p.abilities.update(dtMs, live, {
      effects: p.effects(),
      buzz: p.buzz.value,
      empties: p.inventory.empties,
      spendBuzz: (n) => p.buzz.spend(n),
      spendEmpties: (n) => p.inventory.spendEmpties(n),
      canAct: p.canAct,
      held: p.held,
    });
    for (const a of actions) this.resolveAction(a, live);
    if (live.pressed.has('interact')) this.interact();

    // Footsteps.
    this.footstepMs -= dtMs;
    if (p.moving && this.footstepMs <= 0) {
      this.footstepMs = TUNING.stealth.footstepIntervalMs;
      const radius = p.footstepNoiseRadius();
      if (radius > 0) this.emitNoise({ kind: p.sneaking ? 'sneakFootstep' : 'footstep', position: p.pos, radius });
    }

    // Puzzles.
    for (const { puzzle } of this.pushPuzzlesHere()) puzzle.update(dtMs, p.pos, live.move);

    // Actors, projectiles.
    for (const a of this.actorList) a.tick(dtMs, this);
    this.tickProjectiles(dtMs);

    // Sections.
    for (const f of this.fights.values()) f.tick(dtMs);
    for (const b of this.bosses.values()) b.tick(dtMs);
    const hidden = actingNatural(this.hidingPropsHere(), p.pos, p.stillMs, p.abilities.usable('actNatural'));
    for (const { runner, placement } of this.stealthHere()) {
      if (!placement) continue;
      if (!runner.isFinished && !runner.alarmRaised && rectContains(placement.startArea, p.pos)) this.startStealth(runner);
      runner.tick(dtMs, { pos: p.pos, hidden, running: p.moving && !p.sneaking, thermalVisible: p.heat.visibleToThermal() });
      if (runner.active && rectContains(placement.exitArea, p.pos)) runner.finish();
    }

    this.checkAreas();
    this.checkPickups();
    this.script.onUpdate?.(dtMs);

    // Myko.
    const combat = this.anyCombatOrStealthActive();
    this.myko.standPoint = combat ? this.activeEntrance() : this.myko.standPoint;
    const inputActive = live.move.x !== 0 || live.move.y !== 0 || live.pressed.size > 0;
    this.myko.update(dtMs, this.deduction?.isOpen === true ? lockedInput(input) : input, { combatOrStealth: combat, inputActive });

    if (p.dead && this.deathTimer < 0) {
      this.deathTimer = TUNING.player.deathRespawnDelayMs;
      this.bus.emit(GameEvents.PlayerDied, { checkpointId: this.checkpointId });
    }
  }

  // -------------------------------------------------------------------------
  // Combat world
  // -------------------------------------------------------------------------

  playerPosition(): Vec2 {
    return this.player.pos;
  }

  playerTargetable(): boolean {
    return !this.player.dead && !this.player.protected_ && !this.dialogue.blocking;
  }

  hitPlayer(hit: Omit<HitInfo, 'targetInstanceId'>): boolean {
    return this.player.takeHit({ ...hit, targetInstanceId: this.player.instanceId });
  }

  spawnProjectile(spawn: ProjectileSpawn): void {
    this.projectileList.push(spawnProjectile(spawn));
  }

  extraBlocked(col: number, row: number): boolean {
    for (const { puzzle } of this.pushPuzzlesHere()) if (puzzle.occupies(col, row)) return true;
    return false;
  }

  actors(): readonly EnemyActor[] {
    return this.actorList;
  }

  spawnEnemy(enemyId: EnemyId, pos: Vec2): EnemyActor {
    const actor = new EnemyActor(enemyId, statsFromDef(TUNING.enemies[enemyId]), pos, (attackId) => ({ kind: 'enemy', enemyId, attackId }), this.rng);
    this.actorList.push(actor);
    return actor;
  }

  spawnBossBody(bossId: BossId, stats: ActorStats, pos: Vec2): EnemyActor {
    const actor = new EnemyActor(null, stats, pos, (attackId) => ({ kind: 'boss', bossId, attackId }), this.rng);
    this.actorList.push(actor);
    return actor;
  }

  defeat(actor: EnemyActor, by: CompletionSource): void {
    if (!actor.down) actor.knockDown();
    this.emitDefeated(actor, by);
  }

  playerIn(area: AreaRect): boolean {
    return rectContains(area, this.player.pos);
  }

  // -------------------------------------------------------------------------
  // SectionHost
  // -------------------------------------------------------------------------

  grantReward(reward: Reward | undefined): void {
    if (!reward) return;
    for (const item of reward.pickups ?? []) this.give(item);
    for (const id of reward.evidenceIds ?? []) this.addEvidence(id);
    for (const id of reward.abilityIds ?? []) this.unlockAbility(id);
  }

  markCompleted(sectionId: SectionId, kind: SectionKind, by: CompletionSource): void {
    if (this.completed.has(sectionId)) return;
    this.completed.add(sectionId);
    if (this.currentSection === sectionId) this.currentSection = null;
    this.bus.emit(GameEvents.SectionCompleted, { sectionId, kind, by });
    if (sectionId.endsWith('.alarm')) {
      const stealthId = sectionId.slice(0, -'.alarm'.length) as StealthSectionId;
      this.stealthRunners.get(stealthId)?.runner.resolve();
      this.markCompleted(stealthId, 'stealth', by);
    }
    this.script.onSectionCompleted?.(sectionId, by);
  }

  // -------------------------------------------------------------------------
  // ChapterContext
  // -------------------------------------------------------------------------

  say(id: DialogueId): Promise<void> {
    return this.dialogue.play(id);
  }

  setObjective(id: ObjectiveId | null): void {
    this.objectiveId = id;
    if (id) this.bus.emit(GameEvents.ObjectiveChanged, { objectiveId: id });
  }

  objective(): ObjectiveId | null {
    return this.objectiveId;
  }

  flag(key: string): ChapterFlagValue | undefined {
    return this.flags[key];
  }

  setFlag(key: string, value: ChapterFlagValue): void {
    this.flags[key] = value;
  }

  isComplete(sectionId: SectionId): boolean {
    return this.completed.has(sectionId);
  }

  startSection(sectionId: SectionId): void {
    if (this.completed.has(sectionId)) return;
    const stealth = this.stealthRunners.get(sectionId as StealthSectionId);
    if (stealth) {
      this.startStealth(stealth.runner);
      return;
    }
    const e = this.sections.get(sectionId as CompletableSectionId);
    if (!e) {
      const kind = this.module.def.sections.find((s) => s.id === sectionId)?.kind;
      if (kind) this.bus.emit(GameEvents.SectionStarted, { sectionId, kind });
      return;
    }
    const def = this.module.def.sections.find((s) => s.id === sectionId);
    if (def?.checkpointId && !this.reachedCheckpoints.has(def.checkpointId)) this.reachCheckpoint(def.checkpointId);
    this.currentSection = e.completable.sectionId;
    e.start();
    this.script.onSectionStarted?.(sectionId);
  }

  completeSection(sectionId: SectionId, by: CompletionSource = 'player'): void {
    const e = this.sections.get(sectionId as CompletableSectionId);
    if (e) {
      const c = e.completable;
      if (c instanceof ScriptedCompletable) c.complete(by);
      else if (c instanceof BossRunner) c.complete(by);
      else c.completeNow(by);
      return;
    }
    const stealth = this.stealthRunners.get(sectionId as StealthSectionId);
    if (stealth) {
      stealth.runner.resolve();
      this.markCompleted(sectionId, 'stealth', by);
      return;
    }
    const kind = this.module.def.sections.find((s) => s.id === sectionId)?.kind ?? 'explore';
    this.markCompleted(sectionId, kind, by);
  }

  registerCompletable(
    sectionId: CompletableSectionId,
    kind: CompletableKind,
    solve: (source: CompletionSource) => void,
    reward?: Reward,
  ): ScriptedCompletableHandle {
    const c = new ScriptedCompletable(sectionId, kind, this, solve, reward ?? this.sectionReward(sectionId));
    if (this.completed.has(sectionId)) c.restoreComplete();
    this.sections.set(sectionId, {
      completable: c,
      kind,
      screenId: null,
      entrance: null,
      start: () => this.bus.emit(GameEvents.SectionStarted, { sectionId, kind }),
    });
    return {
      sectionId,
      isComplete: () => c.isComplete(),
      complete: (by = 'player') => c.complete(by),
      start: () => this.startSection(sectionId),
    };
  }

  registerPuzzle(puzzle: PuzzleBase): void {
    if (this.completed.has(puzzle.sectionId)) puzzle.restoreComplete();
    this.sections.set(puzzle.sectionId, {
      completable: puzzle,
      kind: 'puzzle',
      screenId: null,
      entrance: null,
      start: () => puzzle.start(),
    });
  }

  boss(id: BossId): BossRunner | null {
    return this.bosses.get(id) ?? null;
  }

  fight(id: FightSectionId): FightRunner | null {
    return this.fights.get(id) ?? null;
  }

  stealth(id: StealthSectionId): StealthControl | null {
    const s = this.stealthRunners.get(id);
    if (!s) return null;
    const runner = s.runner;
    return {
      alarm: () => runner.alarm(),
      setHazardEnabled: (h, on) => runner.setHazardEnabled(h, on),
      finish: () => runner.finish(),
      get alarmRaised() {
        return runner.alarmRaised;
      },
    };
  }

  openDeduction(): void {
    if (!this.deduction || this.deduction.isComplete()) return;
    this.currentSection = this.deduction.sectionId;
    this.bus.emit(GameEvents.SectionStarted, { sectionId: this.deduction.sectionId, kind: 'deduction' });
    this.deduction.openBoard();
  }

  closeDeduction(): void {
    this.deduction?.closeBoard();
  }

  unlockAbility(id: AbilityId): void {
    this.player.abilities.unlock(id);
  }

  give(item: PickupItem): void {
    if (item.kind === 'food') {
      const def = TUNING.food[item.foodId];
      applyConsumable(def.effects, this.player);
      this.bus.emit(GameEvents.FoodConsumed, { foodId: item.foodId });
      return;
    }
    const res = this.player.inventory.take(item);
    const leftover = res.ok ? res.leftover : item;
    if (leftover) {
      this.spawnPickup({ id: `drop.${Math.floor(this.clock)}.${this.pickupsLive.size}`, item: leftover, screenId: this.screen.id, position: this.player.pos });
    }
  }

  addEvidence(id: EvidenceId): void {
    if (this.casebook.addEvidence(id, this.chapter) && this.module.clueCommentPool) {
      this.myko.comment('clue', this.module.clueCommentPool);
    }
  }

  reachCheckpoint(id: CheckpointId): void {
    const cp = this.module.def.checkpoints.find((c) => c.id === id);
    this.reachedCheckpoints.add(id);
    this.checkpointId = id;
    this.respawn = cp ? { screenId: cp.screenId, position: cp.position } : { screenId: this.screen.id, position: this.player.pos };
    this.bus.emit(GameEvents.CheckpointReached, { checkpointId: id });
    this.save('checkpoint');
  }

  goToScreen(screenId: ScreenId, spawn: Vec2): void {
    this.loadScreen(screenId, spawn);
  }

  currentScreen(): ScreenId {
    return this.screen.id;
  }

  setExitLocked(exitId: string, locked: boolean): void {
    this.exitLocks.set(exitId, locked);
  }

  setHeatActive(active: boolean): void {
    this.player.heat.setActive(active);
  }

  setMykoScripted(pos: Vec2 | null): void {
    if (pos) {
      this.myko.mode = 'scripted';
      this.myko.standPoint = pos;
    } else {
      this.myko.mode = 'following';
      this.myko.standPoint = null;
    }
  }

  setPlayerPosition(pos: Vec2): void {
    this.player.pos = pos;
  }

  setControlsLocked(locked: boolean): void {
    this.controlsLocked = locked;
  }

  spawnPickup(def: PickupDef): void {
    this.pickupsLive.set(def.id, { def, item: def.item });
  }

  removePickup(id: string): void {
    this.pickupsLive.delete(id);
  }

  completeChapter(): void {
    if (this.ended) return;
    this.ended = true;
    this.dialogue.finishAll();
    this.opts.onChapterComplete(this.player.buzz.state, this.snapshot());
  }

  // -------------------------------------------------------------------------
  // Debug / QA
  // -------------------------------------------------------------------------

  /** completeNow('debug') on the current section (or resolves active stealth). */
  completeCurrent(): SectionId | null {
    const c = this.currentCompletable();
    if (c) {
      c.completeNow('debug');
      return c.sectionId;
    }
    for (const s of this.stealthRunners.values()) {
      if (s.runner.active) {
        this.completeSection(s.runner.sectionId, 'debug');
        return s.runner.sectionId;
      }
    }
    return null;
  }

  /** Completes every section in beat order, then the chapter. */
  walkChapter(): void {
    this.dialogue.finishAll();
    for (const s of this.module.def.sections) {
      if (this.completed.has(s.id)) continue;
      const e = this.sections.get(s.id as CompletableSectionId);
      if (e) e.completable.completeNow('debug');
      else this.completeSection(s.id, 'debug');
      this.dialogue.finishAll();
    }
    for (const id of this.module.def.evidence) this.casebook.addEvidence(id, this.chapter);
    for (const id of this.module.def.newAbilities) this.unlockAbility(id);
    this.script.debugWalk?.();
    this.dialogue.finishAll();
    this.completeChapter();
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private save(reason: SaveReason, respawn?: RespawnPoint): void {
    const state = this.snapshot(this.checkpointId, respawn ?? this.respawn);
    this.opts.writeSave(state, reason);
    this.bus.emit(GameEvents.SaveWritten, { reason });
  }

  private layout(id: ScreenId): ScreenLayout | undefined {
    return this.module.screens.find((s) => s.id === id);
  }

  private sectionReward(id: SectionId): Reward | undefined {
    return this.module.def.sections.find((s) => s.id === id)?.reward;
  }

  private buildSections(): void {
    const m = this.module;
    for (const f of m.fights) this.addFight(f);
    for (const b of m.bosses) this.addBoss(b);
    for (const p of m.pushPuzzles ?? []) {
      const grid = this.layout(p.screenId)?.grid;
      if (!grid) continue;
      const puzzle = new PushPuzzle(m.def.puzzle.id === p.sectionId ? m.def.puzzle : { id: p.sectionId, chapter: this.chapter, kind: 'push' }, p.layout, grid, this, this.bus, this.sectionReward(p.sectionId));
      if (this.completed.has(p.sectionId)) puzzle.restoreComplete();
      puzzle.onPush = () => this.opts.playEffect?.('push');
      this.sections.set(p.sectionId, { completable: puzzle, kind: 'puzzle', screenId: p.screenId, entrance: null, start: () => puzzle.start() });
    }
    const board = m.def.deductionBoard;
    if (board) {
      this.deduction = new DeductionBoard(board, this.casebook, this, { say: (id) => void this.say(id) }, this.sectionReward(board.id));
      if (this.completed.has(board.id)) this.deduction.restoreComplete();
      const d = this.deduction;
      this.sections.set(board.id, { completable: d, kind: 'deduction', screenId: null, entrance: null, start: () => d.openBoard() });
    }
    for (const def of m.def.stealthSections) {
      const placement = m.stealth.find((s) => s.sectionId === def.id) ?? null;
      const runner = new StealthRunner(def, this.stealthHost(placement));
      if (this.completed.has(def.id)) runner.resolve();
      this.stealthRunners.set(def.id, { runner, placement });
    }
  }

  private addFight(f: FightPlacement): void {
    const def: FightDef = TUNING.fights[f.sectionId] ?? { id: f.sectionId, waves: [] };
    const runner = new FightRunner(def, f.spawnPoints, this, this, this.sectionReward(f.sectionId), this.lazyFightHooks(f.sectionId));
    if (this.completed.has(f.sectionId)) runner.restoreComplete();
    this.fights.set(f.sectionId, runner);
    this.sections.set(f.sectionId, {
      completable: runner,
      kind: 'fight',
      screenId: f.screenId,
      entrance: f.entrance,
      start: () => runner.start(),
      aliveActors: () => runner.aliveActors(),
      setSuspended: (on) => {
        runner.suspended = on;
      },
    });
  }

  private addBoss(b: BossPlacement): void {
    const def = TUNING.bosses[b.bossId];
    const runner = new BossRunner(def, b.bodies, this, this, b.exitArea ?? null, this.sectionReward(b.bossId), this.lazyBossHooks(b.bossId));
    if (this.completed.has(b.bossId)) runner.restoreComplete();
    this.bosses.set(b.bossId, runner);
    this.sections.set(b.bossId, {
      completable: runner,
      kind: def.kind,
      screenId: b.screenId,
      entrance: b.entrance,
      start: () => runner.start(),
      aliveActors: () => runner.aliveActors(),
      setSuspended: (on) => {
        runner.suspended = on;
      },
    });
  }

  /** The script is created after sections, so hooks are looked up when called. */
  private lazyFightHooks(id: FightSectionId): import('./fight').FightHooks {
    return {
      onWaveCleared: (i) => this.script.fightHooks?.[id]?.onWaveCleared?.(i),
      onWaveSpawned: (i, a) => this.script.fightHooks?.[id]?.onWaveSpawned?.(i, a),
    };
  }

  private lazyBossHooks(id: BossId): import('./boss').BossHooks {
    const h = () => this.script.bossHooks?.[id];
    return {
      onStart: (b) => h()?.onStart?.(b),
      onPhaseChanged: (b, p) => {
        h()?.onPhaseChanged?.(b, p);
      },
      onTick: (b, dt) => h()?.onTick?.(b, dt),
      onChargeBlocked: (b, body, c, r) => h()?.onChargeBlocked?.(b, body, c, r),
      onAttackLanded: (b, body, a) => h()?.onAttackLanded?.(b, body, a),
      onEnd: (b, by) => h()?.onEnd?.(b, by),
    };
  }

  private stealthHost(placement: StealthPlacement | null): StealthHost {
    return {
      bus: this.bus,
      getGrid: () => this.screen.grid,
      raiseAlarm: (_sectionId, fightId, guards) => this.raiseAlarm(fightId, guards, placement),
      cleanRun: (def) => this.cleanRun(def),
    };
  }

  private startStealth(runner: StealthRunner): void {
    if (runner.active || runner.isFinished || runner.alarmRaised) return;
    if (!this.reachedCheckpoints.has(runner.def.checkpointId)) this.reachCheckpoint(runner.def.checkpointId);
    runner.start();
    this.script.onSectionStarted?.(runner.sectionId);
  }

  private raiseAlarm(fightId: AlarmFightId, guards: readonly Guard[], placement: StealthPlacement | null): void {
    const def: FightDef = TUNING.fights[fightId] ?? { id: fightId, waves: [] };
    const runner = new FightRunner(def, placement?.reinforcementPoints ?? [this.player.pos], this, this, this.sectionReward(fightId), {});
    this.fights.set(fightId, runner);
    this.sections.set(fightId, {
      completable: runner,
      kind: 'fight',
      screenId: placement?.screenId ?? this.screen.id,
      entrance: placement?.entrance ?? null,
      start: () => runner.start(),
      aliveActors: () => runner.aliveActors(),
      setSuspended: (on) => {
        runner.suspended = on;
      },
    });
    runner.adopt(guards.map((g) => this.spawnEnemy(g.enemyId, g.pos)));
    this.currentSection = fightId;
    runner.start();
    void this.say('myko.caught');
    this.script.onSectionStarted?.(fightId);
  }

  private cleanRun(def: StealthSectionDef): void {
    this.cleanRuns.add(def.id);
    const r = def.cleanRunReward;
    if (r?.kind === 'pickup') this.give(r.item);
    if (r?.kind === 'clue') this.addEvidence(r.clueId);
    this.bus.emit(GameEvents.StealthCleanRun, { sectionId: def.id });
    void this.say('myko.cleanRun');
    this.markCompleted(def.id, 'stealth', 'player');
  }

  private mykoHost(): MykoHost {
    return {
      bus: this.bus,
      rng: this.rng,
      play: (id) => void this.say(id),
      pool: (id) => this.opts.pool(id),
      chapter: () => this.chapter,
      callTarget: () => this.callTarget(),
      stealthUncaught: () => [...this.stealthRunners.values()].some((s) => s.runner.active),
      callsLeft: () => this.callsLeft,
      callLines: (kind: MykoCallKind): MykoCallLineSet | null => this.module.def.mykoCallLines[kind] ?? null,
      spendCall: (sectionId, kind) => {
        this.callsLeft = Math.max(0, this.callsLeft - 1);
        this.calls.push({ chapter: this.chapter, sectionId, kind });
        this.casebook.addMykoCall(sectionId, kind, this.chapter);
        this.saveHere();
      },
      saveAfterCall: () => this.saveHere(),
      defeat: (actor, by) => this.defeat(actor, by),
      setPlayerProtected: (on) => {
        this.player.protected_ = on;
      },
      objective: () => this.objectiveDef(),
      hintsGiven: (id) => this.hints[id] ?? 0,
      setHintsGiven: (id, n) => {
        this.hints[id] = n;
      },
      playerPos: () => this.player.pos,
      tangentPools: () => this.module.mykoTangentPools ?? {},
    };
  }

  /** A Myko call saves on the spot: respawn where Andrew stands. */
  private saveHere(): void {
    this.respawn = { screenId: this.screen.id, position: this.player.pos };
    this.save('mykoCall', this.respawn);
  }

  private callTarget(): CallTarget | null {
    const id = this.currentSection;
    if (!id) return null;
    const e = this.sections.get(id);
    if (!e || e.completable.isComplete()) return null;
    return {
      completable: e.completable,
      entrance: e.entrance,
      ...(e.aliveActors ? { aliveActors: e.aliveActors } : {}),
      ...(e.setSuspended ? { setSuspended: e.setSuspended } : {}),
    };
  }

  private anyCombatOrStealthActive(): boolean {
    for (const f of this.fights.values()) if (f.active) return true;
    for (const b of this.bosses.values()) if (b.active) return true;
    for (const s of this.stealthRunners.values()) if (s.runner.active) return true;
    return false;
  }

  private activeEntrance(): Vec2 | null {
    const cur = this.currentSection ? this.sections.get(this.currentSection) : undefined;
    if (cur?.entrance) return cur.entrance;
    for (const s of this.stealthRunners.values()) if (s.runner.active && s.placement) return s.placement.entrance;
    return null;
  }

  private hidingPropsHere() {
    return this.stealthHere().flatMap((s) => s.runner.def.hidingProps);
  }

  private loadScreen(id: ScreenId, spawn: Vec2): void {
    const layout = this.layout(id);
    if (!layout) return;
    this.screen = layout;
    this.actorList = [];
    this.projectileList = [];
    this.pickupsLive.clear();
    this.insideTriggers.clear();
    for (const p of this.module.pickups) {
      if (p.screenId === id && !this.collected.has(p.id)) this.pickupsLive.set(p.id, { def: p, item: p.item });
    }
    this.player.pos = spawn;
    // Value comparison: a spawn read back from a save on Continue is a copy, not the layout's object.
    const atStart = spawn.x === layout.playerStart.x && spawn.y === layout.playerStart.y;
    this.myko.pos = layout.mykoStart && atStart ? layout.mykoStart : { x: spawn.x - TUNING.myko.followDistance, y: spawn.y };
    // Areas Andrew spawns inside fire on the next tick (insideTriggers was cleared above).
    const region = this.module.def.screens.find((s) => s.id === id)?.region;
    if (region) this.bus.emit(GameEvents.ScreenEntered, { screenId: id, region });
    this.script?.onScreenEntered?.(id);
  }

  private handleInventoryInput(input: InputFrame): void {
    const inv = this.player.inventory;
    if (input.pressed.has('selectDrink1')) inv.select(0);
    if (input.pressed.has('selectDrink2')) inv.select(1);
    if (input.pressed.has('selectDrink3')) inv.select(2);
    if (input.pressed.has('selectDrinkNext')) inv.cycle(1);
    if (input.pressed.has('selectDrinkPrev')) inv.cycle(-1);
    if (input.pressed.has('drink') && this.player.canAct) {
      const id = inv.drinkSelected();
      if (!id) return;
      applyConsumable(TUNING.drinks[id].effects, this.player);
      if (this.player.heat.active && isAlcoholic(id)) this.myko.comment('heat', 'myko.heat.wrongDrink', true);
      else if (this.player.buzz.banjaxedPhase === 'none') this.myko.maybeComment('drink', 'myko.drink', TUNING.myko.drinkCommentChance);
    }
  }

  private trackSober(dtMs: number): void {
    if (this.player.buzz.state !== 'sober') this.msSinceGrandOrAbove += dtMs;
  }

  private resolveAction(a: AbilityAction, input: InputFrame): void {
    const p = this.player;
    const fx = p.effects();
    const r = TUNING.combat.characterHitRadius;
    const source = { kind: 'player' as const, abilityId: a.abilityId };
    switch (a.kind) {
      case 'dodge':
        p.startDodge(a.dashDistance, a.invulnerableMs, input.move);
        return;
      case 'melee': {
        p.faceAim();
        const range = a.shape.kind === 'arc' ? a.shape.range : 0;
        const arcDeg = a.shape.kind === 'arc' ? a.shape.arcDeg : 0;
        this.fx.push({ kind: 'swing', pos: p.pos, angleDeg: p.aimDeg, radius: range, arcDeg, ttlMs: 120 });
        if (a.deflectWindowMs > 0) this.deflectUntil = this.clock + a.deflectWindowMs;
        for (const actor of this.actorList) {
          if (actor.down || !shapeHits(a.shape, p.pos, p.aimDeg, actor.pos, r)) continue;
          this.damageActor(actor, scaledDamage(a.damage, fx.damageMultiplier), knockbackVector(p.pos, actor.pos, a.knockback, 0), 0, source, p.pos, false);
        }
        this.alarmGuardsHit(a.shape, p.aimDeg);
        if (a.deflectWindowMs > 0) this.tryDeflect();
        return;
      }
      case 'projectile':
        p.faceAim();
        this.spawnProjectile({
          owner: 'player',
          source,
          screenId: this.screen.id,
          from: p.pos,
          angleDeg: p.aimDeg,
          aimPoint: p.aimPoint,
          shape: a.shape,
          damage: scaledDamage(a.damage, fx.damageMultiplier),
          knockback: a.knockback,
          stunMs: a.stunMs,
          frame: a.abilityId === 'sliotarStrike' ? 'sliotar' : 'bottle',
        });
        return;
      case 'area': {
        const kind = a.abilityId === 'poitinBreath' ? 'breath' : a.abilityId === 'borrowedGlove' ? 'glove' : 'slam';
        const radius = a.shape.kind === 'circle' ? a.shape.radius : a.shape.kind === 'cone' ? a.shape.range : 0;
        const arcDeg = a.shape.kind === 'cone' ? a.shape.angleDeg : 360;
        this.fx.push({ kind, pos: p.pos, angleDeg: p.aimDeg, radius, arcDeg, ttlMs: 250 });
        for (const actor of this.actorList) {
          if (actor.down || !shapeHits(a.shape, p.pos, p.aimDeg, actor.pos, r)) continue;
          this.damageActor(actor, scaledDamage(a.damage, fx.damageMultiplier), knockbackVector(p.pos, actor.pos, a.knockback, 0), a.stunMs, source, p.pos, a.abilityId === 'borrowedGlove');
        }
        if (a.abilityId === 'borrowedGlove') this.bus.emit(GameEvents.AbilityGlovePulse, { screenId: this.screen.id, position: p.pos, radius });
        this.emitNoise({ kind: 'combat', position: p.pos, radius });
        return;
      }
    }
  }

  private alarmGuardsHit(shape: AttackShape, angle: number): void {
    for (const { runner } of this.stealthHere()) {
      if (!runner.active) continue;
      if (runner.guards.some((g) => shapeHits(shape, this.player.pos, angle, g.pos, TUNING.combat.characterHitRadius))) runner.alarm();
    }
  }

  private damageActor(actor: EnemyActor, amount: number, knockback: Vec2, stunMs: number, source: HitInfo['source'], from: Vec2, pierceShield: boolean): void {
    const hit: HitInfo = { source, targetInstanceId: actor.instanceId, amount, knockback, stunMs, holdMs: 0 };
    const outcome = actor.takeHit(hit, from, { pierceShield });
    if (outcome === 'blocked') {
      this.fx.push({ kind: 'blocked', pos: actor.pos, angleDeg: 0, radius: 6, arcDeg: 0, ttlMs: 150 });
      return;
    }
    if (outcome !== 'hit') return;
    this.fx.push({ kind: 'hit', pos: actor.pos, angleDeg: 0, radius: 6, arcDeg: 0, ttlMs: 120 });
    this.bus.emit(GameEvents.EnemyDamaged, { hit, health: { current: actor.health, max: actor.stats.maxHealth } });
    if (actor.down) this.emitDefeated(actor, 'player');
  }

  private emitDefeated(actor: EnemyActor, by: CompletionSource): void {
    if (this.defeatedEmitted.has(actor.instanceId)) return;
    this.defeatedEmitted.add(actor.instanceId);
    if (actor.enemyId) this.bus.emit(GameEvents.EnemyDefeated, { instanceId: actor.instanceId, enemyId: actor.enemyId, by });
  }

  private tryDeflect(): void {
    const p = this.player;
    for (const proj of this.projectileList) {
      if (proj.done || proj.owner !== 'enemy' || !proj.shape.deflectable) continue;
      const reach = TUNING.abilities.hurley.shape.kind === 'arc' ? TUNING.abilities.hurley.shape.range : 0;
      if (distance(proj.pos, p.pos) <= reach + TUNING.combat.projectileRadius) {
        deflect(proj, p.aimDeg, { kind: 'player', abilityId: 'hurley' });
        this.opts.playEffect?.('deflect');
      }
    }
  }

  private tickProjectiles(dtMs: number): void {
    const r = TUNING.combat.characterHitRadius;
    const p = this.player;
    for (const proj of this.projectileList) {
      if (proj.done) continue;
      const landedNow = stepProjectile(proj, this.grid, dtMs);
      const checkHits = !proj.shape.lobbed || landedNow;
      if (checkHits && proj.owner === 'player') {
        for (const actor of this.actorList) {
          if (actor.down || proj.hit.has(actor.instanceId) || !projectileTouches(proj, actor.pos, r)) continue;
          proj.hit.add(actor.instanceId);
          const kb = knockbackVector(proj.origin, actor.pos, proj.knockback, 0);
          const pierceShield = proj.source.kind === 'player' && proj.source.abilityId === 'sliotarStrike';
          this.damageActor(actor, proj.damage, kb, proj.stunMs, proj.source, proj.pos, pierceShield);
          if (!proj.shape.lobbed) {
            if (proj.pierceLeft <= 0) {
              proj.done = true;
              break;
            }
            proj.pierceLeft--;
          }
        }
      } else if (checkHits && proj.owner === 'enemy' && this.playerTargetable() && projectileTouches(proj, p.pos, r)) {
        if (proj.shape.deflectable && this.clock <= this.deflectUntil) {
          deflect(proj, p.aimDeg, { kind: 'player', abilityId: 'hurley' });
          this.opts.playEffect?.('deflect');
        } else if (!proj.hit.has(p.instanceId)) {
          proj.hit.add(p.instanceId);
          this.hitPlayer(
            { source: proj.source, amount: proj.damage, knockback: knockbackVector(proj.origin, p.pos, proj.knockback, 0), stunMs: 0, holdMs: proj.holdMs },
          );
          if (!proj.shape.lobbed) proj.done = true;
        }
      }
      if (landedNow) {
        this.fx.push({ kind: 'impact', pos: proj.pos, angleDeg: 0, radius: TUNING.combat.lobSplashRadius, arcDeg: 0, ttlMs: 200 });
        if (proj.shape.impactNoiseRadius > 0) this.emitNoise({ kind: proj.frame === 'bottle' ? 'bottle' : 'other', position: proj.pos, radius: proj.shape.impactNoiseRadius });
      }
    }
    this.projectileList = this.projectileList.filter((x) => !x.done);
  }

  emitNoise(n: NoiseEvent): void {
    this.bus.emit(GameEvents.StealthNoise, n);
    for (const { runner } of this.stealthHere()) runner.noise(n);
  }

  private interact(): void {
    const p = this.player;
    let best: ExaminableDef | null = null;
    let bestD = TUNING.investigation.interactRadius;
    for (const e of this.examinablesHere()) {
      const d = distance(e.position, p.pos);
      if (d <= bestD) {
        best = e;
        bestD = d;
      }
    }
    if (!best) return;
    if (this.script.onExamine?.(best.id) === true) return;
    if (best.dialogueId) void this.say(best.dialogueId);
    if (best.evidenceId) this.addEvidence(best.evidenceId);
    if (best.item) this.give(best.item);
    if (this.module.deduction?.examinableId === best.id) this.openDeduction();
    for (const pp of this.pushPuzzlesHere()) if (pp.placement.resetExaminableId === best.id) pp.puzzle.reset();
  }

  private checkPickups(): void {
    const p = this.player;
    const radius = TUNING.investigation.interactRadius;
    for (const live of [...this.pickupsLive.values()]) {
      const near = distance(live.def.position, p.pos) <= radius;
      if (!near) {
        this.refusedNear.delete(live.def.id);
        continue;
      }
      if (this.refusedNear.has(live.def.id)) continue;
      const item = live.item;
      if (item.kind === 'food') {
        const def = TUNING.food[item.foodId];
        const ok = wouldHaveEffect(def.effects, {
          healthMissing: p.health.max - p.health.current,
          hungover: p.hangover.active,
          buzz: p.buzz.value,
          heat: p.heat.value,
        });
        if (!ok) {
          this.refuse(live.def.id, 'noEffect');
          continue;
        }
        applyConsumable(def.effects, p);
        this.bus.emit(GameEvents.FoodConsumed, { foodId: item.foodId });
        this.collect(live, item, null);
        continue;
      }
      const res = p.inventory.take(item);
      if (!res.ok) {
        this.refuse(live.def.id, res.reason);
        continue;
      }
      this.collect(live, res.taken, res.leftover);
    }
  }

  private refuse(id: PickupId, reason: import('../core/types').PickupRefusal): void {
    this.refusedNear.add(id);
    this.bus.emit(GameEvents.PickupRefused, { pickupId: id, reason });
  }

  private collect(live: LivePickup, taken: PickupItem, leftover: PickupItem | null): void {
    this.bus.emit(GameEvents.PickupCollected, { pickupId: live.def.id, item: taken });
    if (live.def.commentDialogueId) void this.say(live.def.commentDialogueId);
    if (leftover) {
      live.item = leftover;
      this.refusedNear.add(live.def.id);
    } else {
      this.pickupsLive.delete(live.def.id);
      this.collected.add(live.def.id);
    }
  }

  private checkAreas(): void {
    const pos = this.player.pos;
    for (const t of this.module.triggers) {
      if (t.screenId !== this.screen.id) continue;
      const inside = rectContains(t.area, pos);
      if (!inside) {
        this.insideTriggers.delete(t.id);
        continue;
      }
      if (this.insideTriggers.has(t.id)) continue;
      this.insideTriggers.add(t.id);
      if ((t.once ?? true) && this.firedTriggers.has(t.id)) continue;
      this.firedTriggers.add(t.id);
      this.script.onTrigger?.(t.id);
    }
    for (const f of this.module.fights) {
      if (f.screenId === this.screen.id && f.trigger.kind === 'area' && !this.completed.has(f.sectionId) && rectContains(f.trigger.area, pos)) {
        const r = this.fights.get(f.sectionId);
        if (r && !r.active) this.startSection(f.sectionId);
      }
    }
    for (const b of this.module.bosses) {
      if (b.screenId === this.screen.id && b.trigger.kind === 'area' && !this.completed.has(b.bossId) && rectContains(b.trigger.area, pos)) {
        const r = this.bosses.get(b.bossId);
        if (r && !r.active) this.startSection(b.bossId);
      }
    }
    for (const cp of this.module.def.checkpoints) {
      if (cp.screenId === this.screen.id && !this.reachedCheckpoints.has(cp.id) && distance(cp.position, pos) <= TUNING.world.checkpointRadius) {
        this.reachCheckpoint(cp.id);
      }
    }
    if (this.anyFightActive()) return;
    for (const ex of this.screen.exits) {
      if (!rectContains(ex.area, pos)) continue;
      if (this.exitLocks.get(ex.id) === true) continue;
      if (ex.lockedUntil?.some((s) => !this.completed.has(s)) && this.exitLocks.get(ex.id) !== false) continue;
      this.opts.playEffect?.('door');
      this.loadScreen(ex.toScreen, ex.spawn);
      return;
    }
  }

  private anyFightActive(): boolean {
    for (const f of this.fights.values()) if (f.active) return true;
    for (const b of this.bosses.values()) if (b.active) return true;
    return false;
  }

  private wireBus(): void {
    this.scope.on(GameEvents.BuzzBanjaxedPhase, ({ phase }) => {
      if (phase === 'fallen') this.myko.comment('drink', 'myko.banjaxed', true);
    });
    this.scope.on(GameEvents.BuzzStateChanged, ({ from, to }) => {
      if (to === 'sober' && buzzStateRank(from) > 0 && this.msSinceGrandOrAbove >= TUNING.player.soberRemarkMinMsAbove) {
        const line = this.opts.pool('andrew.sober');
        const pickIdx = Math.floor(this.rng.next() * line.length);
        const id = line[pickIdx];
        if (id) void this.say(id);
        this.msSinceGrandOrAbove = 0;
      }
    });
    this.scope.on(GameEvents.HangoverStarted, () => this.player.clampHealth());
  }
}

function lockedInput(input: InputFrame): InputFrame {
  const keep = new Set(['callMyko'] as const);
  const filter = (s: ReadonlySet<import('../core/types').InputAction>) =>
    new Set([...s].filter((a) => (keep as ReadonlySet<string>).has(a)));
  return { ...input, move: { x: 0, y: 0 }, held: filter(input.held), pressed: filter(input.pressed), released: filter(input.released) };
}
