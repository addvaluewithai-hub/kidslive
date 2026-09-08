import Phaser from 'phaser';
import { PLACES, WORLD_SIZE, type PlaceDefinition } from './worldConfig';
import { worldBus, type BenchmarkLoad } from './worldBus';

const MAX_FRAME_SAMPLES = 360;
const METRICS_INTERVAL_MS = 1000;
const STEADY_AMBIENT = 36;
const BUSY_AMBIENT = 72;
const AMBIENT_POOL_SIZE = BUSY_AMBIENT;
const PARTICLE_POOL_SIZE = 96;
const CULL_INTERVAL_MS = 180;

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

type WorldVisual = {
  place: PlaceDefinition;
  root: Phaser.GameObjects.Container;
  portal: Phaser.GameObjects.Image;
  orbiter: Phaser.GameObjects.Image;
  phase: number;
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
  private actorMouth!: Phaser.GameObjects.Image;
  private actorThruster!: Phaser.GameObjects.Image;
  private ambientMotes: AmbientMote[] = [];
  private ambientCount = STEADY_AMBIENT;
  private particles: FxParticle[] = [];
  private worlds = new Map<string, WorldVisual>();
  private selectedPlace = PLACES[0];
  private benchmarkLoad: BenchmarkLoad = 'steady';
  private metricsTimer = 0;
  private cullTimer = 0;
  private busyEmissionTimer = 0;
  private tourIndex = 0;
  private frameSamples = new Array<number>(MAX_FRAME_SAMPLES);
  private frameSampleCount = 0;
  private frameSampleIndex = 0;

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
    this.createAmbientPool();
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

    this.setAmbientCount(STEADY_AMBIENT);
    this.time.delayedCall(300, () => worldBus.emit('ready'));
    this.visit(this.selectedPlace, false);
    this.updateWorldVisibility();
  }

  update(time: number, delta: number) {
    const seconds = time / 1000;

    this.updateActor(seconds);
    this.updateWorldAnimations(seconds);
    this.updateAmbient(seconds);
    this.updateParticles(delta);

    if (this.benchmarkLoad === 'busy') {
      this.busyEmissionTimer += delta;
      if (this.busyEmissionTimer >= 180) {
        this.busyEmissionTimer = 0;
        this.emitParticles(this.selectedPlace.x, this.selectedPlace.y - 48, 5, 0.72);
      }
    }

    this.cullTimer += delta;
    if (this.cullTimer >= CULL_INTERVAL_MS) {
      this.cullTimer = 0;
      this.updateWorldVisibility();
    }

    this.addFrameSample(delta);
    this.metricsTimer += delta;
    if (this.metricsTimer >= METRICS_INTERVAL_MS) {
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

    if (!this.textures.exists('glow')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 0.08).fillCircle(64, 64, 62);
      graphics.fillStyle(0xffffff, 0.12).fillCircle(64, 64, 44);
      graphics.fillStyle(0xffffff, 0.18).fillCircle(64, 64, 24);
      graphics.generateTexture('glow', 128, 128);
      graphics.destroy();
    }

    if (!this.textures.exists('starfield')) {
      const graphics = this.add.graphics();
      for (let i = 0; i < 48; i += 1) {
        const x = (i * 47 + 19) % 256;
        const y = (i * 83 + 31) % 256;
        const radius = 1 + (i % 3) * 0.55;
        const alpha = 0.22 + (i % 5) * 0.09;
        graphics.fillStyle(0xffffff, alpha).fillCircle(x, y, radius);
      }
      graphics.generateTexture('starfield', 256, 256);
      graphics.destroy();
    }

    for (let index = 0; index < PLACES.length; index += 1) {
      const place = PLACES[index];
      const islandKey = `island-${place.id}`;
      const portalKey = `portal-${place.id}`;

      if (!this.textures.exists(islandKey)) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x030511, 0.42).fillEllipse(130, 132, 214, 54);
        graphics.fillStyle(0x151a3b, 1).fillEllipse(130, 102, 190, 98);
        graphics.lineStyle(2, place.accent, 0.16).strokeEllipse(130, 102, 190, 98);
        graphics.fillStyle(0x202854, 1).fillEllipse(130, 73, 212, 94);
        graphics.lineStyle(3, place.accent, 0.34).strokeEllipse(130, 73, 212, 94);
        graphics.fillStyle(place.accent, 0.08).fillEllipse(130, 63, 170, 60);

        const offsets = [-58, -29, 28, 58];
        offsets.forEach((offset, decorIndex) => {
          const height = 22 + ((index + decorIndex) % 3) * 9;
          graphics.fillStyle(0x3a4372, 0.95).fillRect(126 + offset, 62 - height, 8, height);
          graphics.fillStyle(place.accent, 0.58).fillCircle(130 + offset, 60 - height, 9 + ((decorIndex + index) % 2) * 4);
        });

        graphics.generateTexture(islandKey, 260, 170);
        graphics.destroy();
      }

      if (!this.textures.exists(portalKey)) {
        const graphics = this.add.graphics();
        graphics.fillStyle(place.accent, 0.08).fillCircle(58, 58, 56);
        graphics.fillStyle(0x0e1535, 0.96).fillCircle(58, 58, 39);
        graphics.lineStyle(4, place.accent, 0.9).strokeCircle(58, 58, 39);
        graphics.fillStyle(place.accent, 0.2).fillCircle(58, 58, 25);
        graphics.fillStyle(place.accent, 0.95);
        graphics.fillRect(55, 8, 6, 13);
        graphics.fillRect(55, 95, 6, 13);
        graphics.fillRect(8, 55, 13, 6);
        graphics.fillRect(95, 55, 13, 6);
        graphics.generateTexture(portalKey, 116, 116);
        graphics.destroy();
      }
    }

    if (!this.textures.exists('actor-core')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x4c43b2, 0.96).fillTriangle(15, 89, 45, 79, 39, 121);
      graphics.fillStyle(0x4c43b2, 0.96).fillTriangle(113, 89, 83, 79, 89, 121);
      graphics.fillStyle(0x6959e8, 1).fillEllipse(64, 83, 82, 96);
      graphics.lineStyle(3, 0xa79bff, 0.92).strokeEllipse(64, 83, 82, 96);
      graphics.fillStyle(0x101733, 1).fillEllipse(64, 71, 62, 50);
      graphics.lineStyle(2, 0x54e6f4, 0.38).strokeEllipse(64, 71, 62, 50);
      graphics.fillStyle(0xd7fbff, 1).fillCircle(50, 68, 6);
      graphics.fillStyle(0xd7fbff, 1).fillCircle(78, 68, 6);
      graphics.lineStyle(4, 0xb0a6ff, 1).lineBetween(64, 42, 64, 18);
      graphics.fillStyle(0x6eeaf5, 1).fillCircle(64, 10, 8);
      graphics.generateTexture('actor-core', 128, 144);
      graphics.destroy();
    }

    if (!this.textures.exists('mouth')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x89f3ff, 1).fillRoundedRect(1, 1, 18, 5, 2);
      graphics.generateTexture('mouth', 20, 7);
      graphics.destroy();
    }
  }

  private createBackdrop() {
    this.cameras.main.setBackgroundColor('#080b22');

    const nebulae = [
      { x: 720, y: 470, tint: 0x6b55d7, alpha: 0.13, scale: 7.8, scroll: 0.2 },
      { x: 1920, y: 980, tint: 0x24a5c3, alpha: 0.1, scale: 8.6, scroll: 0.22 },
      { x: 1640, y: 250, tint: 0xb14898, alpha: 0.08, scale: 5.7, scroll: 0.25 },
    ];

    nebulae.forEach((item) => {
      this.add.image(item.x, item.y, 'glow')
        .setTint(item.tint)
        .setAlpha(item.alpha)
        .setScale(item.scale)
        .setScrollFactor(item.scroll);
    });

    for (let layer = 0; layer < 3; layer += 1) {
      const stars = this.add.tileSprite(
        WORLD_SIZE.width / 2,
        WORLD_SIZE.height / 2,
        WORLD_SIZE.width,
        WORLD_SIZE.height,
        'starfield',
      );
      stars.setScrollFactor(0.08 + layer * 0.12);
      stars.setAlpha(0.16 + layer * 0.11);
      stars.tileScaleX = 0.82 + layer * 0.32;
      stars.tileScaleY = stars.tileScaleX;
    }

    this.add.image(2260, 180, 'glow')
      .setTint(0x8f8cff)
      .setAlpha(0.13)
      .setScale(1.8)
      .setScrollFactor(0.4);
  }

  private createRoutes() {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x8097ff, 0.1);
    const ordered = [...PLACES, PLACES[0]];
    for (let i = 0; i < ordered.length - 1; i += 1) {
      graphics.lineBetween(ordered[i].x, ordered[i].y, ordered[i + 1].x, ordered[i + 1].y);
    }
  }

  private createWorldIsland(place: PlaceDefinition, index: number) {
    const root = this.add.container(place.x, place.y);
    const base = this.add.image(0, 8, `island-${place.id}`);
    const portal = this.add.image(0, -52, `portal-${place.id}`);
    const orbiter = this.add.image(0, -102, 'spark').setTint(place.accent).setScale(0.78).setAlpha(0.85);
    const label = this.add.text(0, 102, place.name, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '23px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 130, place.subtitle, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      color: '#aeb8df',
    }).setOrigin(0.5);

    root.add([base, portal, orbiter, label, subtitle]);
    root.setSize(250, 220).setInteractive({ useHandCursor: true });
    root.on('pointerdown', () => this.visit(place));

    this.worlds.set(place.id, {
      place,
      root,
      portal,
      orbiter,
      phase: index * 0.83,
    });
  }

  private createAmbientPool() {
    for (let i = 0; i < AMBIENT_POOL_SIZE; i += 1) {
      const sprite = this.add.image(0, 0, 'mote')
        .setDepth(5)
        .setVisible(false)
        .setActive(false);
      if (i % 9 === 0) sprite.setBlendMode(Phaser.BlendModes.ADD);

      this.ambientMotes.push({
        sprite,
        originX: 0,
        originY: 0,
        phase: i * 0.71,
        speed: 0.4 + (i % 7) * 0.07,
        radiusX: 5 + (i % 5) * 3,
        radiusY: 8 + (i % 6) * 3,
      });
    }
  }

  private setAmbientCount(count: number) {
    this.ambientCount = count;
    for (let i = 0; i < this.ambientMotes.length; i += 1) {
      const enabled = i < count;
      this.ambientMotes[i].sprite.setVisible(enabled).setActive(enabled);
    }
    this.reseedAmbient();
  }

  private reseedAmbient() {
    const accent = this.selectedPlace.accent;
    for (let i = 0; i < this.ambientCount; i += 1) {
      const mote = this.ambientMotes[i];
      const angle = i * 2.399963 + this.selectedPlace.x * 0.0007;
      const distance = 120 + (i % 12) * 38;
      mote.originX = this.selectedPlace.x + Math.cos(angle) * distance;
      mote.originY = this.selectedPlace.y + Math.sin(angle) * distance * 0.68;
      mote.sprite
        .setPosition(mote.originX, mote.originY)
        .setTint(accent)
        .setScale(0.35 + (i % 6) * 0.1)
        .setAlpha(0.13 + (i % 5) * 0.055);
    }
  }

  private createParticlePool() {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i += 1) {
      const sprite = this.add.image(0, 0, i % 3 === 0 ? 'spark' : 'mote')
        .setVisible(false)
        .setActive(false)
        .setDepth(24);
      if (i % 5 === 0) sprite.setBlendMode(Phaser.BlendModes.ADD);
      this.particles.push({ sprite, active: false, vx: 0, vy: 0, life: 0, maxLife: 0 });
    }
  }

  private createActor(x: number, y: number) {
    const actor = this.add.container(x, y).setDepth(40);
    const visual = this.add.container(0, 0);
    const thruster = this.add.image(0, 48, 'glow').setTint(0x5ce4ff).setScale(0.28).setAlpha(0.22);
    const core = this.add.image(0, -4, 'actor-core');
    const mouth = this.add.image(0, 1, 'mouth').setScale(0.82, 0.62);
    visual.add([thruster, core, mouth]);
    actor.add(visual);

    this.actorVisual = visual;
    this.actorMouth = mouth;
    this.actorThruster = thruster;
    return actor;
  }

  private updateActor(seconds: number) {
    this.actorVisual.y = -8 + Math.sin(seconds * 2.2) * 6;
    this.actorThruster.alpha = 0.18 + (Math.sin(seconds * 5.1) + 1) * 0.11;
    this.actorThruster.setScale(0.25 + (Math.sin(seconds * 4.3) + 1) * 0.025);

    if (this.benchmarkLoad === 'busy') {
      this.actorMouth.scaleY = 0.55 + Math.abs(Math.sin(seconds * 12.5)) * 1.65;
    } else {
      this.actorMouth.scaleY = 0.62;
    }
  }

  private updateWorldAnimations(seconds: number) {
    for (const visual of this.worlds.values()) {
      if (!visual.root.visible) continue;
      const phase = seconds * 1.6 + visual.phase;
      visual.portal.setScale(0.98 + Math.sin(phase) * 0.045);
      visual.portal.alpha = 0.86 + Math.sin(phase * 0.73) * 0.1;
      const orbit = seconds * (0.82 + visual.phase * 0.015) + visual.phase;
      visual.orbiter.x = Math.cos(orbit) * 51;
      visual.orbiter.y = -52 + Math.sin(orbit) * 51;
    }
  }

  private updateAmbient(seconds: number) {
    for (let i = 0; i < this.ambientCount; i += 1) {
      const mote = this.ambientMotes[i];
      const phase = seconds * mote.speed + mote.phase;
      mote.sprite.x = mote.originX + Math.cos(phase) * mote.radiusX;
      mote.sprite.y = mote.originY + Math.sin(phase * 0.82) * mote.radiusY;
    }
  }

  private updateWorldVisibility() {
    const view = this.cameras.main.worldView;
    const padding = 360;
    for (const visual of this.worlds.values()) {
      const x = visual.place.x;
      const y = visual.place.y;
      const visible = x >= view.left - padding
        && x <= view.right + padding
        && y >= view.top - padding
        && y <= view.bottom + padding;
      visual.root.setVisible(visible).setActive(visible);
    }
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
    this.reseedAmbient();
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

    const world = this.worlds.get(place.id);
    if (world) {
      this.tweens.killTweensOf(world.root);
      this.tweens.add({
        targets: world.root,
        scale: 1.055,
        yoyo: true,
        duration: 360,
        ease: 'Sine.easeOut',
      });
    }

    this.emitParticles(place.x, place.y - 45, this.benchmarkLoad === 'busy' ? 38 : 24, 1);
  }

  private setBenchmarkLoad(load: BenchmarkLoad) {
    this.benchmarkLoad = load;
    this.setAmbientCount(load === 'busy' ? BUSY_AMBIENT : STEADY_AMBIENT);
    this.busyEmissionTimer = 0;

    if (load === 'busy') {
      this.emitParticles(this.selectedPlace.x, this.selectedPlace.y - 40, 52, 1.05);
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
      const speed = Phaser.Math.FloatBetween(32, 96) * energy;
      const life = Phaser.Math.Between(600, 1050);
      particle.active = true;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 16 * energy;
      particle.life = life;
      particle.maxLife = life;
      particle.sprite
        .setPosition(x + Phaser.Math.Between(-30, 30), y + Phaser.Math.Between(-24, 24))
        .setTint(this.selectedPlace.accent)
        .setScale(Phaser.Math.FloatBetween(0.42, 1.05))
        .setAlpha(Phaser.Math.FloatBetween(0.35, 0.82))
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

      particle.vy += 20 * dt;
      particle.sprite.x += particle.vx * dt;
      particle.sprite.y += particle.vy * dt;
      particle.sprite.rotation += dt * 1.5;
      particle.sprite.alpha = Math.max(0, particle.life / particle.maxLife);
    }
  }

  private addFrameSample(delta: number) {
    this.frameSamples[this.frameSampleIndex] = delta;
    this.frameSampleIndex = (this.frameSampleIndex + 1) % MAX_FRAME_SAMPLES;
    this.frameSampleCount = Math.min(MAX_FRAME_SAMPLES, this.frameSampleCount + 1);
  }

  private resetMetrics() {
    this.frameSampleCount = 0;
    this.frameSampleIndex = 0;
    this.metricsTimer = 0;
  }

  private emitMetrics() {
    const samples = this.frameSampleCount > 0
      ? this.frameSamples.slice(0, this.frameSampleCount)
      : [16.67];
    const sorted = [...samples].sort((a, b) => a - b);
    const averageFrameMs = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    const p99Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
    const p99FrameMs = sorted[p99Index] || averageFrameMs;
    const worstFrameMs = sorted[sorted.length - 1] || averageFrameMs;
    const longFrames = samples.filter((sample) => sample > 32).length;
    const activeParticles = this.particles.reduce((sum, particle) => sum + (particle.active ? 1 : 0), 0);
    const visibleWorlds = [...this.worlds.values()].reduce((sum, visual) => sum + (visual.root.visible ? 1 : 0), 0);
    const animatedObjects = this.ambientCount + activeParticles + visibleWorlds * 2 + 3;

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
      renderer: this.game.renderer.type === Phaser.WEBGL ? 'WEBGL' : 'CANVAS',
      benchmarkLoad: this.benchmarkLoad,
      benchmarkLabel: this.benchmarkLoad === 'busy' ? 'BUSY LESSON' : 'PRODUCTION STEADY',
    });
  }
}
