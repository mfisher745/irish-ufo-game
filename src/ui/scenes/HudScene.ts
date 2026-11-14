/**
 * HUD, commentary and scene dialogue boxes, notices, tutorial prompts and the
 * hangover overlay. docs/style-guide.md sections 4 and 5. Systems start this
 * scene when a chapter begins and stop it on quit to title.
 *
 * Keys handled here: Esc (pause), Tab (casebook), E and left click (advance
 * scene dialogue). The deduction board opens by itself when
 * `source.activeDeduction()` becomes non-null.
 */

import Phaser from 'phaser';
import { PALETTE } from '../../art/palette';
import type { ColourName } from '../../art/palette';
import { TUNING } from '../../content/tuning';
import { format, sequence, text } from '../../content/dialogue';
import { isAlienLine } from '../../content/dialogue/speakers';
import { GameEvents } from '../../core/types';
import type { DialogueLine, SpeakerId, TextId } from '../../core/types';
import type { EffectId } from '../../audio';
import { bindFullscreenHotkey } from '../fullscreen';
import type { Label, Pic } from '../gfx';
import {
  PORTRAIT_FALLBACK,
  iconFrames,
  makeIcon,
  makeLabel,
  makePortrait,
  portraitFrame,
  rect,
  setLabelColour,
  setLabelText,
  speakerColour,
} from '../gfx';
import {
  BUZZ_METER,
  CELL,
  DIALOGUE_BOX,
  DIALOGUE_TEXT,
  HEALTH_BACKING,
  HEALTH_PIPS,
  HEAT_METER,
  HUD_STRIP,
  NOTICE_MS,
  PORTRAIT,
  SCREEN,
  SLOT_FLASH_MS,
  STRIP,
} from '../layout';
import { KEY_IDS, keyText } from '../keycaps';
import { DialogueQueue } from '../model/dialogue';
import type { DialogueView } from '../model/dialogue';
import { buildHudModel, perimeterSegments } from '../model/hud';
import type { HudModel } from '../model/hud';
import { wrapText } from '../model/wrap';
import { bindPromptHost } from '../prompts';
import { PROMPT_EVENTS, UiSceneKeys } from '../shared';
import type { UiShared } from '../shared';

const D = { overlay: 0, hud: 10, notice: 20, box: 30, caption: 40 } as const;
const NOTICE_WIDTH_CHARS = 70;

const BUZZ_COLOUR: Record<HudModel['buzz']['state'], ColourName> = {
  sober: 'fog',
  grand: 'grass',
  locked: 'amber',
  banjaxed: 'alarm',
};

interface Notice {
  readonly bg: Phaser.GameObjects.Rectangle;
  readonly label: Label;
  hideAt: number;
}

type CellId = 'drink0' | 'drink1' | 'drink2' | 'empties' | 'melee' | 'dodge' | 'special';
type Cell = Phaser.GameObjects.Rectangle;

/** A small key cap: the key's letters in a lit box. */
class Cap {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Label;
  constructor(scene: Phaser.Scene, depth: number) {
    this.bg = rect(scene, 0, 0, 8, CELL.height, 'steel', depth).setVisible(false);
    this.label = makeLabel(scene, 0, 0, '', 'ink', { depth: depth + 1 }).setVisible(false);
  }
  /** Shows `str` with its top-left at (x, y). Returns the width used. */
  show(str: string, x: number, y: number, bg: ColourName = 'steel', fg: ColourName = 'ink'): number {
    const w = str.length * CELL.width + 2;
    this.bg.setPosition(x, y).setSize(w, CELL.height).setFillStyle(PALETTE[bg]).setVisible(true);
    setLabelText(this.label, str);
    setLabelColour(this.label, fg);
    this.label.setPosition(x + 1, y).setVisible(true);
    return w;
  }
  hide(): void {
    this.bg.setVisible(false);
    this.label.setVisible(false);
  }
}

export interface PromptRequest {
  readonly textId: TextId;
}

export class HudScene extends Phaser.Scene {
  private queue!: DialogueQueue;
  private unsubs: Array<() => void> = [];

  // Static layers
  private overlay!: Phaser.GameObjects.Rectangle;
  private pips: Pic[] = [];
  private heatBack: Phaser.GameObjects.Rectangle[] = [];
  private heatFill!: Phaser.GameObjects.Rectangle;
  private heatLabel!: Label;

  // Bottom strip. Cells are highlighted briefly when what they hold changes.
  private cells = new Map<CellId, Cell>();
  private cellSig = new Map<CellId, string>();
  private flashUntil = new Map<CellId, number>();
  private drinkIcons: Pic[] = [];
  private drinkCount: Label[] = [];
  private drinkNumCaps: Cap[] = [];
  private drinkSelCaps: Cap[] = [];
  private emptiesIcon!: Pic;
  private emptiesCount!: Label;
  private emptiesMouse!: Pic;
  private meleeIcon!: Pic;
  private meleeMouse!: Pic;
  private dodgeIcon!: Pic;
  private dodgeCap!: Cap;
  private specialIcon!: Pic;
  private specialName!: Label;
  private specialReason!: Label;
  private specialCapF!: Cap;
  private specialCapR!: Cap;
  private buzzState!: Label;
  private buzzFill!: Phaser.GameObjects.Rectangle;
  private buzzNotches: Phaser.GameObjects.Rectangle[] = [];
  private rollies: Pic[] = [];
  private callCap!: Cap;
  private ring!: Phaser.GameObjects.Graphics;
  private bossBacking!: Phaser.GameObjects.Rectangle;
  private bossName!: Label;
  private bossBack!: Phaser.GameObjects.Rectangle;
  private bossFill!: Phaser.GameObjects.Rectangle;

  // Dialogue box
  private boxBg: Phaser.GameObjects.Rectangle[] = [];
  private portrait!: Pic;
  private nameLabel!: Label;
  private directionLabel!: Label;
  private lineLabels: Label[] = [];
  private advanceLabel!: Label;
  private captionBg!: Phaser.GameObjects.Rectangle;
  private captionLabels: Label[] = [];

  // Notices
  private saved!: Notice;
  private ability!: Notice;
  private pickup!: Notice;
  private prompts: Array<{ readonly textId: TextId; readonly notice: Notice }> = [];

  constructor(private readonly shared: UiShared) {
    super(UiSceneKeys.Hud);
  }

  create(): void {
    // The scene object is reused when a chapter restarts (after a death); drop the previous run's objects.
    this.pips = [];
    this.heatBack = [];
    this.cells = new Map();
    this.cellSig = new Map();
    this.flashUntil = new Map();
    this.drinkIcons = [];
    this.drinkCount = [];
    this.drinkNumCaps = [];
    this.drinkSelCaps = [];
    this.buzzNotches = [];
    this.rollies = [];
    this.boxBg = [];
    this.lineLabels = [];
    this.captionLabels = [];
    this.prompts = [];
    const { source } = this.shared;
    bindFullscreenHotkey(this.game);
    bindPromptHost(this.game);
    this.queue = new DialogueQueue({
      lookup: (id) => sequence(id),
      speakerName: (line) => this.speakerName(line),
      onFinished: (id) => source.dialogueFinished(id),
      onChar: (line) => this.shared.hooks.play?.(blipFor(line)),
      onError: (id, error) => console.error(`Dialogue ${id} failed`, error),
    });

    this.overlay = rect(this, 0, 0, SCREEN.width, SCREEN.height, 'fluoro', D.overlay).setAlpha(TUNING.hangover.brightness).setVisible(false);
    this.buildTopLeft();
    this.buildStrip();
    this.buildBoss();
    this.buildDialogueBox();
    this.buildNotices();
    this.bindEvents();
    this.bindInput();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  // ---------------------------------------------------------------- building

  private buildTopLeft(): void {
    // Health only, on a backing so it reads over the world.
    const hb = HEALTH_BACKING;
    rect(this, hb.x, hb.y, hb.width, hb.height, 'ink', D.hud - 1);
    rect(this, hb.x, hb.y + hb.height, hb.width, 1, 'slate', D.hud - 1);
    for (let i = 0; i < HEALTH_PIPS; i++) this.pips.push(makeIcon(this, 4 + i * 13, 3, D.hud));
    this.heatBack = [
      rect(this, HEAT_METER.x - 3, HEAT_METER.y - 3, HEAT_METER.width + 6 + 36, HEAT_METER.height + 6, 'ink', D.hud - 1),
      rect(this, HEAT_METER.x, HEAT_METER.y, HEAT_METER.width, HEAT_METER.height, 'coal', D.hud),
    ];
    this.heatFill = rect(this, HEAT_METER.x, HEAT_METER.y, 0, HEAT_METER.height, 'rust', D.hud + 1);
    this.heatLabel = makeLabel(this, HEAT_METER.x + HEAT_METER.width + 4, HEAT_METER.y - 2, text('ui.hud.heat'), 'sand', { depth: D.hud });
  }

  private cell(id: CellId, x: number, width: number): Cell {
    const c = rect(this, x, STRIP.cellY, width, STRIP.cellHeight, 'coal', D.hud).setVisible(true);
    this.cells.set(id, c);
    return c;
  }

  private buildStrip(): void {
    const y = STRIP.cellY;
    rect(this, 0, HUD_STRIP.y, SCREEN.width, HUD_STRIP.height, 'ink', D.hud - 1);
    rect(this, 0, HUD_STRIP.y, SCREEN.width, 1, 'slate', D.hud);
    const L = D.hud + 1;
    // Three drink slots: icon, count, its number key, and Q on the one that is selected.
    for (let i = 0; i < 3; i++) {
      const x0 = STRIP.drink.x + i * (STRIP.drink.width + STRIP.drink.gap);
      this.cell(`drink${i}` as CellId, x0, STRIP.drink.width);
      this.drinkIcons.push(makeIcon(this, x0 + 2, y + 5, L));
      this.drinkCount.push(makeLabel(this, x0 + 16, y + 2, '', 'white', { depth: L }));
      this.drinkNumCaps.push(new Cap(this, L));
      this.drinkSelCaps.push(new Cap(this, L));
    }
    // Empties: the bottle, a count and the right mouse button.
    this.cell('empties', STRIP.empties.x, STRIP.empties.width);
    this.emptiesIcon = makeIcon(this, STRIP.empties.x + 2, y + 5, L).set(iconFrames.empty, 'fog');
    this.emptiesCount = makeLabel(this, STRIP.empties.x + 16, y + 1, '', 'white', { depth: L });
    this.emptiesMouse = makeIcon(this, STRIP.empties.x + 16, y + 10, L).set(iconFrames.mouseRight, 'fog');
    // Melee: its icon and the left mouse button.
    this.cell('melee', STRIP.melee.x, STRIP.melee.width);
    this.meleeIcon = makeIcon(this, STRIP.melee.x + 2, y + 5, L);
    this.meleeMouse = makeIcon(this, STRIP.melee.x + 16, y + 5, L).set(iconFrames.mouseLeft, 'fog');
    // Dodge (The Stumble): icon over the Space key.
    this.cell('dodge', STRIP.dodge.x, STRIP.dodge.width);
    this.dodgeIcon = makeIcon(this, STRIP.dodge.x + (STRIP.dodge.width - 12) / 2, y + 1, L);
    this.dodgeCap = new Cap(this, L);
    // Buzz: the state word at double size over the meter.
    this.buzzState = makeLabel(this, STRIP.buzz.x + STRIP.buzz.width / 2, y - 1, '', 'white', { anchor: 'centre', depth: L });
    this.buzzState.setScale(2);
    const mx = STRIP.buzz.x + (STRIP.buzz.width - BUZZ_METER.width) / 2;
    const my = HUD_STRIP.y + HUD_STRIP.height - BUZZ_METER.height - 2;
    rect(this, mx - 1, my - 1, BUZZ_METER.width + 2, BUZZ_METER.height + 2, 'slate', D.hud);
    rect(this, mx, my, BUZZ_METER.width, BUZZ_METER.height, 'coal', D.hud + 1);
    this.buzzFill = rect(this, mx, my, 0, BUZZ_METER.height, 'fog', D.hud + 2);
    for (let i = 0; i < 3; i++) this.buzzNotches.push(rect(this, 0, my, 1, BUZZ_METER.height, 'white', D.hud + 3));
    // Special: icon over F (and R when there is a choice), its name and why it is off.
    this.cell('special', STRIP.special.x, STRIP.special.width);
    this.specialIcon = makeIcon(this, STRIP.special.x + 2, y + 1, L);
    this.specialCapF = new Cap(this, L);
    this.specialCapR = new Cap(this, L);
    this.specialName = makeLabel(this, STRIP.special.x + 18, y + 3, '', 'white', { depth: L });
    this.specialReason = makeLabel(this, STRIP.special.x + 18, y + 12, '', 'amber', { depth: L });
    // Myko's calls, unchanged in look, with the M key.
    for (let i = 0; i < TUNING.myko.callsPerGame; i++) this.rollies.push(makeIcon(this, STRIP.calls.x + i * STRIP.calls.rollieGap, y + 5, L));
    this.callCap = new Cap(this, L);
    this.ring = this.add.graphics().setDepth(D.hud + 4);
  }

  private buildBoss(): void {
    this.bossBacking = rect(this, 120, 0, 240, 24, 'ink', D.hud - 1);
    this.bossName = makeLabel(this, SCREEN.width / 2, 3, '', 'white', { anchor: 'centre', depth: D.hud });
    this.bossBack = rect(this, 139, 13, 202, 8, 'ink', D.hud);
    this.bossFill = rect(this, 140, 14, 0, 6, 'alarm', D.hud + 1);
  }

  private buildDialogueBox(): void {
    const b = DIALOGUE_BOX;
    this.boxBg = [rect(this, b.x, b.y, b.width, b.height, 'ink', D.box), rect(this, b.x, b.y, b.width, 1, 'slate', D.box + 1)];
    this.portrait = makePortrait(this, PORTRAIT.x, PORTRAIT.y, D.box + 1);
    this.nameLabel = makeLabel(this, DIALOGUE_TEXT.x, DIALOGUE_TEXT.y, '', 'fog', { depth: D.box + 1 });
    this.directionLabel = makeLabel(this, DIALOGUE_TEXT.x, DIALOGUE_TEXT.y, '', 'fog', { depth: D.box + 1 });
    for (let i = 0; i < DIALOGUE_TEXT.maxLines; i++) {
      this.lineLabels.push(makeLabel(this, DIALOGUE_TEXT.x, DIALOGUE_TEXT.y + (i + 1) * DIALOGUE_TEXT.rowHeight, '', 'white', { depth: D.box + 1 }));
    }
    this.advanceLabel = makeLabel(this, SCREEN.width - 4, DIALOGUE_BOX.y + 2, text('ui.prompt.advance'), 'steel', { anchor: 'right', depth: D.box + 1 });
    this.captionBg = rect(this, 0, 96, SCREEN.width, 78, 'ink', D.caption);
    for (let i = 0; i < DIALOGUE_TEXT.maxLines; i++) {
      this.captionLabels.push(makeLabel(this, SCREEN.width / 2, 110 + i * 18, '', 'bone', { anchor: 'centre', depth: D.caption + 1 }));
    }
    this.showBox('none');
  }

  private makeNotice(y: number, colour: ColourName): Notice {
    const bg = rect(this, 0, y, SCREEN.width, 11, 'ink', D.notice).setVisible(false);
    const label = makeLabel(this, SCREEN.width / 2, y + 1, '', colour, { anchor: 'centre', depth: D.notice + 1 }).setVisible(false);
    return { bg, label, hideAt: 0 };
  }

  private buildNotices(): void {
    this.saved = {
      bg: rect(this, SCREEN.width - 60, 0, 60, 14, 'ink', D.notice).setVisible(false),
      label: makeLabel(this, SCREEN.width - 4, 3, text('ui.saved'), 'bone', { anchor: 'right', depth: D.notice + 1 }).setVisible(false),
      hideAt: 0,
    };
    this.ability = this.makeNotice(30, 'amberLight');
    this.pickup = this.makeNotice(DIALOGUE_BOX.y - 13, 'white');
  }

  // ------------------------------------------------------------------ events

  private bindEvents(): void {
    const { bus } = this.shared.source;
    this.unsubs.push(
      bus.on(GameEvents.DialogueShow, ({ sequenceId }) => this.queue.enqueue(sequenceId)),
      bus.on(GameEvents.SaveWritten, () => this.flash(this.saved, NOTICE_MS.saved)),
      bus.on(GameEvents.AbilityUnlocked, ({ abilityId }) => {
        this.setNotice(this.ability, format('ability.unlocked', { name: text(`ability.${abilityId}.name`) }), NOTICE_MS.ability);
      }),
      bus.on(GameEvents.PickupCollected, ({ item }) => {
        const msg =
          item.kind === 'drink'
            ? text(`drink.${item.drinkId}.pickup`)
            : item.kind === 'food'
              ? text(`food.${item.foodId}.pickup`)
              : format('pickup.empties', { n: item.count });
        this.setNotice(this.pickup, msg, NOTICE_MS.pickup);
      }),
      bus.on(GameEvents.PickupRefused, ({ reason }) => this.setNotice(this.pickup, text(`pickup.refused.${reason}`), NOTICE_MS.pickup)),
      bus.on(GameEvents.PlayerDied, () => this.clearDialogueOnReset()),
    );
    const onShow = (req: PromptRequest): void => this.showPrompt(req.textId);
    const onHide = (textId?: TextId): void => this.hidePrompt(textId);
    this.game.events.on(PROMPT_EVENTS.show, onShow);
    this.game.events.on(PROMPT_EVENTS.hide, onHide);
    this.unsubs.push(
      () => this.game.events.off(PROMPT_EVENTS.show, onShow),
      () => this.game.events.off(PROMPT_EVENTS.hide, onHide),
    );
  }

  private clearDialogueOnReset(): void {
    // Commentary is not cleared on death: Myko's death line arrives right after.
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (kb !== null) {
      const onEsc = (e: KeyboardEvent): void => {
        if (e.repeat || this.scene.isActive(UiSceneKeys.Settings) || this.scene.isActive(UiSceneKeys.Deduction)) return;
        if (this.shared.overlays.isOpen('casebook')) this.closeCasebook();
        else if (this.shared.overlays.isOpen('pause')) this.closePause();
        else this.openPause();
      };
      const onTab = (e: KeyboardEvent): void => {
        e.preventDefault();
        if (e.repeat || this.shared.overlays.isOpen('pause') || this.scene.isActive(UiSceneKeys.Deduction)) return;
        if (this.shared.overlays.isOpen('casebook')) this.closeCasebook();
        else if (!this.queue.blocking) this.openCasebook();
      };
      const onE = (): void => this.queue.advance();
      kb.on('keydown-ESC', onEsc);
      kb.on('keydown-TAB', onTab);
      kb.on('keydown-E', onE);
      kb.addCapture('TAB');
      this.unsubs.push(
        () => kb.off('keydown-ESC', onEsc),
        () => kb.off('keydown-TAB', onTab),
        () => kb.off('keydown-E', onE),
        () => kb.removeCapture('TAB'),
      );
    }
    const onClick = (p: Phaser.Input.Pointer): void => {
      if (p.leftButtonDown()) this.queue.advance();
    };
    this.input.on('pointerdown', onClick);
    this.unsubs.push(() => this.input.off('pointerdown', onClick));
  }

  openPause(): void {
    if (this.queue.blocking) return;
    this.shared.overlays.show('pause');
    this.scene.launch(UiSceneKeys.Pause);
    this.scene.bringToTop(UiSceneKeys.Pause);
  }

  closePause(): void {
    this.shared.overlays.hide('pause');
    this.scene.stop(UiSceneKeys.Settings);
    this.scene.stop(UiSceneKeys.Pause);
  }

  openCasebook(): void {
    this.shared.overlays.show('casebook');
    this.scene.launch(UiSceneKeys.Casebook);
    this.scene.bringToTop(UiSceneKeys.Casebook);
    this.shared.hooks.play?.('uiSelect');
  }

  closeCasebook(): void {
    this.shared.overlays.hide('casebook');
    this.scene.stop(UiSceneKeys.Casebook);
    this.shared.hooks.play?.('uiMove');
  }

  private teardown(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    for (const key of [UiSceneKeys.Pause, UiSceneKeys.Settings, UiSceneKeys.Casebook, UiSceneKeys.Deduction]) this.scene.stop(key);
    this.shared.overlays.hide('pause');
    this.shared.overlays.hide('casebook');
  }

  // ----------------------------------------------------------------- notices

  private flash(n: Notice, ms: number): void {
    n.hideAt = this.time.now + ms;
    n.bg.setVisible(true);
    n.label.setVisible(true);
  }

  private setNotice(n: Notice, message: string, ms: number): void {
    const lines = wrapText(message, NOTICE_WIDTH_CHARS);
    setLabelText(n.label, lines.join('\n'));
    const h = lines.length * DIALOGUE_TEXT.rowHeight + 2;
    const bottom = n === this.pickup ? DIALOGUE_BOX.y - 2 : n.bg.y + 11;
    const top = n === this.pickup ? bottom - h : n.bg.y;
    n.bg.setPosition(0, top).setSize(SCREEN.width, h).setVisible(true);
    n.label.setPosition(SCREEN.width / 2, top + 1).setVisible(true);
    n.hideAt = this.time.now + ms;
  }

  private showPrompt(textId: TextId): void {
    if (this.prompts.some((p) => p.textId === textId)) return;
    const notice = this.makeNotice(0, 'amberLight');
    this.prompts.push({ textId, notice });
    setLabelText(notice.label, text(textId));
    notice.bg.setVisible(true);
    notice.label.setVisible(true);
    this.layoutPrompts();
  }

  private hidePrompt(textId?: TextId): void {
    const keep: typeof this.prompts = [];
    for (const p of this.prompts) {
      if (textId === undefined || p.textId === textId) {
        p.notice.bg.destroy();
        p.notice.label.destroy();
      } else keep.push(p);
    }
    this.prompts = keep;
    this.layoutPrompts();
  }

  private layoutPrompts(): void {
    // Above the pickup line, stacked upwards.
    let y = DIALOGUE_BOX.y - 28;
    for (const p of this.prompts) {
      p.notice.bg.setPosition(0, y);
      p.notice.label.setPosition(SCREEN.width / 2, y + 1);
      y -= 12;
    }
  }

  // ------------------------------------------------------------------- frame

  update(_time: number, delta: number): void {
    const { source } = this.shared;
    const m = buildHudModel(source);
    this.drawTopLeft(m);
    this.drawStrip(m);
    this.drawBoss(m);
    this.overlay.setVisible(m.hangover);

    if (!this.shared.overlays.isOpen('pause') && !this.shared.overlays.isOpen('casebook')) this.queue.update(delta);
    this.drawDialogue(this.queue.view());

    const now = this.time.now;
    for (const n of [this.saved, this.ability, this.pickup]) {
      if (n.hideAt !== 0 && now >= n.hideAt) {
        n.hideAt = 0;
        n.bg.setVisible(false);
        n.label.setVisible(false);
      }
    }

    if (source.activeDeduction() !== null && !this.scene.isActive(UiSceneKeys.Deduction)) {
      this.scene.launch(UiSceneKeys.Deduction);
      this.scene.bringToTop(UiSceneKeys.Deduction);
    }
  }

  private drawTopLeft(m: HudModel): void {
    this.pips.forEach((pic, i) => {
      const fill = m.pips[i];
      if (fill === undefined) {
        pic.setVisible(false);
        return;
      }
      const frame = fill === 'full' ? iconFrames.pintFull : fill === 'half' ? iconFrames.pintHalf : iconFrames.pintEmpty;
      pic.set(frame, fill === 'full' ? 'amber' : fill === 'half' ? 'peat' : 'coal');
    });
    const heat = m.heat;
    for (const r of this.heatBack) r.setVisible(heat !== null);
    this.heatFill.setVisible(heat !== null);
    this.heatLabel.setVisible(heat !== null);
    if (heat !== null) this.heatFill.setSize(Math.round(HEAT_METER.width * heat.fraction), HEAT_METER.height);
  }

  /** Highlights a cell for a moment whenever what it shows changes (not on the first frame). */
  private watch(id: CellId, signature: string): void {
    const before = this.cellSig.get(id);
    this.cellSig.set(id, signature);
    if (before !== undefined && before !== signature) this.flashUntil.set(id, this.time.now + SLOT_FLASH_MS);
  }

  private paintCell(id: CellId, visible: boolean, selected = false): void {
    const c = this.cells.get(id);
    if (c === undefined) return;
    c.setVisible(visible);
    if (!visible) return;
    const flashing = this.time.now < (this.flashUntil.get(id) ?? 0);
    const on = flashing && Math.floor(this.time.now / 130) % 2 === 0;
    c.setFillStyle(PALETTE[on ? 'steel' : selected ? 'slate' : 'coal']);
    if (on) c.setStrokeStyle(1, PALETTE.white);
    else if (selected) c.setStrokeStyle(1, PALETTE.amberLight);
    else c.setStrokeStyle();
  }

  private drawStrip(m: HudModel): void {
    const y = STRIP.cellY;
    // Drinks.
    m.slots.forEach((slot, i) => {
      const x0 = STRIP.drink.x + i * (STRIP.drink.width + STRIP.drink.gap);
      const icon = this.drinkIcons[i];
      const count = this.drinkCount[i];
      const num = this.drinkNumCaps[i];
      const sel = this.drinkSelCaps[i];
      if (icon === undefined || count === undefined || num === undefined || sel === undefined) return;
      this.watch(`drink${i}` as CellId, `${slot.drinkId ?? '-'}:${slot.count}:${slot.selected}`);
      this.paintCell(`drink${i}` as CellId, true, slot.selected);
      if (slot.drinkId === null) {
        icon.setVisible(false);
        setLabelText(count, '');
      } else {
        icon.set(iconFrames.drink(slot.drinkId), 'amber').setDim(!slot.selected);
        setLabelText(count, `×${slot.count}`);
        setLabelColour(count, slot.selected ? 'white' : 'fog');
      }
      const w = num.show(keyText(KEY_IDS.drink[i] ?? KEY_IDS.drink[0]), x0 + 16, y + 12, slot.selected ? 'bone' : 'steel');
      if (slot.selected) sel.show(keyText(KEY_IDS.drinkSelected), x0 + 16 + w + 1, y + 12, 'amberLight');
      else sel.hide();
    });
    // Empties, dimmed until Bottle Throw is unlocked.
    this.watch('empties', `${m.empties}:${m.throwUnlocked}`);
    this.paintCell('empties', true);
    this.emptiesIcon.setDim(!m.throwUnlocked);
    this.emptiesMouse.setDim(!m.throwUnlocked);
    setLabelText(this.emptiesCount, `×${m.empties}`);
    setLabelColour(this.emptiesCount, m.throwUnlocked ? 'white' : 'steel');
    // Melee.
    this.watch('melee', m.melee ?? '-');
    this.paintCell('melee', true);
    this.meleeIcon.set(iconFrames.ability(m.melee ?? 'punchCombo'), 'amberLight').setDim(m.melee === null);
    this.meleeMouse.setDim(m.melee === null);
    // Dodge, once learned.
    this.watch('dodge', String(m.dodgeUnlocked));
    this.paintCell('dodge', m.dodgeUnlocked);
    if (m.dodgeUnlocked) {
      this.dodgeIcon.set(iconFrames.ability('stumble'), 'amberLight');
      const label = keyText(KEY_IDS.dodge);
      this.dodgeCap.show(label, STRIP.dodge.x + Math.floor((STRIP.dodge.width - (label.length * CELL.width + 2)) / 2), y + 13);
    } else {
      this.dodgeIcon.setVisible(false);
      this.dodgeCap.hide();
    }
    // Special, with the reason when it is off.
    const sp = m.special;
    this.watch('special', `${sp.iconAbility ?? '-'}:${sp.shown}`);
    this.paintCell('special', sp.shown);
    if (sp.shown) {
      if (sp.iconAbility === null) this.specialIcon.setVisible(false);
      else this.specialIcon.set(iconFrames.ability(sp.iconAbility), 'amberLight').setDim(sp.locked);
      const fw = this.specialCapF.show(keyText(KEY_IDS.special), STRIP.special.x + 2, y + 13, sp.locked ? 'slate' : 'steel', sp.locked ? 'fog' : 'ink');
      if (sp.cyclable) this.specialCapR.show(keyText(KEY_IDS.cycleSpecial), STRIP.special.x + 2 + fw + 1, y + 13, 'slate', 'fog');
      else this.specialCapR.hide();
      const textX = STRIP.special.x + 2 + fw + (sp.cyclable ? 1 + (keyText(KEY_IDS.cycleSpecial).length * CELL.width + 2) : 0) + 3;
      this.specialName.setX(textX);
      this.specialReason.setX(textX);
      // "The Borrowed Glove" is too long for the cell: the leading article goes.
      const name = sp.abilityId === null ? '' : text(sp.labelTextId).replace(/^The /, '');
      setLabelText(this.specialName, name);
      setLabelColour(this.specialName, sp.locked ? 'steel' : 'white');
      const reason = sp.reason === 'sober' ? text('ui.buzz.sober') : sp.reason === 'buzz' ? keyText(KEY_IDS.needBuzz) : sp.reason === 'recharge' ? keyText(KEY_IDS.recharging) : '';
      setLabelText(this.specialReason, reason);
    } else {
      this.specialIcon.setVisible(false);
      this.specialCapF.hide();
      this.specialCapR.hide();
      setLabelText(this.specialName, '');
      setLabelText(this.specialReason, '');
    }
    // Buzz: the state word, large, over the meter.
    const flash = m.buzz.flashing && Math.floor(this.time.now / 160) % 2 === 0;
    const mx = STRIP.buzz.x + (STRIP.buzz.width - BUZZ_METER.width) / 2;
    this.buzzFill.setSize(Math.round(BUZZ_METER.width * m.buzz.fraction), BUZZ_METER.height);
    this.buzzFill.setFillStyle(PALETTE[flash ? 'white' : BUZZ_COLOUR[m.buzz.state]]);
    m.buzz.notches.forEach((f, i) => this.buzzNotches[i]?.setX(mx + Math.round(BUZZ_METER.width * f)));
    setLabelText(this.buzzState, text(m.buzz.stateTextId));
    setLabelColour(this.buzzState, flash ? 'white' : BUZZ_COLOUR[m.buzz.state]);
    // Myko's calls and the M key.
    this.rollies.forEach((pic, i) => {
      const available = m.calls[i] === true;
      pic.set(available ? iconFrames.rollie : iconFrames.rollieSpent, available ? 'bone' : 'coal');
    });
    this.callCap.show(keyText(KEY_IDS.call), STRIP.calls.capX, y + 7, 'slate', 'fog');
    this.ring.clear();
    if (m.callHold > 0) {
      this.ring.lineStyle(2, PALETTE.amberLight, 1);
      for (const [x1, y1, x2, y2] of perimeterSegments(m.callHold, 58, 20)) {
        this.ring.lineBetween(STRIP.calls.x - 3 + x1, y + 1 + y1, STRIP.calls.x - 3 + x2, y + 1 + y2);
      }
    }
  }

  private drawBoss(m: HudModel): void {
    const b = m.boss;
    this.bossName.setVisible(b !== null);
    this.bossBacking.setVisible(b !== null);
    this.bossBack.setVisible(b !== null);
    this.bossFill.setVisible(b !== null);
    if (b === null) return;
    setLabelText(this.bossName, text(b.nameTextId));
    this.bossFill.setSize(Math.round(200 * b.fraction), 6);
  }

  // ---------------------------------------------------------------- dialogue

  private speakerName(line: DialogueLine): string | null {
    if (line.speaker === 'narrator') return null;
    if (line.speaker === 'npc') return line.speakerName === undefined ? null : text(line.speakerName);
    return text(`speaker.${line.speaker}`);
  }

  private showBox(mode: 'none' | 'box' | 'caption'): void {
    const box = mode === 'box';
    for (const r of this.boxBg) r.setVisible(box);
    this.nameLabel.setVisible(box);
    this.directionLabel.setVisible(box);
    for (const l of this.lineLabels) l.setVisible(box);
    if (!box) {
      this.portrait.setVisible(false);
      this.advanceLabel.setVisible(false);
    }
    this.captionBg.setVisible(mode === 'caption');
    for (const l of this.captionLabels) l.setVisible(mode === 'caption');
  }

  private drawDialogue(v: DialogueView | null): void {
    if (v === null) {
      this.showBox('none');
      return;
    }
    if (v.delivery === 'caption') {
      this.showBox('caption');
      this.captionLabels.forEach((l, i) => setLabelText(l, (v.shown[i] ?? '').toUpperCase()));
      return;
    }
    this.showBox('box');
    const speaker: SpeakerId = v.speaker;
    this.portrait.set(portraitFrame(speaker), PORTRAIT_FALLBACK[speaker]);
    const name = v.name ?? '';
    setLabelText(this.nameLabel, name);
    setLabelColour(this.nameLabel, speakerColour(speaker));
    setLabelText(this.directionLabel, v.direction === null ? '' : `(${v.direction})`);
    this.directionLabel.setX(DIALOGUE_TEXT.x + (name.length + 1) * 6);
    this.lineLabels.forEach((l, i) => setLabelText(l, v.shown[i] ?? ''));
    this.advanceLabel.setVisible(v.awaitingAdvance && Math.floor(this.time.now / 400) % 2 === 0);
  }
}

/** Effect ID for a speaker's dialogue blip. docs/style-guide.md section 7. */
export function blipFor(line: DialogueLine): EffectId {
  if (isAlienLine(line)) return 'blipAlien';
  if (line.speaker === 'andrew') return 'blipAndrew';
  if (line.speaker === 'myko') return 'blipMyko';
  return 'blipOther';
}
