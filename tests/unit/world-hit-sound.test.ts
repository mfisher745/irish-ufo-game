/** Melee hits on the world play `thud` (run.ts), and the punch swing and hit sounds (audio wiring). */

import { describe, expect, it } from 'vitest';
import type { AreaRect, ChapterModule } from '../../src/core/chapter';
import { createSandboxModule } from '../../src/core/sandbox';
import type { ScreenId, Vec2 } from '../../src/core/types';
import type { RunEffect } from '../../src/systems/run';
import { advance, frame, makeRun, record } from './helpers';

const T = (col: number, row: number): Vec2 => ({ x: col * 16 + 8, y: row * 16 + 8 });
const tileRect = (col: number, row: number): AreaRect => ({ x: col * 16, y: row * 16, width: 16, height: 16 });
const BARREL = { col: 6, row: 8 }; // one hit
const CRATE = { col: 11, row: 8 }; // two hits
const EMPTY = { col: 16, row: 7 }; // nothing stands here

/** A sandbox run whose script registers `hooks` (area + screen) and counts nothing else. */
function setup(hooks: { area: AreaRect; screen?: ScreenId }[] = [], withSpy = true) {
  const base = createSandboxModule(1);
  const module: ChapterModule = {
    ...base,
    createScript: (ctx) => {
      const inner = base.createScript?.(ctx) ?? {};
      return {
        ...inner,
        onStart: (info) => {
          inner.onStart?.(info);
          for (const h of hooks) ctx.onMeleeHit(h.area, () => undefined, h.screen);
        },
      };
    },
  };
  const effects: RunEffect[] = [];
  const h = makeRun(withSpy ? { module, playEffect: (id) => void effects.push(id) } : { module });
  const thuds = (): number => effects.filter((e) => e === 'thud').length;
  /** One full swing from `from` facing `at`, with time to recover. */
  const punch = (from: Vec2, at: Vec2): void => {
    h.run.setPlayerPosition(from);
    h.run.tick(16, frame({ pressed: ['melee'], aim: at }));
    advance(h.run, 700);
  };
  return { ...h, effects, thuds, punch };
}

describe('world-hit thud', () => {
  it('a swing overlapping an onMeleeHit area on this screen plays thud exactly once', () => {
    const s = setup([{ area: tileRect(EMPTY.col, EMPTY.row) }]);
    s.punch(T(15, 7), T(20, 7));
    expect(s.thuds()).toBe(1);
    // A second, separate swing is a second thud.
    s.punch(T(15, 7), T(20, 7));
    expect(s.thuds()).toBe(2);
  });

  it('a swing that misses the area, or faces away from it, plays none', () => {
    const s = setup([{ area: tileRect(EMPTY.col, EMPTY.row) }]);
    s.punch(T(15, 7), T(10, 7));
    s.punch(T(2, 2), T(3, 2));
    expect(s.thuds()).toBe(0);
  });

  it('an area registered for another screen plays none', () => {
    const s = setup([{ area: tileRect(EMPTY.col, EMPTY.row), screen: 'not.this.screen' as ScreenId }]);
    s.punch(T(15, 7), T(20, 7));
    expect(s.thuds()).toBe(0);
  });

  it('overlapping two hook areas is still one thud', () => {
    const s = setup([{ area: tileRect(EMPTY.col, EMPTY.row) }, { area: tileRect(EMPTY.col, EMPTY.row) }]);
    s.punch(T(15, 7), T(20, 7));
    expect(s.thuds()).toBe(1);
  });

  it('a hook area plus a breakable in the same swing is one thud', () => {
    const s = setup([{ area: tileRect(BARREL.col, BARREL.row) }, { area: tileRect(CRATE.col, CRATE.row) }]);
    // The crate does not break on its first hit, so the hook and the crate both want a thud.
    s.punch(T(CRATE.col, CRATE.row + 1), T(CRATE.col, CRATE.row));
    expect(s.thuds()).toBe(1);
  });

  it('a non-breaking hit on a multi-hit breakable is one thud', () => {
    const s = setup();
    const broken = record(s.bus, 'prop:broken');
    s.punch(T(CRATE.col, CRATE.row + 1), T(CRATE.col, CRATE.row));
    expect(broken).toEqual([]);
    expect(s.thuds()).toBe(1);
  });

  it('the hit that breaks the prop plays no thud and prop:broken still fires', () => {
    const s = setup();
    const broken = record(s.bus, 'prop:broken');
    s.punch(T(CRATE.col, CRATE.row + 1), T(CRATE.col, CRATE.row));
    expect(s.thuds()).toBe(1);
    s.punch(T(CRATE.col, CRATE.row + 1), T(CRATE.col, CRATE.row));
    expect(broken).toHaveLength(1);
    expect(s.thuds()).toBe(1); // the breaking swing added none
    // And a one-hit barrel never thuds.
    const b = setup();
    const bBroken = record(b.bus, 'prop:broken');
    b.punch(T(BARREL.col, BARREL.row + 1), T(BARREL.col, BARREL.row));
    expect(bBroken).toHaveLength(1);
    expect(b.thuds()).toBe(0);
  });

  it('a thrown bottle that hits a breakable plays no thud', () => {
    const base = createSandboxModule(1);
    const effects: RunEffect[] = [];
    const h = makeRun({
      module: base,
      save: (s) => ({ ...s, player: { ...s.player, empties: 3 } }),
      playEffect: (id) => void effects.push(id),
    });
    const broken = record(h.bus, 'prop:broken');
    h.run.unlockAbility('bottleThrow');
    for (const prop of [BARREL, CRATE]) {
      h.run.setPlayerPosition(T(prop.col, prop.row + 4));
      const aim = T(prop.col, prop.row);
      h.run.tick(16, frame({ pressed: ['ranged'], aim }));
      h.run.tick(16, frame({ released: ['ranged'], holdMs: { ranged: 50 }, aim }));
      advance(h.run, 1500);
    }
    expect(broken.length).toBeGreaterThan(0); // the bottles did hit
    expect(effects.filter((e) => e === 'thud')).toEqual([]);
  });

  it('with no playEffect option a world hit does not throw', () => {
    const s = setup([{ area: tileRect(EMPTY.col, EMPTY.row) }], false);
    expect(() => {
      s.punch(T(15, 7), T(20, 7));
      s.punch(T(CRATE.col, CRATE.row + 1), T(CRATE.col, CRATE.row));
    }).not.toThrow();
  });
});
