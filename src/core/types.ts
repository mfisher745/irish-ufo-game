/**
 * Shared contracts for every system, chapter, UI and test.
 *
 * Implements DESIGN.md section 10, "Rules that keep parallel work compatible".
 * Only systems-dev changes this file, and only with the creative director's
 * approval.
 *
 * Rules for this file:
 * - Types, interfaces, string-literal unions and `as const` constants only.
 * - No balance numbers (those live in `src/content/tuning.ts`).
 * - No player-visible text (that lives in `src/content/dialogue/`). Types here
 *   refer to text by `TextId`.
 * - No Phaser import, so everything here is plain data and unit-testable.
 */

// ---------------------------------------------------------------------------
// Primitives and identifiers
// ---------------------------------------------------------------------------

/** A point or vector in world pixels. DESIGN.md section 8 (480 x 270 internal resolution). */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** A tile coordinate on the 16 x 16 tile grid. DESIGN.md section 8. */
export interface TileCoord {
  readonly col: number;
  readonly row: number;
}

/** Four-direction facing used by walk cycles and melee. DESIGN.md section 8. */
export type Facing = 'up' | 'down' | 'left' | 'right';

/** Chapter numbers 1 to 10. DESIGN.md section 5. */
export type ChapterNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Key into `src/content/dialogue/`. Every player-visible string is looked up by
 * one of these. DESIGN.md section 10 ("No text shown to the player is written
 * anywhere except src/content/dialogue/").
 */
export type TextId = string;

/** Identifier of a dialogue line or sequence. DESIGN.md section 10. */
export type DialogueId = string;

/** Identifier of a clue. DESIGN.md section 7.4. */
export type ClueId = string;

/** Identifier of one of the pieces of proof shown in the final broadcast. DESIGN.md section 7.4. */
export type ProofId = string;

/** Identifier of an enemy definition. DESIGN.md section 7.2. */
export type EnemyId = string;

/** Identifier of a fight, boss, set piece, puzzle, deduction board or stealth section. DESIGN.md sections 5, 7.3, 7.4, 7.5. */
export type EncounterId = string;

/** Identifier of a checkpoint. DESIGN.md section 7.2. */
export type CheckpointId = string;

/** Identifier of an objective that Myko can hint about. DESIGN.md section 7.5. */
export type ObjectiveId = string;

/** Identifier of a screen within a chapter. DESIGN.md section 5 ("two or three connected screens"). */
export type ScreenId = string;

/** Identifier of a pickup placed in a level. DESIGN.md section 7.1. */
export type PickupId = string;

/**
 * Region, used for palette and music selection. DESIGN.md sections 8 and 9.
 * Section 8 groups Boston/DC and Nevada/base for palette; they are listed
 * separately here so music and palette can still share one id per screen.
 */
export type RegionId =
  | 'kilnamoe'
  | 'boston'
  | 'washington'
  | 'ohio'
  | 'roswell'
  | 'nevada'
  | 'base';

// ---------------------------------------------------------------------------
// Input (DESIGN.md section 6)
// ---------------------------------------------------------------------------

/**
 * Every discrete input action. DESIGN.md section 6.
 * Movement (WASD) and aim (mouse) are continuous and live on `InputFrame`.
 */
export type InputAction =
  | 'melee'
  | 'ranged'
  | 'dodge'
  | 'drink'
  | 'selectDrink1'
  | 'selectDrink2'
  | 'selectDrink3'
  | 'selectDrinkNext'
  | 'selectDrinkPrev'
  | 'special'
  | 'cycleSpecial'
  | 'sneak'
  | 'interact'
  | 'hint'
  | 'callMyko'
  | 'casebook'
  | 'pause';

/** Physical input a binding refers to. Key names follow `KeyboardEvent.code`. DESIGN.md section 6. */
export type InputBinding =
  | { readonly device: 'keyboard'; readonly code: string }
  | { readonly device: 'mouse'; readonly button: 'left' | 'right' }
  | { readonly device: 'wheel'; readonly direction: 'up' | 'down' };

/** Default bindings from DESIGN.md section 6. Not balance, not player-visible text. */
export const DEFAULT_BINDINGS = {
  moveUp: [{ device: 'keyboard', code: 'KeyW' }],
  moveLeft: [{ device: 'keyboard', code: 'KeyA' }],
  moveDown: [{ device: 'keyboard', code: 'KeyS' }],
  moveRight: [{ device: 'keyboard', code: 'KeyD' }],
  melee: [{ device: 'mouse', button: 'left' }],
  ranged: [{ device: 'mouse', button: 'right' }],
  dodge: [{ device: 'keyboard', code: 'Space' }],
  drink: [{ device: 'keyboard', code: 'KeyQ' }],
  selectDrink1: [{ device: 'keyboard', code: 'Digit1' }],
  selectDrink2: [{ device: 'keyboard', code: 'Digit2' }],
  selectDrink3: [{ device: 'keyboard', code: 'Digit3' }],
  selectDrinkNext: [{ device: 'wheel', direction: 'down' }],
  selectDrinkPrev: [{ device: 'wheel', direction: 'up' }],
  special: [{ device: 'keyboard', code: 'KeyF' }],
  cycleSpecial: [{ device: 'keyboard', code: 'KeyR' }],
  sneak: [
    { device: 'keyboard', code: 'ShiftLeft' },
    { device: 'keyboard', code: 'ShiftRight' },
  ],
  interact: [{ device: 'keyboard', code: 'KeyE' }],
  hint: [{ device: 'keyboard', code: 'KeyH' }],
  callMyko: [{ device: 'keyboard', code: 'KeyM' }],
  casebook: [{ device: 'keyboard', code: 'Tab' }],
  pause: [{ device: 'keyboard', code: 'Escape' }],
} as const satisfies Readonly<
  Record<InputAction | 'moveUp' | 'moveLeft' | 'moveDown' | 'moveRight', readonly InputBinding[]>
>;

/**
 * One frame of resolved input, independent of Phaser. DESIGN.md section 6.
 * `pressed` and `released` hold edges for this frame; `held` holds current state.
 * `holdMs` reports how long a held action has been down (used by "hold M for
 * 1 second" and Sliotar Strike charging).
 */
export interface InputFrame {
  /** Movement vector from WASD, each axis in -1..1. */
  readonly move: Vec2;
  /** Mouse position in world pixels. */
  readonly aim: Vec2;
  readonly held: ReadonlySet<InputAction>;
  readonly pressed: ReadonlySet<InputAction>;
  readonly released: ReadonlySet<InputAction>;
  readonly holdMs: Readonly<Partial<Record<InputAction, number>>>;
}

// ---------------------------------------------------------------------------
// Buzz and hangover (DESIGN.md section 7.1)
// ---------------------------------------------------------------------------

/** The four Buzz states. DESIGN.md section 7.1. */
export type BuzzState = 'sober' | 'grand' | 'locked' | 'banjaxed';

/** Buzz states in ascending order. DESIGN.md section 7.1. */
export const BUZZ_STATES = ['sober', 'grand', 'locked', 'banjaxed'] as const satisfies readonly BuzzState[];

/**
 * Banjaxed has a timed sequence: boosted for a while, then Andrew falls over,
 * then Buzz drops. DESIGN.md section 7.1.
 */
export type BanjaxedPhase = 'none' | 'peak' | 'fallen';

/** Effects applied while in a Buzz state. Values come from tuning. DESIGN.md section 7.1. */
export interface BuzzStateEffects {
  readonly damageMultiplier: number;
  readonly attackSpeedMultiplier: number;
  /** 0 = full knockback, 1 = immune. */
  readonly knockbackResistance: number;
  readonly specialsUnlocked: boolean;
  /** Aim sway amplitude in degrees. */
  readonly aimSwayDeg: number;
  /** Movement drift strength, 0 = none. */
  readonly movementDrift: number;
  /** Multiplier on footstep noise radius in stealth. */
  readonly footstepNoiseMultiplier: number;
  /** Screen wobble strength, 0 = none. */
  readonly screenWobble: number;
}

/** Runtime Buzz state, owned by the Buzz system. DESIGN.md section 7.1. */
export interface BuzzSnapshot {
  /** 0..max (max is 100 in DESIGN.md, set in tuning). */
  readonly value: number;
  readonly state: BuzzState;
  readonly banjaxedPhase: BanjaxedPhase;
  /** Milliseconds left in the current Banjaxed phase, 0 when phase is 'none'. */
  readonly banjaxedPhaseMsLeft: number;
}

/** Hangover carried into a chapter. DESIGN.md section 7.1. */
export interface HangoverState {
  readonly active: boolean;
}

/** A timed buff or debuff on the player. DESIGN.md section 7.1 (bourbon, tequila, tea). */
export type TimedEffectKind = 'speedBoost' | 'extraSway' | 'steadyAim';

/** An active timed effect. DESIGN.md section 7.1. */
export interface ActiveTimedEffect {
  readonly kind: TimedEffectKind;
  readonly msLeft: number;
  /** Strength; meaning depends on kind (a multiplier for speedBoost and extraSway, unused for steadyAim). */
  readonly magnitude: number;
}

// ---------------------------------------------------------------------------
// Drinks and food (DESIGN.md section 7.1)
// ---------------------------------------------------------------------------

/** Every drink in the game. DESIGN.md section 7.1. */
export type DrinkId =
  | 'stout'
  | 'whiskey'
  | 'poitin'
  | 'lightBeer'
  | 'bourbon'
  | 'craftIpa'
  | 'tequila';

/** Every food (and non-alcoholic consumable). DESIGN.md section 7.1. */
export type FoodId =
  | 'crisps'
  | 'chickenFilletRoll'
  | 'breakfastRoll'
  | 'spiceBag'
  | 'tea'
  | 'water';

/**
 * One effect of consuming a drink or food. Magnitudes come from tuning.
 * DESIGN.md section 7.1.
 */
export type ConsumableEffect =
  | { readonly kind: 'buzz'; readonly amount: number }
  | { readonly kind: 'heal'; readonly amount: number }
  | { readonly kind: 'healFull' }
  | { readonly kind: 'cureHangover' }
  | { readonly kind: 'resetHeat' }
  | { readonly kind: 'timed'; readonly effect: TimedEffectKind; readonly durationMs: number; readonly magnitude: number };

/** A drink. Defined in `src/content/tuning.ts`. DESIGN.md section 7.1. */
export interface DrinkDef {
  readonly id: DrinkId;
  /** Display name in `src/content/dialogue/`. */
  readonly nameTextId: TextId;
  /** Pickup text in `src/content/dialogue/`. */
  readonly pickupTextId: TextId;
  readonly effects: readonly ConsumableEffect[];
  /** Empties left after drinking (DESIGN.md: "Every drink leaves an empty"). */
  readonly emptiesLeft: number;
}

/** A food. Defined in `src/content/tuning.ts`. DESIGN.md section 7.1. */
export interface FoodDef {
  readonly id: FoodId;
  readonly nameTextId: TextId;
  readonly pickupTextId: TextId;
  readonly effects: readonly ConsumableEffect[];
}

/** One drink slot in Andrew's inventory, selected with 1/2/3 or the wheel. DESIGN.md section 6. */
export interface DrinkSlot {
  readonly drinkId: DrinkId;
  readonly count: number;
}

/** Something Andrew can pick up. DESIGN.md sections 7.1 and 7.3 (clean-run reward). */
export type PickupItem =
  | { readonly kind: 'drink'; readonly drinkId: DrinkId }
  | { readonly kind: 'food'; readonly foodId: FoodId }
  | { readonly kind: 'empties'; readonly count: number };

/** A pickup placed in a level. DESIGN.md section 7.1. */
export interface PickupDef {
  readonly id: PickupId;
  readonly item: PickupItem;
  readonly position: Vec2;
  /** Optional Myko comment on pickup (e.g. one per craft IPA). DESIGN.md sections 7.1 and 7.5. */
  readonly commentDialogueId?: DialogueId;
}

// ---------------------------------------------------------------------------
// Abilities and combat (DESIGN.md section 7.2)
// ---------------------------------------------------------------------------

/** Every player ability. DESIGN.md section 7.2. */
export type AbilityId =
  | 'punchCombo'
  | 'bottleThrow'
  | 'stumble'
  | 'stoutSlam'
  | 'actNatural'
  | 'hurley'
  | 'sliotarStrike'
  | 'poitinBreath'
  | 'borrowedGlove';

/** Abilities bound to F and cycled with R. DESIGN.md section 6. */
export type SpecialAbilityId = 'stoutSlam' | 'poitinBreath' | 'borrowedGlove';

/** Specials in cycle order. DESIGN.md section 6. */
export const SPECIAL_ABILITIES = ['stoutSlam', 'poitinBreath', 'borrowedGlove'] as const satisfies readonly SpecialAbilityId[];

/** Which input an ability is driven by. DESIGN.md sections 6 and 7.2. */
export type AbilitySlot = 'melee' | 'ranged' | 'dodge' | 'special' | 'passive';

/** What an ability costs to use. DESIGN.md section 7.2. */
export type AbilityCost =
  | { readonly kind: 'none' }
  | { readonly kind: 'buzz'; readonly amount: number }
  | { readonly kind: 'empties'; readonly amount: number }
  /** Recharges on its own (the Borrowed Glove). */
  | { readonly kind: 'recharge'; readonly rechargeMs: number };

/** Geometry of a hit. Shared by player abilities and enemy attacks. DESIGN.md sections 7.2 and 7.3. */
export type AttackShape =
  | { readonly kind: 'none' }
  | { readonly kind: 'arc'; readonly range: number; readonly arcDeg: number }
  | { readonly kind: 'circle'; readonly radius: number }
  | { readonly kind: 'cone'; readonly range: number; readonly angleDeg: number }
  | {
      readonly kind: 'projectile';
      readonly speed: number;
      readonly range: number;
      /** Number of enemies it passes through; 0 stops at the first. */
      readonly pierce: number;
      /** Noise radius where it lands, 0 for silent. Bottle Throw distracts guards. */
      readonly impactNoiseRadius: number;
    };

/** A player ability. Defined in `src/content/tuning.ts`. DESIGN.md section 7.2. */
export interface AbilityDef {
  readonly id: AbilityId;
  readonly slot: AbilitySlot;
  /** Chapter in which it is unlocked. */
  readonly unlockChapter: ChapterNumber;
  /** Ability this one replaces when unlocked (Hurley replaces punchCombo). */
  readonly replaces?: AbilityId;
  /** Requires another ability to be unlocked (Sliotar Strike requires Hurley). */
  readonly requires?: AbilityId;
  readonly cost: AbilityCost;
  readonly cooldownMs: number;
  readonly shape: AttackShape;
  /** Base damage per hit before Buzz multipliers. */
  readonly damage: number;
  readonly knockback: number;
  /** Combo hit count and per-hit tuning (punch: three hits, the third a haymaker). */
  readonly combo?: readonly ComboHitDef[];
  /** Hold time for a charged use (Sliotar Strike). */
  readonly chargeMs?: number;
  /** Invulnerability window (The Stumble). */
  readonly invulnerableMs?: number;
  /** Stun duration applied to targets (The Borrowed Glove). */
  readonly stunMs?: number;
  /** Timed-deflect window for projectiles (Hurley). */
  readonly deflectWindowMs?: number;
  /** Dash distance (The Stumble). */
  readonly dashDistance?: number;
  /** Name and description in `src/content/dialogue/`. */
  readonly nameTextId: TextId;
}

/** One hit of a melee combo. DESIGN.md section 7.2. */
export interface ComboHitDef {
  readonly damage: number;
  readonly knockback: number;
  readonly windowMs: number;
}

/** Health of any combatant. DESIGN.md section 7.2. */
export interface Health {
  readonly current: number;
  readonly max: number;
}

/** Who dealt a hit. DESIGN.md section 7.2 and 7.5. */
export type DamageSource =
  | { readonly kind: 'player'; readonly abilityId: AbilityId }
  | { readonly kind: 'enemy'; readonly enemyId: EnemyId; readonly attackId: string }
  | { readonly kind: 'myko' }
  | { readonly kind: 'hazard'; readonly hazardId: string };

/** A resolved hit. DESIGN.md section 7.2. */
export interface HitInfo {
  readonly source: DamageSource;
  /** Runtime instance id of the target. */
  readonly targetInstanceId: string;
  readonly amount: number;
  readonly knockback: Vec2;
  readonly stunMs: number;
}

/** Status conditions an enemy can be in. DESIGN.md sections 7.2 and 7.3. */
export type EnemyStatus = 'normal' | 'telegraphing' | 'attacking' | 'stunned' | 'knockedBack' | 'down';

/** Enemy groups from the story. DESIGN.md section 4. */
export type EnemyFaction = 'local' | 'federal' | 'alien' | 'machine' | 'animal';

/** One enemy attack. Every attack is telegraphed. DESIGN.md section 7.2. */
export interface EnemyAttackDef {
  readonly id: string;
  readonly shape: AttackShape;
  readonly damage: number;
  readonly knockback: number;
  /** Visible warning before the hit lands. Must be > 0. */
  readonly telegraphMs: number;
  readonly cooldownMs: number;
}

/** An enemy. Defined in `src/content/tuning.ts`. DESIGN.md sections 5, 7.2, 7.3. */
export interface EnemyDef {
  readonly id: EnemyId;
  readonly faction: EnemyFaction;
  readonly nameTextId: TextId;
  /** Key of a sprite generator in `src/art/`. */
  readonly spriteKey: string;
  readonly maxHealth: number;
  readonly moveSpeed: number;
  readonly knockbackResistance: number;
  readonly attacks: readonly EnemyAttackDef[];
  /** Present for enemies that can act as stealth guards. */
  readonly senses?: GuardSensesDef;
  readonly isBoss: boolean;
  /** Appears as a person until revealed (chapter 7). */
  readonly disguised?: boolean;
}

// ---------------------------------------------------------------------------
// Stealth (DESIGN.md section 7.3)
// ---------------------------------------------------------------------------

/** A guard's vision cone and hearing. DESIGN.md section 7.3. */
export interface GuardSensesDef {
  readonly visionRange: number;
  readonly visionAngleDeg: number;
  readonly hearingRadius: number;
}

/**
 * Guard alert states. DESIGN.md section 7.3.
 * - patrol: following its route.
 * - investigating: heard a noise and is going to look.
 * - detecting: sees Andrew; the detection marker is filling.
 * - alarm: marker filled; the section is now a fight.
 */
export type AlertState = 'patrol' | 'investigating' | 'detecting' | 'alarm';

/** How a patrol route repeats. DESIGN.md section 7.3. */
export type PatrolMode = 'loop' | 'pingPong' | 'stationary';

/** One patrol stop. DESIGN.md section 7.3. */
export interface PatrolWaypoint {
  readonly position: Vec2;
  readonly waitMs: number;
  /** Direction to face while waiting. */
  readonly facing?: Facing;
}

/** A guard's patrol route. DESIGN.md section 7.3. */
export interface PatrolRoute {
  readonly mode: PatrolMode;
  readonly waypoints: readonly PatrolWaypoint[];
}

/** Sources of noise guards react to. DESIGN.md sections 7.1, 7.2, 7.3. */
export type NoiseKind = 'footstep' | 'sneakFootstep' | 'bottle' | 'combat' | 'other';

/** A noise emitted into the world. DESIGN.md section 7.3. */
export interface NoiseEvent {
  readonly kind: NoiseKind;
  readonly position: Vec2;
  readonly radius: number;
}

/** Runtime state of one guard. DESIGN.md section 7.3. */
export interface GuardSnapshot {
  readonly instanceId: string;
  readonly enemyId: EnemyId;
  readonly position: Vec2;
  /** Facing angle in degrees, 0 = right, clockwise. */
  readonly facingDeg: number;
  readonly alert: AlertState;
  /** Detection marker fill, 0..1. Fills over about one second while Andrew is seen. */
  readonly detection: number;
  /** Where the guard is investigating, when alert is 'investigating'. */
  readonly investigateTarget?: Vec2;
}

/** Kinds of prop Andrew can Act Natural beside. DESIGN.md section 7.2. */
export type HidingPropKind = 'queue' | 'noticeboard' | 'vendingMachine' | 'other';

/** A prop that enables Act Natural. DESIGN.md section 7.2. */
export interface HidingPropDef {
  readonly id: string;
  readonly kind: HidingPropKind;
  readonly position: Vec2;
  readonly radius: number;
}

/** A stealth sensor (chapter 8). DESIGN.md section 5. */
export interface SensorDef {
  readonly id: string;
  readonly position: Vec2;
  readonly senses: GuardSensesDef;
  readonly route?: PatrolRoute;
}

/** A guard placed in a stealth section. DESIGN.md section 7.3. */
export interface GuardPlacement {
  readonly enemyId: EnemyId;
  readonly route: PatrolRoute;
}

/** A group of enemies spawned together. DESIGN.md sections 7.2 and 7.3 (reinforcements). */
export interface SpawnGroup {
  readonly enemies: readonly { readonly enemyId: EnemyId; readonly position: Vec2 }[];
}

/** A stealth section. A checkpoint sits before each one. DESIGN.md sections 7.2 and 7.3. */
export interface StealthSectionDef {
  readonly id: EncounterId;
  readonly checkpointId: CheckpointId;
  readonly guards: readonly GuardPlacement[];
  readonly sensors: readonly SensorDef[];
  readonly hidingProps: readonly HidingPropDef[];
  /** Spawned when the alarm sounds; the section then becomes this combat encounter. */
  readonly onAlarm: {
    readonly reinforcements: SpawnGroup;
    readonly combatEncounterId: EncounterId;
  };
  /** Bonus for finishing without the alarm. Optional, never required. */
  readonly cleanRunReward?: Reward;
}

/** Heat meter state (chapter 8). DESIGN.md sections 5 and 7.1. */
export interface HeatSnapshot {
  /** 0..max, max set in tuning. */
  readonly value: number;
}

// ---------------------------------------------------------------------------
// Investigation, casebook, deduction, puzzles (DESIGN.md section 7.4)
// ---------------------------------------------------------------------------

/**
 * A clue. Text is in Andrew's words, with Myko's margin note.
 * DESIGN.md section 7.4.
 */
export interface Clue {
  readonly id: ClueId;
  readonly chapter: ChapterNumber;
  /** Short name shown on the deduction board. */
  readonly titleTextId: TextId;
  /** Andrew's casebook entry. */
  readonly bodyTextId: TextId;
  /** Myko's note in the margin. */
  readonly marginTextId: TextId;
  /** Set when this clue is also one of the pieces of proof for the broadcast. */
  readonly proofId?: ProofId;
}

/** Something examinable with E. DESIGN.md section 7.4. */
export interface ExaminableDef {
  readonly id: string;
  readonly position: Vec2;
  /** Clue added on examine, if any. */
  readonly clueId?: ClueId;
  /** Line shown on examine. */
  readonly dialogueId?: DialogueId;
}

/** A casebook entry. DESIGN.md sections 7.4 and 7.5. */
export type CasebookEntry =
  | { readonly kind: 'clue'; readonly clueId: ClueId; readonly chapter: ChapterNumber }
  | {
      readonly kind: 'lead';
      readonly deductionBoardId: EncounterId;
      readonly chapter: ChapterNumber;
      readonly bodyTextId: TextId;
      readonly marginTextId?: TextId;
    }
  | {
      /** Andrew's brief, inaccurate record of a Myko call, with Myko's correction. */
      readonly kind: 'mykoCall';
      readonly encounterId: EncounterId;
      readonly chapter: ChapterNumber;
      readonly bodyTextId: TextId;
      readonly marginTextId: TextId;
    };

/**
 * A deduction board: link three clues to name the next lead. A wrong answer
 * costs nothing except a remark from Myko. DESIGN.md section 7.4.
 */
export interface DeductionBoardDef {
  readonly id: EncounterId;
  readonly chapter: ChapterNumber;
  /** Clues offered on the board. */
  readonly candidateClueIds: readonly ClueId[];
  /** The three clues that must be linked. Order does not matter. */
  readonly solution: readonly [ClueId, ClueId, ClueId];
  /** The lead named when solved. */
  readonly leadTextId: TextId;
  /** Myko's remarks on wrong answers, cycled. */
  readonly wrongAnswerDialogueIds: readonly DialogueId[];
}

/** The physical puzzle kinds named in DESIGN.md section 7.4. */
export type PuzzleKind =
  | 'crates'
  | 'redactedFiles'
  | 'cropCircleMaze'
  | 'spotTheAlien'
  | 'gravitySwitches';

/** A chapter's physical puzzle. Puzzle-specific layout lives in the chapter. DESIGN.md section 7.4. */
export interface PuzzleDef {
  readonly id: EncounterId;
  readonly chapter: ChapterNumber;
  readonly kind: PuzzleKind;
}

// ---------------------------------------------------------------------------
// Encounters and completeNow (DESIGN.md sections 7.5 and 10)
// ---------------------------------------------------------------------------

/** Kinds of encounter. DESIGN.md sections 5, 7.2, 7.3, 7.4. */
export type EncounterKind = 'combat' | 'boss' | 'puzzle' | 'deduction' | 'stealth';

/**
 * Encounter kinds Myko can be called in on. Stealth only qualifies once it has
 * become a fight, at which point it is a 'combat' encounter. The Administrator
 * is excluded per-encounter via `EncounterDef.mykoCallable`. DESIGN.md section 7.5.
 */
export const MYKO_CALLABLE_KINDS = ['combat', 'boss', 'puzzle', 'deduction'] as const satisfies readonly EncounterKind[];

/** Which set of Myko call lines applies. DESIGN.md section 7.5 ("a fight call and a puzzle call"). */
export type MykoCallKind = 'fight' | 'puzzle';

/** Who finished an encounter. DESIGN.md sections 7.5 and 10. */
export type CompletionSource = 'player' | 'myko' | 'debug';

/** What finishing an encounter grants. DESIGN.md sections 7.3 and 7.5. */
export interface Reward {
  readonly pickups?: readonly PickupItem[];
  readonly clueIds?: readonly ClueId[];
  readonly abilityIds?: readonly AbilityId[];
}

/** Static definition of an encounter. DESIGN.md sections 5 and 7.5. */
export interface EncounterDef {
  readonly id: EncounterId;
  readonly kind: EncounterKind;
  /** False for the Administrator and for stealth that has not become a fight. */
  readonly mykoCallable: boolean;
  /** Checkpoint before this encounter, if any (every stealth section and boss has one). */
  readonly checkpointId?: CheckpointId;
  readonly reward?: Reward;
}

/**
 * The single entry point every fight and puzzle exposes. The Myko call-in and
 * the QA playthrough both use it. Calling it must leave the game in the same
 * state as the player finishing normally, including rewards, then emit
 * `encounter:completed`. Calling it on a finished encounter does nothing.
 * DESIGN.md sections 7.5 and 10.
 */
export interface Completable {
  readonly encounterId: EncounterId;
  readonly kind: EncounterKind;
  isComplete(): boolean;
  completeNow(source: CompletionSource): void;
}

/**
 * The scripted way to complete a whole chapter, for QA. DESIGN.md section 10
 * ("Every chapter exposes ... a scripted way to complete it").
 */
export interface ChapterCompletable {
  readonly chapter: ChapterNumber;
  completeNow(source: CompletionSource): void;
}

// ---------------------------------------------------------------------------
// Myko (DESIGN.md section 7.5)
// ---------------------------------------------------------------------------

/** Where Myko is and what he is doing. DESIGN.md section 7.5. */
export type MykoMode = 'following' | 'onPhone' | 'calledIn' | 'scripted';

/** Things Myko comments on unprompted. DESIGN.md section 7.5. */
export type MykoCommentTrigger = 'clue' | 'drink' | 'death' | 'hangover' | 'idle' | 'tangent';

/** Hint pair for one objective: a nudge, then the answer. DESIGN.md section 7.5. */
export interface HintDef {
  readonly objectiveId: ObjectiveId;
  readonly nudgeDialogueId: DialogueId;
  readonly answerDialogueId: DialogueId;
}

/** A current objective. DESIGN.md section 7.5. */
export interface ObjectiveDef {
  readonly id: ObjectiveId;
  readonly textId: TextId;
  readonly hint: HintDef;
}

/** Record of one spent Myko call, stored in the save. DESIGN.md sections 7.5 and 7.6. */
export interface MykoCallRecord {
  readonly chapter: ChapterNumber;
  readonly encounterId: EncounterId;
  readonly kind: MykoCallKind;
}

// ---------------------------------------------------------------------------
// Dialogue (DESIGN.md sections 2, 3, 7.5)
// ---------------------------------------------------------------------------

/** Named speakers plus a generic NPC and the narrator caption. DESIGN.md section 3. */
export type SpeakerId =
  | 'andrew'
  | 'myko'
  | 'dympna'
  | 'halloran'
  | 'colleenAnn'
  | 'pruitt'
  | 'gary'
  | 'administrator'
  | 'npc'
  | 'narrator';

/**
 * One line of dialogue. Instances live only in `src/content/dialogue/`.
 * DESIGN.md sections 2, 3 and 10.
 */
export interface DialogueLine {
  readonly id: DialogueId;
  readonly speaker: SpeakerId;
  /** Display name for generic NPCs (speaker 'npc'), e.g. a one-off character. */
  readonly speakerName?: string;
  /** Stage direction shown with the line, e.g. "quietly". */
  readonly direction?: string;
  readonly text: string;
}

/**
 * How a sequence is presented. Commentary never blocks play; only scripted
 * scenes do. DESIGN.md section 7.5.
 */
export type DialogueDelivery = 'box' | 'scene' | 'caption';

/** An ordered set of lines. DESIGN.md section 7.5. */
export interface DialogueSequence {
  readonly id: DialogueId;
  readonly delivery: DialogueDelivery;
  readonly lines: readonly DialogueLine[];
}

// ---------------------------------------------------------------------------
// Chapters and checkpoints (DESIGN.md sections 5, 7.2, 10)
// ---------------------------------------------------------------------------

/** Why a checkpoint exists. DESIGN.md section 7.2. */
export type CheckpointKind = 'chapterStart' | 'stealth' | 'boss' | 'other';

/** A checkpoint. DESIGN.md sections 7.2 and 7.6. */
export interface CheckpointDef {
  readonly id: CheckpointId;
  readonly kind: CheckpointKind;
  readonly screenId: ScreenId;
  readonly position: Vec2;
}

/** Walkability for pathfinding, row-major, one entry per tile. DESIGN.md section 8 (16 x 16 tiles). */
export interface CollisionGrid {
  readonly widthTiles: number;
  readonly heightTiles: number;
  /** true = blocked. Length is widthTiles * heightTiles. */
  readonly blocked: readonly boolean[];
}

/** One connected screen. DESIGN.md section 5 ("two or three connected screens", at most 120 x 80 tiles per chapter). */
export interface ScreenDef {
  readonly id: ScreenId;
  readonly region: RegionId;
  readonly widthTiles: number;
  readonly heightTiles: number;
  /** Location card caption, if this screen shows one. */
  readonly locationCardTextId?: TextId;
}

/** Myko's per-chapter call-in lines. DESIGN.md section 7.5. */
export interface MykoCallLines {
  readonly fight: DialogueId;
  readonly puzzle: DialogueId;
  /** Casebook entry written after a call. */
  readonly casebookBodyTextId: TextId;
  readonly casebookMarginTextId: TextId;
}

/**
 * A chapter: data plus small scripts. A chapter never reaches into a system's
 * internals; it uses `src/systems/index.ts`. DESIGN.md sections 5 and 10.
 */
export interface ChapterDef {
  readonly number: ChapterNumber;
  readonly titleTextId: TextId;
  readonly screens: readonly ScreenDef[];
  readonly startScreenId: ScreenId;
  readonly checkpoints: readonly CheckpointDef[];
  readonly encounters: readonly EncounterDef[];
  readonly stealthSections: readonly StealthSectionDef[];
  readonly puzzle?: PuzzleDef;
  readonly deductionBoard?: DeductionBoardDef;
  readonly clues: readonly ClueId[];
  readonly objectives: readonly ObjectiveDef[];
  /** Abilities unlocked during this chapter. */
  readonly newAbilities: readonly AbilityId[];
  readonly mykoCallLines: MykoCallLines;
  /** Encounter whose completion ends the chapter (boss or set piece). */
  readonly finaleEncounterId: EncounterId;
}

// ---------------------------------------------------------------------------
// Save state (DESIGN.md sections 7.1, 7.5, 7.6)
// ---------------------------------------------------------------------------

/** Bumped whenever `SaveState` changes shape. DESIGN.md section 7.6. */
export const SAVE_VERSION = 1 as const;

/** Player state captured at a checkpoint. DESIGN.md sections 7.1 and 7.6. */
export interface PlayerSnapshot {
  readonly health: number;
  readonly buzz: number;
  readonly empties: number;
  readonly drinkSlots: readonly DrinkSlot[];
  readonly selectedDrinkIndex: number;
  readonly selectedSpecial: SpecialAbilityId | null;
  readonly unlockedAbilities: readonly AbilityId[];
  readonly hangover: HangoverState;
}

/** Audio settings. DESIGN.md section 9 (separate sliders). */
export interface AudioSettings {
  /** 0..1 */
  readonly musicVolume: number;
  /** 0..1 */
  readonly effectsVolume: number;
}

/**
 * Everything persisted to local storage. Saved at each checkpoint and
 * immediately whenever a Myko call is used. DESIGN.md sections 7.5 and 7.6.
 */
export interface SaveState {
  readonly version: typeof SAVE_VERSION;
  readonly chapter: ChapterNumber;
  readonly checkpointId: CheckpointId;
  readonly player: PlayerSnapshot;
  /** Calls left for the whole game. Starts at the tuning value (3), never refills. */
  readonly mykoCallsLeft: number;
  readonly mykoCalls: readonly MykoCallRecord[];
  /** Chapters finished, for Chapter Select. */
  readonly finishedChapters: readonly ChapterNumber[];
  readonly completedEncounterIds: readonly EncounterId[];
  readonly cleanStealthRunIds: readonly EncounterId[];
  readonly collectedPickupIds: readonly PickupId[];
  readonly casebook: readonly CasebookEntry[];
  readonly proofIds: readonly ProofId[];
  /** Hints already given, per objective (0, 1 or 2). */
  readonly hintsGiven: Readonly<Record<ObjectiveId, number>>;
  readonly settings: AudioSettings;
}

// ---------------------------------------------------------------------------
// Tuning shape (filled in by src/content/tuning.ts)
// ---------------------------------------------------------------------------

/** Buzz thresholds and drain. DESIGN.md section 7.1. */
export interface BuzzTuning {
  readonly max: number;
  /** Lowest Buzz value of each state above sober. */
  readonly thresholds: { readonly grand: number; readonly locked: number; readonly banjaxed: number };
  readonly drainPerSecond: number;
  readonly effects: Readonly<Record<BuzzState, BuzzStateEffects>>;
  readonly banjaxedPeakMs: number;
  readonly banjaxedFallenMs: number;
  /** Buzz value after Andrew gets up. */
  readonly banjaxedResetTo: number;
}

/** Hangover tuning. DESIGN.md section 7.1. */
export interface HangoverTuning {
  /** Lowest Buzz state at chapter end that causes a hangover. */
  readonly triggerState: BuzzState;
  /** Multiplier on max health while hungover (0.75 for "reduced by 25%"). */
  readonly maxHealthMultiplier: number;
  /** Over-brightness strength of the screen effect. */
  readonly brightness: number;
}

/** Player movement and noise. DESIGN.md sections 7.2 and 7.3. */
export interface PlayerTuning {
  readonly maxHealth: number;
  readonly moveSpeed: number;
  readonly sneakSpeedMultiplier: number;
  readonly footstepNoiseRadius: number;
  readonly sneakNoiseRadius: number;
  readonly drinkSlotCount: number;
  readonly maxEmpties: number;
}

/** Stealth tuning. DESIGN.md section 7.3. */
export interface StealthTuning {
  /** Time to fill the detection marker ("about one second"). */
  readonly detectionFillMs: number;
  readonly detectionDrainPerSecond: number;
  readonly investigateGiveUpMs: number;
  /** Stillness required before Act Natural takes effect. */
  readonly actNaturalStillMs: number;
}

/** Heat tuning (chapter 8). DESIGN.md section 5. */
export interface HeatTuning {
  readonly max: number;
  readonly risePerSecond: number;
}

/** Myko tuning. DESIGN.md section 7.5. */
export interface MykoTuning {
  /** Calls for the whole game (3). */
  readonly callsPerGame: number;
  /** Hold time on M (1000). */
  readonly callHoldMs: number;
  /** How long a called-in fight takes ("about three seconds"). */
  readonly fightClearMs: number;
  /** Inactivity before an idle comment. */
  readonly idleCommentMs: number;
  /** Share of tangents about Ohio from chapter 7 on ("about two in three"). */
  readonly ohioTangentShare: number;
  readonly followDistance: number;
}

/** Investigation tuning. DESIGN.md section 7.4. */
export interface InvestigationTuning {
  /** Proof needed by the end of chapter 9 (5). */
  readonly requiredProofCount: number;
  readonly interactRadius: number;
}

/**
 * Root shape of `src/content/tuning.ts`. Every balance number in the game.
 * DESIGN.md section 10 ("No balance number is written anywhere except tuning.ts").
 */
export interface Tuning {
  readonly buzz: BuzzTuning;
  readonly hangover: HangoverTuning;
  readonly player: PlayerTuning;
  readonly stealth: StealthTuning;
  readonly heat: HeatTuning;
  readonly myko: MykoTuning;
  readonly investigation: InvestigationTuning;
  readonly drinks: Readonly<Record<DrinkId, DrinkDef>>;
  readonly food: Readonly<Record<FoodId, FoodDef>>;
  readonly abilities: Readonly<Record<AbilityId, AbilityDef>>;
  readonly enemies: Readonly<Record<EnemyId, EnemyDef>>;
}

// ---------------------------------------------------------------------------
// Events (DESIGN.md section 10)
// ---------------------------------------------------------------------------

/**
 * Payload for every game event, keyed by event name. Systems, UI, audio and
 * chapters communicate through these. DESIGN.md section 10.
 */
export interface GameEventPayloads {
  'buzz:changed': { readonly value: number; readonly delta: number };
  'buzz:stateChanged': { readonly from: BuzzState; readonly to: BuzzState };
  'buzz:banjaxedPhase': { readonly phase: BanjaxedPhase };
  'hangover:started': Record<string, never>;
  'hangover:cured': Record<string, never>;
  'heat:changed': { readonly value: number };
  'player:damaged': { readonly hit: HitInfo; readonly health: Health };
  'player:healed': { readonly amount: number; readonly health: Health };
  'player:died': { readonly checkpointId: CheckpointId };
  'player:respawned': { readonly checkpointId: CheckpointId };
  'enemy:damaged': { readonly hit: HitInfo; readonly health: Health };
  'enemy:defeated': { readonly instanceId: string; readonly enemyId: EnemyId; readonly by: CompletionSource };
  'enemy:telegraph': { readonly instanceId: string; readonly attackId: string; readonly durationMs: number };
  'drink:consumed': { readonly drinkId: DrinkId };
  'drink:selected': { readonly index: number; readonly drinkId: DrinkId | null };
  'food:consumed': { readonly foodId: FoodId };
  'pickup:collected': { readonly pickupId: PickupId; readonly item: PickupItem };
  'empties:changed': { readonly count: number };
  'ability:used': { readonly abilityId: AbilityId };
  'ability:unlocked': { readonly abilityId: AbilityId };
  'ability:selectedSpecial': { readonly abilityId: SpecialAbilityId };
  'stealth:noise': NoiseEvent;
  'stealth:alertChanged': { readonly instanceId: string; readonly from: AlertState; readonly to: AlertState };
  'stealth:alarm': { readonly sectionId: EncounterId };
  'stealth:cleanRun': { readonly sectionId: EncounterId };
  'clue:found': { readonly clueId: ClueId };
  'proof:collected': { readonly proofId: ProofId };
  'casebook:entryAdded': { readonly entry: CasebookEntry };
  'deduction:submitted': { readonly boardId: EncounterId; readonly clueIds: readonly ClueId[]; readonly correct: boolean };
  'encounter:started': { readonly encounterId: EncounterId; readonly kind: EncounterKind };
  'encounter:completed': { readonly encounterId: EncounterId; readonly kind: EncounterKind; readonly by: CompletionSource };
  'myko:hintRequested': { readonly objectiveId: ObjectiveId; readonly level: 1 | 2 };
  'myko:callStarted': { readonly encounterId: EncounterId; readonly kind: MykoCallKind; readonly callsLeft: number };
  'myko:callRefused': { readonly reason: 'noCallsLeft' | 'notCallable' | 'noEncounter' };
  'myko:comment': { readonly trigger: MykoCommentTrigger; readonly dialogueId: DialogueId };
  'dialogue:show': { readonly sequenceId: DialogueId };
  'dialogue:finished': { readonly sequenceId: DialogueId };
  'objective:changed': { readonly objectiveId: ObjectiveId };
  'checkpoint:reached': { readonly checkpointId: CheckpointId };
  'save:written': { readonly reason: 'checkpoint' | 'mykoCall' | 'chapterComplete' };
  'chapter:started': { readonly chapter: ChapterNumber };
  'chapter:completed': { readonly chapter: ChapterNumber; readonly endBuzzState: BuzzState };
  'game:paused': Record<string, never>;
  'game:resumed': Record<string, never>;
}

/** Every event name. Use these constants rather than string literals. DESIGN.md section 10. */
export const GameEvents = {
  BuzzChanged: 'buzz:changed',
  BuzzStateChanged: 'buzz:stateChanged',
  BuzzBanjaxedPhase: 'buzz:banjaxedPhase',
  HangoverStarted: 'hangover:started',
  HangoverCured: 'hangover:cured',
  HeatChanged: 'heat:changed',
  PlayerDamaged: 'player:damaged',
  PlayerHealed: 'player:healed',
  PlayerDied: 'player:died',
  PlayerRespawned: 'player:respawned',
  EnemyDamaged: 'enemy:damaged',
  EnemyDefeated: 'enemy:defeated',
  EnemyTelegraph: 'enemy:telegraph',
  DrinkConsumed: 'drink:consumed',
  DrinkSelected: 'drink:selected',
  FoodConsumed: 'food:consumed',
  PickupCollected: 'pickup:collected',
  EmptiesChanged: 'empties:changed',
  AbilityUsed: 'ability:used',
  AbilityUnlocked: 'ability:unlocked',
  AbilitySelectedSpecial: 'ability:selectedSpecial',
  StealthNoise: 'stealth:noise',
  StealthAlertChanged: 'stealth:alertChanged',
  StealthAlarm: 'stealth:alarm',
  StealthCleanRun: 'stealth:cleanRun',
  ClueFound: 'clue:found',
  ProofCollected: 'proof:collected',
  CasebookEntryAdded: 'casebook:entryAdded',
  DeductionSubmitted: 'deduction:submitted',
  EncounterStarted: 'encounter:started',
  EncounterCompleted: 'encounter:completed',
  MykoHintRequested: 'myko:hintRequested',
  MykoCallStarted: 'myko:callStarted',
  MykoCallRefused: 'myko:callRefused',
  MykoComment: 'myko:comment',
  DialogueShow: 'dialogue:show',
  DialogueFinished: 'dialogue:finished',
  ObjectiveChanged: 'objective:changed',
  CheckpointReached: 'checkpoint:reached',
  SaveWritten: 'save:written',
  ChapterStarted: 'chapter:started',
  ChapterCompleted: 'chapter:completed',
  GamePaused: 'game:paused',
  GameResumed: 'game:resumed',
} as const satisfies Readonly<Record<string, keyof GameEventPayloads>>;

/** Union of every event name. DESIGN.md section 10. */
export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];

/**
 * Payload keys with no `GameEvents` constant. Must be `never`; the compile-time
 * assertion below fails the type check otherwise. DESIGN.md section 10.
 */
export type UnnamedGameEvents = Exclude<keyof GameEventPayloads, GameEventName>;
type AssertNever<T extends never> = T;
/** Compile-time check that every payload has an event-name constant. DESIGN.md section 10. */
export type AllGameEventsNamed = AssertNever<UnnamedGameEvents>;

/** Typed event bus contract, implemented in `src/core/`. DESIGN.md section 10. */
export interface GameEventBus {
  emit<K extends GameEventName>(event: K, payload: GameEventPayloads[K]): void;
  on<K extends GameEventName>(event: K, handler: (payload: GameEventPayloads[K]) => void): () => void;
}
