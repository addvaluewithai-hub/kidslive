import type {
  AssessmentAttemptRecord,
  AssessmentStepRecord,
  ExperienceEvent,
  ExperienceState,
  ExperienceToolParameterValue,
} from '../experience/ExperienceDefinition';
import { TutorAuthorityBridgeError } from './TutorAuthorityBridge';
import type {
  TutorActorCue,
  TutorAuthorityProposal,
  TutorCancellationToken,
  TutorDiagnosticsSink,
  TutorExperienceObservation,
  TutorFailureCode,
  TutorFailurePhase,
  TutorLifecycleEvent,
  TutorNarrationIntent,
  TutorOutput,
  TutorOutputHost,
  TutorPersonaConfig,
  TutorProvider,
  TutorRequest,
  TutorTimeoutScheduler,
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
  readonly diagnostics?: TutorDiagnosticsSink;
  readonly providerTimeout?: {
    readonly delayMs: number;
    readonly scheduler: TutorTimeoutScheduler;
  };
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

function snapshotAuthorityProposal(proposal: TutorAuthorityProposal): TutorAuthorityProposal {
  if (proposal.type === 'request-tool') {
    return Object.freeze({ ...proposal, parameters: freezeParameters(proposal.parameters) });
  }
  return Object.freeze({ ...proposal });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFinitePrimitive(value: unknown): value is ExperienceToolParameterValue {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function isValidNarration(value: unknown): value is TutorNarrationIntent {
  return (
    isRecord(value) &&
    typeof value.text === 'string' &&
    (value.mode === 'speak-and-display' || value.mode === 'display-only')
  );
}

function isValidActorCue(value: unknown): value is TutorActorCue {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'emotion') {
    return ['neutral', 'encouraging', 'celebrating', 'thinking'].includes(String(value.emotion));
  }
  if (value.type === 'action') {
    return ['idle', 'acknowledge', 'celebrate'].includes(String(value.action));
  }
  if (value.type === 'move-to' || value.type === 'look-at') {
    return typeof value.anchorId === 'string';
  }
  return false;
}

function hasAuthorityBase(value: Record<string, unknown>): boolean {
  return typeof value.stepId === 'string' && Number.isInteger(value.expectedRevision) && Number(value.expectedRevision) >= 0;
}

function isValidAuthorityProposal(value: unknown): value is TutorAuthorityProposal {
  if (!isRecord(value) || !hasAuthorityBase(value) || typeof value.type !== 'string') return false;
  if (value.type === 'submit-outcome') return typeof value.outcomeId === 'string';
  if (value.type === 'submit-assessment') return typeof value.answer === 'string';
  if (value.type === 'use-hint') return typeof value.hintId === 'string';
  if (value.type !== 'request-tool' || typeof value.toolId !== 'string' || !isRecord(value.parameters)) return false;
  return Object.values(value.parameters).every(isFinitePrimitive);
}

function isValidOutput(value: unknown): value is TutorOutput {
  if (!isRecord(value) || !Array.isArray(value.narration) || !Array.isArray(value.actorCues)) return false;
  if (!value.narration.every(isValidNarration) || !value.actorCues.every(isValidActorCue)) return false;
  return value.authorityProposal === undefined || isValidAuthorityProposal(value.authorityProposal);
}

function snapshotOutput(output: TutorOutput): TutorOutput {
  const authorityProposal = output.authorityProposal;
  return Object.freeze({
    narration: Object.freeze(output.narration.map(snapshotNarration)),
    actorCues: Object.freeze(output.actorCues.map(snapshotActorCue)),
    ...(authorityProposal === undefined
      ? {}
      : { authorityProposal: snapshotAuthorityProposal(authorityProposal) }),
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
  private readonly diagnostics: TutorDiagnosticsSink | undefined;
  private readonly providerTimeout: TutorOrchestratorOptions['providerTimeout'];
  private status: 'active' | 'completed' | 'disposed' = 'active';
  private turnCounter = 0;
  private activeTurn: { readonly turnId: string; readonly requestId: string; readonly token: MutableCancellationToken } | null = null;
  private experienceIdentity: { readonly id: string; readonly version: string } | null = null;
  private lastObservationRevision = -1;

  constructor(options: TutorOrchestratorOptions) {
    this.sessionId = options.sessionId;
    this.persona = snapshotPersona(options.persona);
    this.provider = options.provider;
    this.host = options.host;
    this.diagnostics = options.diagnostics;
    this.providerTimeout = options.providerTimeout;
    if (this.providerTimeout !== undefined && (!Number.isFinite(this.providerTimeout.delayMs) || this.providerTimeout.delayMs <= 0)) {
      throw new Error('Tutor provider timeout must be a positive finite number.');
    }
  }

  get sessionStatus(): 'active' | 'completed' | 'disposed' {
    return this.status;
  }

  cancelActiveTurn(reason = 'Tutor turn cancelled'): boolean {
    if (this.activeTurn === null) return false;
    const { turnId, requestId, token } = this.activeTurn;
    token.cancel(reason);
    this.activeTurn = null;
    try {
      this.host.interrupt(turnId, reason);
    } catch {
      // Host interruption is best-effort; cancellation authority remains local.
    }
    this.record({ type: 'turn-cancelled', sessionId: this.sessionId, turnId, requestId });
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
    this.activeTurn = { turnId, requestId, token };

    const request = freezeRequest({
      sessionId: this.sessionId,
      turnId,
      requestId,
      persona: this.persona,
      observation,
    });
    this.record({ type: 'turn-started', sessionId: this.sessionId, turnId, requestId });

    const providerResult = await this.generateProviderOutput(request, token);
    if (providerResult.kind === 'cancelled') return this.cancelledResult(turnId, token);
    if (providerResult.kind === 'failed') {
      return this.failedResult(turnId, requestId, 'provider', providerResult.code);
    }
    if (!this.isCurrentTurn(turnId, token)) return this.cancelledResult(turnId, token);
    this.record({ type: 'provider-completed', sessionId: this.sessionId, turnId, requestId });

    if (!isValidOutput(providerResult.output)) {
      return this.failedResult(turnId, requestId, 'provider-output', 'malformed-output');
    }

    const delivery = freezeDelivery({
      sessionId: this.sessionId,
      turnId,
      requestId,
      output: providerResult.output,
    });

    try {
      await this.host.publish(delivery);
    } catch (error) {
      if (error instanceof TutorAuthorityBridgeError) throw error;
      if (token.cancelled || !this.isCurrentTurn(turnId, token)) {
        return this.cancelledResult(turnId, token);
      }
      return this.failedResult(turnId, requestId, 'delivery', 'delivery-failed');
    }

    if (!this.isCurrentTurn(turnId, token)) return this.cancelledResult(turnId, token);
    this.activeTurn = null;
    this.record({ type: 'turn-delivered', sessionId: this.sessionId, turnId, requestId });
    return Object.freeze({ status: 'delivered', delivery });
  }

  private async generateProviderOutput(
    request: TutorRequest,
    token: MutableCancellationToken,
  ): Promise<
    | { readonly kind: 'output'; readonly output: TutorOutput }
    | { readonly kind: 'failed'; readonly code: 'provider-failed' | 'provider-timeout' }
    | { readonly kind: 'cancelled' }
  > {
    let generated: Promise<TutorOutput>;
    try {
      generated = this.provider.generate(request, token);
    } catch {
      return { kind: token.cancelled ? 'cancelled' : 'failed', code: 'provider-failed' };
    }

    const providerPromise = generated.then(
      (output) => ({ kind: 'output' as const, output }),
      () => ({ kind: token.cancelled ? 'cancelled' as const : 'failed' as const, code: 'provider-failed' as const }),
    );

    const providerTimeout = this.providerTimeout;
    if (providerTimeout === undefined) return providerPromise;

    let resolveTimeout: ((result: { readonly kind: 'failed'; readonly code: 'provider-timeout' }) => void) | undefined;
    const timeoutPromise = new Promise<{ readonly kind: 'failed'; readonly code: 'provider-timeout' }>((resolve) => {
      resolveTimeout = resolve;
    });
    const timeoutHandle = providerTimeout.scheduler.schedule(providerTimeout.delayMs, () => {
      token.cancel('Tutor provider timed out');
      resolveTimeout?.({ kind: 'failed', code: 'provider-timeout' });
    });

    const result = await Promise.race([providerPromise, timeoutPromise]);
    timeoutHandle.cancel();
    return result;
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
    if (this.activeTurn?.turnId === turnId) this.activeTurn = null;
    return Object.freeze({
      status: 'cancelled',
      turnId,
      reason: token.reason ?? 'Tutor turn became stale',
    });
  }

  private failedResult(
    turnId: string,
    requestId: string,
    phase: TutorFailurePhase,
    code: TutorFailureCode,
  ): TutorTurnResult {
    if (this.activeTurn?.turnId === turnId) this.activeTurn = null;
    this.record({ type: 'turn-failed', sessionId: this.sessionId, turnId, requestId, phase, code });
    return Object.freeze({ status: 'failed', turnId, requestId, phase, code, recoverable: true });
  }

  private record(event: TutorLifecycleEvent): void {
    try {
      this.diagnostics?.record(Object.freeze({ ...event }));
    } catch {
      // Diagnostics are intentionally best-effort and can never break tutor delivery.
    }
  }
}
