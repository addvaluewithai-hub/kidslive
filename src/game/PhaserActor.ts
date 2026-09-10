import Phaser from 'phaser';
import {
  ActorOperationCancelledError,
  type ActorAction,
  type ActorAnchor,
  type ActorEmotion,
  type ActorTarget,
  type WorldActor,
} from '../core/actors/WorldActor';
import type { CharacterDefinition } from './characterDefinitions';

export type ActorWorldPoint = { x: number; y: number };
export type ActorAnchorResolver = (anchor: ActorAnchor) => ActorWorldPoint | undefined;

type ActiveMovement = {
  target: ActorAnchor;
  tween: Phaser.Tweens.Tween;
  resolve: () => void;
  reject: (error: Error) => void;
};

export class PhaserActor implements WorldActor {
  readonly container: Phaser.GameObjects.Container;
  private readonly visual: Phaser.GameObjects.Container;
  private readonly face: Phaser.GameObjects.Arc;
  private readonly mouth: Phaser.GameObjects.Ellipse;
  private readonly glow: Phaser.GameObjects.Arc;
  private currentAnchor?: ActorAnchor;
  private lookTarget?: ActorTarget;
  private activeMovement?: ActiveMovement;
  private disposed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly definition: CharacterDefinition,
    private readonly resolveAnchor: ActorAnchorResolver,
  ) {
    this.container = scene.add.container().setName(`actor:${definition.id}`).setDepth(20);
    this.visual = scene.add.container();

    const shadow = scene.add.ellipse(0, 46, 66, 18, 0x000000, 0.25);
    this.glow = scene.add.circle(0, 0, 43, definition.palette.primary, 0.16);
    const body = scene.add.ellipse(0, 12, 58, 70, definition.palette.secondary, 1);
    this.face = scene.add.circle(0, -13, 27, definition.palette.primary, 1);
    const leftEye = scene.add.circle(-9, -17, 4, definition.palette.eye, 1);
    const rightEye = scene.add.circle(9, -17, 4, definition.palette.eye, 1);
    this.mouth = scene.add.ellipse(0, -4, 14, 5, definition.palette.eye, 0.82);
    const antenna = scene.add.rectangle(0, -48, 4, 22, definition.palette.accent, 1);
    const antennaTip = scene.add.circle(0, -61, 7, definition.palette.accent, 1);
    const badge = scene.add.circle(0, 20, 8, definition.palette.accent, 1);
    const name = scene.add
      .text(0, 58, definition.displayName, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f5f8ff',
        backgroundColor: '#071426cc',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5, 0);

    this.visual.add([
      shadow,
      this.glow,
      body,
      this.face,
      leftEye,
      rightEye,
      this.mouth,
      antenna,
      antennaTip,
      badge,
    ]);
    this.container.add([this.visual, name]);
    this.container.setScale(definition.scale);
    this.setEmotion('neutral');
  }

  moveTo(target: ActorAnchor): Promise<void> {
    this.assertActive();
    const point = this.resolveAnchor(target);
    if (!point) return Promise.reject(new Error(`Unknown actor anchor: ${target.id}`));

    this.cancelMovement('Actor movement superseded by a newer moveTo request');

    return new Promise<void>((resolve, reject) => {
      this.startMovementTween({ ...target }, point, resolve, reject, this.definition.movementDurationMs);
    });
  }

  /** Phaser-only lifecycle hook: place an actor without exposing coordinates to generic callers. */
  snapTo(target: ActorAnchor) {
    this.assertActive();
    const point = this.resolveAnchor(target);
    if (!point) throw new Error(`Unknown actor anchor: ${target.id}`);
    this.cancelMovement('Actor movement cancelled by layout snap');
    this.currentAnchor = { ...target };
    this.container.setPosition(point.x, point.y);
    this.refreshLookDirection();
  }

  /** Phaser-only responsive hook: keep semantic position/targets coherent after layout changes. */
  reflow() {
    this.assertActive();

    if (this.activeMovement) {
      const movement = this.activeMovement;
      const point = this.resolveAnchor(movement.target);
      if (!point) {
        this.cancelMovement(`Actor anchor disappeared during reflow: ${movement.target.id}`);
        return;
      }

      movement.tween.stop();
      this.startMovementTween(
        movement.target,
        point,
        movement.resolve,
        movement.reject,
        Math.min(this.definition.movementDurationMs, 220),
      );
      return;
    }

    if (this.currentAnchor) {
      const point = this.resolveAnchor(this.currentAnchor);
      if (point) this.container.setPosition(point.x, point.y);
    }
    this.refreshLookDirection();
  }

  lookAt(target: ActorTarget) {
    this.assertActive();
    this.lookTarget = { ...target };
    this.refreshLookDirection();
  }

  async speak(_text: string) {
    this.assertActive();
  }

  async perform(action: ActorAction) {
    this.assertActive();
    if (!this.definition.supportedActions.includes(action)) {
      throw new Error(`Unsupported actor action: ${action}`);
    }
  }

  setEmotion(emotion: ActorEmotion) {
    this.assertActive();
    if (!this.definition.supportedEmotions.includes(emotion)) {
      throw new Error(`Unsupported actor emotion: ${emotion}`);
    }

    const expression = this.definition.emotionPresentation[emotion];
    this.face.setFillStyle(expression.faceTint, 1);
    this.mouth.setDisplaySize(expression.mouthWidth, expression.mouthHeight);
    this.glow.setAlpha(expression.glowAlpha);
  }

  dispose() {
    if (this.disposed) return;
    this.cancelMovement('Actor disposed during movement');
    this.disposed = true;
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(true);
  }

  private startMovementTween(
    target: ActorAnchor,
    point: ActorWorldPoint,
    resolve: () => void,
    reject: (error: Error) => void,
    duration: number,
  ) {
    const tween = this.scene.tweens.add({
      targets: this.container,
      x: point.x,
      y: point.y,
      duration,
      ease: 'Sine.InOut',
      onUpdate: () => this.refreshLookDirection(),
      onComplete: () => {
        if (this.activeMovement?.tween !== tween) return;
        this.currentAnchor = { ...target };
        this.activeMovement = undefined;
        this.refreshLookDirection();
        resolve();
      },
    });

    this.activeMovement = { target: { ...target }, tween, resolve, reject };
  }

  private cancelMovement(reason: string) {
    const movement = this.activeMovement;
    if (!movement) return;
    this.activeMovement = undefined;
    movement.tween.stop();
    movement.reject(new ActorOperationCancelledError(reason));
  }

  private refreshLookDirection() {
    if (!this.lookTarget) return;
    const point = this.resolveAnchor(this.lookTarget);
    if (!point) return;
    const direction = Math.sign(point.x - this.container.x);
    if (direction === 0) return;
    this.visual.setScale(direction, 1);
  }

  private assertActive() {
    if (this.disposed) throw new Error('Actor has been disposed');
  }
}
