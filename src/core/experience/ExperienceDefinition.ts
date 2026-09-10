export type ExperienceId = string;
export type ExperienceVersion = string;
export type ExperienceStepId = string;
export type ExperienceOutcomeId = string;
export type AssessmentHintId = string;
export type ExperienceToolId = string;
export type ExperienceToolParameterValue = string | number | boolean;

export interface ExperienceTransition {
  readonly on: ExperienceOutcomeId;
  readonly to: ExperienceStepId | 'complete';
}

export type ExperienceToolKind = 'world-effect' | 'product-effect';
export type ExperienceToolParameterType = 'string' | 'number' | 'boolean';

export interface ExperienceToolParameterDeclaration {
  readonly id: string;
  readonly type: ExperienceToolParameterType;
  readonly required: boolean;
}

export interface ExperienceToolDeclaration {
  readonly id: ExperienceToolId;
  readonly kind: ExperienceToolKind;
  readonly parameters: readonly ExperienceToolParameterDeclaration[];
}

interface ExperienceStepBase {
  readonly id: ExperienceStepId;
  readonly transitions: readonly ExperienceTransition[];
  readonly allowedToolIds?: readonly ExperienceToolId[];
}

export interface InstructionExperienceStep extends ExperienceStepBase {
  readonly kind: 'instruction';
}

export interface ActivityExperienceStep extends ExperienceStepBase {
  readonly kind: 'activity';
}

export type AssessmentNormalization = 'exact' | 'trim-casefold';

export interface AssessmentHint {
  readonly id: AssessmentHintId;
  readonly body: string;
  readonly availableAfterAttempt: number;
}

export interface AssessmentPolicy {
  readonly acceptedAnswers: readonly string[];
  readonly normalization: AssessmentNormalization;
  readonly maxAttempts: number;
  readonly correctOutcomeId: ExperienceOutcomeId;
  readonly exhaustedOutcomeId: ExperienceOutcomeId;
  readonly hints: readonly AssessmentHint[];
}

export interface AssessmentExperienceStep extends ExperienceStepBase {
  readonly kind: 'assessment';
  readonly assessment: AssessmentPolicy;
}

export type ExperienceStep =
  | InstructionExperienceStep
  | ActivityExperienceStep
  | AssessmentExperienceStep;

export interface ExperienceDefinition {
  readonly id: ExperienceId;
  readonly version: ExperienceVersion;
  readonly initialStepId: ExperienceStepId;
  readonly tools?: readonly ExperienceToolDeclaration[];
  readonly steps: readonly ExperienceStep[];
}

export interface ExperienceToolRequest {
  readonly toolId: ExperienceToolId;
  readonly stepId: ExperienceStepId;
  readonly expectedRevision: number;
  readonly parameters: Readonly<Record<string, ExperienceToolParameterValue>>;
}

export interface ExperienceToolIntent {
  readonly toolId: ExperienceToolId;
  readonly kind: ExperienceToolKind;
  readonly stepId: ExperienceStepId;
  readonly parameters: Readonly<Record<string, ExperienceToolParameterValue>>;
  readonly revision: number;
}

interface ExperienceCommandAuthority {
  readonly stepId: ExperienceStepId;
  readonly expectedRevision: number;
}

export type ExperienceCommand =
  | (ExperienceCommandAuthority & {
      readonly type: 'submit-outcome';
      readonly outcomeId: ExperienceOutcomeId;
    })
  | (ExperienceCommandAuthority & {
      readonly type: 'submit-assessment';
      readonly answer: string;
    })
  | (ExperienceCommandAuthority & {
      readonly type: 'use-hint';
      readonly hintId: AssessmentHintId;
    });

export type ExperienceStatus = 'running' | 'completed';
export type AssessmentResult = 'retrying' | 'correct' | 'exhausted';

export interface AssessmentAttemptRecord {
  readonly attempt: number;
  readonly answer: string;
  readonly normalizedAnswer: string;
  readonly correct: boolean;
  readonly usedHintIds: readonly AssessmentHintId[];
}

export interface AssessmentStepRecord {
  readonly stepId: ExperienceStepId;
  readonly attempts: readonly AssessmentAttemptRecord[];
  readonly usedHintIds: readonly AssessmentHintId[];
  readonly result: AssessmentResult | null;
}

export interface ExperienceState {
  readonly experienceId: ExperienceId;
  readonly experienceVersion: ExperienceVersion;
  readonly status: ExperienceStatus;
  readonly currentStepId: ExperienceStepId | null;
  readonly assessments: readonly AssessmentStepRecord[];
  readonly revision: number;
}

export type ExperienceEvent =
  | {
      readonly type: 'experience-started';
      readonly experienceId: ExperienceId;
      readonly experienceVersion: ExperienceVersion;
      readonly stepId: ExperienceStepId;
      readonly revision: number;
    }
  | {
      readonly type: 'outcome-submitted';
      readonly stepId: ExperienceStepId;
      readonly outcomeId: ExperienceOutcomeId;
      readonly revision: number;
    }
  | {
      readonly type: 'assessment-submitted';
      readonly stepId: ExperienceStepId;
      readonly attempt: number;
      readonly normalizedAnswer: string;
      readonly correct: boolean;
      readonly result: AssessmentResult;
      readonly usedHintIds: readonly AssessmentHintId[];
      readonly revision: number;
    }
  | {
      readonly type: 'hint-used';
      readonly stepId: ExperienceStepId;
      readonly hintId: AssessmentHintId;
      readonly revision: number;
    }
  | {
      readonly type: 'tool-intent-approved';
      readonly toolId: ExperienceToolId;
      readonly kind: ExperienceToolKind;
      readonly stepId: ExperienceStepId;
      readonly parameters: Readonly<Record<string, ExperienceToolParameterValue>>;
      readonly revision: number;
    }
  | {
      readonly type: 'step-transitioned';
      readonly fromStepId: ExperienceStepId;
      readonly toStepId: ExperienceStepId;
      readonly outcomeId: ExperienceOutcomeId;
      readonly revision: number;
    }
  | {
      readonly type: 'experience-completed';
      readonly fromStepId: ExperienceStepId;
      readonly outcomeId: ExperienceOutcomeId;
      readonly revision: number;
    };
