import Phaser from 'phaser';
import type { ChapterRun } from '../../systems/run';
import type { GameSession } from '../../systems/session';
import { WorldView } from '../../systems/view/worldView';
import { PhaserInput } from '../phaserInput';

/** Longest step the simulation takes in one go (tab switches, hitches). */
const MAX_STEP_MS = 50;

/** Runs a `ChapterRun` and draws it. Scene key `Game`. */
export class GameScene extends Phaser.Scene {
  private run: ChapterRun | null = null;
  private view: WorldView | null = null;
  private input_: PhaserInput | null = null;

  constructor(
    private readonly session: GameSession,
    private readonly hudKeys: readonly string[],
  ) {
    super('Game');
  }

  create(): void {
    this.run = this.session.createRun();
    if (!this.run) {
      this.session.quitToTitle();
      return;
    }
    this.input_ = new PhaserInput(this);
    this.view = new WorldView(this, this.run);
    this.cameras.main.startFollow(this.view.playerBody, true, 0.2, 0.2);
    this.cameras.main.setRoundPixels(true);
    for (const key of this.hudKeys) {
      if (this.scene.get(key)) this.scene.launch(key);
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  override update(_time: number, delta: number): void {
    const run = this.run;
    const input = this.input_;
    if (!run || !input || run.isEnded) return;
    const dt = Math.min(delta, MAX_STEP_MS);
    const frame = input.frame(dt);
    if (frame.pressed.has('pause')) {
      this.session.pause();
      return;
    }
    if (frame.pressed.has('casebook') && this.scene.get('Casebook')) this.scene.launch('Casebook');
    run.tick(dt, frame);
    if (this.run === run && !run.isEnded) this.view?.sync();
  }

  private cleanup(): void {
    this.view?.destroy();
    this.view = null;
    this.input_?.destroy();
    this.input_ = null;
    this.run = null;
  }
}
