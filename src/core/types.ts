/**
 * Shared contracts for every system, chapter, UI and test.
 *
 * Implements DESIGN.md section 10, "Rules that keep parallel work compatible",
 * and the section, ID and roster conventions in `docs/chapters/README.md`.
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

/** ID prefix for a chapter, e.g. `c3`. docs/chapters/README.md. */
export type ChapterPrefix = `c${ChapterNumber}`;

/**
 * Key into `src/content/dialogue/`. Every player-visible string is looked up by
 * one of these. DESIGN.md section 10.
 */
export type TextId = string;

/** Identifier of a dialogue line or sequence. DESIGN.md section 10. */
export type DialogueId = string;

/** Screen ID, e.g. `c1.pub`. docs/chapters/README.md and each chapter's Screens table. */
export type ScreenId = `${ChapterPrefix}.${string}`;

/** Identifier of a checkpoint. DESIGN.md section 7.2. */
export type CheckpointId = `${ChapterPrefix}.${string}`;

/** Identifier of an objective that Myko can hint about. DESIGN.md section 7.5. */
export type ObjectiveId = string;

/** Identifier of a pickup placed in a level. DESIGN.md section 7.1. */
export type PickupId = string;

/**
 * Region, used for both palette and music. This is the single definition;
 * `src/art/palette.ts` imports it. DESIGN.md sections 8 and 9.
 */
export type RegionId = 'kilnamoe' | 'cities' | 'ohio' | 'roswell' | 'nevada' | 'base';

/** Regions in chapter order. DESIGN.md section 8. */
export const REGIONS = ['kilnamoe', 'cities', 'ohio', 'roswell', 'nevada', 'base'] as const satisfies readonly RegionId[];

// ---------------------------------------------------------------------------
// Sections (docs/chapters/README.md, DESIGN.md sections 5, 7.3, 7.4, 7.5)
// ---------------------------------------------------------------------------

/** Section kinds from docs/chapters/README.md. */
export type SectionKind = 'fight' | 'boss' | 'setpiece' | 'puzzle' | 'deduction' | 'stealth' | 'explore';

/** Section kinds that implement `completeNow()`. docs/chapters/README.md. */
export type CompletableKind = 'fight' | 'boss' | 'setpiece' | 'puzzle' | 'deduction';

/** Completable kinds in README order. docs/chapters/README.md. */
export const COMPLETABLE_KINDS = ['fight', 'boss', 'setpiece', 'puzzle', 'deduction'] as const satisfies readonly CompletableKind[];

/** Section ID of a given kind, e.g. `c1.fight.chipper`. docs/chapters/README.md. */
export type SectionIdOf<K extends SectionKind> = `${ChapterPrefix}.${K}.${string}`;

export type FightSectionId = SectionIdOf<'fight'>;
export type PuzzleSectionId = SectionIdOf<'puzzle'>;
export type DeductionSectionId = SectionIdOf<'deduction'>;
export type StealthSectionId = SectionIdOf<'stealth'>;
export type ExploreSectionId = SectionIdOf<'explore'>;

/**
 * The fight a stealth section becomes when Andrew is caught: the stealth ID
 * plus `.alarm`, kind `fight`. docs/chapters/README.md.
 */
export type AlarmFightId = `${StealthSectionId}.alarm`;

/**
 * Every boss and set piece. Each has its own definition rather than an
 * `EnemyId`. docs/chapters/01 to 10, "Boss" sections.
 */
export type BossId =
  | 'c1.boss.bigtom'
  | 'c2.setpiece.ram'
  | 'c3.boss.halloran'
  | 'c4.boss.foreman'
  | 'c5.boss.pruitt1'
  | 'c6.setpiece.combine'
  | 'c7.boss.mascots'
  | 'c8.boss.pruitt2'
  | 'c9.setpiece.lockdown'
  | 'c10.boss.administrator';

/** The one section Myko cannot finish. DESIGN.md section 7.5, docs/chapters/10-disclosure.md. */
export const NON_CALLABLE_BOSS = 'c10.boss.administrator' as const satisfies BossId;

/** Any section ID. docs/chapters/README.md. */
export type SectionId =
  | FightSectionId
  | AlarmFightId
  | BossId
  | PuzzleSectionId
  | DeductionSectionId
  | StealthSectionId
  | ExploreSectionId;

/** IDs of sections that implement `completeNow()`. docs/chapters/README.md. */
export type CompletableSectionId = FightSectionId | AlarmFightId | BossId | PuzzleSectionId | DeductionSectionId;

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
  /** Aim sway amplitude in degrees. Also used at full heat ("sways as if Locked"). */
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

/** Hangover carried into a chapter. DESIGN.md section 7.1, docs/chapters/README.md "Carry-over rules". */
export interface HangoverState {
  readonly active: boolean;
}

/** A timed buff or debuff on the player. DESIGN.md section 7.1 (bourbon, tequila, tea). */
export type TimedEffectKind = 'speedBoost' | 'extraSway' | 'steadyAim';

/** An active timed effect. DESIGN.md section 7.1. */
export interface ActiveTimedEffect {
  readonly kind: TimedEffectKind;
  readonly msLeft: number;
  /** Strength; a multiplier for speedBoost and extraSway, unused for steadyAim. */
  readonly magnitude: number;
}

// ---------------------------------------------------------------------------
// Heat (docs/chapters/08-the-long-road.md)
// ---------------------------------------------------------------------------

/**
 * Heat meter (chapter 8, daylight only). Rises in sun, faster when running,
 * falls in shade, reset by water. At full heat Andrew loses health slowly and
 * sways as if Locked. Thermal masts see him above a threshold.
 * docs/chapters/08-the-long-road.md "Heat".
 */
export interface HeatSnapshot {
  /** False after sunset, when the meter goes away. */
  readonly active: boolean;
  /** 0..max, max set in tuning. */
  readonly value: number;
}

// ---------------------------------------------------------------------------
// Drinks and food (DESIGN.md section 7.1)
// ---------------------------------------------------------------------------

/**
 * Everything carried in a drink slot and used with Q. Water is a drink here
 * (Buzz 0, resets heat). DESIGN.md section 7.1.
 */
export type DrinkId =
  | 'stout'
  | 'whiskey'
  | 'poitin'
  | 'lightBeer'
  | 'bourbon'
  | 'craftIpa'
  | 'tequila'
  | 'water';

/** Food, consumed on pickup or interaction and never carried. DESIGN.md section 7.1. */
export type FoodId = 'crisps' | 'chickenFilletRoll' | 'breakfastRoll' | 'spiceBag' | 'tea';

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

/**
 * A food. Defined in `src/content/tuning.ts`. A food pickup that would do
 * nothing (full health, no hangover) stays where it is. DESIGN.md section 7.1.
 */
export interface FoodDef {
  readonly id: FoodId;
  readonly nameTextId: TextId;
  readonly pickupTextId: TextId;
  readonly effects: readonly ConsumableEffect[];
}

/** One filled drink slot: one drink type with a count. DESIGN.md sections 6 and 7.1. */
export interface DrinkSlot {
  readonly drinkId: DrinkId;
  /** 1..tuning.player.drinkSlotCap. */
  readonly count: number;
}

/**
 * Andrew's three fixed drink slots, selected with 1/2/3 or the wheel. A new
 * drink type with no free slot stays on the ground. DESIGN.md sections 6 and 7.1.
 */
export type DrinkSlots = readonly [DrinkSlot | null, DrinkSlot | null, DrinkSlot | null];

/** Index into `DrinkSlots`. DESIGN.md section 6. */
export type DrinkSlotIndex = 0 | 1 | 2;

/** Something Andrew can pick up or be given. DESIGN.md section 7.1. */
export type PickupItem =
  | { readonly kind: 'drink'; readonly drinkId: DrinkId; readonly count: number }
  | { readonly kind: 'food'; readonly foodId: FoodId }
  | { readonly kind: 'empties'; readonly count: number };

/** Why a pickup stayed on the ground. DESIGN.md section 7.1. */
export type PickupRefusal = 'noFreeSlot' | 'slotFull' | 'emptiesFull' | 'noEffect';

/** A pickup placed in a level. DESIGN.md section 7.1. */
export interface PickupDef {
  readonly id: PickupId;
  readonly item: PickupItem;
  readonly screenId: ScreenId;
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
  | { readonly kind: 'charge'; readonly distance: number; readonly width: number }
  | {
      readonly kind: 'projectile';
      readonly speed: number;
      readonly range: number;
      /** Number of enemies it passes through; 0 stops at the first. */
      readonly pierce: number;
      /** Thrown in an arc over obstacles rather than straight. */
      readonly lobbed: boolean;
      /** Can be knocked back by a timed hurley swing. */
      readonly deflectable: boolean;
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
  /** Per-hit tuning for a melee combo (punch: three hits, the third a haymaker). */
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

/** Enemy roster IDs. docs/chapters/README.md "Enemy roster". */
export type EnemyId =
  | 'lad'
  | 'cousin'
  | 'suit'
  | 'worker'
  | 'brawler'
  | 'docker'
  | 'agent'
  | 'drone'
  | 'mascot'
  | 'clerk'
  | 'security';

/** Who dealt a hit. DESIGN.md sections 7.2 and 7.5. */
export type DamageSource =
  | { readonly kind: 'player'; readonly abilityId: AbilityId }
  | { readonly kind: 'enemy'; readonly enemyId: EnemyId; readonly attackId: string }
  | { readonly kind: 'boss'; readonly bossId: BossId; readonly attackId: string }
  | { readonly kind: 'myko' }
  /** Environmental damage, including full heat. */
  | { readonly kind: 'hazard'; readonly hazardId: string };

/** A resolved hit. DESIGN.md section 7.2. */
export interface HitInfo {
  readonly source: DamageSource;
  /** Runtime instance id of the target. */
  readonly targetInstanceId: string;
  readonly amount: number;
  readonly knockback: Vec2;
  readonly stunMs: number;
  /** Hold the target in place (the brawler's grab), 0 for none. */
  readonly holdMs: number;
}

/** Status conditions an enemy can be in. DESIGN.md sections 7.2 and 7.3. */
export type EnemyStatus = 'normal' | 'telegraphing' | 'attacking' | 'recovering' | 'stunned' | 'knockedBack' | 'down';

/** Enemy groups from the story. DESIGN.md section 4. */
export type EnemyFaction = 'local' | 'federal' | 'alien' | 'machine' | 'animal';

/** One attack. Every attack is telegraphed. DESIGN.md section 7.2. */
export interface AttackDef {
  readonly id: string;
  readonly shape: AttackShape;
  readonly damage: number;
  readonly knockback: number;
  /** Visible warning before the hit lands. Must be > 0. */
  readonly telegraphMs: number;
  readonly cooldownMs: number;
  /** Recovery after the attack, during which the attacker is open. */
  readonly recoveryMs: number;
  /** Shots fired per use (the clerk's three-shot burst), default 1. */
  readonly burst?: number;
  /** Holds Andrew in place unless he Stumbles (the brawler's grab). */
  readonly holdMs?: number;
}

/** A roster enemy. Defined in `src/content/tuning.ts`. docs/chapters/README.md, DESIGN.md section 7.2. */
export interface EnemyDef {
  readonly id: EnemyId;
  readonly faction: EnemyFaction;
  readonly nameTextId: TextId;
  /** Key of a sprite generator in `src/art/`. */
  readonly spriteKey: string;
  readonly maxHealth: number;
  readonly moveSpeed: number;
  readonly knockbackResistance: number;
  readonly flies: boolean;
  readonly attacks: readonly AttackDef[];
  /** Present for enemies that can act as stealth guards. */
  readonly senses?: GuardSensesDef;
  /** Frontal shield arc in degrees (security); 0 or absent for none. */
  readonly frontalShieldDeg?: number;
  /** Looks like a tourist until it first attacks (mascot). */
  readonly disguisedUntilAttack?: boolean;
}

/** What starts a boss phase. docs/chapters, "Boss" sections. */
export type BossPhaseTrigger =
  | { readonly kind: 'start' }
  | { readonly kind: 'healthBelow'; readonly fraction: number }
  | { readonly kind: 'targetsLeft'; readonly count: number }
  | { readonly kind: 'elapsedMs'; readonly ms: number };

/** How a boss or set piece ends. docs/chapters, "Boss" sections. */
export type BossEndCondition =
  | { readonly kind: 'healthBelow'; readonly fraction: number }
  | { readonly kind: 'targetsDestroyed'; readonly count: number }
  | { readonly kind: 'reachExit' }
  | { readonly kind: 'scripted' };

/** One boss phase. docs/chapters, "Boss" sections. */
export interface BossPhaseDef {
  readonly id: string;
  readonly trigger: BossPhaseTrigger;
  readonly attacks: readonly AttackDef[];
  readonly attackSpeedMultiplier: number;
}

/** A boss or set piece. Defined in `src/content/tuning.ts` under its section ID. docs/chapters, "Boss" sections. */
export interface BossDef {
  readonly id: BossId;
  readonly kind: 'boss' | 'setpiece';
  readonly nameTextId: TextId;
  readonly spriteKey: string;
  /** Absent for set pieces with no health bar. */
  readonly maxHealth?: number;
  readonly phases: readonly BossPhaseDef[];
  readonly end: BossEndCondition;
  /** Arena size in tiles. */
  readonly arenaTiles: { readonly width: number; readonly height: number };
}

/** One wave of a fight. docs/chapters, "Beats". */
export interface WaveDef {
  readonly enemies: readonly { readonly enemyId: EnemyId; readonly count: number }[];
}

/** A fight's waves. Defined in `src/content/tuning.ts` under its section ID. docs/chapters/README.md. */
export interface FightDef {
  readonly id: FightSectionId | AlarmFightId;
  readonly waves: readonly WaveDef[];
}

// ---------------------------------------------------------------------------
// Stealth (DESIGN.md section 7.3, docs/chapters/08-the-long-road.md)
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
 * - alarm: marker filled; the section is now its `.alarm` fight.
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

/** A patrol route. DESIGN.md section 7.3. */
export interface PatrolRoute {
  readonly mode: PatrolMode;
  readonly waypoints: readonly PatrolWaypoint[];
}

/** Sources of noise guards react to. DESIGN.md section 7.3, docs/chapters/06 (corn rustle). */
export type NoiseKind = 'footstep' | 'sneakFootstep' | 'rustle' | 'bottle' | 'combat' | 'other';

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

/** Places Andrew can Act Natural. DESIGN.md section 7.2, docs/chapters/05, 06, 09. */
export type HidingPropKind = 'queue' | 'noticeboard' | 'vendingMachine' | 'waterCooler' | 'tallCorn';

/** A prop or area that enables Act Natural. DESIGN.md section 7.2. */
export interface HidingPropDef {
  readonly id: string;
  readonly kind: HidingPropKind;
  readonly position: Vec2;
  readonly radius: number;
}

/** A vision cone. DESIGN.md section 7.3. */
export interface ConeDef {
  readonly range: number;
  readonly angleDeg: number;
}

/**
 * Non-guard stealth hazards. docs/chapters/04 (floodlights) and
 * docs/chapters/08-the-long-road.md (ground sensors, thermal masts, patrol trucks).
 * Only trucks move.
 */
export type StealthHazardDef =
  | {
      /** Detects running within its radius. Sneaking or walking is safe. */
      readonly kind: 'groundSensor';
      readonly id: string;
      readonly position: Vec2;
      readonly radius: number;
    }
  | {
      /** Detects Andrew within range while his heat is above `tuning.heat.thermalDetectFraction`. */
      readonly kind: 'thermalMast';
      readonly id: string;
      readonly position: Vec2;
      readonly range: number;
    }
  | {
      /** Drives a route with a headlight cone. Blocked by sight-blocking tiles. */
      readonly kind: 'patrolTruck';
      readonly id: string;
      readonly route: PatrolRoute;
      readonly speed: number;
      readonly headlights: ConeDef;
    }
  | {
      /** Fixed position, cone sweeps back and forth. */
      readonly kind: 'floodlight';
      readonly id: string;
      readonly position: Vec2;
      readonly cone: ConeDef;
      readonly sweepFromDeg: number;
      readonly sweepToDeg: number;
      readonly sweepPeriodMs: number;
    };

/** A guard placed in a stealth section. DESIGN.md section 7.3. */
export interface GuardPlacement {
  readonly enemyId: EnemyId;
  readonly route: PatrolRoute;
  /** Seated guards (chapter 9 clerks) have short cones and look up on noise. */
  readonly seated?: boolean;
}

/**
 * Bonus for finishing a stealth section without the alarm: a drink, food or
 * colour clue. Never a key clue and never proof. DESIGN.md section 7.3.
 */
export type CleanRunReward =
  | { readonly kind: 'pickup'; readonly item: PickupItem }
  | { readonly kind: 'clue'; readonly clueId: ClueId };

/**
 * A stealth section. A checkpoint sits before each one. Being caught converts
 * it to the fight `<id>.alarm`. DESIGN.md sections 7.2 and 7.3.
 */
export interface StealthSectionDef {
  readonly id: StealthSectionId;
  readonly checkpointId: CheckpointId;
  readonly guards: readonly GuardPlacement[];
  readonly hazards: readonly StealthHazardDef[];
  readonly hidingProps: readonly HidingPropDef[];
  readonly cleanRunReward?: CleanRunReward;
}

// ---------------------------------------------------------------------------
// Investigation, casebook, deduction, puzzles (DESIGN.md section 7.4)
// ---------------------------------------------------------------------------

/** Clue ID, e.g. `c2.clue.fragment`. docs/chapters/README.md. */
export type ClueId = `${ChapterPrefix}.clue.${string}`;

/** The five proofs shown in the broadcast. docs/chapters/09-level-minus-four.md "The five proofs". */
export type ProofId = 'c9.proof.craft' | 'c9.proof.contract' | 'c9.proof.directory' | 'c9.proof.log' | 'c9.proof.footage';

/** All five proofs. docs/chapters/09-level-minus-four.md. */
export const PROOFS = [
  'c9.proof.craft',
  'c9.proof.contract',
  'c9.proof.directory',
  'c9.proof.log',
  'c9.proof.footage',
] as const satisfies readonly ProofId[];

/** Anything that goes in the casebook as evidence and can be linked on a deduction board. docs/chapters/09 (proofs used on a board). */
export type EvidenceId = ClueId | ProofId;

/**
 * How a piece of evidence matters. Key clues are needed for a deduction board;
 * colour clues are not; proofs are the broadcast items. docs/chapters/README.md.
 */
export type EvidenceKind = 'key' | 'colour' | 'proof';

/**
 * A clue or proof. Text is in Andrew's words, with Myko's margin note.
 * DESIGN.md section 7.4.
 */
export interface Clue {
  readonly id: EvidenceId;
  readonly kind: EvidenceKind;
  readonly chapter: ChapterNumber;
  /** Short name shown on the deduction board. */
  readonly titleTextId: TextId;
  /** Andrew's casebook entry. */
  readonly bodyTextId: TextId;
  /** Myko's note in the margin. */
  readonly marginTextId: TextId;
}

/** Something examinable or usable with E. DESIGN.md section 7.4. */
export interface ExaminableDef {
  readonly id: string;
  readonly screenId: ScreenId;
  readonly position: Vec2;
  /** Evidence added on examine, if any. */
  readonly evidenceId?: EvidenceId;
  /** Item given on interaction (the kiosk tea, the diner coffee). */
  readonly item?: PickupItem;
  /** Line shown on examine. */
  readonly dialogueId?: DialogueId;
}

/** A casebook entry. DESIGN.md sections 7.4 and 7.5. */
export type CasebookEntry =
  | { readonly kind: 'evidence'; readonly evidenceId: EvidenceId; readonly chapter: ChapterNumber }
  | {
      /** Written when a deduction board is solved. */
      readonly kind: 'lead';
      readonly deductionId: DeductionSectionId;
      readonly chapter: ChapterNumber;
    }
  | {
      /** Andrew's brief, inaccurate record of a Myko call, with Myko's correction. One per call. */
      readonly kind: 'mykoCall';
      readonly sectionId: CompletableSectionId;
      readonly callKind: MykoCallKind;
      readonly chapter: ChapterNumber;
    };

/**
 * A deduction board: link three clues to name a fixed lead. A wrong answer
 * costs nothing except a remark from Myko. DESIGN.md section 7.4.
 */
export interface DeductionBoardDef {
  readonly id: DeductionSectionId;
  readonly chapter: ChapterNumber;
  /** Evidence offered on the board (the player's casebook, filtered). */
  readonly candidateIds: readonly EvidenceId[];
  /** The three items that must be linked. Order does not matter. */
  readonly solution: readonly [EvidenceId, EvidenceId, EvidenceId];
  /** The lead named when solved, and its casebook entry. */
  readonly leadTextId: TextId;
  readonly leadMarginTextId: TextId;
  /** Myko's remarks on wrong answers, cycled. */
  readonly wrongAnswerDialogueIds: readonly DialogueId[];
}

/** Physical puzzle kinds. docs/chapters/01 to 10, "puzzle" beats. */
export type PuzzleKind =
  | 'push'
  | 'sheepGates'
  | 'containers'
  | 'redacted'
  | 'maze'
  | 'spotTheAlien'
  | 'junctions'
  | 'gravity'
  | 'broadcast';

/** A chapter's one physical puzzle. Puzzle-specific layout lives in the chapter. DESIGN.md section 7.4. */
export interface PuzzleDef {
  readonly id: PuzzleSectionId;
  readonly chapter: ChapterNumber;
  readonly kind: PuzzleKind;
}

// ---------------------------------------------------------------------------
// Sections and completeNow (DESIGN.md sections 7.5 and 10)
// ---------------------------------------------------------------------------

/** Which set of Myko call lines applies. DESIGN.md section 7.5. */
export type MykoCallKind = 'fight' | 'puzzle';

/** Call line set used for each completable kind. docs/chapters/README.md, DESIGN.md section 7.5. */
export const MYKO_CALL_KIND_BY_SECTION = {
  fight: 'fight',
  boss: 'fight',
  setpiece: 'fight',
  puzzle: 'puzzle',
  deduction: 'puzzle',
} as const satisfies Readonly<Record<CompletableKind, MykoCallKind>>;

/** Who finished a section. DESIGN.md sections 7.5 and 10. */
export type CompletionSource = 'player' | 'myko' | 'debug';

/** What finishing a section grants. DESIGN.md sections 7.3 and 7.5. */
export interface Reward {
  readonly pickups?: readonly PickupItem[];
  readonly evidenceIds?: readonly EvidenceId[];
  readonly abilityIds?: readonly AbilityId[];
}

/** Static definition of a section. docs/chapters/README.md. */
export interface SectionDef {
  readonly id: SectionId;
  readonly kind: SectionKind;
  /** False for stealth, explore and `c10.boss.administrator`. */
  readonly mykoCallable: boolean;
  /** Checkpoint before this section (every stealth, boss and setpiece has one). */
  readonly checkpointId?: CheckpointId;
  readonly reward?: Reward;
}

/**
 * The single entry point every fight, boss, setpiece, puzzle and deduction
 * exposes. The Myko call-in and the QA playthrough both use it. It is
 * synchronous: the Myko system plays the call-in, then calls it. It must leave
 * the game in the same state as the player finishing normally, including
 * rewards, then emit `section:completed`. On a finished section it does
 * nothing. DESIGN.md sections 7.5 and 10.
 */
export interface Completable {
  readonly sectionId: CompletableSectionId;
  readonly kind: CompletableKind;
  isComplete(): boolean;
  completeNow(source: CompletionSource): void;
}

/**
 * The scripted way to complete a whole chapter, for QA. DESIGN.md section 10.
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

/** Things Myko comments on unprompted. DESIGN.md section 7.5, docs/chapters/08 (drinking in heat). */
export type MykoCommentTrigger = 'clue' | 'drink' | 'death' | 'hangover' | 'idle' | 'heat' | 'tangent';

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
  readonly sectionId: CompletableSectionId;
  readonly kind: MykoCallKind;
}

/** One set of call lines: Myko's sequence plus the casebook entry. DESIGN.md section 7.5. */
export interface MykoCallLineSet {
  readonly sequenceId: DialogueId;
  readonly casebookBodyTextId: TextId;
  readonly casebookMarginTextId: TextId;
}

/** Myko's per-chapter call lines, one set per kind. DESIGN.md section 7.5. */
export type MykoCallLines = Readonly<Record<MykoCallKind, MykoCallLineSet>>;

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
  /** Display name for generic NPCs (speaker 'npc'). */
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

/** Why a checkpoint exists. DESIGN.md section 7.2, docs/chapters/README.md. */
export type CheckpointKind = 'chapterStart' | 'stealth' | 'boss' | 'setpiece' | 'other';

/** A checkpoint. DESIGN.md sections 7.2 and 7.6. */
export interface CheckpointDef {
  readonly id: CheckpointId;
  readonly kind: CheckpointKind;
  readonly screenId: ScreenId;
  readonly position: Vec2;
}

/** Per-tile flags, row-major, one entry per tile. DESIGN.md section 8 (16 x 16 tiles). */
export interface TileGrid {
  readonly widthTiles: number;
  readonly heightTiles: number;
  /** true = impassable. Length is widthTiles * heightTiles. */
  readonly blocked: readonly boolean[];
  /** true = blocks vision cones and headlights (turf stacks, containers, outcrops). */
  readonly blocksSight: readonly boolean[];
  /** true = shade, where heat falls (chapter 8). Absent where heat does not apply. */
  readonly shade?: readonly boolean[];
}

/** One connected screen. docs/chapters, "Screens" tables. */
export interface ScreenDef {
  readonly id: ScreenId;
  readonly region: RegionId;
  readonly widthTiles: number;
  readonly heightTiles: number;
  /** Location card caption, if this screen shows one. */
  readonly locationCardTextId?: TextId;
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
  /** Every section in beat order. */
  readonly sections: readonly SectionDef[];
  readonly stealthSections: readonly StealthSectionDef[];
  /** Every chapter has exactly one physical puzzle. */
  readonly puzzle: PuzzleDef;
  readonly deductionBoard?: DeductionBoardDef;
  readonly evidence: readonly EvidenceId[];
  readonly objectives: readonly ObjectiveDef[];
  /** Abilities unlocked during this chapter. */
  readonly newAbilities: readonly AbilityId[];
  readonly mykoCallLines: MykoCallLines;
  /** Section whose completion leads into the closing scene. */
  readonly finaleSectionId: BossId;
}

// ---------------------------------------------------------------------------
// Save state (DESIGN.md sections 7.1, 7.5, 7.6)
// ---------------------------------------------------------------------------

/** Bumped whenever `SaveState` changes shape. DESIGN.md section 7.6. */
export const SAVE_VERSION = 1 as const;

/**
 * Player state captured at each save. Death restores exactly this.
 * DESIGN.md sections 7.1 and 7.6.
 */
export interface PlayerSnapshot {
  readonly health: number;
  readonly buzz: number;
  readonly empties: number;
  readonly drinkSlots: DrinkSlots;
  readonly selectedDrink: DrinkSlotIndex;
  readonly selectedSpecial: SpecialAbilityId | null;
  readonly unlockedAbilities: readonly AbilityId[];
  readonly hangover: HangoverState;
}

/** Where Andrew reappears after death. DESIGN.md sections 7.2 and 7.6. */
export interface RespawnPoint {
  readonly screenId: ScreenId;
  readonly position: Vec2;
}

/**
 * Everything persisted for a game in local storage. Written at each
 * checkpoint and immediately whenever a Myko call is used (that save acts as
 * a checkpoint). Death reloads it. DESIGN.md sections 7.5 and 7.6.
 */
export interface SaveState {
  readonly version: typeof SAVE_VERSION;
  readonly chapter: ChapterNumber;
  /** Last checkpoint reached. */
  readonly checkpointId: CheckpointId;
  readonly respawn: RespawnPoint;
  readonly player: PlayerSnapshot;
  /** Calls left for the whole game. Starts at `tuning.myko.callsPerGame`, never refills. */
  readonly mykoCallsLeft: number;
  readonly mykoCalls: readonly MykoCallRecord[];
  /** Chapters finished, for Chapter Select. */
  readonly finishedChapters: readonly ChapterNumber[];
  readonly completedSectionIds: readonly SectionId[];
  readonly cleanStealthRunIds: readonly StealthSectionId[];
  readonly collectedPickupIds: readonly PickupId[];
  readonly casebook: readonly CasebookEntry[];
  /** Hints already given, per objective (0, 1 or 2). */
  readonly hintsGiven: Readonly<Record<ObjectiveId, number>>;
  /**
   * Chapter script flags (talked to Dympna, lesson shown and so on), so a
   * script can rebuild its state after death or Continue. Keys are prefixed
   * with the chapter, e.g. `c1.dympnaTalked`.
   */
  readonly flags: Readonly<Record<string, ChapterFlagValue>>;
}

/** Value of a chapter script flag stored in the save. */
export type ChapterFlagValue = boolean | number | string;

/**
 * Audio settings, stored under their own key, separate from `SaveState`.
 * New Game keeps them. DESIGN.md section 9.
 */
export interface AudioSettings {
  /** 0..1 */
  readonly musicVolume: number;
  /** 0..1 */
  readonly effectsVolume: number;
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

/** Hangover tuning. DESIGN.md section 7.1, docs/chapters/README.md "Carry-over rules". */
export interface HangoverTuning {
  /** Lowest Buzz state at chapter end that causes a hangover. */
  readonly triggerState: BuzzState;
  /** Earliest chapter whose end can cause a hangover (3). */
  readonly carryOverFromChapterEnd: ChapterNumber;
  /** Chapters that always start with a hangover regardless of Buzz ([4]). */
  readonly forcedAtChapterStart: readonly ChapterNumber[];
  /** Multiplier on max health while hungover (0.75 for "reduced by 25%"). */
  readonly maxHealthMultiplier: number;
  /** Over-brightness strength of the screen effect. */
  readonly brightness: number;
}

/** Player movement, noise and carrying. DESIGN.md sections 7.1, 7.2 and 7.3. */
export interface PlayerTuning {
  readonly maxHealth: number;
  /** WASD moves at this speed; Shift sneaks. There is no separate walk. */
  readonly runSpeed: number;
  readonly sneakSpeedMultiplier: number;
  readonly footstepNoiseRadius: number;
  readonly sneakNoiseRadius: number;
  /** Max count of one drink type in one slot. */
  readonly drinkSlotCap: number;
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
  /** Vision range multiplier for seated guards. */
  readonly seatedVisionMultiplier: number;
}

/** Heat tuning. docs/chapters/08-the-long-road.md "Heat". */
export interface HeatTuning {
  readonly max: number;
  readonly risePerSecondInSun: number;
  readonly runningRiseMultiplier: number;
  readonly fallPerSecondInShade: number;
  readonly fullHeatDamagePerSecond: number;
  /** Fraction of max above which thermal masts see Andrew (0.5). */
  readonly thermalDetectFraction: number;
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
  readonly interactRadius: number;
}

/** Chapter Select start state. docs/chapters/README.md "Carry-over rules". */
export interface ChapterSelectTuning {
  /** Drinks given at a Chapter Select start (three stout). */
  readonly startingDrinks: DrinkSlots;
}

/**
 * Root shape of `src/content/tuning.ts`. Every balance number in the game.
 * Section-specific numbers are keyed by section ID. DESIGN.md section 10,
 * docs/chapters/README.md.
 */
export interface Tuning {
  readonly buzz: BuzzTuning;
  readonly hangover: HangoverTuning;
  readonly player: PlayerTuning;
  readonly stealth: StealthTuning;
  readonly heat: HeatTuning;
  readonly myko: MykoTuning;
  readonly investigation: InvestigationTuning;
  readonly chapterSelect: ChapterSelectTuning;
  readonly drinks: Readonly<Record<DrinkId, DrinkDef>>;
  readonly food: Readonly<Record<FoodId, FoodDef>>;
  readonly abilities: Readonly<Record<AbilityId, AbilityDef>>;
  readonly enemies: Readonly<Record<EnemyId, EnemyDef>>;
  readonly bosses: Readonly<Record<BossId, BossDef>>;
  readonly fights: Readonly<Partial<Record<FightSectionId | AlarmFightId, FightDef>>>;
}

// ---------------------------------------------------------------------------
// Events (DESIGN.md section 10)
// ---------------------------------------------------------------------------

/** Why a save was written. DESIGN.md section 7.6. */
export type SaveReason = 'checkpoint' | 'mykoCall' | 'chapterComplete';

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
  'heat:changed': HeatSnapshot;
  'player:damaged': { readonly hit: HitInfo; readonly health: Health };
  'player:healed': { readonly amount: number; readonly health: Health };
  'player:died': { readonly checkpointId: CheckpointId };
  'player:respawned': { readonly respawn: RespawnPoint };
  'enemy:damaged': { readonly hit: HitInfo; readonly health: Health };
  'enemy:defeated': { readonly instanceId: string; readonly enemyId: EnemyId; readonly by: CompletionSource };
  'enemy:telegraph': { readonly instanceId: string; readonly attackId: string; readonly durationMs: number };
  'enemy:revealed': { readonly instanceId: string; readonly enemyId: EnemyId };
  'boss:phaseChanged': { readonly bossId: BossId; readonly phaseId: string };
  'drink:consumed': { readonly drinkId: DrinkId };
  'drink:selected': { readonly index: DrinkSlotIndex; readonly drinkId: DrinkId | null };
  'food:consumed': { readonly foodId: FoodId };
  'pickup:collected': { readonly pickupId: PickupId; readonly item: PickupItem };
  'pickup:refused': { readonly pickupId: PickupId; readonly reason: PickupRefusal };
  'empties:changed': { readonly count: number };
  'ability:used': { readonly abilityId: AbilityId };
  'ability:unlocked': { readonly abilityId: AbilityId };
  'ability:selectedSpecial': { readonly abilityId: SpecialAbilityId };
  'stealth:noise': NoiseEvent;
  'stealth:alertChanged': { readonly instanceId: string; readonly from: AlertState; readonly to: AlertState };
  'stealth:alarm': { readonly sectionId: StealthSectionId; readonly fightId: AlarmFightId };
  'stealth:cleanRun': { readonly sectionId: StealthSectionId };
  'evidence:found': { readonly evidenceId: EvidenceId };
  'casebook:entryAdded': { readonly entry: CasebookEntry };
  'deduction:submitted': {
    readonly deductionId: DeductionSectionId;
    readonly evidenceIds: readonly EvidenceId[];
    readonly correct: boolean;
  };
  'section:started': { readonly sectionId: SectionId; readonly kind: SectionKind };
  'section:completed': { readonly sectionId: SectionId; readonly kind: SectionKind; readonly by: CompletionSource };
  'myko:hintRequested': { readonly objectiveId: ObjectiveId; readonly level: 1 | 2 };
  'myko:callStarted': { readonly sectionId: CompletableSectionId; readonly kind: MykoCallKind; readonly callsLeft: number };
  'myko:callRefused': { readonly reason: 'noCallsLeft' | 'notCallable' | 'noSection' };
  'myko:comment': { readonly trigger: MykoCommentTrigger; readonly dialogueId: DialogueId };
  'dialogue:show': { readonly sequenceId: DialogueId };
  'dialogue:finished': { readonly sequenceId: DialogueId };
  'objective:changed': { readonly objectiveId: ObjectiveId };
  'checkpoint:reached': { readonly checkpointId: CheckpointId };
  'save:written': { readonly reason: SaveReason };
  'chapter:started': { readonly chapter: ChapterNumber };
  'chapter:completed': { readonly chapter: ChapterNumber; readonly endBuzzState: BuzzState };
  'game:paused': Record<string, never>;
  'game:resumed': Record<string, never>;
  /** Andrew arrived on a screen; audio switches the regional theme. */
  'screen:entered': { readonly screenId: ScreenId; readonly region: RegionId };
  /** The Borrowed Glove fired; gravity-switch puzzles listen for this. */
  'ability:glovePulse': { readonly screenId: ScreenId; readonly position: Vec2; readonly radius: number };
  /** Myko finished a call-in and the section is complete. */
  'myko:callFinished': { readonly sectionId: CompletableSectionId; readonly kind: MykoCallKind };
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
  EnemyRevealed: 'enemy:revealed',
  BossPhaseChanged: 'boss:phaseChanged',
  DrinkConsumed: 'drink:consumed',
  DrinkSelected: 'drink:selected',
  FoodConsumed: 'food:consumed',
  PickupCollected: 'pickup:collected',
  PickupRefused: 'pickup:refused',
  EmptiesChanged: 'empties:changed',
  AbilityUsed: 'ability:used',
  AbilityUnlocked: 'ability:unlocked',
  AbilitySelectedSpecial: 'ability:selectedSpecial',
  StealthNoise: 'stealth:noise',
  StealthAlertChanged: 'stealth:alertChanged',
  StealthAlarm: 'stealth:alarm',
  StealthCleanRun: 'stealth:cleanRun',
  EvidenceFound: 'evidence:found',
  CasebookEntryAdded: 'casebook:entryAdded',
  DeductionSubmitted: 'deduction:submitted',
  SectionStarted: 'section:started',
  SectionCompleted: 'section:completed',
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
  ScreenEntered: 'screen:entered',
  AbilityGlovePulse: 'ability:glovePulse',
  MykoCallFinished: 'myko:callFinished',
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
