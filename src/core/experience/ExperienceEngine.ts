import type {
  ExperienceCommand,
  ExperienceDefinition,
  ExperienceEvent,
  ExperienceState,
  ExperienceStep,
  ExperienceStepId,
} from './ExperienceDefinition';
import { assertValidExperience } from './validateExperience';

export type ExperienceCommandErrorCode =
  | 'experience-completed'
  | 'unknown-outcome'
  | 'missing-current-step';

export class ExperienceCommandError extends Error {
  readonly code: ExperienceCommandErrorCode;

  constructor(code: ExperienceCommandErrorCode, message: string) {
    super(message);
    this.name = 'ExperienceCommandError';
    this.code = code;
  }
}

function freezeState(state: ExperienceState): ExperienceState {
  return Object.freeze({ ...state });
}

function freezeEvent(event: ExperienceEvent): ExperienceEvent {
  return Object.freeze({ ...event }) as ExperienceEvent;
}

export class ExperienceEngine {
  private readonly definition: ExperienceDefinition;
  private readonly stepById: ReadonlyMap<ExperienceStepId, ExperienceStep>;
  private currentState: ExperienceState;
  private readonly eventLog: ExperienceEvent[];

  private constructor(definition: ExperienceDefinition) {
    this.definition = definition;
    this.stepById = new Map(definition.steps.map((step) => [step.id, step]));
    this.currentState = freezeState({
      experienceId: definition.id,
      experienceVersion: definition.version,
      status: 'running',
      currentStepId: definition.initialStepId,
      revision: 0,
    });
    this.eventLog = [
      freezeEvent({
        type: 'experience-started',
        experienceId: definition.id,
        experienceVersion: definition.version,
        stepId: definition.initialStepId,
        revision: 0,
      }),
    ];
  }

  static start(definition: ExperienceDefinition): ExperienceEngine {
    assertValidExperience(definition);
    return new ExperienceEngine(definition);
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

  dispatch(command: ExperienceCommand): ExperienceState {
    switch (command.type) {
      case 'submit-outcome':
        return this.submitOutcome(command.outcomeId);
    }
  }

  submitOutcome(outcomeId: string): ExperienceState {
    if (this.currentState.status === 'completed') {
      throw new ExperienceCommandError(
        'experience-completed',
        `Experience "${this.definition.id}" is already complete.`,
      );
    }

    const stepId = this.currentState.currentStepId;
    if (stepId === null) {
      throw new ExperienceCommandError(
        'missing-current-step',
        'Running experience has no current step.',
      );
    }

    const step = this.stepById.get(stepId);
    if (step === undefined) {
      throw new ExperienceCommandError(
        'missing-current-step',
        `Current step "${stepId}" does not exist in the validated definition.`,
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
    this.eventLog.push(
      freezeEvent({
        type: 'outcome-submitted',
        stepId,
        outcomeId,
        revision,
      }),
    );

    if (transition.to === 'complete') {
      this.currentState = freezeState({
        ...this.currentState,
        status: 'completed',
        currentStepId: null,
        revision,
      });
      this.eventLog.push(
        freezeEvent({
          type: 'experience-completed',
          fromStepId: stepId,
          outcomeId,
          revision,
        }),
      );
      return this.state;
    }

    this.currentState = freezeState({
      ...this.currentState,
      currentStepId: transition.to,
      revision,
    });
    this.eventLog.push(
      freezeEvent({
        type: 'step-transitioned',
        fromStepId: stepId,
        toStepId: transition.to,
        outcomeId,
        revision,
      }),
    );
    return this.state;
  }
}
