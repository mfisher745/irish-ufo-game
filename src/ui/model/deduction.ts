/** Link selection for the deduction board. Plain TypeScript. */

import type { EvidenceId } from '../../core/types';

export const LINKS_REQUIRED = 3;

export class LinkSelection {
  private chosen: EvidenceId[] = [];

  constructor(private readonly candidates: readonly EvidenceId[]) {}

  /** Adds an unselected candidate (up to three) or removes a selected one. Returns whether anything changed. */
  toggle(id: EvidenceId): boolean {
    if (!this.candidates.includes(id)) return false;
    const at = this.chosen.indexOf(id);
    if (at >= 0) {
      this.chosen.splice(at, 1);
      return true;
    }
    if (this.chosen.length >= LINKS_REQUIRED) return false;
    this.chosen.push(id);
    return true;
  }

  has(id: EvidenceId): boolean {
    return this.chosen.includes(id);
  }

  /** 1-based position of a chosen item, or 0 when not chosen. */
  order(id: EvidenceId): number {
    return this.chosen.indexOf(id) + 1;
  }

  picks(): readonly EvidenceId[] {
    return [...this.chosen];
  }

  get complete(): boolean {
    return this.chosen.length === LINKS_REQUIRED;
  }

  /** Lines to draw: each chosen item joined to the next. */
  links(): ReadonlyArray<readonly [EvidenceId, EvidenceId]> {
    const out: Array<readonly [EvidenceId, EvidenceId]> = [];
    for (let i = 0; i + 1 < this.chosen.length; i++) {
      const a = this.chosen[i];
      const b = this.chosen[i + 1];
      if (a !== undefined && b !== undefined) out.push([a, b]);
    }
    return out;
  }

  clear(): void {
    this.chosen = [];
  }
}
