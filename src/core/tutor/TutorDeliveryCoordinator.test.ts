import { describe, expect, it } from 'vitest';
import { FakeActor } from '../actors/FakeActor';
import { ExperienceEngine } from '../experience/ExperienceEngine';
import { COHESIVE_A4_EXPERIENCE_FIXTURE } from '../experience/fixtures';
import { ScriptedTutor } from './ScriptedTutor';
import type { TutorOutput } from './TutorContract';
import { TutorDeliveryCoordinator } from './TutorDeliveryCoordinator';
import {
  FailingSpeechAdapter,
  InstantSpeechAdapter,
  ManualSpeechAdapter,
  RecordingTextPresenter,
} from './TutorDeliveryDoubles';
import { TutorOrchestrator } from './TutorOrchestrator';

const VOICE = { voiceId: 'voice-warm-1', locale: 'en-US' } as const;

function createRuntime(output: TutorOutput, speech = new InstantSpeechAdapter(), actor = new FakeActor()) {
  const text = new RecordingTextPresenter();
  const host = new TutorDeliveryCoordinator({ actor, speech, text, voice: VOICE });
  const orchestrator = new TutorOrchestrator({
    sessionId: 'session-delivery',
    persona: { personaId: 'companion-default', toneId: 'warm-guide', locale: 'en-US' },
    provider: new ScriptedTutor([output]),
    host,
  });
  const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
  return { actor, engine, host, orchestrator, speech, text };
}

describe('TutorDeliveryCoordinator', () => {
  it('coordinates bounded actor cues, visible text, and replaceable speech end to end', async () => {
    const output: TutorOutput = {
      actorCues: [
        { type: 'move-to', anchorId: 'practice-board' },
        { type: 'look-at', anchorId: 'learner-focus' },
        { type: 'emotion', emotion: 'encouraging' },
        { type: 'action', action: 'acknowledge' },
      ],
      narration: [
        { text: 'Look at the board with me.', mode: 'display-only' },
        { text: 'Now we can try it together.', mode: 'speak-and-display' },
      ],
    };
    const runtime = createRuntime(output);

    await expect(runtime.orchestrator.runTurn(runtime.engine)).resolves.toMatchObject({ status: 'delivered' });

    expect(runtime.actor.currentAnchor).toEqual({ kind: 'anchor', id: 'practice-board' });
    expect(runtime.actor.lookTarget).toEqual({ kind: 'anchor', id: 'learner-focus' });
    expect(runtime.actor.emotion).toBe('warm');
    expect(runtime.actor.lastAction).toBe('greet');
    expect(runtime.text.presentations).toEqual([
      {
        turnId: 'session-delivery:turn:1',
        text: 'Look at the board with me.',
        mode: 'display-only',
      },
      {
        turnId: 'session-delivery:turn:1',
        text: 'Now we can try it together.',
        mode: 'speak-and-display',
      },
    ]);
    expect(runtime.speech.requests).toEqual([
      {
        turnId: 'session-delivery:turn:1',
        text: 'Now we can try it together.',
        voice: VOICE,
      },
    ]);
    expect(runtime.engine.state).toMatchObject({ currentStepId: 'welcome', revision: 0 });
  });

  it('supersedes slow speech and prevents late completion from reviving an old turn', async () => {
    const first: TutorOutput = {
      actorCues: [{ type: 'emotion', emotion: 'thinking' }],
      narration: [
        { text: 'First turn speaking slowly.', mode: 'speak-and-display' },
        { text: 'This stale line must never appear.', mode: 'display-only' },
      ],
    };
    const second: TutorOutput = {
      actorCues: [{ type: 'emotion', emotion: 'celebrating' }],
      narration: [{ text: 'Fresh turn wins.', mode: 'speak-and-display' }],
    };
    const speech = new ManualSpeechAdapter();
    const actor = new FakeActor();
    const text = new RecordingTextPresenter();
    const host = new TutorDeliveryCoordinator({ actor, speech, text, voice: VOICE });
    const orchestrator = new TutorOrchestrator({
      sessionId: 'session-delivery',
      persona: { personaId: 'companion-default', toneId: 'warm-guide', locale: 'en-US' },
      provider: new ScriptedTutor([first, second]),
      host,
    });
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);

    const firstTurn = orchestrator.runTurn(engine);
    await Promise.resolve();
    expect(speech.requests[0]?.text).toBe('First turn speaking slowly.');

    const secondTurn = orchestrator.runTurn(engine);
    await Promise.resolve();

    await expect(firstTurn).resolves.toEqual({
      status: 'cancelled',
      turnId: 'session-delivery:turn:1',
      reason: 'Tutor turn superseded by a newer turn',
    });
    expect(text.clearedTurnIds).toEqual(['session-delivery:turn:1']);
    expect(speech.interruptions).toEqual(['Tutor turn superseded by a newer turn']);
    expect(text.presentations.map((item) => item.text)).not.toContain('This stale line must never appear.');
    expect(speech.complete()).toBe(true);
    await expect(secondTurn).resolves.toMatchObject({ status: 'delivered' });
    expect(actor.emotion).toBe('excited');
    expect(text.presentations.at(-1)?.text).toBe('Fresh turn wins.');
    expect(host.activeTurnId).toBeNull();
  });

  it('explicit interruption cancels pending actor work before narration begins', async () => {
    const output: TutorOutput = {
      actorCues: [{ type: 'action', action: 'celebrate' }],
      narration: [{ text: 'You did it!', mode: 'speak-and-display' }],
    };
    const actor = new FakeActor({ manualActions: true });
    const runtime = createRuntime(output, new InstantSpeechAdapter(), actor);

    const turn = runtime.orchestrator.runTurn(runtime.engine);
    await Promise.resolve();
    expect(actor.commands[0]).toEqual({ type: 'perform', action: 'celebrate' });
    expect(runtime.orchestrator.cancelActiveTurn('learner spoke')).toBe(true);

    await expect(turn).resolves.toEqual({
      status: 'cancelled',
      turnId: 'session-delivery:turn:1',
      reason: 'learner spoke',
    });
    expect(runtime.text.presentations).toEqual([]);
    expect(runtime.speech.requests).toEqual([]);
    expect(actor.commands).toContainEqual({ type: 'interrupt', reason: 'learner spoke' });
    expect(runtime.engine.state.revision).toBe(0);
  });

  it('keeps display-only narration independent from speech availability', async () => {
    const output: TutorOutput = {
      actorCues: [],
      narration: [{ text: 'Readable even without audio.', mode: 'display-only' }],
    };
    const runtime = createRuntime(output, new FailingSpeechAdapter());

    await expect(runtime.orchestrator.runTurn(runtime.engine)).resolves.toMatchObject({ status: 'delivered' });
    expect(runtime.text.presentations[0]?.text).toBe('Readable even without audio.');
    expect(runtime.speech.requests).toEqual([]);
  });

  it('fails a speech delivery deterministically without hanging or changing A4 authority', async () => {
    const output: TutorOutput = {
      actorCues: [{ type: 'emotion', emotion: 'encouraging' }],
      narration: [{ text: 'This adapter will fail.', mode: 'speak-and-display' }],
    };
    const speech = new FailingSpeechAdapter(new Error('speech-offline'));
    const runtime = createRuntime(output, speech);

    await expect(runtime.orchestrator.runTurn(runtime.engine)).rejects.toThrow('speech-offline');
    expect(runtime.host.activeTurnId).toBeNull();
    expect(runtime.text.presentations[0]?.text).toBe('This adapter will fail.');
    expect(runtime.engine.state).toMatchObject({ currentStepId: 'welcome', revision: 0 });
  });

  it('snapshots voice configuration so caller mutation cannot change an active delivery', async () => {
    const voice = { voiceId: 'voice-original', locale: 'en-US' };
    const speech = new InstantSpeechAdapter();
    const text = new RecordingTextPresenter();
    const actor = new FakeActor();
    const host = new TutorDeliveryCoordinator({ actor, speech, text, voice });
    voice.voiceId = 'voice-mutated';

    await host.publish({
      sessionId: 'session-delivery',
      turnId: 'session-delivery:turn:1',
      requestId: 'session-delivery:turn:1:request:1',
      output: {
        actorCues: [],
        narration: [{ text: 'Stable voice config.', mode: 'speak-and-display' }],
      },
    });

    expect(speech.requests[0]?.voice).toEqual({ voiceId: 'voice-original', locale: 'en-US' });
    expect(Object.isFrozen(speech.requests[0]?.voice)).toBe(true);
  });
});
