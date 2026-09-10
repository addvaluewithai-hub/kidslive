import Phaser from 'phaser';
import {
  isActorOperationCancelled,
  type ActorAnchor,
} from '../core/actors/WorldActor';
import { KIDSLIVE_COMPANION } from './characterDefinitions';
import { PhaserActor } from './PhaserActor';
import {
  HUB_PLACES,
  getHubPlace,
  isCompactHubViewport,
  resolveHubPlacePosition,
  type HubPlace,
} from './places';
import { RuntimeDebugOverlay } from './runtimeDebug';

type PlanetHubSceneData = {
  selectedPlaceId?: string;
};

const HUB_ACTOR_HOME: ActorAnchor = { kind: 'anchor', id: 'hub-home' };
const HUB_ACTOR_CENTER: ActorAnchor = { kind: 'anchor', id: 'hub-center' };
const placeActorAnchor = (placeId: string): ActorAnchor => ({
  kind: 'anchor',
  id: `hub-place:${placeId}:companion`,
});
const placeLookTarget = (placeId: string): ActorAnchor => ({
  kind: 'anchor',
  id: `hub-place:${placeId}:focus`,
});

export class PlanetHubScene extends Phaser.Scene {
  private backdrop?: Phaser.GameObjects.Container;
  private path?: Phaser.GameObjects.Graphics;
  private placeLayer?: Phaser.GameObjects.Container;
  private actor?: PhaserActor;
  private hudBackdrop?: Phaser.GameObjects.Rectangle;
  private title?: Phaser.GameObjects.Text;
  private subtitle?: Phaser.GameObjects.Text;
  private overviewButton?: Phaser.GameObjects.Text;
  private enterButton?: Phaser.GameObjects.Text;
  private debugOverlay?: RuntimeDebugOverlay;
  private selectedPlaceId?: string;
  private initialSelectedPlaceId?: string;
  private transitioning = false;
  private lastHudZoom = Number.NaN;

  constructor() {
    super('planet-hub');
  }

  init(data: PlanetHubSceneData) {
    this.initialSelectedPlaceId = data.selectedPlaceId;
    this.selectedPlaceId = undefined;
    this.transitioning = false;
    this.lastHudZoom = Number.NaN;
  }

  create() {
    this.cameras.main.setBackgroundColor('#071426');

    this.backdrop = this.add.container().setDepth(-2);
    this.buildBackdrop();
    this.path = this.add.graphics().setDepth(-1);

    this.hudBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x071426, 0.94)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.title = this.add
      .text(0, 0, 'Your Learning Planet', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#f5f8ff',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    this.subtitle = this.add
      .text(0, 0, 'Choose a place to explore', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#a9b8d3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    this.overviewButton = this.add
      .text(0, 0, 'Overview', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#d7e4fa',
        backgroundColor: '#132947',
        padding: { x: 12, y: 12 },
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(101)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.overviewButton.on('pointerdown', () => this.showOverview());

    this.enterButton = this.add
      .text(0, 0, 'Enter place →', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#071426',
        backgroundColor: '#f5f8ff',
        padding: { x: 14, y: 12 },
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(101)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.enterButton.on('pointerdown', () => this.enterSelectedPlace());

    this.placeLayer = this.add.container();
    this.buildPlaces();

    this.actor = new PhaserActor(this, KIDSLIVE_COMPANION, (anchor) =>
      this.resolveActorAnchor(anchor),
    );
    this.actor.setEmotion('warm');
    this.actor.snapTo(HUB_ACTOR_HOME);
    this.actor.lookAt(HUB_ACTOR_CENTER);

    this.layout(this.scale.width, this.scale.height);
    this.restoreInitialSelection();

    this.debugOverlay = new RuntimeDebugOverlay(this, () => ({
      scene: this.scene.key,
      viewport: `${this.scale.width}x${this.scale.height}`,
      camera: `z=${this.cameras.main.zoom.toFixed(2)} x=${Math.round(this.cameras.main.scrollX)} y=${Math.round(this.cameras.main.scrollY)}`,
      mode: this.transitioning ? 'transitioning' : (this.selectedPlaceId ?? 'overview'),
      objects: this.children.length,
      detail: `places=${this.placeLayer?.length ?? 0} actor=${this.actor?.definition.id ?? 'none'} tweens=${this.tweens.getTweens().length}`,
    }));

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  update() {
    const zoom = this.cameras.main.zoom;
    if (Math.abs(zoom - this.lastHudZoom) < 0.0005) return;
    this.syncHudToCamera();
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

    for (const place of HUB_PLACES) {
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
      this.placeLayer.add(card);
    }
  }

  private restoreInitialSelection() {
    if (!this.initialSelectedPlaceId || !this.placeLayer) return;

    const place = getHubPlace(this.initialSelectedPlaceId);
    const card = this.placeLayer.getByName(this.initialSelectedPlaceId) as
      | Phaser.GameObjects.Container
      | null;
    this.initialSelectedPlaceId = undefined;

    if (place && card) this.selectPlace(place, card, false);
  }

  private selectPlace(
    place: HubPlace,
    selectedCard: Phaser.GameObjects.Container,
    animate = true,
  ) {
    if (!this.placeLayer || this.transitioning) return;

    this.selectedPlaceId = place.id;
    this.subtitle?.setText(`${place.label}: ${place.subtitle}`);
    this.overviewButton?.setAlpha(1);
    this.enterButton?.setText(`Enter ${place.label} →`).setAlpha(1);

    this.actor?.setEmotion('curious');
    this.actor?.lookAt(placeLookTarget(place.id));
    if (animate) this.moveActorTo(placeActorAnchor(place.id));
    else this.actor?.snapTo(placeActorAnchor(place.id));

    this.placeLayer.each((child: Phaser.GameObjects.Container) => {
      const selected = child === selectedCard;
      this.tweens.killTweensOf(child);
      if (animate) {
        this.tweens.add({
          targets: child,
          scale: selected ? 1.14 : 0.96,
          alpha: selected ? 1 : 0.58,
          duration: 180,
          ease: 'Sine.Out',
        });
      } else {
        child.setScale(selected ? 1.14 : 0.96).setAlpha(selected ? 1 : 0.58);
      }
    });

    if (animate) {
      this.cameras.main.pan(selectedCard.x, selectedCard.y, 280, 'Sine.easeInOut');
      this.cameras.main.zoomTo(1.08, 280, 'Sine.easeInOut');
    } else {
      this.cameras.main.centerOn(selectedCard.x, selectedCard.y);
      this.cameras.main.setZoom(1.08);
      this.syncHudToCamera();
    }
  }

  private enterSelectedPlace() {
    if (!this.selectedPlaceId || this.transitioning) return;
    const place = getHubPlace(this.selectedPlaceId);
    if (!place) return;

    this.transitioning = true;
    this.enterButton?.disableInteractive().setText(`Entering ${place.label}…`);
    this.overviewButton?.disableInteractive();

    this.cameras.main.fadeOut(180, 7, 20, 38);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('placeholder-place', { placeId: place.id });
    });
  }

  private showOverview() {
    if (!this.placeLayer || this.transitioning) return;

    this.selectedPlaceId = undefined;
    this.subtitle?.setText('Choose a place to explore');
    this.overviewButton?.setAlpha(0);
    this.enterButton?.setAlpha(0);
    this.actor?.setEmotion('warm');
    this.actor?.lookAt(HUB_ACTOR_CENTER);
    this.moveActorTo(HUB_ACTOR_HOME);

    this.placeLayer.each((child: Phaser.GameObjects.Container) => {
      this.tweens.killTweensOf(child);
      this.tweens.add({
        targets: child,
        scale: 1,
        alpha: 1,
        duration: 180,
        ease: 'Sine.Out',
      });
    });

    this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2, 280, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1, 280, 'Sine.easeInOut');
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setScroll(0, 0).setZoom(1);
    this.lastHudZoom = Number.NaN;
    this.selectedPlaceId = undefined;
    this.overviewButton?.setAlpha(0);
    this.enterButton?.setAlpha(0);
    this.subtitle?.setText('Choose a place to explore');
    this.layout(gameSize.width, gameSize.height);
    this.actor?.setEmotion('warm');
    this.actor?.snapTo(HUB_ACTOR_HOME);
    this.actor?.lookAt(HUB_ACTOR_CENTER);
  }

  private handleShutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.actor?.dispose();
    this.actor = undefined;
    this.tweens.killAll();
    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;
  }

  private moveActorTo(anchor: ActorAnchor) {
    const movement = this.actor?.moveTo(anchor);
    if (!movement) return;
    void movement.catch((error: unknown) => {
      if (!isActorOperationCancelled(error)) console.error(error);
    });
  }

  private resolveActorAnchor(anchor: ActorAnchor) {
    const width = this.scale.width;
    const height = this.scale.height;
    const compact = isCompactHubViewport(width);

    if (anchor.id === HUB_ACTOR_HOME.id) {
      return {
        x: compact ? width - 58 : width - 84,
        y: compact ? 184 : 194,
      };
    }

    if (anchor.id === HUB_ACTOR_CENTER.id) {
      return { x: width / 2, y: height / 2 };
    }

    const match = /^hub-place:(.+):(companion|focus)$/.exec(anchor.id);
    if (!match) return undefined;
    const place = getHubPlace(match[1]);
    if (!place) return undefined;
    const position = resolveHubPlacePosition(place, width, height);

    if (match[2] === 'focus') return position;

    const side = position.x < width / 2 ? 1 : -1;
    const xOffset = compact ? 58 : 76;
    return {
      x: Phaser.Math.Clamp(position.x + side * xOffset, compact ? 52 : 68, width - (compact ? 52 : 68)),
      y: Phaser.Math.Clamp(position.y + (compact ? 14 : 10), compact ? 192 : 188, height - 100),
    };
  }

  private syncHudToCamera() {
    if (!this.title || !this.subtitle || !this.overviewButton || !this.enterButton) return;

    const width = this.scale.width;
    const height = this.scale.height;
    const compact = isCompactHubViewport(width);
    const zoom = this.cameras.main.zoom;
    const inverseZoom = 1 / zoom;
    const centerX = width / 2;
    const centerY = height / 2;
    const titleY = compact ? 54 : 58;
    const subtitleY = compact ? 94 : 108;
    const buttonY = height - 18;

    this.title
      .setScale(inverseZoom)
      .setPosition(centerX, centerY + (titleY - centerY) * inverseZoom);
    this.subtitle
      .setScale(inverseZoom)
      .setPosition(centerX, centerY + (subtitleY - centerY) * inverseZoom);
    this.enterButton
      .setScale(inverseZoom)
      .setPosition(centerX + (18 - centerX) * inverseZoom, centerY + (buttonY - centerY) * inverseZoom);
    this.overviewButton
      .setScale(inverseZoom)
      .setPosition(
        centerX + (width - 18 - centerX) * inverseZoom,
        centerY + (buttonY - centerY) * inverseZoom,
      );
    this.lastHudZoom = zoom;
  }

  private layout(width: number, height: number) {
    if (
      !this.title ||
      !this.subtitle ||
      !this.overviewButton ||
      !this.enterButton ||
      !this.placeLayer ||
      !this.backdrop ||
      !this.path ||
      !this.hudBackdrop
    )
      return;

    const compact = isCompactHubViewport(width);
    const titleSize = compact ? 28 : 36;
    const hudHeight = compact ? 126 : 138;
    this.hudBackdrop.setPosition(0, 0).setSize(width, hudHeight).setDisplaySize(width, hudHeight);
    this.title.setFontSize(titleSize);
    this.syncHudToCamera();

    this.backdrop.each((child: Phaser.GameObjects.GameObject) => {
      const star = child as Phaser.GameObjects.Arc;
      const normalizedX = star.getData('normalizedX') as number;
      const normalizedY = star.getData('normalizedY') as number;
      star.setPosition(width * normalizedX, height * normalizedY);
    });

    const resolvedPositions: Phaser.Math.Vector2[] = [];

    this.placeLayer.each((child: Phaser.GameObjects.Container) => {
      const place = getHubPlace(child.name);
      if (!place) return;
      const position = resolveHubPlacePosition(place, width, height);
      child.setPosition(position.x, position.y).setScale(1).setAlpha(1);
      resolvedPositions.push(new Phaser.Math.Vector2(position.x, position.y));
    });

    this.actor?.reflow();

    this.path.clear();
    this.path.lineStyle(compact ? 2 : 3, 0x6d8fbe, 0.18);
    this.path.beginPath();
    resolvedPositions.forEach((position, index) => {
      if (index === 0) this.path?.moveTo(position.x, position.y);
      else this.path?.lineTo(position.x, position.y);
    });
    this.path.strokePath();
  }
}
