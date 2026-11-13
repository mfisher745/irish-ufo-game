/** A fake `UiStateSource` for the dev harness. All state is public and mutable. */

import type {
  AbilityId,
  AudioSettings,
  BossId,
  BuzzSnapshot,
  BuzzState,
  CasebookEntry,
  ChapterNumber,
  DeductionBoardDef,
  DeductionSectionId,
  DialogueId,
  DrinkSlotIndex,
  DrinkSlots,
  EvidenceId,
  GameEventBus,
  GameEventName,
  GameEventPayloads,
  HangoverState,
  Health,
  HeatSnapshot,
  ObjectiveId,
  SaveState,
  SpecialAbilityId,
} from '../../core/types';
import { TUNING } from '../../content/tuning';
import type { UiStateSource } from '../contract';

export class FakeBus implements GameEventBus {
  private readonly handlers = new Map<string, Array<(payload: never) => void>>();

  emit<K extends GameEventName>(event: K, payload: GameEventPayloads[K]): void {
    for (const h of this.handlers.get(event) ?? []) (h as (p: GameEventPayloads[K]) => void)(payload);
  }

  on<K extends GameEventName>(event: K, handler: (payload: GameEventPayloads[K]) => void): () => void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as (payload: never) => void);
    this.handlers.set(event, list);
    return () => {
      const i = list.indexOf(handler as (payload: never) => void);
      if (i >= 0) list.splice(i, 1);
    };
  }
}

export const stateForBuzz = (v: number): BuzzState => {
  const t = TUNING.buzz.thresholds;
  return v >= t.banjaxed ? 'banjaxed' : v >= t.locked ? 'locked' : v >= t.grand ? 'grand' : 'sober';
};

export class FakeSource implements UiStateSource {
  readonly bus = new FakeBus();
  healthState: Health = { current: 70, max: 100 };
  buzzValue = 45;
  banjaxedPhase: BuzzSnapshot['banjaxedPhase'] = 'none';
  heatState: HeatSnapshot = { active: false, value: 40 };
  hangoverState: HangoverState = { active: false };
  emptiesCount = 4;
  slots: DrinkSlots = [{ drinkId: 'stout', count: 3 }, { drinkId: 'whiskey', count: 1 }, null];
  selected: DrinkSlotIndex = 0;
  special: SpecialAbilityId | null = 'stoutSlam';
  abilities: AbilityId[] = ['punchCombo', 'bottleThrow'];
  callsLeft = 2;
  holdProgress = 0;
  entries: CasebookEntry[] = [];
  bossState: { bossId: BossId; health: Health } | null = null;
  board: DeductionBoardDef | null = null;
  saveState: SaveState | null = null;
  settings: AudioSettings = { musicVolume: 0.7, effectsVolume: 0.8 };
  paused = false;
  log: string[] = [];

  health = (): Health => this.healthState;
  buzz = (): BuzzSnapshot => ({ value: this.buzzValue, state: stateForBuzz(this.buzzValue), banjaxedPhase: this.banjaxedPhase, banjaxedPhaseMsLeft: 0 });
  heat = (): HeatSnapshot => this.heatState;
  hangover = (): HangoverState => this.hangoverState;
  empties = (): number => this.emptiesCount;
  drinkSlots = (): DrinkSlots => this.slots;
  selectedDrink = (): DrinkSlotIndex => this.selected;
  selectedSpecial = (): SpecialAbilityId | null => this.special;
  unlockedAbilities = (): readonly AbilityId[] => this.abilities;
  mykoCallsLeft = (): number => this.callsLeft;
  mykoCallHoldProgress = (): number => this.holdProgress;
  casebook = (): readonly CasebookEntry[] => this.entries;
  currentObjective = (): ObjectiveId | null => null;
  boss = (): { bossId: BossId; health: Health } | null => this.bossState;
  activeDeduction = (): DeductionBoardDef | null => this.board;
  submitDeduction(id: DeductionSectionId, evidence: readonly EvidenceId[]): boolean {
    const board = this.board;
    const ok = board !== null && board.solution.every((s) => evidence.includes(s));
    this.log.push(`submit ${id} ${evidence.join(',')} -> ${String(ok)}`);
    if (ok) this.board = null;
    return ok;
  }
  dialogueFinished(id: DialogueId): void {
    this.log.push(`finished ${id}`);
    this.bus.emit('dialogue:finished', { sequenceId: id });
  }
  save = (): SaveState | null => this.saveState;
  audioSettings = (): AudioSettings => this.settings;
  setAudioSettings(s: AudioSettings): void {
    this.settings = s;
  }
  newGame(): void {
    this.log.push('newGame');
  }
  continueGame(): void {
    this.log.push('continueGame');
  }
  startChapter(c: ChapterNumber): void {
    this.log.push(`startChapter ${c}`);
  }
  pause(): void {
    this.paused = true;
    this.log.push('pause');
  }
  resume(): void {
    this.paused = false;
    this.log.push('resume');
  }
  quitToTitle(): void {
    this.log.push('quitToTitle');
  }
}
