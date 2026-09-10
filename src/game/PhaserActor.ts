import Phaser from 'phaser';
import type {
  ActorAction,
  ActorAnchor,
  ActorEmotion,
  ActorTarget,
  WorldActor,
} from '../core/actors/WorldActor';
import type { CharacterDefinition } from './characterDefinitions';

export type ActorWorldPoint = { x: number; y: number };
export type ActorAnchorResolver = (anchor: ActorAnchor) => ActorWorldPoint | undefined;

export class PhaserActor implements WorldActor {
  readonly container: Phaser.GameObjects.Container;
  private readonly face: Phaser.GameObjects.Arc;
  private readonly mouth: Phaser.GameObjects.Arc;
  private disposed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly definition: CharacterDefinition,
    private readonly resolveAnchor: ActorAnchorResolver,
  ) {
    this.container = scene.add.container().setName(`actor:${definition.id}`).setDepth(20);

    const shadow = scene.add.ellipse(0, 46, 66, 18, 0x000000, 0.25);
    const glow = scene.add.circle(0, 0, 43, definition.palette.primary, 0.16);
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

    this.container.add([
      shadow,
      glow,
      body,
      this.face,
      leftEye,
      rightEye,
      this.mouth,
      antenna,
      antennaTip,
      badge,
      name,
    ]);
    this.container.setScale(definition.scale);
  }

  async moveTo(target: ActorAnchor) {
    this.assertActive();
    const point = this.resolveAnchor(target);
    if (!point) throw new Error(`Unknown actor anchor: ${target.id}`);
    this.container.setPosition(point.x, point.y);
  }

  lookAt(target: ActorTarget) {
    this.assertActive();
    const point = this.resolveAnchor(target);
    if (!point) return;
    const direction = Math.sign(point.x - this.container.x);
    if (direction !== 0) this.container.setScale(Math.abs(this.container.scaleX) * direction, this.container.scaleY);
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

    const expression = {
      neutral: { tint: this.definition.palette.primary, mouthWidth: 14, mouthHeight: 5 },
      warm: { tint: this.definition.palette.primary, mouthWidth: 18, mouthHeight: 7 },
      curious: { tint: this.definition.palette.primary, mouthWidth: 9, mouthHeight: 9 },
      excited: { tint: this.definition.palette.accent, mouthWidth: 18, mouthHeight: 12 },
    }[emotion];

    this.face.setFillStyle(expression.tint, 1);
    this.mouth.setDisplaySize(expression.mouthWidth, expression.mouthHeight);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(true);
  }

  private assertActive() {
    if (this.disposed) throw new Error('Actor has been disposed');
  }
}
