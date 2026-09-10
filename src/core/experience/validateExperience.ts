import type {
  AssessmentExperienceStep,
  ExperienceDefinition,
  ExperienceStep,
  ExperienceStepId,
  ExperienceToolDeclaration,
} from './ExperienceDefinition';

export type ExperienceValidationIssueCode =
  | 'empty-experience-id'
  | 'empty-version'
  | 'no-steps'
  | 'duplicate-step-id'
  | 'missing-initial-step'
  | 'duplicate-outcome'
  | 'invalid-transition-target'
  | 'unreachable-step'
  | 'no-completion-path'
  | 'assessment-no-accepted-answers'
  | 'assessment-invalid-accepted-answer'
  | 'assessment-invalid-max-attempts'
  | 'assessment-missing-outcome'
  | 'assessment-conflicting-outcomes'
  | 'duplicate-hint-id'
  | 'assessment-invalid-hint-policy'
  | 'duplicate-tool-id'
  | 'invalid-tool-declaration'
  | 'duplicate-tool-parameter'
  | 'undeclared-step-tool'
  | 'duplicate-step-tool';

export interface ExperienceValidationIssue {
  readonly code: ExperienceValidationIssueCode;
  readonly message: string;
  readonly stepId?: ExperienceStepId;
  readonly outcomeId?: string;
  readonly targetStepId?: ExperienceStepId;
  readonly toolId?: string;
  readonly parameterId?: string;
}

export interface ExperienceValidationReport {
  readonly valid: boolean;
  readonly issues: readonly ExperienceValidationIssue[];
}

export class ExperienceDefinitionValidationError extends Error {
  readonly issues: readonly ExperienceValidationIssue[];

  constructor(issues: readonly ExperienceValidationIssue[]) {
    super(`Experience definition is invalid: ${issues.map((issue) => issue.message).join('; ')}`);
    this.name = 'ExperienceDefinitionValidationError';
    this.issues = issues;
  }
}

function normalizeAcceptedAnswer(answer: string, step: AssessmentExperienceStep): string {
  return step.assessment.normalization === 'trim-casefold'
    ? answer.trim().toLocaleLowerCase('en-US')
    : answer;
}

function inspectAssessment(
  step: AssessmentExperienceStep,
  outcomes: ReadonlySet<string>,
  issues: ExperienceValidationIssue[],
): void {
  if (step.assessment.acceptedAnswers.length === 0) {
    issues.push({
      code: 'assessment-no-accepted-answers',
      stepId: step.id,
      message: `Assessment step "${step.id}" must declare at least one accepted answer.`,
    });
  }

  const normalizedAnswers = new Set<string>();
  for (const answer of step.assessment.acceptedAnswers) {
    const normalized = normalizeAcceptedAnswer(answer, step);
    if (normalized.trim().length === 0 || normalizedAnswers.has(normalized)) {
      issues.push({
        code: 'assessment-invalid-accepted-answer',
        stepId: step.id,
        message: `Assessment step "${step.id}" contains an empty or duplicate accepted answer after normalization.`,
      });
    }
    normalizedAnswers.add(normalized);
  }

  if (!Number.isInteger(step.assessment.maxAttempts) || step.assessment.maxAttempts < 1) {
    issues.push({
      code: 'assessment-invalid-max-attempts',
      stepId: step.id,
      message: `Assessment step "${step.id}" maxAttempts must be a positive integer.`,
    });
  }

  if (step.assessment.correctOutcomeId === step.assessment.exhaustedOutcomeId) {
    issues.push({
      code: 'assessment-conflicting-outcomes',
      stepId: step.id,
      outcomeId: step.assessment.correctOutcomeId,
      message: `Assessment step "${step.id}" must use different outcomes for correct and exhausted results.`,
    });
  }

  for (const outcomeId of [
    step.assessment.correctOutcomeId,
    step.assessment.exhaustedOutcomeId,
  ]) {
    if (!outcomes.has(outcomeId)) {
      issues.push({
        code: 'assessment-missing-outcome',
        stepId: step.id,
        outcomeId,
        message: `Assessment step "${step.id}" references missing outcome "${outcomeId}".`,
      });
    }
  }

  const hintIds = new Set<string>();
  for (const hint of step.assessment.hints) {
    if (hintIds.has(hint.id)) {
      issues.push({
        code: 'duplicate-hint-id',
        stepId: step.id,
        message: `Assessment step "${step.id}" declares hint "${hint.id}" more than once.`,
      });
    }
    hintIds.add(hint.id);

    if (
      hint.id.trim().length === 0 ||
      hint.body.trim().length === 0 ||
      !Number.isInteger(hint.availableAfterAttempt) ||
      hint.availableAfterAttempt < 0 ||
      hint.availableAfterAttempt >= step.assessment.maxAttempts
    ) {
      issues.push({
        code: 'assessment-invalid-hint-policy',
        stepId: step.id,
        message: `Assessment step "${step.id}" hint "${hint.id}" has an invalid authored availability policy.`,
      });
    }
  }
}

function inspectTransitions(
  step: ExperienceStep,
  stepIds: ReadonlySet<ExperienceStepId>,
  issues: ExperienceValidationIssue[],
): void {
  const outcomes = new Set<string>();

  for (const transition of step.transitions) {
    if (outcomes.has(transition.on)) {
      issues.push({
        code: 'duplicate-outcome',
        stepId: step.id,
        outcomeId: transition.on,
        message: `Step "${step.id}" declares outcome "${transition.on}" more than once.`,
      });
    }
    outcomes.add(transition.on);

    if (transition.to !== 'complete' && !stepIds.has(transition.to)) {
      issues.push({
        code: 'invalid-transition-target',
        stepId: step.id,
        outcomeId: transition.on,
        targetStepId: transition.to,
        message: `Step "${step.id}" outcome "${transition.on}" targets missing step "${transition.to}".`,
      });
    }
  }

  if (step.kind === 'assessment') inspectAssessment(step, outcomes, issues);
}

function inspectTools(
  definition: ExperienceDefinition,
  issues: ExperienceValidationIssue[],
): ReadonlySet<string> {
  const declaredToolIds = new Set<string>();
  for (const tool of definition.tools ?? []) {
    if (declaredToolIds.has(tool.id)) {
      issues.push({
        code: 'duplicate-tool-id',
        toolId: tool.id,
        message: `Tool id "${tool.id}" is declared more than once.`,
      });
    }
    declaredToolIds.add(tool.id);
    inspectToolDeclaration(tool, issues);
  }

  for (const step of definition.steps) {
    const allowed = new Set<string>();
    for (const toolId of step.allowedToolIds ?? []) {
      if (allowed.has(toolId)) {
        issues.push({
          code: 'duplicate-step-tool',
          stepId: step.id,
          toolId,
          message: `Step "${step.id}" allows tool "${toolId}" more than once.`,
        });
      }
      allowed.add(toolId);
      if (!declaredToolIds.has(toolId)) {
        issues.push({
          code: 'undeclared-step-tool',
          stepId: step.id,
          toolId,
          message: `Step "${step.id}" allows undeclared tool "${toolId}".`,
        });
      }
    }
  }

  return declaredToolIds;
}

function inspectToolDeclaration(
  tool: ExperienceToolDeclaration,
  issues: ExperienceValidationIssue[],
): void {
  if (tool.id.trim().length === 0) {
    issues.push({
      code: 'invalid-tool-declaration',
      toolId: tool.id,
      message: 'Tool id must not be empty.',
    });
  }

  const parameterIds = new Set<string>();
  for (const parameter of tool.parameters) {
    if (parameterIds.has(parameter.id)) {
      issues.push({
        code: 'duplicate-tool-parameter',
        toolId: tool.id,
        parameterId: parameter.id,
        message: `Tool "${tool.id}" declares parameter "${parameter.id}" more than once.`,
      });
    }
    parameterIds.add(parameter.id);
    if (parameter.id.trim().length === 0) {
      issues.push({
        code: 'invalid-tool-declaration',
        toolId: tool.id,
        parameterId: parameter.id,
        message: `Tool "${tool.id}" has an empty parameter id.`,
      });
    }
  }
}

function findReachableSteps(
  definition: ExperienceDefinition,
  stepById: ReadonlyMap<ExperienceStepId, ExperienceStep>,
): ReadonlySet<ExperienceStepId> {
  if (!stepById.has(definition.initialStepId)) return new Set();

  const reachable = new Set<ExperienceStepId>();
  const pending: ExperienceStepId[] = [definition.initialStepId];

  while (pending.length > 0) {
    const stepId = pending.shift();
    if (stepId === undefined || reachable.has(stepId)) continue;

    const step = stepById.get(stepId);
    if (step === undefined) continue;

    reachable.add(stepId);
    for (const transition of step.transitions) {
      if (transition.to !== 'complete' && stepById.has(transition.to)) {
        pending.push(transition.to);
      }
    }
  }

  return reachable;
}

function findCompletionCapableSteps(
  definition: ExperienceDefinition,
  stepById: ReadonlyMap<ExperienceStepId, ExperienceStep>,
): ReadonlySet<ExperienceStepId> {
  const completionCapable = new Set<ExperienceStepId>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const step of definition.steps) {
      if (completionCapable.has(step.id) || !stepById.has(step.id)) continue;
      const canComplete = step.transitions.some(
        (transition) => transition.to === 'complete' || completionCapable.has(transition.to),
      );
      if (canComplete) {
        completionCapable.add(step.id);
        changed = true;
      }
    }
  }

  return completionCapable;
}

export function validateExperience(definition: ExperienceDefinition): ExperienceValidationReport {
  const issues: ExperienceValidationIssue[] = [];

  if (definition.id.trim().length === 0) {
    issues.push({ code: 'empty-experience-id', message: 'Experience id must not be empty.' });
  }
  if (definition.version.trim().length === 0) {
    issues.push({ code: 'empty-version', message: 'Experience version must not be empty.' });
  }
  if (definition.steps.length === 0) {
    issues.push({ code: 'no-steps', message: 'Experience must define at least one step.' });
  }

  const stepById = new Map<ExperienceStepId, ExperienceStep>();
  const duplicateStepIds = new Set<ExperienceStepId>();
  for (const step of definition.steps) {
    if (stepById.has(step.id)) duplicateStepIds.add(step.id);
    else stepById.set(step.id, step);
  }

  for (const stepId of duplicateStepIds) {
    issues.push({
      code: 'duplicate-step-id',
      stepId,
      message: `Step id "${stepId}" is declared more than once.`,
    });
  }

  if (!stepById.has(definition.initialStepId)) {
    issues.push({
      code: 'missing-initial-step',
      targetStepId: definition.initialStepId,
      message: `Initial step "${definition.initialStepId}" does not exist.`,
    });
  }

  const stepIds = new Set(stepById.keys());
  for (const step of definition.steps) inspectTransitions(step, stepIds, issues);
  inspectTools(definition, issues);

  const reachable = findReachableSteps(definition, stepById);
  for (const step of definition.steps) {
    if (!reachable.has(step.id)) {
      issues.push({
        code: 'unreachable-step',
        stepId: step.id,
        message: `Step "${step.id}" is unreachable from initial step "${definition.initialStepId}".`,
      });
    }
  }

  const completionCapable = findCompletionCapableSteps(definition, stepById);
  for (const stepId of reachable) {
    if (!completionCapable.has(stepId)) {
      issues.push({
        code: 'no-completion-path',
        stepId,
        message: `Reachable step "${stepId}" has no authored path to experience completion.`,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function assertValidExperience(definition: ExperienceDefinition): void {
  const report = validateExperience(definition);
  if (!report.valid) throw new ExperienceDefinitionValidationError(report.issues);
}
