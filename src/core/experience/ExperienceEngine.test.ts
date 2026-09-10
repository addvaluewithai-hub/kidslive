import { describe, expect, it } from 'vitest';
import type { ExperienceDefinition } from './ExperienceDefinition';
import { ExperienceCommandError, ExperienceEngine } from './ExperienceEngine';
import {
  ASSESSMENT_EXPERIENCE_FIXTURE,
  BRANCHING_EXPERIENCE_FIXTURE,
} from './fixtures';
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
  it('accepts reachable authored branching and assessment graphs', () => {
    expect(validateExperience(BRANCHING_EXPERIENCE_FIXTURE)).toEqual({
      valid: true,
      issues: [],
    });
    expect(validateExperience(ASSESSMENT_EXPERIENCE_FIXTURE)).toEqual({
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

  it('rejects assessment policies that cannot evaluate or transition safely', () => {
    const broken: ExperienceDefinition = {
      id: 'broken-assessment',
      version: '1',
      initialStepId: 'check',
      steps: [
        {
          id: 'check',
          kind: 'assessment',
          assessment: {
            acceptedAnswers: [],
            normalization: 'exact',
            maxAttempts: 0,
            correctOutcomeId: 'missing-correct',
            exhaustedOutcomeId: 'missing-exhausted',
            hints: [
              { id: 'same', body: '', availableAfterAttempt: 0 },
              { id: 'same', body: 'duplicate', availableAfterAttempt: -1 },
            ],
          },
          transitions: [{ on: 'other', to: 'complete' }],
        },
      ],
    };

    expect(validateExperience(broken).issues.map((issue) => issue.code)).toEqual([
      'assessment-no-accepted-answers',
      'assessment-invalid-max-attempts',
      'assessment-missing-outcome',
      'assessment-missing-outcome',
      'assessment-invalid-hint-policy',
      'duplicate-hint-id',
      'assessment-invalid-hint-policy',
    ]);
  });
});

describe('ExperienceEngine graph runner', () => {
  it('runs both non-assessment branches deterministically to completion', () => {
    const direct = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    direct.dispatch({ type: 'submit-outcome', outcomeId: 'continue' });
    direct.dispatch({ type: 'submit-outcome', outcomeId: 'ready' });
    const completed = direct.dispatch({ type: 'submit-outcome', outcomeId: 'finish' });

    expect(completed).toEqual({
      experienceId: 'a4-branching-demo',
      experienceVersion: '1',
      status: 'completed',
      currentStepId: null,
      assessments: [],
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

  it('rejects illegal outcomes and terminal commands without mutating authority', () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    const stateBefore = engine.state;
    const eventsBefore = engine.events;

    expect(() => engine.submitOutcome('not-authored')).toThrow(ExperienceCommandError);
    expect(engine.state).toEqual(stateBefore);
    expect(engine.events).toEqual(eventsBefore);

    engine.submitOutcome('continue');
    engine.submitOutcome('ready');
    engine.submitOutcome('finish');
    const eventsAfterCompletion = engine.events.length;
    expect(() => engine.submitOutcome('finish')).toThrowError(
      expect.objectContaining({ code: 'experience-completed' }),
    );
    expect(engine.events).toHaveLength(eventsAfterCompletion);
  });
});

describe('ExperienceEngine assessment authority', () => {
  function atAssessment(): ExperienceEngine {
    const engine = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
    engine.submitOutcome('continue');
    return engine;
  }

  it('normalizes and evaluates an immediate correct submission inside the engine', () => {
    const engine = atAssessment();
    engine.dispatch({ type: 'submit-assessment', answer: '  MERCURY  ' });

    expect(engine.currentStep?.id).toBe('success');
    expect(engine.state.assessments).toEqual([
      {
        stepId: 'planet-check',
        attempts: [
          {
            attempt: 1,
            answer: '  MERCURY  ',
            normalizedAnswer: 'mercury',
            correct: true,
            usedHintIds: [],
          },
        ],
        usedHintIds: [],
        result: 'correct',
      },
    ]);
    expect(engine.events.at(-2)).toMatchObject({
      type: 'assessment-submitted',
      correct: true,
      result: 'correct',
      revision: 2,
    });
    expect(engine.events.at(-1)).toMatchObject({
      type: 'step-transitioned',
      outcomeId: 'correct',
      toStepId: 'success',
      revision: 2,
    });
  });

  it('records incorrect attempts without transitioning, then supports retry-to-success', () => {
    const engine = atAssessment();
    engine.submitAssessment('Venus');

    expect(engine.currentStep?.id).toBe('planet-check');
    expect(engine.state.assessments[0]).toMatchObject({
      result: 'retrying',
      attempts: [{ attempt: 1, normalizedAnswer: 'venus', correct: false }],
    });

    engine.submitAssessment('Mercury');
    expect(engine.currentStep?.id).toBe('success');
    expect(engine.state.assessments[0]?.attempts).toHaveLength(2);
    expect(engine.state.assessments[0]?.result).toBe('correct');
  });

  it('branches only after the authored attempt limit is exhausted', () => {
    const engine = atAssessment();
    engine.submitAssessment('Venus');
    engine.submitAssessment('Earth');
    expect(engine.currentStep?.id).toBe('planet-check');

    engine.submitAssessment('Mars');
    expect(engine.currentStep?.id).toBe('review');
    expect(engine.state.assessments[0]).toMatchObject({
      result: 'exhausted',
      attempts: [
        { attempt: 1, correct: false },
        { attempt: 2, correct: false },
        { attempt: 3, correct: false },
      ],
    });
  });

  it('enforces authored hint availability and records hint-assisted attempts', () => {
    const engine = atAssessment();
    const stateBefore = engine.state;

    expect(() => engine.useHint('first-letter')).toThrowError(
      expect.objectContaining({ code: 'hint-not-available' }),
    );
    expect(engine.state).toEqual(stateBefore);

    engine.submitAssessment('Venus');
    engine.dispatch({ type: 'use-hint', hintId: 'first-letter' });
    expect(() => engine.useHint('first-letter')).toThrowError(
      expect.objectContaining({ code: 'hint-already-used' }),
    );
    engine.submitAssessment('Mercury');

    expect(engine.state.assessments[0]).toMatchObject({
      usedHintIds: ['first-letter'],
      result: 'correct',
    });
    expect(engine.state.assessments[0]?.attempts[1]?.usedHintIds).toEqual([
      'first-letter',
    ]);
    expect(engine.events.some((event) => event.type === 'hint-used')).toBe(true);
  });

  it('rejects bypass, unknown hints, and invalid submissions without changing truth', () => {
    const engine = atAssessment();

    for (const action of [
      () => engine.submitOutcome('correct'),
      () => engine.useHint('not-authored'),
      () => engine.submitAssessment('   '),
    ]) {
      const stateBefore = engine.state;
      const eventsBefore = engine.events;
      expect(action).toThrow(ExperienceCommandError);
      expect(engine.state).toEqual(stateBefore);
      expect(engine.events).toEqual(eventsBefore);
    }
  });

  it('keeps nested assessment state immutable and JSON-serializable', () => {
    const engine = atAssessment();
    engine.submitAssessment('Venus');
    engine.useHint('first-letter');
    const snapshot = engine.state;

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.assessments)).toBe(true);
    expect(Object.isFrozen(snapshot.assessments[0])).toBe(true);
    expect(Object.isFrozen(snapshot.assessments[0]?.attempts)).toBe(true);
    expect(Object.isFrozen(snapshot.assessments[0]?.attempts[0]?.usedHintIds)).toBe(true);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
