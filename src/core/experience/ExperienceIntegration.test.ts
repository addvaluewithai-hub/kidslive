import { describe, expect, it } from 'vitest';
import type { ExperienceCommand, ExperienceToolRequest } from './ExperienceDefinition';
import { ExperienceEngine } from './ExperienceEngine';
import { COHESIVE_A4_EXPERIENCE_FIXTURE } from './fixtures';
import { validateExperience } from './validateExperience';

function expectRejectedWithoutMutation(
  engine: ExperienceEngine,
  action: () => unknown,
  code: string,
): void {
  const stateBefore = engine.state;
  const eventsBefore = engine.events;
  expect(action).toThrowError(expect.objectContaining({ code }));
  expect(engine.state).toEqual(stateBefore);
  expect(engine.events).toEqual(eventsBefore);
}

function runThroughHint(engine: ExperienceEngine): void {
  engine.dispatch({
    type: 'submit-outcome',
    stepId: 'welcome',
    expectedRevision: 0,
    outcomeId: 'practice',
  });

  const highlightRequest: ExperienceToolRequest = {
    toolId: 'highlight-object',
    stepId: 'practice',
    expectedRevision: 1,
    parameters: { target: 'planet-mercury' },
  };
  engine.requestTool(highlightRequest);
  expectRejectedWithoutMutation(
    engine,
    () => engine.requestTool(highlightRequest),
    'stale-tool-request',
  );
  expectRejectedWithoutMutation(
    engine,
    () =>
      engine.requestTool({
        toolId: 'record-celebration',
        stepId: 'practice',
        expectedRevision: 2,
        parameters: { reason: 'too-early' },
      }),
    'tool-not-allowed',
  );

  engine.dispatch({
    type: 'submit-outcome',
    stepId: 'practice',
    expectedRevision: 2,
    outcomeId: 'ready',
  });

  const firstAttempt: ExperienceCommand = {
    type: 'submit-assessment',
    stepId: 'planet-check',
    expectedRevision: 3,
    answer: 'Venus',
  };
  engine.dispatch(firstAttempt);
  expectRejectedWithoutMutation(
    engine,
    () => engine.dispatch(firstAttempt),
    'stale-command',
  );

  const hint: ExperienceCommand = {
    type: 'use-hint',
    stepId: 'planet-check',
    expectedRevision: 4,
    hintId: 'first-letter',
  };
  engine.dispatch(hint);
  expectRejectedWithoutMutation(engine, () => engine.dispatch(hint), 'stale-command');
}

function finishFromHint(engine: ExperienceEngine): void {
  engine.dispatch({
    type: 'submit-assessment',
    stepId: 'planet-check',
    expectedRevision: 5,
    answer: '  MERCURY ',
  });

  expectRejectedWithoutMutation(
    engine,
    () =>
      engine.requestTool({
        toolId: 'highlight-object',
        stepId: 'celebrate',
        expectedRevision: 6,
        parameters: { target: 'planet-mercury' },
      }),
    'tool-not-allowed',
  );

  engine.requestTool({
    toolId: 'record-celebration',
    stepId: 'celebrate',
    expectedRevision: 6,
    parameters: { reason: 'assessment-correct' },
  });
  engine.dispatch({
    type: 'submit-outcome',
    stepId: 'celebrate',
    expectedRevision: 7,
    outcomeId: 'finish',
  });
}

describe('A4 cohesive representative experience', () => {
  it('validates and runs branching, tools, retry, hint, checkpoint/resume, and completion coherently', () => {
    expect(validateExperience(COHESIVE_A4_EXPERIENCE_FIXTURE)).toEqual({
      valid: true,
      issues: [],
    });

    const interrupted = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    runThroughHint(interrupted);
    expect(interrupted.state).toMatchObject({
      currentStepId: 'planet-check',
      status: 'running',
      revision: 5,
      assessments: [
        {
          stepId: 'planet-check',
          result: 'retrying',
          usedHintIds: ['first-letter'],
          attempts: [{ attempt: 1, normalizedAnswer: 'venus', correct: false }],
        },
      ],
    });

    const stored = JSON.parse(JSON.stringify(interrupted.checkpoint())) as unknown;
    const resumed = ExperienceEngine.resume(COHESIVE_A4_EXPERIENCE_FIXTURE, stored);
    expect(resumed.state).toEqual(interrupted.state);
    expect(resumed.events).toEqual(interrupted.events);

    expectRejectedWithoutMutation(
      resumed,
      () =>
        resumed.dispatch({
          type: 'submit-assessment',
          stepId: 'planet-check',
          expectedRevision: 4,
          answer: 'Mercury',
        }),
      'stale-command',
    );

    finishFromHint(resumed);
    expect(resumed.state).toMatchObject({
      currentStepId: null,
      status: 'completed',
      revision: 8,
      assessments: [
        {
          stepId: 'planet-check',
          result: 'correct',
          usedHintIds: ['first-letter'],
          attempts: [
            { attempt: 1, correct: false, usedHintIds: [] },
            { attempt: 2, correct: true, usedHintIds: ['first-letter'] },
          ],
        },
      ],
    });

    expectRejectedWithoutMutation(
      resumed,
      () =>
        resumed.dispatch({
          type: 'submit-outcome',
          stepId: 'celebrate',
          expectedRevision: 7,
          outcomeId: 'finish',
        }),
      'experience-completed',
    );

    const uninterrupted = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    runThroughHint(uninterrupted);
    finishFromHint(uninterrupted);
    expect(resumed.state).toEqual(uninterrupted.state);
    expect(resumed.events).toEqual(uninterrupted.events);
    expect(resumed.events.map((event) => event.revision)).toEqual([
      0,
      1,
      1,
      2,
      3,
      3,
      4,
      5,
      6,
      6,
      7,
      8,
      8,
    ]);
  });

  it('restart discards prior authority and supports a clean alternate branch', () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    runThroughHint(engine);
    const staleBeforeRestart: ExperienceCommand = {
      type: 'submit-assessment',
      stepId: 'planet-check',
      expectedRevision: 5,
      answer: 'Mercury',
    };

    expect(engine.restart()).toEqual({
      experienceId: 'a4-cohesive-demo',
      experienceVersion: '1',
      status: 'running',
      currentStepId: 'welcome',
      assessments: [],
      revision: 0,
    });
    expect(engine.events).toEqual([
      expect.objectContaining({
        type: 'experience-started',
        stepId: 'welcome',
        revision: 0,
      }),
    ]);
    expectRejectedWithoutMutation(engine, () => engine.dispatch(staleBeforeRestart), 'stale-command');

    engine.dispatch({
      type: 'submit-outcome',
      stepId: 'welcome',
      expectedRevision: 0,
      outcomeId: 'ready',
    });
    engine.dispatch({
      type: 'submit-assessment',
      stepId: 'planet-check',
      expectedRevision: 1,
      answer: 'Mercury',
    });
    engine.requestTool({
      toolId: 'record-celebration',
      stepId: 'celebrate',
      expectedRevision: 2,
      parameters: { reason: 'clean-restart' },
    });
    engine.dispatch({
      type: 'submit-outcome',
      stepId: 'celebrate',
      expectedRevision: 3,
      outcomeId: 'finish',
    });

    expect(engine.state).toMatchObject({ status: 'completed', revision: 4 });
    expect(engine.events.some((event) => event.type === 'hint-used')).toBe(false);
    expect(engine.events.filter((event) => event.type === 'assessment-submitted')).toHaveLength(1);
  });

  it('keeps host-facing state, events, and approved parameters immutable', () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    engine.dispatch({
      type: 'submit-outcome',
      stepId: 'welcome',
      expectedRevision: 0,
      outcomeId: 'practice',
    });
    const intent = engine.requestTool({
      toolId: 'highlight-object',
      stepId: 'practice',
      expectedRevision: 1,
      parameters: { target: 'planet-mercury' },
    });

    expect(Object.isFrozen(engine.state)).toBe(true);
    expect(Object.isFrozen(engine.state.assessments)).toBe(true);
    expect(Object.isFrozen(engine.events)).toBe(true);
    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.parameters)).toBe(true);
    expect(JSON.parse(JSON.stringify(engine.checkpoint()))).toEqual(engine.checkpoint());
  });
});
