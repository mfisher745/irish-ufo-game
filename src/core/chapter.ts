/**
 * The chapter-module contract and registry. DESIGN.md section 10: "Chapters
 * are data plus small scripts. A chapter never reaches into a system's
 * internals." Level-builder writes one `ChapterModule` per chapter in
 * `src/chapters/<nn>/` and registers it from `src/chapters/index.ts` with
 * `registerChapter(module)`.
 *
 * ## How a chapter is put together
 *
 * Data (`ChapterModule`):
 * - `def`: the `ChapterDef` from types.ts (screens, checkpoints, sections in
 *   beat order, stealth defs, puzzle, deduction board, evidence, objectives,
 *   new abilities, Myko call lines, finale).
 * - `screens`: one `ScreenLayout` per `def.screens` entry: a `TileGrid` for
 *   collision / sight / shade, optional tile frames for drawing, exits to
 *   other screens and a start position.
 * - `pickups`, `examinables`: placed by screen (types.ts `PickupDef`,
 *   `ExaminableDef`). Examining adds evidence, gives an item and/or plays a
 *   line; the script can take over with `onExamine`.
 * - `fights`, `bosses`, `stealth`, `pushPuzzles`: where each section lives,
 *   what starts it (an area Andrew walks into, or 'script'), spawn points,
 *   and the `entrance` Myko waits at and strolls in from. The numbers
 *   (waves, health, attacks) come from `TUNING` by section ID, never from
 *   here.
 * - `screens[i].dressing`: props (frames in the props atlas, optionally
 *   animated, solid or sight-blocking) and standing NPCs (optionally
 *   talkable through an examinable ID), depth-sorted with the characters by
 *   their feet. `screens[i].ambient`: a palette tint for night scenes with
 *   light sources cut out of it.
 * - `triggers`: named areas; walking in calls `script.onTrigger(id)`. A
 *   spawn or respawn inside a trigger fires it on the next tick.
 * - Checkpoints are `def.checkpoints`; walking near one reaches it (save).
 *   Stealth and boss placements reach their checkpoint when they start, if
 *   it was not reached already.
 *
 * Script (`createScript(ctx)` returns a `ChapterScript`): small event hooks.
 * Everything a script does goes through `ChapterContext`: dialogue by ID
 * (`say` resolves when the line is finished; box lines never block play,
 * scene lines pause it), objectives, flags (saved), starting and finishing
 * sections, scripted completables, boss hooks, abilities, items, evidence,
 * exits, heat, props, NPCs and ambience (`setProp*`, `setNpc*`,
 * `setAmbient`: run-time only, restore from flags), melee hits on world
 * objects (`onMeleeHit`), and `completeChapter()` at the end.
 *
 * Every fight, boss, set piece, puzzle and deduction is a `Completable`:
 * fights, bosses, push puzzles and the deduction board are built by the
 * systems from the placements; any other puzzle kind or custom set piece is
 * registered by the script with `ctx.registerCompletable` (a callback that
 * jumps to the solved state) or `ctx.registerPuzzle` (a `PuzzleBase`
 * subclass from `src/systems`). Either way `completeNow()` works for the
 * Myko call and for QA.
 *
 * State after death or Continue: the chapter is rebuilt from the save.
 * Completed sections stay complete, collected pickups stay collected, and
 * `onStart({ checkpointId, resumed })` tells the script where it is; the
 * script restores anything else from `ctx.flag()`.
 *
 * QA: `window.__game.completeCurrent()` calls `completeNow('debug')` on the
 * current section; `window.__game.walkChapter()` completes every section in
 * `def.sections` order (stealth and explore are marked done, evidence and
 * new abilities are granted, `script.debugWalk?.()` runs) and then completes
 * the chapter.
 */

import type { NpcId } from '../art/cast';
import type { ColourName } from '../art/palette';
import type { BossBodyPlacement, BossHooks, BossRunner } from '../systems/boss';
import type { FightHooks, FightRunner } from '../systems/fight';
import type { PuzzleBase } from '../systems/investigation';
import type { PushPuzzleLayout } from '../systems/puzzles';
import type { SectionHost } from '../systems/sections';
import type {
  AbilityId,
  BossId,
  ChapterDef,
  ChapterFlagValue,
  ChapterNumber,
  CheckpointId,
  CompletableKind,
  CompletableSectionId,
  CompletionSource,
  DialogueId,
  EvidenceId,
  ExaminableDef,
  Facing,
  FightSectionId,
  GameEventBus,
  ObjectiveId,
  PickupDef,
  PickupItem,
  PuzzleSectionId,
  Reward,
  ScreenId,
  SectionId,
  StealthSectionId,
  TileGrid,
  Vec2,
} from './types';

/** An axis-aligned area in screen pixels. */
export interface AreaRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A way off a screen. */
export interface ExitDef {
  readonly id: string;
  readonly area: AreaRect;
  readonly toScreen: ScreenId;
  /** Where Andrew appears on the target screen. */
  readonly spawn: Vec2;
  /** Closed until all of these sections are complete. */
  readonly lockedUntil?: readonly SectionId[];
}

/** A rectangle of whole tiles, relative to whatever it belongs to. */
export interface TileFootprint {
  /** Offset in tiles from the owner's top-left tile (default 0). */
  readonly dx?: number;
  readonly dy?: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A sprite prop from the props atlas (`PROPS_KEY`, frame names in `PROP`).
 * Drawn with its top-left corner at the top-left of tile (`col`, `row`) and
 * depth-sorted with the characters by its bottom edge (its "feet"), so Andrew
 * walks behind and in front of it.
 */
export interface PropPlacement {
  /** Name a script uses with `ctx.setPropVisible` / `setPropFrame` / `setPropTile`. Unique in the chapter. */
  readonly id?: string;
  /** Frame name in the props atlas. */
  readonly frame: string;
  /** Tile of the sprite's top-left corner. */
  readonly col: number;
  readonly row: number;
  /** Frame cycle for animated props (the bog lights); loops. */
  readonly frames?: readonly string[];
  /** Frames per second for `frames` (default 4). */
  readonly frameRate?: number;
  /** Tiles that block movement while the prop is visible, relative to `col`/`row`. */
  readonly solid?: TileFootprint;
  /** Tiles that block vision cones and headlights while visible (default: none). `true` uses `solid`. */
  readonly blocksSight?: TileFootprint | true;
  /** Starts hidden (shown later with `ctx.setPropVisible`). */
  readonly hidden?: boolean;
  /** 'floor' draws under every character (rugs, puddles, markings); default 'sorted'. */
  readonly layer?: 'sorted' | 'floor';
}

/** A standing NPC. Texture `npcKey(npc)`; feet at the centre of tile (`col`, `row`). */
export interface NpcPlacement {
  /** Name a script uses with `ctx.setNpcPosition` / `setNpcFacing` / `setNpcVisible`. Unique in the chapter. */
  readonly id?: string;
  readonly npc: NpcId;
  readonly col: number;
  readonly row: number;
  readonly facing: Facing;
  /** Animation name (default 'idle'). */
  readonly anim?: string;
  /**
   * Pressing E beside the NPC examines this, shown as "talk" (`ui.prompt.talk`).
   * If `examinables` has an entry with this ID, its position is the talk spot
   * (it moves with the NPC); otherwise the NPC's feet are.
   */
  readonly examinableId?: string;
  /** Blocks the feet tile (default false). */
  readonly solid?: boolean;
  /** Starts hidden. */
  readonly hidden?: boolean;
}

/** Props and NPCs on a screen. */
export interface ScreenDressing {
  readonly props?: readonly PropPlacement[];
  readonly npcs?: readonly NpcPlacement[];
}

/** A light that cuts through the ambient darkness. */
export interface LightSource {
  /** Centre in screen pixels. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Palette colour of the glow. */
  readonly colour: ColourName;
  /** Glow strength 0..1 on top of the cut-out (default 0.25). */
  readonly glow?: number;
}

/** Night and mood: a palette tint over the whole screen with lights cut out of it. */
export interface ScreenAmbient {
  /** Palette colour of the darkness (e.g. 'navyDark', 'ink'). */
  readonly tint: ColourName;
  /** 0 (none) .. 1 (solid tint). */
  readonly strength: number;
  readonly lights?: readonly LightSource[];
}

export interface ScreenLayout {
  readonly id: ScreenId;
  readonly grid: TileGrid;
  /** Optional frame index in the region tileset per tile (row-major); -1 or absent draws nothing. */
  readonly tiles?: readonly number[];
  readonly exits: readonly ExitDef[];
  /** Where Andrew starts if the chapter starts on this screen. */
  readonly playerStart: Vec2;
  /** Where Myko starts (default: beside Andrew). */
  readonly mykoStart?: Vec2;
  /** Props and NPCs, depth-sorted with the characters. */
  readonly dressing?: ScreenDressing;
  /** Night tint and lights. A script can change it with `ctx.setAmbient`. */
  readonly ambient?: ScreenAmbient;
}

/** What a melee swing that touched an `onMeleeHit` area was. */
export interface MeleeHitInfo {
  readonly abilityId: AbilityId;
  /** 0-based index in the combo. */
  readonly comboIndex: number;
  readonly comboLength: number;
  /** The last hit of a combo of two or more (the punch combo's third swing). */
  readonly haymaker: boolean;
}

/** What starts a section: Andrew walking into an area, or the script. */
export type SectionTrigger = { readonly kind: 'area'; readonly area: AreaRect } | { readonly kind: 'script' };

export interface FightPlacement {
  readonly sectionId: FightSectionId;
  readonly screenId: ScreenId;
  readonly trigger: SectionTrigger;
  readonly spawnPoints: readonly Vec2[];
  /** Where Myko waits on the phone and strolls in from. */
  readonly entrance: Vec2;
}

export interface BossPlacement {
  readonly bossId: BossId;
  readonly screenId: ScreenId;
  readonly trigger: SectionTrigger;
  readonly bodies: readonly BossBodyPlacement[];
  readonly entrance: Vec2;
  /** For `reachExit` set pieces. */
  readonly exitArea?: AreaRect;
}

export interface StealthPlacement {
  readonly sectionId: StealthSectionId;
  readonly screenId: ScreenId;
  /** Walking in starts the section (and reaches its checkpoint). */
  readonly startArea: AreaRect;
  /** Walking in without the alarm is a clean run. */
  readonly exitArea: AreaRect;
  readonly entrance: Vec2;
  /** Where the `.alarm` fight's reinforcements arrive. */
  readonly reinforcementPoints: readonly Vec2[];
}

export interface PushPuzzlePlacement {
  readonly sectionId: PuzzleSectionId;
  readonly screenId: ScreenId;
  readonly layout: PushPuzzleLayout;
  /** Examinable that resets the puzzle (the chapter 3 lever). */
  readonly resetExaminableId?: string;
  /** Art frame name / texture key hint for the pieces ('keg', 'crate'). */
  readonly pieceKind: string;
}

export interface DeductionPlacement {
  /** Examining this opens the board (or the script calls `ctx.openDeduction()`). */
  readonly examinableId?: string;
}

export interface TriggerDef {
  readonly id: string;
  readonly screenId: ScreenId;
  readonly area: AreaRect;
  /** Fires once per chapter run (default true). */
  readonly once?: boolean;
}

export interface ChapterModule {
  readonly def: ChapterDef;
  readonly screens: readonly ScreenLayout[];
  readonly pickups: readonly PickupDef[];
  readonly examinables: readonly ExaminableDef[];
  readonly fights: readonly FightPlacement[];
  readonly bosses: readonly BossPlacement[];
  readonly stealth: readonly StealthPlacement[];
  readonly pushPuzzles?: readonly PushPuzzlePlacement[];
  readonly deduction?: DeductionPlacement;
  readonly triggers: readonly TriggerDef[];
  /** Pools for Myko's tangents (DESIGN.md 7.5: Ohio from chapter 6). */
  readonly mykoTangentPools?: { readonly ohio?: string; readonly other?: string };
  /** Pool Myko draws from when a clue is found, if any. */
  readonly clueCommentPool?: string;
  createScript?(ctx: ChapterContext): ChapterScript;
}

export interface ChapterStartInfo {
  readonly checkpointId: CheckpointId;
  /** True after a death or Continue; false on a fresh chapter start. */
  readonly resumed: boolean;
}

/** Hooks a chapter script may implement. All optional. */
export interface ChapterScript {
  onStart?(info: ChapterStartInfo): void;
  onScreenEntered?(screenId: ScreenId): void;
  onTrigger?(triggerId: string): void;
  /** Return true to replace the default examine behaviour. */
  onExamine?(examinableId: string): boolean | void;
  onSectionStarted?(sectionId: SectionId): void;
  onSectionCompleted?(sectionId: SectionId, by: CompletionSource): void;
  onUpdate?(dtMs: number): void;
  bossHooks?: Partial<Record<BossId, BossHooks>>;
  fightHooks?: Partial<Record<FightSectionId, FightHooks>>;
  /** Extra work when QA walks the chapter (set flags, give items). */
  debugWalk?(): void;
  dispose?(): void;
}

/** Handle for a completable registered by a script. */
export interface ScriptedCompletableHandle {
  readonly sectionId: CompletableSectionId;
  isComplete(): boolean;
  /** The player finished it. */
  complete(by?: CompletionSource): void;
  /** Make it the current section (for the Myko call and the HUD). */
  start(): void;
}

/** Stealth controls a script may need. */
export interface StealthControl {
  alarm(): void;
  setHazardEnabled(hazardId: string, enabled: boolean): void;
  finish(): void;
  readonly alarmRaised: boolean;
}

/** The public API a chapter script uses. Implemented in `src/systems/`. */
export interface ChapterContext {
  readonly bus: GameEventBus;
  readonly chapter: ChapterNumber;
  readonly sectionHost: SectionHost;

  // Dialogue and objectives
  say(id: DialogueId): Promise<void>;
  setObjective(id: ObjectiveId | null): void;
  objective(): ObjectiveId | null;

  // Flags (saved at each checkpoint)
  flag(key: string): ChapterFlagValue | undefined;
  setFlag(key: string, value: ChapterFlagValue): void;

  // Sections
  isComplete(sectionId: SectionId): boolean;
  startSection(sectionId: SectionId): void;
  /** Finish an explore section, a scripted completable or a `scripted` boss. */
  completeSection(sectionId: SectionId, by?: CompletionSource): void;
  registerCompletable(
    sectionId: CompletableSectionId,
    kind: CompletableKind,
    solve: (source: CompletionSource) => void,
    reward?: Reward,
  ): ScriptedCompletableHandle;
  registerPuzzle(puzzle: PuzzleBase): void;
  boss(id: BossId): BossRunner | null;
  fight(id: FightSectionId): FightRunner | null;
  stealth(id: StealthSectionId): StealthControl | null;
  openDeduction(): void;

  // Player and world
  unlockAbility(id: AbilityId): void;
  give(item: PickupItem): void;
  addEvidence(id: EvidenceId): void;
  reachCheckpoint(id: CheckpointId): void;
  goToScreen(screenId: ScreenId, spawn: Vec2): void;
  currentScreen(): ScreenId;
  setExitLocked(exitId: string, locked: boolean): void;
  setHeatActive(active: boolean): void;
  /** Park Myko at a spot (scripted), or null to let him follow again. */
  setMykoScripted(pos: Vec2 | null): void;
  playerPosition(): Vec2;
  setPlayerPosition(pos: Vec2): void;
  /** Freeze Andrew's controls (cutscene walk-ins). */
  setControlsLocked(locked: boolean): void;
  spawnPickup(def: PickupDef): void;
  removePickup(id: string): void;
  /** Ends the chapter: hangover carry-over, save, next chapter. */
  completeChapter(): void;

  // Dressing and ambience. Run-time changes last for this run only (not
  // saved): restore them from flags in `onStart` after a death or Continue.
  /** Shows or hides a prop by `PropPlacement.id` (its `solid`/`blocksSight` tiles go with it). */
  setPropVisible(id: string, visible: boolean): void;
  /** Swaps a prop's frame; `frames` replaces (or, as [], stops) its animation. */
  setPropFrame(id: string, frame: string, frames?: readonly string[]): void;
  /** Moves a prop so its top-left is at tile (`col`, `row`). */
  setPropTile(id: string, col: number, row: number): void;
  /** Moves an NPC's feet to `pos` (pixels), e.g. `T(col, row)`. */
  setNpcPosition(id: string, pos: Vec2): void;
  setNpcFacing(id: string, facing: Facing): void;
  /** Hides (removes) or shows an NPC. A hidden NPC cannot be talked to. */
  setNpcVisible(id: string, visible: boolean): void;
  /** Replaces the current screen's ambience (`null` = none). `screenId` targets another screen. */
  setAmbient(ambient: ScreenAmbient | null, screenId?: ScreenId): void;
  /**
   * Calls `callback` when a melee swing's shape (aimed where Andrew aims) touches
   * `area` on `screenId` (default: the screen current when this is called).
   * Fires once per swing. Returns a function that removes the hook.
   */
  onMeleeHit(area: AreaRect, callback: (hit: MeleeHitInfo) => void, screenId?: ScreenId): () => void;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const REGISTRY = new Map<ChapterNumber, ChapterModule>();

export function registerChapter(module: ChapterModule): void {
  REGISTRY.set(module.def.number, module);
}

export function getChapter(n: ChapterNumber): ChapterModule | undefined {
  return REGISTRY.get(n);
}

export function registeredChapters(): ChapterNumber[] {
  return [...REGISTRY.keys()].sort((a, b) => a - b);
}

/** Test helper. */
export function clearChapterRegistry(): void {
  REGISTRY.clear();
}
