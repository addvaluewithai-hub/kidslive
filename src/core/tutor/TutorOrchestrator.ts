import type {
  AssessmentAttemptRecord,
  AssessmentStepRecord,
  ExperienceEvent,
  ExperienceState,
  ExperienceToolParameterValue,
} from '../experience/ExperienceDefinition';
import type {
  TutorActorCue,
  TutorCancellationToken,
  TutorExperienceObservation,
  TutorNarrationIntent,
  TutorOutput,
  TutorOutputHost,
  TutorPersonaConfig,
  TutorProvider,
  TutorRequest,
  TutorTurnDelivery,
  TutorTurnResult,
} from './TutorContract';

export type TutorOrchestrationErrorCode =
  | 'session-completed'
  | 'session-disposed'
  | 'experience-mismatch'
  | 'stale-observation';

export class TutorOrchestrationError extends Error {
  readonly code: TutorOrchestrationErrorCode;

  constructor(code: TutorOrchestrationErrorCode, message: string) {
    super(message);
    this.name = 'TutorOrchestrationError';
    this.code = code;
  }
}

class MutableCancellationToken implements TutorCancellationToken {
  cancelled = false;
  reason: string | null = null;

  cancel(reason: string): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.reason = reason;
  }
}

interface ObservationSource {
  readonly state: ExperienceState;
  readonly currentStep: { readonly id: string; readonly kind: 'instruction' | 'activity' | 'assessment' } | null;
  readonly events: readonly ExperienceEvent[];
}

export interface TutorOrchestratorOptions {
  readonly sessionId: string;
  readonly persona: TutorPersonaConfig;
  readonly provider: TutorProvider;
  readonly host: TutorOutputHost;
}

function freezeAttempt(attempt: AssessmentAttemptRecord): AssessmentAttemptRecord {
  return Object.freeze({ ...attempt, usedHintIds: Object.freeze([...attempt.usedHintIds]) });
}

function freezeAssessment(record: AssessmentStepRecord): AssessmentStepRecord {
  return Object.freeze({
    ...record,
    attempts: Object.freeze(record.attempts.map(freezeAttempt)),
    usedHintIds: Object.freeze([...record.usedHintIds]),
  });
}

function snapshotState(state: ExperienceState): ExperienceState {
  return Object.freeze({
    ...state,
    assessments: Object.freeze(state.assessments.map(freezeAssessment)),
  });
}

function freezeParameters(
  parameters: Readonly<Record<string, ExperienceToolParameterValue>>,
): Readonly<Record<string, ExperienceToolParameterValue>> {
  return Object.freeze({ ...parameters });
}

function snapshotEvent(event: ExperienceEvent): ExperienceEvent {
  if (event.type === 'assessment-submitted') {
    return Object.freeze({ ...event, usedHintIds: Object.freeze([...event.usedHintIds]) });
  }
  if (event.type === 'tool-intent-approved') {
    return Object.freeze({ ...event, parameters: freezeParameters(event.parameters) });
  }
  return Object.freeze({ ...event }) as ExperienceEvent;
}

export function snapshotTutorObservation(source: ObservationSource): TutorExperienceObservation {
  const state = snapshotState(source.state);
  const currentStep = source.currentStep === null
    ? null
    : Object.freeze({ id: source.currentStep.id, kind: source.currentStep.kind });
  const events = Object.freeze(source.events.map(snapshotEvent));

  if (state.currentStepId !== currentStep?.id && !(state.currentStepId === null && currentStep === null)) {
    throw new TutorOrchestrationError(
      'experience-mismatch',
      'Tutor observation current step does not match authoritative experience state.',
    );
  }

  return Object.freeze({ state, currentStep, events });
}

function snapshotPersona(persona: TutorPersonaConfig): TutorPersonaConfig {
  return Object.freeze({
    personaId: persona.personaId,
    toneId: persona.toneId,
    locale: persona.locale,
  });
}

function snapshotNarration(intent: TutorNarrationIntent): TutorNarrationIntent {
  return Object.freeze({ text: intent.text, mode: intent.mode });
}

function snapshotActorCue(cue: TutorActorCue): TutorActorCue {
  return Object.freeze({ ...cue }) as TutorActorCue;
}

function snapshotOutput(output: TutorOutput): TutorOutput {
  return Object.freeze({
    narration: Object.freeze(output.narration.map(snapshotNarration)),
    actorCues: Object.freeze(output.actorCues.map(snapshotActorCue)),
  });
}

function freezeRequest(request: TutorRequest): TutorRequest {
  return Object.freeze({
    ...request,
    persona: snapshotPersona(request.persona),
    observation: request.observation,
  });
}

function freezeDelivery(delivery: TutorTurnDelivery): TutorTurnDelivery {
  return Object.freeze({ ...delivery, output: snapshotOutput(delivery.output) });
}

export class TutorOrchestrator {
  private readonly sessionId: string;
  private readonly persona: TutorPersonaConfig;
  private readonly provider: TutorProvider;
  private readonly host: TutorOutputHost;
  private status: 'active' | 'completed' | 'disposed' = 'active';
  private turnCounter = 0;
  private activeTurn: { readonly turnId: string; readonly token: MutableCancellationToken } | null = null;
  private experienceIdentity: { readonly id: string; readonly version: string } | null = null;
  private lastObservationRevision = -1;

  constructor(options: TutorOrchestratorOptions) {
    this.sessionId = options.sessionId;
    this.persona = snapshotPersona(options.persona);
    this.provider = options.provider;
    this.host = options.host;
  }

  get sessionStatus(): 'active' | 'completed' | 'disposed' {
    return this.status;
  }

  cancelActiveTurn(reason = 'Tutor turn cancelled'): boolean {
    if (this.activeTurn === null) return false;
    this.activeTurn.token.cancel(reason);
    this.activeTurn = null;
    return true;
  }

  dispose(reason = 'Tutor session disposed'): void {
    if (this.status === 'disposed') return;
    this.cancelActiveTurn(reason);
    this.status = 'disposed';
  }

  async runTurn(source: ObservationSource): Promise<TutorTurnResult> {
    this.assertActive();
    const observation = snapshotTutorObservation(source);
    this.assertObservation(observation);

    if (observation.state.status === 'completed') {
      this.cancelActiveTurn('Authoritative experience completed');
      this.status = 'completed';
      throw new TutorOrchestrationError(
        'session-completed',
        'Cannot start a tutor turn after the authoritative experience completed.',
      );
    }

    this.cancelActiveTurn('Tutor turn superseded by a newer turn');
    const turnNumber = ++this.turnCounter;
    const turnId = `${this.sessionId}:turn:${turnNumber}`;
    const requestId = `${turnId}:request:1`;
    const token = new MutableCancellationToken();
    this.activeTurn = { turnId, token };

    const request = freezeRequest({
      sessionId: this.sessionId,
      turnId,
      requestId,
      persona: this.persona,
      observation,
    });

    try {
      const providerOutput = await this.provider.generate(request, token);
      if (!this.isCurrentTurn(turnId, token)) return this.cancelledResult(turnId, token);

      const delivery = freezeDelivery({
        sessionId: this.sessionId,
        turnId,
        requestId,
        output: providerOutput,
      });
      await this.host.publish(delivery);

      if (!this.isCurrentTurn(turnId, token)) return this.cancelledResult(turnId, token);
      this.activeTurn = null;
      return Object.freeze({ status: 'delivered', delivery });
    } catch (error) {
      if (token.cancelled || !this.isCurrentTurn(turnId, token)) {
        return this.cancelledResult(turnId, token);
      }
      this.activeTurn = null;
      throw error;
    }
  }

  private assertActive(): void {
    if (this.status === 'completed') {
      throw new TutorOrchestrationError('session-completed', 'Tutor session has completed.');
    }
    if (this.status === 'disposed') {
      throw new TutorOrchestrationError('session-disposed', 'Tutor session has been disposed.');
    }
  }

  private assertObservation(observation: TutorExperienceObservation): void {
    const identity = {
      id: observation.state.experienceId,
      version: observation.state.experienceVersion,
    };

    if (this.experienceIdentity === null) {
      this.experienceIdentity = identity;
    } else if (
      this.experienceIdentity.id !== identity.id ||
      this.experienceIdentity.version !== identity.version
    ) {
      throw new TutorOrchestrationError(
        'experience-mismatch',
        'Tutor session cannot switch experience identity or authored version.',
      );
    }

    if (observation.state.revision < this.lastObservationRevision) {
      throw new TutorOrchestrationError(
        'stale-observation',
        `Tutor observation revision ${observation.state.revision} is older than ${this.lastObservationRevision}.`,
      );
    }
    this.lastObservationRevision = observation.state.revision;
  }

  private isCurrentTurn(turnId: string, token: MutableCancellationToken): boolean {
    return (
      this.status === 'active' &&
      !token.cancelled &&
      this.activeTurn?.turnId === turnId &&
      this.activeTurn.token === token
    );
  }

  private cancelledResult(turnId: string, token: MutableCancellationToken): TutorTurnResult {
    return Object.freeze({
      status: 'cancelled',
      turnId,
      reason: token.reason ?? 'Tutor turn became stale',
    });
  }
}
