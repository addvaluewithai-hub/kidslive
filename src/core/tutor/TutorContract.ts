import type {
  ExperienceEvent,
  ExperienceState,
  ExperienceStep,
  ExperienceToolParameterValue,
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
  | { readonly type: 'action'; readonly action: 'idle' | 'acknowledge' | 'celebrate' }
  | { readonly type: 'move-to'; readonly anchorId: string }
  | { readonly type: 'look-at'; readonly anchorId: string };

interface TutorAuthorityProposalBase {
  readonly stepId: string;
  readonly expectedRevision: number;
}

export type TutorAuthorityProposal =
  | (TutorAuthorityProposalBase & {
      readonly type: 'submit-outcome';
      readonly outcomeId: string;
    })
  | (TutorAuthorityProposalBase & {
      readonly type: 'submit-assessment';
      readonly answer: string;
    })
  | (TutorAuthorityProposalBase & {
      readonly type: 'use-hint';
      readonly hintId: string;
    })
  | (TutorAuthorityProposalBase & {
      readonly type: 'request-tool';
      readonly toolId: string;
      readonly parameters: Readonly<Record<string, ExperienceToolParameterValue>>;
    });

export interface TutorOutput {
  readonly narration: readonly TutorNarrationIntent[];
  readonly actorCues: readonly TutorActorCue[];
  readonly authorityProposal?: TutorAuthorityProposal;
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
  interrupt(turnId: TutorTurnId, reason: string): void;
}

export type TutorTurnResult =
  | { readonly status: 'delivered'; readonly delivery: TutorTurnDelivery }
  | { readonly status: 'cancelled'; readonly turnId: TutorTurnId; readonly reason: string };
