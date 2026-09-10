import type {
  AssessmentAttemptRecord,
  AssessmentStepRecord,
  ExperienceDefinition,
  ExperienceEvent,
  ExperienceState,
  ExperienceStepId,
} from './ExperienceDefinition';

export const EXPERIENCE_CHECKPOINT_FORMAT_VERSION = 1 as const;

export interface ExperienceCheckpoint {
  readonly formatVersion: typeof EXPERIENCE_CHECKPOINT_FORMAT_VERSION;
  readonly experienceId: string;
  readonly experienceVersion: string;
  readonly state: ExperienceState;
  readonly events: readonly ExperienceEvent[];
}

export type ExperienceCheckpointErrorCode =
  | 'malformed-checkpoint'
  | 'unsupported-format-version'
  | 'experience-mismatch'
  | 'experience-version-mismatch'
  | 'invalid-checkpoint-state';

export class ExperienceCheckpointError extends Error {
  readonly code: ExperienceCheckpointErrorCode;

  constructor(code: ExperienceCheckpointErrorCode, message: string) {
    super(message);
    this.name = 'ExperienceCheckpointError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new ExperienceCheckpointError(
      'malformed-checkpoint',
      `Checkpoint field "${path}" must be a string.`,
    );
  }
  return value;
}

function parseAttempt(value: unknown, path: string): AssessmentAttemptRecord {
  if (!isRecord(value)) {
    throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint field "${path}" must be an object.`);
  }
  if (!isNonNegativeInteger(value.attempt) || value.attempt < 1) {
    throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint field "${path}.attempt" must be a positive integer.`);
  }
  if (typeof value.correct !== 'boolean' || !Array.isArray(value.usedHintIds)) {
    throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint attempt "${path}" has invalid fields.`);
  }
  return {
    attempt: value.attempt,
    answer: requireString(value.answer, `${path}.answer`),
    normalizedAnswer: requireString(value.normalizedAnswer, `${path}.normalizedAnswer`),
    correct: value.correct,
    usedHintIds: value.usedHintIds.map((hint, index) => requireString(hint, `${path}.usedHintIds[${index}]`)),
  };
}

function parseAssessment(value: unknown, path: string): AssessmentStepRecord {
  if (!isRecord(value) || !Array.isArray(value.attempts) || !Array.isArray(value.usedHintIds)) {
    throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint field "${path}" must be a valid assessment record.`);
  }
  const result = value.result;
  if (result !== null && result !== 'retrying' && result !== 'correct' && result !== 'exhausted') {
    throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint field "${path}.result" is invalid.`);
  }
  return {
    stepId: requireString(value.stepId, `${path}.stepId`),
    attempts: value.attempts.map((attempt, index) => parseAttempt(attempt, `${path}.attempts[${index}]`)),
    usedHintIds: value.usedHintIds.map((hint, index) => requireString(hint, `${path}.usedHintIds[${index}]`)),
    result,
  };
}

function parseState(value: unknown): ExperienceState {
  if (!isRecord(value) || !Array.isArray(value.assessments)) {
    throw new ExperienceCheckpointError('malformed-checkpoint', 'Checkpoint state must be an object with assessments.');
  }
  if (value.status !== 'running' && value.status !== 'completed') {
    throw new ExperienceCheckpointError('malformed-checkpoint', 'Checkpoint state has an invalid status.');
  }
  if (value.currentStepId !== null && typeof value.currentStepId !== 'string') {
    throw new ExperienceCheckpointError('malformed-checkpoint', 'Checkpoint state currentStepId must be a string or null.');
  }
  if (!isNonNegativeInteger(value.revision)) {
    throw new ExperienceCheckpointError('malformed-checkpoint', 'Checkpoint state revision must be a non-negative integer.');
  }
  return {
    experienceId: requireString(value.experienceId, 'state.experienceId'),
    experienceVersion: requireString(value.experienceVersion, 'state.experienceVersion'),
    status: value.status,
    currentStepId: value.currentStepId,
    assessments: value.assessments.map((record, index) => parseAssessment(record, `state.assessments[${index}]`)),
    revision: value.revision,
  };
}

function parseEvent(value: unknown, index: number): ExperienceEvent {
  if (!isRecord(value) || typeof value.type !== 'string' || !isNonNegativeInteger(value.revision)) {
    throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint event ${index} is malformed.`);
  }
  switch (value.type) {
    case 'experience-started':
      return {
        type: value.type,
        experienceId: requireString(value.experienceId, `events[${index}].experienceId`),
        experienceVersion: requireString(value.experienceVersion, `events[${index}].experienceVersion`),
        stepId: requireString(value.stepId, `events[${index}].stepId`),
        revision: value.revision,
      };
    case 'outcome-submitted':
      return { type: value.type, stepId: requireString(value.stepId, `events[${index}].stepId`), outcomeId: requireString(value.outcomeId, `events[${index}].outcomeId`), revision: value.revision };
    case 'assessment-submitted': {
      if (!isNonNegativeInteger(value.attempt) || value.attempt < 1 || typeof value.correct !== 'boolean' || !Array.isArray(value.usedHintIds)) {
        throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint assessment event ${index} is malformed.`);
      }
      const result = value.result;
      if (result !== 'retrying' && result !== 'correct' && result !== 'exhausted') {
        throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint assessment event ${index} has invalid result.`);
      }
      return {
        type: value.type,
        stepId: requireString(value.stepId, `events[${index}].stepId`),
        attempt: value.attempt,
        normalizedAnswer: requireString(value.normalizedAnswer, `events[${index}].normalizedAnswer`),
        correct: value.correct,
        result,
        usedHintIds: value.usedHintIds.map((hint, hintIndex) => requireString(hint, `events[${index}].usedHintIds[${hintIndex}]`)),
        revision: value.revision,
      };
    }
    case 'hint-used':
      return { type: value.type, stepId: requireString(value.stepId, `events[${index}].stepId`), hintId: requireString(value.hintId, `events[${index}].hintId`), revision: value.revision };
    case 'step-transitioned':
      return { type: value.type, fromStepId: requireString(value.fromStepId, `events[${index}].fromStepId`), toStepId: requireString(value.toStepId, `events[${index}].toStepId`), outcomeId: requireString(value.outcomeId, `events[${index}].outcomeId`), revision: value.revision };
    case 'experience-completed':
      return { type: value.type, fromStepId: requireString(value.fromStepId, `events[${index}].fromStepId`), outcomeId: requireString(value.outcomeId, `events[${index}].outcomeId`), revision: value.revision };
    default:
      throw new ExperienceCheckpointError('malformed-checkpoint', `Checkpoint event ${index} has unknown type "${value.type}".`);
  }
}

function validateAssessmentState(definition: ExperienceDefinition, record: AssessmentStepRecord): void {
  const step = definition.steps.find((candidate) => candidate.id === record.stepId);
  if (step?.kind !== 'assessment') {
    throw new ExperienceCheckpointError('invalid-checkpoint-state', `Checkpoint assessment step "${record.stepId}" is not an authored assessment.`);
  }
  if (record.attempts.length > step.assessment.maxAttempts) {
    throw new ExperienceCheckpointError('invalid-checkpoint-state', `Checkpoint assessment step "${record.stepId}" exceeds its authored attempt limit.`);
  }
  const hintIds = new Set(step.assessment.hints.map((hint) => hint.id));
  if (record.usedHintIds.some((hintId) => !hintIds.has(hintId))) {
    throw new ExperienceCheckpointError('invalid-checkpoint-state', `Checkpoint assessment step "${record.stepId}" contains an undeclared hint.`);
  }
  record.attempts.forEach((attempt, index) => {
    if (attempt.attempt !== index + 1) {
      throw new ExperienceCheckpointError('invalid-checkpoint-state', `Checkpoint assessment step "${record.stepId}" has non-sequential attempts.`);
    }
    if (attempt.usedHintIds.some((hintId) => !record.usedHintIds.includes(hintId))) {
      throw new ExperienceCheckpointError('invalid-checkpoint-state', `Checkpoint assessment step "${record.stepId}" attempt references an unused hint.`);
    }
  });
}

export function parseExperienceCheckpoint(
  definition: ExperienceDefinition,
  value: unknown,
): ExperienceCheckpoint {
  if (!isRecord(value)) {
    throw new ExperienceCheckpointError('malformed-checkpoint', 'Checkpoint must be an object.');
  }
  if (value.formatVersion !== EXPERIENCE_CHECKPOINT_FORMAT_VERSION) {
    throw new ExperienceCheckpointError('unsupported-format-version', `Unsupported checkpoint format version "${String(value.formatVersion)}".`);
  }
  const experienceId = requireString(value.experienceId, 'experienceId');
  const experienceVersion = requireString(value.experienceVersion, 'experienceVersion');
  if (experienceId !== definition.id) {
    throw new ExperienceCheckpointError('experience-mismatch', `Checkpoint belongs to experience "${experienceId}", not "${definition.id}".`);
  }
  if (experienceVersion !== definition.version) {
    throw new ExperienceCheckpointError('experience-version-mismatch', `Checkpoint version "${experienceVersion}" is incompatible with authored version "${definition.version}".`);
  }

  const state = parseState(value.state);
  if (state.experienceId !== experienceId || state.experienceVersion !== experienceVersion) {
    throw new ExperienceCheckpointError('invalid-checkpoint-state', 'Checkpoint envelope and state identity do not match.');
  }
  const stepIds = new Set<ExperienceStepId>(definition.steps.map((step) => step.id));
  if (state.status === 'completed' ? state.currentStepId !== null : state.currentStepId === null || !stepIds.has(state.currentStepId)) {
    throw new ExperienceCheckpointError('invalid-checkpoint-state', 'Checkpoint status/current step is inconsistent with the authored graph.');
  }
  const assessmentIds = new Set<string>();
  for (const record of state.assessments) {
    if (assessmentIds.has(record.stepId)) {
      throw new ExperienceCheckpointError('invalid-checkpoint-state', `Checkpoint contains duplicate assessment state for "${record.stepId}".`);
    }
    assessmentIds.add(record.stepId);
    validateAssessmentState(definition, record);
  }

  if (!Array.isArray(value.events) || value.events.length === 0) {
    throw new ExperienceCheckpointError('malformed-checkpoint', 'Checkpoint events must contain the run history.');
  }
  const events = value.events.map(parseEvent);
  const first = events[0];
  if (first?.type !== 'experience-started' || first.experienceId !== experienceId || first.experienceVersion !== experienceVersion || first.stepId !== definition.initialStepId || first.revision !== 0) {
    throw new ExperienceCheckpointError('invalid-checkpoint-state', 'Checkpoint event history does not begin with the authored experience start.');
  }
  let previousRevision = -1;
  for (const event of events) {
    if (event.revision < previousRevision || event.revision > state.revision) {
      throw new ExperienceCheckpointError('invalid-checkpoint-state', 'Checkpoint event revisions are inconsistent with state revision.');
    }
    previousRevision = event.revision;
  }
  if (state.status === 'completed' && events.at(-1)?.type !== 'experience-completed') {
    throw new ExperienceCheckpointError('invalid-checkpoint-state', 'Completed checkpoint does not end with completion evidence.');
  }

  return {
    formatVersion: EXPERIENCE_CHECKPOINT_FORMAT_VERSION,
    experienceId,
    experienceVersion,
    state,
    events,
  };
}
