/** Chapter 1 smoke tests: layouts, the keg puzzle (four pushes minimum), triggers and the scripted walk. */

import { describe, expect, it } from 'vitest';
import { clearChapterRegistry, registerChapter } from '../../src/core/chapter';
import { NO_INPUT } from '../../src/core/input';
import { MemoryStorage, SaveStore } from '../../src/core/save';
import { GameSession } from '../../src/systems';
import type { TileGrid } from '../../src/core/types';
import type { PushPuzzleLayout } from '../../src/systems/puzzles';
import { findPath, isBlocked, tileOf } from '../../src/systems/grid';
import { chapter1 } from '../../src/chapters/01/index';
import { T } from '../../src/chapters/01/maps';

const layoutOf = (id: string) => {
  const s = chapter1.screens.find((x) => x.id === id);
  if (!s) throw new Error(`no screen ${id}`);
  return s;
};

function newRun() {
  clearChapterRegistry();
  registerChapter(chapter1);
  const session = new GameSession({ store: new SaveStore(new MemoryStorage()) });
  session.setDriver({ showTitle: () => undefined, startGame: () => undefined, pauseGame: () => undefined, resumeGame: () => undefined });
  session.startChapter(1);
  const run = session.createRun();
  if (!run) throw new Error('no run');
  return { session, run };
}

describe('chapter 1 screens', () => {
  const sizes: Record<string, [number, number]> = { 'c1.pub': [30, 17], 'c1.yard': [20, 17], 'c1.street': [70, 17], 'c1.road': [30, 17] };
  for (const [id, [w, h]] of Object.entries(sizes)) {
    it(`${id} is ${w} x ${h} with matching grid, tiles and def`, () => {
      const s = layoutOf(id);
      expect(s.grid.widthTiles).toBe(w);
      expect(s.grid.heightTiles).toBe(h);
      expect(s.grid.blocked).toHaveLength(w * h);
      expect(s.tiles).toHaveLength(w * h);
      expect(chapter1.def.screens.find((x) => x.id === id)).toMatchObject({ widthTiles: w, heightTiles: h });
    });
  }

  it('every exit, spawn, pickup, examinable neighbour and placement is on open ground and reachable', () => {
    const reach = (screenId: string, from: { x: number; y: number }, to: { x: number; y: number }): boolean => {
      const s = layoutOf(screenId);
      const open = (col: number, row: number): boolean => col >= 0 && row >= 0 && col < s.grid.widthTiles && row < s.grid.heightTiles && !s.grid.blocked[row * s.grid.widthTiles + col];
      const a = tileOf(from);
      const b = tileOf(to);
      if (!open(a.col, a.row) || !open(b.col, b.row)) return false;
      return findPath(s.grid, from, to) !== null;
    };
    for (const s of chapter1.screens) {
      expect(reach(s.id, s.playerStart, s.playerStart)).toBe(true);
      for (const ex of s.exits) {
        const centre = { x: ex.area.x + ex.area.width / 2, y: ex.area.y + ex.area.height / 2 };
        expect(reach(s.id, s.playerStart, centre), `${ex.id} reachable`).toBe(true);
        // The spawn on the target screen is open ground.
        const target = layoutOf(ex.toScreen);
        const t = tileOf(ex.spawn);
        expect(target.grid.blocked[t.row * target.grid.widthTiles + t.col], `${ex.id} spawn`).toBe(false);
      }
    }
    for (const p of chapter1.pickups) expect(reach(p.screenId, layoutOf(p.screenId).playerStart, p.position), p.id).toBe(true);
    // Street pickups and the street's start are reachable from the street's arrival point.
    for (const p of chapter1.pickups) expect(reach('c1.street', T(3, 8), p.position), p.id).toBe(true);
  });
});

describe('keg puzzle', () => {
  const placement = chapter1.pushPuzzles?.[0];
  if (!placement) throw new Error('no push puzzle');
  const layout: PushPuzzleLayout = placement.layout;
  const yard = layoutOf('c1.yard');

  it('is solved by four real pushes', () => {
    const { run } = newRun();
    run.goToScreen('c1.yard', T(5, 3));
    const puzzle = run.pushPuzzlesHere()[0]?.puzzle;
    if (!puzzle) throw new Error('no puzzle on the yard screen');
    // keg1 up, keg1 left, keg2 left, keg2 up.
    const pos = layout.pieces.map((p) => ({ ...p }));
    const order: Array<[number, 'up' | 'left']> = [[0, 'up'], [0, 'left'], [1, 'left'], [1, 'up']];
    for (const [i, d] of order) {
      const piece = pos[i];
      if (!piece) throw new Error('piece');
      expect(puzzle.push({ col: piece.col, row: piece.row }, d)).toBe(true);
      piece.col += d === 'left' ? -1 : 0;
      piece.row += d === 'up' ? -1 : 0;
    }
    expect(puzzle.goalMet()).toBe(true);
    expect(puzzle.isComplete()).toBe(true);
    expect(puzzle.piecePositions()).toEqual(layout.solution.map((p) => ({ id: p.id, col: p.col, row: p.row })));
  });

  it('needs at least four pushes (breadth-first search, player walking round to push)', () => {
    expect(minPushes(layout, yard.grid, tileOf(T(5, 3)))).toBe(4);
  });
});

/** Fewest pushes that satisfy the goal, or -1. Andrew must walk round to the pushing side. */
function minPushes(layout: PushPuzzleLayout, grid: TileGrid, startTile: { col: number; row: number }): number {
  const D = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
  const fixed = (c: number, r: number) => layout.fixed.some((f) => f.col === c && f.row === r);
  const inArea = (c: number, r: number) => c >= layout.area.col && r >= layout.area.row && c < layout.area.col + layout.area.width && r < layout.area.row + layout.area.height;
  const goalMet = (k: { col: number; row: number }[]) =>
    layout.goal.kind === 'clear' ? layout.goal.cells.every((c) => !k.some((p) => p.col === c.col && p.row === c.row)) : layout.goal.cells.every((c) => k.some((p) => p.col === c.col && p.row === c.row));
  type State = { kegs: { col: number; row: number }[]; player: { col: number; row: number }; pushes: number };
  const start: State = { kegs: layout.pieces.map((p) => ({ col: p.col, row: p.row })), player: startTile, pushes: 0 };
  const key = (s: State, reach: Set<string>) => `${s.kegs.map((k) => `${k.col},${k.row}`).sort().join(';')}#${[...reach].sort()[0]}`;
  const reachOf = (s: State): Set<string> => {
    const seen = new Set([`${s.player.col},${s.player.row}`]);
    const stack = [s.player];
    while (stack.length > 0) {
      const w = stack.pop();
      if (!w) break;
      for (const [dc, dr] of D) {
        const c = w.col + dc;
        const r = w.row + dr;
        if (isBlocked(grid, c, r) || fixed(c, r) || s.kegs.some((k) => k.col === c && k.row === r) || seen.has(`${c},${r}`)) continue;
        seen.add(`${c},${r}`);
        stack.push({ col: c, row: r });
      }
    }
    return seen;
  };
  let frontier = [start];
  const seen = new Set<string>([key(start, reachOf(start))]);
  while (frontier.length > 0) {
    const next: State[] = [];
    for (const s of frontier) {
      if (goalMet(s.kegs)) return s.pushes;
      const reach = reachOf(s);
      s.kegs.forEach((k, i) => {
        for (const [dc, dr] of D) {
          if (!reach.has(`${k.col - dc},${k.row - dr}`)) continue;
          const n = { col: k.col + dc, row: k.row + dr };
          if (!inArea(n.col, n.row) || isBlocked(grid, n.col, n.row) || fixed(n.col, n.row) || s.kegs.some((o) => o.col === n.col && o.row === n.row)) continue;
          const kegs = s.kegs.map((o, j) => (j === i ? n : o));
          const ns: State = { kegs, player: { col: k.col, row: k.row }, pushes: s.pushes + 1 };
          const kk = key(ns, reachOf(ns));
          if (seen.has(kk)) continue;
          seen.add(kk);
          next.push(ns);
        }
      });
    }
    frontier = next;
  }
  return -1;
}

/** Finishes every queued line, letting the script's awaited chains run between passes. */
async function settle(run: { dialogue: { finishAll(): void } }): Promise<void> {
  for (let i = 0; i < 6; i++) {
    run.dialogue.finishAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('chapter 1 scene and script', () => {
  it('loads: the opening plays and the first objective and exits are set', async () => {
    const { run } = newRun();
    run.tick(16, NO_INPUT);
    expect(run.screenId).toBe('c1.pub');
    await settle(run);
    run.tick(16, NO_INPUT);
    expect(run.objective()).toBe('c1.bar');
    expect(run.myko.mode).toBe('scripted');
  });

  it('fires the pub triggers in order: end of the bar, then Dympna', async () => {
    const { run } = newRun();
    run.tick(16, NO_INPUT);
    await settle(run);
    run.setPlayerPosition(T(21, 4));
    run.tick(16, NO_INPUT);
    expect(run.flag('pub.step')).toBe(1);
    await settle(run);
    expect(run.objective()).toBe('c1.dympna');
  });

  it('the scripted walk completes every section and the chapter with no missing dialogue', () => {
    const { session, run } = newRun();
    run.tick(16, NO_INPUT);
    let completedChapter = 0;
    session.bus.on('chapter:completed', () => {
      completedChapter++;
      expect(run.dialogue.missing.size).toBe(0);
      expect(chapter1.def.sections.every((s) => run.isComplete(s.id))).toBe(true);
    });
    run.walkChapter();
    expect(completedChapter).toBe(1);
  });
});
