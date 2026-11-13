/**
 * Dialogue queue and typewriter. Plain TypeScript with no Phaser, so it can be
 * unit-tested. The HUD scene feeds it `dialogue:show` events and frame time,
 * and draws whatever `view()` returns.
 *
 * - `box`: never blocks play, advances on a timer.
 * - `scene`: blocks play (the game pauses itself), advances on `advance()`.
 * - `caption`: a centred narrator card, advances on a timer.
 */

import type { DialogueDelivery, DialogueId, DialogueLine, DialogueSequence, SpeakerId } from '../../core/types';
import { DIALOGUE_TEXT, DIALOGUE_TIMING } from '../layout';
import { paginate } from './wrap';

export interface DialogueDeps {
  lookup(id: DialogueId): DialogueSequence;
  /** Display name for a line, or null for none (narrator). */
  speakerName(line: DialogueLine): string | null;
  onFinished(id: DialogueId): void;
  /** Called once per non-space character as it is revealed. */
  onChar?(line: DialogueLine): void;
  onError?(id: DialogueId, error: unknown): void;
}

export interface DialogueView {
  readonly sequenceId: DialogueId;
  readonly delivery: DialogueDelivery;
  readonly lineIndex: number;
  readonly lineCount: number;
  readonly speaker: SpeakerId;
  readonly name: string | null;
  readonly direction: string | null;
  /** The page's wrapped lines in full. */
  readonly lines: readonly string[];
  /** The same lines, cut at the typewriter position. */
  readonly shown: readonly string[];
  /** All characters revealed. */
  readonly revealed: boolean;
  /** Revealed and waiting for E or click (scene delivery only). */
  readonly awaitingAdvance: boolean;
}

interface Page {
  readonly line: DialogueLine;
  readonly lines: readonly string[];
  readonly total: number;
}

export class DialogueQueue {
  private readonly waiting: DialogueId[] = [];
  private current: { readonly seq: DialogueSequence; readonly pages: Page[]; index: number } | null = null;
  private shownChars = 0;
  private holdMs = 0;

  constructor(private readonly deps: DialogueDeps) {}

  /** True while a `scene` sequence is on screen. */
  get blocking(): boolean {
    return this.current?.seq.delivery === 'scene';
  }

  get idle(): boolean {
    return this.current === null && this.waiting.length === 0;
  }

  get queued(): number {
    return this.waiting.length;
  }

  enqueue(id: DialogueId): void {
    this.waiting.push(id);
    if (this.current === null) this.startNext();
  }

  /** E or left click. Only scene delivery responds; the other kinds run on timers. */
  advance(): void {
    const cur = this.current;
    if (cur === null || cur.seq.delivery !== 'scene') return;
    const page = cur.pages[cur.index];
    if (page === undefined) return;
    if (this.shownChars < page.total) {
      this.shownChars = page.total;
      return;
    }
    this.nextPage();
  }

  update(dtMs: number): void {
    const cur = this.current;
    if (cur === null) return;
    const page = cur.pages[cur.index];
    if (page === undefined) return;
    if (this.shownChars < page.total) {
      const before = Math.floor(this.shownChars);
      this.shownChars = Math.min(page.total, this.shownChars + (DIALOGUE_TIMING.charsPerSecond * dtMs) / 1000);
      this.blips(page, before, Math.floor(this.shownChars), cur.seq.delivery);
      return;
    }
    if (cur.seq.delivery === 'scene') return;
    this.holdMs += dtMs;
    if (this.holdMs >= this.holdFor(page, cur.seq.delivery)) this.nextPage();
  }

  view(): DialogueView | null {
    const cur = this.current;
    if (cur === null) return null;
    const page = cur.pages[cur.index];
    if (page === undefined) return null;
    const count = Math.floor(this.shownChars);
    const shown: string[] = [];
    let left = count;
    for (const l of page.lines) {
      shown.push(l.slice(0, Math.max(0, left)));
      left -= l.length;
    }
    const revealed = count >= page.total;
    return {
      sequenceId: cur.seq.id,
      delivery: cur.seq.delivery,
      lineIndex: cur.index,
      lineCount: cur.pages.length,
      speaker: page.line.speaker,
      name: this.deps.speakerName(page.line),
      direction: page.line.direction ?? null,
      lines: page.lines,
      shown,
      revealed,
      awaitingAdvance: revealed && cur.seq.delivery === 'scene',
    };
  }

  private holdFor(page: Page, delivery: DialogueDelivery): number {
    return delivery === 'caption'
      ? DIALOGUE_TIMING.captionHoldBaseMs + DIALOGUE_TIMING.captionHoldPerCharMs * page.total
      : DIALOGUE_TIMING.boxHoldBaseMs + DIALOGUE_TIMING.boxHoldPerCharMs * page.total;
  }

  private blips(page: Page, from: number, to: number, delivery: DialogueDelivery): void {
    if (this.deps.onChar === undefined || delivery === 'caption') return;
    const flat = page.lines.join('');
    for (let i = from; i < to; i++) {
      const c = flat[i];
      if (c !== undefined && c !== ' ') this.deps.onChar(page.line);
    }
  }

  private nextPage(): void {
    const cur = this.current;
    if (cur === null) return;
    cur.index += 1;
    this.shownChars = 0;
    this.holdMs = 0;
    if (cur.index >= cur.pages.length) this.finishCurrent();
  }

  private finishCurrent(): void {
    const cur = this.current;
    this.current = null;
    if (cur !== null) this.deps.onFinished(cur.seq.id);
    this.startNext();
  }

  private startNext(): void {
    while (this.current === null) {
      const id = this.waiting.shift();
      if (id === undefined) return;
      let seq: DialogueSequence;
      try {
        seq = this.deps.lookup(id);
      } catch (error) {
        // A missing sequence must not leave the game waiting for a finish.
        this.deps.onError?.(id, error);
        this.deps.onFinished(id);
        continue;
      }
      const pages: Page[] = [];
      for (const line of seq.lines) {
        for (const lines of paginate(line.text, DIALOGUE_TEXT.maxChars, DIALOGUE_TEXT.maxLines)) {
          pages.push({ line, lines, total: lines.reduce((n, l) => n + l.length, 0) });
        }
      }
      if (pages.length === 0) {
        this.deps.onFinished(id);
        continue;
      }
      this.current = { seq, pages, index: 0 };
      this.shownChars = 0;
      this.holdMs = 0;
    }
  }
}
