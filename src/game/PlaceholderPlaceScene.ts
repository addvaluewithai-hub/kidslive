import Phaser from 'phaser';
import {
  getPlaceAssetPack,
  isAssetPackReady,
  queueAssetPack,
  releaseSceneOwnedAssets,
  type AuthoredAssetPack,
  type QueuedAssetPack,
} from './assetPacks';
import { getHubPlace, type HubPlace } from './places';

type PlaceholderPlaceSceneData = {
  placeId: string;
};

type AssetLoadState = 'idle' | 'loading' | 'ready' | 'error';

export class PlaceholderPlaceScene extends Phaser.Scene {
  private place?: HubPlace;
  private assetPack?: AuthoredAssetPack;
  private queuedAssets?: QueuedAssetPack;
  private assetLoadState: AssetLoadState = 'idle';
  private failedAssetKeys = new Set<string>();
  private loadingLabel?: Phaser.GameObjects.Text;
  private returning = false;

  constructor() {
    super('placeholder-place');
  }

  init(data: PlaceholderPlaceSceneData) {
    this.place = getHubPlace(data.placeId);
    this.assetPack = this.place ? getPlaceAssetPack(this.place.id) : undefined;
    this.queuedAssets = undefined;
    this.assetLoadState = 'idle';
    this.failedAssetKeys.clear();
    this.loadingLabel = undefined;
    this.returning = false;
  }

  preload() {
    if (!this.place || !this.assetPack) return;

    const { width, height } = this.scale;
    this.assetLoadState = 'loading';
    this.loadingLabel = this.add
      .text(width / 2, height / 2, `Loading ${this.place.label}…`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#d7e4fa',
      })
      .setOrigin(0.5);

    this.queuedAssets = queueAssetPack(this, this.assetPack);

    const updateProgress = (progress: number) => {
      this.loadingLabel?.setText(`Loading ${this.place?.label ?? 'place'}… ${Math.round(progress * 100)}%`);
    };
    const recordFailure = (file: { key: string }) => {
      this.failedAssetKeys.add(file.key);
    };

    this.load.on(Phaser.Loader.Events.PROGRESS, updateProgress);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, recordFailure);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.load.off(Phaser.Loader.Events.PROGRESS, updateProgress);
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, recordFailure);
      this.assetLoadState = this.failedAssetKeys.size === 0 && this.assetPack && isAssetPackReady(this, this.assetPack) ? 'ready' : 'error';
    });
  }

  create() {
    const place = this.place;
    const assetPack = this.assetPack;
    this.loadingLabel?.destroy();
    this.loadingLabel = undefined;

    if (!place || !assetPack) {
      this.scene.start('planet-hub');
      return;
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      releaseSceneOwnedAssets(this, assetPack);
    });

    this.cameras.main.setBackgroundColor('#071426');

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    const portalSize = Math.min(width, height) * 0.48;

    if (this.assetLoadState === 'ready') {
      this.add.image(centerX, centerY - 24, 'shared:place-portal-frame').setDisplaySize(portalSize, portalSize);
      this.add
        .image(centerX, centerY - 24, `place:${place.id}:marker`)
        .setDisplaySize(portalSize * 0.52, portalSize * 0.52)
        .setTint(place.color);
    } else {
      this.add.circle(centerX, centerY - 24, Math.min(width, height) * 0.14, place.color, 0.32);
    }

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

    const statusText =
      this.assetLoadState === 'ready'
        ? 'This learning place is ready for its authored experience.'
        : 'Some place art could not load. You can safely return and try again.';
    const statusColor = this.assetLoadState === 'ready' ? '#d7e4fa' : '#ffcf9f';

    this.add
      .text(centerX, centerY + Math.min(width, height) * 0.22, statusText, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: width < 700 ? '15px' : '17px',
        color: statusColor,
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
