import type {
  AssessmentExperienceStep,
  AssessmentStepRecord,
  ExperienceDefinition,
  ExperienceEvent,
  ExperienceStep,
  ExperienceToolDeclaration,
  ExperienceToolParameterValue,
} from './ExperienceDefinition';
import {
  ExperienceCheckpointError,
  type ExperienceCheckpoint,
} from './ExperienceCheckpoint';

function fail(message: string): never {
  throw new ExperienceCheckpointError('invalid-checkpoint-state', message);
}

function normalizeAnswer(answer: string, step: AssessmentExperienceStep): string {
  return step.assessment.normalization === 'exact'
    ? answer
    : answer.trim().toLocaleLowerCase('en-US');
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertToolParameters(
  tool: ExperienceToolDeclaration,
  parameters: Readonly<Record<string, ExperienceToolParameterValue>>,
): void {
  const declared = new Map(tool.parameters.map((parameter) => [parameter.id, parameter]));
  for (const [key, value] of Object.entries(parameters)) {
    const declaration = declared.get(key);
    if (declaration === undefined || typeof value !== declaration.type) {
      fail(`Checkpoint tool "${tool.id}" contains parameters outside its authored contract.`);
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      fail(`Checkpoint tool "${tool.id}" contains a non-finite number.`);
    }
  }
  for (const declaration of tool.parameters) {
    if (declaration.required && !(declaration.id in parameters)) {
      fail(`Checkpoint tool "${tool.id}" is missing required parameter "${declaration.id}".`);
    }
  }
}

function requireStep(
  stepById: ReadonlyMap<string, ExperienceStep>,
  stepId: string,
): ExperienceStep {
  return stepById.get(stepId) ?? fail(`Checkpoint history references unknown step "${stepId}".`);
}

export function assertCheckpointSemantics(
  definition: ExperienceDefinition,
  checkpoint: ExperienceCheckpoint,
): void {
  const stepById = new Map(definition.steps.map((step) => [step.id, step]));
  const toolById = new Map((definition.tools ?? []).map((tool) => [tool.id, tool]));
  const finalAssessmentByStep = new Map(
    checkpoint.state.assessments.map((record) => [record.stepId, record]),
  );
  const replayedAssessments = new Map<string, AssessmentStepRecord>();

  let currentStepId: string | null = definition.initialStepId;
  let status: 'running' | 'completed' = 'running';
  let revision = 0;
  let pendingTransition: { fromStepId: string; outcomeId: string; revision: number } | null = null;

  for (let index = 1; index < checkpoint.events.length; index += 1) {
    const event = checkpoint.events[index] as ExperienceEvent;
    if (pendingTransition !== null && event.type !== 'step-transitioned' && event.type !== 'experience-completed') {
      fail(`Checkpoint event ${index} omits the authored transition after a resolving event.`);
    }
    if (status === 'completed') {
      fail(`Checkpoint event ${index} appears after experience completion.`);
    }
    if (currentStepId === null) fail('Checkpoint running history has no active step.');
    const step = requireStep(stepById, currentStepId);

    if (event.type === 'step-transitioned' || event.type === 'experience-completed') {
      if (pendingTransition === null) {
        fail(`Checkpoint event ${index} contains a transition without an authoritative outcome.`);
      }
      const transition = step.transitions.find((candidate) => candidate.on === pendingTransition?.outcomeId);
      if (
        event.revision !== pendingTransition.revision ||
        event.fromStepId !== pendingTransition.fromStepId ||
        event.outcomeId !== pendingTransition.outcomeId ||
        transition === undefined
      ) {
        fail(`Checkpoint event ${index} does not match the pending authored transition.`);
      }
      if (event.type === 'step-transitioned') {
        if (transition.to === 'complete' || event.toStepId !== transition.to) {
          fail(`Checkpoint event ${index} transitions to a non-authored step.`);
        }
        currentStepId = event.toStepId;
      } else {
        if (transition.to !== 'complete') {
          fail(`Checkpoint event ${index} completes from a non-terminal authored outcome.`);
        }
        currentStepId = null;
        status = 'completed';
      }
      pendingTransition = null;
      continue;
    }

    if (event.revision !== revision + 1) {
      fail(`Checkpoint event ${index} does not advance authority by exactly one revision.`);
    }
    if ('stepId' in event && event.stepId !== step.id) {
      fail(`Checkpoint event ${index} targets step "${event.stepId}" while "${step.id}" is active.`);
    }
    revision = event.revision;

    switch (event.type) {
      case 'experience-started':
        fail(`Checkpoint event ${index} contains a second experience start.`);
      case 'outcome-submitted': {
        if (step.kind === 'assessment') {
          fail(`Checkpoint event ${index} bypasses assessment authority with a direct outcome.`);
        }
        const transition = step.transitions.find((candidate) => candidate.on === event.outcomeId);
        if (transition === undefined) {
          fail(`Checkpoint event ${index} submits an outcome not authored for step "${step.id}".`);
        }
        pendingTransition = { fromStepId: step.id, outcomeId: event.outcomeId, revision };
        break;
      }
      case 'assessment-submitted': {
        if (step.kind !== 'assessment') {
          fail(`Checkpoint event ${index} submits an assessment on non-assessment step "${step.id}".`);
        }
        const finalRecord = finalAssessmentByStep.get(step.id);
        const finalAttempt = finalRecord?.attempts[event.attempt - 1];
        if (finalRecord === undefined || finalAttempt === undefined) {
          fail(`Checkpoint event ${index} has no matching persisted assessment attempt.`);
        }
        const previous = replayedAssessments.get(step.id) ?? {
          stepId: step.id,
          attempts: [],
          usedHintIds: [],
          result: null,
        };
        if (event.attempt !== previous.attempts.length + 1 || previous.result === 'correct' || previous.result === 'exhausted') {
          fail(`Checkpoint event ${index} has an impossible assessment attempt sequence.`);
        }
        const normalized = normalizeAnswer(finalAttempt.answer, step);
        const accepted = step.assessment.acceptedAnswers.map((answer) => normalizeAnswer(answer, step));
        const correct = accepted.includes(normalized);
        const exhausted = !correct && event.attempt >= step.assessment.maxAttempts;
        const result = correct ? 'correct' : exhausted ? 'exhausted' : 'retrying';
        if (
          finalAttempt.attempt !== event.attempt ||
          finalAttempt.normalizedAnswer !== normalized ||
          finalAttempt.correct !== correct ||
          event.normalizedAnswer !== normalized ||
          event.correct !== correct ||
          event.result !== result ||
          !equalStrings(event.usedHintIds, previous.usedHintIds) ||
          !equalStrings(finalAttempt.usedHintIds, previous.usedHintIds)
        ) {
          fail(`Checkpoint event ${index} does not match deterministic assessment truth.`);
        }
        replayedAssessments.set(step.id, {
          stepId: step.id,
          attempts: [...previous.attempts, finalAttempt],
          usedHintIds: previous.usedHintIds,
          result,
        });
        if (result !== 'retrying') {
          pendingTransition = {
            fromStepId: step.id,
            outcomeId: correct ? step.assessment.correctOutcomeId : step.assessment.exhaustedOutcomeId,
            revision,
          };
        }
        break;
      }
      case 'hint-used': {
        if (step.kind !== 'assessment') {
          fail(`Checkpoint event ${index} uses a hint on non-assessment step "${step.id}".`);
        }
        const previous = replayedAssessments.get(step.id) ?? {
          stepId: step.id,
          attempts: [],
          usedHintIds: [],
          result: null,
        };
        const hint = step.assessment.hints.find((candidate) => candidate.id === event.hintId);
        if (
          hint === undefined ||
          previous.result === 'correct' ||
          previous.result === 'exhausted' ||
          previous.usedHintIds.includes(event.hintId) ||
          previous.attempts.length < hint.availableAfterAttempt
        ) {
          fail(`Checkpoint event ${index} uses hint "${event.hintId}" outside authored policy.`);
        }
        replayedAssessments.set(step.id, {
          ...previous,
          usedHintIds: [...previous.usedHintIds, event.hintId],
        });
        break;
      }
      case 'tool-intent-approved': {
        const tool = toolById.get(event.toolId);
        if (tool === undefined || !(step.allowedToolIds ?? []).includes(tool.id) || tool.kind !== event.kind) {
          fail(`Checkpoint event ${index} approves tool "${event.toolId}" outside authored permission.`);
        }
        assertToolParameters(tool, event.parameters);
        break;
      }
    }
  }

  if (pendingTransition !== null) {
    fail('Checkpoint history ends before an authored transition is applied.');
  }
  if (
    checkpoint.state.status !== status ||
    checkpoint.state.currentStepId !== currentStepId ||
    checkpoint.state.revision !== revision
  ) {
    fail('Checkpoint state does not equal the authority reconstructed from its event history.');
  }
  if (checkpoint.state.assessments.length !== replayedAssessments.size) {
    fail('Checkpoint assessment state contains records not produced by event history.');
  }
  for (const persisted of checkpoint.state.assessments) {
    const replayed = replayedAssessments.get(persisted.stepId);
    if (
      replayed === undefined ||
      replayed.result !== persisted.result ||
      replayed.attempts.length !== persisted.attempts.length ||
      !equalStrings(replayed.usedHintIds, persisted.usedHintIds)
    ) {
      fail(`Checkpoint assessment state for "${persisted.stepId}" diverges from event history.`);
    }
  }
}
