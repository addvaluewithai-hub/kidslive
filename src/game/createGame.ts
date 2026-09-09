import Phaser from 'phaser';
import { BootScene } from './BootScene';

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#080d1a',
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene],
  });
}
