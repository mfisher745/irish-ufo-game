/**
 * Small helpers for writing dialogue files compactly. No text lives here.
 */

import type { DialogueDelivery, DialogueId, DialogueLine, DialogueSequence, SpeakerId } from '../../core/types';

/**
 * One line as a tuple: [speaker, text] or [speaker, text, direction].
 * For a generic NPC use 'npc:<text id of the display name>', e.g. 'npc:name.bostonian'.
 */
export type LineTuple =
  | readonly [speaker: SpeakerId | `npc:${string}`, text: string]
  | readonly [speaker: SpeakerId | `npc:${string}`, text: string, direction: string];

function line(id: DialogueId, tuple: LineTuple): DialogueLine {
  const [who, text, direction] = tuple;
  const isNamedNpc = who.startsWith('npc:');
  const speaker = (isNamedNpc ? 'npc' : who) as SpeakerId;
  return {
    id,
    speaker,
    ...(isNamedNpc ? { speakerName: who.slice(4) } : {}),
    ...(direction === undefined ? {} : { direction }),
    text,
  };
}

/** Builds a sequence. Line IDs are `<id>.01`, `<id>.02` and so on. */
export function seq(id: DialogueId, delivery: DialogueDelivery, lines: readonly LineTuple[]): DialogueSequence {
  return {
    id,
    delivery,
    lines: lines.map((tuple, i) => line(`${id}.${String(i + 1).padStart(2, '0')}`, tuple)),
  };
}

/** Non-blocking commentary box (play continues). */
export const box = (id: DialogueId, ...lines: LineTuple[]): DialogueSequence => seq(id, 'box', lines);

/** Scripted scene (pauses play, advances with E or click). */
export const scene = (id: DialogueId, ...lines: LineTuple[]): DialogueSequence => seq(id, 'scene', lines);

/** Narrator caption (chapter titles and location cards only). */
export const caption = (id: DialogueId, text: string): DialogueSequence => seq(id, 'caption', [['narrator', text]]);

/** A numbered group of interchangeable one-line remarks, plus the pool entry listing them. */
export function linePool(
  speaker: SpeakerId,
  poolId: string,
  remarks: readonly string[],
): { sequences: DialogueSequence[]; pool: Record<string, readonly DialogueId[]> } {
  const sequences = remarks.map((text, i) => box(`${poolId}.${String(i + 1).padStart(2, '0')}`, [speaker, text]));
  return { sequences, pool: { [poolId]: sequences.map((s) => s.id) } };
}

export const mykoPool = (poolId: string, remarks: readonly string[]): ReturnType<typeof linePool> =>
  linePool('myko', poolId, remarks);
