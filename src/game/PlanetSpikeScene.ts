import Phaser from 'phaser';
import { PLACES, WORLD_SIZE, type PlaceDefinition } from './worldConfig';
import { worldBus } from './worldBus';

const BASE_MOTES = 140;
const STRESS_MOTES = 420;

type Mote = { sprite: Phaser.GameObjects.Image; originX: number; originY: number; phase: number; speed: number };

export class PlanetSpikeScene extends Phaser.Scene {
  private nova!: Phaser.GameObjects.Container;
  private motes: Mote[] = [];
  private stress = false;
  private selectedPlace = PLACES[0];
  private metricsTimer = 0;
  private tourIndex = 0;

  constructor() {
    super('planet-spike');
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.cameras.main.centerOn(WORLD_SIZE.width / 2, WORLD_SIZE.height / 2);
    this.cameras.main.setZoom(0.78);

    this.createTextures();
    this.createBackdrop();
    this.createRoutes();
    PLACES.forEach((place) => this.createPlace(place));
    this.createMotes(BASE_MOTES);
    this.nova = this.createNova(WORLD_SIZE.width / 2, WORLD_SIZE.height / 2);
    this.setupInput();

    worldBus.on('visit', this.visitById, this);
    worldBus.on('tour', this.nextTourStop, this);
    worldBus.on('stress', this.toggleStress, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      worldBus.off('visit', this.visitById, this);
      worldBus.off('tour', this.nextTourStop, this);
      worldBus.off('stress', this.toggleStress, this);
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

    this.metricsTimer += delta;
    if (this.metricsTimer >= 500) {
      this.metricsTimer = 0;
      worldBus.emit('metrics', {
        fps: Math.round(this.game.loop.actualFps || 0),
        objects: this.children.length,
        stress: this.stress,
      });
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
      const from = ordered[i];
      const to = ordered[i + 1];
      graphics.lineBetween(from.x, from.y, to.x, to.y);
    }
  }

  private createPlace(place: PlaceDefinition) {
    const node = this.add.container(place.x, place.y);
    const glow = this.add.circle(0, 0, 94, place.accent, 0.11);
    const ring = this.add.circle(0, 0, 67, place.accent, 0.2).setStrokeStyle(4, place.accent, 0.75);
    const core = this.add.circle(0, 0, 48, 0x171c45, 1).setStrokeStyle(2, 0xffffff, 0.18);
    const icon = this.add.star(0, -2, 5, 10, 24, place.accent, 0.92);
    const label = this.add
      .text(0, 94, place.name, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(0, 124, place.subtitle, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '15px',
        color: '#aeb8df',
      })
      .setOrigin(0.5);

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
      const sprite = this.add
        .image(x, y, 'mote')
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
    const shadow = this.add.ellipse(0, 45, 76, 24, 0x050719, 0.42);
    const body = this.add.ellipse(0, 0, 76, 92, 0x6b5ce7, 1).setStrokeStyle(3, 0x9e91ff, 0.9);
    const face = this.add.ellipse(0, -10, 58, 48, 0x101733, 1).setStrokeStyle(2, 0x45d9ec, 0.35);
    const leftEye = this.add.circle(-13, -13, 6, 0xc8f8ff, 1);
    const rightEye = this.add.circle(13, -13, 6, 0xc8f8ff, 1);
    const antenna = this.add.line(0, -52, 0, 0, 0, -22, 0x9e91ff, 1).setLineWidth(4);
    const glow = this.add.circle(0, -76, 8, 0x6de8f4, 1);
    nova.add([shadow, body, face, leftEye, rightEye, antenna, glow]);

    this.tweens.add({ targets: nova, y: y - 16, yoyo: true, repeat: -1, duration: 1500, ease: 'Sine.inOut' });
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

    const camera = this.cameras.main;
    if (animate) camera.pan(place.x, place.y, 850, 'Sine.easeInOut');

    this.tweens.killTweensOf(this.nova);
    this.tweens.add({
      targets: this.nova,
      x: place.x + 130,
      y: place.y - 80,
      duration: animate ? 900 : 0,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.nova,
          y: this.nova.y - 14,
          yoyo: true,
          repeat: -1,
          duration: 1400,
          ease: 'Sine.inOut',
        });
      },
    });
  }

  private toggleStress(enabled?: boolean) {
    this.stress = enabled ?? !this.stress;
    if (this.stress) {
      this.createMotes(STRESS_MOTES);
    } else {
      while (this.motes.length > BASE_MOTES) this.motes.pop()?.sprite.destroy();
    }
    worldBus.emit('stress-changed', this.stress);
  }
}
