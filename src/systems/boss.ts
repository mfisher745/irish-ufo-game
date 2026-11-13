/**
 * Boss and set-piece runner driven by `BossDef`: phases, triggers and end
 * conditions, with hooks for boss-specific behaviour in chapter scripts.
 * docs/chapters, "Boss" and "Set piece" sections. Plain TypeScript.
 *
 * A boss has one or more bodies (Big Tom has one; the mascots have three;
 * the combine has three cab lights as targets plus an invulnerable
 * harvester). Health is the sum over the target bodies.
 */

import { GameEvents } from '../core/types';
import type { AttackDef, BossDef, BossId, BossPhaseDef, CompletionSource, EnemyId, GameEventBus, Health, Reward, Vec2 } from '../core/types';
import type { ActorStats, EnemyActor } from './enemies';
import type { Rect } from './geometry';
import { CompletableSection } from './sections';
import type { SectionHost } from './sections';

/** One body of a boss, declared by the chapter. */
export interface BossBodyPlacement {
  /** Name a script can find it by ('bigtom', 'zip', 'light1'). */
  readonly tag: string;
  readonly position: Vec2;
  /** Share of `BossDef.maxHealth` (default: equal shares among targets). */
  readonly healthShare?: number;
  /** Not a target: takes no damage and does not count for health or targets (the ram, the harvester). */
  readonly invulnerable?: boolean;
  readonly stationary?: boolean;
  /** Attacks this body uses: 'phase' (default) takes the current phase's attacks; a list overrides; 'none' never attacks. */
  readonly attacks?: 'phase' | 'none' | readonly AttackDef[];
  /** Overrides the boss's and the phase's `moveSpeed` for this body. */
  readonly moveSpeed?: number;
  /** Texture for this body (the mascots: `boss.c7.boss.mascots.zip`); default `BossDef.spriteKey`. */
  readonly spriteKey?: string;
  readonly knockbackResistance?: number;
  readonly frontalShieldDeg?: number;
  readonly flies?: boolean;
}

/** What a boss needs from the world. */
export interface BossWorld {
  readonly bus: GameEventBus;
  spawnBossBody(bossId: BossId, stats: ActorStats, pos: Vec2): EnemyActor;
  spawnEnemy(enemyId: EnemyId, pos: Vec2): EnemyActor;
  defeat(actor: EnemyActor, by: CompletionSource): void;
  playerIn(area: Rect): boolean;
}

/** Chapter hooks for boss-specific behaviour. All optional. */
export interface BossHooks {
  onStart?(boss: BossRunner): void;
  onPhaseChanged?(boss: BossRunner, phase: BossPhaseDef): void;
  onTick?(boss: BossRunner, dtMs: number): void;
  /** A body's charge stopped against a blocked tile (Big Tom into the tractor). */
  onChargeBlocked?(boss: BossRunner, body: EnemyActor, col: number, row: number): void;
  /** A body's attack landed on Andrew. */
  onAttackLanded?(boss: BossRunner, body: EnemyActor, attack: AttackDef): void;
  /** After completion (normal or completeNow). */
  onEnd?(boss: BossRunner, by: CompletionSource): void;
}

export class BossRunner extends CompletableSection {
  private started = false;
  private phaseIdx = -1;
  private elapsed = 0;
  private readonly bodyList: EnemyActor[] = [];
  private readonly targets: EnemyActor[] = [];
  private readonly adds: EnemyActor[] = [];
  private readonly targetMax: number;
  /** Set during a Myko call-in. */
  suspended = false;

  constructor(
    readonly def: BossDef,
    private readonly bodies: readonly BossBodyPlacement[],
    private readonly world: BossWorld,
    host: SectionHost,
    private readonly exitArea: Rect | null,
    reward?: Reward,
    private readonly hooks: BossHooks = {},
  ) {
    super(def.id, def.kind, host, reward);
    this.targetMax = def.maxHealth ?? 0;
  }

  get bossId(): BossId {
    return this.def.id;
  }

  get active(): boolean {
    return this.started && !this.isComplete();
  }

  get phase(): BossPhaseDef | null {
    return this.def.phases[this.phaseIdx] ?? null;
  }

  get elapsedMs(): number {
    return this.elapsed;
  }

  /** Health bar, or null for set pieces without one. */
  health(): Health | null {
    if (this.def.maxHealth === undefined) return null;
    const current = this.targets.reduce((s, b) => s + Math.max(0, b.health), 0);
    return { current, max: this.targetMax };
  }

  body(tag: string): EnemyActor | undefined {
    return this.bodyList.find((b) => b.tag === tag);
  }

  allBodies(): readonly EnemyActor[] {
    return this.bodyList;
  }

  /** Everything this fight owns that can still fight (bodies and adds). */
  aliveActors(): EnemyActor[] {
    return [...this.bodyList, ...this.adds].filter((a) => !a.down);
  }

  targetsLeft(): number {
    return this.targets.filter((t) => !t.down).length;
  }

  /**
   * Big Tom into the tractor: stunned, takes extra damage until he recovers.
   * `ms` and the multiplier default to `BossDef.dazedMs` / `dazedDamageMultiplier`.
   * The actor puts the multiplier back to 1 when the stun ends.
   */
  daze(tag: string, ms: number = this.def.dazedMs ?? 0, damageTakenMultiplier: number = this.def.dazedDamageMultiplier ?? 1): void {
    const b = this.body(tag);
    if (!b || b.down || ms <= 0) return;
    b.stun(ms);
    b.damageTakenMultiplier = damageTakenMultiplier;
  }

  /** Swaps the texture the view draws for a body (Big Tom's `.jacketOff`). */
  setSprite(tag: string, textureKey: string): void {
    const b = this.body(tag);
    if (b) b.spriteKey = textureKey;
  }

  /** Summons a roster enemy owned by this boss (the foreman's dockers). */
  spawnAdd(enemyId: EnemyId, pos: Vec2): EnemyActor {
    const a = this.world.spawnEnemy(enemyId, pos);
    this.adds.push(a);
    return a;
  }

  addsAlive(): number {
    return this.adds.filter((a) => !a.down).length;
  }

  /** Ends a `scripted` boss (or any boss early) as a normal player completion. */
  complete(by: CompletionSource = 'player'): void {
    if (this.isComplete()) return;
    this.stopEveryone();
    this.finish(by);
    this.hooks.onEnd?.(this, by);
  }

  start(): void {
    if (this.started || this.isComplete()) return;
    this.started = true;
    const targetBodies = this.bodies.filter((b) => !b.invulnerable);
    const totalShare = targetBodies.reduce((s, b) => s + (b.healthShare ?? 1), 0) || 1;
    for (const p of this.bodies) {
      const maxHealth = p.invulnerable ? 1 : Math.max(1, Math.round((this.targetMax * (p.healthShare ?? 1)) / totalShare));
      const stats: ActorStats = {
        maxHealth,
        moveSpeed: this.speedFor(p, this.def.phases[0]),
        knockbackResistance: p.knockbackResistance ?? 1,
        flies: p.flies ?? false,
        attacks: [],
        ...(p.frontalShieldDeg === undefined ? {} : { frontalShieldDeg: p.frontalShieldDeg }),
        spriteKey: p.spriteKey ?? this.def.spriteKey,
      };
      const actor = this.world.spawnBossBody(this.def.id, stats, p.position);
      actor.tag = p.tag;
      actor.invulnerable = p.invulnerable === true;
      actor.onChargeBlocked = (a, c, r) => this.hooks.onChargeBlocked?.(this, a, c, r);
      actor.onAttackLanded = (a, atk) => this.hooks.onAttackLanded?.(this, a, atk);
      this.bodyList.push(actor);
      if (!p.invulnerable) this.targets.push(actor);
    }
    this.world.bus.emit(GameEvents.SectionStarted, { sectionId: this.def.id, kind: this.def.kind });
    this.enterPhase(0);
    this.hooks.onStart?.(this);
  }

  tick(dtMs: number): void {
    if (!this.active || this.suspended) return;
    this.elapsed += dtMs;
    // Later phases whose trigger has fired.
    for (let i = this.def.phases.length - 1; i > this.phaseIdx; i--) {
      const ph = this.def.phases[i];
      if (ph && this.triggered(ph)) {
        this.enterPhase(i);
        break;
      }
    }
    this.hooks.onTick?.(this, dtMs);
    if (this.endReached()) this.complete('player');
  }

  protected forceSolvedState(source: CompletionSource): void {
    this.started = true;
    for (const a of [...this.targets, ...this.adds]) if (!a.down) this.world.defeat(a, source);
    this.stopEveryone();
  }

  override completeNow(source: CompletionSource): void {
    if (this.isComplete()) return;
    super.completeNow(source);
    this.hooks.onEnd?.(this, source);
  }

  private stopEveryone(): void {
    for (const b of this.bodyList) b.frozen = true;
    for (const a of this.adds) if (!a.down) this.world.defeat(a, 'player');
  }

  private speedFor(p: BossBodyPlacement, ph: BossPhaseDef | undefined): number {
    return p.moveSpeed ?? ph?.moveSpeed ?? this.def.moveSpeed;
  }

  private triggered(ph: BossPhaseDef): boolean {
    const t = ph.trigger;
    switch (t.kind) {
      case 'start':
        return true;
      case 'healthBelow': {
        const h = this.health();
        return h !== null && h.max > 0 && h.current / h.max < t.fraction;
      }
      case 'targetsLeft':
        return this.targetsLeft() <= t.count;
      case 'elapsedMs':
        return this.elapsed >= t.ms;
    }
  }

  private endReached(): boolean {
    const e = this.def.end;
    switch (e.kind) {
      case 'healthBelow': {
        const h = this.health();
        if (h === null) return false;
        return e.fraction <= 0 ? h.current <= 0 : h.current / h.max <= e.fraction;
      }
      case 'targetsDestroyed':
        return this.targets.filter((t) => t.down).length >= e.count;
      case 'reachExit':
        return this.exitArea !== null && this.world.playerIn(this.exitArea);
      case 'scripted':
        return false;
    }
  }

  private enterPhase(i: number): void {
    const ph = this.def.phases[i];
    if (!ph) return;
    this.phaseIdx = i;
    this.bodies.forEach((p, idx) => {
      const actor = this.bodyList[idx];
      if (!actor) return;
      const attacks = p.attacks ?? 'phase';
      actor.attacks = attacks === 'phase' ? ph.attacks : attacks === 'none' ? [] : attacks;
      actor.attackSpeedMultiplier = ph.attackSpeedMultiplier;
      actor.moveSpeed = this.speedFor(p, ph);
      actor.stationary = p.stationary === true || actor.moveSpeed === 0;
    });
    this.world.bus.emit(GameEvents.BossPhaseChanged, { bossId: this.def.id, phaseId: ph.id });
    this.hooks.onPhaseChanged?.(this, ph);
  }
}
