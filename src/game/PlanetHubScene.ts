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

type PlaceVisualTheme = {
  ring: number;
  shadow: number;
  glyph: number;
};

const PLACE_VISUALS: Record<string, PlaceVisualTheme> = {
  english: { ring: 0x89cfff, shadow: 0x123c73, glyph: 0xffd166 },
  science: { ring: 0x8ff0c1, shadow: 0x174c43, glyph: 0xf5fff9 },
  math: { ring: 0xffdc85, shadow: 0x6c4317, glyph: 0x263a72 },
  chess: { ring: 0xd0c0ff, shadow: 0x3c2d69, glyph: 0xf7f1ff },
  art: { ring: 0xffb3cf, shadow: 0x6f3150, glyph: 0xfff1f7 },
  music: { ring: 0x98f7ef, shadow: 0x1c5a62, glyph: 0xf7ffff },
};

const DEFAULT_PLACE_VISUAL: PlaceVisualTheme = {
  ring: 0xb9d2ff,
  shadow: 0x20335c,
  glyph: 0xffffff,
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
  private backdropPaint?: Phaser.GameObjects.Graphics;
  private path?: Phaser.GameObjects.Graphics;
  private placeLayer?: Phaser.GameObjects.Container;
  private actor?: PhaserActor;
  private hudBackdrop?: Phaser.GameObjects.Rectangle;
  private hudAccent?: Phaser.GameObjects.Rectangle;
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
    this.cameras.main.setBackgroundColor('#061224');

    this.backdrop = this.add.container().setDepth(-3);
    this.buildBackdrop();
    this.path = this.add.graphics().setDepth(-1);

    this.hudBackdrop = this.add
      .rectangle(0, 0, 1, 1, 0x061224, 0.78)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);
    this.hudAccent = this.add
      .rectangle(0, 0, 1, 2, 0x72b7ff, 0.38)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(101);

    this.title = this.add
      .text(0, 0, 'Your Learning Planet', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#f8fbff',
        stroke: '#12213d',
        strokeThickness: 2,
      })
      .setShadow(0, 4, '#000000', 9, true, true)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(102);

    this.subtitle = this.add
      .text(0, 0, 'Choose a place to explore', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#b8c9e6',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(102);

    this.overviewButton = this.add
      .text(0, 0, '✦  Overview', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#e8f1ff',
        backgroundColor: '#132947ee',
        padding: { x: 14, y: 12 },
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(102)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.overviewButton.on('pointerdown', () => this.showOverview());

    this.enterButton = this.add
      .text(0, 0, 'Explore place  →', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#102039',
        backgroundColor: '#ffd166',
        padding: { x: 16, y: 13 },
      })
      .setShadow(0, 4, '#00000055', 6, true, true)
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(102)
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

    this.backdropPaint = this.add.graphics();
    this.backdrop.add(this.backdropPaint);

    for (let index = 0; index < 58; index += 1) {
      const x = (((index * 37) % 97) + 1) / 100;
      const y = (((index * 53) % 91) + 3) / 100;
      const radius = index % 11 === 0 ? 2 : index % 4 === 0 ? 1.25 : 0.75;
      const alpha = index % 7 === 0 ? 0.62 : 0.22 + (index % 5) * 0.055;
      const star =
        index % 11 === 0
          ? this.add.star(0, 0, 4, radius, radius * 2.6, 0xe9f3ff, alpha)
          : this.add.circle(0, 0, radius, 0xdcecff, alpha);
      star.setData('normalizedX', x);
      star.setData('normalizedY', y);
      this.backdrop.add(star);
    }
  }

  private buildPlaces() {
    if (!this.placeLayer) return;

    HUB_PLACES.forEach((place, index) => {
      const theme = PLACE_VISUALS[place.id] ?? DEFAULT_PLACE_VISUAL;
      const card = this.add.container().setName(place.id);
      const visual = this.add.container();

      const glow = this.add
        .circle(0, 0, 70, theme.ring, 0.13)
        .setBlendMode(Phaser.BlendModes.ADD);
      const orbit = this.add
        .ellipse(0, 6, 116, 42, 0xffffff, 0)
        .setStrokeStyle(2, theme.ring, 0.28)
        .setAngle(-12);
      const shadow = this.add.circle(8, 10, 47, theme.shadow, 0.48);
      const planet = this.add
        .circle(0, 0, 47, place.color, 1)
        .setStrokeStyle(2, theme.ring, 0.72);
      const lowerShade = this.add.ellipse(9, 15, 72, 50, theme.shadow, 0.2);
      const highlight = this.add.circle(-17, -19, 14, 0xffffff, 0.18);
      const decoration = this.buildPlaceDecoration(place, theme);

      visual.add([glow, orbit, shadow, planet, lowerShade, highlight, decoration]);

      const labelPanel = this.add
        .rectangle(0, 72, 144, 32, 0x08172e, 0.88)
        .setStrokeStyle(1, theme.ring, 0.34);
      const label = this.add
        .text(0, 72, place.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#f8fbff',
        })
        .setShadow(0, 2, '#000000', 4, true, true)
        .setOrigin(0.5);
      const subtitle = this.add
        .text(0, 96, place.subtitle, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#a9bedf',
        })
        .setOrigin(0.5, 0);

      const touchTarget = this.add.zone(0, 4, 126, 126).setInteractive({ useHandCursor: true });
      touchTarget.on('pointerover', () => {
        if (this.selectedPlaceId === place.id) return;
        this.tweens.killTweensOf(card);
        this.tweens.add({
          targets: card,
          scale: this.selectedPlaceId ? 1.01 : 1.06,
          duration: 130,
          ease: 'Sine.Out',
        });
      });
      touchTarget.on('pointerout', () => {
        if (this.selectedPlaceId === place.id) return;
        this.tweens.killTweensOf(card);
        this.tweens.add({
          targets: card,
          scale: this.selectedPlaceId ? 0.96 : 1,
          duration: 130,
          ease: 'Sine.Out',
        });
      });
      touchTarget.on('pointerdown', () => this.selectPlace(place, card));

      if (place.subtitle.includes('✓')) {
        const completionGlow = this.add
          .circle(37, -37, 16, 0x7ee8a3, 0.25)
          .setBlendMode(Phaser.BlendModes.ADD);
        const completionBadge = this.add.circle(37, -37, 12, 0x39c776, 1);
        const completionMark = this.add
          .text(37, -38, '✓', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
          })
          .setOrigin(0.5);
        visual.add([completionGlow, completionBadge, completionMark]);
      }

      card.add([visual, labelPanel, label, subtitle, touchTarget]);
      card.setData('visual', visual);
      this.placeLayer?.add(card);

      this.tweens.add({
        targets: visual,
        y: -4,
        duration: 2100 + index * 170,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      });
      this.tweens.add({
        targets: glow,
        alpha: 0.22,
        scale: 1.08,
        duration: 1700 + index * 120,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }

  private buildPlaceDecoration(place: HubPlace, theme: PlaceVisualTheme) {
    const decoration = this.add.container();
    const ink = 0xf8fbff;

    if (place.id === 'english') {
      const letters = [
        ['A', -20, 0, 0xffd166],
        ['B', 0, -5, 0xff8b8b],
        ['C', 20, 1, 0xbbe2ff],
      ] as const;
      letters.forEach(([letter, x, y, color]) => {
        decoration.add(
          this.add
            .text(x, y, letter, {
              fontFamily: 'system-ui, sans-serif',
              fontSize: '20px',
              fontStyle: 'bold',
              color: `#${color.toString(16).padStart(6, '0')}`,
              stroke: '#102a50',
              strokeThickness: 2,
            })
            .setOrigin(0.5),
        );
      });
      const flag = this.add.graphics();
      flag.lineStyle(2, ink, 0.8).lineBetween(-27, -26, -27, -9);
      flag.fillStyle(0xffd166, 1).fillTriangle(-27, -26, -9, -21, -27, -16);
      decoration.add(flag);
      return decoration;
    }

    if (place.id === 'science') {
      const flask = this.add.graphics();
      flask.lineStyle(3, ink, 0.88);
      flask.beginPath();
      flask.moveTo(-8, -22);
      flask.lineTo(8, -22);
      flask.moveTo(-4, -22);
      flask.lineTo(-4, -5);
      flask.lineTo(-18, 18);
      flask.lineTo(18, 18);
      flask.lineTo(4, -5);
      flask.lineTo(4, -22);
      flask.strokePath();
      flask.fillStyle(theme.glyph, 0.62).fillTriangle(-14, 14, 14, 14, 0, -1);
      decoration.add([
        flask,
        this.add.circle(19, -12, 4, 0xd9fff0, 0.75),
        this.add.circle(26, -24, 2.5, 0xd9fff0, 0.55),
      ]);
      return decoration;
    }

    if (place.id === 'math') {
      decoration.add(
        this.add
          .text(0, -1, '1 2 3', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '19px',
            fontStyle: 'bold',
            color: '#25385f',
            stroke: '#fff1bf',
            strokeThickness: 2,
          })
          .setOrigin(0.5),
      );
      return decoration;
    }

    if (place.id === 'chess') {
      const board = this.add.graphics();
      const cell = 9;
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          board.fillStyle((row + column) % 2 === 0 ? 0xe9e4ff : 0x554280, 0.82);
          board.fillRect((column - 2) * cell, 2 + (row - 2) * cell, cell, cell);
        }
      }
      decoration.add([
        board,
        this.add
          .text(0, -16, '♞', {
            fontFamily: 'Georgia, serif',
            fontSize: '26px',
            color: '#ffffff',
          })
          .setOrigin(0.5),
      ]);
      return decoration;
    }

    if (place.id === 'art') {
      const palette = this.add.graphics();
      palette.fillStyle(0xffe6ef, 0.92).fillEllipse(0, 0, 48, 34);
      palette.fillStyle(0x6eb8ff, 1).fillCircle(-12, -5, 4);
      palette.fillStyle(0xffd166, 1).fillCircle(0, -9, 4);
      palette.fillStyle(0x80e1b0, 1).fillCircle(12, -4, 4);
      palette.fillStyle(theme.shadow, 0.55).fillCircle(8, 8, 6);
      palette.lineStyle(4, 0xf8fbff, 0.88).lineBetween(12, 11, 27, -20);
      decoration.add(palette);
      return decoration;
    }

    decoration.add(
      this.add
        .text(0, -2, '♫', {
          fontFamily: 'Georgia, serif',
          fontSize: '34px',
          fontStyle: 'bold',
          color: '#f7ffff',
          stroke: '#1b5d66',
          strokeThickness: 2,
        })
        .setOrigin(0.5),
    );
    return decoration;
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
    this.subtitle?.setText(`${place.label} · ${place.subtitle}`);
    this.overviewButton?.setAlpha(1);
    this.enterButton?.setText(`Explore ${place.label}  →`).setAlpha(1);

    if (animate) {
      this.runActorPlaceSequence(place);
    } else {
      this.actor?.setEmotion('curious');
      this.actor?.lookAt(placeLookTarget(place.id));
      this.actor?.snapTo(placeActorAnchor(place.id));
    }

    this.placeLayer.each((child: Phaser.GameObjects.Container) => {
      const selected = child === selectedCard;
      this.tweens.killTweensOf(child);
      if (animate) {
        this.tweens.add({
          targets: child,
          scale: selected ? 1.13 : 0.94,
          alpha: selected ? 1 : 0.52,
          duration: 210,
          ease: 'Sine.Out',
        });
      } else {
        child.setScale(selected ? 1.13 : 0.94).setAlpha(selected ? 1 : 0.52);
      }
    });

    if (animate) {
      this.cameras.main.pan(selectedCard.x, selectedCard.y, 320, 'Sine.easeInOut');
      this.cameras.main.zoomTo(1.08, 320, 'Sine.easeInOut');
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
    this.actor?.interrupt('Leaving the hub');
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
    this.actor?.interrupt('Hub overview requested');
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
    this.actor?.interrupt('Hub resized');
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

  private runActorPlaceSequence(place: HubPlace) {
    const actor = this.actor;
    if (!actor) return;

    actor.interrupt('Hub selection changed');
    actor.setEmotion('curious');
    actor.lookAt(placeLookTarget(place.id));

    void (async () => {
      try {
        await actor.moveTo(placeActorAnchor(place.id));
        await actor.perform('think');
        actor.setEmotion('excited');
        await actor.speak(`Let's explore ${place.label}!`);
        actor.setEmotion('curious');
      } catch (error: unknown) {
        if (!isActorOperationCancelled(error)) console.error(error);
      }
    })();
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
    const titleY = compact ? 46 : 48;
    const subtitleY = compact ? 86 : 94;
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
      !this.backdropPaint ||
      !this.path ||
      !this.hudBackdrop ||
      !this.hudAccent
    )
      return;

    const compact = isCompactHubViewport(width);
    const titleSize = compact ? 27 : 38;
    const hudHeight = compact ? 118 : 126;
    this.hudBackdrop.setPosition(0, 0).setSize(width, hudHeight).setDisplaySize(width, hudHeight);
    this.hudAccent.setPosition(0, hudHeight - 2).setSize(width, 2).setDisplaySize(width, 2);
    this.title.setFontSize(titleSize);
    this.syncHudToCamera();

    this.paintBackdrop(width, height);
    this.backdrop.each((child: Phaser.GameObjects.GameObject) => {
      const normalizedX = child.getData('normalizedX') as number | undefined;
      const normalizedY = child.getData('normalizedY') as number | undefined;
      if (normalizedX === undefined || normalizedY === undefined) return;
      const positioned = child as Phaser.GameObjects.Arc | Phaser.GameObjects.Star;
      positioned.setPosition(width * normalizedX, height * normalizedY);
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
    this.paintPaths(resolvedPositions, width, height, compact);
  }

  private paintBackdrop(width: number, height: number) {
    if (!this.backdropPaint) return;

    const paint = this.backdropPaint;
    paint.clear();
    paint.fillGradientStyle(0x061224, 0x0d1a3a, 0x071426, 0x160f33, 1);
    paint.fillRect(0, 0, width, height);

    paint.fillStyle(0x5e46a6, 0.08);
    paint.fillEllipse(width * 0.22, height * 0.42, width * 0.72, height * 0.36);
    paint.fillStyle(0x2f75aa, 0.07);
    paint.fillEllipse(width * 0.79, height * 0.28, width * 0.52, height * 0.28);
    paint.fillStyle(0xa35db1, 0.035);
    paint.fillEllipse(width * 0.54, height * 0.7, width * 0.64, height * 0.22);

    paint.fillStyle(0x133b67, 0.3);
    paint.fillEllipse(width * 0.5, height * 1.08, width * 1.42, height * 0.62);
    paint.lineStyle(2, 0x6fbaff, 0.1);
    paint.strokeEllipse(width * 0.5, height * 1.08, width * 1.25, height * 0.52);

    const mistY = height * 0.88;
    for (let index = 0; index < 7; index += 1) {
      paint.fillStyle(0xa8cfff, 0.025 + (index % 2) * 0.012);
      paint.fillCircle((width / 6) * index, mistY + (index % 3) * 18, 78 + (index % 3) * 14);
    }
  }

  private paintPaths(
    positions: Phaser.Math.Vector2[],
    width: number,
    height: number,
    compact: boolean,
  ) {
    if (!this.path) return;

    const path = this.path;
    path.clear();
    path.lineStyle(compact ? 1 : 2, 0x7eb9ff, 0.09);
    path.strokeEllipse(width / 2, height * 0.55, width * (compact ? 0.86 : 0.76), height * 0.53);
    path.lineStyle(compact ? 1 : 2, 0xbc8dff, 0.06);
    path.strokeEllipse(width / 2, height * 0.56, width * (compact ? 0.68 : 0.55), height * 0.36);

    const drawRoute = (lineWidth: number, alpha: number) => {
      path.lineStyle(lineWidth, 0x74b9ff, alpha);
      path.beginPath();
      positions.forEach((position, index) => {
        if (index === 0) path.moveTo(position.x, position.y);
        else path.lineTo(position.x, position.y);
      });
      path.strokePath();
    };

    drawRoute(compact ? 7 : 9, 0.035);
    drawRoute(compact ? 2 : 3, 0.18);

    positions.slice(0, -1).forEach((position, index) => {
      const next = positions[index + 1];
      const x = (position.x + next.x) / 2;
      const y = (position.y + next.y) / 2;
      path.fillStyle(0xcfe4ff, 0.44).fillCircle(x, y, compact ? 2.2 : 2.8);
      path.fillStyle(0x74b9ff, 0.1).fillCircle(x, y, compact ? 7 : 9);
    });
  }
}
