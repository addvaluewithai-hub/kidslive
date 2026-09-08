import Phaser from 'phaser';
import { ProductionBenchmarkScene } from './ProductionBenchmarkScene';

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#080b22',
    scene: [ProductionBenchmarkScene],
    render: {
      antialias: false,
      pixelArt: false,
      roundPixels: true,
      powerPreference: 'high-performance',
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 2,
    },
  });
}
