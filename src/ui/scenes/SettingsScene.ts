/** Settings: music and effects volume, fullscreen. Returns to whichever scene opened it. */

import Phaser from 'phaser';
import { text } from '../../content/dialogue';
import { toggleFullscreen, bindFullscreenHotkey } from '../fullscreen';
import { makeLabel, rect } from '../gfx';
import { SCREEN } from '../layout';
import { UiSceneKeys } from '../shared';
import type { UiShared } from '../shared';
import { Menu } from '../widgets';

interface SettingsData {
  readonly returnTo?: string;
}

export class SettingsScene extends Phaser.Scene {
  private menu: Menu | null = null;
  private returnTo: string | null = null;

  constructor(private readonly shared: UiShared) {
    super(UiSceneKeys.Settings);
  }

  init(data: SettingsData): void {
    this.returnTo = data.returnTo ?? null;
  }

  create(): void {
    const { source, hooks } = this.shared;
    bindFullscreenHotkey(this.game);
    const w = 220;
    const x = (SCREEN.width - w) / 2;
    rect(this, 0, 0, SCREEN.width, SCREEN.height, 'ink');
    makeLabel(this, SCREEN.width / 2, 60, text('ui.menu.settings'), 'bone', { anchor: 'centre' });
    const set = (patch: Partial<{ musicVolume: number; effectsVolume: number }>): void =>
      source.setAudioSettings({ ...source.audioSettings(), ...patch });
    this.menu = new Menu(
      this,
      [
        { kind: 'slider', label: () => text('ui.settings.music'), get: () => source.audioSettings().musicVolume, set: (v) => set({ musicVolume: v }) },
        { kind: 'slider', label: () => text('ui.settings.effects'), get: () => source.audioSettings().effectsVolume, set: (v) => set({ effectsVolume: v }) },
        { kind: 'toggle', label: () => text('ui.settings.fullscreen'), get: () => this.scale.isFullscreen, set: () => toggleFullscreen(this.game) },
        { kind: 'button', label: () => text('ui.menu.back'), onSelect: () => this.back() },
      ],
      { x, y: 80, width: w, hooks },
    );
    makeLabel(this, SCREEN.width / 2, 150, text('ui.settings.fullscreenHint'), 'steel', { anchor: 'centre' });
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, () => this.menu?.refresh());
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, () => this.menu?.refresh());
    // Keyup so the HUD's keydown handler for Esc never sees the same press.
    this.input.keyboard?.on('keyup-ESC', () => this.back());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.menu?.destroy();
      this.menu = null;
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN);
    });
  }

  private back(): void {
    const target = this.returnTo;
    this.scene.stop();
    if (target !== null) this.scene.wake(target);
  }
}
