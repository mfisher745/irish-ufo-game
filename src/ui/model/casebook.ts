/**
 * Casebook grouping and text-ID conventions (docs/style-guide.md section 6).
 *   evidence  `<evidenceId>.title|body|margin`
 *   lead      `<deductionId>.lead.title|body|margin`
 *   mykoCall  `c<chapter>.call.<fight|puzzle>.casebook|margin`, title `ui.casebook.callTitle`
 * An ID that does not exist is treated as absent and nothing is drawn for it.
 */

import { PROOFS } from '../../core/types';
import type { CasebookEntry, ChapterNumber, TextId } from '../../core/types';

export type CasebookTab = 'clues' | 'leads' | 'proof';

export const CASEBOOK_TABS = ['clues', 'leads', 'proof'] as const satisfies readonly CasebookTab[];

export interface CasebookItem {
  readonly key: string;
  readonly tab: CasebookTab;
  readonly chapter: ChapterNumber;
  /** Short title text ID, or null when the list shows the chapter label instead. */
  readonly titleId: TextId | null;
  readonly bodyId: TextId;
  readonly marginId: TextId;
}

export const tabTextId = (tab: CasebookTab): TextId => `ui.casebook.${tab}`;

export function toItem(entry: CasebookEntry): CasebookItem {
  switch (entry.kind) {
    case 'evidence': {
      const id = entry.evidenceId;
      const isProof = (PROOFS as readonly string[]).includes(id);
      return {
        key: `e:${id}`,
        tab: isProof ? 'proof' : 'clues',
        chapter: entry.chapter,
        titleId: `${id}.title`,
        bodyId: `${id}.body`,
        marginId: `${id}.margin`,
      };
    }
    case 'lead':
      return {
        key: `l:${entry.deductionId}`,
        tab: 'leads',
        chapter: entry.chapter,
        titleId: `${entry.deductionId}.lead.title`,
        bodyId: `${entry.deductionId}.lead.body`,
        marginId: `${entry.deductionId}.lead.margin`,
      };
    case 'mykoCall':
      return {
        key: `m:${entry.sectionId}`,
        tab: 'clues',
        chapter: entry.chapter,
        titleId: 'ui.casebook.callTitle',
        bodyId: `c${entry.chapter}.call.${entry.callKind}.casebook`,
        marginId: `c${entry.chapter}.call.${entry.callKind}.margin`,
      };
  }
}

/** Entries grouped by tab, in the order they were added. */
export function groupCasebook(entries: readonly CasebookEntry[]): Record<CasebookTab, CasebookItem[]> {
  const out: Record<CasebookTab, CasebookItem[]> = { clues: [], leads: [], proof: [] };
  for (const e of entries) {
    const item = toItem(e);
    out[item.tab].push(item);
  }
  return out;
}
