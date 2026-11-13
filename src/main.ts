import Phaser from 'phaser';
import { BootScene } from './core/BootScene';

const WIDTH = 480;
const HEIGHT = 270;

// Largest whole-number zoom that fits the window (minimum 1).
const fitZoom = (): number =>
  Math.max(1, Math.floor(Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT)));

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
  },
  scene: [BootScene],
});

window.addEventListener('resize', () => {
  game.scale.setZoom(fitZoom());
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
