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
 * - Otherwise the call is spent and the game saves at once (the casebook
 *   entry is written then). Gameplay pauses and `myko:blackout` is emitted
 *   with the caption `myko.call.<kind>.blackout.<n>` (n = 1..3, which call of the save); the UI covers the screen
 *   and calls `blackoutFinished(sequenceId)` (via `uiState.dialogueFinished`)
 *   when its cards are done, or after `blackoutTimeoutMs` the game carries on
 *   by itself. Then `completeNow('myko')` (enemies down, puzzle solved), Myko
 *   standing beside Andrew, the chapter's post-call scene, and a save.
 *
 * Smoke (DESIGN.md 3): standing still for about `smokeIntervalMs` (seeded
 * jitter), he has a smoke; `smoking` stays true until he next moves.
 */

import { TUNING } from '../content/tuning';
import { GameEvents, MYKO_CALL_KIND_BY_SECTION, NON_CALLABLE_BOSS } from '../core/types';
import type {
  ChapterNumber,
  Completable,
  CompletableSectionId,
  DialogueId,
  Facing,
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
import { pickAvoiding, seededRandom } from '../core/random';

/** Seed of the smoke-interval jitter stream (any constant; not a balance number). */
const SMOKE_SEED = 0x6d796b6f;
import type { EnemyActor } from './enemies';
import { distance, facingFromAngle, normalize, scale, sub, add, angleOf } from './geometry';

/** The section Myko would be called into, as the world sees it. */
export interface CallTarget {
  readonly completable: Completable;
  /** Fights and bosses: who he has to put down. */
  aliveActors?(): EnemyActor[];
  /** Stops new waves / phases during the blackout. */
  setSuspended?(on: boolean): void;
  /** Where he waits on the phone during the section. */
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
  /** Plays a line; `repeat` for pool lines, hints and refusals (DESIGN.md 7.5 "Nothing is said twice"). */
  play(id: DialogueId, repeat?: boolean): void;
  /** Sequence IDs of a pool, or [] if the pool does not exist. */
  pool(poolId: string): readonly DialogueId[];
  chapter(): ChapterNumber;
  callTarget(): CallTarget | null;
  stealthUncaught(): boolean;
  callsLeft(): number;
  callLines(kind: MykoCallKind): MykoCallLineSet | null;
  /** Calls already spent in this chapter in this save (read before `spendCall`). */
  callsThisChapter(): number;
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
  readonly sequenceId: DialogueId;
  /** Calls already spent this chapter before this one: 1 plays `myko.call.again`, 2 plays `myko.call.allThree`. */
  readonly earlier: number;
  elapsed: number;
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
  /** Facing for the view. */
  facing: Facing = 'down';
  /** Moved on the last update. */
  moving = false;
  /** Having a smoke: from `smokeIntervalMs` of standing still until he next moves. */
  smoking = false;
  private stillMs = 0;
  private nextSmokeMs: number;
  /** Own seeded stream, so the smoke jitter does not shift the shared RNG (combat, pools). */
  private readonly smokeRng: Random = seededRandom(SMOKE_SEED);

  constructor(private readonly host: MykoHost) {
    this.nextSmokeMs = this.smokeInterval();
  }

  /** The blackout is showing: gameplay is paused. */
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
    this.tickSmoke(dtMs);

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
    this.host.play(line, true);
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
    this.host.play(level === 1 ? obj.hint.nudgeDialogueId : obj.hint.answerDialogueId, true);
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
    const earlier = this.host.callsThisChapter();
    // Which call of the save this is (whole game); `callsLeft` is saved, so it survives reload.
    const nth = Math.min(3, Math.max(1, TUNING.myko.callsPerGame - this.host.callsLeft() + 1));
    this.host.spendCall(sectionId, kind);
    this.host.bus.emit(GameEvents.MykoCallStarted, { sectionId, kind, callsLeft: this.host.callsLeft() });
    target.setSuspended?.(true);
    for (const v of target.aliveActors?.() ?? []) v.frozen = true;
    this.host.setPlayerProtected(true);
    this.mode = 'calledIn';
    this.smoking = false;
    const sequenceId = `myko.call.${kind}.blackout.${nth}` as DialogueId;
    this.call = { target, sectionId, kind, sequenceId, earlier, elapsed: 0 };
    this.host.bus.emit(GameEvents.MykoBlackout, { sectionId, kind, sequenceId });
    return true;
  }

  /** The UI has finished the blackout cards. Ignored unless `sequenceId` is the current blackout. */
  blackoutFinished(sequenceId: DialogueId): boolean {
    if (!this.call || this.call.sequenceId !== sequenceId) return false;
    this.endBlackout();
    return true;
  }

  private refuse(reason: CallRefusal, administrator: boolean): void {
    this.host.bus.emit(GameEvents.MykoCallRefused, { reason });
    if (administrator) {
      this.host.play(this.host.callsLeft() > 0 ? 'myko.callRefused.administrator.callsLeft' : 'myko.callRefused.administrator', true);
      return;
    }
    const poolId = reason === 'noCallsLeft' ? 'myko.callRefused.noCallsLeft' : 'myko.callRefused.notCallable';
    const line = pickAvoiding(this.host.rng, this.host.pool(poolId), this.lastLine);
    if (line) {
      this.lastLine = line;
      this.host.play(line, true);
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

  /** Counts down the blackout; carries on by itself after `blackoutTimeoutMs` so the game never hangs. */
  tickCall(dtMs: number): void {
    const c = this.call;
    if (!c) return;
    c.elapsed += dtMs;
    if (c.elapsed >= TUNING.myko.blackoutTimeoutMs) this.endBlackout();
  }

  private endBlackout(): void {
    const c = this.call;
    if (!c) return;
    this.call = null;
    c.target.setSuspended?.(false);
    this.finishCall(c.target, c.sectionId, c.kind, c.earlier);
    this.host.setPlayerProtected(false);
    this.placeNear(this.host.playerPos());
    this.mode = 'following';
    this.stillMs = 0;
  }

  private finishCall(target: CallTarget, sectionId: CompletableSectionId, kind: MykoCallKind, earlier: number): void {
    // The post-call scene first, straight after the blackout; the section's own end lines queue behind it.
    // Second call in the chapter: `myko.call.again`; third: `myko.call.allThree`. Each can occur once per save,
    // so they play without `repeat` and the "nothing is said twice" record guards them.
    if (earlier >= 1) this.host.play(earlier >= 2 ? 'myko.call.allThree' : 'myko.call.again');
    else {
      const lines = this.host.callLines(kind);
      if (lines) this.host.play(lines.sequenceId);
    }
    target.completable.completeNow('myko');
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
    this.moving = false;
    if (d <= slack) return;
    const step = Math.min(d - slack, (TUNING.myko.walkSpeed * dtMs) / 1000);
    const dir = normalize(sub(goal, this.pos));
    this.pos = add(this.pos, scale(dir, step));
    this.moving = step > 0;
    if (this.moving) this.facing = facingFromAngle(angleOf(dir));
  }

  private tickSmoke(dtMs: number): void {
    if (this.moving) {
      this.stillMs = 0;
      if (this.smoking) {
        this.smoking = false;
        this.nextSmokeMs = this.smokeInterval();
      }
      return;
    }
    this.stillMs += dtMs;
    if (!this.smoking && this.stillMs >= this.nextSmokeMs) this.smoking = true;
  }

  /** `smokeIntervalMs` plus or minus up to `smokeJitterMs`, from the seeded RNG. */
  private smokeInterval(): number {
    const t = TUNING.myko;
    return Math.max(0, t.smokeIntervalMs + (this.smokeRng.next() * 2 - 1) * t.smokeJitterMs);
  }

  private followPoint(): Vec2 {
    const p = this.host.playerPos();
    const away = normalize(sub(this.pos, p));
    const dir = away.x === 0 && away.y === 0 ? { x: -1, y: 0 } : away;
    return add(p, scale(dir, TUNING.myko.followDistance));
  }
}
