import Phaser from 'phaser';

export type WorldMetrics = {
  fps: number;
  objects: number;
  stress: boolean;
};

export const worldBus = new Phaser.Events.EventEmitter();
