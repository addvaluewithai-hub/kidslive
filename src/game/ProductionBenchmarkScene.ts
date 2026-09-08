import Phaser from 'phaser';
import { PLACES, WORLD_SIZE, type PlaceDefinition } from './worldConfig';
import { worldBus, type BenchmarkLoad } from './worldBus';

const MAX_FRAME_SAMPLES = 600;
const STEADY_AMBIENT = 90;
const BUSY_AMBIENT = 170;
const PARTICLE_POOL_SIZE = 140;

type AmbientMote = {
  sprite: Phaser.GameObjects.Image;
  originX: number;
  originY: number;
  phase: number;
  speed: number;
  radiusX: number;
  radiusY: number;
};

type FxParticle = {
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
};

type PortalVisual = {
  root: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Arc;
  halo: Phaser.GameObjects.Arc;
};

const SCRIPTED_WORLD_LINES: Record<string, string> = {
  english: 'Let’s fly into a story and find three words we can use today.',
  german: 'Ready for a tiny language mission? I’ll guide you step by step.',
  chess: 'Let’s look at the board together before we make our first move.',
  knowledge: 'How could we know whether an idea is actually true?',
  habits: 'Tiny wins count. Let’s check what you want to grow today.',
  lab: 'Pick something curious. We can test it, change it, and try again.',
};

export class ProductionBenchmarkScene extends Phaser.Scene {
  private actor!: Phaser.GameObjects.Container;
  private actorVisual!: Phaser.GameObjects.Container;
  private actorMouth!: Phaser.GameObjects.Rectangle;
  private ambientMotes: AmbientMote[] = [];
  private particles: FxParticle[] = [];
  private portals = new Map<string, PortalVisual>();
  private selectedPlace = PLACES[0];
  private benchmarkLoad: BenchmarkLoad = 'steady';
  private metricsTimer = 0;
  private busyEmissionTimer = 0;
  private tourIndex = 0;
  private frameSamples: number[] = [];

  constructor() {
    super('production-benchmark');
  }

  create() {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    camera.centerOn(WORLD_SIZE.width / 2, WORLD_SIZE.height / 2);
    camera.setZoom(0.8);
    camera.roundPixels = true;

    this.createTextures();
    this.createBackdrop();
    this.createRoutes();
    PLACES.forEach((place, index) => this.createWorldIsland(place, index));
    this.createAmbientMotes(STEADY_AMBIENT);
    this.createParticlePool();
    this.actor = this.createActor(WORLD_SIZE.width / 2, WORLD_SIZE.height / 2);
    this.setupInput();

    worldBus.on('visit', this.visitById, this);
    worldBus.on('tour', this.nextTourStop, this);
    worldBus.on('benchmark-load', this.setBenchmarkLoad, this);
    worldBus.on('reset-metrics', this.resetMetrics, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      worldBus.off('visit', this.visitById, this);
      worldBus.off('tour', this.nextTourStop, this);
      worldBus.off('benchmark-load', this.setBenchmarkLoad, this);
      worldBus.off('reset-metrics', this.resetMetrics, this);
    });

    this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        this.tweens.add({
          targets: this.actorVisual,
          scaleY: 0.985,
          yoyo: true,
          duration: 90,
        });
      },
    });

    this.time.delayedCall(300, () => worldBus.emit('ready'));
    this.visit(this.selectedPlace, false);
  }

  update(time: number, delta: number) {
    const seconds = time / 1000;

    for (const mote of this.ambientMotes) {
      const phase = seconds * mote.speed + mote.phase;
      mote.sprite.x = mote.originX + Math.cos(phase) * mote.radiusX;
      mote.sprite.y = mote.originY + Math.sin(phase * 0.82) * mote.radiusY;
    }

    this.updateParticles(delta);

    if (this.benchmarkLoad === 'busy') {
      this.busyEmissionTimer += delta;
      if (this.busyEmissionTimer >= 120) {
        this.busyEmissionTimer = 0;
        this.emitParticles(this.selectedPlace.x, this.selectedPlace.y - 40, 8, 0.75);
      }
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

    if (!this.textures.exists('spark')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 1);
      graphics.fillTriangle(6, 0, 8, 5, 6, 12);
      graphics.fillTriangle(0, 6, 5, 4, 12, 6);
      graphics.generateTexture('spark', 12, 12);
      graphics.destroy();
    }
  }

  private createBackdrop() {
    this.cameras.main.setBackgroundColor('#080b22');

    const nebula = this.add.graphics().setScrollFactor(0.22);
    nebula.fillStyle(0x33236b, 0.22).fillCircle(720, 470, 520);
    nebula.fillStyle(0x0f5870, 0.17).fillCircle(1920, 980, 620);
    nebula.fillStyle(0x661f62, 0.1).fillCircle(1640, 250, 410);

    for (let layer = 0; layer < 3; layer += 1) {
      const stars = this.add.container(0, 0).setScrollFactor(0.08 + layer * 0.12);
      const count = 54 + layer * 22;
      for (let i = 0; i < count; i += 1) {
        const star = this.add.image(
          Phaser.Math.Between(0, WORLD_SIZE.width),
          Phaser.Math.Between(0, WORLD_SIZE.height),
          'mote',
        );
        star
          .setScale(Phaser.Math.FloatBetween(0.2, 0.72) * (1 + layer * 0.3))
          .setAlpha(0.14 + layer * 0.11);
        stars.add(star);
      }
    }

    const moon = this.add.container(2260, 180).setScrollFactor(0.4);
    const moonGlow = this.add.circle(0, 0, 118, 0x8f8cff, 0.08);
    const moonCore = this.add.circle(0, 0, 68, 0x24295b, 0.75).setStrokeStyle(2, 0xb7b7ff, 0.18);
    moon.add([moonGlow, moonCore]);
    this.tweens.add({
      targets: moonGlow,
      scale: { from: 0.92, to: 1.08 },
      alpha: { from: 0.05, to: 0.12 },
      yoyo: true,
      repeat: -1,
      duration: 3200,
      ease: 'Sine.inOut',
    });
  }

  private createRoutes() {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x8097ff, 0.1);
    const ordered = [...PLACES, PLACES[0]];
    for (let i = 0; i < ordered.length - 1; i += 1) {
      graphics.lineBetween(ordered[i].x, ordered[i].y, ordered[i + 1].x, ordered[i + 1].y);
    }

    for (const place of PLACES) {
      graphics.fillStyle(place.accent, 0.18).fillCircle(place.x, place.y, 5);
    }
  }

  private createWorldIsland(place: PlaceDefinition, index: number) {
    const root = this.add.container(place.x, place.y);
    const shadow = this.add.ellipse(0, 66, 210, 54, 0x030511, 0.4);
    const underside = this.add.ellipse(0, 34, 184, 96, 0x151a3b, 1).setStrokeStyle(2, place.accent, 0.12);
    const ground = this.add.ellipse(0, 5, 208, 94, 0x202854, 1).setStrokeStyle(3, place.accent, 0.35);
    const rim = this.add.ellipse(0, -5, 168, 60, place.accent, 0.08);

    const decor = this.add.container(0, 0);
    const offsets = [-58, -29, 28, 58];
    offsets.forEach((x, decorIndex) => {
      const height = 22 + ((index + decorIndex) % 3) * 9;
      const stem = this.add.rectangle(x, 0, 8, height, 0x3a4372, 0.95).setOrigin(0.5, 1);
      const crown = this.add.circle(x, -height, 9 + ((decorIndex + index) % 2) * 4, place.accent, 0.6);
      decor.add([stem, crown]);
    });

    const halo = this.add.circle(0, -52, 58, place.accent, 0.07);
    const ring = this.add.circle(0, -52, 39, 0x0e1535, 0.9).setStrokeStyle(4, place.accent, 0.9);
    const portalCore = this.add.circle(0, -52, 26, place.accent, 0.18);
    const portalMark = this.add.star(0, -52, 5, 7, 16, place.accent, 0.95);

    const orbiterRoot = this.add.container(0, -52);
    const orbiter = this.add.image(0, -50, 'spark').setTint(place.accent).setScale(0.75).setAlpha(0.8);
    orbiterRoot.add(orbiter);

    const label = this.add.text(0, 94, place.name, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '23px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 122, place.subtitle, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      color: '#aeb8df',
    }).setOrigin(0.5);

    root.add([
      shadow,
      underside,
      ground,
      rim,
      decor,
      halo,
      ring,
      portalCore,
      portalMark,
      orbiterRoot,
      label,
      subtitle,
    ]);
    root.setSize(230, 210).setInteractive({ useHandCursor: true });
    root.on('pointerdown', () => this.visit(place));

    this.tweens.add({
      targets: [halo, portalCore],
      scale: { from: 0.94, to: 1.1 },
      alpha: { from: 0.06, to: 0.22 },
      yoyo: true,
      repeat: -1,
      duration: 1750 + index * 90,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: orbiterRoot,
      angle: 360,
      repeat: -1,
      duration: 4200 + index * 180,
      ease: 'Linear',
    });

    this.portals.set(place.id, { root, ring, halo });
  }

  private createAmbientMotes(count: number) {
    while (this.ambientMotes.length < count) {
      const x = Phaser.Math.Between(80, WORLD_SIZE.width - 80);
      const y = Phaser.Math.Between(70, WORLD_SIZE.height - 70);
      const sprite = this.add.image(x, y, 'mote')
        .setScale(Phaser.Math.FloatBetween(0.35, 1.05))
        .setAlpha(Phaser.Math.FloatBetween(0.1, 0.42));
      if (this.ambientMotes.length % 8 === 0) sprite.setBlendMode(Phaser.BlendModes.ADD);

      this.ambientMotes.push({
        sprite,
        originX: x,
        originY: y,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        speed: Phaser.Math.FloatBetween(0.35, 0.95),
        radiusX: Phaser.Math.FloatBetween(5, 18),
        radiusY: Phaser.Math.FloatBetween(8, 24),
      });
    }

    while (this.ambientMotes.length > count) {
      this.ambientMotes.pop()?.sprite.destroy();
    }
  }

  private createParticlePool() {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i += 1) {
      const sprite = this.add.image(0, 0, i % 3 === 0 ? 'spark' : 'mote')
        .setVisible(false)
        .setActive(false)
        .setDepth(24);
      if (i % 4 === 0) sprite.setBlendMode(Phaser.BlendModes.ADD);
      this.particles.push({ sprite, active: false, vx: 0, vy: 0, life: 0, maxLife: 0 });
    }
  }

  private createActor(x: number, y: number) {
    const actor = this.add.container(x, y).setDepth(40);
    const visual = this.add.container(0, 0);
    const shadow = this.add.ellipse(0, 49, 82, 23, 0x02040f, 0.38);
    const thruster = this.add.ellipse(0, 39, 32, 26, 0x5ce4ff, 0.14);
    const body = this.add.ellipse(0, 0, 82, 96, 0x6959e8, 1).setStrokeStyle(3, 0xa79bff, 0.92);
    const face = this.add.ellipse(0, -12, 62, 50, 0x101733, 1).setStrokeStyle(2, 0x54e6f4, 0.38);
    const leftEye = this.add.circle(-14, -15, 6, 0xd7fbff, 1);
    const rightEye = this.add.circle(14, -15, 6, 0xd7fbff, 1);
    const mouth = this.add.rectangle(0, 3, 16, 3, 0x89f3ff, 0.9);
    const antenna = this.add.line(0, -57, 0, 0, 0, -23, 0xb0a6ff, 1).setLineWidth(4);
    const antennaGlow = this.add.circle(0, -82, 8, 0x6eeaf5, 1);
    const leftFin = this.add.triangle(-48, 7, 10, 0, 34, 18, 30, 42, 0x4c43b2, 0.95);
    const rightFin = this.add.triangle(48, 7, 34, 0, 10, 18, 14, 42, 0x4c43b2, 0.95);

    visual.add([
      shadow,
      thruster,
      leftFin,
      rightFin,
      body,
      face,
      leftEye,
      rightEye,
      mouth,
      antenna,
      antennaGlow,
    ]);
    actor.add(visual);

    this.actorVisual = visual;
    this.actorMouth = mouth;

    this.tweens.add({
      targets: visual,
      y: -12,
      yoyo: true,
      repeat: -1,
      duration: 1450,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: [antennaGlow, thruster],
      alpha: { from: 0.18, to: 0.75 },
      scale: { from: 0.9, to: 1.2 },
      yoyo: true,
      repeat: -1,
      duration: 850,
      ease: 'Sine.inOut',
    });

    return actor;
  }

  private setupInput() {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      const camera = this.cameras.main;
      camera.zoomTo(Phaser.Math.Clamp(camera.zoom - dy * 0.0008, 0.6, 1.12), 120);
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
    worldBus.emit('tutor-line', SCRIPTED_WORLD_LINES[place.id] ?? 'Let’s explore this place together.');

    const duration = animate ? 900 : 0;
    const camera = this.cameras.main;
    if (animate) camera.pan(place.x, place.y, duration, 'Sine.easeInOut');
    else camera.centerOn(place.x, place.y);

    this.tweens.killTweensOf(this.actor);
    this.tweens.add({
      targets: this.actor,
      x: place.x + 132,
      y: place.y - 88,
      duration,
      ease: 'Sine.easeInOut',
    });

    const portal = this.portals.get(place.id);
    if (portal) {
      this.tweens.add({
        targets: portal.root,
        scale: 1.07,
        yoyo: true,
        duration: 420,
        ease: 'Back.Out',
      });
      this.tweens.add({
        targets: [portal.ring, portal.halo],
        alpha: { from: 0.2, to: 0.75 },
        yoyo: true,
        duration: 520,
      });
    }

    this.emitParticles(place.x, place.y - 45, this.benchmarkLoad === 'busy' ? 54 : 34, 1);
  }

  private setBenchmarkLoad(load: BenchmarkLoad) {
    this.benchmarkLoad = load;
    this.createAmbientMotes(load === 'busy' ? BUSY_AMBIENT : STEADY_AMBIENT);
    this.busyEmissionTimer = 0;

    if (load === 'busy') {
      this.tweens.add({
        targets: this.actorMouth,
        scaleY: 3.2,
        yoyo: true,
        repeat: -1,
        duration: 150,
      });
      this.emitParticles(this.selectedPlace.x, this.selectedPlace.y - 40, 70, 1.15);
    } else {
      this.tweens.killTweensOf(this.actorMouth);
      this.actorMouth.setScale(1);
    }

    this.resetMetrics();
    worldBus.emit('benchmark-load-changed', load);
    this.emitMetrics();
  }

  private emitParticles(x: number, y: number, count: number, energy: number) {
    let remaining = count;
    for (const particle of this.particles) {
      if (remaining <= 0) break;
      if (particle.active) continue;

      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const speed = Phaser.Math.FloatBetween(32, 105) * energy;
      const life = Phaser.Math.Between(650, 1250);
      particle.active = true;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 18 * energy;
      particle.life = life;
      particle.maxLife = life;
      particle.sprite
        .setPosition(x + Phaser.Math.Between(-34, 34), y + Phaser.Math.Between(-28, 28))
        .setTint(this.selectedPlace.accent)
        .setScale(Phaser.Math.FloatBetween(0.45, 1.25))
        .setAlpha(Phaser.Math.FloatBetween(0.35, 0.9))
        .setVisible(true)
        .setActive(true);
      remaining -= 1;
    }
  }

  private updateParticles(delta: number) {
    const dt = delta / 1000;
    for (const particle of this.particles) {
      if (!particle.active) continue;

      particle.life -= delta;
      if (particle.life <= 0) {
        particle.active = false;
        particle.sprite.setVisible(false).setActive(false);
        continue;
      }

      particle.vy += 22 * dt;
      particle.sprite.x += particle.vx * dt;
      particle.sprite.y += particle.vy * dt;
      particle.sprite.rotation += dt * 1.8;
      particle.sprite.alpha = Math.max(0, particle.life / particle.maxLife);
    }
  }

  private resetMetrics() {
    this.frameSamples = [];
    this.metricsTimer = 0;
  }

  private emitMetrics() {
    const samples = this.frameSamples.length ? this.frameSamples : [16.67];
    const sorted = [...samples].sort((a, b) => a - b);
    const averageFrameMs = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    const p99Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
    const p99FrameMs = sorted[p99Index] || averageFrameMs;
    const worstFrameMs = sorted[sorted.length - 1] || averageFrameMs;
    const longFrames = samples.filter((sample) => sample > 32).length;
    const activeParticles = this.particles.filter((particle) => particle.active).length;
    const animatedObjects = this.ambientMotes.length + activeParticles + this.portals.size * 3 + 5;

    worldBus.emit('metrics', {
      fps: Math.round(this.game.loop.actualFps || 0),
      averageFps: Math.round(1000 / averageFrameMs),
      onePercentLowFps: Math.round(1000 / p99FrameMs),
      frameMs: Number(averageFrameMs.toFixed(1)),
      worstFrameMs: Number(worstFrameMs.toFixed(1)),
      longFrames,
      objects: this.children.length,
      activeParticles,
      animatedObjects,
      benchmarkLoad: this.benchmarkLoad,
      benchmarkLabel: this.benchmarkLoad === 'busy' ? 'BUSY LESSON' : 'PRODUCTION STEADY',
    });
  }
}
