import type {
  AssessmentExperienceStep,
  ExperienceDefinition,
  ExperienceStep,
  ExperienceToolDeclaration,
} from './ExperienceDefinition';

function freezeTool(tool: ExperienceToolDeclaration): ExperienceToolDeclaration {
  return Object.freeze({
    ...tool,
    parameters: Object.freeze(tool.parameters.map((parameter) => Object.freeze({ ...parameter }))),
  });
}

function freezeStep(step: ExperienceStep): ExperienceStep {
  const base = {
    ...step,
    transitions: Object.freeze(step.transitions.map((transition) => Object.freeze({ ...transition }))),
    ...(step.allowedToolIds === undefined
      ? {}
      : { allowedToolIds: Object.freeze([...step.allowedToolIds]) }),
  };

  if (step.kind !== 'assessment') {
    return Object.freeze(base) as ExperienceStep;
  }

  const assessmentStep: AssessmentExperienceStep = {
    ...base,
    kind: 'assessment',
    assessment: Object.freeze({
      ...step.assessment,
      acceptedAnswers: Object.freeze([...step.assessment.acceptedAnswers]),
      hints: Object.freeze(step.assessment.hints.map((hint) => Object.freeze({ ...hint }))),
    }),
  };
  return Object.freeze(assessmentStep);
}

export function snapshotExperienceDefinition(
  definition: ExperienceDefinition,
): ExperienceDefinition {
  return Object.freeze({
    id: definition.id,
    version: definition.version,
    initialStepId: definition.initialStepId,
    ...(definition.tools === undefined
      ? {}
      : { tools: Object.freeze(definition.tools.map(freezeTool)) }),
    steps: Object.freeze(definition.steps.map(freezeStep)),
  });
}
