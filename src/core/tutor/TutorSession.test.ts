import { describe, expect, it } from 'vitest';
import { FakeActor } from '../actors/FakeActor';
import { ExperienceEngine } from '../experience/ExperienceEngine';
import { COHESIVE_A4_EXPERIENCE_FIXTURE } from '../experience/fixtures';
import { RecordingTutorAuthorityAudit } from './TutorAuthorityBridge';
import type {
  TutorCancellationToken,
  TutorOutput,
  TutorProvider,
  TutorRequest,
} from './TutorContract';
import {
  ManualSpeechAdapter,
  RecordingTextPresenter,
} from './TutorDeliveryDoubles';
import { RecordingTutorDiagnostics } from './TutorResilienceDoubles';
import { TutorSession } from './TutorSession';

type SequenceEntry = TutorOutput | Error;

class SequenceTutor implements TutorProvider {
  readonly requests: TutorRequest[] = [];
  private index = 0;

  constructor(private readonly entries: readonly SequenceEntry[]) {}

  generate(request: TutorRequest, cancellation: TutorCancellationToken): Promise<TutorOutput> {
    this.requests.push(request);
    if (cancellation.cancelled) {
      return Promise.reject(new Error(cancellation.reason ?? 'Tutor request cancelled'));
    }
    const entry = this.entries[this.index++];
    if (entry === undefined) return Promise.reject(new Error('SequenceTutor exhausted.'));
    return entry instanceof Error ? Promise.reject(entry) : Promise.resolve(entry);
  }
}

function output(
  text: string,
  authorityProposal?: TutorOutput['authorityProposal'],
  options: {
    readonly speak?: boolean;
    readonly actorCues?: TutorOutput['actorCues'];
  } = {},
): TutorOutput {
  return {
    narration: [{ text, mode: options.speak ? 'speak-and-display' : 'display-only' }],
    actorCues: options.actorCues ?? [],
    ...(authorityProposal === undefined ? {} : { authorityProposal }),
  };
}

async function flushAsyncDelivery(): Promise<void> {
  for (let index = 0; index < 6; index += 1) await Promise.resolve();
}

describe('TutorSession cohesive A5 integration', () => {
  it('coordinates narration, actor work, guarded authority, interruption, failure recovery, completion, and disposal', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const actor = new FakeActor();
    const speech = new ManualSpeechAdapter();
    const text = new RecordingTextPresenter();
    const diagnostics = new RecordingTutorDiagnostics();
    const authorityAudit = new RecordingTutorAuthorityAudit();
    const provider = new SequenceTutor([
      output(
        'Let us warm up first.',
        { type: 'submit-outcome', stepId: 'welcome', expectedRevision: 0, outcomeId: 'practice' },
        { actorCues: [{ type: 'emotion', emotion: 'encouraging' }] },
      ),
      output(
        'Watch the planet glow.',
        {
          type: 'request-tool',
          stepId: 'practice',
          expectedRevision: 1,
          toolId: 'highlight-object',
          parameters: { target: 'mercury' },
        },
        { actorCues: [{ type: 'move-to', anchorId: 'mercury' }] },
      ),
      output('I can explain that again.', undefined, { speak: true }),
      new Error('deterministic provider outage'),
      output('Ready for the check?', {
        type: 'submit-outcome',
        stepId: 'practice',
        expectedRevision: 2,
        outcomeId: 'ready',
      }),
      output('Try that answer.', {
        type: 'submit-assessment',
        stepId: 'planet-check',
        expectedRevision: 3,
        answer: 'Venus',
      }),
      output('Here is one clue.', {
        type: 'use-hint',
        stepId: 'planet-check',
        expectedRevision: 4,
        hintId: 'first-letter',
      }),
      output('Now try once more.', {
        type: 'submit-assessment',
        stepId: 'planet-check',
        expectedRevision: 5,
        answer: '  mercury  ',
      }),
      output(
        'You found Mercury!',
        {
          type: 'request-tool',
          stepId: 'celebrate',
          expectedRevision: 6,
          toolId: 'record-celebration',
          parameters: { reason: 'mastery' },
        },
        { actorCues: [{ type: 'action', action: 'celebrate' }] },
      ),
      output(
        'Mission complete.',
        { type: 'submit-outcome', stepId: 'celebrate', expectedRevision: 7, outcomeId: 'finish' },
        { speak: true, actorCues: [{ type: 'emotion', emotion: 'celebrating' }] },
      ),
    ]);

    const mutablePersona = { personaId: 'guide-a', toneId: 'warm', locale: 'en-US' };
    const mutableVoice = { voiceId: 'voice-a', locale: 'en-US' };
    const session = new TutorSession({
      sessionId: 'cohesive-a5',
      engine,
      persona: mutablePersona,
      provider,
      actor,
      speech,
      text,
      voice: mutableVoice,
      diagnostics,
      authorityAudit,
    });

    mutablePersona.personaId = 'mutated-after-start';
    mutableVoice.voiceId = 'mutated-after-start';

    await expect(session.runTurn()).resolves.toMatchObject({ status: 'delivered' });
    expect(engine.state).toMatchObject({ currentStepId: 'practice', revision: 1 });
    expect(actor.emotion).toBe('warm');

    await expect(session.runTurn()).resolves.toMatchObject({ status: 'delivered' });
    expect(engine.state).toMatchObject({ currentStepId: 'practice', revision: 2 });
    expect(actor.currentAnchor).toEqual({ kind: 'anchor', id: 'mercury' });

    const interrupted = session.runTurn();
    await flushAsyncDelivery();
    expect(speech.requests.at(-1)?.text).toBe('I can explain that again.');
    expect(session.cancelActiveTurn('learner started answering')).toBe(true);
    await expect(interrupted).resolves.toMatchObject({
      status: 'cancelled',
      reason: 'learner started answering',
    });
    expect(engine.state.revision).toBe(2);

    await expect(session.runTurn()).resolves.toMatchObject({
      status: 'failed',
      phase: 'provider',
      code: 'provider-failed',
      recoverable: true,
    });
    expect(engine.state.revision).toBe(2);

    await expect(session.runTurn()).resolves.toMatchObject({ status: 'delivered' });
    expect(engine.state).toMatchObject({ currentStepId: 'planet-check', revision: 3 });

    await expect(session.runTurn()).resolves.toMatchObject({ status: 'delivered' });
    expect(engine.state).toMatchObject({ currentStepId: 'planet-check', revision: 4 });
    expect(engine.state.assessments[0]?.attempts[0]).toMatchObject({ answer: 'Venus', correct: false });

    await expect(session.runTurn()).resolves.toMatchObject({ status: 'delivered' });
    expect(engine.state).toMatchObject({ currentStepId: 'planet-check', revision: 5 });
    expect(engine.state.assessments[0]?.usedHintIds).toEqual(['first-letter']);

    await expect(session.runTurn()).resolves.toMatchObject({ status: 'delivered' });
    expect(engine.state).toMatchObject({ currentStepId: 'celebrate', revision: 6 });
    expect(engine.state.assessments[0]?.attempts.at(-1)).toMatchObject({ correct: true });

    await expect(session.runTurn()).resolves.toMatchObject({ status: 'delivered' });
    expect(engine.state).toMatchObject({ currentStepId: 'celebrate', revision: 7 });
    expect(actor.lastAction).toBe('celebrate');

    const finishing = session.runTurn();
    await flushAsyncDelivery();
    expect(engine.state).toMatchObject({ status: 'completed', currentStepId: null, revision: 8 });
    expect(speech.requests.at(-1)).toMatchObject({
      text: 'Mission complete.',
      voice: { voiceId: 'voice-a', locale: 'en-US' },
    });

    await expect(session.runTurn()).rejects.toMatchObject({ code: 'session-completed' });
    await expect(finishing).resolves.toMatchObject({ status: 'cancelled' });
    expect(session.sessionStatus).toBe('completed');
    expect(speech.interruptions.at(-1)).toBe('Authoritative experience completed');

    expect(provider.requests.map((request) => request.observation.state.revision)).toEqual([
      0, 1, 2, 2, 2, 3, 4, 5, 6, 7,
    ]);
    expect(provider.requests.every((request) => request.persona.personaId === 'guide-a')).toBe(true);
    expect(authorityAudit.entries).toHaveLength(8);
    expect(authorityAudit.entries.every((entry) => entry.result.status !== 'rejected')).toBe(true);
    expect(diagnostics.events.some((event) => event.type === 'turn-failed' && event.code === 'provider-failed')).toBe(true);
    expect(diagnostics.events.some((event) => event.type === 'turn-cancelled')).toBe(true);
    expect(JSON.parse(JSON.stringify(authorityAudit.entries))).toEqual(authorityAudit.entries);

    const frozenState = JSON.parse(JSON.stringify(engine.state));
    const frozenEvents = JSON.parse(JSON.stringify(engine.events));
    session.dispose('place lifecycle ended');
    expect(session.sessionStatus).toBe('disposed');
    await expect(session.runTurn()).rejects.toMatchObject({ code: 'session-disposed' });
    expect(JSON.parse(JSON.stringify(engine.state))).toEqual(frozenState);
    expect(JSON.parse(JSON.stringify(engine.events))).toEqual(frozenEvents);
  });
});
