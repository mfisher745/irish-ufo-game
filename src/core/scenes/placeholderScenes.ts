/**
 * PLACEHOLDER UI until `src/ui/` merges (see the integration point in
 * `src/main.ts`). A bare title menu and a dev HUD that shows the state and
 * the dialogue text, so the game is playable and testable without the real
 * UI. All strings come from `src/content/dialogue/`.
 */

import Phaser from 'phaser';
import { css } from '../../art';
import { hasText, sequence, hasSequence, text } from '../../content/dialogue';
import type { UiState } from '../../systems/session';
import type { DialogueId } from '../types';

const STYLE: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'monospace', fontSize: '8px', color: css('white') };
/** Dev-only: how long a commentary box stays up per line before the dev HUD dismisses it. */
const DEV_BOX_MS_PER_LINE = 2500;

const label = (id: string): string => (hasText(id) ? text(id) : id);

export class PlaceholderTitleScene extends Phaser.Scene {
  private index = 0;
  private items: { label: string; action: () => void }[] = [];
  private texts: Phaser.GameObjects.Text[] = [];

  constructor(private readonly ui: UiState) {
    super('Title');
  }

  create(): void {
    this.scene.stop('DevHud');
    const { width } = this.scale;
    this.add.text(width / 2, 70, label('ui.title'), { ...STYLE, fontSize: '16px' }).setOrigin(0.5);
    this.items = [];
    if (this.ui.save()) this.items.push({ label: label('ui.menu.continue'), action: () => this.ui.continueGame() });
    this.items.push({ label: label('ui.menu.newGame'), action: () => this.ui.newGame() });
    for (const n of this.ui.save()?.finishedChapters ?? []) {
      this.items.push({ label: label('ui.chapter.label').replace('{n}', String(n)), action: () => this.ui.startChapter(n) });
    }
    this.index = 0;
    this.texts = this.items.map((it, i) =>
      this.add
        .text(width / 2, 120 + i * 14, it.label, STYLE)
        .setOrigin(0.5)
        .setInteractive()
        .on('pointerdown', () => it.action()),
    );
    this.refresh();
    const kb = this.input.keyboard;
    kb?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.index = (this.index + 1) % this.items.length;
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') this.index = (this.index + this.items.length - 1) % this.items.length;
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') this.items[this.index]?.action();
      this.refresh();
    });
  }

  private refresh(): void {
    this.texts.forEach((t, i) => t.setColor(css(i === this.index ? 'amberLight' : 'fog')));
  }
}

export class DevHudScene extends Phaser.Scene {
  private stats!: Phaser.GameObjects.Text;
  private box!: Phaser.GameObjects.Text;
  private sceneBox!: Phaser.GameObjects.Text;
  private paused!: Phaser.GameObjects.Text;
  private shown = new Map<DialogueId, number>();
  private readonly offs: (() => void)[] = [];

  constructor(private readonly ui: UiState) {
    super('DevHud');
  }

  create(): void {
    this.stats = this.add.text(4, 4, '', STYLE);
    this.box = this.add.text(4, this.scale.height - 56, '', { ...STYLE, wordWrap: { width: this.scale.width - 8 } }).setBackgroundColor(css('ink'));
    this.sceneBox = this.add
      .text(4, this.scale.height - 100, '', { ...STYLE, wordWrap: { width: this.scale.width - 8 } })
      .setBackgroundColor(css('navyDark'));
    this.paused = this.add.text(this.scale.width / 2, 40, label('ui.pause.title'), { ...STYLE, fontSize: '16px' }).setOrigin(0.5).setVisible(false);
    this.shown.clear();
    this.offs.push(this.ui.bus.on('dialogue:show', ({ sequenceId }) => this.shown.set(sequenceId, this.time.now)));
    this.offs.push(this.ui.bus.on('dialogue:finished', ({ sequenceId }) => this.shown.delete(sequenceId)));
    this.offs.push(this.ui.bus.on('game:paused', () => this.paused.setVisible(true)));
    this.offs.push(this.ui.bus.on('game:resumed', () => this.paused.setVisible(false)));
    const kb = this.input.keyboard;
    kb?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Escape' && this.paused.visible) this.ui.resume();
      else if (e.code === 'KeyQ' && this.paused.visible) this.ui.quitToTitle();
      else if (e.code === 'KeyE') this.advanceScene();
    });
    this.input.on('pointerdown', () => this.advanceScene());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.offs.splice(0)) off();
    });
  }

  override update(time: number): void {
    const h = this.ui.health();
    const b = this.ui.buzz();
    const slots = this.ui.drinkSlots();
    const sel = this.ui.selectedDrink();
    const slot = slots[sel];
    const lines = [
      `${h.current}/${h.max}  ${label(`ui.buzz.${b.state}`)} ${Math.round(b.value)}`,
      `${label('ui.hud.empties')} ${this.ui.empties()}  [${sel + 1}] ${slot ? `${label(`drink.${slot.drinkId}.name`)} x${slot.count}` : label('ui.hud.noDrink')}`,
      `${this.ui.selectedSpecial() ? label(`ability.${this.ui.selectedSpecial() ?? ''}.name`) : label('ui.hud.noSpecial')}  M ${this.ui.mykoCallsLeft()}${this.ui.mykoCallHoldProgress() > 0 ? ` ${Math.round(this.ui.mykoCallHoldProgress() * 100)}%` : ''}`,
    ];
    const heat = this.ui.heat();
    if (heat.active) lines.push(`${label('ui.hud.heat')} ${Math.round(heat.value)}`);
    const boss = this.ui.boss();
    if (boss) lines.push(`${label(`boss.${boss.bossId}.name`)} ${boss.health.current}/${boss.health.max}`);
    this.stats.setText(lines);

    let boxText = '';
    let sceneText = '';
    for (const [id, since] of this.shown) {
      if (!hasSequence(id)) continue;
      const seq = sequence(id);
      const body = seq.lines.map((l) => `${l.speaker === 'npc' ? label(l.speakerName ?? '') : label(`speaker.${l.speaker}`)}: ${l.text}`).join('\n');
      if (seq.delivery === 'scene') sceneText = `${body}\n[${label('ui.prompt.advance')}]`;
      else {
        boxText = body;
        if (time - since > DEV_BOX_MS_PER_LINE * seq.lines.length) this.ui.dialogueFinished(id);
      }
    }
    this.box.setText(boxText).setVisible(boxText !== '');
    this.sceneBox.setText(sceneText).setVisible(sceneText !== '');
  }

  private advanceScene(): void {
    for (const id of this.shown.keys()) {
      if (hasSequence(id) && sequence(id).delivery === 'scene') {
        this.ui.dialogueFinished(id);
        return;
      }
    }
  }
}
