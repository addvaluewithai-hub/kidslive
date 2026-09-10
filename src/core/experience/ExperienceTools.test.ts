import { describe, expect, it } from 'vitest';
import type { ExperienceDefinition } from './ExperienceDefinition';
import { ExperienceCommandError, ExperienceEngine } from './ExperienceEngine';
import { ASSESSMENT_EXPERIENCE_FIXTURE } from './fixtures';
import { validateExperience } from './validateExperience';

const TOOL_EXPERIENCE_FIXTURE: ExperienceDefinition = {
  id: 'a4-tool-demo',
  version: '1',
  initialStepId: 'explore',
  tools: [
    {
      id: 'highlight-object',
      kind: 'world-effect',
      parameters: [
        { id: 'target', type: 'string', required: true },
        { id: 'pulse', type: 'boolean', required: false },
      ],
    },
    {
      id: 'grant-badge-preview',
      kind: 'product-effect',
      parameters: [],
    },
  ],
  steps: [
    {
      id: 'explore',
      kind: 'activity',
      allowedToolIds: ['highlight-object'],
      transitions: [{ on: 'continue', to: 'wrap-up' }],
    },
    {
      id: 'wrap-up',
      kind: 'instruction',
      allowedToolIds: ['grant-badge-preview'],
      transitions: [{ on: 'finish', to: 'complete' }],
    },
  ],
};

describe('ExperienceEngine tool permission authority', () => {
  it('returns an immutable typed intent without executing host work', () => {
    const engine = ExperienceEngine.start(TOOL_EXPERIENCE_FIXTURE);

    const intent = engine.requestTool({
      toolId: 'highlight-object',
      stepId: 'explore',
      expectedRevision: 0,
      parameters: { target: 'planet-mercury', pulse: true },
    });

    expect(intent).toEqual({
      toolId: 'highlight-object',
      kind: 'world-effect',
      stepId: 'explore',
      parameters: { target: 'planet-mercury', pulse: true },
      revision: 1,
    });
    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.parameters)).toBe(true);
    expect(engine.state).toMatchObject({
      currentStepId: 'explore',
      status: 'running',
      revision: 1,
    });
    expect(engine.events.at(-1)).toEqual({
      type: 'tool-intent-approved',
      ...intent,
    });
  });

  it('rejects unknown, unauthorized, stale, and malformed requests without mutation', () => {
    const engine = ExperienceEngine.start(TOOL_EXPERIENCE_FIXTURE);

    const deniedRequests = [
      {
        toolId: 'grant-badge-preview',
        stepId: 'explore',
        expectedRevision: 0,
        parameters: {},
        code: 'tool-not-allowed',
      },
      {
        toolId: 'missing-tool',
        stepId: 'explore',
        expectedRevision: 0,
        parameters: {},
        code: 'unknown-tool',
      },
      {
        toolId: 'highlight-object',
        stepId: 'explore',
        expectedRevision: 0,
        parameters: {},
        code: 'invalid-tool-parameters',
      },
      {
        toolId: 'highlight-object',
        stepId: 'explore',
        expectedRevision: 0,
        parameters: { target: 42 },
        code: 'invalid-tool-parameters',
      },
      {
        toolId: 'highlight-object',
        stepId: 'wrong-step',
        expectedRevision: 0,
        parameters: { target: 'planet' },
        code: 'stale-tool-request',
      },
    ] as const;

    for (const request of deniedRequests) {
      const stateBefore = engine.state;
      const eventsBefore = engine.events;
      expect(() => engine.requestTool(request)).toThrowError(
        expect.objectContaining({ code: request.code }),
      );
      expect(engine.state).toEqual(stateBefore);
      expect(engine.events).toEqual(eventsBefore);
    }
  });

  it('uses revision and active-step identity to reject delayed host requests', () => {
    const engine = ExperienceEngine.start(TOOL_EXPERIENCE_FIXTURE);
    const staleRequest = {
      toolId: 'highlight-object',
      stepId: 'explore',
      expectedRevision: engine.state.revision,
      parameters: { target: 'planet-mercury' },
    } as const;

    engine.requestTool(staleRequest);
    expect(() => engine.requestTool(staleRequest)).toThrowError(
      expect.objectContaining({ code: 'stale-tool-request' }),
    );

    engine.submitOutcome('continue');
    const stateBefore = engine.state;
    expect(() =>
      engine.requestTool({
        toolId: 'highlight-object',
        stepId: 'explore',
        expectedRevision: engine.state.revision,
        parameters: { target: 'planet-mercury' },
      }),
    ).toThrowError(expect.objectContaining({ code: 'stale-tool-request' }));
    expect(engine.state).toEqual(stateBefore);
  });

  it('round-trips approved intent history through checkpoint resume', () => {
    const engine = ExperienceEngine.start(TOOL_EXPERIENCE_FIXTURE);
    engine.requestTool({
      toolId: 'highlight-object',
      stepId: 'explore',
      expectedRevision: 0,
      parameters: { target: 'planet-mercury' },
    });

    const stored = JSON.parse(JSON.stringify(engine.checkpoint())) as unknown;
    const resumed = ExperienceEngine.resume(TOOL_EXPERIENCE_FIXTURE, stored);

    expect(resumed.state).toEqual(engine.state);
    expect(resumed.events).toEqual(engine.events);
    resumed.submitOutcome('continue');
    expect(resumed.currentStep?.id).toBe('wrap-up');
  });
});

describe('experience tool and completion validation', () => {
  it('reports malformed declarations and undeclared step permissions with ids', () => {
    const definition: ExperienceDefinition = {
      id: 'bad-tools',
      version: '1',
      initialStepId: 'start',
      tools: [
        {
          id: 'duplicate',
          kind: 'world-effect',
          parameters: [
            { id: 'target', type: 'string', required: true },
            { id: 'target', type: 'string', required: false },
          ],
        },
        { id: 'duplicate', kind: 'product-effect', parameters: [] },
      ],
      steps: [
        {
          id: 'start',
          kind: 'activity',
          allowedToolIds: ['duplicate', 'duplicate', 'not-declared'],
          transitions: [{ on: 'finish', to: 'complete' }],
        },
      ],
    };

    expect(validateExperience(definition).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate-tool-parameter',
          toolId: 'duplicate',
          parameterId: 'target',
        }),
        expect.objectContaining({ code: 'duplicate-tool-id', toolId: 'duplicate' }),
        expect.objectContaining({
          code: 'duplicate-step-tool',
          stepId: 'start',
          toolId: 'duplicate',
        }),
        expect.objectContaining({
          code: 'undeclared-step-tool',
          stepId: 'start',
          toolId: 'not-declared',
        }),
      ]),
    );
  });

  it('rejects reachable graph regions that can never complete', () => {
    const definition: ExperienceDefinition = {
      id: 'endless-loop',
      version: '1',
      initialStepId: 'loop-a',
      steps: [
        {
          id: 'loop-a',
          kind: 'activity',
          transitions: [{ on: 'next', to: 'loop-b' }],
        },
        {
          id: 'loop-b',
          kind: 'activity',
          transitions: [{ on: 'again', to: 'loop-a' }],
        },
      ],
    };

    expect(validateExperience(definition).issues).toEqual([
      expect.objectContaining({ code: 'no-completion-path', stepId: 'loop-a' }),
      expect.objectContaining({ code: 'no-completion-path', stepId: 'loop-b' }),
    ]);
  });

  it('rejects contradictory assessment outcomes and duplicate normalized answers', () => {
    const assessment = ASSESSMENT_EXPERIENCE_FIXTURE.steps.find(
      (step) => step.kind === 'assessment',
    );
    if (assessment?.kind !== 'assessment') throw new Error('Fixture assessment is missing.');

    const definition: ExperienceDefinition = {
      ...ASSESSMENT_EXPERIENCE_FIXTURE,
      steps: ASSESSMENT_EXPERIENCE_FIXTURE.steps.map((step) =>
        step.id === assessment.id
          ? {
              ...assessment,
              assessment: {
                ...assessment.assessment,
                acceptedAnswers: [' Mercury ', 'mercury'],
                exhaustedOutcomeId: assessment.assessment.correctOutcomeId,
              },
            }
          : step,
      ),
    };

    expect(validateExperience(definition).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'assessment-invalid-accepted-answer',
          stepId: assessment.id,
        }),
        expect.objectContaining({
          code: 'assessment-conflicting-outcomes',
          stepId: assessment.id,
        }),
      ]),
    );
  });
});
