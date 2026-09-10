export type ActorAnchor = {
  kind: 'anchor';
  id: string;
};

export type ActorTarget = ActorAnchor;

export type ActorEmotion = 'neutral' | 'warm' | 'curious' | 'excited';

export type ActorAction = 'idle' | 'greet' | 'explain' | 'celebrate' | 'think';

export class ActorOperationCancelledError extends Error {
  constructor(message = 'Actor operation was cancelled') {
    super(message);
    this.name = 'ActorOperationCancelledError';
  }
}

export const isActorOperationCancelled = (error: unknown): error is ActorOperationCancelledError =>
  error instanceof ActorOperationCancelledError;

export interface WorldActor {
  /**
   * Move to a semantic world anchor. Starting a newer movement cancels and rejects
   * the previous unfinished movement with ActorOperationCancelledError.
   */
  moveTo(target: ActorAnchor): Promise<void>;
  lookAt(target: ActorTarget): void;
  speak(text: string): Promise<void>;
  perform(action: ActorAction): Promise<void>;
  setEmotion(emotion: ActorEmotion): void;
  dispose(): void;
}

export type ActorCommand =
  | { type: 'moveTo'; target: ActorAnchor }
  | { type: 'lookAt'; target: ActorTarget }
  | { type: 'speak'; text: string }
  | { type: 'perform'; action: ActorAction }
  | { type: 'setEmotion'; emotion: ActorEmotion }
  | { type: 'dispose' };
