import type {
  ActorAction,
  ActorAnchor,
  ActorCommand,
  ActorEmotion,
  ActorTarget,
  WorldActor,
} from './WorldActor';

export class FakeActor implements WorldActor {
  readonly commands: ActorCommand[] = [];
  currentAnchor?: ActorAnchor;
  lookTarget?: ActorTarget;
  emotion: ActorEmotion = 'neutral';
  lastSpokenText?: string;
  lastAction: ActorAction = 'idle';
  disposed = false;

  async moveTo(target: ActorAnchor) {
    this.assertActive();
    this.currentAnchor = { ...target };
    this.commands.push({ type: 'moveTo', target: { ...target } });
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
    this.disposed = true;
    this.commands.push({ type: 'dispose' });
  }

  private assertActive() {
    if (this.disposed) throw new Error('Actor has been disposed');
  }
}
