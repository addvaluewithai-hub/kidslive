import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { EnglishWorldScene } from './english/EnglishWorldScene';
import { HabitHomeScene } from './habits/HabitHomeScene';
import { PlaceholderPlaceScene } from './PlaceholderPlaceScene';
import { PlanetHubScene } from './PlanetHubScene';
import { SproutWorldScene } from './sprout/SproutWorldScene';

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#dfe8e2',
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, SproutWorldScene, HabitHomeScene, PlanetHubScene, EnglishWorldScene, PlaceholderPlaceScene],
  });
}
