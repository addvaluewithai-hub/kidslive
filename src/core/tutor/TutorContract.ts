import type {
  ExperienceEvent,
  ExperienceState,
  ExperienceStep,
} from '../experience/ExperienceDefinition';

export type TutorSessionId = string;
export type TutorTurnId = string;
export type TutorRequestId = string;

export interface TutorPersonaConfig {
  readonly personaId: string;
  readonly toneId: string;
  readonly locale: string;
}

export interface TutorObservedStep {
  readonly id: string;
  readonly kind: ExperienceStep['kind'];
}

export interface TutorExperienceObservation {
  readonly state: ExperienceState;
  readonly currentStep: TutorObservedStep | null;
  readonly events: readonly ExperienceEvent[];
}

export interface TutorCancellationToken {
  readonly cancelled: boolean;
  readonly reason: string | null;
}

export interface TutorRequest {
  readonly sessionId: TutorSessionId;
  readonly turnId: TutorTurnId;
  readonly requestId: TutorRequestId;
  readonly persona: TutorPersonaConfig;
  readonly observation: TutorExperienceObservation;
}

export type TutorNarrationMode = 'speak-and-display' | 'display-only';

export interface TutorNarrationIntent {
  readonly text: string;
  readonly mode: TutorNarrationMode;
}

export type TutorActorCue =
  | { readonly type: 'emotion'; readonly emotion: 'neutral' | 'encouraging' | 'celebrating' | 'thinking' }
  | { readonly type: 'action'; readonly action: 'idle' | 'acknowledge' | 'celebrate' };

export interface TutorOutput {
  readonly narration: readonly TutorNarrationIntent[];
  readonly actorCues: readonly TutorActorCue[];
}

export interface TutorProvider {
  generate(request: TutorRequest, cancellation: TutorCancellationToken): Promise<TutorOutput>;
}

export interface TutorTurnDelivery {
  readonly sessionId: TutorSessionId;
  readonly turnId: TutorTurnId;
  readonly requestId: TutorRequestId;
  readonly output: TutorOutput;
}

export interface TutorOutputHost {
  publish(delivery: TutorTurnDelivery): void | Promise<void>;
}

export type TutorTurnResult =
  | { readonly status: 'delivered'; readonly delivery: TutorTurnDelivery }
  | { readonly status: 'cancelled'; readonly turnId: TutorTurnId; readonly reason: string };
