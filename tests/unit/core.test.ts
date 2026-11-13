/** src/core: events, input, random, debug entry, plus grid and dialogue runner plain logic. */

import { describe, expect, it } from 'vitest';
import { BusScope, EventBus } from '../../src/core/events';
import { InputTracker } from '../../src/core/input';
import { parseDebugEntry } from '../../src/core/debug';
import { pick, pickAvoiding, randomInt, seededRandom } from '../../src/core/random';
import { DialogueRunner } from '../../src/systems/dialogue';
import { findPath, gridFromAscii, isBlocked, isShade, lineOfSight, moveBox, tileCentre, tileOf, walkableLine } from '../../src/systems/grid';

describe('EventBus', () => {
  it('delivers payloads and unsubscribes', () => {
    const bus = new EventBus();
    const seen: number[] = [];
    const off = bus.on('empties:changed', ({ count }) => void seen.push(count));
    bus.emit('empties:changed', { count: 2 });
    off();
    bus.emit('empties:changed', { count: 3 });
    expect(seen).toEqual([2]);
    expect(bus.listenerCount('empties:changed')).toBe(0);
  });

  it('a handler may unsubscribe itself during emit without skipping others', () => {
    const bus = new EventBus();
    const order: string[] = [];
    const off = bus.on('empties:changed', () => {
      order.push('a');
      off();
    });
    bus.on('empties:changed', () => void order.push('b'));
    bus.emit('empties:changed', { count: 1 });
    bus.emit('empties:changed', { count: 1 });
    expect(order).toEqual(['a', 'b', 'b']);
  });

  it('once fires once; scope disposal drops everything', () => {
    const bus = new EventBus();
    let n = 0;
    bus.once('empties:changed', () => void n++);
    bus.emit('empties:changed', { count: 1 });
    bus.emit('empties:changed', { count: 1 });
    expect(n).toBe(1);
    const scope = new BusScope(bus);
    scope.on('empties:changed', () => void n++);
    scope.on('buzz:changed', () => void n++);
    scope.dispose();
    bus.emit('empties:changed', { count: 1 });
    expect(n).toBe(1);
    expect(bus.listenerCount('buzz:changed')).toBe(0);
  });
});

describe('InputTracker', () => {
  it('reports press, hold time and release (hold M for one second)', () => {
    const t = new InputTracker();
    t.keyDown('KeyM');
    let f = t.frame(16);
    expect(f.pressed.has('callMyko')).toBe(true);
    expect(f.holdMs.callMyko).toBe(16);
    f = t.frame(984);
    expect(f.pressed.has('callMyko')).toBe(false);
    expect(f.holdMs.callMyko).toBe(1000);
    t.keyUp('KeyM');
    f = t.frame(16);
    expect(f.released.has('callMyko')).toBe(true);
    expect(f.held.has('callMyko')).toBe(false);
  });

  it('a tap that starts and ends inside one tick still counts as a press', () => {
    const t = new InputTracker();
    t.mouseDown('left');
    t.mouseUp('left');
    const f = t.frame(16);
    expect(f.pressed.has('melee')).toBe(true);
    expect(t.frame(16).pressed.has('melee')).toBe(false);
  });

  it('rapid mashing inside one tick is still one press edge', () => {
    const t = new InputTracker();
    for (let i = 0; i < 10; i++) {
      t.keyDown('KeyQ');
      t.keyUp('KeyQ');
    }
    t.keyDown('KeyQ');
    const f = t.frame(16);
    expect(f.pressed.has('drink')).toBe(true);
    expect([...f.pressed].filter((a) => a === 'drink')).toHaveLength(1);
    expect(t.frame(16).pressed.has('drink')).toBe(false);
  });

  it('maps WASD, opposite keys cancel, diagonals are +-1 per axis', () => {
    const t = new InputTracker();
    t.keyDown('KeyD');
    t.keyDown('KeyW');
    expect(t.frame(16).move).toEqual({ x: 1, y: -1 });
    t.keyDown('KeyA');
    expect(t.frame(16).move).toEqual({ x: 0, y: -1 });
  });

  it('maps every DESIGN control', () => {
    const cases: [string, string][] = [
      ['Space', 'dodge'],
      ['KeyQ', 'drink'],
      ['Digit1', 'selectDrink1'],
      ['Digit2', 'selectDrink2'],
      ['Digit3', 'selectDrink3'],
      ['KeyF', 'special'],
      ['KeyR', 'cycleSpecial'],
      ['ShiftLeft', 'sneak'],
      ['ShiftRight', 'sneak'],
      ['KeyE', 'interact'],
      ['KeyH', 'hint'],
      ['KeyM', 'callMyko'],
      ['Tab', 'casebook'],
      ['Escape', 'pause'],
    ];
    for (const [code, action] of cases) {
      const t = new InputTracker();
      t.keyDown(code);
      expect(t.frame(16).pressed.has(action as never), code).toBe(true);
    }
    const m = new InputTracker();
    m.mouseDown('right');
    expect(m.frame(16).pressed.has('ranged')).toBe(true);
  });

  it('the wheel steps the selected drink once per notch tick', () => {
    const t = new InputTracker();
    t.wheel('down');
    t.wheel('down');
    expect(t.frame(16).pressed.has('selectDrinkNext')).toBe(true);
    expect(t.frame(16).pressed.has('selectDrinkNext')).toBe(false);
    t.wheel('up');
    expect(t.frame(16).pressed.has('selectDrinkPrev')).toBe(true);
  });

  it('window blur: releaseAll lets go of every key, with release edges and no stuck movement', () => {
    const t = new InputTracker();
    t.keyDown('KeyD');
    t.keyDown('KeyM');
    t.mouseDown('left');
    t.frame(16);
    t.releaseAll();
    const f = t.frame(16);
    expect(f.move).toEqual({ x: 0, y: 0 });
    expect(f.held.size).toBe(0);
    expect(f.released.has('callMyko')).toBe(true);
    expect(f.released.has('melee')).toBe(true);
    expect(t.frame(16).released.size).toBe(0);
  });

  it('a hold restarts from zero after release and re-press', () => {
    const t = new InputTracker();
    t.keyDown('KeyM');
    t.frame(500);
    t.keyUp('KeyM');
    t.frame(16);
    t.keyDown('KeyM');
    expect(t.frame(16).holdMs.callMyko).toBe(16);
  });
});

describe('random', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const c = seededRandom(8);
    const seqA = [a.next(), a.next(), a.next()];
    expect(seqA).toEqual([b.next(), b.next(), b.next()]);
    expect(seqA).not.toEqual([c.next(), c.next(), c.next()]);
  });
  it('stays in [0, 1)', () => {
    const r = seededRandom(1);
    for (let i = 0; i < 5000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('pick helpers', () => {
    const r = seededRandom(3);
    expect(pick(r, [])).toBeUndefined();
    expect(randomInt(r, 1)).toBe(0);
    for (let i = 0; i < 100; i++) expect(pickAvoiding(r, ['a', 'b'], 'a')).toBe('b');
    expect(pickAvoiding(r, ['a'], 'a')).toBe('a');
  });
});

describe('debug entry (?chapter=N, ?sandbox=1)', () => {
  it('parses valid entries', () => {
    expect(parseDebugEntry('?chapter=3')).toEqual({ kind: 'chapter', chapter: 3 });
    expect(parseDebugEntry('?chapter=10')).toEqual({ kind: 'chapter', chapter: 10 });
    expect(parseDebugEntry('?sandbox=1')).toEqual({ kind: 'sandbox' });
  });
  it('rejects bad ones', () => {
    for (const s of ['', '?chapter=0', '?chapter=11', '?chapter=2.5', '?chapter=abc', '?sandbox=0', '?chapter=']) expect(parseDebugEntry(s), s).toBeNull();
  });
});

describe('grid', () => {
  const g = gridFromAscii(['.....', '..#..', '.x...', '..~..']);
  it('builds flags from ASCII and treats out of bounds as blocked', () => {
    expect(isBlocked(g, 2, 1)).toBe(true);
    expect(isBlocked(g, 1, 2)).toBe(true);
    expect(isBlocked(g, 0, 0)).toBe(false);
    expect(isBlocked(g, -1, 0)).toBe(true);
    expect(isBlocked(g, 5, 0)).toBe(true);
    expect(isShade(g, tileCentre({ col: 2, row: 3 }))).toBe(true);
    expect(isShade(g, tileCentre({ col: 0, row: 0 }))).toBe(false);
  });
  it('tile maths round-trips', () => {
    expect(tileOf({ x: 15.9, y: 16 })).toEqual({ col: 0, row: 1 });
    expect(tileOf(tileCentre({ col: 4, row: 7 }))).toEqual({ col: 4, row: 7 });
  });
  it('line of sight: walls block, the start tile never does', () => {
    expect(lineOfSight(g, tileCentre({ col: 0, row: 1 }), tileCentre({ col: 4, row: 1 }))).toBe(false);
    expect(lineOfSight(g, tileCentre({ col: 0, row: 0 }), tileCentre({ col: 4, row: 0 }))).toBe(true);
    expect(lineOfSight(g, tileCentre({ col: 2, row: 1 }), tileCentre({ col: 4, row: 1 }))).toBe(true);
    expect(walkableLine(g, tileCentre({ col: 0, row: 2 }), tileCentre({ col: 3, row: 2 }))).toBe(false);
  });
  it('A* walks round obstacles, returns null for walled-off or blocked goals', () => {
    const p = findPath(g, tileCentre({ col: 0, row: 1 }), tileCentre({ col: 4, row: 1 }));
    expect(p?.at(-1)).toEqual(tileCentre({ col: 4, row: 1 }));
    for (const step of p ?? []) expect(isBlocked(g, tileOf(step).col, tileOf(step).row)).toBe(false);
    expect(findPath(g, tileCentre({ col: 0, row: 0 }), tileCentre({ col: 2, row: 1 }))).toBeNull();
    const walled = gridFromAscii(['..#..', '..#..', '..#..']);
    expect(findPath(walled, tileCentre({ col: 0, row: 0 }), tileCentre({ col: 4, row: 0 }))).toBeNull();
  });
  it('does not cut corners diagonally', () => {
    const corner = gridFromAscii(['.#', '#.']);
    expect(findPath(corner, tileCentre({ col: 0, row: 0 }), tileCentre({ col: 1, row: 1 }))).toBeNull();
  });
  it('moveBox stops at walls and cannot tunnel through a thin one at speed', () => {
    const w = gridFromAscii(['.....', '..#..', '.....']);
    const r = moveBox(w, tileCentre({ col: 0, row: 1 }), 10, 8, { x: 200, y: 0 });
    expect(r.blockedX).toBe(true);
    expect(r.position.x).toBeLessThan(2 * 16);
    const free = moveBox(w, tileCentre({ col: 0, row: 0 }), 10, 8, { x: 30, y: 0 });
    expect(free.blockedX).toBe(false);
    expect(free.position.x).toBeCloseTo(8 + 30, 5);
  });
});

describe('DialogueRunner', () => {
  const lookup = { delivery: (id: string) => (id.startsWith('s') ? ('scene' as const) : id.startsWith('b') ? ('box' as const) : id.startsWith('c') ? ('caption' as const) : null) };

  it('queues per channel, shows one at a time, and a scene blocks play until finished', async () => {
    const bus = new EventBus();
    const shown: string[] = [];
    const done: string[] = [];
    bus.on('dialogue:show', ({ sequenceId }) => void shown.push(sequenceId));
    bus.on('dialogue:finished', ({ sequenceId }) => void done.push(sequenceId));
    const d = new DialogueRunner(bus, lookup);
    const p = d.play('s1');
    void d.play('b1');
    void d.play('b2');
    void d.play('s2');
    expect(d.blocking).toBe(true);
    expect(shown).toEqual(['s1', 'b1']);
    d.finished('s1');
    await p;
    expect(shown).toEqual(['s1', 'b1', 's2']);
    d.finished('s2');
    expect(d.blocking).toBe(false);
    d.finished('b1');
    expect(shown.at(-1)).toBe('b2');
    expect(done).toEqual(['s1', 's2', 'b1']);
  });

  it('commentary boxes never block', () => {
    const d = new DialogueRunner(new EventBus(), lookup);
    void d.play('b1');
    void d.play('c1');
    expect(d.blocking).toBe(false);
    expect(d.showing('box')).toBe('b1');
    expect(d.showing('caption')).toBe('c1');
  });

  it('unknown IDs resolve at once and are recorded', async () => {
    const d = new DialogueRunner(new EventBus(), lookup);
    await d.play('zzz');
    expect(d.missing.has('zzz')).toBe(true);
    expect(d.blocking).toBe(false);
  });

  it('stale or unknown finished() calls are ignored', () => {
    const bus = new EventBus();
    const d = new DialogueRunner(bus, lookup);
    d.finished('nope');
    void d.play('s1');
    d.finished('s2');
    expect(d.blocking).toBe(true);
  });

  it('finishAll clears everything, queued included', () => {
    const d = new DialogueRunner(new EventBus(), lookup);
    void d.play('s1');
    void d.play('s2');
    void d.play('b1');
    d.finishAll();
    expect(d.blocking).toBe(false);
    expect(d.showing('box')).toBeNull();
  });

  it('clear resolves waiting promises so scripts do not hang', async () => {
    const d = new DialogueRunner(new EventBus(), lookup);
    const a = d.play('s1');
    const b = d.play('s2');
    d.clear();
    await Promise.all([a, b]);
    expect(d.blocking).toBe(false);
  });
});
