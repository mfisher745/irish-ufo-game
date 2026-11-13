/**
 * The three lights over the bog at the end of chapter 1 (the `PROP.bogLights`
 * frames), drawn in screen space by the HUD scene while the sighting scene is
 * on. The bog road is a fixed one-screen view, so a screen-space effect lands
 * in the right place. The world view has no props layer yet; when it does,
 * this can move there.
 */

import Phaser from 'phaser';
import { PALETTE, PROP, PROPS_KEY } from '../art';

/** Dialogue sequence that starts the effect. */
export const LIGHTS_SEQUENCE = 'c1.lights.seen';

const DRIFT_MS = 8000;
const SINK_MS = 4000;
const FRAME_MS = 280;
/** Where the lights hover, and where the hill hides them (screen pixels, 480 x 270). */
const START = { x: 300, y: 186 };
const DRIFT = { x: -96, y: -6 };
const SINK = 46;
const HILL_TOP = 224;

export class SkyLights {
  private readonly image: Phaser.GameObjects.Image;
  private readonly hill: Phaser.GameObjects.Graphics;
  private startedAt = -1;

  constructor(private readonly scene: Phaser.Scene, depth: number) {
    this.image = scene.add.image(START.x, START.y, PROPS_KEY, PROP.bogLights[0]).setDepth(depth).setVisible(false);
    // A low hill in front of the bog: a polygon in the darkest ink.
    this.hill = scene.add.graphics().setDepth(depth + 1).setVisible(false);
    this.hill.fillStyle(PALETTE.ink, 1);
    this.hill.fillPoints(
      [
        new Phaser.Geom.Point(110, 252),
        new Phaser.Geom.Point(150, HILL_TOP + 8),
        new Phaser.Geom.Point(210, HILL_TOP),
        new Phaser.Geom.Point(270, HILL_TOP + 4),
        new Phaser.Geom.Point(330, HILL_TOP + 14),
        new Phaser.Geom.Point(380, 252),
      ],
      true,
    );
  }

  start(): void {
    this.startedAt = this.scene.time.now;
    this.image.setVisible(true);
    this.hill.setVisible(true);
  }

  stop(): void {
    this.startedAt = -1;
    this.image.setVisible(false);
    this.hill.setVisible(false);
  }

  update(): void {
    if (this.startedAt < 0) return;
    const t = this.scene.time.now - this.startedAt;
    const drift = Math.min(1, t / DRIFT_MS);
    const sink = Phaser.Math.Clamp((t - DRIFT_MS) / SINK_MS, 0, 1);
    this.image.setPosition(Math.round(START.x + DRIFT.x * drift), Math.round(START.y + DRIFT.y * drift + SINK * sink));
    this.image.setFrame(PROP.bogLights[Math.floor(t / FRAME_MS) % PROP.bogLights.length] ?? PROP.bogLights[0]);
    // Gone once it has sunk behind the hill.
    this.image.setVisible(sink < 1);
  }
}
