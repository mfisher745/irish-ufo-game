/**
 * Seeded random source. Game logic takes a `Random` instead of calling
 * `Math.random()`, so tests and QA playthroughs are deterministic.
 */

export interface Random {
  /** Uniform in [0, 1). */
  next(): number;
}

/** mulberry32: small, fast, good enough for a game. */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return {
    next(): number {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Integer in [0, n). */
export function randomInt(rng: Random, n: number): number {
  return Math.floor(rng.next() * n);
}

/** One element, or undefined for an empty list. */
export function pick<T>(rng: Random, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[randomInt(rng, items.length)];
}

/** One element, avoiding `avoid` when there is any other choice. */
export function pickAvoiding<T>(rng: Random, items: readonly T[], avoid: T | undefined): T | undefined {
  const pool = items.length > 1 ? items.filter((i) => i !== avoid) : items;
  return pick(rng, pool);
}
