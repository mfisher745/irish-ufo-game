/**
 * Fullscreen through Phaser's scale manager. The game keeps its whole-number
 * zoom; the scale mode is not changed here. Alt+Enter works wherever a UI
 * scene is running (the HUD and the title both bind it).
 */

import type Phaser from 'phaser';

const bound = new WeakSet<Phaser.Game>();

export function toggleFullscreen(game: Phaser.Game): void {
  if (game.scale.isFullscreen) game.scale.stopFullscreen();
  else game.scale.startFullscreen({ navigationUI: 'hide' });
}

/** Bind Alt+Enter once per game. Safe to call from every scene's create(). */
export function bindFullscreenHotkey(game: Phaser.Game): void {
  if (bound.has(game)) return;
  bound.add(game);
  const onKey = (e: KeyboardEvent): void => {
    if (e.altKey && (e.key === 'Enter' || e.code === 'Enter') && !e.repeat) {
      e.preventDefault();
      toggleFullscreen(game);
    }
  };
  window.addEventListener('keydown', onKey);
  game.events.once('destroy', () => {
    window.removeEventListener('keydown', onKey);
    bound.delete(game);
  });
}
