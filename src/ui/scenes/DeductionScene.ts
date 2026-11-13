/**
 * Deduction board: link exactly three pieces of evidence with the mouse, then
 * confirm. A wrong answer clears the links and costs nothing (Myko's remark
 * arrives through the dialogue events). Opened by the HUD scene when
 * `source.activeDeduction()` becomes non-null.
 */

import Phaser from 'phaser';
import { PALETTE } from '../../art/palette';
import { hasText, text } from '../../content/dialogue';
import type { DeductionBoardDef, EvidenceId } from '../../core/types';
import type { Label } from '../gfx';
import { makeLabel, rect, setLabelColour } from '../gfx';
import { LinkSelection } from '../model/deduction';
import { wrapText } from '../model/wrap';
import { UiSceneKeys } from '../shared';
import type { UiShared } from '../shared';

const CARD = { w: 200, h: 24, gapX: 16, gapY: 6, x: 28, y: 52 } as const;
const RESULT_MS = 2400;

interface Card {
  readonly id: EvidenceId;
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly label: Label;
  readonly num: Label;
  readonly cx: number;
  readonly cy: number;
}

export class DeductionScene extends Phaser.Scene {
  private board: DeductionBoardDef | null = null;
  private sel!: LinkSelection;
  private cards: Card[] = [];
  private lines!: Phaser.GameObjects.Graphics;
  private confirmBg!: Phaser.GameObjects.Rectangle;
  private confirmLabel!: Label;
  private resultUntil = 0;

  constructor(private readonly shared: UiShared) {
    super(UiSceneKeys.Deduction);
  }

  create(): void {
    this.cards = [];
    this.resultUntil = 0;
    const board = this.shared.source.activeDeduction();
    this.board = board;
    rect(this, 0, 0, 480, 270, 'ink');
    if (board === null) {
      this.scene.stop();
      return;
    }
    this.sel = new LinkSelection(board.candidateIds);
    makeLabel(this, 240, 10, text('ui.deduction.title'), 'bone', { anchor: 'centre' });
    makeLabel(this, 240, 24, text('ui.deduction.instruction'), 'fog', { anchor: 'centre' });
    board.candidateIds.forEach((id, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = CARD.x + col * (CARD.w + CARD.gapX);
      const y = CARD.y + row * (CARD.h + CARD.gapY);
      const bg = rect(this, x, y, CARD.w, CARD.h, 'coal');
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.resultUntil === 0 && this.sel.toggle(id)) this.shared.hooks.play?.('uiMove');
      });
      const titleId = `${id}.title`;
      const raw = hasText(titleId) ? text(titleId) : '';
      const label = makeLabel(this, x + 18, y + 4, wrapText(raw, 27).slice(0, 2).join('\n'), 'white');
      const num = makeLabel(this, x + 5, y + 8, '', 'amberLight');
      this.cards.push({ id, bg, label, num, cx: x + CARD.w / 2, cy: y + CARD.h / 2 });
    });
    this.lines = this.add.graphics().setDepth(5);
    this.confirmBg = rect(this, 110, 236, 120, 20, 'coal');
    this.confirmBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.confirm());
    this.confirmLabel = makeLabel(this, 170, 242, text('ui.deduction.confirm'), 'steel', { anchor: 'centre' });
    const clear = rect(this, 250, 236, 120, 20, 'coal');
    clear.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.sel.clear();
      this.shared.hooks.play?.('uiMove');
    });
    makeLabel(this, 310, 242, text('ui.deduction.clear'), 'white', { anchor: 'centre' });
  }

  private confirm(): void {
    const board = this.board;
    if (board === null || !this.sel.complete || this.resultUntil !== 0) return;
    const ok = this.shared.source.submitDeduction(board.id, this.sel.picks());
    if (ok) {
      this.shared.hooks.play?.('uiSelect');
      this.resultUntil = this.time.now + RESULT_MS;
      rect(this, 0, 150, 480, 120, 'ink', 20);
      makeLabel(this, 240, 160, wrapText(text(board.leadTextId), 64).join('\n'), 'amberLight', { anchor: 'centre', depth: 21 });
      if (hasText(board.leadMarginTextId)) {
        makeLabel(this, 240, 196, wrapText(text(board.leadMarginTextId), 64).join('\n'), 'beanie', { anchor: 'centre', depth: 21 });
      }
    } else {
      this.shared.hooks.play?.('refuse');
      this.sel.clear();
    }
  }

  update(): void {
    if (this.board === null) return;
    if (this.resultUntil !== 0) {
      if (this.time.now >= this.resultUntil) this.scene.stop();
      return;
    }
    for (const c of this.cards) {
      const order = this.sel.order(c.id);
      c.bg.setFillStyle(PALETTE[order > 0 ? 'slate' : 'coal']);
      c.num.setText(order > 0 ? String(order) : '');
    }
    this.lines.clear();
    this.lines.lineStyle(2, PALETTE.amberLight, 1);
    for (const [a, b] of this.sel.links()) {
      const ca = this.cards.find((c) => c.id === a);
      const cb = this.cards.find((c) => c.id === b);
      if (ca === undefined || cb === undefined) continue;
      // Join facing edges so the line never crosses the titles.
      if (Math.abs(ca.cy - cb.cy) < 1) {
        const [l, r] = ca.cx < cb.cx ? [ca, cb] : [cb, ca];
        this.lines.lineBetween(l.cx + CARD.w / 2, l.cy, r.cx - CARD.w / 2, r.cy);
      } else {
        const [u, d] = ca.cy < cb.cy ? [ca, cb] : [cb, ca];
        this.lines.lineBetween(u.cx, u.cy + CARD.h / 2, d.cx, d.cy - CARD.h / 2);
      }
    }
    this.confirmBg.setFillStyle(PALETTE[this.sel.complete ? 'amber' : 'coal']);
    setLabelColour(this.confirmLabel, this.sel.complete ? 'ink' : 'steel');
  }
}
