import { describe, expect, it } from 'vitest';
import { EnglishLessonFlow } from './EnglishLessonFlow';
import {
  ENGLISH_SLICE_GRANT_ID,
  ENGLISH_SLICE_WORLD_CHANGE_ID,
  EnglishSliceCompletionStore,
} from './EnglishSliceCompletion';

describe('A6 cohesive English slice journey', () => {
  it('keeps learning authority, retry/hint state, completion grant and re-entry coherent end to end', () => {
    const completion = new EnglishSliceCompletionStore();
    const lesson = new EnglishLessonFlow(undefined, completion);

    expect(lesson.view.phase).toBe('welcome');
    expect(lesson.view.previouslyCompleted).toBe(false);
    expect(completion.receipt).toBeUndefined();

    lesson.startPractice();
    expect(lesson.view.phase).toBe('practice');
    lesson.beginCheck();
    expect(lesson.view.phase).toBe('check');

    lesson.submitAnswer('pear');
    expect(lesson.view).toMatchObject({ phase: 'check', attempts: 1, hintAvailable: true });
    expect(completion.receipt).toBeUndefined();

    lesson.useHint();
    expect(lesson.view).toMatchObject({ phase: 'check', attempts: 1, hintUsed: true, hintAvailable: false });
    expect(completion.receipt).toBeUndefined();

    lesson.submitAnswer('  APPLE  ');
    expect(lesson.view).toMatchObject({ phase: 'celebrate', attempts: 2, hintUsed: true });
    expect(completion.receipt).toBeUndefined();

    const completedState = lesson.finish();
    expect(completedState.status).toBe('completed');
    expect(lesson.view.phase).toBe('complete');
    expect(completion.receipt).toMatchObject({
      grantId: ENGLISH_SLICE_GRANT_ID,
      worldChangeId: ENGLISH_SLICE_WORLD_CHANGE_ID,
      completedRevision: completedState.revision,
    });

    const receipt = completion.receipt;
    expect(receipt).toBeDefined();
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(completion.grantFromAuthoritativeState(completedState)).toBe(receipt);

    const reentry = new EnglishLessonFlow(undefined, completion);
    expect(reentry.view).toMatchObject({
      phase: 'welcome',
      completed: false,
      previouslyCompleted: true,
    });
    expect(reentry.view.prompt).toContain('Welcome back');
    expect(completion.receipt).toBe(receipt);
  });
});
