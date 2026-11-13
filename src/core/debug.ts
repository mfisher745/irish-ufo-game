/**
 * Debug entries and QA hooks. DESIGN.md section 10: every chapter has a
 * debug entry (`?chapter=N`) and a scripted way to complete it.
 *
 * - `?chapter=N` starts chapter N with Chapter Select rules.
 * - `?sandbox=1` starts the dev sandbox.
 * - `window.__game` exposes the session for scripted playthroughs.
 */

import type { GameSession } from '../systems/session';
import type { ChapterNumber, SectionId } from './types';

export type DebugEntry = { readonly kind: 'chapter'; readonly chapter: ChapterNumber } | { readonly kind: 'sandbox' } | null;

export function parseDebugEntry(search: string): DebugEntry {
  const params = new URLSearchParams(search);
  if (params.get('sandbox') === '1') return { kind: 'sandbox' };
  const ch = params.get('chapter');
  if (ch !== null) {
    const n = Number(ch);
    if (Number.isInteger(n) && n >= 1 && n <= 10) return { kind: 'chapter', chapter: n as ChapterNumber };
  }
  return null;
}

/** Hooks QA drives from Playwright via `page.evaluate`. */
export interface DebugHooks {
  readonly session: GameSession;
  /** `completeNow('debug')` on the current section; returns its ID or null. */
  completeCurrent(): SectionId | null;
  /** Completes every section of the chapter in order, then the chapter. */
  walkChapter(): void;
  /** Starts a section by ID (as if its trigger fired). */
  startSection(id: SectionId): void;
  /** Small state summary for assertions. */
  state(): {
    readonly chapter: number | null;
    readonly screenId: string | null;
    readonly player: { readonly x: number; readonly y: number; readonly health: number; readonly buzz: number };
    readonly enemiesAlive: number;
    readonly currentSection: string | null;
    readonly completed: readonly string[];
    readonly mykoCallsLeft: number;
    readonly missingDialogue: readonly string[];
  } | null;
}

export function installDebugHooks(session: GameSession): DebugHooks {
  const hooks: DebugHooks = {
    session,
    completeCurrent: () => session.run?.completeCurrent() ?? null,
    walkChapter: () => session.run?.walkChapter(),
    startSection: (id) => session.run?.startSection(id),
    state: () => {
      const r = session.run;
      if (!r) return null;
      const snap = r.snapshot();
      return {
        chapter: r.chapter,
        screenId: r.screenId,
        player: { x: r.player.pos.x, y: r.player.pos.y, health: r.player.health.current, buzz: r.player.buzz.value },
        enemiesAlive: r.enemies().filter((e) => !e.down).length,
        currentSection: r.currentCompletable()?.sectionId ?? null,
        completed: snap.completedSectionIds,
        mykoCallsLeft: snap.mykoCallsLeft,
        missingDialogue: [...r.dialogue.missing],
      };
    },
  };
  (globalThis as { __game?: DebugHooks }).__game = hooks;
  return hooks;
}
