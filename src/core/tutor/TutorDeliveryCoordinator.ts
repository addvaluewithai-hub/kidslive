import {
  isActorOperationCancelled,
  type ActorAction,
  type ActorEmotion,
  type WorldActor,
} from '../actors/WorldActor';
import type {
  TutorCancellationToken,
  TutorNarrationIntent,
  TutorOutputHost,
  TutorTurnDelivery,
} from './TutorContract';

export interface TutorVoiceConfig {
  readonly voiceId: string;
  readonly locale: string;
}

export interface TutorSpeechRequest {
  readonly turnId: string;
  readonly text: string;
  readonly voice: TutorVoiceConfig;
}

export interface TutorSpeechAdapter {
  speak(request: TutorSpeechRequest, cancellation: TutorCancellationToken): Promise<void>;
  interrupt(reason: string): void;
}

export interface TutorTextPresentation {
  readonly turnId: string;
  readonly text: string;
  readonly mode: TutorNarrationIntent['mode'];
}

export interface TutorTextPresenter {
  present(presentation: TutorTextPresentation): void;
  clear(turnId: string): void;
}

class DeliveryCancellationToken implements TutorCancellationToken {
  cancelled = false;
  reason: string | null = null;

  cancel(reason: string): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.reason = reason;
  }
}

export interface TutorDeliveryCoordinatorOptions {
  readonly actor: WorldActor;
  readonly speech: TutorSpeechAdapter;
  readonly text: TutorTextPresenter;
  readonly voice: TutorVoiceConfig;
}

const ACTOR_ACTIONS: Readonly<Record<'idle' | 'acknowledge' | 'celebrate', ActorAction>> = {
  idle: 'idle',
  acknowledge: 'greet',
  celebrate: 'celebrate',
};

const ACTOR_EMOTIONS: Readonly<
  Record<'neutral' | 'encouraging' | 'celebrating' | 'thinking', ActorEmotion>
> = {
  neutral: 'neutral',
  encouraging: 'warm',
  celebrating: 'excited',
  thinking: 'curious',
};

export class TutorDeliveryCoordinator implements TutorOutputHost {
  private readonly actor: WorldActor;
  private readonly speech: TutorSpeechAdapter;
  private readonly text: TutorTextPresenter;
  private readonly voice: TutorVoiceConfig;
  private active: { turnId: string; token: DeliveryCancellationToken } | null = null;

  constructor(options: TutorDeliveryCoordinatorOptions) {
    this.actor = options.actor;
    this.speech = options.speech;
    this.text = options.text;
    this.voice = Object.freeze({ ...options.voice });
  }

  get activeTurnId(): string | null {
    return this.active?.turnId ?? null;
  }

  async publish(delivery: TutorTurnDelivery): Promise<void> {
    if (this.active !== null && this.active.turnId !== delivery.turnId) {
      this.interrupt(this.active.turnId, 'Tutor delivery superseded by a newer turn');
    }

    const token = new DeliveryCancellationToken();
    this.active = { turnId: delivery.turnId, token };

    try {
      for (const cue of delivery.output.actorCues) {
        if (!this.isCurrent(delivery.turnId, token)) return;
        if (cue.type === 'emotion') {
          this.actor.setEmotion(ACTOR_EMOTIONS[cue.emotion]);
        } else if (cue.type === 'action') {
          await this.actor.perform(ACTOR_ACTIONS[cue.action]);
        } else if (cue.type === 'move-to') {
          await this.actor.moveTo({ kind: 'anchor', id: cue.anchorId });
        } else {
          this.actor.lookAt({ kind: 'anchor', id: cue.anchorId });
        }
      }

      for (const narration of delivery.output.narration) {
        if (!this.isCurrent(delivery.turnId, token)) return;
        this.text.present(Object.freeze({
          turnId: delivery.turnId,
          text: narration.text,
          mode: narration.mode,
        }));
        if (narration.mode === 'speak-and-display') {
          await this.speech.speak(
            Object.freeze({ turnId: delivery.turnId, text: narration.text, voice: this.voice }),
            token,
          );
        }
      }
    } catch (error) {
      if (token.cancelled || isActorOperationCancelled(error)) return;
      throw error;
    } finally {
      if (this.active?.turnId === delivery.turnId && this.active.token === token) {
        this.active = null;
      }
    }
  }

  interrupt(turnId: string, reason: string): void {
    const active = this.active;
    if (active === null || active.turnId !== turnId) return;
    active.token.cancel(reason);
    this.active = null;

    try {
      this.speech.interrupt(reason);
    } catch {
      // Interruption is best-effort; one adapter cannot prevent remaining cleanup.
    }
    try {
      this.actor.interrupt(reason);
    } catch {
      // Continue cleanup even if a renderer adapter misbehaves.
    }
    try {
      this.text.clear(turnId);
    } catch {
      // Presentation cleanup failure must not revive or retain the cancelled turn.
    }
  }

  private isCurrent(turnId: string, token: DeliveryCancellationToken): boolean {
    return !token.cancelled && this.active?.turnId === turnId && this.active.token === token;
  }
}
