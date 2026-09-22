import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { EnglishWorldScene } from './english/EnglishWorldScene';
import { HabitHomeScene } from './habits/HabitHomeScene';
import { PlaceholderPlaceScene } from './PlaceholderPlaceScene';
import { PlanetHubScene } from './PlanetHubScene';
import { SproutWorldSceneProduction } from './sprout/SproutWorldSceneProduction';

const SPROUT_WIDTH = 720;
const SPROUT_HEIGHT = 1280;

export function createGame(parent: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const legacyRuntime =
    params.has('runtimeDebug') ||
    params.get('prototype') === 'legacy' ||
    params.get('prototype') === 'habit-home';

  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#dfe8e2',
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    scale: legacyRuntime
      ? {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        }
      : {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: SPROUT_WIDTH,
          height: SPROUT_HEIGHT,
        },
    scene: [
      BootScene,
      SproutWorldSceneProduction,
      HabitHomeScene,
      PlanetHubScene,
      EnglishWorldScene,
      PlaceholderPlaceScene,
    ],
  });
}
