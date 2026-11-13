/**
 * Chapter 1 playthrough against the built game at ?chapter=1.
 *
 * Real keyboard and mouse input where the brief asks for it. Everything waits on
 * game state read through window.__game, never on fixed sleeps (apart from
 * short polling intervals). Positions come from the running game (its grid,
 * its examinables, its puzzle), not from copies of the level data.
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface Vec { x: number; y: number }
interface GameWindow {
  __game: {
    session: {
      run: Run | null;
      store: { load(): { finishedChapters: number[]; mykoCallsLeft: number } | null };
      bus: { on(ev: string, fn: (p: unknown) => void): () => void };
    };
    state(): { screenId: string | null; player: { x: number; y: number; health: number; buzz: number }; currentSection: string | null; completed: string[]; mykoCallsLeft: number; missingDialogue: string[] } | null;
    walkChapter(): void;
    startSection(id: string): void;
    completeCurrent(): string | null;
  };
  __phaserGame: { scene: { getScene(k: string): { cameras: { main: { scrollX: number; scrollY: number; zoom: number } } } } };
  __qa?: { completed: string[]; missing: string[]; sections: string[] };
}
interface Run {
  flag(k: string): unknown;
  isComplete(id: string): boolean;
  screenId: string;
  grid: { widthTiles: number; heightTiles: number; blocked: boolean[] };
  dialogue: { blocking: boolean };
  player: { pos: Vec; health: { current: number; max: number }; inventory: { slots(): ({ drinkId: string; count: number } | null)[]; empties: number }; buzz: { value: number } };
  pushPuzzlesHere(): { puzzle: { piecePositions(): { id: string; col: number; row: number }[]; layout: { fixed: { col: number; row: number }[] }; isComplete(): boolean } }[];
  callsRemaining(): number;
  setPlayerPosition(p: Vec): void;
  goToScreen(id: string, spawn: Vec): void;
  screenLayout: { exits: { id: string; area: { x: number; y: number; width: number; height: number } }[] };
  examinablesHere(): { id: string; position: Vec }[];
  dressing: { interactPoints(screen: string, examinables: unknown): { examinableId: string; position: Vec; kind: string }[] };
  module: { examinables: unknown };
  enemies(): { pos: Vec; down: boolean; health: number }[];
  give(item: object): void;
}

const TILE = 16;

let errors: string[] = [];

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
});

async function start(page: Page): Promise<void> {
  await page.goto('./?chapter=1');
  await page.waitForFunction(() => {
    const g = (window as unknown as GameWindow).__game;
    return g?.session.run != null && g.state() !== null;
  });
  await page.locator('canvas').click({ position: { x: 5, y: 5 }, button: 'middle' }); // focus without a game action
}

const blocking = (page: Page): Promise<boolean> => page.evaluate(() => (window as unknown as GameWindow).__game.session.run?.dialogue.blocking === true);
const flag = (page: Page, key: string): Promise<unknown> => page.evaluate((k) => (window as unknown as GameWindow).__game.session.run?.flag(k), key);
const complete = (page: Page, id: string): Promise<boolean> => page.evaluate((k) => (window as unknown as GameWindow).__game.session.run?.isComplete(k) === true, id);
const screenId = (page: Page): Promise<string | null> => page.evaluate(() => (window as unknown as GameWindow).__game.state()?.screenId ?? null);

/** Presses E until no scripted scene is showing. */
async function dismissScenes(page: Page, maxMs = 20_000): Promise<void> {
  const end = Date.now() + maxMs;
  let quiet = 0;
  while (Date.now() < end) {
    if (await blocking(page)) {
      quiet = 0;
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(40);
    } else if (++quiet >= 3) return; // three looks in a row with nothing blocking (scripts chain scenes)
    else await page.waitForTimeout(60);
  }
  throw new Error('dialogue never cleared');
}

/** Polls until `fn` returns truthy, clearing scenes on the way. */
async function until(page: Page, what: string, fn: () => Promise<unknown>, maxMs = 15_000): Promise<void> {
  const end = Date.now() + maxMs;
  while (Date.now() < end) {
    if (await fn()) return;
    if (await blocking(page)) await page.keyboard.press('KeyE');
    await page.waitForTimeout(50);
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** Breadth-first path over the tile grid, 4-way, avoiding extra blocked cells. Returns tile centres. */
async function route(page: Page, to: Vec, extraBlocked: { col: number; row: number }[] = []): Promise<Vec[]> {
  const info = await page.evaluate(() => {
    const r = (window as unknown as GameWindow).__game.session.run as Run;
    return { w: r.grid.widthTiles, h: r.grid.heightTiles, blocked: r.grid.blocked, pos: r.player.pos };
  });
  const key = (c: number, r: number): number => r * info.w + c;
  const extra = new Set(extraBlocked.map((b) => key(b.col, b.row)));
  const open = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < info.w && r < info.h && !info.blocked[key(c, r)] && !extra.has(key(c, r));
  const start = { c: Math.floor(info.pos.x / TILE), r: Math.floor(info.pos.y / TILE) };
  const goal = { c: Math.floor(to.x / TILE), r: Math.floor(to.y / TILE) };
  const came = new Map<number, number>([[key(start.c, start.r), -1]]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur) break;
    if (cur.c === goal.c && cur.r === goal.r) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { c: cur.c + dc, r: cur.r + dr };
      if (!open(n.c, n.r) || came.has(key(n.c, n.r))) continue;
      came.set(key(n.c, n.r), key(cur.c, cur.r));
      queue.push(n);
    }
  }
  if (!came.has(key(goal.c, goal.r))) throw new Error(`no route to ${JSON.stringify(to)}`);
  const tiles: Vec[] = [];
  for (let k = key(goal.c, goal.r); k !== -1; k = came.get(k) ?? -1) tiles.push({ x: (k % info.w) * TILE + TILE / 2, y: Math.floor(k / info.w) * TILE + TILE / 2 });
  tiles.reverse();
  tiles.shift();
  if (tiles.length > 0) tiles[tiles.length - 1] = { x: to.x, y: to.y };
  return tiles;
}

const KEYS = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS' } as const;

/** One round trip: where Andrew is, which screen, and whether a scene is blocking. */
const look = (page: Page): Promise<{ x: number; y: number; screen: string; blocking: boolean }> =>
  page.evaluate(() => {
    const r = (window as unknown as GameWindow).__game.session.run as Run;
    return { x: r.player.pos.x, y: r.player.pos.y, screen: r.screenId, blocking: r.dialogue.blocking };
  });

const SPEED = 100; // pixels per second, tuning.player.runSpeed

/** Walks with the keyboard to a world point, one tile centre at a time, then taps in to the exact spot. */
async function walkTo(page: Page, to: Vec, opts: { extraBlocked?: { col: number; row: number }[]; tolerance?: number } = {}): Promise<void> {
  const tol = opts.tolerance ?? 2.5;
  const held = new Set<string>();
  const set = async (want: Set<string>): Promise<void> => {
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
  };
  try {
    const startScreen = (await look(page)).screen;
    const wps = await route(page, to, opts.extraBlocked);
    for (const wp of wps) {
      const last = wp === wps[wps.length - 1];
      const end = Date.now() + 10_000;
      for (;;) {
        const p = await look(page);
        if (p.screen !== startScreen) return; // walked through an exit on the way
        if (Date.now() > end) throw new Error(`stuck walking to ${JSON.stringify(wp)} (waypoint ${wps.indexOf(wp)} of ${wps.length}) at ${JSON.stringify(p)} scene ${await page.evaluate(() => JSON.stringify((window as unknown as { __game: { session: { run: { dialogue: { showing(k: string): unknown } } } } }).__game.session.run.dialogue.showing('scene')))}`);
        if (p.blocking) {
          await set(new Set());
          await page.keyboard.press('KeyE');
          await page.waitForTimeout(40);
          continue;
        }
        const dx = wp.x - p.x;
        const dy = wp.y - p.y;
        const slack = last ? tol : 2.5; // tight enough not to clip a one-tile gap with the 10 px body
        if (Math.abs(dx) <= slack && Math.abs(dy) <= slack) break;
        // One axis at a time so he does not clip a corner: x first, then y.
        const alongX = Math.abs(dx) > slack;
        const d = alongX ? dx : dy;
        const key = alongX ? (dx > 0 ? KEYS.right : KEYS.left) : dy > 0 ? KEYS.down : KEYS.up;
        if (Math.abs(d) > 14) {
          await set(new Set([key]));
          await page.waitForTimeout(10);
        } else {
          // Close: a short tap, sized to the remaining distance.
          await set(new Set());
          await page.keyboard.down(key);
          await page.waitForTimeout(Math.max(8, (Math.abs(d) / SPEED) * 1000 * 0.7));
          await page.keyboard.up(key);
          await page.waitForTimeout(30);
        }
      }
    }
  } finally {
    await set(new Set());
  }
}

/** Moves the mouse so the game's aim point is the given world point. */
async function aimAt(page: Page, world: Vec): Promise<void> {
  const s = await page.evaluate(() => {
    const cam = (window as unknown as GameWindow).__phaserGame.scene.getScene('Game').cameras.main;
    const rect = document.querySelector('canvas')?.getBoundingClientRect();
    return { sx: cam.scrollX, sy: cam.scrollY, zoom: cam.zoom, left: rect?.left ?? 0, top: rect?.top ?? 0, scale: (rect?.width ?? 480) / 480 };
  });
  await page.mouse.move(s.left + (world.x - s.sx) * s.zoom * s.scale, s.top + (world.y - s.sy) * s.zoom * s.scale);
  await page.waitForTimeout(80); // aim is sampled once per frame
}

// ---------------------------------------------------------------------------

test('(a) the pub: bar, Dympna, the pint, the fruit machine, out the back door', async ({ page }) => {
  await start(page);
  expect(await screenId(page)).toBe('c1.pub');
  await until(page, 'the opening to finish', async () => (await flag(page, 'intro.done')) === true, 40_000); // title card, then Myko's opening scene

  // Walk to the end of the bar: the "bar" trigger.
  await walkTo(page, { x: 20 * TILE + 8, y: 4 * TILE + 8 });
  await until(page, 'bar trigger', async () => (await flag(page, 'pub.step')) === 1);
  await dismissScenes(page);

  // E beside Dympna.
  const dympna = await page.evaluate(() => {
    const r = (window as unknown as GameWindow).__game.session.run as Run;
    return r.dressing.interactPoints(r.screenId, r.module.examinables).find((e) => e.examinableId === 'c1.dympna')?.position;
  });
  expect(dympna).toBeTruthy();
  const dy = dympna as Vec;
  await walkTo(page, { x: dy.x, y: dy.y + TILE }, { tolerance: 3 });
  await page.keyboard.press('KeyE');
  await until(page, 'pint given', async () => ((await flag(page, 'pub.step')) as number) >= 2);
  await dismissScenes(page);
  await until(page, 'a stout in the slots', () =>
    page.evaluate(() => (window as unknown as GameWindow).__game.session.run?.player.inventory.slots().some((s) => s?.drinkId === 'stout') === true),
  );

  // Q to drink it.
  await page.keyboard.press('KeyQ');
  await until(page, 'Buzz up', async () => (await page.evaluate(() => (window as unknown as GameWindow).__game.state()?.player.buzz ?? 0)) > 10);
  await until(page, 'machine step', async () => ((await flag(page, 'pub.step')) as number) >= 4, 20_000);
  await dismissScenes(page);

  // Walk to the fruit machine (west wall) and punch it, aiming with the mouse.
  const machineWorld = { x: 1 * TILE + 8, y: 7 * TILE + 8 };
  await walkTo(page, { x: 2 * TILE + 8, y: 7 * TILE + 8 });
  await until(page, 'machine intro', async () => (await flag(page, 'machine.intro')) === true);
  await dismissScenes(page);
  await aimAt(page, machineWorld); // the haymaker has to touch the machine, so aim at it
  for (let i = 0; i < 12 && ((await flag(page, 'pub.step')) as number) < 5; i++) {
    // Three clicks inside the combo window, then give the combo time to lapse and look again.
    for (let n = 0; n < 3 && ((await flag(page, 'pub.step')) as number) < 5; n++) {
      await page.mouse.down();
      await page.waitForTimeout(50);
      await page.mouse.up();
      await page.waitForTimeout(220);
    }
    await page.waitForTimeout(700);
  }
  await until(page, 'machine paid out', async () => ((await flag(page, 'pub.step')) as number) >= 5);
  await dismissScenes(page);

  // Out the back door.
  const exit = await page.evaluate(() => (window as unknown as GameWindow).__game.session.run?.screenLayout.exits.find((e) => e.id === 'c1.pub.backdoor')?.area);
  expect(exit).toBeTruthy();
  const a = exit as { x: number; y: number; width: number; height: number };
  await walkTo(page, { x: a.x + a.width / 2, y: a.y + a.height / 2 });
  await until(page, 'yard screen', async () => (await screenId(page)) === 'c1.yard');
  expect(errors).toEqual([]);
});

test('(b) the keg puzzle: four real pushes', async ({ page }) => {
  await start(page);
  await until(page, 'the opening to finish', async () => (await flag(page, 'intro.done')) === true, 40_000);
  // Skip the pub: arrive at the yard door as the back door would deliver him.
  await page.evaluate(() => {
    const r = (window as unknown as GameWindow).__game.session.run as Run;
    r.goToScreen('c1.yard', { x: 5 * 16 + 8, y: 3 * 16 + 8 });
  });
  await until(page, 'yard', async () => (await screenId(page)) === 'c1.yard');
  await dismissScenes(page);

  const pieces = () =>
    page.evaluate(() => {
      const p = (window as unknown as GameWindow).__game.session.run?.pushPuzzlesHere()[0]?.puzzle;
      return { pieces: p?.piecePositions() ?? [], fixed: p?.layout.fixed ?? [], done: p?.isComplete() ?? false };
    });
  const initial = await pieces();
  expect(initial.pieces).toHaveLength(2);
  const [k1, k2] = initial.pieces;
  if (!k1 || !k2) throw new Error('kegs');

  const centre = (c: number, r: number): Vec => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });

  /** Stand on `from`, then walk into the keg until the puzzle registers exactly one push. */
  const push = async (id: string, from: { col: number; row: number }, dir: 'up' | 'left'): Promise<void> => {
    const state = await pieces();
    const blocked = [...state.pieces.map((p) => ({ col: p.col, row: p.row })), ...state.fixed];
    const before = state.pieces.find((p) => p.id === id);
    if (!before) throw new Error(id);
    await walkTo(page, centre(from.col, from.row), { extraBlocked: blocked });
    const key = dir === 'up' ? KEYS.up : KEYS.left;
    await page.keyboard.down(key);
    try {
      await until(page, `${id} to move ${dir}`, async () => {
        const now = (await pieces()).pieces.find((p) => p.id === id);
        return now !== undefined && (now.col !== before.col || now.row !== before.row);
      }, 5000);
    } finally {
      await page.keyboard.up(key);
    }
    const after = (await pieces()).pieces.find((p) => p.id === id);
    expect(after).toEqual({ id, col: before.col + (dir === 'left' ? -1 : 0), row: before.row + (dir === 'up' ? -1 : 0) });
    await page.waitForTimeout(250); // let the keg finish sliding
  };

  // keg1 up, keg1 left, keg2 left, keg2 up.
  await push(k1.id, { col: k1.col, row: k1.row + 1 }, 'up');
  await push(k1.id, { col: k1.col + 1, row: k1.row - 1 }, 'left');
  await push(k2.id, { col: k2.col + 1, row: k2.row }, 'left');
  await push(k2.id, { col: k2.col - 1, row: k2.row + 1 }, 'up');

  await until(page, 'puzzle complete', async () => (await pieces()).done);
  expect(await complete(page, 'c1.puzzle.kegs')).toBe(true);
  expect(errors).toEqual([]);
});

test('(c) walkChapter from a fresh load completes the chapter cleanly', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const g = (window as unknown as GameWindow).__game;
    const w = window as unknown as GameWindow;
    w.__qa = { completed: [], missing: [], sections: [] };
    g.session.bus.on('chapter:completed', () => {
      const run = g.session.run as Run & { dialogue: { missing: Set<string> } };
      (w.__qa as NonNullable<GameWindow['__qa']>).missing = [...run.dialogue.missing];
      (w.__qa as NonNullable<GameWindow['__qa']>).completed = [...(g.state()?.completed ?? [])];
    });
    g.walkChapter();
  });
  const qa = await page.evaluate(() => (window as unknown as GameWindow).__qa);
  expect(qa?.missing).toEqual([]);
  for (const id of ['c1.puzzle.kegs', 'c1.fight.chipper', 'c1.boss.bigtom']) expect(qa?.completed).toContain(id);
  const saved = await page.evaluate(() => (window as unknown as GameWindow).__game.session.store.load());
  expect(saved?.finishedChapters).toContain(1);
  expect(errors).toEqual([]);
});

test('(d) a Myko call on the chipper fight leaves two calls and completes it', async ({ page }) => {
  await start(page);
  await until(page, 'the opening to finish', async () => (await flag(page, 'intro.done')) === true, 40_000);
  await page.evaluate(() => {
    const r = (window as unknown as GameWindow).__game.session.run as Run;
    r.goToScreen('c1.street', { x: 3 * 16 + 8, y: 8 * 16 + 8 });
  });
  await until(page, 'street', async () => (await screenId(page)) === 'c1.street');
  await dismissScenes(page);
  // Step into the chipper area: the trigger starts the fight.
  await page.evaluate(() => (window as unknown as GameWindow).__game.session.run?.setPlayerPosition({ x: 32 * 16, y: 6 * 16 }));
  await until(page, 'chipper fight running', async () => (await page.evaluate(() => (window as unknown as GameWindow).__game.state()?.currentSection)) === 'c1.fight.chipper');
  await dismissScenes(page);
  expect(await page.evaluate(() => (window as unknown as GameWindow).__game.state()?.mykoCallsLeft)).toBe(3);

  // Hold M for just over a second.
  await page.keyboard.down('KeyM');
  await page.waitForTimeout(1250);
  await page.keyboard.up('KeyM');
  await until(page, 'a call spent', async () => (await page.evaluate(() => (window as unknown as GameWindow).__game.state()?.mykoCallsLeft)) === 2);
  await until(page, 'chipper complete', () => complete(page, 'c1.fight.chipper'), 20_000);
  expect(await page.evaluate(() => (window as unknown as GameWindow).__game.state()?.mykoCallsLeft)).toBe(2);
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// Real-input walks that the first version skipped with goToScreen.
// ---------------------------------------------------------------------------

const tile = (col: number, row: number): Vec => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
const debugComplete = (page: Page): Promise<string | null> => page.evaluate(() => (window as unknown as GameWindow).__game.completeCurrent());
const currentSection = (page: Page): Promise<string | null> => page.evaluate(() => (window as unknown as GameWindow).__game.state()?.currentSection ?? null);
const exitCentre = async (page: Page, id: string): Promise<Vec> => {
  const a = await page.evaluate((k) => (window as unknown as GameWindow).__game.session.run?.screenLayout.exits.find((e) => e.id === k)?.area, id);
  if (!a) throw new Error(`no exit ${id} on this screen`);
  return { x: a.x + a.width / 2, y: a.y + a.height / 2 };
};
/** Puts Andrew on a screen without the pub walk (set-up only), once the opening has played out. */
async function arrive(page: Page, screen: string, at: Vec): Promise<void> {
  await until(page, 'the opening to finish', async () => (await flag(page, 'intro.done')) === true, 40_000);
  await page.evaluate(([s, p]) => (window as unknown as GameWindow).__game.session.run?.goToScreen(s as string, p as Vec), [screen, at] as const);
  await until(page, `screen ${screen}`, async () => (await screenId(page)) === screen);
  await dismissScenes(page);
}

test('(e) yard gate to Main Street, then along the street to the chipper', async ({ page }) => {
  await start(page);
  await arrive(page, 'c1.yard', tile(5, 3));
  expect(await currentSection(page)).toBe('c1.puzzle.kegs');
  // The gate is locked until the kegs are shifted.
  await walkTo(page, await exitCentre(page, 'c1.yard.gate'));
  expect(await screenId(page)).toBe('c1.yard');
  expect(await debugComplete(page)).toBe('c1.puzzle.kegs');
  // Standing in the gate, the exit opens under him; if not, step back in.
  if ((await screenId(page)) === 'c1.yard') await walkTo(page, await exitCentre(page, 'c1.yard.gate'));
  await until(page, 'Main Street', async () => (await screenId(page)) === 'c1.street');
  await dismissScenes(page);
  expect(await complete(page, 'c1.puzzle.kegs')).toBe(true);
  // Along the street to the chipper trigger.
  await walkTo(page, tile(32, 6));
  await until(page, 'the chipper fight', async () => (await currentSection(page)) === 'c1.fight.chipper', 30_000);
  expect(errors).toEqual([]);
});

test('(f) boss checkpoint, the boss, and out the east exit to the bog road', async ({ page }) => {
  await start(page);
  await arrive(page, 'c1.street', tile(3, 8));
  await walkTo(page, tile(32, 6));
  await until(page, 'the chipper fight', async () => (await currentSection(page)) === 'c1.fight.chipper', 30_000);
  expect(await debugComplete(page)).toBe('c1.fight.chipper');
  await dismissScenes(page);
  await walkTo(page, tile(43, 9));
  await until(page, 'the boss checkpoint', async () => (await flag(page, 'cp.done')) === true, 30_000);
  await dismissScenes(page);
  await walkTo(page, tile(47, 9));
  await until(page, 'Big Tom', async () => (await currentSection(page)) === 'c1.boss.bigtom', 30_000);
  await dismissScenes(page);
  expect(await debugComplete(page)).toBe('c1.boss.bigtom');
  await dismissScenes(page);
  await walkTo(page, await exitCentre(page, 'c1.street.east'));
  await until(page, 'the bog road', async () => (await screenId(page)) === 'c1.road');
  expect(errors).toEqual([]);
});

// ---------------------------------------------------------------------------
// BALANCE PROBE. Logs numbers, asserts nothing about difficulty. Off unless PROBE=1:
//   PROBE=1 pnpm exec playwright test chapter1 -g "BALANCE PROBE" --workers=1
// A simple bot: stay next to the nearest enemy, aim the mouse at it, click on cooldown, never dodge.
// ---------------------------------------------------------------------------

interface BotLook {
  px: number;
  py: number;
  hp: number;
  maxHp: number;
  buzz: number;
  blocking: boolean;
  foes: { x: number; y: number }[];
  cam: { sx: number; sy: number; zoom: number; left: number; top: number; scale: number };
  deaths: number;
  done: boolean;
}

async function botFight(page: Page, sectionId: string): Promise<{ seconds: number; hpLeft: number; lowestHp: number; maxHp: number; died: boolean; swings: number; buzzEnd: number }> {
  const t0 = Date.now();
  let lowestHp = Infinity; // a completion reward (the spice bag) can heal him, so the end figure alone hides damage taken
  let lastClick = 0;
  let swings = 0;
  const held = new Set<string>();
  const set = async (want: Set<string>): Promise<void> => {
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
  };
  try {
    for (;;) {
      const look: BotLook = await page.evaluate((id) => {
        const w = window as unknown as GameWindow & { __deaths?: number };
        const r = w.__game.session.run as Run;
        const cam = w.__phaserGame.scene.getScene('Game').cameras.main;
        const rect = document.querySelector('canvas')?.getBoundingClientRect();
        return {
          px: r.player.pos.x,
          py: r.player.pos.y,
          hp: r.player.health.current,
          maxHp: r.player.health.max,
          buzz: r.player.buzz.value,
          blocking: r.dialogue.blocking,
          foes: r.enemies().filter((e) => !e.down).map((e) => ({ x: e.pos.x, y: e.pos.y })),
          cam: { sx: cam.scrollX, sy: cam.scrollY, zoom: cam.zoom, left: rect?.left ?? 0, top: rect?.top ?? 0, scale: (rect?.width ?? 480) / 480 },
          deaths: w.__deaths ?? 0,
          done: r.isComplete(id),
        };
      }, sectionId);
      const seconds = (Date.now() - t0) / 1000;
      lowestHp = Math.min(lowestHp, look.hp);
      if (look.deaths > 0) return { seconds, hpLeft: 0, lowestHp: 0, maxHp: look.maxHp, died: true, swings, buzzEnd: look.buzz };
      if (look.done) return { seconds, hpLeft: look.hp, lowestHp, maxHp: look.maxHp, died: false, swings, buzzEnd: look.buzz };
      if (seconds > 150) throw new Error('bot gave up after 150 s');
      if (look.blocking) {
        await set(new Set());
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(40);
        continue;
      }
      const foe = [...look.foes].sort((a, b) => Math.hypot(a.x - look.px, a.y - look.py) - Math.hypot(b.x - look.px, b.y - look.py))[0];
      if (!foe) {
        await set(new Set());
        await page.waitForTimeout(50);
        continue;
      }
      const dx = foe.x - look.px;
      const dy = foe.y - look.py;
      const dist = Math.hypot(dx, dy);
      const want = new Set<string>();
      if (dist > 16) {
        if (Math.abs(dx) > 4) want.add(dx > 0 ? KEYS.right : KEYS.left);
        if (Math.abs(dy) > 4) want.add(dy > 0 ? KEYS.down : KEYS.up);
      }
      await set(want);
      const c = look.cam;
      await page.mouse.move(c.left + (foe.x - c.sx) * c.zoom * c.scale, c.top + (foe.y - c.sy) * c.zoom * c.scale);
      if (Date.now() - lastClick >= 190 && dist < 40) {
        await page.mouse.down();
        await page.mouse.up();
        lastClick = Date.now();
        swings++;
      }
      await page.waitForTimeout(15);
    }
  } finally {
    await set(new Set());
  }
}

for (const n of [1, 2, 3]) {
  test(`BALANCE PROBE run ${n}: chipper fight then Big Tom, logs numbers only`, async ({ page }) => {
    test.skip(!process.env['PROBE'], 'set PROBE=1 to run the balance probe');
    test.setTimeout(420_000);
    await start(page);
    await until(page, 'the opening to finish', async () => (await flag(page, 'intro.done')) === true, 40_000);
    await page.evaluate(() => {
      const w = window as unknown as GameWindow & { __deaths?: number };
      w.__deaths = 0;
      w.__game.session.bus.on('player:died', () => void (w.__deaths = (w.__deaths ?? 0) + 1));
      (w.__game.session.run as Run).give({ kind: 'drink', drinkId: 'stout', count: 1 });
    });
    await page.keyboard.press('KeyQ'); // the first pint
    await dismissScenes(page);
    await page.evaluate(() => (window as unknown as GameWindow).__game.session.run?.goToScreen('c1.street', { x: 3 * 16 + 8, y: 8 * 16 + 8 }));
    await until(page, 'street', async () => (await screenId(page)) === 'c1.street');
    await page.evaluate(() => (window as unknown as GameWindow).__game.session.run?.setPlayerPosition({ x: 31 * 16 + 8, y: 6 * 16 + 8 }));
    await until(page, 'the chipper fight', async () => (await currentSection(page)) === 'c1.fight.chipper', 30_000);
    const chipper = await botFight(page, 'c1.fight.chipper');
    console.log(`PROBE run ${n} chipper ${JSON.stringify(chipper)}`);
    if (chipper.died) return;
    await dismissScenes(page);
    await page.evaluate(() => (window as unknown as GameWindow).__game.session.run?.setPlayerPosition({ x: 43 * 16 + 8, y: 9 * 16 + 8 }));
    await until(page, 'the boss checkpoint', async () => (await flag(page, 'cp.done')) === true, 30_000);
    await dismissScenes(page);
    await page.evaluate(() => (window as unknown as GameWindow).__game.session.run?.setPlayerPosition({ x: 47 * 16 + 8, y: 9 * 16 + 8 }));
    await until(page, 'Big Tom', async () => (await currentSection(page)) === 'c1.boss.bigtom', 30_000);
    const tom = await botFight(page, 'c1.boss.bigtom');
    console.log(`PROBE run ${n} bigtom ${JSON.stringify(tom)}`);
  });
}
