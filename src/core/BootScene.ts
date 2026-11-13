import Phaser from 'phaser';

// Placeholder boot scene: draws a generated rectangle, no assets.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, 200, 120, 0x3f8f4f);
  }
}
