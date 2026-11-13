/**
 * Presentation constants for the UI: pixel positions at the 480 x 270 internal
 * resolution and display timings. None of these are balance numbers (those are
 * in `src/content/tuning.ts`). docs/style-guide.md sections 4 and 5.
 */

export const SCREEN = { width: 480, height: 270 } as const;

/** Bottom HUD strip, 16 px. */
export const HUD_STRIP = { y: 254, height: 16 } as const;

/** Commentary and scene dialogue box: 480 x 40 above the strip. */
export const DIALOGUE_BOX = { x: 0, y: 214, width: 480, height: 40 } as const;

/** Portrait at the left of the box. */
export const PORTRAIT = { x: 4, y: 218, size: 32 } as const;

/** Text column inside the box. Rows are 9 px: name, then up to 3 lines. */
export const DIALOGUE_TEXT = { x: 42, y: 216, rowHeight: 9, maxLines: 3, maxChars: 64 } as const;

/** Glyph cell, docs/style-guide.md section 5. */
export const CELL = { width: 6, height: 9 } as const;

/** Health pips: five pint glasses at full health. */
export const HEALTH_PIPS = 5;

export const BUZZ_METER = { x: 4, y: 18, width: 64, height: 6 } as const;
export const HEAT_METER = { x: 4, y: 27, width: 64, height: 4 } as const;

/** Presentation timings in milliseconds (or characters per second). */
export const DIALOGUE_TIMING = {
  charsPerSecond: 45,
  boxHoldBaseMs: 1400,
  boxHoldPerCharMs: 35,
  captionHoldBaseMs: 2200,
  captionHoldPerCharMs: 45,
} as const;

export const NOTICE_MS = { saved: 1600, pickup: 3200, ability: 3200 } as const;
