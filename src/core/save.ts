/**
 * Save storage. DESIGN.md section 7.6.
 *
 * Plain TypeScript: the storage is injected (`localStorage` in the browser,
 * a Map in tests). A save with the wrong version or a broken shape is ignored
 * rather than half-loaded. Audio settings live under their own key and survive
 * New Game.
 */

import { PENDING_TUNING } from '../systems/pendingTuning';
import { SAVE_VERSION } from './types';
import type { AudioSettings, SaveState } from './types';

/** The subset of `Storage` we use. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'same-again.save';
export const AUDIO_KEY = 'same-again.audio';

export class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** localStorage when available and writable, otherwise memory (private mode, tests). */
export function defaultStorage(): StorageLike {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const probe = `${SAVE_KEY}.probe`;
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // Storage blocked; fall through.
  }
  return new MemoryStorage();
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Light structural check: enough to refuse garbage, not a full schema. */
export function isSaveState(v: unknown): v is SaveState {
  if (!isObject(v)) return false;
  if (v['version'] !== SAVE_VERSION) return false;
  const chapter = v['chapter'];
  if (typeof chapter !== 'number' || chapter < 1 || chapter > 10 || !Number.isInteger(chapter)) return false;
  if (typeof v['checkpointId'] !== 'string') return false;
  const respawn = v['respawn'];
  if (!isObject(respawn) || typeof respawn['screenId'] !== 'string' || !isObject(respawn['position'])) return false;
  const player = v['player'];
  if (!isObject(player)) return false;
  if (typeof player['health'] !== 'number' || typeof player['buzz'] !== 'number') return false;
  if (!Array.isArray(player['drinkSlots']) || player['drinkSlots'].length !== 3) return false;
  if (!Array.isArray(player['unlockedAbilities'])) return false;
  if (typeof v['mykoCallsLeft'] !== 'number') return false;
  for (const key of ['mykoCalls', 'finishedChapters', 'completedSectionIds', 'cleanStealthRunIds', 'collectedPickupIds', 'casebook']) {
    if (!Array.isArray(v[key])) return false;
  }
  if (!isObject(v['hintsGiven']) || !isObject(v['flags'])) return false;
  return true;
}

function clamp01(n: unknown, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
}

export class SaveStore {
  constructor(private readonly storage: StorageLike = defaultStorage()) {}

  load(): SaveState | null {
    const raw = this.storage.getItem(SAVE_KEY);
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isSaveState(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  write(state: SaveState): void {
    this.storage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  clear(): void {
    this.storage.removeItem(SAVE_KEY);
  }

  loadAudio(): AudioSettings {
    const defaults = PENDING_TUNING.audioDefaults;
    const raw = this.storage.getItem(AUDIO_KEY);
    if (raw === null) return defaults;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isObject(parsed)) return defaults;
      return {
        musicVolume: clamp01(parsed['musicVolume'], defaults.musicVolume),
        effectsVolume: clamp01(parsed['effectsVolume'], defaults.effectsVolume),
      };
    } catch {
      return defaults;
    }
  }

  writeAudio(settings: AudioSettings): void {
    this.storage.setItem(
      AUDIO_KEY,
      JSON.stringify({ musicVolume: clamp01(settings.musicVolume, 1), effectsVolume: clamp01(settings.effectsVolume, 1) }),
    );
  }
}
