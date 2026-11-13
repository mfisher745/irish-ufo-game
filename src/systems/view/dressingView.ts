/**
 * Draws a run's set dressing (props, standing NPCs), the screen ambience
 * (a palette tint with lights cut out of it) and the "talk" prompt over an
 * NPC Andrew can talk to. Reads `run.dressing`; never changes it.
 *
 * Depth: everything that stands on the floor is sorted by its feet (the
 * bottom edge of a prop, a character's `pos.y`), so Andrew walks behind and
 * in front of things. Floor props go under every character.
 */

import Phaser from 'phaser';
import { animKey, FONT_KEY, frameName, npcKey, PALETTE, PROPS_KEY } from '../../art';
import type { ColourName } from '../../art';
import type { ScreenId } from '../../core/types';
import { text } from '../../content/dialogue';
import type { LiveNpc, LiveProp } from '../dressing';
import { TILE } from '../grid';
import type { ChapterRun } from '../run';

/** Default frame rate of animated props when the placement gives none (presentation, not balance). */
const DEFAULT_PROP_FPS = 4;
/** Default glow strength of a light. */
const DEFAULT_GLOW = 0.25;
const FLOOR_DEPTH = -500;
export const AMBIENT_DEPTH = 9000;
const GLOW_DEPTH = 9001;
const PROMPT_DEPTH = 9500;
/** Radial falloff used to cut lights out of the darkness and to draw their glow. */
const LIGHT_KEY = 'fx.lightFalloff';
const LIGHT_SIZE = 64;

type NpcBody = Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;

interface PropObject {
  readonly obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  frame: string;
  anim: string;
}

export class DressingView {
  private readonly props = new Map<string, PropObject>();
  private readonly npcs = new Map<string, NpcBody>();
  private screenId: ScreenId | null = null;
  private version = -1;
  private darkness: Phaser.GameObjects.RenderTexture | null = null;
  private eraser: Phaser.GameObjects.Image | null = null;
  private glows: Phaser.GameObjects.Image[] = [];
  private prompt: Phaser.GameObjects.BitmapText | null = null;
  private promptBg: Phaser.GameObjects.Rectangle | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly run: ChapterRun,
  ) {
    ensureLightTexture(scene);
  }

  /** Call every frame after the simulation ticks. */
  sync(): void {
    if (this.run.screenId !== this.screenId) this.rebuild();
    if (this.run.dressing.version !== this.version) {
      this.version = this.run.dressing.version;
      for (const p of this.run.dressing.propsOn(this.run.screenId)) this.syncProp(p);
      this.rebuildGlows();
    }
    for (const n of this.run.dressing.npcsOn(this.run.screenId)) this.syncNpc(n);
    this.drawAmbient();
    this.syncPrompt();
  }

  destroy(): void {
    this.clear();
    this.darkness?.destroy();
    this.darkness = null;
    this.eraser?.destroy();
    this.eraser = null;
    this.prompt?.destroy();
    this.promptBg?.destroy();
  }

  // -------------------------------------------------------------------------

  private clear(): void {
    for (const p of this.props.values()) p.obj.destroy();
    this.props.clear();
    for (const n of this.npcs.values()) n.destroy();
    this.npcs.clear();
    for (const g of this.glows) g.destroy();
    this.glows = [];
  }

  private rebuild(): void {
    this.clear();
    const screenId = this.run.screenId;
    this.screenId = screenId;
    const scene = this.scene;
    const atlas = scene.textures.exists(PROPS_KEY) ? scene.textures.get(PROPS_KEY) : null;
    for (const p of this.run.dressing.propsOn(screenId)) {
      const obj = atlas?.has(p.frame)
        ? scene.add.sprite(0, 0, PROPS_KEY, p.frame).setOrigin(0, 0)
        : scene.add.rectangle(0, 0, TILE, TILE, PALETTE.steel).setOrigin(0, 0).setStrokeStyle(1, PALETTE.ink);
      this.props.set(p.key, { obj, frame: '', anim: '' });
    }
    for (const n of this.run.dressing.npcsOn(screenId)) {
      const key = npcKey(n.npc);
      const body = scene.textures.exists(key)
        ? scene.add.sprite(0, 0, key).setOrigin(0.5, 1)
        : scene.add.rectangle(0, 0, 12, 20, PALETTE.fog).setOrigin(0.5, 1).setStrokeStyle(1, PALETTE.ink);
      this.npcs.set(n.key, body);
    }
    this.version = -1;
  }

  private syncProp(p: LiveProp): void {
    const po = this.props.get(p.key);
    if (!po) return;
    const obj = po.obj;
    obj.setVisible(p.visible);
    obj.setPosition(p.col * TILE, p.row * TILE);
    if (obj instanceof Phaser.GameObjects.Sprite) {
      const anim = p.frames.length > 1 ? this.propAnim(p.frames, p.def.frameRate ?? DEFAULT_PROP_FPS) : '';
      if (anim !== po.anim) {
        po.anim = anim;
        if (anim) obj.play(anim);
        else obj.stop();
      }
      if (!anim && p.frame !== po.frame && this.scene.textures.get(PROPS_KEY).has(p.frame)) obj.setFrame(p.frame);
      po.frame = p.frame;
    }
    obj.setDepth(p.def.layer === 'floor' ? FLOOR_DEPTH : p.row * TILE + obj.height);
  }

  private propAnim(frames: readonly string[], fps: number): string {
    const key = `prop:${frames.join(',')}@${fps}`;
    if (!this.scene.anims.exists(key)) {
      const atlas = this.scene.textures.get(PROPS_KEY);
      this.scene.anims.create({
        key,
        frames: frames.filter((f) => atlas.has(f)).map((frame) => ({ key: PROPS_KEY, frame })),
        frameRate: fps,
        repeat: -1,
      });
    }
    return key;
  }

  private syncNpc(n: LiveNpc): void {
    const body = this.npcs.get(n.key);
    if (!body) return;
    body.setVisible(n.visible);
    body.setPosition(Math.round(n.pos.x), Math.round(n.pos.y + 4));
    body.setDepth(n.pos.y);
    if (body instanceof Phaser.GameObjects.Sprite) {
      const tex = npcKey(n.npc);
      const anim = n.def.anim ?? 'idle';
      const key = animKey(tex, anim, n.facing);
      if (this.scene.anims.exists(key)) {
        if (body.anims.currentAnim?.key !== key) body.play(key);
      } else {
        const frame = frameName(anim, n.facing, 0);
        if (this.scene.textures.get(tex).has(frame)) body.setFrame(frame);
      }
    }
  }

  private rebuildGlows(): void {
    for (const g of this.glows) g.destroy();
    this.glows = [];
    const amb = this.run.ambient();
    if (!amb || amb.strength <= 0) return;
    for (const l of amb.lights ?? []) {
      const glow = this.scene.add
        .image(l.x, l.y, LIGHT_KEY)
        .setDisplaySize(l.radius * 2, l.radius * 2)
        .setTint(colour(l.colour))
        .setAlpha(l.glow ?? DEFAULT_GLOW)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(GLOW_DEPTH);
      this.glows.push(glow);
    }
  }

  private drawAmbient(): void {
    const amb = this.run.ambient();
    if (!amb || amb.strength <= 0) {
      this.darkness?.setVisible(false);
      return;
    }
    const cam = this.scene.cameras.main;
    if (!this.darkness) {
      this.darkness = this.scene.add.renderTexture(0, 0, cam.width, cam.height).setOrigin(0, 0).setScrollFactor(0).setDepth(AMBIENT_DEPTH);
      this.eraser = this.scene.make.image({ key: LIGHT_KEY }, false);
    }
    const rt = this.darkness;
    rt.setVisible(true);
    rt.clear();
    rt.fill(colour(amb.tint), Math.min(1, amb.strength));
    const eraser = this.eraser;
    if (!eraser) return;
    for (const l of amb.lights ?? []) {
      eraser.setPosition(l.x - cam.scrollX, l.y - cam.scrollY).setDisplaySize(l.radius * 2, l.radius * 2);
      rt.erase(eraser);
    }
  }

  private syncPrompt(): void {
    const target = this.run.interactTarget();
    const npc = target?.kind === 'talk' && target.npcKey ? this.npcs.get(target.npcKey) : undefined;
    if (!npc || !npc.visible || !this.scene.cache.bitmapFont.exists(FONT_KEY)) {
      this.prompt?.setVisible(false);
      this.promptBg?.setVisible(false);
      return;
    }
    if (!this.prompt) {
      this.prompt = this.scene.add.bitmapText(0, 0, FONT_KEY, text('ui.prompt.talk')).setOrigin(0.5, 1).setDepth(PROMPT_DEPTH + 1);
      this.promptBg = this.scene.add.rectangle(0, 0, this.prompt.width + 4, this.prompt.height + 2, PALETTE.ink).setOrigin(0.5, 1).setDepth(PROMPT_DEPTH);
    }
    const x = Math.round(npc.x);
    const y = Math.round(npc.y - npc.displayHeight - 2);
    this.prompt.setPosition(x, y).setVisible(true);
    this.promptBg?.setPosition(x, y + 1).setVisible(true);
  }
}

function colour(name: ColourName): number {
  return PALETTE[name];
}

/** A white radial falloff, drawn once. A mask, not a sprite: palette colour is applied as a tint. */
function ensureLightTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(LIGHT_KEY)) return;
  const tex = scene.textures.createCanvas(LIGHT_KEY, LIGHT_SIZE, LIGHT_SIZE);
  if (!tex) return;
  const ctx = tex.context;
  const r = LIGHT_SIZE / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LIGHT_SIZE, LIGHT_SIZE);
  tex.refresh();
}
