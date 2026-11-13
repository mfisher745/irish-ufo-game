/**
 * Tracks which pausing overlays are open so the game is paused when the first
 * opens and resumed when the last closes. Plain TypeScript.
 */
export class OverlayTracker {
  private readonly open = new Set<string>();

  constructor(
    private readonly pause: () => void,
    private readonly resume: () => void,
  ) {}

  isOpen(key: string): boolean {
    return this.open.has(key);
  }

  get any(): boolean {
    return this.open.size > 0;
  }

  show(key: string): void {
    if (this.open.has(key)) return;
    const first = this.open.size === 0;
    this.open.add(key);
    if (first) this.pause();
  }

  hide(key: string): void {
    if (!this.open.delete(key)) return;
    if (this.open.size === 0) this.resume();
  }
}
