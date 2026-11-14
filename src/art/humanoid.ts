/**
 * Procedural people. One generator draws Andrew, Myko, every human enemy and
 * NPC, and the aliens, from a `Look` (proportions and colours) and a `Pose`.
 * docs/style-guide.md section 2: three tones, light from the top left, a
 * 1-pixel ink outline, four facings.
 */

import type { Facing } from '../core/types';
import { animKey, frameName } from './keys';
import type { ColourName } from './palette';
import { PixelBuffer, SheetBuilder } from './pixels';
import type { Sheet } from './pixels';

export type Hat = 'none' | 'beanie' | 'cap' | 'hardhat';
export type Eyes = 'dot' | 'tired' | 'alien' | 'shades';
export type Item = 'none' | 'hurley' | 'bottle' | 'pint' | 'baton' | 'hook' | 'pistol' | 'box' | 'taser' | 'shield';
export type Arm = 'down' | 'out' | 'up' | 'guard' | 'pocket';

export interface Look {
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly headWidth: number;
  readonly headHeight: number;
  /** Torso width without arms. */
  readonly torsoWidth: number;
  readonly torsoHeight: number;
  readonly armWidth: number;
  readonly legLength: number;
  readonly legWidth: number;
  readonly skin: ColourName;
  readonly skinShade: ColourName;
  readonly hair?: ColourName;
  readonly hat?: Hat;
  readonly hatColour?: ColourName;
  readonly top: ColourName;
  readonly topShade: ColourName;
  /** Rows of the legs covered by the top (a long coat). */
  readonly coatLength?: number;
  readonly legs: ColourName;
  readonly shoes: ColourName;
  readonly eyes?: Eyes;
  readonly stubble?: boolean;
  /** A full beard in the hair colour: jaw, chin and sideburns. */
  readonly beard?: boolean;
  /** Myko's permanent half-smile. */
  readonly halfSmile?: boolean;
  /** A rolled cigarette at the corner of the mouth. */
  readonly rollie?: boolean;
  readonly tie?: ColourName;
  /** A horizontal band across the torso (hi-vis). */
  readonly band?: ColourName;
  /** A lanyard: a V at the collar and a card. */
  readonly lanyard?: ColourName;
  /** An apron or tea towel over the front. */
  readonly apron?: ColourName;
  /** Item carried in every pose unless the pose overrides it. */
  readonly carries?: Item;
}

export interface Pose {
  /** Walk phase 0 to 3; 0 and 2 are the passing positions. */
  readonly step?: 0 | 1 | 2 | 3;
  /** The arm on the side the character is facing (or the right arm when facing up or down). */
  readonly arm?: Arm;
  readonly otherArm?: Arm;
  /** Pixels the upper body shifts in the facing direction (negative leans back). */
  readonly lean?: number;
  /** Pixels the whole figure drops (crouch, stagger). */
  readonly drop?: number;
  /** Pixels the head rises (tipping back to drink). */
  readonly headUp?: number;
  readonly item?: Item;
  readonly eyesClosed?: boolean;
  /** Eyes shifted sideways by this many pixels (looking at nothing). */
  readonly glance?: number;
  /** Lying on the ground. */
  readonly lying?: boolean;
  /** Draw the whole figure in white (hurt flash, telegraph flash). */
  readonly flash?: boolean;
}

interface Geometry {
  readonly cx: number;
  readonly footY: number;
  readonly legsTop: number;
  readonly torsoTop: number;
  readonly headTop: number;
}

function geometry(look: Look, pose: Pose): Geometry {
  const drop = pose.drop ?? 0;
  const footY = look.cellHeight - 2;
  const legsTop = footY - Math.max(1, look.legLength - drop);
  const torsoTop = legsTop - look.torsoHeight;
  const headTop = torsoTop - look.headHeight - (pose.headUp ?? 0);
  return { cx: Math.floor(look.cellWidth / 2), footY, legsTop, torsoTop, headTop };
}

function drawItem(b: PixelBuffer, item: Item, hx: number, hy: number, dx: number, dy: number): void {
  // dx, dy point the way the item extends from the hand.
  switch (item) {
    case 'none':
      return;
    case 'hurley': {
      const ex = hx + dx * 7;
      const ey = hy + dy * 7;
      b.line(hx, hy, ex, ey, 'peat');
      b.rect(Math.min(ex, ex - dx) - (dy !== 0 ? 1 : 0), Math.min(ey, ey - dy) - (dx !== 0 ? 1 : 0), dx !== 0 ? 2 : 3, dy !== 0 ? 2 : 3, 'tan');
      return;
    }
    case 'baton':
      b.line(hx, hy, hx + dx * 5, hy + dy * 5, 'coal');
      return;
    case 'hook':
      b.line(hx, hy, hx + dx * 7, hy + dy * 7, 'steel');
      b.set(hx + dx * 7 + (dy !== 0 ? 1 : 0), hy + dy * 7 + (dx !== 0 ? 1 : 0), 'fog');
      b.set(hx + dx * 6 + (dy !== 0 ? 2 : 0), hy + dy * 6 + (dx !== 0 ? 2 : 0), 'fog');
      return;
    case 'bottle':
      b.rect(hx + (dx < 0 ? -1 : 0), hy - 3, 2, 3, 'moss');
      b.set(hx + (dx < 0 ? -1 : 0), hy - 4, 'mossDark');
      return;
    case 'pint':
      b.rect(hx + (dx < 0 ? -2 : 0), hy - 3, 3, 4, 'coal');
      b.hline(hx + (dx < 0 ? -2 : 0), hy - 3, 3, 'bone');
      return;
    case 'pistol':
      b.rect(hx + (dx < 0 ? -2 : 1), hy - 1, 2, 2, 'fog');
      b.set(hx + dx * 3, hy - 1 + dy, 'teal');
      return;
    case 'taser':
      b.rect(hx + (dx < 0 ? -2 : 1), hy - 1, 2, 2, 'amber');
      return;
    case 'box':
      b.rect(hx - 2, hy - 5, 5, 5, 'peat');
      b.hline(hx - 2, hy - 5, 5, 'tan');
      return;
    case 'shield':
      if (dx !== 0) b.rect(hx + dx * 2, hy - 6, 1, 10, 'teal');
      else b.rect(hx - 6, hy + dy * 2, 10, 1, 'teal');
      return;
  }
}

/** Draws a figure facing down, up or right. Left is the mirror of right. */
function drawStanding(b: PixelBuffer, look: Look, facing: 'down' | 'up' | 'right', pose: Pose): void {
  const g = geometry(look, pose);
  const side = facing === 'right';
  const back = facing === 'up';
  const lean = pose.lean ?? 0;
  // Upper-body offset from the lean.
  const ox = side ? lean : 0;
  const oy = side ? 0 : back ? -Math.sign(lean) * Math.min(1, Math.abs(lean)) : Math.sign(lean) * Math.min(1, Math.abs(lean));
  const step = pose.step ?? 0;

  // Legs and shoes.
  const lw = look.legWidth;
  const legLen = g.footY - g.legsTop;
  if (side) {
    const spread = step === 1 ? 1 : step === 3 ? -1 : 0;
    const backX = g.cx - lw + (spread === 0 ? 0 : -spread);
    const frontX = g.cx - (lw > 1 ? 1 : 0) + spread;
    b.rect(backX, g.legsTop, lw, legLen - (spread === -1 ? 1 : 0), look.legs);
    b.rect(backX, g.legsTop + legLen - (spread === -1 ? 1 : 0), lw + 1, 1, look.shoes);
    b.rect(frontX, g.legsTop, lw, legLen - (spread === 1 ? 1 : 0), look.legs);
    b.rect(frontX, g.legsTop + legLen - (spread === 1 ? 1 : 0), lw + 1, 1, look.shoes);
  } else {
    const gap = look.torsoWidth >= 6 ? 1 : 0;
    const leftX = g.cx - gap - lw + (gap === 0 ? 0 : 0);
    const rightX = g.cx + gap;
    const liftL = step === 1 ? 1 : 0;
    const liftR = step === 3 ? 1 : 0;
    b.rect(leftX, g.legsTop, lw, legLen - liftL, look.legs);
    b.rect(leftX, g.footY - liftL, lw, 1, look.shoes);
    b.rect(rightX, g.legsTop, lw, legLen - liftR, look.legs);
    b.rect(rightX, g.footY - liftR, lw, 1, look.shoes);
  }

  // Torso.
  const tw = side ? Math.max(3, look.torsoWidth - 2) : look.torsoWidth;
  const tx = g.cx - Math.floor(tw / 2) + ox;
  const ty = g.torsoTop + oy;
  const coat = look.coatLength ?? 0;
  const th = look.torsoHeight + coat;
  b.rect(tx, ty, tw, th, look.top);
  b.vline(tx + tw - 1, ty + 1, th - 1, look.topShade);
  b.hline(tx, ty + th - 1, tw, look.topShade);
  if (coat > 0 && !side) b.vline(g.cx + ox, ty + look.torsoHeight + 1, coat - 1, look.topShade);
  if (!back) {
    if (look.band !== undefined) b.hline(tx, ty + Math.floor(look.torsoHeight / 2), tw, look.band);
    if (look.apron !== undefined && !side) b.rect(tx + 1, ty + 2, tw - 2, th - 2, look.apron);
    if (look.tie !== undefined && !side) b.vline(g.cx + ox, ty, Math.min(3, look.torsoHeight), look.tie);
    if (look.lanyard !== undefined && !side) {
      b.set(g.cx - 1 + ox, ty, look.lanyard).set(g.cx + ox, ty + 1, look.lanyard).set(g.cx + ox, ty + 2, 'white');
    }
  }

  // Arms. Returns the hand position of the leading arm for items.
  const aw = look.armWidth;
  const armLen = Math.max(3, look.torsoHeight - 1);
  let hand = { x: tx + tw, y: ty + armLen };
  let itemDir = { dx: side ? 1 : 0, dy: side ? 0 : back ? -1 : 1 };
  const drawArm = (which: 'lead' | 'other', arm: Arm): void => {
    // When facing sideways only the leading arm shows, over the torso.
    if (side && which === 'other') return;
    const ax = side ? g.cx + ox - Math.floor(aw / 2) : which === 'lead' ? tx + tw : tx - aw;
    const colour = side ? look.topShade : look.top;
    let end = { x: ax, y: ty + armLen };
    switch (arm) {
      case 'down':
        b.rect(ax, ty + 1, aw, armLen - 1, colour);
        b.rect(ax, ty + armLen, aw, 1, look.skin);
        break;
      case 'pocket':
        b.rect(ax, ty + 1, aw, armLen - 2, colour);
        end = { x: ax, y: ty + armLen - 1 };
        break;
      case 'guard':
        b.rect(ax, ty + 1, aw, 2, colour);
        if (side) {
          b.rect(ax + 1, ty + 2, 2, aw, colour);
          b.rect(ax + 3, ty + 2, 1, aw, look.skin);
          end = { x: ax + 3, y: ty + 2 };
        } else {
          b.rect(ax, ty + 3, aw, 1, look.skin);
          end = { x: ax, y: ty + 3 };
        }
        break;
      case 'up':
        b.rect(ax, ty - 3, aw, 5, colour);
        b.rect(ax, ty - 4, aw, 1, look.skin);
        end = { x: ax, y: ty - 4 };
        break;
      case 'out':
        if (side) {
          b.rect(ax, ty + 1, 5, aw, colour);
          b.rect(ax + 5, ty + 1, 1, aw, look.skin);
          end = { x: ax + 5, y: ty + 1 };
        } else if (back) {
          b.rect(ax, ty - 2, aw, 4, colour);
          b.rect(ax, ty - 3, aw, 1, look.skin);
          end = { x: ax, y: ty - 3 };
        } else {
          b.rect(ax, ty + 1, aw, armLen + 1, colour);
          b.rect(ax, ty + armLen + 2, aw, 1, look.skin);
          end = { x: ax, y: ty + armLen + 2 };
        }
        break;
    }
    if (which === 'lead') {
      hand = end;
      if (arm === 'up') itemDir = { dx: 0, dy: -1 };
    }
  };
  drawArm('other', pose.otherArm ?? 'down');
  drawArm('lead', pose.arm ?? 'down');

  // Head.
  const hw = look.headWidth;
  const hh = look.headHeight;
  const hx = g.cx - Math.floor(hw / 2) + ox + (side ? 1 : 0);
  const hy = g.headTop + oy;
  b.rect(hx, hy, hw, hh, look.skin);
  b.vline(hx + hw - 1, hy + 1, hh - 1, look.skinShade);
  b.hline(hx + 1, hy + hh - 1, hw - 1, look.skinShade);
  // Rounded corners.
  b.set(hx, hy, null).set(hx + hw - 1, hy, null).set(hx, hy + hh - 1, null).set(hx + hw - 1, hy + hh - 1, null);

  const hat = look.hat ?? 'none';
  if (look.hair !== undefined && hat === 'none') {
    if (back) {
      b.rect(hx, hy, hw, hh - 2, look.hair);
      b.set(hx, hy, null).set(hx + hw - 1, hy, null);
    } else {
      b.rect(hx + 1, hy, hw - 2, 2, look.hair);
      b.set(hx, hy + 1, look.hair).set(hx + hw - 1, hy + 1, look.hair);
      if (side) b.rect(hx, hy + 1, 2, 3, look.hair);
    }
  }
  if (hat !== 'none') {
    const hc = look.hatColour ?? 'coal';
    if (hat === 'beanie') {
      b.rect(hx, hy - 1, hw, 3, hc);
      b.set(hx, hy - 1, null).set(hx + hw - 1, hy - 1, null);
      if (back) b.rect(hx, hy + 2, hw, 1, hc);
    } else if (hat === 'cap') {
      b.rect(hx, hy - 1, hw, 2, hc);
      if (side) b.rect(hx + hw, hy, 2, 1, hc);
      else if (!back) b.rect(hx + 1, hy + 1, hw - 2, 1, hc);
    } else {
      b.rect(hx, hy - 1, hw, 2, hc);
      b.rect(hx - 1, hy + 1, hw + 2, 1, hc);
    }
  }

  if (!back) {
    const eyes = look.eyes ?? 'dot';
    const ey = hy + (eyes === 'alien' ? Math.floor(hh / 2) - 1 : Math.min(hh - 3, 3));
    const glance = pose.glance ?? 0;
    const eyeXs = side ? [hx + hw - 2] : [g.cx - 2 + ox + glance, g.cx + 1 + ox + glance];
    for (const ex of eyeXs) {
      if (pose.eyesClosed === true) {
        b.set(ex, ey, look.skinShade);
        continue;
      }
      if (eyes === 'alien') {
        b.rect(ex - (side ? 1 : 0), ey, 2, 2, 'ink');
      } else if (eyes === 'shades') {
        b.rect(ex - (side ? 1 : 0), ey, 2, 1, 'ink');
      } else {
        b.set(ex, ey, 'ink');
        if (eyes === 'tired') b.set(ex, ey + 1, look.skinShade);
      }
    }
    if (eyes === 'shades' && !side) b.hline(g.cx - 2 + ox, ey, 4, 'ink');
    if (look.stubble === true) {
      for (let i = side ? 2 : 1; i < hw - 1; i++) {
        if ((i + hy) % 2 === 0) b.set(hx + i, hy + hh - 2, look.skinShade);
        b.set(hx + i, hy + hh - 1, look.skinShade);
      }
    }
    if (look.beard === true) {
      const beard = look.hair ?? 'turfDark';
      // Sideburns beside the eyes' lower row, then the jaw and chin filled in.
      b.set(hx + (side ? 1 : 0), hy + hh - 3, beard);
      if (!side) b.set(hx + hw - 1, hy + hh - 3, beard);
      for (let i = side ? 1 : 0; i < hw; i++) {
        b.set(hx + i, hy + hh - 2, beard);
        b.set(hx + i, hy + hh - 1, beard);
      }
    }
    if (look.halfSmile === true) {
      const my = hy + hh - 2;
      if (side) {
        b.set(hx + hw - 2, my, 'ink').set(hx + hw - 1, my - 1, 'ink');
      } else {
        b.hline(g.cx - 1 + ox, my, 2, 'ink');
        b.set(g.cx + 1 + ox, my - 1, 'ink');
      }
    }
    if (look.rollie === true) {
      const my = hy + hh - 2;
      const rx = side ? hx + hw : g.cx + 2 + ox;
      b.set(rx, my, 'white').set(rx + 1, my, 'amber');
    }
  }

  const item = pose.item ?? look.carries ?? 'none';
  drawItem(b, item, hand.x, hand.y, itemDir.dx, itemDir.dy);
}

function drawLying(b: PixelBuffer, look: Look): void {
  // Head to the left, feet to the right, along the bottom of the cell.
  const y = look.cellHeight - 6;
  const headW = Math.min(4, look.headWidth - 3);
  const bodyW = Math.min(6, look.cellWidth - headW - 6);
  const x0 = Math.max(1, Math.floor((look.cellWidth - (headW + bodyW + 4)) / 2));
  b.rect(x0, y, headW, 4, look.skin);
  b.hline(x0, y + 3, headW, look.skinShade);
  if (look.hat !== undefined && look.hat !== 'none') b.rect(x0, y, 1, 4, look.hatColour ?? 'coal');
  else if (look.hair !== undefined) b.rect(x0, y, 1, 4, look.hair);
  b.rect(x0 + headW, y, bodyW, 4, look.top);
  b.hline(x0 + headW, y + 3, bodyW, look.topShade);
  b.rect(x0 + headW + bodyW, y + 1, 3, 3, look.legs);
  b.rect(x0 + headW + bodyW + 3, y + 1, 1, 3, look.shoes);
}

/** Draws one frame of a figure into a cell-sized buffer. */
export function drawFigure(b: PixelBuffer, look: Look, facing: Facing, pose: Pose = {}): void {
  const layer = new PixelBuffer(look.cellWidth, look.cellHeight);
  if (pose.lying === true) {
    drawLying(layer, look);
  } else if (facing === 'left') {
    const right = new PixelBuffer(look.cellWidth, look.cellHeight);
    drawStanding(right, look, 'right', pose);
    layer.blit(right, 0, 0, true);
  } else {
    drawStanding(layer, look, facing, pose);
  }
  if (pose.flash === true) {
    for (let i = 0; i < layer.data.length; i++) if (layer.data[i] !== null) layer.data[i] = 'white';
  }
  layer.outline('ink');
  b.blit(layer, 0, 0);
}

export const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

export interface AnimSpec {
  readonly poses: readonly Pose[];
  readonly frameRate?: number;
  /** -1 loops (default for idle and walk), 0 plays once. */
  readonly repeat?: number;
}

/** Builds a sheet with every animation in all four facings. */
export function figureSheet(key: string, look: Look, anims: Readonly<Record<string, AnimSpec>>): Sheet {
  const sheet = new SheetBuilder(key, look.cellWidth, look.cellHeight, 16);
  for (const [anim, spec] of Object.entries(anims)) {
    for (const facing of FACINGS) {
      const names = spec.poses.map((pose, i) => {
        const name = frameName(anim, facing, i);
        sheet.cell(name, (b) => drawFigure(b, look, facing, pose));
        return name;
      });
      sheet.anim(animKey(key, anim, facing), names, spec.frameRate ?? 8, spec.repeat ?? -1);
    }
  }
  return sheet.build();
}

export const WALK: AnimSpec = { poses: [{ step: 0 }, { step: 1 }, { step: 2 }, { step: 3 }] };
export const IDLE: AnimSpec = { poses: [{}, { drop: 0, glance: 0 }], frameRate: 1 };
