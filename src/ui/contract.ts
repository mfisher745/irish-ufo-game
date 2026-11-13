/**
 * What the UI needs from the game. Systems-dev implements this at merge; the
 * dev harness in `src/ui/dev/` implements it with fake data.
 */

import type {
  AbilityId,
  AudioSettings,
  BossId,
  BuzzSnapshot,
  CasebookEntry,
  ChapterNumber,
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
  ObjectiveId,
  SaveState,
  SpecialAbilityId,
} from '../core/types';

export interface UiStateSource {
  readonly bus: GameEventBus;
  health(): Health;
  buzz(): BuzzSnapshot;
  heat(): HeatSnapshot;
  hangover(): HangoverState;
  empties(): number;
  drinkSlots(): DrinkSlots;
  selectedDrink(): DrinkSlotIndex;
  selectedSpecial(): SpecialAbilityId | null;
  unlockedAbilities(): readonly AbilityId[];
  mykoCallsLeft(): number;
  /** 0..1 progress of the M hold; 0 when not held. */
  mykoCallHoldProgress(): number;
  casebook(): readonly CasebookEntry[];
  currentObjective(): ObjectiveId | null;
  /** Current boss or set piece with a health bar, if one is running. */
  boss(): { readonly bossId: BossId; readonly health: Health } | null;
  /** Deduction board waiting for an answer, if one is open. */
  activeDeduction(): DeductionBoardDef | null;
  /** Returns whether the three links were correct. */
  submitDeduction(id: DeductionSectionId, evidence: readonly EvidenceId[]): boolean;
  /** The UI calls this when it has finished showing a sequence. */
  dialogueFinished(sequenceId: DialogueId): void;
  /** Stored save, for Continue and Chapter Select; null if none. */
  save(): SaveState | null;
  audioSettings(): AudioSettings;
  setAudioSettings(settings: AudioSettings): void;
  newGame(): void;
  continueGame(): void;
  startChapter(chapter: ChapterNumber): void;
  pause(): void;
  resume(): void;
  quitToTitle(): void;
}
