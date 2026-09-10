import { describe, expect, it } from 'vitest';
import type {
  ExperienceCommand,
  ExperienceDefinition,
  ExperienceToolRequest,
} from './ExperienceDefinition';
import { ExperienceEngine } from './ExperienceEngine';
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
        { id: 'strength', type: 'number', required: false },
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

function dispatchCurrent(
  engine: ExperienceEngine,
  command: Omit<ExperienceCommand, 'stepId' | 'expectedRevision'>,
): void {
  const state = engine.state;
  if (state.currentStepId === null) throw new Error('Expected running experience.');
  engine.dispatch({ ...command, stepId: state.currentStepId, expectedRevision: state.revision } as ExperienceCommand);
}

function expectDenied(engine: ExperienceEngine, request: ExperienceToolRequest, code: string): void {
  const state = engine.state;
  const events = engine.events;
  expect(() => engine.requestTool(request)).toThrowError(expect.objectContaining({ code }));
  expect(engine.state).toEqual(state);
  expect(engine.events).toEqual(events);
}

describe('ExperienceEngine tool permission authority', () => {
  it('returns an immutable typed intent without executing host work', () => {
    const engine = ExperienceEngine.start(TOOL_EXPERIENCE_FIXTURE);
    const intent = engine.requestTool({
      toolId: 'highlight-object',
      stepId: 'explore',
      expectedRevision: 0,
      parameters: { target: 'planet-mercury', pulse: true, strength: 0.75 },
    });
    expect(intent).toEqual({
      toolId: 'highlight-object',
      kind: 'world-effect',
      stepId: 'explore',
      parameters: { target: 'planet-mercury', pulse: true, strength: 0.75 },
      revision: 1,
    });
    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.parameters)).toBe(true);
    expect(JSON.parse(JSON.stringify(intent))).toEqual(intent);
  });

  it('rejects unknown, unauthorized, stale, malformed, and non-finite requests without mutation', () => {
    const engine = ExperienceEngine.start(TOOL_EXPERIENCE_FIXTURE);
    const denied: readonly [ExperienceToolRequest, string][] = [
      [
        {
          toolId: 'grant-badge-preview',
          stepId: 'explore',
          expectedRevision: 0,
          parameters: {},
        },
        'tool-not-allowed',
      ],
      [
        {
          toolId: 'missing-tool',
          stepId: 'explore',
          expectedRevision: 0,
          parameters: {},
        },
        'unknown-tool',
      ],
      [
        {
          toolId: 'highlight-object',
          stepId: 'explore',
          expectedRevision: 0,
          parameters: {},
        },
        'invalid-tool-parameters',
      ],
      [
        {
          toolId: 'highlight-object',
          stepId: 'explore',
          expectedRevision: 0,
          parameters: { target: 'planet', strength: Number.NaN },
        },
        'invalid-tool-parameters',
      ],
      [
        {
          toolId: 'highlight-object',
          stepId: 'explore',
          expectedRevision: 0,
          parameters: { target: 'planet', strength: Number.POSITIVE_INFINITY },
        },
        'invalid-tool-parameters',
      ],
      [
        {
          toolId: 'highlight-object',
          stepId: 'wrong-step',
          expectedRevision: 0,
          parameters: { target: 'planet' },
        },
        'stale-tool-request',
      ],
    ];
    for (const [request, code] of denied) expectDenied(engine, request, code);
  });

  it('rejects duplicate and delayed tool requests through step/revision authority', () => {
    const engine = ExperienceEngine.start(TOOL_EXPERIENCE_FIXTURE);
    const request: ExperienceToolRequest = {
      toolId: 'highlight-object',
      stepId: 'explore',
      expectedRevision: 0,
      parameters: { target: 'planet-mercury' },
    };
    engine.requestTool(request);
    expectDenied(engine, request, 'stale-tool-request');
    dispatchCurrent(engine, { type: 'submit-outcome', outcomeId: 'continue' });
    expectDenied(
      engine,
      {
        toolId: 'highlight-object',
        stepId: 'explore',
        expectedRevision: engine.state.revision,
        parameters: { target: 'planet-mercury' },
      },
      'stale-tool-request',
    );
  });

  it('round-trips approved intent history through semantic checkpoint resume', () => {
    const engine = ExperienceEngine.start(TOOL_EXPERIENCE_FIXTURE);
    engine.requestTool({
      toolId: 'highlight-object',
      stepId: 'explore',
      expectedRevision: 0,
      parameters: { target: 'planet-mercury', strength: 1 },
    });
    const resumed = ExperienceEngine.resume(
      TOOL_EXPERIENCE_FIXTURE,
      JSON.parse(JSON.stringify(engine.checkpoint())) as unknown,
    );
    expect(resumed.state).toEqual(engine.state);
    expect(resumed.events).toEqual(engine.events);
    dispatchCurrent(resumed, { type: 'submit-outcome', outcomeId: 'continue' });
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
        expect.objectContaining({ code: 'duplicate-tool-parameter', toolId: 'duplicate' }),
        expect.objectContaining({ code: 'duplicate-tool-id', toolId: 'duplicate' }),
        expect.objectContaining({ code: 'duplicate-step-tool', stepId: 'start' }),
        expect.objectContaining({ code: 'undeclared-step-tool', toolId: 'not-declared' }),
      ]),
    );
  });

  it('rejects reachable graph regions that can never complete', () => {
    const definition: ExperienceDefinition = {
      id: 'endless-loop',
      version: '1',
      initialStepId: 'loop-a',
      steps: [
        { id: 'loop-a', kind: 'activity', transitions: [{ on: 'next', to: 'loop-b' }] },
        { id: 'loop-b', kind: 'activity', transitions: [{ on: 'again', to: 'loop-a' }] },
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
        expect.objectContaining({ code: 'assessment-invalid-accepted-answer', stepId: assessment.id }),
        expect.objectContaining({ code: 'assessment-conflicting-outcomes', stepId: assessment.id }),
      ]),
    );
  });
});
