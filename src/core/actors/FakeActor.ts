import {
  ActorOperationCancelledError,
  type ActorAction,
  type ActorAnchor,
  type ActorCommand,
  type ActorEmotion,
  type ActorTarget,
  type WorldActor,
} from './WorldActor';

type PendingOperation<T> = {
  value: T;
  resolve: () => void;
  reject: (error: Error) => void;
};

type FakeActorOptions = {
  manualMovement?: boolean;
  manualActions?: boolean;
  manualSpeech?: boolean;
};

export class FakeActor implements WorldActor {
  readonly commands: ActorCommand[] = [];
  currentAnchor?: ActorAnchor;
  lookTarget?: ActorTarget;
  emotion: ActorEmotion = 'neutral';
  lastSpokenText?: string;
  lastAction: ActorAction = 'idle';
  disposed = false;
  private pendingMovement?: PendingOperation<ActorAnchor>;
  private pendingAction?: PendingOperation<ActorAction>;
  private pendingSpeech?: PendingOperation<string>;

  constructor(private readonly options: FakeActorOptions = {}) {}

  moveTo(target: ActorAnchor): Promise<void> {
    this.assertActive();
    this.commands.push({ type: 'moveTo', target: { ...target } });
    this.cancelMovement('Actor movement superseded by a newer moveTo request');

    if (!this.options.manualMovement) {
      this.currentAnchor = { ...target };
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.pendingMovement = { value: { ...target }, resolve, reject };
    });
  }

  completeMovement() {
    this.assertActive();
    const operation = this.pendingMovement;
    if (!operation) return false;
    this.pendingMovement = undefined;
    this.currentAnchor = { ...operation.value };
    operation.resolve();
    return true;
  }

  lookAt(target: ActorTarget) {
    this.assertActive();
    this.lookTarget = { ...target };
    this.commands.push({ type: 'lookAt', target: { ...target } });
  }

  speak(text: string): Promise<void> {
    this.assertActive();
    this.commands.push({ type: 'speak', text });
    this.cancelSpeech('Actor speech superseded by a newer speak request');

    if (!this.options.manualSpeech) {
      this.lastSpokenText = text;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.pendingSpeech = { value: text, resolve, reject };
    });
  }

  completeSpeech() {
    this.assertActive();
    const operation = this.pendingSpeech;
    if (!operation) return false;
    this.pendingSpeech = undefined;
    this.lastSpokenText = operation.value;
    operation.resolve();
    return true;
  }

  perform(action: ActorAction): Promise<void> {
    this.assertActive();
    this.commands.push({ type: 'perform', action });
    this.cancelAction('Actor action superseded by a newer perform request');

    if (!this.options.manualActions) {
      this.lastAction = action;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.pendingAction = { value: action, resolve, reject };
    });
  }

  completeAction() {
    this.assertActive();
    const operation = this.pendingAction;
    if (!operation) return false;
    this.pendingAction = undefined;
    this.lastAction = operation.value;
    operation.resolve();
    return true;
  }

  setEmotion(emotion: ActorEmotion) {
    this.assertActive();
    this.emotion = emotion;
    this.commands.push({ type: 'setEmotion', emotion });
  }

  interrupt(reason = 'Actor operations interrupted') {
    this.assertActive();
    this.cancelAll(reason);
    this.commands.push({ type: 'interrupt', reason });
  }

  dispose() {
    if (this.disposed) return;
    this.cancelAll('Actor disposed during operation');
    this.disposed = true;
    this.commands.push({ type: 'dispose' });
  }

  private cancelAll(reason: string) {
    this.cancelMovement(reason);
    this.cancelAction(reason);
    this.cancelSpeech(reason);
  }

  private cancelMovement(reason: string) {
    const operation = this.pendingMovement;
    if (!operation) return;
    this.pendingMovement = undefined;
    operation.reject(new ActorOperationCancelledError(reason));
  }

  private cancelAction(reason: string) {
    const operation = this.pendingAction;
    if (!operation) return;
    this.pendingAction = undefined;
    operation.reject(new ActorOperationCancelledError(reason));
  }

  private cancelSpeech(reason: string) {
    const operation = this.pendingSpeech;
    if (!operation) return;
    this.pendingSpeech = undefined;
    operation.reject(new ActorOperationCancelledError(reason));
  }

  private assertActive() {
    if (this.disposed) throw new Error('Actor has been disposed');
  }
}
