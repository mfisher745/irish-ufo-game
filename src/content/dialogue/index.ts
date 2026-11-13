/**
 * Lookup for all player-visible text. DESIGN.md section 10: no text shown to
 * the player is written anywhere except this directory.
 *
 * - `text(id)` returns one string (names, labels, prompts, casebook entries).
 * - `sequence(id)` returns an ordered set of dialogue lines.
 * - `pool(id)` returns the IDs of a group of interchangeable sequences (death
 *   lines, idle lines, Ohio tangents); the caller picks one.
 *
 * Each content file exports a `DialogueFile`. Add new files to `FILES`.
 */

import type { DialogueId, DialogueSequence, TextId } from '../../core/types';
import { C01 } from './c01';
import { C02 } from './c02';
import { C03 } from './c03';
import { C04 } from './c04';
import { C05 } from './c05';
import { C06 } from './c06';
import { C07 } from './c07';
import { C08 } from './c08';
import { C09 } from './c09';
import { C10 } from './c10';
import { COMMON } from './common';

export interface DialogueFile {
  readonly text: Readonly<Record<TextId, string>>;
  readonly sequences: readonly DialogueSequence[];
  readonly pools?: Readonly<Record<string, readonly DialogueId[]>>;
}

const FILES: readonly DialogueFile[] = [COMMON, C01, C02, C03, C04, C05, C06, C07, C08, C09, C10];

const TEXT = new Map<TextId, string>();
const SEQUENCES = new Map<DialogueId, DialogueSequence>();
const POOLS = new Map<string, readonly DialogueId[]>();

for (const file of FILES) {
  for (const [id, value] of Object.entries(file.text)) {
    if (TEXT.has(id)) throw new Error(`Duplicate text id: ${id}`);
    TEXT.set(id, value);
  }
  for (const seq of file.sequences) {
    if (SEQUENCES.has(seq.id)) throw new Error(`Duplicate sequence id: ${seq.id}`);
    SEQUENCES.set(seq.id, seq);
  }
  for (const [id, ids] of Object.entries(file.pools ?? {})) {
    if (POOLS.has(id)) throw new Error(`Duplicate pool id: ${id}`);
    POOLS.set(id, ids);
  }
}

export function hasText(id: TextId): boolean {
  return TEXT.has(id);
}

/** Throws on an unknown ID so a missing line fails loudly in tests, not silently in play. */
export function text(id: TextId): string {
  const value = TEXT.get(id);
  if (value === undefined) throw new Error(`Unknown text id: ${id}`);
  return value;
}

/** `text()` with `{name}` placeholders filled in. */
export function format(id: TextId, values: Readonly<Record<string, string | number>>): string {
  return text(id).replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = values[key];
    return value === undefined ? whole : String(value);
  });
}

export function hasSequence(id: DialogueId): boolean {
  return SEQUENCES.has(id);
}

export function sequence(id: DialogueId): DialogueSequence {
  const value = SEQUENCES.get(id);
  if (value === undefined) throw new Error(`Unknown dialogue sequence id: ${id}`);
  return value;
}

export function pool(id: string): readonly DialogueId[] {
  const value = POOLS.get(id);
  if (value === undefined) throw new Error(`Unknown dialogue pool id: ${id}`);
  return value;
}

export function allTextIds(): readonly TextId[] {
  return [...TEXT.keys()];
}

export function allSequenceIds(): readonly DialogueId[] {
  return [...SEQUENCES.keys()];
}
