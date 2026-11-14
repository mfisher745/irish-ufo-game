/**
 * Dev harness entry. Not part of the game build: load it from a throwaway HTML
 * page through Vite. Exposes `window.__dev` so Playwright can drive the UI.
 */

import Phaser from 'phaser';
import { createAudio, EFFECT_IDS } from '../../audio';
import { scheduleSection, sectionsFor } from '../../audio/music';
import { makeNoiseBuffer, renderEffect } from '../../audio/synth';
import type { EffectId } from '../../audio';
import { PALETTE } from '../../art/palette';
import { registerArt } from '../../art';
import type { EvidenceId, RegionId } from '../../core/types';
import { createUiScenes, hideTutorialPrompt, showTutorialPrompt, UiSceneKeys } from '..';
import { FakeSource } from './fakeSource';

class WorldScene extends Phaser.Scene {
  constructor() {
    super('DevWorld');
  }
  create(): void {
    registerArt(this);
    this.add.rectangle(0, 0, 480, 270, PALETTE.moss).setOrigin(0, 0);
    for (let x = 0; x < 480; x += 16) for (let y = 0; y < 270; y += 16) {
      if ((x / 16 + y / 16) % 2 === 0) this.add.rectangle(x, y, 16, 16, PALETTE.mossDark).setOrigin(0, 0);
    }
  }
}

const source = new FakeSource();
source.saveState = null;
const audio = createAudio(source.bus, () => source.audioSettings());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#14121a',
  scale: { mode: Phaser.Scale.NONE, width: 480, height: 270, zoom: 2 },
  scene: [WorldScene, ...createUiScenes(source, { play: (e: EffectId) => audio.play(e) })],
});

/** Renders an effect offline and returns the peak sample, to prove it is not silent. */
async function peakOf(kind: 'effect' | 'theme', name: string): Promise<number> {
  if (kind === 'theme') return (await renderThemeSections(name as RegionId, 0))[0]?.peak ?? 0;
  const ctx = new OfflineAudioContext(1, 44100 * 1.2, 44100);
  const noise = makeNoiseBuffer(ctx);
  renderEffect(name as EffectId, { ctx, dest: ctx.destination, noise }, 0.01);
  const out = await ctx.startRendering();
  let peak = 0;
  for (const v of out.getChannelData(0)) peak = Math.max(peak, Math.abs(v));
  return peak;
}

/** Renders every section of a region's theme at a boss level (0 = normal) offline: peak and duration of each. */
async function renderThemeSections(region: RegionId, level: number): Promise<Array<{ id: string; kind: string; seconds: number; peak: number }>> {
  const out: Array<{ id: string; kind: string; seconds: number; peak: number }> = [];
  for (const section of sectionsFor(region, level)) {
    const ctx = new OfflineAudioContext(1, Math.ceil(44100 * (section.durationSec + 2)), 44100);
    const noise = makeNoiseBuffer(ctx);
    scheduleSection(ctx, ctx.destination, noise, section, 0.05);
    const buf = await ctx.startRendering();
    let peak = 0;
    for (const v of buf.getChannelData(0)) peak = Math.max(peak, Math.abs(v));
    out.push({ id: section.id, kind: section.kind, seconds: Math.round(section.durationSec * 10) / 10, peak: Math.round(peak * 1000) / 1000 });
  }
  return out;
}

const ev = (id: string): EvidenceId => id as EvidenceId;

const dev = {
  game,
  source,
  audio,
  keys: UiSceneKeys,
  peakOf,
  renderThemeSections,
  effectIds: EFFECT_IDS,
  errors: [] as string[],
  start(key: string): void {
    for (const k of Object.values(UiSceneKeys)) game.scene.stop(k);
    game.scene.start(key);
    if (key === UiSceneKeys.Hud) game.scene.bringToTop(key);
  },
  say(id: string): void {
    source.bus.emit('dialogue:show', { sequenceId: id });
  },
  fillCasebook(): void {
    source.entries = [
      { kind: 'evidence', evidenceId: ev('c3.clue.map'), chapter: 3 },
      { kind: 'evidence', evidenceId: ev('c3.clue.brochure'), chapter: 3 },
      { kind: 'evidence', evidenceId: ev('c3.clue.manifest'), chapter: 3 },
      { kind: 'lead', deductionId: 'c3.deduction.boston', chapter: 3 },
      { kind: 'mykoCall', sectionId: 'c3.fight.bay', callKind: 'fight', chapter: 3 },
    ];
  },
  openBoard(): void {
    source.board = {
      id: 'c3.deduction.boston',
      chapter: 3,
      candidateIds: ['c3.clue.map', 'c3.clue.brochure', 'c3.clue.certificate', 'c3.clue.visitors', 'c3.clue.manifest'].map(ev),
      solution: [ev('c3.clue.map'), ev('c3.clue.brochure'), ev('c3.clue.manifest')],
      leadTextId: 'c3.deduction.boston.lead.body',
      leadMarginTextId: 'c3.deduction.boston.lead.margin',
      wrongAnswerDialogueIds: ['dev.box.myko'],
    };
  },
  prompt(id: string): void {
    showTutorialPrompt(game, id);
  },
  unprompt(): void {
    hideTutorialPrompt(game);
  },
};

window.addEventListener('error', (e) => dev.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => dev.errors.push(String(e.reason)));
(window as unknown as { __dev: typeof dev }).__dev = dev;
