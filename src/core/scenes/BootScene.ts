import Phaser from 'phaser';
import { registerArt } from '../../art';
import type { GameSession } from '../../systems/session';
import { createSandboxModule } from '../sandbox';
import type { DebugEntry } from '../debug';

/** Generates the art, then goes to the title (or a debug entry). */
export class BootScene extends Phaser.Scene {
  constructor(
    private readonly session: GameSession,
    private readonly entry: DebugEntry,
  ) {
    super('Boot');
  }

  create(): void {
    registerArt(this);
    const e = this.entry;
    if (e?.kind === 'sandbox') this.session.startModule(createSandboxModule(1));
    else if (e?.kind === 'chapter') this.session.startChapter(e.chapter);
    else this.session.quitToTitle();
  }
}
