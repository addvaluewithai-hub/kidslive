import { describe, expect, it } from 'vitest';
import { FakeActor } from '../../core/actors/FakeActor';
import { ExperienceEngine } from '../../core/experience/ExperienceEngine';
import { ScriptedTutor } from '../../core/tutor/ScriptedTutor';
import { InstantSpeechAdapter, RecordingTextPresenter } from '../../core/tutor/TutorDeliveryDoubles';
import { TutorSession } from '../../core/tutor/TutorSession';
import { ENGLISH_INITIAL_TUTOR_OUTPUT, ENGLISH_LESSON } from './englishLesson';

describe('English World lesson composition', () => {
  it('starts a validated authored lesson and delivers the initial tutor turn through A5', async () => {
    const engine = ExperienceEngine.start(ENGLISH_LESSON);
    const actor = new FakeActor();
    const speech = new InstantSpeechAdapter();
    const text = new RecordingTextPresenter();
    const provider = new ScriptedTutor([ENGLISH_INITIAL_TUTOR_OUTPUT]);
    const session = new TutorSession({
      sessionId: 'english-world:test',
      engine,
      persona: { personaId: 'companion', toneId: 'warm-guide', locale: 'en' },
      provider,
      actor,
      speech,
      text,
      voice: { voiceId: 'test-voice', locale: 'en' },
    });

    const result = await session.runTurn();

    expect(result.status).toBe('delivered');
    expect(engine.state).toMatchObject({
      experienceId: 'english-first-words',
      currentStepId: 'welcome',
      revision: 0,
      status: 'running',
    });
    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0]?.observation.currentStep).toEqual({ id: 'welcome', kind: 'instruction' });
    expect(text.presentations[0]?.text).toContain('Welcome to English World');
    expect(speech.requests).toHaveLength(1);
    expect(actor.currentAnchor?.id).toBe('english-companion-home');
    expect(actor.lookTarget).toEqual({ kind: 'anchor', id: 'english-lesson-focus' });
    expect(actor.lastAction).toBe('greet');
    expect(actor.emotion).toBe('warm');

    session.dispose();
  });

  it('keeps assessment truth authored by A4 rather than the tutor output', () => {
    const engine = ExperienceEngine.start(ENGLISH_LESSON);
    expect(engine.events).toHaveLength(1);
    expect(ENGLISH_INITIAL_TUTOR_OUTPUT.authorityProposal).toBeUndefined();
    expect(ENGLISH_LESSON.steps.find((step) => step.id === 'word-check')?.kind).toBe('assessment');
  });
});
