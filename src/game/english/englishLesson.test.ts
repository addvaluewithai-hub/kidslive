import { describe, expect, it } from 'vitest';
import { FakeActor } from '../../core/actors/FakeActor';
import { InstantSpeechAdapter, RecordingTextPresenter } from '../../core/tutor/TutorDeliveryDoubles';
import { FailingTutor } from '../../core/tutor/TutorResilienceDoubles';
import { TutorSession } from '../../core/tutor/TutorSession';
import { EnglishLessonFlow } from './EnglishLessonFlow';
import { EnglishLessonTutor, ENGLISH_INITIAL_TUTOR_OUTPUT, ENGLISH_LESSON } from './englishLesson';

function makeSession(flow: EnglishLessonFlow, provider = new EnglishLessonTutor()) {
  const actor = new FakeActor();
  const speech = new InstantSpeechAdapter();
  const text = new RecordingTextPresenter();
  const session = new TutorSession({
    sessionId: 'english-world:test',
    engine: flow.engine,
    persona: { personaId: 'companion', toneId: 'warm-guide', locale: 'en' },
    provider,
    actor,
    speech,
    text,
    voice: { voiceId: 'test-voice', locale: 'en' },
  });
  return { actor, speech, text, session };
}

function latestAssessmentEvent(flow: EnglishLessonFlow) {
  return [...flow.engine.events].reverse().find((event) => event.type === 'assessment-submitted');
}

describe('English World lesson composition', () => {
  it('starts a validated authored lesson and delivers the initial tutor turn through A5', async () => {
    const flow = new EnglishLessonFlow();
    const { actor, speech, text, session } = makeSession(flow);

    const result = await session.runTurn();

    expect(result.status).toBe('delivered');
    expect(flow.engine.state).toMatchObject({
      experienceId: 'english-first-words',
      currentStepId: 'welcome',
      revision: 0,
      status: 'running',
    });
    expect(text.presentations[0]?.text).toContain('Welcome to English World');
    expect(speech.requests).toHaveLength(1);
    expect(actor.currentAnchor?.id).toBe('english-companion-home');
    expect(actor.lookTarget).toEqual({ kind: 'anchor', id: 'english-lesson-focus' });
    expect(ENGLISH_INITIAL_TUTOR_OUTPUT.authorityProposal).toBeUndefined();

    session.dispose();
  });

  it('keeps wrong, hint, retry, normalization and completion under A4 authority', () => {
    const flow = new EnglishLessonFlow();
    flow.startPractice();
    expect(flow.view.phase).toBe('practice');
    flow.beginCheck();
    expect(flow.view).toMatchObject({ phase: 'check', attempts: 0, hintAvailable: false });

    flow.submitAnswer('pear');
    expect(flow.view).toMatchObject({ phase: 'check', attempts: 1, hintAvailable: true });
    expect(flow.engine.events.at(-1)).toMatchObject({
      type: 'assessment-submitted',
      correct: false,
      result: 'retrying',
    });

    flow.useHint();
    expect(flow.view).toMatchObject({ phase: 'check', attempts: 1, hintUsed: true, hintAvailable: false });

    flow.submitAnswer('  APPLE  ');
    expect(flow.view.phase).toBe('celebrate');
    expect(latestAssessmentEvent(flow)).toMatchObject({
      type: 'assessment-submitted',
      normalizedAnswer: 'apple',
      correct: true,
      result: 'correct',
    });

    flow.finish();
    expect(flow.view).toMatchObject({ phase: 'complete', completed: true, attempts: 2 });
    expect(flow.engine.state.status).toBe('completed');
  });

  it('routes exhausted attempts to authored review instead of letting tutor wording decide', () => {
    const flow = new EnglishLessonFlow();
    flow.startPractice();
    flow.beginCheck();
    flow.submitAnswer('pear');
    flow.submitAnswer('banana');
    flow.submitAnswer('pear');

    expect(flow.view).toMatchObject({ phase: 'review', attempts: 3 });
    expect(latestAssessmentEvent(flow)).toMatchObject({
      correct: false,
      result: 'exhausted',
    });
    expect(ENGLISH_LESSON.steps.find((step) => step.id === 'word-check')?.kind).toBe('assessment');
  });

  it('keeps learner progress usable when the tutor provider fails', async () => {
    const flow = new EnglishLessonFlow();
    const { session } = makeSession(flow, new FailingTutor(new Error('offline tutor')));

    const result = await session.runTurn();
    expect(result).toMatchObject({ status: 'failed', phase: 'provider', code: 'provider-failed' });

    flow.startPractice();
    flow.beginCheck();
    flow.submitAnswer('apple');
    expect(flow.view.phase).toBe('celebrate');

    session.dispose();
  });

  it('uses display-only guidance for hints without changing lesson authority', async () => {
    const flow = new EnglishLessonFlow();
    flow.startPractice();
    flow.beginCheck();
    flow.submitAnswer('pear');
    flow.useHint();
    const { speech, text, session } = makeSession(flow);

    const result = await session.runTurn();

    expect(result.status).toBe('delivered');
    expect(text.presentations.at(-1)?.text).toContain('short A sound');
    expect(speech.requests).toHaveLength(0);
    expect(flow.view).toMatchObject({ phase: 'check', hintUsed: true });

    session.dispose();
  });
});
