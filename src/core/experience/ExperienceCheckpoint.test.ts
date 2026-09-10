import { describe, expect, it } from 'vitest';
import type { ExperienceDefinition } from './ExperienceDefinition';
import {
  ExperienceCheckpointError,
  type ExperienceCheckpointErrorCode,
} from './ExperienceCheckpoint';
import { ExperienceCommandError, ExperienceEngine } from './ExperienceEngine';
import { ASSESSMENT_EXPERIENCE_FIXTURE } from './fixtures';

function serialize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function checkpointAfterHint(): ReturnType<ExperienceEngine['checkpoint']> {
  const engine = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
  engine.submitOutcome('continue');
  engine.submitAssessment('Venus');
  engine.useHint('first-letter');
  return engine.checkpoint();
}

describe('ExperienceEngine checkpoints', () => {
  it('round-trips a mid-assessment checkpoint and reaches the uninterrupted result', () => {
    const uninterrupted = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
    uninterrupted.submitOutcome('continue');
    uninterrupted.submitAssessment('Venus');
    uninterrupted.useHint('first-letter');

    const storedJson = serialize(uninterrupted.checkpoint());
    const resumed = ExperienceEngine.resume(ASSESSMENT_EXPERIENCE_FIXTURE, storedJson);

    expect(resumed.state).toEqual(uninterrupted.state);
    expect(resumed.events).toEqual(uninterrupted.events);
    expect(resumed.events).toHaveLength(5);
    expect(resumed.currentStep?.id).toBe('planet-check');

    uninterrupted.submitAssessment('Mercury');
    uninterrupted.submitOutcome('finish');
    resumed.submitAssessment('Mercury');
    resumed.submitOutcome('finish');

    expect(resumed.state).toEqual(uninterrupted.state);
    expect(resumed.events).toEqual(uninterrupted.events);
    expect(resumed.state).toMatchObject({ status: 'completed', currentStepId: null });
    expect(resumed.state.assessments[0]).toMatchObject({
      usedHintIds: ['first-letter'],
      result: 'correct',
      attempts: [
        { attempt: 1, normalizedAnswer: 'venus', correct: false },
        { attempt: 2, normalizedAnswer: 'mercury', correct: true, usedHintIds: ['first-letter'] },
      ],
    });
  });

  it('resumes a completed experience without replaying completion or accepting more commands', () => {
    const engine = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
    engine.submitOutcome('continue');
    engine.submitAssessment('Mercury');
    engine.submitOutcome('finish');
    const checkpoint = serialize(engine.checkpoint());

    const resumed = ExperienceEngine.resume(ASSESSMENT_EXPERIENCE_FIXTURE, checkpoint);
    expect(resumed.state).toEqual(engine.state);
    expect(resumed.events).toEqual(engine.events);
    expect(resumed.events.filter((event) => event.type === 'experience-completed')).toHaveLength(1);
    expect(() => resumed.submitOutcome('finish')).toThrowError(
      expect.objectContaining<Partial<ExperienceCommandError>>({ code: 'experience-completed' }),
    );
  });

  it('restart deliberately clears attempts, hints, completion, revision, and prior run events', () => {
    const engine = ExperienceEngine.resume(
      ASSESSMENT_EXPERIENCE_FIXTURE,
      serialize(checkpointAfterHint()),
    );

    const restarted = engine.restart();
    expect(restarted).toEqual({
      experienceId: ASSESSMENT_EXPERIENCE_FIXTURE.id,
      experienceVersion: ASSESSMENT_EXPERIENCE_FIXTURE.version,
      status: 'running',
      currentStepId: 'prompt',
      assessments: [],
      revision: 0,
    });
    expect(engine.events).toEqual([
      {
        type: 'experience-started',
        experienceId: ASSESSMENT_EXPERIENCE_FIXTURE.id,
        experienceVersion: ASSESSMENT_EXPERIENCE_FIXTURE.version,
        stepId: 'prompt',
        revision: 0,
      },
    ]);

    engine.submitOutcome('continue');
    engine.submitAssessment('Mercury');
    expect(engine.state.assessments[0]?.attempts[0]?.attempt).toBe(1);
  });

  it.each([
    ['not an object', null, 'malformed-checkpoint'],
    [
      'unsupported envelope format',
      { ...checkpointAfterHint(), formatVersion: 999 },
      'unsupported-format-version',
    ],
    [
      'different experience',
      { ...checkpointAfterHint(), experienceId: 'some-other-experience' },
      'experience-mismatch',
    ],
  ] as const)(
    'rejects %s without creating partially restored authority',
    (_name, checkpoint, code: ExperienceCheckpointErrorCode) => {
      expect(() =>
        ExperienceEngine.resume(ASSESSMENT_EXPERIENCE_FIXTURE, serialize(checkpoint)),
      ).toThrowError(expect.objectContaining<Partial<ExperienceCheckpointError>>({ code }));
    },
  );

  it('rejects authored-version incompatibility explicitly', () => {
    const nextDefinition: ExperienceDefinition = {
      ...ASSESSMENT_EXPERIENCE_FIXTURE,
      version: '2',
    };

    expect(() => ExperienceEngine.resume(nextDefinition, serialize(checkpointAfterHint()))).toThrowError(
      expect.objectContaining<Partial<ExperienceCheckpointError>>({
        code: 'experience-version-mismatch',
      }),
    );
  });

  it('rejects structurally valid but impossible state instead of partially applying it', () => {
    const original = checkpointAfterHint();
    const corrupt = serialize({
      ...original,
      state: {
        ...original.state,
        currentStepId: 'not-authored',
      },
    });

    expect(() => ExperienceEngine.resume(ASSESSMENT_EXPERIENCE_FIXTURE, corrupt)).toThrowError(
      expect.objectContaining<Partial<ExperienceCheckpointError>>({ code: 'invalid-checkpoint-state' }),
    );
  });

  it('returns immutable JSON-safe checkpoint data that callers cannot use to mutate engine truth', () => {
    const engine = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
    engine.submitOutcome('continue');
    engine.submitAssessment('Venus');
    const checkpoint = engine.checkpoint();

    expect(Object.isFrozen(checkpoint)).toBe(true);
    expect(Object.isFrozen(checkpoint.state)).toBe(true);
    expect(Object.isFrozen(checkpoint.events)).toBe(true);
    expect(serialize(checkpoint)).toEqual(checkpoint);
  });
});
