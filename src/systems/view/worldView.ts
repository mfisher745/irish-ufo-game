/**
 * Phaser view of a `ChapterRun`. Reads the simulation each frame and draws
 * it; never changes it. Uses generated art from `src/art/` when a texture
 * exists and falls back to tinted rectangles when it does not, so the game
 * runs before (or without) the art. docs/style-guide.md sections 3 and 4.
 *
 * In normal play nothing is drawn that is not part of the world (DESIGN.md
 * 8): telegraphs, vision cones, health bars and the aim reticle stay because
 * they are gameplay. Checkpoints, exits, examinable boxes, hiding-prop radii,
 * sensor and mast ranges and push-puzzle bounds are drawn only with
 * `?debug=1` (`WorldViewOptions.debug`).
 */

import Phaser from 'phaser';
import { animKey, frameName, PALETTE, TEX, tilesetKey } from '../../art';
import type { Facing, RegionId, Vec2 } from '../../core/types';
import type { EnemyActor } from '../enemies';
import { facingFromAngle, fromAngle, toRad } from '../geometry';
import { TILE } from '../grid';
import type { ChapterRun } from '../run';
import { DressingView } from './dressingView';
import { ObjectsView } from './objectsView';

export interface WorldViewOptions {
  /** Draw the debug shapes (checkpoints, areas, radii). `?debug=1`. */
  readonly debug?: boolean;
}

/** Andrew's sprite height (16 x 28) and Myko's (16 x 32); feet are at `pos.y + FEET_OFFSET`. */
const ANDREW_H = 28;
const MYKO_H = 32;
const FEET_OFFSET = 4;

type Body = Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;

interface KeyedBody {
  readonly body: Body;
  readonly textureKey: string;
}

const CONE_ALPHA = 0.4;

export class WorldView {
  private staticLayer: Phaser.GameObjects.Graphics | null = null;
  private tileImages: Phaser.GameObjects.Image[] = [];
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly bodies = new Map<string, KeyedBody>();
  private readonly dressing: DressingView;
  private readonly objects: ObjectsView;
  private readonly debug: boolean;
  private screenId = '';
  readonly playerBody: Body;
  private readonly mykoBody: Body;
  private mykoWasSmoking = false;
  private lastSync = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly run: ChapterRun,
    opts: WorldViewOptions = {},
  ) {
    this.debug = opts.debug === true;
    this.g = scene.add.graphics().setDepth(10000);
    this.playerBody = this.makeBody(TEX.andrew, 16, ANDREW_H, PALETTE.anorak);
    this.mykoBody = this.makeBody(TEX.myko, 16, MYKO_H, PALETTE.mykoCoat);
    this.dressing = new DressingView(scene, run);
    this.objects = new ObjectsView(scene, run);
    this.buildScreen();
  }

  /** Call once per frame after the simulation ticks. */
  sync(): void {
    if (this.run.screenId !== this.screenId) this.buildScreen();
    const r = this.run;
    const p = r.player;
    this.place(this.playerBody, p.pos, TEX.andrew, p.moving ? 'walk' : 'idle', p.facing);
    if (this.playerBody instanceof Phaser.GameObjects.Rectangle) {
      this.playerBody.setAlpha(p.invulnerable && !p.protected_ ? 0.5 : 1);
      this.playerBody.setFillStyle(p.incapacitated ? PALETTE.fog : PALETTE.anorak);
    }
    this.syncMyko();

    const seen = new Set<string>();
    for (const a of r.enemies()) {
      seen.add(a.instanceId);
      const body = this.bodyFor(a.instanceId, a.spriteKey, 16, 22, this.enemyColour(a));
      this.place(body, a.pos, a.spriteKey, a.down ? 'down' : a.status === 'telegraphing' ? 'telegraph' : 'walk', facingFromAngle(a.facingDeg));
      if (body instanceof Phaser.GameObjects.Rectangle) {
        body.setFillStyle(a.down ? PALETTE.coal : a.status === 'telegraphing' ? PALETTE.alarm : a.disguised ? PALETTE.lime : this.enemyColour(a));
        body.setAlpha(a.down ? 0.5 : 1);
      }
    }
    for (const gd of r.guardsHere()) {
      seen.add(gd.instanceId);
      const key = `enemy.${gd.enemyId}`;
      const body = this.bodyFor(gd.instanceId, key, 16, 22, PALETTE.navy);
      this.place(body, gd.pos, key, 'walk', facingFromAngle(gd.facingDeg));
    }
    for (const [id, kb] of this.bodies) {
      if (!seen.has(id)) {
        kb.body.destroy();
        this.bodies.delete(id);
      }
    }
    this.dressing.sync();
    const now = this.scene.time.now;
    const dt = this.lastSync < 0 ? 0 : now - this.lastSync;
    this.lastSync = now;
    this.objects.sync(dt, { x: r.myko.pos.x, y: r.myko.pos.y + FEET_OFFSET - MYKO_H });
    this.drawDynamic();
  }

  /** Walks when moving; the `smoke` animation once when a smoke starts, then idle. */
  private syncMyko(): void {
    const m = this.run.myko;
    const body = this.mykoBody;
    const startSmoke = m.smoking && !this.mykoWasSmoking;
    this.mykoWasSmoking = m.smoking;
    const smokeKey = animKey(TEX.myko, 'smoke', m.facing);
    if (body instanceof Phaser.GameObjects.Sprite) {
      if (startSmoke && this.scene.anims.exists(smokeKey)) {
        body.play(smokeKey);
      }
      const smokingAnim = body.anims.isPlaying && body.anims.currentAnim?.key === smokeKey;
      if (smokingAnim && !m.moving) {
        body.setPosition(Math.round(m.pos.x), Math.round(m.pos.y + FEET_OFFSET)).setDepth(m.pos.y);
        return;
      }
    }
    this.place(body, m.pos, TEX.myko, m.moving ? 'walk' : 'idle', m.facing);
  }

  destroy(): void {
    this.staticLayer?.destroy();
    for (const t of this.tileImages) t.destroy();
    for (const b of this.bodies.values()) b.body.destroy();
    this.bodies.clear();
    this.dressing.destroy();
    this.objects.destroy();
    this.g.destroy();
    this.playerBody.destroy();
    this.mykoBody.destroy();
  }

  // -------------------------------------------------------------------------

  private buildScreen(): void {
    const layout = this.run.screenLayout;
    this.screenId = layout.id;
    this.staticLayer?.destroy();
    for (const t of this.tileImages) t.destroy();
    this.tileImages = [];
    for (const b of this.bodies.values()) b.body.destroy();
    this.bodies.clear();

    const grid = layout.grid;
    const region = this.run.module.def.screens.find((s) => s.id === layout.id)?.region ?? 'kilnamoe';
    const tex = tilesetKey(region as RegionId);
    const g = this.scene.add.graphics().setDepth(-1000);
    this.staticLayer = g;
    const useTiles = layout.tiles !== undefined && this.scene.textures.exists(tex);
    for (let row = 0; row < grid.heightTiles; row++) {
      for (let col = 0; col < grid.widthTiles; col++) {
        const i = row * grid.widthTiles + col;
        const frame = layout.tiles?.[i] ?? -1;
        if (useTiles && frame >= 0) {
          this.tileImages.push(this.scene.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, tex, frame).setDepth(-1001));
          continue;
        }
        const blocked = grid.blocked[i] === true;
        const sight = grid.blocksSight[i] === true;
        const shade = grid.shade?.[i] === true;
        const colour = blocked && sight ? PALETTE.slate : blocked ? PALETTE.steel : sight ? PALETTE.turf : shade ? PALETTE.mossDark : PALETTE.coal;
        g.fillStyle(colour, 1).fillRect(col * TILE, row * TILE, TILE, TILE);
        if (!blocked) g.lineStyle(1, PALETTE.ink, 0.25).strokeRect(col * TILE, row * TILE, TILE, TILE);
      }
    }
    if (this.debug) for (const ex of layout.exits) g.fillStyle(PALETTE.amberLight, 0.6).fillRect(ex.area.x, ex.area.y, ex.area.width, ex.area.height);
    // A screen smaller than the view is centred; the camera background (the void tile's ink) fills the rest.
    const cam = this.scene.cameras.main;
    const w = grid.widthTiles * TILE;
    const h = grid.heightTiles * TILE;
    const bx = w < cam.width ? -Math.floor((cam.width - w) / 2) : 0;
    const by = h < cam.height ? -Math.floor((cam.height - h) / 2) : 0;
    cam.setBackgroundColor(PALETTE.ink);
    cam.setBounds(bx, by, Math.max(w, cam.width), Math.max(h, cam.height));
  }

  private drawDynamic(): void {
    const g = this.g;
    const r = this.run;
    g.clear();

    // Pickups, examinables, puzzle pieces and Myko's smoke are world sprites (ObjectsView).
    if (this.debug) this.drawDebug();

    // Vision cones and detection.
    for (const { runner } of r.stealthHere()) {
      if (!runner.active) continue;
      for (const gd of runner.guards) {
        const c = gd.cone();
        this.cone(gd.pos, gd.facingDeg, c.range, c.angleDeg, gd.alert === 'detecting' || gd.alert === 'alarm' ? PALETTE.alarm : PALETTE.amberLight);
        if (gd.detection > 0) this.bar(gd.pos.x - 8, gd.pos.y - 18, 16, gd.detection, PALETTE.alarm);
      }
      for (const h of runner.hazards) {
        const c = h.cone();
        if (c && h.enabled) this.cone(h.pos, h.facingDeg, c.range, c.angleDeg, h.detection > 0 ? PALETTE.alarm : PALETTE.amberLight);
        if (this.debug && h.def.kind === 'groundSensor') g.lineStyle(1, h.enabled ? PALETTE.alarm : PALETTE.steel, 0.5).strokeCircle(h.pos.x, h.pos.y, h.def.radius);
        if (this.debug && h.def.kind === 'thermalMast') g.lineStyle(1, PALETTE.amber, 0.4).strokeCircle(h.pos.x, h.pos.y, h.def.range);
        if (h.detection > 0) this.bar(h.pos.x - 8, h.pos.y - 14, 16, h.detection, PALETTE.alarm);
      }
    }

    // Telegraphs and enemy health.
    for (const a of r.enemies()) {
      if (a.down) continue;
      if (a.status === 'telegraphing' && a.currentAttack) this.telegraph(a);
      if (a.health < a.stats.maxHealth) this.bar(a.pos.x - 8, a.pos.y - 16, 16, a.health / a.stats.maxHealth, PALETTE.grass);
      if (a.stats.frontalShieldDeg) {
        const half = a.stats.frontalShieldDeg / 2;
        g.lineStyle(2, PALETTE.fluoro, 0.8).beginPath().arc(a.pos.x, a.pos.y, 10, toRad(a.facingDeg - half), toRad(a.facingDeg + half)).strokePath();
      }
      if (a.status === 'stunned') g.lineStyle(1, PALETTE.fluoro, 0.9).strokeCircle(a.pos.x, a.pos.y - 14, 3);
    }

    // Projectiles.
    for (const p of r.projectiles()) {
      if (p.shape.lobbed) g.fillStyle(PALETTE.ink, 0.4).fillEllipse(p.pos.x, p.pos.y, 6, 3);
      g.fillStyle(p.owner === 'player' ? PALETTE.bone : PALETTE.alarm, 1).fillCircle(p.pos.x, p.pos.y - p.height, 2);
    }

    // Short effects.
    for (const f of r.fx) {
      const alpha = Math.max(0, Math.min(1, f.ttlMs / 200));
      switch (f.kind) {
        case 'swing':
          this.cone(f.pos, f.angleDeg, f.radius, f.arcDeg, PALETTE.white, alpha * 0.5);
          break;
        case 'breath':
          this.cone(f.pos, f.angleDeg, f.radius, f.arcDeg, PALETTE.amber, alpha * 0.7);
          break;
        case 'slam':
        case 'glove':
          g.lineStyle(2, f.kind === 'glove' ? PALETTE.fluoro : PALETTE.amberLight, alpha).strokeCircle(f.pos.x, f.pos.y, f.radius);
          break;
        case 'impact':
          g.lineStyle(1, PALETTE.bone, alpha).strokeCircle(f.pos.x, f.pos.y, f.radius);
          break;
        case 'hit':
          g.fillStyle(PALETTE.white, alpha).fillCircle(f.pos.x, f.pos.y - 6, 3);
          break;
        case 'blocked':
          g.lineStyle(2, PALETTE.fluoro, alpha).strokeCircle(f.pos.x, f.pos.y, 8);
          break;
      }
    }

    // Aim reticle and Sliotar charge.
    const pl = r.player;
    g.lineStyle(1, PALETTE.white, 0.6).strokeCircle(pl.aimPoint.x, pl.aimPoint.y, 3);
    const charge = pl.abilities.chargeProgress();
    // Just above Andrew's head (his sprite is ANDREW_H tall, feet at pos.y + FEET_OFFSET).
    if (charge > 0) this.bar(pl.pos.x - 8, pl.pos.y + FEET_OFFSET - ANDREW_H - 3, 16, charge, PALETTE.amberLight);
  }

  /** `?debug=1`: checkpoints, examinable boxes, triggers, section areas, entrances, spawn points, hiding radii, puzzle bounds. */
  private drawDebug(): void {
    const g = this.g;
    const r = this.run;
    const here = r.screenId;
    const area = (a: { x: number; y: number; width: number; height: number }, colour: number): void => void g.lineStyle(1, colour, 0.6).strokeRect(a.x, a.y, a.width, a.height);
    const dot = (p: Vec2, colour: number): void => void g.fillStyle(colour, 0.8).fillCircle(p.x, p.y, 2);
    for (const cp of r.module.def.checkpoints) if (cp.screenId === here) g.lineStyle(1, PALETTE.white, 0.5).strokeCircle(cp.position.x, cp.position.y, 6);
    for (const e of r.examinablesHere()) {
      g.fillStyle(PALETTE.amberLight, 0.9).fillTriangle(e.position.x - 4, e.position.y - 10, e.position.x + 4, e.position.y - 10, e.position.x, e.position.y - 4);
      g.lineStyle(1, PALETTE.amberLight, 0.8).strokeRect(e.position.x - 5, e.position.y - 5, 10, 10);
    }
    for (const t of r.module.triggers) if (t.screenId === here) area(t.area, PALETTE.magenta);
    for (const f of r.module.fights) {
      if (f.screenId !== here) continue;
      if (f.trigger.kind === 'area') area(f.trigger.area, PALETTE.alarm);
      dot(f.entrance, PALETTE.lime);
      for (const s of f.spawnPoints) dot(s, PALETTE.alarm);
    }
    for (const b of r.module.bosses) {
      if (b.screenId !== here) continue;
      if (b.trigger.kind === 'area') area(b.trigger.area, PALETTE.alarm);
      if (b.exitArea) area(b.exitArea, PALETTE.lime);
      dot(b.entrance, PALETTE.lime);
    }
    for (const s of r.module.stealth) {
      if (s.screenId !== here) continue;
      area(s.startArea, PALETTE.amber);
      area(s.exitArea, PALETTE.lime);
      dot(s.entrance, PALETTE.lime);
    }
    for (const { placement } of r.pushPuzzlesHere()) {
      const a = placement.layout.area;
      g.lineStyle(1, PALETTE.amberLight, 0.3).strokeRect(a.col * TILE, a.row * TILE, a.width * TILE, a.height * TILE);
    }
    for (const { runner } of r.stealthHere()) {
      for (const prop of runner.def.hidingProps) g.lineStyle(1, PALETTE.white, 0.6).strokeCircle(prop.position.x, prop.position.y, prop.radius);
    }
  }

  private telegraph(a: EnemyActor): void {
    const atk = a.currentAttack;
    if (!atk) return;
    const g = this.g;
    const s = atk.shape;
    switch (s.kind) {
      case 'arc':
        this.cone(a.pos, a.currentAttackDir, s.range, s.arcDeg, PALETTE.alarm, 0.35);
        break;
      case 'cone':
        this.cone(a.pos, a.currentAttackDir, s.range, s.angleDeg, PALETTE.alarm, 0.35);
        break;
      case 'circle':
        g.fillStyle(PALETTE.alarm, 0.3).fillCircle(a.pos.x, a.pos.y, s.radius);
        break;
      case 'charge': {
        const end = fromAngle(a.currentAttackDir, s.distance);
        g.lineStyle(s.width, PALETTE.alarm, 0.25).lineBetween(a.pos.x, a.pos.y, a.pos.x + end.x, a.pos.y + end.y);
        break;
      }
      case 'projectile': {
        const end = fromAngle(a.currentAttackDir, Math.min(s.range, 40));
        g.lineStyle(1, PALETTE.alarm, 0.7).lineBetween(a.pos.x, a.pos.y, a.pos.x + end.x, a.pos.y + end.y);
        break;
      }
      case 'none':
        break;
    }
  }

  private cone(pos: Vec2, facingDeg: number, range: number, angleDeg: number, colour: number, alpha = CONE_ALPHA): void {
    const g = this.g;
    g.fillStyle(colour, alpha);
    g.slice(pos.x, pos.y, range, toRad(facingDeg - angleDeg / 2), toRad(facingDeg + angleDeg / 2), false);
    g.fillPath();
  }

  private bar(x: number, y: number, w: number, fraction: number, colour: number): void {
    this.g.fillStyle(PALETTE.ink, 0.8).fillRect(x, y, w, 2);
    this.g.fillStyle(colour, 1).fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), 2);
  }

  private enemyColour(a: EnemyActor): number {
    if (!a.enemyId) return PALETTE.brickDark;
    return a.enemyId === 'suit' || a.enemyId === 'agent' ? PALETTE.navy : PALETTE.brick;
  }

  /** The body for an actor; rebuilt when its texture changes (`BossRunner.setSprite`). */
  private bodyFor(id: string, textureKey: string, w: number, h: number, colour: number): Body {
    const kb = this.bodies.get(id);
    if (kb && kb.textureKey === textureKey) return kb.body;
    kb?.body.destroy();
    const body = this.makeBody(textureKey, w, h, colour);
    this.bodies.set(id, { body, textureKey });
    return body;
  }

  private makeBody(textureKey: string, w: number, h: number, colour: number): Body {
    if (this.scene.textures.exists(textureKey)) {
      return this.scene.add.sprite(0, 0, textureKey).setOrigin(0.5, 1);
    }
    return this.scene.add.rectangle(0, 0, w - 4, h - 4, colour).setOrigin(0.5, 1).setStrokeStyle(1, PALETTE.ink);
  }

  /** Positions a body by its feet; plays an animation when one exists. */
  private place(body: Body, pos: Vec2, textureKey: string, anim: string, facing: Facing): void {
    body.setPosition(Math.round(pos.x), Math.round(pos.y + FEET_OFFSET));
    body.setDepth(pos.y);
    if (body instanceof Phaser.GameObjects.Sprite) {
      const key = animKey(textureKey, anim, facing);
      if (this.scene.anims.exists(key)) {
        if (body.anims.currentAnim?.key !== key) body.play(key);
      } else {
        const frame = frameName(anim, facing, 0);
        if (this.scene.textures.get(textureKey).has(frame)) body.setFrame(frame);
      }
    }
  }
}
