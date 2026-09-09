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
import { RuntimeDebugOverlay } from './runtimeDebug';

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
  private portalImage?: Phaser.GameObjects.Image;
  private markerImage?: Phaser.GameObjects.Image;
  private fallbackCircle?: Phaser.GameObjects.Arc;
  private title?: Phaser.GameObjects.Text;
  private subtitle?: Phaser.GameObjects.Text;
  private statusLabel?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Text;
  private debugOverlay?: RuntimeDebugOverlay;
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
    this.portalImage = undefined;
    this.markerImage = undefined;
    this.fallbackCircle = undefined;
    this.title = undefined;
    this.subtitle = undefined;
    this.statusLabel = undefined;
    this.backButton = undefined;
    this.debugOverlay = undefined;
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
      this.assetLoadState =
        this.failedAssetKeys.size === 0 && this.assetPack && isAssetPackReady(this, this.assetPack)
          ? 'ready'
          : 'error';
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

    this.cameras.main.setBackgroundColor('#071426');

    if (this.assetLoadState === 'ready') {
      this.portalImage = this.add.image(0, 0, 'shared:place-portal-frame');
      this.markerImage = this.add.image(0, 0, `place:${place.id}:marker`).setTint(place.color);
    } else {
      this.fallbackCircle = this.add.circle(0, 0, 80, place.color, 0.32);
    }

    this.title = this.add
      .text(0, 0, place.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '46px',
        fontStyle: 'bold',
        color: '#f5f8ff',
      })
      .setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, place.subtitle, {
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

    this.statusLabel = this.add
      .text(0, 0, statusText, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: statusColor,
        align: 'center',
      })
      .setOrigin(0.5);

    this.backButton = this.add
      .text(20, 58, '← Back to planet', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f5f8ff',
        backgroundColor: '#132947',
        padding: { x: 13, y: 13 },
      })
      .setInteractive({ useHandCursor: true });
    this.backButton.on('pointerdown', () => this.returnToHub());

    this.layout(this.scale.width, this.scale.height);

    this.debugOverlay = new RuntimeDebugOverlay(this, () => ({
      scene: this.scene.key,
      viewport: `${this.scale.width}x${this.scale.height}`,
      camera: `z=${this.cameras.main.zoom.toFixed(2)} x=${Math.round(this.cameras.main.scrollX)} y=${Math.round(this.cameras.main.scrollY)}`,
      mode: this.returning ? 'returning' : place.id,
      objects: this.children.length,
      detail: `assets=${this.assetLoadState} queued=${this.queuedAssets?.queuedKeys.length ?? 0} cached=${this.queuedAssets?.cachedKeys.length ?? 0} failed=${this.failedAssetKeys.size}`,
    }));

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height);
  }

  private handleShutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.tweens.killAll();
    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;

    if (this.assetPack) releaseSceneOwnedAssets(this, this.assetPack);
  }

  private layout(width: number, height: number) {
    if (!this.place || !this.title || !this.subtitle || !this.statusLabel || !this.backButton) return;

    const compact = width < 700;
    const centerX = width / 2;
    const centerY = height / 2;
    const portalSize = Math.min(width, height) * (compact ? 0.44 : 0.48);
    const artY = centerY - 24;

    this.portalImage?.setPosition(centerX, artY).setDisplaySize(portalSize, portalSize);
    this.markerImage
      ?.setPosition(centerX, artY)
      .setDisplaySize(portalSize * 0.52, portalSize * 0.52);
    this.fallbackCircle?.setPosition(centerX, artY).setRadius(Math.min(width, height) * 0.14);

    this.title
      .setPosition(centerX, Math.max(58, height * 0.13))
      .setFontSize(compact ? 34 : 46);
    this.subtitle.setPosition(centerX, Math.max(106, height * 0.2));
    this.statusLabel
      .setPosition(centerX, centerY + Math.min(width, height) * 0.22)
      .setFontSize(compact ? 15 : 17)
      .setWordWrapWidth(Math.min(520, width - 48));
    this.backButton.setPosition(20, Math.max(58, Math.min(72, height * 0.08)));
  }

  private returnToHub() {
    if (this.returning || !this.place) return;
    this.returning = true;
    this.backButton?.disableInteractive().setText('Returning…');

    this.cameras.main.fadeOut(180, 7, 20, 38);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('planet-hub', { selectedPlaceId: this.place?.id });
    });
  }
}
