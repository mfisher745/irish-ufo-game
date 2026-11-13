/**
 * Casebook, deduction boards and puzzle bases. DESIGN.md section 7.4 and
 * 7.5. Plain TypeScript.
 */

import { GameEvents } from '../core/types';
import type {
  CasebookEntry,
  ChapterNumber,
  CompletableSectionId,
  CompletionSource,
  DeductionBoardDef,
  DialogueId,
  EvidenceId,
  GameEventBus,
  MykoCallKind,
  PuzzleDef,
  Reward,
} from '../core/types';
import { CompletableSection } from './sections';
import type { SectionHost } from './sections';

// ---------------------------------------------------------------------------
// Casebook
// ---------------------------------------------------------------------------

export class Casebook {
  private list: CasebookEntry[];

  constructor(
    private readonly bus: GameEventBus,
    entries: readonly CasebookEntry[] = [],
  ) {
    this.list = [...entries];
  }

  entries(): readonly CasebookEntry[] {
    return this.list;
  }

  restore(entries: readonly CasebookEntry[]): void {
    this.list = [...entries];
  }

  hasEvidence(id: EvidenceId): boolean {
    return this.list.some((e) => e.kind === 'evidence' && e.evidenceId === id);
  }

  evidenceIds(): EvidenceId[] {
    return this.list.flatMap((e) => (e.kind === 'evidence' ? [e.evidenceId] : []));
  }

  /** Adds evidence once. Returns false if it was already there. */
  addEvidence(evidenceId: EvidenceId, chapter: ChapterNumber): boolean {
    if (this.hasEvidence(evidenceId)) return false;
    const entry: CasebookEntry = { kind: 'evidence', evidenceId, chapter };
    this.list.push(entry);
    this.bus.emit(GameEvents.EvidenceFound, { evidenceId });
    this.bus.emit(GameEvents.CasebookEntryAdded, { entry });
    return true;
  }

  addLead(deductionId: DeductionBoardDef['id'], chapter: ChapterNumber): void {
    if (this.list.some((e) => e.kind === 'lead' && e.deductionId === deductionId)) return;
    const entry: CasebookEntry = { kind: 'lead', deductionId, chapter };
    this.list.push(entry);
    this.bus.emit(GameEvents.CasebookEntryAdded, { entry });
  }

  addMykoCall(sectionId: CompletableSectionId, callKind: MykoCallKind, chapter: ChapterNumber): void {
    const entry: CasebookEntry = { kind: 'mykoCall', sectionId, callKind, chapter };
    this.list.push(entry);
    this.bus.emit(GameEvents.CasebookEntryAdded, { entry });
  }
}

// ---------------------------------------------------------------------------
// Deduction board
// ---------------------------------------------------------------------------

/** Order-free check of three linked items against the board's solution. */
export function deductionCorrect(def: DeductionBoardDef, evidence: readonly EvidenceId[]): boolean {
  const picked = new Set(evidence);
  return picked.size === 3 && evidence.length === 3 && def.solution.every((id) => picked.has(id));
}

export interface DeductionHooks {
  /** Plays a dialogue sequence (Myko's wrong-answer remark). */
  say(id: DialogueId): void;
  /** Called when the board opens and closes, for the UI. */
  onOpenChanged?(open: boolean): void;
}

/**
 * A deduction board: link three clues to name a fixed lead. A wrong answer
 * costs nothing except a remark from Myko (cycled). DESIGN.md 7.4.
 */
export class DeductionBoard extends CompletableSection {
  private wrong = 0;
  private open = false;

  constructor(
    readonly def: DeductionBoardDef,
    private readonly casebook: Casebook,
    host: SectionHost,
    private readonly hooks: DeductionHooks,
    reward?: Reward,
  ) {
    super(def.id, 'deduction', host, reward);
  }

  get isOpen(): boolean {
    return this.open && !this.isComplete();
  }

  get wrongAnswers(): number {
    return this.wrong;
  }

  /** Evidence the player holds that the board offers. */
  candidates(): EvidenceId[] {
    return this.def.candidateIds.filter((id) => this.casebook.hasEvidence(id));
  }

  openBoard(): void {
    if (this.isComplete() || this.open) return;
    this.open = true;
    this.hooks.onOpenChanged?.(true);
  }

  closeBoard(): void {
    if (!this.open) return;
    this.open = false;
    this.hooks.onOpenChanged?.(false);
  }

  submit(evidence: readonly EvidenceId[], bus: GameEventBus): boolean {
    if (this.isComplete()) return true;
    const correct = deductionCorrect(this.def, evidence);
    bus.emit(GameEvents.DeductionSubmitted, { deductionId: this.def.id, evidenceIds: [...evidence], correct });
    if (correct) {
      this.casebook.addLead(this.def.id, this.def.chapter);
      this.closeBoard();
      this.finish('player');
      return true;
    }
    const lines = this.def.wrongAnswerDialogueIds;
    const line = lines.length > 0 ? lines[this.wrong % lines.length] : undefined;
    this.wrong++;
    if (line) this.hooks.say(line);
    return false;
  }

  protected forceSolvedState(): void {
    for (const id of this.def.solution) this.casebook.addEvidence(id, this.def.chapter);
    this.casebook.addLead(this.def.id, this.def.chapter);
    this.closeBoard();
  }
}

// ---------------------------------------------------------------------------
// Puzzles
// ---------------------------------------------------------------------------

/**
 * Base for a chapter's physical puzzle. A subclass (in systems or in a
 * chapter) keeps its own state, calls `this.solved()` when the player
 * solves it, and implements `applySolution()` to jump to the solved state
 * ("Myko glances at it and solves it in one move"). `reset()` is optional.
 */
export abstract class PuzzleBase extends CompletableSection {
  private startedFlag = false;

  constructor(
    readonly def: PuzzleDef,
    host: SectionHost,
    private readonly bus: GameEventBus,
    reward?: Reward,
  ) {
    super(def.id, 'puzzle', host, reward);
  }

  get started(): boolean {
    return this.startedFlag;
  }

  start(): void {
    if (this.startedFlag || this.isComplete()) return;
    this.startedFlag = true;
    this.bus.emit(GameEvents.SectionStarted, { sectionId: this.def.id, kind: 'puzzle' });
  }

  /** Put the puzzle back as it started. Override if the puzzle has a reset. */
  reset(): void {
    // Default: nothing to reset.
  }

  protected solved(): void {
    this.finish('player');
  }

  protected abstract applySolution(source: CompletionSource): void;

  protected forceSolvedState(source: CompletionSource): void {
    this.startedFlag = true;
    this.applySolution(source);
  }
}
