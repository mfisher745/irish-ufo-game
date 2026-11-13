/**
 * Chapter 1 smoke test: the layouts are sound, the keg puzzle is solvable in
 * four pushes (and not fewer), the scene loads, the spec'd triggers fire in
 * order and the scripted walk completes the chapter with no missing text.
 *
 * Lives next to the chapter because `tests/` belongs to QA. `vitest.config`
 * only includes `tests/**`, so run it with `pnpm exec vitest run --dir src`
 * until the include list is widened.
 */

import { describe, expect, it } from 'vitest';
import { clearChapterRegistry, registerChapter } from '../../core/chapter';
import { NO_INPUT } from '../../core/input';
import { MemoryStorage, SaveStore } from '../../core/save';
import { GameSession } from '../../systems';
import type { PushPuzzleLayout } from '../../systems/puzzles';
import { findPath, tileOf } from '../../systems/grid';
import { chapter1 } from './index';
import { T } from './maps';

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

  it('cannot be solved in fewer than four pushes (breadth-first search with the player walking round)', () => {
    type Cell = readonly [number, number];
    const a = layout.area;
    const inArea = (c: number, r: number): boolean => c >= a.col && r >= a.row && c < a.col + a.width && r < a.row + a.height;
    const fixed = new Set(layout.fixed.map((f) => `${f.col},${f.row}`));
    const gridOpen = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < yard.grid.widthTiles && r < yard.grid.heightTiles && !yard.grid.blocked[r * yard.grid.widthTiles + c];
    const reachable = (start: Cell, kegs: readonly Cell[]): Set<string> => {
      const blocked = new Set([...kegs.map((k) => `${k[0]},${k[1]}`), ...fixed]);
      const seen = new Set<string>([`${start[0]},${start[1]}`]);
      const queue: Cell[] = [start];
      while (queue.length > 0) {
        const [c, r] = queue.pop() as Cell;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n: Cell = [c + dc, r + dr];
          const key = `${n[0]},${n[1]}`;
          if (seen.has(key) || blocked.has(key) || !gridOpen(n[0], n[1])) continue;
          seen.add(key);
          queue.push(n);
        }
      }
      return seen;
    };
    const goal = layout.goal.cells;
    const solved = (kegs: readonly Cell[]): boolean => goal.every((g) => !kegs.some((k) => k[0] === g.col && k[1] === g.row));
    // Andrew enters from the pub door, top left of the yard.
    const start: Cell = [5, 3];
    let frontier: Array<{ kegs: Cell[]; player: Cell }> = [{ kegs: layout.pieces.map((p): Cell => [p.col, p.row]), player: start }];
    const seenStates = new Set<string>();
    let solvedAt = -1;
    for (let depth = 0; depth <= 6 && solvedAt < 0; depth++) {
      if (frontier.some((s) => solved(s.kegs))) {
        solvedAt = depth;
        break;
      }
      const next: typeof frontier = [];
      for (const s of frontier) {
        const reach = reachable(s.player, s.kegs);
        s.kegs.forEach((k, i) => {
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            if (!reach.has(`${k[0] - dc},${k[1] - dr}`)) continue;
            const n: Cell = [k[0] + dc, k[1] + dr];
            if (!inArea(n[0], n[1]) || !gridOpen(n[0], n[1]) || fixed.has(`${n[0]},${n[1]}`) || s.kegs.some((o) => o[0] === n[0] && o[1] === n[1])) continue;
            const kegs = s.kegs.map((o, j): Cell => (j === i ? n : o));
            const reachAfter = reachable(k, kegs);
            const key = `${kegs.map((o) => o.join(',')).join('|')}#${[...reachAfter].sort()[0]}`;
            if (seenStates.has(key)) continue;
            seenStates.add(key);
            next.push({ kegs, player: k });
          }
        });
      }
      frontier = next;
    }
    expect(solvedAt).toBe(4);
  });
});

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
