import type { ExperienceState } from '../../core/experience/ExperienceDefinition';
import { ExperienceEngine } from '../../core/experience/ExperienceEngine';
import {
  EnglishSliceCompletionStore,
  englishSliceCompletion,
} from './EnglishSliceCompletion';
import { ENGLISH_LESSON } from './englishLesson';

export type EnglishLessonPhase =
  | 'welcome'
  | 'practice'
  | 'check'
  | 'celebrate'
  | 'review'
  | 'complete';

export interface EnglishLessonView {
  readonly phase: EnglishLessonPhase;
  readonly prompt: string;
  readonly feedback: string;
  readonly attempts: number;
  readonly hintAvailable: boolean;
  readonly hintUsed: boolean;
  readonly completed: boolean;
  readonly previouslyCompleted: boolean;
}

export class EnglishLessonFlow {
  readonly engine: ExperienceEngine;

  constructor(
    engine = ExperienceEngine.start(ENGLISH_LESSON),
    private readonly completion = englishSliceCompletion,
  ) {
    this.engine = engine;
  }

  get view(): EnglishLessonView {
    const state = this.engine.state;
    if (state.status === 'completed') {
      return {
        phase: 'complete',
        prompt: 'First word complete!',
        feedback: 'APPLE is in your word collection for this lesson.',
        attempts: this.attemptCount(state),
        hintAvailable: false,
        hintUsed: this.hintUsed(state),
        completed: true,
        previouslyCompleted: this.completion.completed,
      };
    }

    switch (state.currentStepId) {
      case 'welcome':
        return this.baseView(
          'welcome',
          this.completion.completed
            ? 'Welcome back! Your first English word is already shining on the planet.'
            : 'Ready to learn your first English word?',
          this.completion.completed
            ? 'Practice APPLE again whenever you like.'
            : 'Tap Start practice to begin.',
          state,
        );
      case 'word-practice':
        return this.baseView('practice', 'Look and say: APPLE', 'When you are ready, start the word check.', state);
      case 'word-check': {
        const attempts = this.attemptCount(state);
        const usedHint = this.hintUsed(state);
        return {
          phase: 'check',
          prompt: 'Which word says APPLE?',
          feedback: attempts === 0 ? 'Choose one answer.' : 'Not yet — try again.',
          attempts,
          hintAvailable: attempts >= 1 && !usedHint,
          hintUsed: usedHint,
          completed: false,
          previouslyCompleted: this.completion.completed,
        };
      }
      case 'celebrate':
        return this.baseView('celebrate', 'APPLE', 'Correct! You found the word.', state);
      case 'review':
        return this.baseView('review', 'APPLE', 'We will keep practicing this word together.', state);
      default:
        throw new Error(`Unexpected English lesson step: ${state.currentStepId ?? 'none'}`);
    }
  }

  startPractice(): ExperienceState {
    return this.submitOutcome('welcome', 'begin');
  }

  beginCheck(): ExperienceState {
    return this.submitOutcome('word-practice', 'ready');
  }

  submitAnswer(answer: string): ExperienceState {
    const state = this.engine.state;
    return this.engine.dispatch({
      type: 'submit-assessment',
      stepId: 'word-check',
      expectedRevision: state.revision,
      answer,
    });
  }

  useHint(): ExperienceState {
    const state = this.engine.state;
    return this.engine.dispatch({
      type: 'use-hint',
      stepId: 'word-check',
      expectedRevision: state.revision,
      hintId: 'first-sound',
    });
  }

  finish(): ExperienceState {
    const state = this.engine.state;
    if (state.currentStepId !== 'celebrate' && state.currentStepId !== 'review') {
      throw new Error(`Cannot finish English lesson from ${state.currentStepId ?? state.status}`);
    }
    const completedState = this.engine.dispatch({
      type: 'submit-outcome',
      stepId: state.currentStepId,
      expectedRevision: state.revision,
      outcomeId: 'finish',
    });
    this.completion.grantFromAuthoritativeState(completedState);
    return completedState;
  }

  private submitOutcome(stepId: string, outcomeId: string): ExperienceState {
    const state = this.engine.state;
    return this.engine.dispatch({
      type: 'submit-outcome',
      stepId,
      expectedRevision: state.revision,
      outcomeId,
    });
  }

  private attemptCount(state: ExperienceState): number {
    return state.assessments.find((record) => record.stepId === 'word-check')?.attempts.length ?? 0;
  }

  private hintUsed(state: ExperienceState): boolean {
    return state.assessments.find((record) => record.stepId === 'word-check')?.usedHintIds.includes('first-sound') ?? false;
  }

  private baseView(
    phase: EnglishLessonPhase,
    prompt: string,
    feedback: string,
    state: ExperienceState,
  ): EnglishLessonView {
    return {
      phase,
      prompt,
      feedback,
      attempts: this.attemptCount(state),
      hintAvailable: false,
      hintUsed: this.hintUsed(state),
      completed: false,
      previouslyCompleted: this.completion.completed,
    };
  }
}

export function createIsolatedEnglishLessonFlow(): EnglishLessonFlow {
  return new EnglishLessonFlow(undefined, new EnglishSliceCompletionStore());
}
