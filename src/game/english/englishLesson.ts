import type { ExperienceDefinition } from '../../core/experience/ExperienceDefinition';
import type {
  TutorCancellationToken,
  TutorOutput,
  TutorProvider,
  TutorRequest,
} from '../../core/tutor/TutorContract';

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

function output(
  text: string,
  options: {
    readonly mode?: 'speak-and-display' | 'display-only';
    readonly emotion?: 'neutral' | 'encouraging' | 'celebrating' | 'thinking';
    readonly action?: 'idle' | 'acknowledge' | 'celebrate';
  } = {},
): TutorOutput {
  return Object.freeze({
    narration: Object.freeze([
      Object.freeze({ text, mode: options.mode ?? ('speak-and-display' as const) }),
    ]),
    actorCues: Object.freeze([
      Object.freeze({ type: 'emotion' as const, emotion: options.emotion ?? ('encouraging' as const) }),
      Object.freeze({ type: 'move-to' as const, anchorId: 'english-companion-home' }),
      Object.freeze({ type: 'look-at' as const, anchorId: 'english-lesson-focus' }),
      Object.freeze({ type: 'action' as const, action: options.action ?? ('acknowledge' as const) }),
    ]),
  });
}

export const ENGLISH_INITIAL_TUTOR_OUTPUT = output(
  'Welcome to English World! Today we will listen, look, and learn one word together.',
);

/** Deterministic A6 tutor embodiment. A4 observation decides the response; it never decides correctness. */
export class EnglishLessonTutor implements TutorProvider {
  async generate(request: TutorRequest, cancellation: TutorCancellationToken): Promise<TutorOutput> {
    if (cancellation.cancelled) return output('', { mode: 'display-only', emotion: 'neutral', action: 'idle' });

    const { state, currentStep, events } = request.observation;
    const latest = events.at(-1);

    if (state.status === 'completed') {
      return output('You finished the first-word lesson. Great work!', {
        emotion: 'celebrating',
        action: 'celebrate',
      });
    }

    if (currentStep?.id === 'word-practice') {
      return output('This word is APPLE. Look at the letters, then choose it when you are ready.');
    }

    if (currentStep?.id === 'word-check') {
      if (latest?.type === 'hint-used') {
        return output('Hint: listen for the short A sound at the start.', {
          mode: 'display-only',
          emotion: 'thinking',
        });
      }
      if (latest?.type === 'assessment-submitted' && !latest.correct) {
        return output('Good try. Look again and choose the word APPLE.', {
          emotion: 'encouraging',
        });
      }
      return output('Which choice says APPLE? Pick the word you just practiced.');
    }

    if (currentStep?.id === 'celebrate') {
      return output('Yes — APPLE! You found the right word.', {
        emotion: 'celebrating',
        action: 'celebrate',
      });
    }

    if (currentStep?.id === 'review') {
      return output('That was a tough one. We will keep practicing APPLE together.', {
        mode: 'display-only',
        emotion: 'encouraging',
      });
    }

    return ENGLISH_INITIAL_TUTOR_OUTPUT;
  }
}
