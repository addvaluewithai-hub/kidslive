import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const { centerX, centerY } = this.cameras.main;

    this.add
      .text(centerX, centerY, 'Production foundation ready', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#dfe8ff',
      })
      .setOrigin(0.5);
  }
}
