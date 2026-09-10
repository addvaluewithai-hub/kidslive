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
   * Long-running actor commands use independent channels. A newer command on the
   * same channel cancels and rejects the previous unfinished command with
   * ActorOperationCancelledError. Different channels may overlap deliberately;
   * callers that need strict ordering should await each command before starting
   * the next one.
   */
  moveTo(target: ActorAnchor): Promise<void>;
  lookAt(target: ActorTarget): void;
  speak(text: string): Promise<void>;
  perform(action: ActorAction): Promise<void>;
  setEmotion(emotion: ActorEmotion): void;
  /** Cancel all unfinished move / perform / speak operations without disposing the actor. */
  interrupt(reason?: string): void;
  /** Cancel all unfinished operations and permanently release actor resources. */
  dispose(): void;
}

export type ActorCommand =
  | { type: 'moveTo'; target: ActorAnchor }
  | { type: 'lookAt'; target: ActorTarget }
  | { type: 'speak'; text: string }
  | { type: 'perform'; action: ActorAction }
  | { type: 'setEmotion'; emotion: ActorEmotion }
  | { type: 'interrupt'; reason?: string }
  | { type: 'dispose' };
