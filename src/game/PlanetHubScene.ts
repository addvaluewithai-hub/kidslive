import Phaser from 'phaser';

type HubPlace = {
  id: string;
  label: string;
  subtitle: string;
  color: number;
};

type HubPosition = {
  x: number;
  y: number;
};

const HUB_PLACES: HubPlace[] = [
  { id: 'english', label: 'English', subtitle: 'Words & stories', color: 0x68b8ff },
  { id: 'science', label: 'Science', subtitle: 'Discover & test', color: 0x72d6a3 },
  { id: 'math', label: 'Math', subtitle: 'Patterns & puzzles', color: 0xffc766 },
  { id: 'chess', label: 'Chess', subtitle: 'Think ahead', color: 0xb59cff },
  { id: 'art', label: 'Art', subtitle: 'Make & imagine', color: 0xff8eb5 },
  { id: 'music', label: 'Music', subtitle: 'Listen & create', color: 0x65ded7 },
];

const DESKTOP_POSITIONS: HubPosition[] = [
  { x: -0.34, y: -0.2 },
  { x: 0, y: -0.32 },
  { x: 0.34, y: -0.14 },
  { x: -0.28, y: 0.24 },
  { x: 0.08, y: 0.18 },
  { x: 0.36, y: 0.3 },
];

const COMPACT_POSITIONS: HubPosition[] = [
  { x: -0.23, y: -0.28 },
  { x: 0.23, y: -0.2 },
  { x: -0.2, y: 0.02 },
  { x: 0.21, y: 0.1 },
  { x: -0.22, y: 0.31 },
  { x: 0.2, y: 0.38 },
];

export class PlanetHubScene extends Phaser.Scene {
  private backdrop?: Phaser.GameObjects.Container;
  private path?: Phaser.GameObjects.Graphics;
  private placeLayer?: Phaser.GameObjects.Container;
  private title?: Phaser.GameObjects.Text;
  private subtitle?: Phaser.GameObjects.Text;
  private selectedPlaceId?: string;

  constructor() {
    super('planet-hub');
  }

  create() {
    this.cameras.main.setBackgroundColor('#071426');

    this.backdrop = this.add.container();
    this.buildBackdrop();
    this.path = this.add.graphics();

    this.title = this.add.text(0, 0, 'Your Learning Planet', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#f5f8ff',
    });

    this.subtitle = this.add.text(0, 0, 'Choose a place to explore', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#a9b8d3',
    });

    this.placeLayer = this.add.container();
    this.buildPlaces();
    this.layout(this.scale.width, this.scale.height);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.tweens.killAll();
    });
  }

  private buildBackdrop() {
    if (!this.backdrop) return;

    const stars = [
      [0.08, 0.2, 1.5, 0.34],
      [0.17, 0.39, 1, 0.2],
      [0.26, 0.16, 1, 0.28],
      [0.38, 0.3, 1.5, 0.18],
      [0.5, 0.18, 1, 0.25],
      [0.62, 0.35, 1, 0.2],
      [0.74, 0.14, 1.5, 0.3],
      [0.88, 0.29, 1, 0.2],
      [0.12, 0.66, 1, 0.22],
      [0.31, 0.78, 1.5, 0.18],
      [0.56, 0.7, 1, 0.26],
      [0.79, 0.77, 1.5, 0.2],
      [0.92, 0.58, 1, 0.28],
    ] as const;

    stars.forEach(([x, y, radius, alpha]) => {
      const star = this.add.circle(0, 0, radius, 0xd9e8ff, alpha);
      star.setData('normalizedX', x);
      star.setData('normalizedY', y);
      this.backdrop?.add(star);
    });
  }

  private buildPlaces() {
    if (!this.placeLayer) return;

    for (const [index, place] of HUB_PLACES.entries()) {
      const card = this.add.container();
      card.setName(place.id);

      const glow = this.add.circle(0, 0, 54, place.color, 0.12);
      const planet = this.add.circle(0, 0, 39, place.color, 0.95);
      const highlight = this.add.circle(-12, -14, 12, 0xffffff, 0.16);
      const label = this.add
        .text(0, 56, place.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#f5f8ff',
        })
        .setOrigin(0.5, 0);
      const subtitle = this.add
        .text(0, 80, place.subtitle, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#91a3c2',
        })
        .setOrigin(0.5, 0);

      planet.setInteractive({ useHandCursor: true });
      planet.on('pointerover', () => {
        if (this.selectedPlaceId !== place.id) {
          card.setScale(this.selectedPlaceId ? 1.02 : 1.06);
        }
      });
      planet.on('pointerout', () => {
        if (this.selectedPlaceId !== place.id) {
          card.setScale(this.selectedPlaceId ? 0.96 : 1);
        }
      });
      planet.on('pointerdown', () => this.selectPlace(place, card));

      card.add([glow, planet, highlight, label, subtitle]);
      card.setData('index', index);
      this.placeLayer.add(card);
    }
  }

  private selectPlace(place: HubPlace, selectedCard: Phaser.GameObjects.Container) {
    if (!this.placeLayer) return;

    this.selectedPlaceId = place.id;
    this.subtitle?.setText(`${place.label}: ${place.subtitle}`);

    this.placeLayer.each((child: Phaser.GameObjects.Container) => {
      const selected = child === selectedCard;
      this.tweens.killTweensOf(child);
      this.tweens.add({
        targets: child,
        scale: selected ? 1.14 : 0.96,
        alpha: selected ? 1 : 0.58,
        duration: 180,
        ease: 'Sine.Out',
      });
    });

    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.025,
      duration: 90,
      yoyo: true,
      ease: 'Sine.InOut',
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height);
  }

  private layout(width: number, height: number) {
    if (!this.title || !this.subtitle || !this.placeLayer || !this.backdrop || !this.path) return;

    const compact = width < 700;
    const titleSize = compact ? 28 : 36;
    this.title.setFontSize(titleSize).setPosition(width / 2, compact ? 54 : 58).setOrigin(0.5, 0);
    this.subtitle.setPosition(width / 2, compact ? 94 : 108).setOrigin(0.5, 0);

    this.backdrop.each((child: Phaser.GameObjects.GameObject) => {
      const star = child as Phaser.GameObjects.Arc;
      const normalizedX = star.getData('normalizedX') as number;
      const normalizedY = star.getData('normalizedY') as number;
      star.setPosition(width * normalizedX, height * normalizedY);
    });

    const positions = compact ? COMPACT_POSITIONS : DESKTOP_POSITIONS;
    const centerX = width / 2;
    const centerY = compact ? Math.max(360, height * 0.52) : Math.max(350, height * 0.54);
    const spreadX = Math.min(compact ? 520 : 1040, width - (compact ? 32 : 120));
    const spreadY = Math.min(compact ? 660 : 520, height - (compact ? 150 : 170));
    const resolvedPositions: Phaser.Math.Vector2[] = [];

    this.placeLayer.each((child: Phaser.GameObjects.Container) => {
      const index = child.getData('index') as number;
      const position = positions[index];
      const x = centerX + position.x * spreadX;
      const y = centerY + position.y * spreadY;
      child.setPosition(x, y);
      resolvedPositions.push(new Phaser.Math.Vector2(x, y));
    });

    this.path.clear();
    this.path.lineStyle(compact ? 2 : 3, 0x6d8fbe, 0.18);
    this.path.beginPath();
    resolvedPositions.forEach((position, index) => {
      if (index === 0) this.path?.moveTo(position.x, position.y);
      else this.path?.lineTo(position.x, position.y);
    });
    this.path.strokePath();
    this.path.setDepth(-1);
  }
}
