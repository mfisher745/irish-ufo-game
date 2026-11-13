/** Things every UI scene shares. */

import type { EffectId } from '../audio';
import type { UiStateSource } from './contract';
import { OverlayTracker } from './model/overlay';

/** Optional hooks into the audio module. Pass `{ play: audio.play }` from the game. */
export interface UiHooks {
  play?(effect: EffectId): void;
}

export interface UiShared {
  readonly source: UiStateSource;
  readonly hooks: UiHooks;
  /** Pausing overlays (pause menu, casebook). */
  readonly overlays: OverlayTracker;
}

export const UiSceneKeys = {
  Title: 'UiTitle',
  Hud: 'UiHud',
  Pause: 'UiPause',
  Casebook: 'UiCasebook',
  Deduction: 'UiDeduction',
  Settings: 'UiSettings',
} as const;

export type UiSceneKey = (typeof UiSceneKeys)[keyof typeof UiSceneKeys];

export function createShared(source: UiStateSource, hooks: UiHooks): UiShared {
  return {
    source,
    hooks,
    overlays: new OverlayTracker(
      () => source.pause(),
      () => source.resume(),
    ),
  };
}

/** Game-wide event names for the tutorial prompt helper (on `game.events`). */
export const PROMPT_EVENTS = { show: 'ui:prompt:show', hide: 'ui:prompt:hide' } as const;
