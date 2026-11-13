/**
 * Casebook: tabs for clues, leads and proof; Andrew's entry with Myko's margin
 * note beside it in the Myko colour. Tab and Esc are handled by the HUD scene.
 * Keys here: A/D or arrows switch tab, W/S or arrows choose an entry.
 */

import Phaser from 'phaser';
import { hasText, text, format } from '../../content/dialogue';
import { PALETTE } from '../../art/palette';
import type { Label } from '../gfx';
import { makeLabel, rect, setLabelColour, setLabelText } from '../gfx';
import { CASEBOOK_TABS, groupCasebook, tabTextId } from '../model/casebook';
import type { CasebookItem, CasebookTab } from '../model/casebook';
import { wrapText } from '../model/wrap';
import { UiSceneKeys } from '../shared';
import type { UiShared } from '../shared';

const LIST = { x: 12, y: 34, rowHeight: 11, rows: 19, chars: 22 } as const;
const BODY = { x: 160, y: 36, chars: 30, maxLines: 20 } as const;
const MARGIN = { x: 358, y: 36, chars: 19 } as const;

export class CasebookScene extends Phaser.Scene {
  private tab: CasebookTab = 'clues';
  private selected = 0;
  private scroll = 0;
  private tabBg: Phaser.GameObjects.Rectangle[] = [];
  private tabLabels: Label[] = [];
  private rows: Array<{ bg: Phaser.GameObjects.Rectangle; label: Label }> = [];
  private body!: Label;
  private margin!: Label;
  private empty!: Label;
  private lastKey = '';
  private cleanups: Array<() => void> = [];

  constructor(private readonly shared: UiShared) {
    super(UiSceneKeys.Casebook);
  }

  create(): void {
    this.tab = 'clues';
    this.selected = 0;
    this.scroll = 0;
    this.lastKey = '';
    this.tabBg = [];
    this.tabLabels = [];
    this.rows = [];
    rect(this, 0, 0, 480, 270, 'ink');
    rect(this, 6, 6, 468, 258, 'bone');
    rect(this, 154, 30, 1, 228, 'fog');
    rect(this, 350, 30, 1, 228, 'fog');
    CASEBOOK_TABS.forEach((t, i) => {
      const x = 12 + i * 70;
      const bg = rect(this, x, 10, 66, 15, 'fog');
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setTab(t));
      this.tabBg.push(bg);
      this.tabLabels.push(makeLabel(this, x + 33, 14, text(tabTextId(t)), 'ink', { anchor: 'centre' }));
    });
    makeLabel(this, 468, 14, text('ui.casebook.title'), 'beanie', { anchor: 'right' });
    for (let i = 0; i < LIST.rows; i++) {
      const y = LIST.y + i * LIST.rowHeight;
      const bg = rect(this, LIST.x - 2, y, 140, LIST.rowHeight - 1, 'bone');
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.selected = this.scroll + i;
        this.shared.hooks.play?.('uiMove');
      });
      this.rows.push({ bg, label: makeLabel(this, LIST.x, y + 1, '', 'ink') });
    }
    this.body = makeLabel(this, BODY.x, BODY.y, '', 'ink');
    this.margin = makeLabel(this, MARGIN.x, MARGIN.y, '', 'beanie');
    this.empty = makeLabel(this, LIST.x, LIST.y, text('ui.casebook.empty'), 'steel');
    this.bindKeys();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const c of this.cleanups) c();
      this.cleanups = [];
    });
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (kb === null) return;
    const on = (names: readonly string[], fn: () => void): void => {
      for (const n of names) {
        const ev = `keydown-${n}`;
        kb.on(ev, fn);
        this.cleanups.push(() => kb.off(ev, fn));
      }
    };
    on(['LEFT', 'A'], () => this.shiftTab(-1));
    on(['RIGHT', 'D'], () => this.shiftTab(1));
    on(['UP', 'W'], () => this.moveSel(-1));
    on(['DOWN', 'S'], () => this.moveSel(1));
    const wheel = (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void => this.moveSel(dy > 0 ? 1 : -1);
    this.input.on('wheel', wheel);
    this.cleanups.push(() => this.input.off('wheel', wheel));
  }

  private items(): CasebookItem[] {
    return groupCasebook(this.shared.source.casebook())[this.tab];
  }

  private setTab(t: CasebookTab): void {
    if (t === this.tab) return;
    this.tab = t;
    this.selected = 0;
    this.scroll = 0;
    this.shared.hooks.play?.('uiMove');
  }

  private shiftTab(d: number): void {
    const i = CASEBOOK_TABS.indexOf(this.tab);
    const next = CASEBOOK_TABS[(i + d + CASEBOOK_TABS.length) % CASEBOOK_TABS.length];
    if (next !== undefined) this.setTab(next);
  }

  private moveSel(d: number): void {
    const n = this.items().length;
    if (n === 0) return;
    this.selected = Phaser.Math.Clamp(this.selected + d, 0, n - 1);
    this.shared.hooks.play?.('uiMove');
  }

  update(): void {
    const items = this.items();
    this.selected = Phaser.Math.Clamp(this.selected, 0, Math.max(0, items.length - 1));
    if (this.selected < this.scroll) this.scroll = this.selected;
    if (this.selected >= this.scroll + LIST.rows) this.scroll = this.selected - LIST.rows + 1;

    CASEBOOK_TABS.forEach((t, i) => {
      const active = t === this.tab;
      this.tabBg[i]?.setFillStyle(PALETTE[active ? 'bone' : 'fog']);
      const l = this.tabLabels[i];
      if (l !== undefined) setLabelColour(l, active ? 'beanie' : 'slate');
    });
    this.empty.setVisible(items.length === 0);
    this.rows.forEach((row, i) => {
      const item = items[this.scroll + i];
      row.bg.setVisible(item !== undefined);
      row.label.setVisible(item !== undefined);
      if (item === undefined) return;
      const sel = this.scroll + i === this.selected;
      row.bg.setFillStyle(PALETTE[sel ? 'fog' : 'bone']);
      setLabelText(row.label, this.titleOf(item).slice(0, LIST.chars));
    });
    const item = items[this.selected];
    const key = item === undefined ? '' : item.key;
    if (key === this.lastKey) return;
    this.lastKey = key;
    if (item === undefined) {
      setLabelText(this.body, '');
      setLabelText(this.margin, '');
      return;
    }
    setLabelText(this.body, hasText(item.bodyId) ? wrapText(text(item.bodyId), BODY.chars).slice(0, BODY.maxLines).join('\n') : '');
    setLabelText(this.margin, hasText(item.marginId) ? wrapText(text(item.marginId), MARGIN.chars).join('\n') : '');
  }

  private titleOf(item: CasebookItem): string {
    if (item.titleId !== null && hasText(item.titleId)) return text(item.titleId);
    return format('ui.chapter.label', { n: item.chapter });
  }
}
