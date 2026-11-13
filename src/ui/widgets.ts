/**
 * Vertical menu with buttons, sliders and toggles. Mouse and keyboard.
 * Labels are passed already resolved from text IDs by the caller.
 */

import Phaser from 'phaser';
import type { Label } from './gfx';
import { makeLabel, rect, setLabelColour, setLabelText } from './gfx';
import { PALETTE } from '../art/palette';
import { text } from '../content/dialogue';
import type { UiHooks } from './shared';

export type MenuItem =
  | { readonly kind: 'button'; readonly label: () => string; readonly enabled?: () => boolean; readonly onSelect: () => void }
  | { readonly kind: 'slider'; readonly label: () => string; readonly get: () => number; readonly set: (v: number) => void }
  | { readonly kind: 'toggle'; readonly label: () => string; readonly get: () => boolean; readonly set: (v: boolean) => void };

export interface MenuOptions {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly rowHeight?: number;
  readonly hooks: UiHooks;
  readonly centre?: boolean;
}

const SLIDER_WIDTH = 80;
const SLIDER_STEP = 0.1;

interface Row {
  readonly item: MenuItem;
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly label: Label;
  readonly value: Label | null;
  readonly track: Phaser.GameObjects.Rectangle | null;
  readonly fill: Phaser.GameObjects.Rectangle | null;
}

export class Menu {
  private readonly rows: Row[] = [];
  private selected = 0;
  private readonly rowHeight: number;
  private readonly cleanups: Array<() => void> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly items: readonly MenuItem[],
    private readonly opts: MenuOptions,
  ) {
    this.rowHeight = opts.rowHeight ?? 15;
    items.forEach((item, i) => this.addRow(item, i));
    this.selected = this.firstEnabled(0, 1);
    this.bindKeys();
    this.refresh();
  }

  private enabled(i: number): boolean {
    const item = this.items[i];
    return item !== undefined && (item.kind !== 'button' || item.enabled === undefined || item.enabled());
  }

  private firstEnabled(from: number, dir: 1 | -1): number {
    const n = this.items.length;
    for (let k = 0; k < n; k++) {
      const i = (((from + dir * k) % n) + n) % n;
      if (this.enabled(i)) return i;
    }
    return 0;
  }

  private addRow(item: MenuItem, i: number): void {
    const { x, y, width } = this.opts;
    const top = y + i * this.rowHeight;
    const bg = rect(this.scene, x, top, width, this.rowHeight - 1, 'ink');
    const label = makeLabel(this.scene, this.opts.centre === true ? x + width / 2 : x + 6, top + 3, item.label(), 'white', {
      anchor: this.opts.centre === true ? 'centre' : 'left',
    });
    let value: Label | null = null;
    let track: Phaser.GameObjects.Rectangle | null = null;
    let fill: Phaser.GameObjects.Rectangle | null = null;
    if (item.kind === 'slider') {
      track = rect(this.scene, x + width - SLIDER_WIDTH - 6, top + 4, SLIDER_WIDTH, 6, 'coal');
      fill = rect(this.scene, x + width - SLIDER_WIDTH - 6, top + 4, 0, 6, 'amber');
    } else if (item.kind === 'toggle') {
      value = makeLabel(this.scene, x + width - 6, top + 3, '', 'white', { anchor: 'right' });
    }
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      if (this.enabled(i) && this.selected !== i) {
        this.selected = i;
        this.opts.hooks.play?.('uiMove');
        this.refresh();
      }
    });
    bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.enabled(i)) return;
      this.selected = i;
      if (item.kind === 'slider') this.dragSlider(item, p);
      else this.activate();
      this.refresh();
    });
    bg.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && item.kind === 'slider' && this.selected === i) {
        this.dragSlider(item, p);
        this.refresh();
      }
    });
    this.rows.push({ item, bg, label, value, track, fill });
  }

  private dragSlider(item: Extract<MenuItem, { kind: 'slider' }>, p: Phaser.Input.Pointer): void {
    const left = this.opts.x + this.opts.width - SLIDER_WIDTH - 6;
    const raw = Phaser.Math.Clamp((p.x - left) / SLIDER_WIDTH, 0, 1);
    const v = Math.round(raw / SLIDER_STEP) / (1 / SLIDER_STEP);
    if (Math.abs(v - item.get()) > 1e-6) {
      item.set(v);
      this.opts.hooks.play?.('uiMove');
    }
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (kb === null) return;
    const on = (names: readonly string[], fn: () => void): void => {
      for (const n of names) {
        const ev = `keydown-${n}`;
        kb.on(ev, fn);
        this.cleanups.push(() => kb.off(ev, fn));
      }
    };
    on(['UP', 'W'], () => this.move(-1));
    on(['DOWN', 'S'], () => this.move(1));
    on(['LEFT', 'A'], () => this.adjust(-1));
    on(['RIGHT', 'D'], () => this.adjust(1));
    on(['ENTER', 'SPACE', 'E'], () => this.activate());
  }

  private move(dir: 1 | -1): void {
    const next = this.firstEnabled(this.selected + dir, dir);
    if (next !== this.selected) this.opts.hooks.play?.('uiMove');
    this.selected = next;
    this.refresh();
  }

  private adjust(dir: 1 | -1): void {
    const item = this.items[this.selected];
    if (item === undefined) return;
    if (item.kind === 'slider') {
      item.set(Phaser.Math.Clamp(Math.round((item.get() + dir * SLIDER_STEP) / SLIDER_STEP) / (1 / SLIDER_STEP), 0, 1));
      this.opts.hooks.play?.('uiMove');
    } else if (item.kind === 'toggle') {
      item.set(!item.get());
      this.opts.hooks.play?.('uiSelect');
    }
    this.refresh();
  }

  private activate(): void {
    const item = this.items[this.selected];
    if (item === undefined || !this.enabled(this.selected)) return;
    if (item.kind === 'button') {
      this.opts.hooks.play?.('uiSelect');
      item.onSelect();
    } else if (item.kind === 'toggle') {
      item.set(!item.get());
      this.opts.hooks.play?.('uiSelect');
    }
    this.refresh();
  }

  /** Redraw labels and values. Call after changing state outside the menu. */
  refresh(): void {
    this.rows.forEach((row, i) => {
      if (!row.bg.active) return;
      const enabled = this.enabled(i);
      const selected = i === this.selected;
      row.bg.setFillStyle(selected ? PALETTE.slate : PALETTE.ink);
      setLabelText(row.label, row.item.label());
      setLabelColour(row.label, !enabled ? 'steel' : selected ? 'amberLight' : 'white');
      if (row.item.kind === 'slider' && row.fill !== null) {
        row.fill.setSize(Math.round(SLIDER_WIDTH * row.item.get()), 6);
      }
      if (row.item.kind === 'toggle' && row.value !== null) {
        setLabelText(row.value, text(row.item.get() ? 'ui.settings.on' : 'ui.settings.off'));
        setLabelColour(row.value, selected ? 'amberLight' : 'white');
      }
    });
  }

  destroy(): void {
    for (const c of this.cleanups) c();
    this.cleanups.length = 0;
    for (const r of this.rows) {
      r.bg.destroy();
      r.label.destroy();
      r.value?.destroy();
      r.track?.destroy();
      r.fill?.destroy();
    }
    this.rows.length = 0;
  }
}
