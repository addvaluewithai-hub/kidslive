export type ExperienceId = string;
export type ExperienceVersion = string;
export type ExperienceStepId = string;
export type ExperienceOutcomeId = string;

export interface ExperienceTransition {
  readonly on: ExperienceOutcomeId;
  readonly to: ExperienceStepId | 'complete';
}

export interface ExperienceStep {
  readonly id: ExperienceStepId;
  readonly kind: 'instruction' | 'activity';
  readonly transitions: readonly ExperienceTransition[];
}

export interface ExperienceDefinition {
  readonly id: ExperienceId;
  readonly version: ExperienceVersion;
  readonly initialStepId: ExperienceStepId;
  readonly steps: readonly ExperienceStep[];
}

export type ExperienceCommand = {
  readonly type: 'submit-outcome';
  readonly outcomeId: ExperienceOutcomeId;
};

export type ExperienceStatus = 'running' | 'completed';

export interface ExperienceState {
  readonly experienceId: ExperienceId;
  readonly experienceVersion: ExperienceVersion;
  readonly status: ExperienceStatus;
  readonly currentStepId: ExperienceStepId | null;
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
