import Phaser from 'phaser';
import { PLACES, WORLD_SIZE, type PlaceDefinition } from './worldConfig';
import { worldBus, type StressLevel } from './worldBus';

const BASE_MOTES = 140;
const MAX_FRAME_SAMPLES = 600;

const STRESS_PROFILES: Record<StressLevel, { label: string; sprites: number; dynamicGraphics: boolean }> = {
  0: { label: 'NORMAL', sprites: 0, dynamicGraphics: false },
  1: { label: 'BUSY ×4', sprites: 1200, dynamicGraphics: false },
  2: { label: 'HEAVY ×10', sprites: 3600, dynamicGraphics: false },
  3: { label: 'TORTURE ×20', sprites: 9000, dynamicGraphics: true },
};

type Mote = {
  sprite: Phaser.GameObjects.Image;
  originX: number;
  originY: number;
  phase: number;
  speed: number;
};

type StressSprite = Mote & { radius: number; rotationSpeed: number };

export class PlanetSpikeScene extends Phaser.Scene {
  private nova!: Phaser.GameObjects.Container;
  private motes: Mote[] = [];
  private stressSprites: StressSprite[] = [];
  private stressGraphics!: Phaser.GameObjects.Graphics;
  private stressLevel: StressLevel = 0;
  private selectedPlace = PLACES[0];
  private metricsTimer = 0;
  private tourIndex = 0;
  private frameSamples: number[] = [];

  constructor() {
    super('planet-spike');
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.cameras.main.centerOn(WORLD_SIZE.width / 2, WORLD_SIZE.height / 2);
    this.cameras.main.setZoom(0.78);
    this.cameras.main.roundPixels = true;

    this.createTextures();
    this.createBackdrop();
    this.createRoutes();
    PLACES.forEach((place) => this.createPlace(place));
    this.createMotes(BASE_MOTES);
    this.stressGraphics = this.add.graphics().setDepth(4);
    this.nova = this.createNova(WORLD_SIZE.width / 2, WORLD_SIZE.height / 2);
    this.setupInput();

    worldBus.on('visit', this.visitById, this);
    worldBus.on('tour', this.nextTourStop, this);
    worldBus.on('stress-level', this.setStressLevel, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      worldBus.off('visit', this.visitById, this);
      worldBus.off('tour', this.nextTourStop, this);
      worldBus.off('stress-level', this.setStressLevel, this);
    });

    this.time.delayedCall(350, () => worldBus.emit('ready'));
    this.visit(this.selectedPlace, false);
  }

  update(time: number, delta: number) {
    const seconds = time / 1000;

    for (const mote of this.motes) {
      mote.sprite.x = mote.originX + Math.cos(seconds * mote.speed + mote.phase) * 11;
      mote.sprite.y = mote.originY + Math.sin(seconds * (mote.speed * 0.8) + mote.phase) * 15;
    }

    for (const particle of this.stressSprites) {
      const wave = seconds * particle.speed + particle.phase;
      particle.sprite.x = particle.originX + Math.sin(wave) * particle.radius;
      particle.sprite.y = particle.originY + Math.cos(wave * 0.73) * particle.radius;
      particle.sprite.rotation += particle.rotationSpeed * delta;
    }

    if (STRESS_PROFILES[this.stressLevel].dynamicGraphics) {
      this.redrawStressGraphics(seconds);
    }

    this.frameSamples.push(delta);
    if (this.frameSamples.length > MAX_FRAME_SAMPLES) this.frameSamples.shift();

    this.metricsTimer += delta;
    if (this.metricsTimer >= 500) {
      this.metricsTimer = 0;
      this.emitMetrics();
    }
  }

  private createTextures() {
    if (!this.textures.exists('mote')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
      graphics.generateTexture('mote', 8, 8);
      graphics.destroy();
    }
  }

  private createBackdrop() {
    this.cameras.main.setBackgroundColor('#080b22');

    for (let layer = 0; layer < 3; layer += 1) {
      const stars = this.add.container(0, 0).setScrollFactor(0.12 + layer * 0.12);
      const count = 70 + layer * 35;
      for (let i = 0; i < count; i += 1) {
        const x = Phaser.Math.Between(0, WORLD_SIZE.width);
        const y = Phaser.Math.Between(0, WORLD_SIZE.height);
        const scale = Phaser.Math.FloatBetween(0.25, 0.75) * (layer + 1) * 0.55;
        const star = this.add.image(x, y, 'mote').setScale(scale).setAlpha(0.18 + layer * 0.16);
        stars.add(star);
      }
    }

    const nebula = this.add.graphics().setScrollFactor(0.35);
    nebula.fillStyle(0x35276d, 0.18).fillCircle(850, 640, 500);
    nebula.fillStyle(0x134d68, 0.16).fillCircle(1760, 820, 620);
    nebula.fillStyle(0x5b2055, 0.1).fillCircle(1500, 300, 360);
  }

  private createRoutes() {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x8ca0ff, 0.12);
    const ordered = [...PLACES, PLACES[0]];
    for (let i = 0; i < ordered.length - 1; i += 1) {
      graphics.lineBetween(ordered[i].x, ordered[i].y, ordered[i + 1].x, ordered[i + 1].y);
    }
  }

  private createPlace(place: PlaceDefinition) {
    const node = this.add.container(place.x, place.y);
    const glow = this.add.circle(0, 0, 94, place.accent, 0.11);
    const ring = this.add.circle(0, 0, 67, place.accent, 0.2).setStrokeStyle(4, place.accent, 0.75);
    const core = this.add.circle(0, 0, 48, 0x171c45, 1).setStrokeStyle(2, 0xffffff, 0.18);
    const icon = this.add.star(0, -2, 5, 10, 24, place.accent, 0.92);
    const label = this.add.text(0, 94, place.name, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 124, place.subtitle, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '15px',
      color: '#aeb8df',
    }).setOrigin(0.5);

    node.add([glow, ring, core, icon, label, subtitle]);
    node.setSize(190, 190).setInteractive({ useHandCursor: true });
    node.on('pointerdown', () => this.visit(place));

    this.tweens.add({
      targets: [glow, ring],
      scale: { from: 0.96, to: 1.08 },
      alpha: { from: 0.12, to: 0.28 },
      yoyo: true,
      repeat: -1,
      duration: 1800 + Phaser.Math.Between(-300, 500),
      ease: 'Sine.inOut',
    });
  }

  private createMotes(count: number) {
    while (this.motes.length < count) {
      const x = Phaser.Math.Between(100, WORLD_SIZE.width - 100);
      const y = Phaser.Math.Between(100, WORLD_SIZE.height - 100);
      const sprite = this.add.image(x, y, 'mote')
        .setScale(Phaser.Math.FloatBetween(0.35, 1.15))
        .setAlpha(Phaser.Math.FloatBetween(0.12, 0.52));
      this.motes.push({
        sprite,
        originX: x,
        originY: y,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        speed: Phaser.Math.FloatBetween(0.45, 1.25),
      });
    }
  }

  private createNova(x: number, y: number) {
    const nova = this.add.container(x, y).setDepth(30);
    const visual = this.add.container(0, 0);
    const shadow = this.add.ellipse(0, 45, 76, 24, 0x050719, 0.42);
    const body = this.add.ellipse(0, 0, 76, 92, 0x6b5ce7, 1).setStrokeStyle(3, 0x9e91ff, 0.9);
    const face = this.add.ellipse(0, -10, 58, 48, 0x101733, 1).setStrokeStyle(2, 0x45d9ec, 0.35);
    const leftEye = this.add.circle(-13, -13, 6, 0xc8f8ff, 1);
    const rightEye = this.add.circle(13, -13, 6, 0xc8f8ff, 1);
    const antenna = this.add.line(0, -52, 0, 0, 0, -22, 0x9e91ff, 1).setLineWidth(4);
    const glow = this.add.circle(0, -76, 8, 0x6de8f4, 1);
    visual.add([shadow, body, face, leftEye, rightEye, antenna, glow]);
    nova.add(visual);

    this.tweens.add({ targets: visual, y: -14, yoyo: true, repeat: -1, duration: 1500, ease: 'Sine.inOut' });
    this.tweens.add({ targets: glow, alpha: 0.35, scale: 1.45, yoyo: true, repeat: -1, duration: 900 });
    return nova;
  }

  private setupInput() {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      const camera = this.cameras.main;
      camera.zoomTo(Phaser.Math.Clamp(camera.zoom - dy * 0.0008, 0.58, 1.15), 120);
    });
  }

  private visitById(id: string) {
    const place = PLACES.find((candidate) => candidate.id === id);
    if (place) this.visit(place);
  }

  private nextTourStop() {
    const place = PLACES[this.tourIndex % PLACES.length];
    this.tourIndex += 1;
    this.visit(place);
  }

  private visit(place: PlaceDefinition, animate = true) {
    this.selectedPlace = place;
    worldBus.emit('selected', place.id);

    const duration = animate ? 900 : 0;
    const camera = this.cameras.main;
    if (animate) camera.pan(place.x, place.y, duration, 'Sine.easeInOut');
    else camera.centerOn(place.x, place.y);

    this.tweens.killTweensOf(this.nova);
    this.tweens.add({
      targets: this.nova,
      x: place.x + 130,
      y: place.y - 80,
      duration,
      ease: 'Sine.easeInOut',
    });
  }

  private setStressLevel(level: StressLevel) {
    this.stressLevel = level;
    const target = STRESS_PROFILES[level].sprites;

    while (this.stressSprites.length < target) {
      const index = this.stressSprites.length;
      const x = Phaser.Math.Between(40, WORLD_SIZE.width - 40);
      const y = Phaser.Math.Between(40, WORLD_SIZE.height - 40);
      const sprite = this.add.image(x, y, 'mote')
        .setScale(Phaser.Math.FloatBetween(0.35, 1.8))
        .setAlpha(Phaser.Math.FloatBetween(0.08, 0.65));

      if (index % 5 === 0) sprite.setBlendMode(Phaser.BlendModes.ADD);

      this.stressSprites.push({
        sprite,
        originX: x,
        originY: y,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        speed: Phaser.Math.FloatBetween(0.7, 3.1),
        radius: Phaser.Math.FloatBetween(8, 58),
        rotationSpeed: Phaser.Math.FloatBetween(-0.0018, 0.0018),
      });
    }

    while (this.stressSprites.length > target) {
      const item = this.stressSprites.pop();
      if (item) item.sprite.destroy();
    }

    this.stressGraphics.clear();
    this.frameSamples = [];
    worldBus.emit('stress-changed', level);
    this.emitMetrics();
  }

  private redrawStressGraphics(seconds: number) {
    const graphics = this.stressGraphics;
    graphics.clear();
    for (let i = 0; i < 36; i += 1) {
      const phase = seconds * (0.5 + i * 0.018);
      const x = WORLD_SIZE.width / 2 + Math.sin(phase + i) * (250 + i * 28);
      const y = WORLD_SIZE.height / 2 + Math.cos(phase * 0.82 + i) * (180 + i * 20);
      const radius = 30 + ((i * 17) % 150);
      graphics.lineStyle(1 + (i % 3), 0x7ae7ff, 0.035 + (i % 4) * 0.012);
      graphics.strokeCircle(x, y, radius);
    }
  }

  private emitMetrics() {
    const samples = this.frameSamples.length ? this.frameSamples : [16.67];
    const sorted = [...samples].sort((a, b) => a - b);
    const averageFrameMs = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    const p99Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
    const p99FrameMs = sorted[p99Index] || averageFrameMs;
    const worstFrameMs = sorted[sorted.length - 1] || averageFrameMs;
    const longFrames = samples.filter((sample) => sample > 32).length;

    worldBus.emit('metrics', {
      fps: Math.round(this.game.loop.actualFps || 0),
      averageFps: Math.round(1000 / averageFrameMs),
      onePercentLowFps: Math.round(1000 / p99FrameMs),
      frameMs: Number(averageFrameMs.toFixed(1)),
      worstFrameMs: Number(worstFrameMs.toFixed(1)),
      longFrames,
      objects: this.children.length,
      stressLevel: this.stressLevel,
      stressLabel: STRESS_PROFILES[this.stressLevel].label,
    });
  }
}
