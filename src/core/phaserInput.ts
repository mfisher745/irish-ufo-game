/**
 * Thin Phaser adapter for `InputTracker`: keyboard by `KeyboardEvent.code`,
 * mouse buttons, wheel and the pointer's world position.
 */

import Phaser from 'phaser';
import { InputTracker } from './input';
import type { InputFrame } from './types';

export class PhaserInput {
  readonly tracker = new InputTracker();
  private readonly offs: (() => void)[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      kb.addCapture([Phaser.Input.Keyboard.KeyCodes.TAB, Phaser.Input.Keyboard.KeyCodes.SPACE]);
      const down = (e: KeyboardEvent): void => this.tracker.keyDown(e.code);
      const up = (e: KeyboardEvent): void => this.tracker.keyUp(e.code);
      kb.on('keydown', down);
      kb.on('keyup', up);
      this.offs.push(() => kb.off('keydown', down), () => kb.off('keyup', up));
    }
    scene.input.mouse?.disableContextMenu();
    const pDown = (p: Phaser.Input.Pointer): void => {
      if (p.button === 0) this.tracker.mouseDown('left');
      else if (p.button === 2) this.tracker.mouseDown('right');
    };
    const pUp = (p: Phaser.Input.Pointer): void => {
      if (p.button === 0) this.tracker.mouseUp('left');
      else if (p.button === 2) this.tracker.mouseUp('right');
    };
    const wheel = (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number): void => {
      if (dy !== 0) this.tracker.wheel(dy > 0 ? 'down' : 'up');
    };
    scene.input.on('pointerdown', pDown);
    scene.input.on('pointerup', pUp);
    scene.input.on('wheel', wheel);
    const blur = (): void => this.tracker.releaseAll();
    scene.game.events.on(Phaser.Core.Events.BLUR, blur);
    this.offs.push(
      () => scene.input.off('pointerdown', pDown),
      () => scene.input.off('pointerup', pUp),
      () => scene.input.off('wheel', wheel),
      () => scene.game.events.off(Phaser.Core.Events.BLUR, blur),
    );
  }

  frame(dtMs: number): InputFrame {
    const p = this.scene.input.activePointer;
    const world = p.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    this.tracker.setAim({ x: world.x, y: world.y });
    return this.tracker.frame(dtMs);
  }

  destroy(): void {
    for (const off of this.offs.splice(0)) off();
  }
}
