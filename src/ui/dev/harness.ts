/**
 * Dev harness entry. Not part of the game build: load it from a throwaway HTML
 * page through Vite. Exposes `window.__dev` so Playwright can drive the UI.
 */

import Phaser from 'phaser';
import { createAudio, EFFECT_IDS } from '../../audio';
import { compileTheme, scheduleStep } from '../../audio/music';
import { THEMES } from '../../audio/themes';
import { makeNoiseBuffer, renderEffect } from '../../audio/synth';
import type { EffectId } from '../../audio';
import { PALETTE } from '../../art/palette';
import type { EvidenceId, RegionId } from '../../core/types';
import { createUiScenes, hideTutorialPrompt, showTutorialPrompt, UiSceneKeys } from '..';
import { FakeSource } from './fakeSource';

class WorldScene extends Phaser.Scene {
  constructor() {
    super('DevWorld');
  }
  create(): void {
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

/** Renders an effect or a theme offline and returns the peak sample, to prove it is not silent. */
async function peakOf(kind: 'effect' | 'theme', name: string): Promise<number> {
  const seconds = kind === 'effect' ? 1.2 : 8;
  const ctx = new OfflineAudioContext(1, 44100 * seconds, 44100);
  const noise = makeNoiseBuffer(ctx);
  if (kind === 'effect') {
    renderEffect(name as EffectId, { ctx, dest: ctx.destination, noise }, 0.01);
  } else {
    const theme = compileTheme(THEMES[name as RegionId]);
    const buses = { bass: ctx.destination, rest: ctx.destination };
    for (let s = 0; s * theme.stepSec < seconds; s++) scheduleStep(ctx, buses, noise, theme, s, s * theme.stepSec);
  }
  const out = await ctx.startRendering();
  let peak = 0;
  for (const v of out.getChannelData(0)) peak = Math.max(peak, Math.abs(v));
  return peak;
}

const ev = (id: string): EvidenceId => id as EvidenceId;

const dev = {
  game,
  source,
  audio,
  keys: UiSceneKeys,
  peakOf,
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
      { kind: 'evidence', evidenceId: ev('c2.clue.fragment'), chapter: 2 },
      { kind: 'evidence', evidenceId: ev('c2.clue.tracks'), chapter: 2 },
      { kind: 'evidence', evidenceId: ev('c2.clue.ledger'), chapter: 2 },
      { kind: 'lead', deductionId: 'c2.deduction.office', chapter: 2 },
      { kind: 'mykoCall', sectionId: 'c3.fight.bay', callKind: 'fight', chapter: 3 },
    ];
  },
  openBoard(): void {
    source.board = {
      id: 'c2.deduction.office',
      chapter: 2,
      candidateIds: ['c2.clue.fragment', 'c2.clue.tracks', 'c2.clue.ledger', 'c2.clue.sheep', 'c2.clue.poitin'].map(ev),
      solution: [ev('c2.clue.fragment'), ev('c2.clue.tracks'), ev('c2.clue.ledger')],
      leadTextId: 'dev.deduction.lead',
      leadMarginTextId: 'dev.deduction.leadMargin',
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
