import {
  ActorOperationCancelledError,
  type ActorAction,
  type ActorAnchor,
  type ActorCommand,
  type ActorEmotion,
  type ActorTarget,
  type WorldActor,
} from './WorldActor';

type PendingMovement = {
  target: ActorAnchor;
  resolve: () => void;
  reject: (error: Error) => void;
};

export class FakeActor implements WorldActor {
  readonly commands: ActorCommand[] = [];
  currentAnchor?: ActorAnchor;
  lookTarget?: ActorTarget;
  emotion: ActorEmotion = 'neutral';
  lastSpokenText?: string;
  lastAction: ActorAction = 'idle';
  disposed = false;
  private pendingMovement?: PendingMovement;

  constructor(private readonly options: { manualMovement?: boolean } = {}) {}

  moveTo(target: ActorAnchor): Promise<void> {
    this.assertActive();
    this.commands.push({ type: 'moveTo', target: { ...target } });
    this.cancelPendingMovement('Actor movement superseded by a newer moveTo request');

    if (!this.options.manualMovement) {
      this.currentAnchor = { ...target };
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.pendingMovement = { target: { ...target }, resolve, reject };
    });
  }

  completeMovement() {
    this.assertActive();
    const movement = this.pendingMovement;
    if (!movement) return false;
    this.pendingMovement = undefined;
    this.currentAnchor = { ...movement.target };
    movement.resolve();
    return true;
  }

  lookAt(target: ActorTarget) {
    this.assertActive();
    this.lookTarget = { ...target };
    this.commands.push({ type: 'lookAt', target: { ...target } });
  }

  async speak(text: string) {
    this.assertActive();
    this.lastSpokenText = text;
    this.commands.push({ type: 'speak', text });
  }

  async perform(action: ActorAction) {
    this.assertActive();
    this.lastAction = action;
    this.commands.push({ type: 'perform', action });
  }

  setEmotion(emotion: ActorEmotion) {
    this.assertActive();
    this.emotion = emotion;
    this.commands.push({ type: 'setEmotion', emotion });
  }

  dispose() {
    if (this.disposed) return;
    this.cancelPendingMovement('Actor disposed during movement');
    this.disposed = true;
    this.commands.push({ type: 'dispose' });
  }

  private cancelPendingMovement(reason: string) {
    const movement = this.pendingMovement;
    if (!movement) return;
    this.pendingMovement = undefined;
    movement.reject(new ActorOperationCancelledError(reason));
  }

  private assertActive() {
    if (this.disposed) throw new Error('Actor has been disposed');
  }
}
