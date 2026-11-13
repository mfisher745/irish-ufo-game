/** DESIGN.md 7.4: casebook, deduction board and the push puzzle. */

import { describe, expect, it } from 'vitest';
import { createSandboxModule } from '../../src/core/sandbox';
import { EventBus } from '../../src/core/events';
import type { CompletionSource, DeductionBoardDef, EvidenceId, SectionId, TileCoord, TileGrid } from '../../src/core/types';
import { Casebook, DeductionBoard, deductionCorrect } from '../../src/systems/investigation';
import { PushPuzzle, cardinalOf } from '../../src/systems/puzzles';
import type { PushPuzzleLayout } from '../../src/systems/puzzles';
import { gridFromAscii, isBlocked } from '../../src/systems/grid';
import type { SectionHost } from '../../src/systems/sections';
import { record } from './helpers';

const host = () => {
  const done: { id: SectionId; by: CompletionSource }[] = [];
  const h: SectionHost = { grantReward: () => undefined, markCompleted: (id, _k, by) => void done.push({ id, by }) };
  return { h, done };
};

describe('Casebook', () => {
  it('adds evidence once, with one event pair', () => {
    const bus = new EventBus();
    const found = record(bus, 'evidence:found');
    const added = record(bus, 'casebook:entryAdded');
    const cb = new Casebook(bus);
    expect(cb.addEvidence('c2.clue.fragment', 2)).toBe(true);
    expect(cb.addEvidence('c2.clue.fragment', 2)).toBe(false);
    expect(cb.entries()).toEqual([{ kind: 'evidence', evidenceId: 'c2.clue.fragment', chapter: 2 }]);
    expect(found).toHaveLength(1);
    expect(added).toHaveLength(1);
    expect(cb.hasEvidence('c2.clue.fragment')).toBe(true);
    expect(cb.hasEvidence('c2.clue.ring')).toBe(false);
  });

  it('records a lead once and a Myko call each time', () => {
    const cb = new Casebook(new EventBus());
    cb.addLead('c3.deduction.boston', 3);
    cb.addLead('c3.deduction.boston', 3);
    cb.addMykoCall('c1.fight.chipper', 'fight', 1);
    cb.addMykoCall('c1.puzzle.kegs', 'puzzle', 1);
    expect(cb.entries().map((e) => e.kind)).toEqual(['lead', 'mykoCall', 'mykoCall']);
  });

  it('restores from a save and lists evidence IDs in order', () => {
    const cb = new Casebook(new EventBus(), [{ kind: 'evidence', evidenceId: 'c2.clue.ring', chapter: 2 }]);
    cb.addEvidence('c2.clue.tracks', 2);
    expect(cb.evidenceIds()).toEqual(['c2.clue.ring', 'c2.clue.tracks']);
  });
});

describe('Deduction board', () => {
  const def: DeductionBoardDef = {
    id: 'c3.deduction.boston',
    chapter: 3,
    candidateIds: ['c3.clue.map', 'c3.clue.manifest', 'c2.clue.fragment', 'c3.clue.brochure'],
    solution: ['c3.clue.map', 'c3.clue.manifest', 'c2.clue.fragment'],
    leadTextId: 'x',
    leadMarginTextId: 'y',
    wrongAnswerDialogueIds: ['w1', 'w2'],
  };
  const [a, b, c] = def.solution;
  const wrong = 'c3.clue.brochure';

  it('needs exactly the three right links, in any order', () => {
    for (const order of [[a, b, c], [c, b, a], [b, a, c], [b, c, a]] as const) expect(deductionCorrect(def, order)).toBe(true);
  });

  it.each<[string, EvidenceId[]]>([
    ['two right and one wrong', [a, b, wrong]],
    ['only two links', [a, b]],
    ['four links', [a, b, c, wrong]],
    ['none', []],
    ['a repeated link', [a, a, b]],
    ['a repeated link padded to three', [a, b, b]],
    ['all wrong', [wrong, 'c9.proof.log', 'c2.clue.ring']],
  ])('rejects %s', (_n, picks) => {
    expect(deductionCorrect(def, picks)).toBe(false);
  });

  const make = () => {
    const bus = new EventBus();
    const cb = new Casebook(bus);
    const said: string[] = [];
    const { h, done } = host();
    const board = new DeductionBoard(def, cb, h, { say: (id) => void said.push(id) });
    return { bus, cb, said, done, board };
  };

  it('wrong answers cost nothing but a remark, which cycles', () => {
    const { bus, cb, said, board, done } = make();
    board.openBoard();
    const subs = record(bus, 'deduction:submitted');
    for (let i = 0; i < 3; i++) expect(board.submit([a, b, wrong], bus)).toBe(false);
    expect(said).toEqual(['w1', 'w2', 'w1']);
    expect(board.isComplete()).toBe(false);
    expect(board.isOpen).toBe(true);
    expect(cb.entries()).toEqual([]);
    expect(done).toEqual([]);
    expect(board.wrongAnswers).toBe(3);
    expect(subs.every((s) => !s.correct)).toBe(true);
  });

  it('a correct answer files the lead, completes once and closes the board', () => {
    const { bus, cb, board, done } = make();
    const opened: boolean[] = [];
    const subs = record(bus, 'deduction:submitted');
    const b2 = new DeductionBoard(def, cb, host().h, { say: () => undefined, onOpenChanged: (o) => void opened.push(o) });
    b2.openBoard();
    expect(b2.submit([c, a, b], bus)).toBe(true);
    expect(b2.isComplete()).toBe(true);
    expect(opened).toEqual([true, false]);
    expect(cb.entries()).toEqual([{ kind: 'lead', deductionId: def.id, chapter: 3 }]);
    expect(subs.at(-1)?.correct).toBe(true);
    expect(b2.submit([a, b, c], bus)).toBe(true);
    expect(cb.entries()).toHaveLength(1);
    void board;
    void done;
  });

  it('completion is reported to the host with the player as source', () => {
    const { bus, board, done } = make();
    board.submit([a, b, c], bus);
    expect(done).toEqual([{ id: def.id, by: 'player' }]);
  });

  it('completeNow (Myko, QA) puts the solution in the casebook and files the lead', () => {
    const { cb, board, done } = make();
    board.completeNow('myko');
    expect(board.isComplete()).toBe(true);
    for (const id of def.solution) expect(cb.hasEvidence(id)).toBe(true);
    expect(cb.entries().filter((e) => e.kind === 'lead')).toHaveLength(1);
    expect(done).toEqual([{ id: def.id, by: 'myko' }]);
    board.completeNow('debug');
    expect(done).toHaveLength(1);
  });

  it('only offers evidence the player actually holds', () => {
    const { cb, board } = make();
    expect(board.candidates()).toEqual([]);
    cb.addEvidence('c3.clue.map', 3);
    cb.addEvidence('c3.clue.brochure', 3);
    expect(board.candidates()).toEqual(['c3.clue.map', 'c3.clue.brochure']);
  });
});

// ---------------------------------------------------------------------------

const puzzleDef = { id: 'c1.puzzle.kegs', chapter: 1, kind: 'push' } as const;

function puzzle(layout: PushPuzzleLayout, grid: TileGrid) {
  const { h, done } = host();
  const p = new PushPuzzle(puzzleDef, layout, grid, h, new EventBus());
  return { p, done };
}

describe('push puzzle rules', () => {
  const grid = gridFromAscii(['........', '........', '..#.....', '........']);
  const layout: PushPuzzleLayout = {
    area: { col: 0, row: 0, width: 6, height: 4 },
    pieces: [
      { id: 'a', col: 1, row: 1 },
      { id: 'b', col: 3, row: 1 },
    ],
    fixed: [{ col: 4, row: 3 }],
    goal: { kind: 'clear', cells: [{ col: 1, row: 1 }, { col: 3, row: 1 }] },
    solution: [{ id: 'a', col: 1, row: 0 }, { id: 'b', col: 3, row: 0 }],
  };

  it('moves one tile per push', () => {
    const { p } = puzzle(layout, grid);
    expect(p.push({ col: 1, row: 1 }, 'up')).toBe(true);
    expect(p.piecePositions().find((x) => x.id === 'a')).toEqual({ id: 'a', col: 1, row: 0 });
    expect(p.pushes).toBe(1);
  });

  it('cannot push into a wall, the area edge, a fixed tile or another piece', () => {
    const { p } = puzzle(layout, grid);
    expect(p.push({ col: 1, row: 1 }, 'down')).toBe(true); // to (1,2)
    expect(p.push({ col: 1, row: 2 }, 'right')).toBe(false); // wall at (2,2)
    expect(p.push({ col: 1, row: 2 }, 'down')).toBe(true);
    expect(p.push({ col: 1, row: 3 }, 'down')).toBe(false); // out of the grid / area
    const q = puzzle(layout, grid).p;
    expect(q.push({ col: 3, row: 1 }, 'left')).toBe(true);
    expect(q.push({ col: 2, row: 1 }, 'left')).toBe(false); // piece a at (1,1)
    const r = puzzle(layout, grid).p;
    r.push({ col: 3, row: 1 }, 'down');
    r.push({ col: 3, row: 2 }, 'down');
    expect(r.push({ col: 3, row: 3 }, 'right')).toBe(false); // fixed (4,3)
    expect(r.push({ col: 3, row: 3 }, 'right')).toBe(false);
    const edge = puzzle({ ...layout, area: { col: 0, row: 0, width: 4, height: 4 } }, grid).p;
    edge.push({ col: 3, row: 1 }, 'up');
    expect(edge.push({ col: 3, row: 0 }, 'right')).toBe(false);
  });

  it('pushing empty air does nothing', () => {
    const { p } = puzzle(layout, grid);
    expect(p.push({ col: 5, row: 3 }, 'up')).toBe(false);
    expect(p.pushes).toBe(0);
  });

  it('a "clear" goal is met when no piece is on the goal cells, and completes once', () => {
    const { p, done } = puzzle(layout, grid);
    expect(p.goalMet()).toBe(false);
    p.push({ col: 1, row: 1 }, 'up');
    expect(done).toEqual([]);
    p.push({ col: 3, row: 1 }, 'up');
    expect(p.goalMet()).toBe(true);
    expect(done).toEqual([{ id: 'c1.puzzle.kegs', by: 'player' }]);
    expect(p.push({ col: 3, row: 0 }, 'left')).toBe(false);
    expect(done).toHaveLength(1);
  });

  it('a "cover" goal needs every cell covered', () => {
    const cover = { ...layout, goal: { kind: 'cover' as const, cells: [{ col: 1, row: 0 }, { col: 3, row: 0 }] } };
    const { p, done } = puzzle(cover, grid);
    p.push({ col: 1, row: 1 }, 'up');
    expect(done).toEqual([]);
    p.push({ col: 3, row: 1 }, 'up');
    expect(done).toHaveLength(1);
  });

  it('completeNow jumps to the solution and completes with the right source', () => {
    const { p, done } = puzzle(layout, grid);
    p.completeNow('myko');
    expect(p.isComplete()).toBe(true);
    expect(p.piecePositions()).toEqual(layout.solution);
    expect(p.goalMet()).toBe(true);
    expect(done).toEqual([{ id: 'c1.puzzle.kegs', by: 'myko' }]);
  });

  it('reset puts pieces back until the puzzle is complete', () => {
    const { p } = puzzle(layout, grid);
    p.push({ col: 1, row: 1 }, 'up');
    p.reset();
    expect(p.piecePositions()).toEqual(layout.pieces);
    expect(p.pushes).toBe(0);
  });

  it('walking into a piece for the hold time pushes it; diagonal input does not', () => {
    const { p } = puzzle(layout, grid);
    const pos = { x: 1 * 16 + 8, y: 2 * 16 + 4 }; // standing just below piece a
    for (let i = 0; i < 5; i++) p.update(16, pos, { x: 1, y: 1 });
    expect(p.pushes).toBe(0);
    for (let i = 0; i < 30; i++) p.update(16, pos, { x: 0, y: -1 });
    expect(p.pushes).toBeGreaterThanOrEqual(1);
  });

  it('cardinalOf', () => {
    expect(cardinalOf({ x: 0, y: -1 })).toBe('up');
    expect(cardinalOf({ x: 1, y: 0 })).toBe('right');
    expect(cardinalOf({ x: 1, y: 1 })).toBeNull();
    expect(cardinalOf({ x: 0, y: 0 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Solvability: a Sokoban search where Andrew has to walk round to the pushing side.
// ---------------------------------------------------------------------------

function solvable(layout: PushPuzzleLayout, grid: TileGrid, playerStart: TileCoord): boolean {
  const key = (pieces: TileCoord[], player: TileCoord) => `${pieces.map((p) => `${p.col},${p.row}`).sort().join(';')}|${player.col},${player.row}`;
  const goalMet = (pieces: TileCoord[]) =>
    layout.goal.kind === 'clear'
      ? layout.goal.cells.every((c) => !pieces.some((p) => p.col === c.col && p.row === c.row))
      : layout.goal.cells.every((c) => pieces.some((p) => p.col === c.col && p.row === c.row));
  const inArea = (c: number, r: number) => c >= layout.area.col && r >= layout.area.row && c < layout.area.col + layout.area.width && r < layout.area.row + layout.area.height;
  const D = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
  const fixed = (c: number, r: number) => layout.fixed.some((f) => f.col === c && f.row === r);
  const start = { pieces: layout.pieces.map((p) => ({ col: p.col, row: p.row })), player: playerStart };
  const seen = new Set([key(start.pieces, start.player)]);
  const queue = [start];
  while (queue.length > 0) {
    const s = queue.shift();
    if (!s) break;
    if (goalMet(s.pieces)) return true;
    // Reachable tiles for the player.
    const reach = new Set<string>([`${s.player.col},${s.player.row}`]);
    const walk = [s.player];
    while (walk.length > 0) {
      const w = walk.pop();
      if (!w) break;
      for (const [dc, dr] of D) {
        const c = w.col + dc;
        const r = w.row + dr;
        if (isBlocked(grid, c, r) || fixed(c, r) || s.pieces.some((p) => p.col === c && p.row === r) || reach.has(`${c},${r}`)) continue;
        reach.add(`${c},${r}`);
        walk.push({ col: c, row: r });
      }
    }
    for (let i = 0; i < s.pieces.length; i++) {
      const p = s.pieces[i];
      if (!p) continue;
      for (const [dc, dr] of D) {
        if (!reach.has(`${p.col - dc},${p.row - dr}`)) continue;
        const nc = p.col + dc;
        const nr = p.row + dr;
        if (!inArea(nc, nr) || isBlocked(grid, nc, nr) || fixed(nc, nr) || s.pieces.some((q) => q.col === nc && q.row === nr)) continue;
        const pieces = s.pieces.map((q, j) => (j === i ? { col: nc, row: nr } : q));
        const player = { col: p.col, row: p.row };
        const k = key(pieces, player);
        if (seen.has(k)) continue;
        seen.add(k);
        queue.push({ pieces, player });
      }
    }
  }
  return false;
}

describe('sandbox keg layout', () => {
  const m = createSandboxModule(1);
  const placement = m.pushPuzzles?.[0];
  const screen = m.screens.find((s) => s.id === placement?.screenId);

  it('exists', () => {
    expect(placement).toBeDefined();
    expect(screen).toBeDefined();
  });

  it('is solvable by pushing, with Andrew walking in from the room', () => {
    if (!placement || !screen) throw new Error('missing');
    expect(solvable(placement.layout, screen.grid, { col: 12, row: 14 })).toBe(true);
  });

  it('is not trivially solved at the start, and every piece starts on a free in-area tile', () => {
    if (!placement || !screen) throw new Error('missing');
    const { p } = puzzle(placement.layout, screen.grid);
    expect(p.goalMet()).toBe(false);
    for (const piece of placement.layout.pieces) {
      expect(p.inArea(piece.col, piece.row)).toBe(true);
      expect(isBlocked(screen.grid, piece.col, piece.row)).toBe(false);
    }
  });

  it('its declared completeNow solution actually satisfies the goal, on free tiles', () => {
    if (!placement || !screen) throw new Error('missing');
    const { p } = puzzle(placement.layout, screen.grid);
    p.completeNow('debug');
    expect(p.goalMet()).toBe(true);
    for (const s of placement.layout.solution) expect(isBlocked(screen.grid, s.col, s.row)).toBe(false);
  });

  it('the solver does reject an impossible layout', () => {
    const g = gridFromAscii(['#####', '#...#', '#####']);
    const lay: PushPuzzleLayout = {
      area: { col: 1, row: 1, width: 3, height: 1 },
      pieces: [{ id: 'k', col: 1, row: 1 }],
      fixed: [],
      goal: { kind: 'clear', cells: [{ col: 1, row: 1 }] },
      solution: [],
    };
    expect(solvable(lay, g, { col: 2, row: 1 })).toBe(false); // would need to push it from the wall side
  });
});
