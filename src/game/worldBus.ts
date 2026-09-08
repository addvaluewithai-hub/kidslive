import Phaser from 'phaser';

export type StressLevel = 0 | 1 | 2 | 3;

export type WorldMetrics = {
  fps: number;
  averageFps: number;
  onePercentLowFps: number;
  frameMs: number;
  worstFrameMs: number;
  longFrames: number;
  objects: number;
  stressLevel: StressLevel;
  stressLabel: string;
};

export const worldBus = new Phaser.Events.EventEmitter();
