import { describe, expect, it } from 'vitest';
import type { ExperienceCommand, ExperienceDefinition } from './ExperienceDefinition';
import {
  ExperienceCheckpointError,
  type ExperienceCheckpointErrorCode,
} from './ExperienceCheckpoint';
import { ExperienceCommandError, ExperienceEngine } from './ExperienceEngine';
import { ASSESSMENT_EXPERIENCE_FIXTURE } from './fixtures';

function serialize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function dispatchCurrent(
  engine: ExperienceEngine,
  command: Omit<ExperienceCommand, 'stepId' | 'expectedRevision'>,
): void {
  const state = engine.state;
  if (state.currentStepId === null) throw new Error('Expected running experience.');
  engine.dispatch({ ...command, stepId: state.currentStepId, expectedRevision: state.revision } as ExperienceCommand);
}

function checkpointAfterHint(): ReturnType<ExperienceEngine['checkpoint']> {
  const engine = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
  dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'continue' });
  dispatchCurrent(engine, { type: 'submit-assessment', answer: 'Venus' });
  dispatchCurrent(engine, { type: 'use-hint', hintId: 'first-letter' });
  return engine.checkpoint();
}

function expectInvalid(checkpoint: unknown): void {
  expect(() => ExperienceEngine.resume(ASSESSMENT_EXPERIENCE_FIXTURE, checkpoint)).toThrowError(
    expect.objectContaining<Partial<ExperienceCheckpointError>>({ code: 'invalid-checkpoint-state' }),
  );
}

describe('ExperienceEngine checkpoints', () => {
  it('round-trips mid-assessment state and remains replay-equivalent', () => {
    const uninterrupted = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
    dispatchCurrent(uninterrupted, { type: 'submit-outcome', outcomeId: 'continue' });
    dispatchCurrent(uninterrupted, { type: 'submit-assessment', answer: 'Venus' });
    dispatchCurrent(uninterrupted, { type: 'use-hint', hintId: 'first-letter' });

    const resumed = ExperienceEngine.resume(
      ASSESSMENT_EXPERIENCE_FIXTURE,
      serialize(uninterrupted.checkpoint()),
    );
    expect(resumed.state).toEqual(uninterrupted.state);
    expect(resumed.events).toEqual(uninterrupted.events);

    for (const engine of [uninterrupted, resumed]) {
      dispatchCurrent(engine, { type: 'submit-assessment', answer: 'Mercury' });
      dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'finish' });
    }
    expect(resumed.state).toEqual(uninterrupted.state);
    expect(resumed.events).toEqual(uninterrupted.events);
  });

  it('resumes completion without replaying or accepting another command', () => {
    const engine = ExperienceEngine.start(ASSESSMENT_EXPERIENCE_FIXTURE);
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'continue' });
    dispatchCurrent(engine, { type: 'submit-assessment', answer: 'Mercury' });
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'finish' });
    const resumed = ExperienceEngine.resume(ASSESSMENT_EXPERIENCE_FIXTURE, serialize(engine.checkpoint()));
    expect(resumed.events).toEqual(engine.events);
    expect(() =>
      resumed.dispatch({
        type: 'submit-outcome',
        stepId: 'success',
        expectedRevision: 2,
        outcomeId: 'finish',
      }),
    ).toThrowError(expect.objectContaining<Partial<ExperienceCommandError>>({ code: 'experience-completed' }));
  });

  it('restart clears persisted authority and starts at revision zero', () => {
    const engine = ExperienceEngine.resume(
      ASSESSMENT_EXPERIENCE_FIXTURE,
      serialize(checkpointAfterHint()),
    );
    expect(engine.restart()).toEqual({
      experienceId: ASSESSMENT_EXPERIENCE_FIXTURE.id,
      experienceVersion: ASSESSMENT_EXPERIENCE_FIXTURE.version,
      status: 'running',
      currentStepId: 'prompt',
      assessments: [],
      revision: 0,
    });
    expect(engine.events).toHaveLength(1);
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'continue' });
    dispatchCurrent(engine, { type: 'submit-assessment', answer: 'Mercury' });
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
    'rejects %s',
    (_name, checkpoint, code: ExperienceCheckpointErrorCode) => {
      expect(() =>
        ExperienceEngine.resume(ASSESSMENT_EXPERIENCE_FIXTURE, serialize(checkpoint)),
      ).toThrowError(expect.objectContaining<Partial<ExperienceCheckpointError>>({ code }));
    },
  );

  it('rejects authored-version incompatibility', () => {
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

  it('rejects fabricated path/revision authority even when fields are structurally valid', () => {
    const checkpoint = checkpointAfterHint();
    expectInvalid({
      ...checkpoint,
      state: { ...checkpoint.state, currentStepId: 'success' },
    });
    expectInvalid({
      ...checkpoint,
      state: { ...checkpoint.state, revision: checkpoint.state.revision + 2 },
    });
  });

  it('rejects fabricated mastery, hints, event truth, and skipped transitions', () => {
    const checkpoint = checkpointAfterHint();
    const record = checkpoint.state.assessments[0];
    if (record === undefined) throw new Error('Expected assessment state.');

    expectInvalid({
      ...checkpoint,
      state: {
        ...checkpoint.state,
        assessments: [{ ...record, result: 'correct' }],
      },
    });
    expectInvalid({
      ...checkpoint,
      state: {
        ...checkpoint.state,
        assessments: [{ ...record, usedHintIds: [] }],
      },
    });
    expectInvalid({
      ...checkpoint,
      events: checkpoint.events.filter((event) => event.type !== 'step-transitioned'),
    });
    expectInvalid({
      ...checkpoint,
      events: checkpoint.events.map((event) =>
        event.type === 'assessment-submitted'
          ? { ...event, correct: true, result: 'correct' as const }
          : event,
      ),
    });
  });

  it('rejects an invented completion event and extra assessment state', () => {
    const checkpoint = checkpointAfterHint();
    expectInvalid({
      ...checkpoint,
      state: { ...checkpoint.state, status: 'completed', currentStepId: null },
      events: [
        ...checkpoint.events,
        {
          type: 'experience-completed',
          fromStepId: 'planet-check',
          outcomeId: 'correct',
          revision: checkpoint.state.revision,
        },
      ],
    });
    expectInvalid({
      ...checkpoint,
      state: {
        ...checkpoint.state,
        assessments: [
          ...checkpoint.state.assessments,
          { stepId: 'planet-check', attempts: [], usedHintIds: [], result: null },
        ],
      },
    });
  });

  it('keeps checkpoints immutable and JSON-safe', () => {
    const checkpoint = checkpointAfterHint();
    expect(Object.isFrozen(checkpoint)).toBe(true);
    expect(Object.isFrozen(checkpoint.state)).toBe(true);
    expect(Object.isFrozen(checkpoint.events)).toBe(true);
    expect(serialize(checkpoint)).toEqual(checkpoint);
  });
});
