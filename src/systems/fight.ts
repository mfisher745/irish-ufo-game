/**
 * Fights from `FightDef` waves. DESIGN.md 7.2, docs/chapters/README.md.
 * Plain TypeScript; the world spawns and owns the actors.
 */

import { TUNING } from '../content/tuning';
import { GameEvents } from '../core/types';
import type { AlarmFightId, CompletionSource, EnemyId, FightDef, FightSectionId, GameEventBus, Reward, Vec2 } from '../core/types';
import type { EnemyActor } from './enemies';
import { CompletableSection } from './sections';
import type { SectionHost } from './sections';

/** What a fight needs from the world. */
export interface FightWorld {
  readonly bus: GameEventBus;
  spawnEnemy(enemyId: EnemyId, pos: Vec2): EnemyActor;
  /** Puts an actor down and emits `enemy:defeated` once. */
  defeat(actor: EnemyActor, by: CompletionSource): void;
}

export interface FightHooks {
  /** After wave `index` (0-based) is cleared and before the next spawns. */
  onWaveCleared?(index: number): void;
  onWaveSpawned?(index: number, actors: readonly EnemyActor[]): void;
}

export class FightRunner extends CompletableSection {
  private started = false;
  private wave = -1;
  private betweenMs = 0;
  private readonly actorsList: EnemyActor[] = [];
  private spawnCursor = 0;
  /** Set during a Myko call-in so no new waves arrive. */
  suspended = false;

  constructor(
    readonly def: FightDef,
    private readonly spawnPoints: readonly Vec2[],
    private readonly world: FightWorld,
    host: SectionHost,
    reward?: Reward,
    private readonly hooks: FightHooks = {},
  ) {
    super(def.id as FightSectionId | AlarmFightId, 'fight', host, reward);
  }

  get active(): boolean {
    return this.started && !this.isComplete();
  }

  get waveIndex(): number {
    return this.wave;
  }

  actors(): readonly EnemyActor[] {
    return this.actorsList;
  }

  aliveActors(): EnemyActor[] {
    return this.actorsList.filter((a) => !a.down);
  }

  start(): void {
    if (this.started || this.isComplete()) return;
    this.started = true;
    this.world.bus.emit(GameEvents.SectionStarted, { sectionId: this.sectionId, kind: 'fight' });
    this.spawnWave(0);
  }

  /** Adds existing actors (stealth guards joining their alarm fight). */
  adopt(actors: readonly EnemyActor[]): void {
    this.actorsList.push(...actors);
  }

  tick(dtMs: number): void {
    if (!this.active || this.suspended) return;
    if (this.aliveActors().length > 0) return;
    if (this.betweenMs > 0) {
      this.betweenMs -= dtMs;
      if (this.betweenMs <= 0) this.spawnWave(this.wave + 1);
      return;
    }
    if (this.wave + 1 < this.def.waves.length) {
      this.hooks.onWaveCleared?.(this.wave);
      this.betweenMs = TUNING.combat.betweenWavesMs;
      return;
    }
    this.hooks.onWaveCleared?.(this.wave);
    this.finish('player');
  }

  protected forceSolvedState(source: CompletionSource): void {
    this.started = true;
    for (const a of this.aliveActors()) this.world.defeat(a, source);
    this.wave = this.def.waves.length - 1;
  }

  private spawnWave(index: number): void {
    const wave = this.def.waves[index];
    this.wave = index;
    if (!wave) return;
    const spawned: EnemyActor[] = [];
    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i++) {
        const p = this.spawnPoints.length > 0 ? this.spawnPoints[this.spawnCursor++ % this.spawnPoints.length] : undefined;
        const actor = this.world.spawnEnemy(group.enemyId, p ?? { x: 0, y: 0 });
        spawned.push(actor);
      }
    }
    this.actorsList.push(...spawned);
    this.hooks.onWaveSpawned?.(index, spawned);
  }
}
