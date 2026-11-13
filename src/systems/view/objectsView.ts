/**
 * World objects drawn as themselves (DESIGN.md 8: "Things Andrew can pick up
 * or examine are drawn as themselves with a small glint, never as abstract
 * markers"): pickups as their icon with the `fx.pickupGlint` twinkle, the
 * `icon.interact` icon over an examinable only while Andrew is in range,
 * push-puzzle pieces as their prop frame with a faint mark on target cells,
 * and Myko's smoke puff. Reads the run; never changes it.
 */

import Phaser from 'phaser';
import { fx, icon, PALETTE, PROPS_KEY, PROP, TEX } from '../../art';
import type { PickupItem, Vec2 } from '../../core/types';
import { TILE } from '../grid';
import type { ChapterRun } from '../run';

/** Presentation timings (not balance). */
const GLINT_FPS = 2;
const PUFF_FPS = 1.5;
const PUFF_FADE_MS = 600;
const PICKUP_BOB_PX = 1;
const FLOOR_DEPTH = -900;
/** Above characters, below the night tint. */
const ICON_DEPTH = 8000;
const GLINT_ANIM = 'fx.pickupGlint.loop';
const PUFF_ANIM = 'fx.smokePuff.loop';

interface PickupSprites {
  readonly icon: Phaser.GameObjects.Image;
  readonly glint: Phaser.GameObjects.Sprite;
}

export function pickupIconFrame(item: PickupItem): string {
  switch (item.kind) {
    case 'drink':
      return icon.drink(item.drinkId);
    case 'food':
      return icon.food(item.foodId);
    case 'empties':
      return icon.empty;
  }
}

export class ObjectsView {
  private readonly pickups = new Map<string, PickupSprites>();
  private readonly pieces = new Map<string, Phaser.GameObjects.Image>();
  private readonly fixed: Phaser.GameObjects.Image[] = [];
  private readonly floor: Phaser.GameObjects.Graphics;
  private examineIcon: Phaser.GameObjects.Image | null = null;
  private puff: Phaser.GameObjects.Sprite | null = null;
  private puffFadeMs = 0;
  private screenId = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly run: ChapterRun,
  ) {
    this.floor = scene.add.graphics().setDepth(FLOOR_DEPTH);
    this.ensureAnims();
  }

  /** `mykoHead` is the top of Myko's sprite, for the puff. */
  sync(dtMs: number, mykoHead: Vec2): void {
    if (this.run.screenId !== this.screenId) this.rebuild();
    this.syncPickups();
    this.syncPuzzles();
    this.syncExamine();
    this.syncPuff(dtMs, mykoHead);
  }

  destroy(): void {
    this.clear();
    this.floor.destroy();
    this.examineIcon?.destroy();
    this.puff?.destroy();
  }

  // -------------------------------------------------------------------------

  private ensureAnims(): void {
    const anims = this.scene.anims;
    if (!this.scene.textures.exists(TEX.fx)) return;
    if (!anims.exists(GLINT_ANIM)) anims.create({ key: GLINT_ANIM, frames: fx.pickupGlint.map((frame) => ({ key: TEX.fx, frame })), frameRate: GLINT_FPS, repeat: -1 });
    if (!anims.exists(PUFF_ANIM)) anims.create({ key: PUFF_ANIM, frames: fx.smokePuff.map((frame) => ({ key: TEX.fx, frame })), frameRate: PUFF_FPS, repeat: -1 });
  }

  private clear(): void {
    for (const p of this.pickups.values()) {
      p.icon.destroy();
      p.glint.destroy();
    }
    this.pickups.clear();
    for (const p of this.pieces.values()) p.destroy();
    this.pieces.clear();
    for (const f of this.fixed) f.destroy();
    this.fixed.length = 0;
    this.floor.clear();
  }

  private rebuild(): void {
    this.clear();
    this.screenId = this.run.screenId;
    const props = this.scene.textures.exists(PROPS_KEY);
    for (const { placement } of this.run.pushPuzzlesHere()) {
      // A faint floor mark on the cells the pieces must clear or fill.
      for (const c of placement.layout.goal.cells) this.floor.fillStyle(PALETTE.ink, 0.18).fillRect(c.col * TILE + 2, c.row * TILE + 2, TILE - 4, TILE - 4);
      if (!props) continue;
      for (const f of placement.layout.fixed) {
        this.fixed.push(this.scene.add.image(f.col * TILE, f.row * TILE, PROPS_KEY, PROP.crate).setOrigin(0, 0).setDepth(f.row * TILE + TILE));
      }
    }
  }

  private syncPickups(): void {
    const seen = new Set<string>();
    const t = this.scene.time.now;
    for (const p of this.run.pickups()) {
      const id = p.def.id;
      seen.add(id);
      let s = this.pickups.get(id);
      const frame = pickupIconFrame(p.item);
      if (!s) {
        const iconImg = this.scene.add.image(0, 0, TEX.icons, frame).setOrigin(0.5, 1);
        const glint = this.scene.add.sprite(0, 0, TEX.fx, fx.pickupGlint[0]).setOrigin(0.5, 0.5);
        if (this.scene.anims.exists(GLINT_ANIM)) glint.play({ key: GLINT_ANIM, startFrame: id.length % fx.pickupGlint.length });
        s = { icon: iconImg, glint };
        this.pickups.set(id, s);
      }
      if (s.icon.frame.name !== frame && this.scene.textures.get(TEX.icons).has(frame)) s.icon.setFrame(frame);
      const bob = Math.round(Math.sin(t / 400 + id.length) * PICKUP_BOB_PX);
      const x = Math.round(p.def.position.x);
      const y = Math.round(p.def.position.y + 4);
      s.icon.setPosition(x, y + bob).setDepth(p.def.position.y);
      s.glint.setPosition(x + 3, y - 9 + bob).setDepth(p.def.position.y + 0.5);
    }
    for (const [id, s] of this.pickups) {
      if (seen.has(id)) continue;
      s.icon.destroy();
      s.glint.destroy();
      this.pickups.delete(id);
    }
  }

  private syncPuzzles(): void {
    if (!this.scene.textures.exists(PROPS_KEY)) return;
    for (const { puzzle, placement } of this.run.pushPuzzlesHere()) {
      const frame = this.scene.textures.get(PROPS_KEY).has(placement.pieceKind) ? placement.pieceKind : PROP.keg;
      for (const piece of puzzle.pieceDrawPositions()) {
        const key = `${placement.sectionId}:${piece.id}`;
        let img = this.pieces.get(key);
        if (!img) {
          img = this.scene.add.image(0, 0, PROPS_KEY, frame).setOrigin(0.5, 0.5);
          this.pieces.set(key, img);
        }
        img.setPosition(Math.round(piece.pos.x), Math.round(piece.pos.y)).setDepth(piece.pos.y + TILE / 2);
      }
    }
  }

  /** The interact icon floats over a plain examinable while Andrew is in range (NPCs show the talk label instead). */
  private syncExamine(): void {
    const target = this.run.interactTarget();
    if (!target || target.kind !== 'examine' || !this.scene.textures.exists(TEX.icons)) {
      this.examineIcon?.setVisible(false);
      return;
    }
    if (!this.examineIcon) this.examineIcon = this.scene.add.image(0, 0, TEX.icons, icon.interact).setOrigin(0.5, 1).setDepth(ICON_DEPTH);
    this.examineIcon.setPosition(Math.round(target.position.x), Math.round(target.position.y - 10)).setVisible(true);
  }

  /** A puff that hangs round Myko's head while he smokes and fades once he moves. */
  private syncPuff(dtMs: number, head: Vec2): void {
    const smoking = this.run.myko.smoking;
    if (smoking) {
      if (!this.puff) {
        this.puff = this.scene.add.sprite(0, 0, TEX.fx, fx.smokePuff[0]).setOrigin(0.5, 0.5);
        if (this.scene.anims.exists(PUFF_ANIM)) this.puff.play(PUFF_ANIM);
      }
      this.puffFadeMs = PUFF_FADE_MS;
      this.puff.setAlpha(1).setVisible(true);
    } else if (this.puff) {
      this.puffFadeMs = Math.max(0, this.puffFadeMs - dtMs);
      this.puff.setAlpha(this.puffFadeMs / PUFF_FADE_MS);
      if (this.puffFadeMs === 0) {
        this.puff.destroy();
        this.puff = null;
      }
    }
    this.puff?.setPosition(Math.round(head.x + 4), Math.round(head.y + 7)).setDepth(this.run.myko.pos.y + 1);
  }
}
