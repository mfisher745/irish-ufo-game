/** Pause menu: Resume, Settings, Quit to title. Opened and closed by the HUD scene (Esc). */

import Phaser from 'phaser';
import { text } from '../../content/dialogue';
import { makeLabel, rect } from '../gfx';
import { SCREEN } from '../layout';
import { UiSceneKeys } from '../shared';
import type { UiShared } from '../shared';
import { Menu } from '../widgets';

export class PauseScene extends Phaser.Scene {
  private menu: Menu | null = null;

  constructor(private readonly shared: UiShared) {
    super(UiSceneKeys.Pause);
  }

  create(): void {
    const w = 160;
    const x = (SCREEN.width - w) / 2;
    rect(this, x - 8, 70, w + 16, 106, 'coal');
    rect(this, x - 8, 70, w + 16, 1, 'slate');
    makeLabel(this, SCREEN.width / 2, 78, text('ui.pause.title'), 'bone', { anchor: 'centre' });
    this.build(x, w);
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.menu?.refresh());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.menu?.destroy();
      this.menu = null;
    });
  }

  private build(x: number, w: number): void {
    const { hooks, overlays, source } = this.shared;
    this.menu = new Menu(
      this,
      [
        {
          kind: 'button',
          label: () => text('ui.pause.resume'),
          onSelect: () => {
            overlays.hide('pause');
            this.scene.stop();
          },
        },
        {
          kind: 'button',
          label: () => text('ui.menu.settings'),
          onSelect: () => {
            this.scene.launch(UiSceneKeys.Settings, { returnTo: UiSceneKeys.Pause });
            this.scene.bringToTop(UiSceneKeys.Settings);
            this.scene.sleep();
          },
        },
        {
          kind: 'button',
          label: () => text('ui.pause.quit'),
          onSelect: () => {
            overlays.hide('pause');
            this.scene.stop();
            source.quitToTitle();
          },
        },
      ],
      { x, y: 96, width: w, hooks },
    );
  }
}
