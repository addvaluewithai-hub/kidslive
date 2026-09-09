import Phaser from 'phaser';
import { getHubPlace, type HubPlace } from './places';

type PlaceholderPlaceSceneData = {
  placeId: string;
};

export class PlaceholderPlaceScene extends Phaser.Scene {
  private place?: HubPlace;
  private returning = false;

  constructor() {
    super('placeholder-place');
  }

  init(data: PlaceholderPlaceSceneData) {
    this.place = getHubPlace(data.placeId);
    this.returning = false;
  }

  create() {
    const place = this.place;
    if (!place) {
      this.scene.start('planet-hub');
      return;
    }

    this.cameras.main.setBackgroundColor('#071426');
    this.cameras.main.fadeIn(220, 7, 20, 38);

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    this.add.circle(centerX, centerY - 24, Math.min(width, height) * 0.22, place.color, 0.15);
    this.add.circle(centerX, centerY - 24, Math.min(width, height) * 0.14, place.color, 0.92);
    this.add
      .text(centerX, Math.max(52, height * 0.13), place.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: width < 700 ? '34px' : '46px',
        fontStyle: 'bold',
        color: '#f5f8ff',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, Math.max(98, height * 0.2), place.subtitle, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#a9b8d3',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + Math.min(width, height) * 0.22, 'This learning place is ready for its authored experience.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: width < 700 ? '15px' : '17px',
        color: '#d7e4fa',
        align: 'center',
        wordWrap: { width: Math.min(520, width - 48) },
      })
      .setOrigin(0.5);

    const backButton = this.add
      .text(20, 58, '← Back to planet', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f5f8ff',
        backgroundColor: '#132947',
        padding: { x: 13, y: 9 },
      })
      .setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => this.returnToHub());
  }

  private returnToHub() {
    if (this.returning || !this.place) return;
    this.returning = true;

    this.cameras.main.fadeOut(180, 7, 20, 38);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('planet-hub', { selectedPlaceId: this.place?.id });
    });
  }
}
