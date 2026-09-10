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
