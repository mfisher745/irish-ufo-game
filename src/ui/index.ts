/**
 * Public entry for the UI. Add the returned scenes to the game config; start
 * `UiSceneKeys.Title` at boot and `UiSceneKeys.Hud` when a chapter begins.
 */

import type Phaser from 'phaser';
import type { TextId } from '../core/types';
import { CasebookScene } from './scenes/CasebookScene';
import { DeductionScene } from './scenes/DeductionScene';
import { HudScene } from './scenes/HudScene';
import type { PromptRequest } from './scenes/HudScene';
import { PauseScene } from './scenes/PauseScene';
import { SettingsScene } from './scenes/SettingsScene';
import { TitleScene } from './scenes/TitleScene';
import { PROMPT_EVENTS, UiSceneKeys, createShared } from './shared';
import type { UiHooks } from './shared';
import type { UiStateSource } from './contract';

export { UiSceneKeys };
export type { UiHooks, UiStateSource };
export { toggleFullscreen } from './fullscreen';

export function createUiScenes(source: UiStateSource, hooks: UiHooks = {}): Phaser.Scene[] {
  const shared = createShared(source, hooks);
  return [
    new TitleScene(shared),
    new HudScene(shared),
    new PauseScene(shared),
    new CasebookScene(shared),
    new DeductionScene(shared),
    new SettingsScene(shared),
  ];
}

/** Show a tutorial prompt (a `ui.prompt.*` text ID) near the bottom of the screen until dismissed. */
export function showTutorialPrompt(game: Phaser.Game, textId: TextId): () => void {
  const req: PromptRequest = { textId };
  game.events.emit(PROMPT_EVENTS.show, req);
  return () => hideTutorialPrompt(game, textId);
}

/** Dismiss one prompt by ID, or all of them when no ID is given. */
export function hideTutorialPrompt(game: Phaser.Game, textId?: TextId): void {
  game.events.emit(PROMPT_EVENTS.hide, textId);
}
