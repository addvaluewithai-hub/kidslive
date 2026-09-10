import { describe, expect, it } from 'vitest';
import type { ExperienceDefinition } from './ExperienceDefinition';
import { ExperienceEngine } from './ExperienceEngine';

function mutableDefinition(): ExperienceDefinition {
  return {
    id: 'mutable-definition',
    version: '1',
    initialStepId: 'start',
    tools: [
      {
        id: 'pulse',
        kind: 'world-effect',
        parameters: [{ id: 'amount', type: 'number', required: true }],
      },
    ],
    steps: [
      {
        id: 'start',
        kind: 'assessment',
        allowedToolIds: ['pulse'],
        assessment: {
          acceptedAnswers: ['safe'],
          normalization: 'trim-casefold',
          maxAttempts: 2,
          correctOutcomeId: 'correct',
          exhaustedOutcomeId: 'wrong',
          hints: [{ id: 'hint', body: 'Starts with s', availableAfterAttempt: 1 }],
        },
        transitions: [
          { on: 'correct', to: 'complete' },
          { on: 'wrong', to: 'complete' },
        ],
      },
    ],
  };
}

describe('ExperienceEngine authored-definition isolation', () => {
  it('uses a defensive frozen snapshot after start even if caller data mutates', () => {
    const definition = mutableDefinition();
    const engine = ExperienceEngine.start(definition);
    const step = definition.steps[0];
    if (step?.kind !== 'assessment') throw new Error('Expected assessment fixture.');

    (step.assessment.acceptedAnswers as string[])[0] = 'tampered';
    (step.transitions as { on: string; to: string }[])[0] = {
      on: 'correct',
      to: 'missing',
    };
    (step.allowedToolIds as string[]).splice(0);
    ((definition.tools?.[0]?.parameters ?? []) as { id: string; type: string; required: boolean }[])[0] = {
      id: 'amount',
      type: 'string',
      required: true,
    };

    engine.requestTool({
      toolId: 'pulse',
      stepId: 'start',
      expectedRevision: 0,
      parameters: { amount: 1 },
    });
    engine.dispatch({
      type: 'submit-assessment',
      stepId: 'start',
      expectedRevision: 1,
      answer: ' SAFE ',
    });

    expect(engine.state).toMatchObject({ status: 'completed', revision: 2 });
    expect(engine.state.assessments[0]).toMatchObject({ result: 'correct' });
  });

  it('isolates resume from caller mutation before restoring authority', () => {
    const original = mutableDefinition();
    const running = ExperienceEngine.start(original);
    running.dispatch({
      type: 'submit-assessment',
      stepId: 'start',
      expectedRevision: 0,
      answer: 'not-yet',
    });
    const checkpoint = JSON.parse(JSON.stringify(running.checkpoint())) as unknown;

    const resumeDefinition = mutableDefinition();
    const resumed = ExperienceEngine.resume(resumeDefinition, checkpoint);
    const step = resumeDefinition.steps[0];
    if (step?.kind !== 'assessment') throw new Error('Expected assessment fixture.');
    (step.assessment.acceptedAnswers as string[])[0] = 'tampered';

    resumed.dispatch({
      type: 'submit-assessment',
      stepId: 'start',
      expectedRevision: 1,
      answer: 'safe',
    });
    expect(resumed.state.assessments[0]).toMatchObject({ result: 'correct' });
  });
});
