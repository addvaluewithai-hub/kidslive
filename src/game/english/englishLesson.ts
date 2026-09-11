import type { ExperienceDefinition } from '../../core/experience/ExperienceDefinition';
import type { TutorOutput } from '../../core/tutor/TutorContract';

export const ENGLISH_LESSON: ExperienceDefinition = {
  id: 'english-first-words',
  version: '1',
  initialStepId: 'welcome',
  steps: [
    {
      id: 'welcome',
      kind: 'instruction',
      transitions: [{ on: 'begin', to: 'word-practice' }],
    },
    {
      id: 'word-practice',
      kind: 'activity',
      transitions: [{ on: 'ready', to: 'word-check' }],
    },
    {
      id: 'word-check',
      kind: 'assessment',
      assessment: {
        acceptedAnswers: ['apple'],
        normalization: 'trim-casefold',
        maxAttempts: 3,
        correctOutcomeId: 'correct',
        exhaustedOutcomeId: 'review',
        hints: [
          {
            id: 'first-sound',
            body: 'Listen for the short A sound at the start.',
            availableAfterAttempt: 1,
          },
        ],
      },
      transitions: [
        { on: 'correct', to: 'celebrate' },
        { on: 'review', to: 'review' },
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
      transitions: [{ on: 'finish', to: 'complete' }],
    },
  ],
};

export const ENGLISH_INITIAL_TUTOR_OUTPUT: TutorOutput = Object.freeze({
  narration: Object.freeze([
    Object.freeze({
      text: 'Welcome to English World! Today we will listen, look, and learn one word together.',
      mode: 'speak-and-display' as const,
    }),
  ]),
  actorCues: Object.freeze([
    Object.freeze({ type: 'emotion' as const, emotion: 'encouraging' as const }),
    Object.freeze({ type: 'move-to' as const, anchorId: 'english-companion-home' }),
    Object.freeze({ type: 'look-at' as const, anchorId: 'english-lesson-focus' }),
    Object.freeze({ type: 'action' as const, action: 'acknowledge' as const }),
  ]),
});
