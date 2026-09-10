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
