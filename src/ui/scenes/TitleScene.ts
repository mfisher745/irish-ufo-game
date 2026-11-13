/** Title: Continue (with a save), New Game (confirm if a save exists), Chapter Select, Settings. */

import Phaser from 'phaser';
import { text, format } from '../../content/dialogue';
import type { ChapterNumber } from '../../core/types';
import { bindFullscreenHotkey } from '../fullscreen';
import { makeLabel, rect } from '../gfx';
import { SCREEN } from '../layout';
import { UiSceneKeys } from '../shared';
import type { UiShared } from '../shared';
import { Menu } from '../widgets';
import type { MenuItem } from '../widgets';

type View = 'main' | 'confirm' | 'chapters';

export class TitleScene extends Phaser.Scene {
  private menu: Menu | null = null;
  private extras: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly shared: UiShared) {
    super(UiSceneKeys.Title);
  }

  create(): void {
    bindFullscreenHotkey(this.game);
    rect(this, 0, 0, SCREEN.width, SCREEN.height, 'ink');
    // Fixed star field (deterministic, no randomness).
    for (let i = 0; i < 48; i++) {
      const x = (i * 97 + 13) % SCREEN.width;
      const y = (i * 53 + 7) % 110;
      rect(this, x, y, 1, 1, i % 5 === 0 ? 'amberLight' : 'steel');
    }
    const title = makeLabel(this, SCREEN.width / 2, 44, text('ui.title'), 'amberLight', { anchor: 'centre' });
    title.setScale(3);
    this.show('main');
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.show('main'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clear());
  }

  private clear(): void {
    this.menu?.destroy();
    this.menu = null;
    for (const o of this.extras) o.destroy();
    this.extras = [];
  }

  private show(view: View): void {
    this.clear();
    const { source, hooks } = this.shared;
    const save = source.save();
    const w = 180;
    const x = (SCREEN.width - w) / 2;
    let items: MenuItem[];
    let y = 120;
    if (view === 'confirm') {
      this.extras.push(makeLabel(this, SCREEN.width / 2, 112, text('ui.menu.newGameConfirm'), 'bone', { anchor: 'centre' }));
      y = 130;
      items = [
        { kind: 'button', label: () => text('ui.menu.no'), onSelect: () => this.show('main') },
        { kind: 'button', label: () => text('ui.menu.yes'), onSelect: () => source.newGame() },
      ];
    } else if (view === 'chapters') {
      const done = [...(save?.finishedChapters ?? [])].sort((a, b) => a - b);
      y = 96;
      items = done.map<MenuItem>((n: ChapterNumber) => ({
        kind: 'button',
        label: () => format('ui.chapter.label', { n }),
        onSelect: () => source.startChapter(n),
      }));
      items.push({ kind: 'button', label: () => text('ui.menu.back'), onSelect: () => this.show('main') });
    } else {
      items = [];
      if (save !== null) items.push({ kind: 'button', label: () => text('ui.menu.continue'), onSelect: () => source.continueGame() });
      items.push({
        kind: 'button',
        label: () => text('ui.menu.newGame'),
        onSelect: () => (save !== null ? this.show('confirm') : source.newGame()),
      });
      items.push({
        kind: 'button',
        label: () => text('ui.menu.chapterSelect'),
        enabled: () => (save?.finishedChapters.length ?? 0) > 0,
        onSelect: () => this.show('chapters'),
      });
      items.push({
        kind: 'button',
        label: () => text('ui.menu.settings'),
        onSelect: () => {
          this.scene.launch(UiSceneKeys.Settings, { returnTo: UiSceneKeys.Title });
          this.scene.bringToTop(UiSceneKeys.Settings);
          this.scene.sleep();
        },
      });
    }
    this.menu = new Menu(this, items, { x, y, width: w, hooks, centre: true });
  }
}
