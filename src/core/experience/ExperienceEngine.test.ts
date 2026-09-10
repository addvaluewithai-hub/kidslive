import { describe, expect, it } from 'vitest';
import type { ExperienceCommand, ExperienceDefinition } from './ExperienceDefinition';
import { ExperienceCommandError, ExperienceEngine } from './ExperienceEngine';
import {
  ASSESSMENT_EXPERIENCE_FIXTURE,
  BRANCHING_EXPERIENCE_FIXTURE,
} from './fixtures';
import {
  ExperienceDefinitionValidationError,
  validateExperience,
} from './validateExperience';

function dispatchCurrent(
  engine: ExperienceEngine,
  command: Omit<ExperienceCommand, 'stepId' | 'expectedRevision'>,
): void {
  const state = engine.state;
  if (state.currentStepId === null) throw new Error('Expected a running experience.');
  engine.dispatch({ ...command, stepId: state.currentStepId, expectedRevision: state.revision } as ExperienceCommand);
}

function atAssessment(): ExperienceEngine {
  const engine = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
  dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'continue' });
  return engine;
}

describe('validateExperience', () => {
  it('accepts representative branching and assessment graphs', () => {
    expect(validateExperience(BRANCHING_EXPERIENCE_FIXTURE)).toEqual({ valid: true, issues: [] });
    expect(validateExperience(ASSESSMENT_EXPERIENCE_FIXTURE)).toEqual({ valid: true, issues: [] });
  });

  it('rejects invalid definitions before execution', () => {
    const definition: ExperienceDefinition = {
      ...BRANCHING_EXPERIENCE_FIXTURE,
      initialStepId: 'missing',
    };
    expect(validateExperience(definition).issues[0]).toMatchObject({
      code: 'missing-initial-step',
      targetStepId: 'missing',
    });
    expect(() => ExperienceEngine.start(definition)).toThrow(ExperienceDefinitionValidationError);
  });
});

describe('ExperienceEngine guarded graph runner', () => {
  it('runs authored branches deterministically through dispatch', () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'continue' });
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'practice' });
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'again' });
    expect(engine.currentStep?.id).toBe('practice');
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'done' });
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'finish' });
    expect(engine.state).toMatchObject({ status: 'completed', currentStepId: null, revision: 5 });
  });

  it('rejects stale/replayed commands without mutation', () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    const command: ExperienceCommand = {
      type: 'submit-outcome',
      stepId: 'welcome',
      expectedRevision: 0,
      outcomeId: 'continue',
    };
    engine.dispatch(command);
    const state = engine.state;
    const events = engine.events;
    expect(() => engine.dispatch(command)).toThrowError(
      expect.objectContaining<Partial<ExperienceCommandError>>({ code: 'stale-command' }),
    );
    expect(engine.state).toEqual(state);
    expect(engine.events).toEqual(events);
  });

  it('rejects illegal outcomes and terminal commands without changing authority', () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    expect(() =>
      engine.dispatch({
        type: 'submit-outcome',
        stepId: 'welcome',
        expectedRevision: 0,
        outcomeId: 'not-authored',
      }),
    ).toThrow(ExperienceCommandError);
    expect(engine.state.revision).toBe(0);

    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'continue' });
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'ready' });
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'finish' });
    const events = engine.events;
    expect(() =>
      engine.dispatch({
        type: 'submit-outcome',
        stepId: 'wrap-up',
        expectedRevision: 2,
        outcomeId: 'finish',
      }),
    ).toThrowError(expect.objectContaining({ code: 'experience-completed' }));
    expect(engine.events).toEqual(events);
  });
});

describe('ExperienceEngine assessment authority', () => {
  it('owns normalization, retries, hints, and success transitions', () => {
    const engine = atAssessment();
    dispatchCurrent(engine, { type: 'submit-assessment', answer: 'Venus' });
    expect(engine.state.assessments[0]).toMatchObject({
      result: 'retrying',
      attempts: [{ attempt: 1, normalizedAnswer: 'venus', correct: false }],
    });
    dispatchCurrent(engine, { type: 'use-hint', hintId: 'first-letter' });
    dispatchCurrent(engine, { type: 'submit-assessment', answer: '  MERCURY  ' });
    expect(engine.currentStep?.id).toBe('success');
    expect(engine.state.assessments[0]).toMatchObject({
      result: 'correct',
      usedHintIds: ['first-letter'],
      attempts: [
        { attempt: 1, correct: false, usedHintIds: [] },
        { attempt: 2, correct: true, usedHintIds: ['first-letter'] },
      ],
    });
  });

  it('branches only after authored exhaustion', () => {
    const engine = atAssessment();
    for (const answer of ['Venus', 'Earth', 'Mars']) {
      dispatchCurrent(engine, { type: 'submit-assessment', answer });
    }
    expect(engine.currentStep?.id).toBe('review');
    expect(engine.state.assessments[0]).toMatchObject({ result: 'exhausted' });
  });

  it('rejects bypass, premature hints, and empty submissions without mutation', () => {
    const engine = atAssessment();
    for (const command of [
      { type: 'submit-outcome', outcomeId: 'correct' },
      { type: 'use-hint', hintId: 'first-letter' },
      { type: 'submit-assessment', answer: '   ' },
    ] as const) {
      const state = engine.state;
      const events = engine.events;
      expect(() => dispatchCurrent(engine, command)).toThrow(ExperienceCommandError);
      expect(engine.state).toEqual(state);
      expect(engine.events).toEqual(events);
    }
  });
});
