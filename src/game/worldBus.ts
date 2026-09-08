import Phaser from 'phaser';

export type BenchmarkLoad = 'steady' | 'busy';

export type WorldMetrics = {
  fps: number;
  averageFps: number;
  onePercentLowFps: number;
  frameMs: number;
  worstFrameMs: number;
  longFrames: number;
  objects: number;
  activeParticles: number;
  animatedObjects: number;
  renderer: 'WEBGL' | 'CANVAS';
  benchmarkLoad: BenchmarkLoad;
  benchmarkLabel: string;
};

export const worldBus = new Phaser.Events.EventEmitter();
