/**
 * Myko: following, phone mode, hints, unprompted comments and the call-in.
 * DESIGN.md section 7.5. Plain TypeScript; the world implements `MykoHost`.
 *
 * Call-in, exactly as DESIGN.md 7.5:
 * - Hold M for `callHoldMs`. Releasing early costs nothing.
 * - Refused with no calls left, with no callable section, during stealth that
 *   has not become a fight, and always on the Administrator (whose ring never
 *   fills; Myko says so by phone, with the "hang on to them" line if calls
 *   are left).
 * - Otherwise the call is spent and the game saves at once. In a fight he
 *   strolls in from the entrance and everything is down within
 *   `fightClearMs`; a puzzle or deduction is solved in one move. Then
 *   `completeNow('myko')`, the chapter's call line set, and the casebook entry.
 */

import { TUNING } from '../content/tuning';
import { GameEvents, MYKO_CALL_KIND_BY_SECTION, NON_CALLABLE_BOSS } from '../core/types';
import type {
  ChapterNumber,
  Completable,
  CompletableSectionId,
  DialogueId,
  GameEventBus,
  InputFrame,
  MykoCallKind,
  MykoCallLineSet,
  MykoCommentTrigger,
  MykoMode,
  ObjectiveDef,
  Vec2,
} from '../core/types';
import type { Random } from '../core/random';
import { pickAvoiding } from '../core/random';
import type { EnemyActor } from './enemies';
import { distance, normalize, scale, sub, add } from './geometry';

/** The section Myko would be called into, as the world sees it. */
export interface CallTarget {
  readonly completable: Completable;
  /** Fights and bosses: who he has to put down. */
  aliveActors?(): EnemyActor[];
  /** Stops new waves / phases during the stroll. */
  setSuspended?(on: boolean): void;
  /** Where he strolls in from. */
  readonly entrance: Vec2 | null;
}

export type CallRefusal = 'noCallsLeft' | 'notCallable' | 'noSection';

/** Pure decision: may Myko be called right now? */
export function evaluateCall(input: {
  readonly callsLeft: number;
  readonly target: CallTarget | null;
  readonly stealthUncaught: boolean;
}): { ok: true } | { ok: false; reason: CallRefusal; administrator: boolean } {
  const t = input.target;
  if (t && t.completable.sectionId === NON_CALLABLE_BOSS) return { ok: false, reason: 'notCallable', administrator: true };
  if (!t || t.completable.isComplete()) {
    return { ok: false, reason: input.stealthUncaught ? 'notCallable' : 'noSection', administrator: false };
  }
  if (input.callsLeft <= 0) return { ok: false, reason: 'noCallsLeft', administrator: false };
  return { ok: true };
}

export interface MykoHost {
  readonly bus: GameEventBus;
  readonly rng: Random;
  play(id: DialogueId): void;
  /** Sequence IDs of a pool, or [] if the pool does not exist. */
  pool(poolId: string): readonly DialogueId[];
  chapter(): ChapterNumber;
  callTarget(): CallTarget | null;
  stealthUncaught(): boolean;
  callsLeft(): number;
  callLines(kind: MykoCallKind): MykoCallLineSet | null;
  /** Spend one call: decrement, record, casebook entry, save at once. */
  spendCall(sectionId: CompletableSectionId, kind: MykoCallKind): void;
  /** Save again after the section is complete. */
  saveAfterCall(): void;
  defeat(actor: EnemyActor, by: 'myko'): void;
  setPlayerProtected(on: boolean): void;
  objective(): ObjectiveDef | null;
  hintsGiven(objectiveId: string): number;
  setHintsGiven(objectiveId: string, n: number): void;
  playerPos(): Vec2;
  /** Pools for tangents in this chapter (chapter module), if any. */
  tangentPools(): { readonly ohio?: string; readonly other?: string };
}

interface CallInProgress {
  readonly target: CallTarget;
  readonly sectionId: CompletableSectionId;
  readonly kind: MykoCallKind;
  readonly victims: EnemyActor[];
  elapsed: number;
  downed: number;
}

export class Myko {
  pos: Vec2 = { x: 0, y: 0 };
  mode: MykoMode = 'following';
  /** Where he stands in phone mode or a script. */
  standPoint: Vec2 | null = null;
  private holdFired = false;
  private holdProgress = 0;
  private call: CallInProgress | null = null;
  private commentCooldown = 0;
  private idleMs = 0;
  private lastLine: DialogueId | undefined;

  constructor(private readonly host: MykoHost) {}

  get callInProgress(): boolean {
    return this.call !== null;
  }

  /** 0..1 progress of the M hold; 0 when not held or on the Administrator. */
  callHoldProgress(): number {
    return this.holdProgress;
  }

  placeNear(p: Vec2): void {
    this.pos = { x: p.x - TUNING.myko.followDistance, y: p.y };
  }

  update(dtMs: number, input: InputFrame, opts: { readonly combatOrStealth: boolean; readonly inputActive: boolean }): void {
    this.commentCooldown = Math.max(0, this.commentCooldown - dtMs);
    this.tickHold(input);
    if (input.pressed.has('hint')) this.hint();

    if (this.call) {
      this.tickCall(dtMs);
      return;
    }
    if (this.mode !== 'scripted') this.mode = opts.combatOrStealth ? 'onPhone' : 'following';
    this.moveStep(dtMs);

    // Idle comment.
    if (opts.inputActive) this.idleMs = 0;
    else {
      this.idleMs += dtMs;
      if (this.idleMs >= TUNING.myko.idleCommentMs) {
        this.idleMs = 0;
        this.idleOrTangent();
      }
    }
  }

  /** Unprompted comment from a pool. `force` ignores the cooldown (deaths, hangover at start). */
  comment(trigger: MykoCommentTrigger, poolId: string, force = false): boolean {
    if (!force && this.commentCooldown > 0) return false;
    const line = pickAvoiding(this.host.rng, this.host.pool(poolId), this.lastLine);
    if (!line) return false;
    this.lastLine = line;
    this.commentCooldown = TUNING.myko.commentCooldownMs;
    this.host.play(line);
    this.host.bus.emit(GameEvents.MykoComment, { trigger, dialogueId: line });
    return true;
  }

  /** A comment that only happens sometimes (drinks). */
  maybeComment(trigger: MykoCommentTrigger, poolId: string, chance: number): boolean {
    if (this.host.rng.next() >= chance) return false;
    return this.comment(trigger, poolId);
  }

  /** H: nudge first, then the answer (repeated after that). */
  hint(): void {
    const obj = this.host.objective();
    if (!obj) return;
    const given = this.host.hintsGiven(obj.id);
    const level: 1 | 2 = given >= 1 ? 2 : 1;
    this.host.setHintsGiven(obj.id, Math.min(2, given + 1));
    this.host.bus.emit(GameEvents.MykoHintRequested, { objectiveId: obj.id, level });
    this.host.play(level === 1 ? obj.hint.nudgeDialogueId : obj.hint.answerDialogueId);
  }

  /** Tries the call-in now (used by the hold and by tests). Returns true if Myko came. */
  tryCall(): boolean {
    if (this.call) return false;
    const target = this.host.callTarget();
    const verdict = evaluateCall({ callsLeft: this.host.callsLeft(), target, stealthUncaught: this.host.stealthUncaught() });
    if (!verdict.ok) {
      this.refuse(verdict.reason, verdict.administrator);
      return false;
    }
    if (!target) return false;
    const sectionId = target.completable.sectionId;
    const kind = MYKO_CALL_KIND_BY_SECTION[target.completable.kind];
    this.host.spendCall(sectionId, kind);
    this.host.bus.emit(GameEvents.MykoCallStarted, { sectionId, kind, callsLeft: this.host.callsLeft() });
    if (kind === 'fight' && target.aliveActors) {
      const victims = target.aliveActors();
      target.setSuspended?.(true);
      for (const v of victims) v.frozen = true;
      this.host.setPlayerProtected(true);
      this.mode = 'calledIn';
      if (target.entrance) this.pos = target.entrance;
      this.call = { target, sectionId, kind, victims, elapsed: 0, downed: 0 };
      return true;
    }
    this.finishCall(target, sectionId, kind);
    return true;
  }

  private refuse(reason: CallRefusal, administrator: boolean): void {
    this.host.bus.emit(GameEvents.MykoCallRefused, { reason });
    if (administrator) {
      this.host.play(this.host.callsLeft() > 0 ? 'myko.callRefused.administrator.callsLeft' : 'myko.callRefused.administrator');
      return;
    }
    const poolId = reason === 'noCallsLeft' ? 'myko.callRefused.noCallsLeft' : 'myko.callRefused.notCallable';
    const line = pickAvoiding(this.host.rng, this.host.pool(poolId), this.lastLine);
    if (line) {
      this.lastLine = line;
      this.host.play(line);
    }
  }

  private tickHold(input: InputFrame): void {
    if (!input.held.has('callMyko')) {
      this.holdProgress = 0;
      this.holdFired = false;
      return;
    }
    const target = this.host.callTarget();
    if (target && target.completable.sectionId === NON_CALLABLE_BOSS) {
      this.holdProgress = 0;
      if (input.pressed.has('callMyko')) this.tryCall();
      return;
    }
    if (this.holdFired) return;
    this.holdProgress = Math.min(1, (input.holdMs.callMyko ?? 0) / TUNING.myko.callHoldMs);
    if (this.holdProgress >= 1) {
      this.holdFired = true;
      this.holdProgress = 0;
      this.tryCall();
    }
  }

  private tickCall(dtMs: number): void {
    const c = this.call;
    if (!c) return;
    c.elapsed += dtMs;
    const total = TUNING.myko.fightClearMs;
    const n = c.victims.length;
    // Stroll toward the next one standing.
    const next = c.victims.find((v) => !v.down);
    if (next) {
      const step = (TUNING.myko.strollSpeed * dtMs) / 1000;
      const d = distance(this.pos, next.pos);
      if (d > 1) this.pos = add(this.pos, scale(normalize(sub(next.pos, this.pos)), Math.min(step, d)));
    }
    // Everyone down by `total`, evenly spaced, without breaking stride.
    const due = n === 0 ? 0 : Math.min(n, Math.floor((c.elapsed / total) * (n + 1)));
    while (c.downed < due) {
      const v = c.victims[c.downed];
      c.downed++;
      if (v && !v.down) this.host.defeat(v, 'myko');
    }
    if (c.elapsed >= total) {
      this.call = null;
      c.target.setSuspended?.(false);
      this.finishCall(c.target, c.sectionId, c.kind);
      this.host.setPlayerProtected(false);
      this.mode = 'following';
    }
  }

  private finishCall(target: CallTarget, sectionId: CompletableSectionId, kind: MykoCallKind): void {
    target.completable.completeNow('myko');
    const lines = this.host.callLines(kind);
    if (lines) this.host.play(lines.sequenceId);
    this.host.bus.emit(GameEvents.MykoCallFinished, { sectionId, kind });
    this.host.saveAfterCall();
  }

  private idleOrTangent(): void {
    const pools = this.host.tangentPools();
    const chapter = this.host.chapter();
    if (pools.ohio || pools.other) {
      const wantsTangent = this.host.rng.next() < TUNING.myko.tangentChance;
      if (wantsTangent) {
        const ohio = chapter >= 7 ? this.host.rng.next() < TUNING.myko.ohioTangentShare : chapter === 6;
        const poolId = (ohio ? pools.ohio : pools.other) ?? pools.ohio ?? pools.other;
        if (poolId && this.comment('tangent', poolId)) return;
      }
    }
    this.comment('idle', 'myko.idle');
  }

  private moveStep(dtMs: number): void {
    const goal = this.mode === 'following' ? this.followPoint() : (this.standPoint ?? this.followPoint());
    const d = distance(this.pos, goal);
    const slack = this.mode === 'following' ? TUNING.myko.followDistance / 2 : 1;
    if (d <= slack) return;
    const step = Math.min(d - slack, (TUNING.myko.walkSpeed * dtMs) / 1000);
    this.pos = add(this.pos, scale(normalize(sub(goal, this.pos)), step));
  }

  private followPoint(): Vec2 {
    const p = this.host.playerPos();
    const away = normalize(sub(this.pos, p));
    const dir = away.x === 0 && away.y === 0 ? { x: -1, y: 0 } : away;
    return add(p, scale(dir, TUNING.myko.followDistance));
  }
}
