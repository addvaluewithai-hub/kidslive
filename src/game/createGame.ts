import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { PlaceholderPlaceScene } from './PlaceholderPlaceScene';
import { PlanetHubScene } from './PlanetHubScene';

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#071426',
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, PlanetHubScene, PlaceholderPlaceScene],
  });
}
