import type {
  AssessmentAttemptRecord,
  AssessmentExperienceStep,
  AssessmentHintId,
  AssessmentStepRecord,
  ExperienceCommand,
  ExperienceDefinition,
  ExperienceEvent,
  ExperienceOutcomeId,
  ExperienceState,
  ExperienceStep,
  ExperienceStepId,
  ExperienceToolDeclaration,
  ExperienceToolIntent,
  ExperienceToolParameterValue,
  ExperienceToolRequest,
} from './ExperienceDefinition';
import {
  EXPERIENCE_CHECKPOINT_FORMAT_VERSION,
  parseExperienceCheckpoint,
  type ExperienceCheckpoint,
} from './ExperienceCheckpoint';
import { assertValidExperience } from './validateExperience';

export type ExperienceCommandErrorCode =
  | 'experience-completed'
  | 'unknown-outcome'
  | 'missing-current-step'
  | 'invalid-command-for-step'
  | 'invalid-assessment-submission'
  | 'unknown-hint'
  | 'hint-not-available'
  | 'hint-already-used'
  | 'unknown-tool'
  | 'tool-not-allowed'
  | 'stale-tool-request'
  | 'invalid-tool-parameters';

export class ExperienceCommandError extends Error {
  readonly code: ExperienceCommandErrorCode;

  constructor(code: ExperienceCommandErrorCode, message: string) {
    super(message);
    this.name = 'ExperienceCommandError';
    this.code = code;
  }
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

function freezeState(state: ExperienceState): ExperienceState {
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

function freezeEvent(event: ExperienceEvent): ExperienceEvent {
  if (event.type === 'assessment-submitted') {
    return Object.freeze({ ...event, usedHintIds: Object.freeze([...event.usedHintIds]) });
  }
  if (event.type === 'tool-intent-approved') {
    return Object.freeze({ ...event, parameters: freezeParameters(event.parameters) });
  }
  return Object.freeze({ ...event }) as ExperienceEvent;
}

function normalizeAnswer(answer: string, step: AssessmentExperienceStep): string {
  switch (step.assessment.normalization) {
    case 'exact':
      return answer;
    case 'trim-casefold':
      return answer.trim().toLocaleLowerCase('en-US');
  }
}

function getAssessmentRecord(state: ExperienceState, stepId: ExperienceStepId): AssessmentStepRecord {
  return (
    state.assessments.find((record) => record.stepId === stepId) ?? {
      stepId,
      attempts: [],
      usedHintIds: [],
      result: null,
    }
  );
}

function replaceAssessmentRecord(
  state: ExperienceState,
  nextRecord: AssessmentStepRecord,
): readonly AssessmentStepRecord[] {
  const withoutStep = state.assessments.filter((record) => record.stepId !== nextRecord.stepId);
  return [...withoutStep, nextRecord];
}

function initialState(definition: ExperienceDefinition): ExperienceState {
  return freezeState({
    experienceId: definition.id,
    experienceVersion: definition.version,
    status: 'running',
    currentStepId: definition.initialStepId,
    assessments: [],
    revision: 0,
  });
}

function initialEvent(definition: ExperienceDefinition): ExperienceEvent {
  return freezeEvent({
    type: 'experience-started',
    experienceId: definition.id,
    experienceVersion: definition.version,
    stepId: definition.initialStepId,
    revision: 0,
  });
}

function validateToolParameters(
  tool: ExperienceToolDeclaration,
  parameters: Readonly<Record<string, ExperienceToolParameterValue>>,
): void {
  const declared = new Map(tool.parameters.map((parameter) => [parameter.id, parameter]));
  for (const key of Object.keys(parameters)) {
    const declaration = declared.get(key);
    if (declaration === undefined) {
      throw new ExperienceCommandError(
        'invalid-tool-parameters',
        `Tool "${tool.id}" does not declare parameter "${key}".`,
      );
    }
    if (typeof parameters[key] !== declaration.type) {
      throw new ExperienceCommandError(
        'invalid-tool-parameters',
        `Tool "${tool.id}" parameter "${key}" must be a ${declaration.type}.`,
      );
    }
  }

  for (const declaration of tool.parameters) {
    if (declaration.required && !(declaration.id in parameters)) {
      throw new ExperienceCommandError(
        'invalid-tool-parameters',
        `Tool "${tool.id}" requires parameter "${declaration.id}".`,
      );
    }
  }
}

export class ExperienceEngine {
  private readonly definition: ExperienceDefinition;
  private readonly stepById: ReadonlyMap<ExperienceStepId, ExperienceStep>;
  private readonly toolById: ReadonlyMap<string, ExperienceToolDeclaration>;
  private currentState: ExperienceState;
  private readonly eventLog: ExperienceEvent[];

  private constructor(
    definition: ExperienceDefinition,
    restoredState?: ExperienceState,
    restoredEvents?: readonly ExperienceEvent[],
  ) {
    this.definition = definition;
    this.stepById = new Map(definition.steps.map((step) => [step.id, step]));
    this.toolById = new Map((definition.tools ?? []).map((tool) => [tool.id, tool]));
    this.currentState = restoredState === undefined ? initialState(definition) : freezeState(restoredState);
    this.eventLog = restoredEvents === undefined
      ? [initialEvent(definition)]
      : restoredEvents.map(freezeEvent);
  }

  static start(definition: ExperienceDefinition): ExperienceEngine {
    assertValidExperience(definition);
    return new ExperienceEngine(definition);
  }

  static resume(definition: ExperienceDefinition, checkpointValue: unknown): ExperienceEngine {
    assertValidExperience(definition);
    const checkpoint = parseExperienceCheckpoint(definition, checkpointValue);
    return new ExperienceEngine(definition, checkpoint.state, checkpoint.events);
  }

  get state(): ExperienceState {
    return freezeState(this.currentState);
  }

  get events(): readonly ExperienceEvent[] {
    return Object.freeze(this.eventLog.map(freezeEvent));
  }

  get currentStep(): ExperienceStep | null {
    const stepId = this.currentState.currentStepId;
    if (stepId === null) return null;
    return this.stepById.get(stepId) ?? null;
  }

  checkpoint(): ExperienceCheckpoint {
    return Object.freeze({
      formatVersion: EXPERIENCE_CHECKPOINT_FORMAT_VERSION,
      experienceId: this.definition.id,
      experienceVersion: this.definition.version,
      state: this.state,
      events: this.events,
    });
  }

  restart(): ExperienceState {
    this.currentState = initialState(this.definition);
    this.eventLog.splice(0, this.eventLog.length, initialEvent(this.definition));
    return this.state;
  }

  dispatch(command: ExperienceCommand): ExperienceState {
    switch (command.type) {
      case 'submit-outcome':
        return this.submitOutcome(command.outcomeId);
      case 'submit-assessment':
        return this.submitAssessment(command.answer);
      case 'use-hint':
        return this.useHint(command.hintId);
    }
  }

  requestTool(request: ExperienceToolRequest): ExperienceToolIntent {
    const step = this.requireCurrentStep();
    if (request.stepId !== step.id || request.expectedRevision !== this.currentState.revision) {
      throw new ExperienceCommandError(
        'stale-tool-request',
        `Tool request for step "${request.stepId}" revision ${request.expectedRevision} is stale; active authority is step "${step.id}" revision ${this.currentState.revision}.`,
      );
    }

    const tool = this.toolById.get(request.toolId);
    if (tool === undefined) {
      throw new ExperienceCommandError(
        'unknown-tool',
        `Experience "${this.definition.id}" does not declare tool "${request.toolId}".`,
      );
    }
    if (!(step.allowedToolIds ?? []).includes(tool.id)) {
      throw new ExperienceCommandError(
        'tool-not-allowed',
        `Step "${step.id}" does not allow tool "${tool.id}".`,
      );
    }

    validateToolParameters(tool, request.parameters);
    const revision = this.currentState.revision + 1;
    const parameters = freezeParameters(request.parameters);
    const intent: ExperienceToolIntent = Object.freeze({
      toolId: tool.id,
      kind: tool.kind,
      stepId: step.id,
      parameters,
      revision,
    });

    this.currentState = freezeState({ ...this.currentState, revision });
    this.eventLog.push(
      freezeEvent({
        type: 'tool-intent-approved',
        toolId: tool.id,
        kind: tool.kind,
        stepId: step.id,
        parameters,
        revision,
      }),
    );
    return intent;
  }

  submitOutcome(outcomeId: ExperienceOutcomeId): ExperienceState {
    const step = this.requireCurrentStep();
    if (step.kind === 'assessment') {
      throw new ExperienceCommandError(
        'invalid-command-for-step',
        `Assessment step "${step.id}" requires submit-assessment; authored outcomes cannot bypass evaluation.`,
      );
    }

    const transition = step.transitions.find((candidate) => candidate.on === outcomeId);
    if (transition === undefined) {
      throw new ExperienceCommandError(
        'unknown-outcome',
        `Step "${step.id}" does not allow outcome "${outcomeId}".`,
      );
    }

    const revision = this.currentState.revision + 1;
    this.eventLog.push(freezeEvent({ type: 'outcome-submitted', stepId: step.id, outcomeId, revision }));
    return this.applyTransition(step.id, outcomeId, revision);
  }

  submitAssessment(answer: string): ExperienceState {
    const step = this.requireAssessmentStep();
    if (answer.trim().length === 0) {
      throw new ExperienceCommandError(
        'invalid-assessment-submission',
        `Assessment step "${step.id}" does not accept an empty answer.`,
      );
    }

    const record = getAssessmentRecord(this.currentState, step.id);
    if (record.result === 'correct' || record.result === 'exhausted') {
      throw new ExperienceCommandError(
        'invalid-assessment-submission',
        `Assessment step "${step.id}" is already resolved as "${record.result}".`,
      );
    }

    const normalizedAnswer = normalizeAnswer(answer, step);
    const normalizedAcceptedAnswers = step.assessment.acceptedAnswers.map((candidate) =>
      normalizeAnswer(candidate, step),
    );
    const correct = normalizedAcceptedAnswers.includes(normalizedAnswer);
    const attempt = record.attempts.length + 1;
    const exhausted = !correct && attempt >= step.assessment.maxAttempts;
    const result = correct ? 'correct' : exhausted ? 'exhausted' : 'retrying';
    const revision = this.currentState.revision + 1;
    const attemptRecord: AssessmentAttemptRecord = {
      attempt,
      answer,
      normalizedAnswer,
      correct,
      usedHintIds: record.usedHintIds,
    };
    const nextRecord: AssessmentStepRecord = {
      ...record,
      attempts: [...record.attempts, attemptRecord],
      result,
    };

    this.currentState = freezeState({
      ...this.currentState,
      assessments: replaceAssessmentRecord(this.currentState, nextRecord),
      revision,
    });
    this.eventLog.push(
      freezeEvent({
        type: 'assessment-submitted',
        stepId: step.id,
        attempt,
        normalizedAnswer,
        correct,
        result,
        usedHintIds: record.usedHintIds,
        revision,
      }),
    );

    if (result === 'retrying') return this.state;
    const outcomeId = correct ? step.assessment.correctOutcomeId : step.assessment.exhaustedOutcomeId;
    return this.applyTransition(step.id, outcomeId, revision);
  }

  useHint(hintId: AssessmentHintId): ExperienceState {
    const step = this.requireAssessmentStep();
    const record = getAssessmentRecord(this.currentState, step.id);
    if (record.result === 'correct' || record.result === 'exhausted') {
      throw new ExperienceCommandError('hint-not-available', `Assessment step "${step.id}" is already resolved.`);
    }

    const hint = step.assessment.hints.find((candidate) => candidate.id === hintId);
    if (hint === undefined) {
      throw new ExperienceCommandError('unknown-hint', `Assessment step "${step.id}" does not declare hint "${hintId}".`);
    }
    if (record.usedHintIds.includes(hintId)) {
      throw new ExperienceCommandError('hint-already-used', `Hint "${hintId}" has already been used on assessment step "${step.id}".`);
    }
    if (record.attempts.length < hint.availableAfterAttempt) {
      throw new ExperienceCommandError('hint-not-available', `Hint "${hintId}" requires ${hint.availableAfterAttempt} completed attempt(s).`);
    }

    const revision = this.currentState.revision + 1;
    const nextRecord: AssessmentStepRecord = { ...record, usedHintIds: [...record.usedHintIds, hintId] };
    this.currentState = freezeState({
      ...this.currentState,
      assessments: replaceAssessmentRecord(this.currentState, nextRecord),
      revision,
    });
    this.eventLog.push(freezeEvent({ type: 'hint-used', stepId: step.id, hintId, revision }));
    return this.state;
  }

  private requireCurrentStep(): ExperienceStep {
    if (this.currentState.status === 'completed') {
      throw new ExperienceCommandError('experience-completed', `Experience "${this.definition.id}" is already complete.`);
    }

    const stepId = this.currentState.currentStepId;
    if (stepId === null) {
      throw new ExperienceCommandError('missing-current-step', 'Running experience has no current step.');
    }

    const step = this.stepById.get(stepId);
    if (step === undefined) {
      throw new ExperienceCommandError('missing-current-step', `Current step "${stepId}" does not exist in the validated definition.`);
    }
    return step;
  }

  private requireAssessmentStep(): AssessmentExperienceStep {
    const step = this.requireCurrentStep();
    if (step.kind !== 'assessment') {
      throw new ExperienceCommandError('invalid-command-for-step', `Step "${step.id}" is not an assessment step.`);
    }
    return step;
  }

  private applyTransition(
    fromStepId: ExperienceStepId,
    outcomeId: ExperienceOutcomeId,
    revision: number,
  ): ExperienceState {
    const step = this.stepById.get(fromStepId);
    const transition = step?.transitions.find((candidate) => candidate.on === outcomeId);
    if (transition === undefined) {
      throw new ExperienceCommandError('unknown-outcome', `Step "${fromStepId}" does not allow outcome "${outcomeId}".`);
    }

    if (transition.to === 'complete') {
      this.currentState = freezeState({ ...this.currentState, status: 'completed', currentStepId: null, revision });
      this.eventLog.push(freezeEvent({ type: 'experience-completed', fromStepId, outcomeId, revision }));
      return this.state;
    }

    this.currentState = freezeState({ ...this.currentState, currentStepId: transition.to, revision });
    this.eventLog.push(
      freezeEvent({ type: 'step-transitioned', fromStepId, toStepId: transition.to, outcomeId, revision }),
    );
    return this.state;
  }
}
