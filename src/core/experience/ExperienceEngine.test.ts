import { describe, expect, it } from 'vitest';
import type { ExperienceDefinition } from './ExperienceDefinition';
import { ExperienceCommandError, ExperienceEngine } from './ExperienceEngine';
import { BRANCHING_EXPERIENCE_FIXTURE } from './fixtures';
import {
  ExperienceDefinitionValidationError,
  validateExperience,
} from './validateExperience';

function withDefinition(
  overrides: Partial<ExperienceDefinition>,
): ExperienceDefinition {
  return { ...BRANCHING_EXPERIENCE_FIXTURE, ...overrides };
}

describe('validateExperience', () => {
  it('accepts a reachable authored graph with branching and completion', () => {
    expect(validateExperience(BRANCHING_EXPERIENCE_FIXTURE)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('reports duplicate ids, missing references, duplicate outcomes, and unreachable steps', () => {
    const definition: ExperienceDefinition = {
      id: 'invalid',
      version: '1',
      initialStepId: 'start',
      steps: [
        {
          id: 'start',
          kind: 'activity',
          transitions: [
            { on: 'go', to: 'missing' },
            { on: 'go', to: 'complete' },
          ],
        },
        { id: 'start', kind: 'instruction', transitions: [] },
        { id: 'orphan', kind: 'instruction', transitions: [] },
      ],
    };

    const codes = validateExperience(definition).issues.map((issue) => issue.code);
    expect(codes).toEqual([
      'duplicate-step-id',
      'invalid-transition-target',
      'duplicate-outcome',
      'unreachable-step',
    ]);
  });

  it('reports a missing initial step and rejects invalid definitions before execution', () => {
    const definition = withDefinition({ initialStepId: 'missing' });
    const report = validateExperience(definition);

    expect(report.issues[0]).toMatchObject({
      code: 'missing-initial-step',
      targetStepId: 'missing',
    });
    expect(() => ExperienceEngine.start(definition)).toThrow(
      ExperienceDefinitionValidationError,
    );
  });
});

describe('ExperienceEngine', () => {
  it('runs both branches deterministically to completion', () => {
    const direct = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    direct.dispatch({ type: 'submit-outcome', outcomeId: 'continue' });
    direct.dispatch({ type: 'submit-outcome', outcomeId: 'ready' });
    const completed = direct.dispatch({ type: 'submit-outcome', outcomeId: 'finish' });

    expect(completed).toEqual({
      experienceId: 'a4-branching-demo',
      experienceVersion: '1',
      status: 'completed',
      currentStepId: null,
      revision: 3,
    });

    const practice = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    practice.submitOutcome('continue');
    practice.submitOutcome('practice');
    practice.submitOutcome('again');
    expect(practice.currentStep?.id).toBe('practice');
    practice.submitOutcome('done');
    practice.submitOutcome('finish');
    expect(practice.state.status).toBe('completed');
  });

  it('records ordered typed events for transitions and completion', () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    engine.submitOutcome('continue');
    engine.submitOutcome('ready');
    engine.submitOutcome('finish');

    expect(engine.events.map((event) => event.type)).toEqual([
      'experience-started',
      'outcome-submitted',
      'step-transitioned',
      'outcome-submitted',
      'step-transitioned',
      'outcome-submitted',
      'experience-completed',
    ]);
  });

  it('rejects illegal outcomes without mutating state or events', () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    const stateBefore = engine.state;
    const eventsBefore = engine.events;

    expect(() => engine.submitOutcome('not-authored')).toThrow(ExperienceCommandError);
    expect(engine.state).toEqual(stateBefore);
    expect(engine.events).toEqual(eventsBefore);
  });

  it('rejects commands after completion without double-applying completion', () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    engine.submitOutcome('continue');
    engine.submitOutcome('ready');
    engine.submitOutcome('finish');
    const eventsBefore = engine.events.length;

    expect(() => engine.submitOutcome('finish')).toThrowError(
      expect.objectContaining({ code: 'experience-completed' }),
    );
    expect(engine.state.revision).toBe(3);
    expect(engine.events).toHaveLength(eventsBefore);
  });

  it('returns immutable snapshots rather than mutable engine authority', () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    const snapshot = engine.state;
    const events = engine.events;

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(events)).toBe(true);
    expect(Object.isFrozen(events[0])).toBe(true);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
