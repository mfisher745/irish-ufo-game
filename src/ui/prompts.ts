/**
 * Tutorial prompts for chapter scripts, which have no handle on the Phaser
 * game. The HUD scene binds the game when it starts; scripts then call
 * `showPrompt` / `hidePrompt` with a `ui.prompt.*` text ID.
 */

import type Phaser from 'phaser';
import type { TextId } from '../core/types';
import { PROMPT_EVENTS } from './shared';
import type { PromptRequest } from './scenes/HudScene';

let host: Phaser.Game | null = null;

export function bindPromptHost(game: Phaser.Game): void {
  host = game;
}

/** Shows a prompt until hidden. Returns a function that hides it. Does nothing before the HUD exists. */
export function showPrompt(textId: TextId): () => void {
  const req: PromptRequest = { textId };
  host?.events.emit(PROMPT_EVENTS.show, req);
  return () => hidePrompt(textId);
}

export function hidePrompt(textId?: TextId): void {
  host?.events.emit(PROMPT_EVENTS.hide, textId);
}
