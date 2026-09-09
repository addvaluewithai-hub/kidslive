import Phaser from 'phaser';

type HubPlace = {
  id: string;
  label: string;
  subtitle: string;
  color: number;
};

const HUB_PLACES: HubPlace[] = [
  { id: 'english', label: 'English', subtitle: 'Words & stories', color: 0x68b8ff },
  { id: 'science', label: 'Science', subtitle: 'Discover & test', color: 0x72d6a3 },
  { id: 'math', label: 'Math', subtitle: 'Patterns & puzzles', color: 0xffc766 },
  { id: 'chess', label: 'Chess', subtitle: 'Think ahead', color: 0xb59cff },
  { id: 'art', label: 'Art', subtitle: 'Make & imagine', color: 0xff8eb5 },
  { id: 'music', label: 'Music', subtitle: 'Listen & create', color: 0x65ded7 },
];

export class PlanetHubScene extends Phaser.Scene {
  private placeLayer?: Phaser.GameObjects.Container;
  private title?: Phaser.GameObjects.Text;
  private subtitle?: Phaser.GameObjects.Text;
  private selectedPlaceId?: string;

  constructor() {
    super('planet-hub');
  }

  create() {
    this.cameras.main.setBackgroundColor('#071426');

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
        if (this.selectedPlaceId !== place.id) card.setScale(1.06);
      });
      planet.on('pointerout', () => {
        if (this.selectedPlaceId !== place.id) card.setScale(1);
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
    if (!this.title || !this.subtitle || !this.placeLayer) return;

    const compact = width < 700;
    const titleSize = compact ? 28 : 36;
    this.title.setFontSize(titleSize).setPosition(width / 2, compact ? 76 : 82).setOrigin(0.5, 0);
    this.subtitle.setPosition(width / 2, compact ? 116 : 130).setOrigin(0.5, 0);

    const columns = compact ? 2 : 3;
    const rows = Math.ceil(HUB_PLACES.length / columns);
    const availableWidth = Math.min(width - 48, compact ? 380 : 780);
    const columnGap = availableWidth / columns;
    const rowGap = compact ? 158 : 170;
    const startY = compact ? 210 : 230;
    const contentHeight = (rows - 1) * rowGap;
    const maxStartY = Math.max(170, height - contentHeight - 125);
    const resolvedStartY = Math.min(startY, maxStartY);

    this.placeLayer.each((child: Phaser.GameObjects.Container) => {
      const index = child.getData('index') as number;
      const column = index % columns;
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, HUB_PLACES.length - row * columns);
      const rowWidth = columnGap * rowCount;
      const rowStartX = width / 2 - rowWidth / 2 + columnGap / 2;
      child.setPosition(rowStartX + column * columnGap, resolvedStartY + row * rowGap);
    });
  }
}
