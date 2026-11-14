/**
 * Presentation constants for the UI: pixel positions at the 480 x 270 internal
 * resolution and display timings. None of these are balance numbers (those are
 * in `src/content/tuning.ts`). docs/style-guide.md sections 4 and 5.
 */

export const SCREEN = { width: 480, height: 270 } as const;

/** Bottom HUD strip, 24 px: slots with their keys, the Buzz meter and state word, Myko's calls. */
export const HUD_STRIP = { y: 246, height: 24 } as const;

/** Commentary and scene dialogue box: 480 x 40 above the strip. */
export const DIALOGUE_BOX = { x: 0, y: 206, width: 480, height: 40 } as const;

/** Portrait at the left of the box. */
export const PORTRAIT = { x: 4, y: 210, size: 32 } as const;

/** Text column inside the box. Rows are 9 px: name, then up to 3 lines. */
export const DIALOGUE_TEXT = { x: 42, y: 208, rowHeight: 9, maxLines: 3, maxChars: 64 } as const;

/** Glyph cell, docs/style-guide.md section 5. */
export const CELL = { width: 6, height: 9 } as const;

/** Health pips: five pint glasses at full health. */
export const HEALTH_PIPS = 5;

/** Top left: health pips on a backing, and below them the heat meter (chapter 8). */
export const HEALTH_BACKING = { x: 0, y: 0, width: 73, height: 18 } as const;
export const HEAT_METER = { x: 4, y: 22, width: 64, height: 4 } as const;

/**
 * Bottom strip layout, x positions left to right. Each cell is 22 px tall at
 * `cellY`. The drink slots, empties, melee and dodge sit on the left; the Buzz
 * block (state word at double size over a meter) in the middle; the special to
 * its right; Myko's calls at the far right.
 */
export const STRIP = {
  cellY: HUD_STRIP.y + 1,
  cellHeight: 22,
  drink: { x: 4, width: 34, gap: 1 },
  empties: { x: 112, width: 29 },
  melee: { x: 144, width: 29 },
  dodge: { x: 176, width: 34 },
  buzz: { x: 214, width: 96 },
  special: { x: 313, width: 108 },
  calls: { x: 424, rollieGap: 14, capX: 467 },
} as const;

export const BUZZ_METER = { width: 64, height: 4 } as const;

/** Presentation timings in milliseconds (or characters per second). */
export const DIALOGUE_TIMING = {
  charsPerSecond: 45,
  boxHoldBaseMs: 1400,
  boxHoldPerCharMs: 35,
  captionHoldBaseMs: 1100,
  captionHoldPerCharMs: 30,
} as const;

export const NOTICE_MS = { saved: 1600, pickup: 3200, ability: 3200 } as const;

/** How long a slot that just changed is highlighted. */
export const SLOT_FLASH_MS = 900;
