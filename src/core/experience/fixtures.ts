import type { ExperienceDefinition } from './ExperienceDefinition';

export const BRANCHING_EXPERIENCE_FIXTURE: ExperienceDefinition = {
  id: 'a4-branching-demo',
  version: '1',
  initialStepId: 'welcome',
  steps: [
    {
      id: 'welcome',
      kind: 'instruction',
      transitions: [{ on: 'continue', to: 'choose-path' }],
    },
    {
      id: 'choose-path',
      kind: 'activity',
      transitions: [
        { on: 'practice', to: 'practice' },
        { on: 'ready', to: 'wrap-up' },
      ],
    },
    {
      id: 'practice',
      kind: 'activity',
      transitions: [
        { on: 'again', to: 'practice' },
        { on: 'done', to: 'wrap-up' },
      ],
    },
    {
      id: 'wrap-up',
      kind: 'instruction',
      transitions: [{ on: 'finish', to: 'complete' }],
    },
  ],
};

export const ASSESSMENT_EXPERIENCE_FIXTURE: ExperienceDefinition = {
  id: 'a4-assessment-demo',
  version: '1',
  initialStepId: 'prompt',
  steps: [
    {
      id: 'prompt',
      kind: 'instruction',
      transitions: [{ on: 'continue', to: 'planet-check' }],
    },
    {
      id: 'planet-check',
      kind: 'assessment',
      assessment: {
        acceptedAnswers: ['Mercury'],
        normalization: 'trim-casefold',
        maxAttempts: 3,
        correctOutcomeId: 'correct',
        exhaustedOutcomeId: 'exhausted',
        hints: [
          {
            id: 'first-letter',
            body: 'The answer starts with M.',
            availableAfterAttempt: 1,
          },
        ],
      },
      transitions: [
        { on: 'correct', to: 'success' },
        { on: 'exhausted', to: 'review' },
      ],
    },
    {
      id: 'success',
      kind: 'instruction',
      transitions: [{ on: 'finish', to: 'complete' }],
    },
    {
      id: 'review',
      kind: 'instruction',
      transitions: [{ on: 'finish', to: 'complete' }],
    },
  ],
};

export const COHESIVE_A4_EXPERIENCE_FIXTURE: ExperienceDefinition = {
  id: 'a4-cohesive-demo',
  version: '1',
  initialStepId: 'welcome',
  tools: [
    {
      id: 'highlight-object',
      kind: 'world-effect',
      parameters: [{ id: 'target', type: 'string', required: true }],
    },
    {
      id: 'record-celebration',
      kind: 'product-effect',
      parameters: [{ id: 'reason', type: 'string', required: true }],
    },
  ],
  steps: [
    {
      id: 'welcome',
      kind: 'instruction',
      transitions: [
        { on: 'practice', to: 'practice' },
        { on: 'ready', to: 'planet-check' },
      ],
    },
    {
      id: 'practice',
      kind: 'activity',
      allowedToolIds: ['highlight-object'],
      transitions: [{ on: 'ready', to: 'planet-check' }],
    },
    {
      id: 'planet-check',
      kind: 'assessment',
      allowedToolIds: ['highlight-object'],
      assessment: {
        acceptedAnswers: ['Mercury'],
        normalization: 'trim-casefold',
        maxAttempts: 3,
        correctOutcomeId: 'correct',
        exhaustedOutcomeId: 'exhausted',
        hints: [
          {
            id: 'first-letter',
            body: 'The answer starts with M.',
            availableAfterAttempt: 1,
          },
        ],
      },
      transitions: [
        { on: 'correct', to: 'celebrate' },
        { on: 'exhausted', to: 'review' },
      ],
    },
    {
      id: 'review',
      kind: 'instruction',
      transitions: [{ on: 'finish', to: 'complete' }],
    },
    {
      id: 'celebrate',
      kind: 'instruction',
      allowedToolIds: ['record-celebration'],
      transitions: [{ on: 'finish', to: 'complete' }],
    },
  ],
};
