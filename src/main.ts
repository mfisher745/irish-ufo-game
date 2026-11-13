import Phaser from 'phaser';
import { installDebugHooks, parseDebugEntry } from './core/debug';
import { BootScene } from './core/scenes/BootScene';
import { GameScene } from './core/scenes/GameScene';
import { DevHudScene, PlaceholderTitleScene } from './core/scenes/placeholderScenes';
import { session, uiState } from './systems';

// ---------------------------------------------------------------------------
// INTEGRATION POINT (UI, audio, chapters). When src/ui, src/audio and
// src/chapters merge:
//   import './chapters';                          // registers every ChapterModule
//   import { createUiScenes } from './ui';
//   import { createAudio } from './audio';
//   const uiScenes = createUiScenes(uiState);     // Title, Hud, Pause, Casebook, Deduction, Settings
//   createAudio(session.bus, () => session.audioSettings());
// and replace `uiScenes` below; HUD_SCENES becomes ['Hud'].
// ---------------------------------------------------------------------------
const uiScenes: Phaser.Scene[] = [new PlaceholderTitleScene(uiState), new DevHudScene(uiState)];
const HUD_SCENES: readonly string[] = ['DevHud'];

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

const OVERLAYS = ['Pause', 'Casebook', 'Deduction', 'Settings'];

session.setDriver({
  showTitle: () => {
    for (const key of ['Game', ...HUD_SCENES, ...OVERLAYS]) if (game.scene.isActive(key) || game.scene.isPaused(key)) game.scene.stop(key);
    game.scene.start('Title');
  },
  startGame: () => {
    if (game.scene.isActive('Title')) game.scene.stop('Title');
    for (const key of HUD_SCENES) if (game.scene.isActive(key)) game.scene.stop(key);
    if (game.scene.isActive('Game') || game.scene.isPaused('Game')) game.scene.stop('Game');
    game.scene.start('Game');
  },
  pauseGame: () => {
    game.scene.pause('Game');
    if (game.scene.getScene('Pause')) game.scene.run('Pause');
  },
  resumeGame: () => {
    if (game.scene.getScene('Pause')) game.scene.stop('Pause');
    game.scene.resume('Game');
  },
});

installDebugHooks(session);

window.addEventListener('resize', () => {
  game.scale.setZoom(fitZoom());
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
