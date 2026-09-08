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
      // The previous final-gate build deliberately disabled antialiasing to maximize
      // throughput. That made the otherwise-fast candidate look visibly pixelated
      // on dense Android screens. The shootout candidate restores smooth sampling so
      // we judge Phaser on both motion and visual quality, not just raw FPS.
      antialias: true,
      antialiasGL: true,
      pixelArt: false,
      roundPixels: false,
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
