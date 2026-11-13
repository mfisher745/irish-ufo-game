import Phaser from 'phaser';
import { createAudio } from './audio';
import { installDebugHooks, parseDebugEntry } from './core/debug';
import { BootScene } from './core/scenes/BootScene';
import { GameScene } from './core/scenes/GameScene';
import { GameEvents } from './core/types';
import { session, uiState } from './systems';
import { UiSceneKeys, createUiScenes } from './ui';

// ---------------------------------------------------------------------------
// INTEGRATION POINT. UI and audio are wired here. Chapters register
// themselves when `src/chapters/index.ts` exists: add `import './chapters';`.
// ---------------------------------------------------------------------------
const audio = createAudio(session.bus, () => session.audioSettings());
session.bus.on(GameEvents.ScreenEntered, ({ region }) => audio.setRegion(region));
session.playEffect = (id) => audio.play(id);
const uiScenes = createUiScenes(uiState, { play: (id) => audio.play(id) });
const HUD_SCENES: readonly string[] = [UiSceneKeys.Hud];
const OVERLAYS: readonly string[] = [UiSceneKeys.Pause, UiSceneKeys.Casebook, UiSceneKeys.Deduction, UiSceneKeys.Settings];

const WIDTH = 480;
const HEIGHT = 270;

// Largest whole-number zoom that fits the window (minimum 1).
const fitZoom = (): number =>
  Math.max(1, Math.floor(Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT)));

const entry = parseDebugEntry(window.location.search);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d130f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    width: WIDTH,
    height: HEIGHT,
    zoom: fitZoom(),
    fullscreenTarget: 'game',
  },
  scene: [new BootScene(session, entry), new GameScene(session, HUD_SCENES), ...uiScenes],
});

const stopIfRunning = (key: string): void => {
  if (game.scene.getScene(key) && (game.scene.isActive(key) || game.scene.isPaused(key) || game.scene.isSleeping(key))) game.scene.stop(key);
};

session.setDriver({
  showTitle: () => {
    for (const key of ['Game', ...HUD_SCENES, ...OVERLAYS]) stopIfRunning(key);
    game.scene.start(UiSceneKeys.Title);
  },
  startGame: () => {
    stopIfRunning(UiSceneKeys.Title);
    for (const key of [...HUD_SCENES, ...OVERLAYS]) stopIfRunning(key);
    stopIfRunning('Game');
    game.scene.start('Game');
  },
  // The UI opens and closes its own pause and casebook overlays.
  pauseGame: () => game.scene.pause('Game'),
  resumeGame: () => game.scene.resume('Game'),
});

installDebugHooks(session);
(globalThis as { __phaserGame?: Phaser.Game }).__phaserGame = game;

// Keep the whole-number zoom on window resize and on Phaser's fullscreen and resize events.
const refit = (): void => {
  const z = fitZoom();
  if (game.scale.zoom !== z) game.scale.setZoom(z);
};
window.addEventListener('resize', refit);
game.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, refit);
game.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, refit);
game.scale.on(Phaser.Scale.Events.RESIZE, refit);
document.addEventListener('fullscreenchange', refit);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
