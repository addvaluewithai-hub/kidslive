import { describe, expect, it } from 'vitest';
import { ExperienceEngine } from '../experience/ExperienceEngine';
import {
  BRANCHING_EXPERIENCE_FIXTURE,
  COHESIVE_A4_EXPERIENCE_FIXTURE,
} from '../experience/fixtures';
import { RecordingTutorHost, ScriptedTutor } from './ScriptedTutor';
import type {
  TutorCancellationToken,
  TutorOutput,
  TutorProvider,
  TutorRequest,
} from './TutorContract';
import {
  snapshotTutorObservation,
  TutorOrchestrator,
} from './TutorOrchestrator';

const FIRST_OUTPUT: TutorOutput = {
  narration: [{ text: 'Welcome! Pick a path when you are ready.', mode: 'speak-and-display' }],
  actorCues: [{ type: 'emotion', emotion: 'encouraging' }],
};

const PRACTICE_OUTPUT: TutorOutput = {
  narration: [{ text: 'Great choice. Let us practice together.', mode: 'display-only' }],
  actorCues: [{ type: 'action', action: 'acknowledge' }],
};

class DeferredTutor implements TutorProvider {
  request: TutorRequest | null = null;
  cancellation: TutorCancellationToken | null = null;
  private resolveOutput: ((output: TutorOutput) => void) | null = null;

  generate(request: TutorRequest, cancellation: TutorCancellationToken): Promise<TutorOutput> {
    this.request = request;
    this.cancellation = cancellation;
    return new Promise<TutorOutput>((resolve) => {
      this.resolveOutput = resolve;
    });
  }

  resolve(output: TutorOutput): void {
    if (this.resolveOutput === null) throw new Error('No pending tutor request.');
    this.resolveOutput(output);
    this.resolveOutput = null;
  }
}

function createOrchestrator(provider: TutorProvider, host = new RecordingTutorHost()) {
  return {
    host,
    orchestrator: new TutorOrchestrator({
      sessionId: 'session-alpha',
      persona: { personaId: 'companion-default', toneId: 'warm-guide', locale: 'en-US' },
      provider,
      host,
    }),
  };
}

function completeBranchingExperience(engine: ExperienceEngine): void {
  engine.dispatch({
    type: 'submit-outcome',
    stepId: 'welcome',
    expectedRevision: 0,
    outcomeId: 'continue',
  });
  engine.dispatch({
    type: 'submit-outcome',
    stepId: 'choose-path',
    expectedRevision: 1,
    outcomeId: 'ready',
  });
  engine.dispatch({
    type: 'submit-outcome',
    stepId: 'wrap-up',
    expectedRevision: 2,
    outcomeId: 'finish',
  });
}

describe('TutorOrchestrator', () => {
  it('drives multiple deterministic tutor turns from authoritative A4 observations', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const provider = new ScriptedTutor([FIRST_OUTPUT, PRACTICE_OUTPUT]);
    const { orchestrator, host } = createOrchestrator(provider);

    const first = await orchestrator.runTurn(engine);
    expect(first).toMatchObject({
      status: 'delivered',
      delivery: {
        sessionId: 'session-alpha',
        turnId: 'session-alpha:turn:1',
        requestId: 'session-alpha:turn:1:request:1',
        output: FIRST_OUTPUT,
      },
    });

    engine.dispatch({
      type: 'submit-outcome',
      stepId: 'welcome',
      expectedRevision: 0,
      outcomeId: 'practice',
    });

    const second = await orchestrator.runTurn(engine);
    expect(second).toMatchObject({
      status: 'delivered',
      delivery: {
        turnId: 'session-alpha:turn:2',
        requestId: 'session-alpha:turn:2:request:1',
        output: PRACTICE_OUTPUT,
      },
    });

    expect(provider.requests).toHaveLength(2);
    expect(provider.requests[0]).toMatchObject({
      sessionId: 'session-alpha',
      persona: { personaId: 'companion-default', toneId: 'warm-guide', locale: 'en-US' },
      observation: {
        state: { currentStepId: 'welcome', revision: 0 },
        currentStep: { id: 'welcome', kind: 'instruction' },
      },
    });
    expect(provider.requests[1]?.observation).toMatchObject({
      state: { currentStepId: 'practice', revision: 1 },
      currentStep: { id: 'practice', kind: 'activity' },
    });
    expect(host.deliveries).toHaveLength(2);
  });

  it('snapshots requests and deliveries into immutable JSON-safe values', async () => {
    const mutableOutput = {
      narration: [{ text: 'Original narration', mode: 'display-only' as const }],
      actorCues: [{ type: 'action' as const, action: 'idle' as const }],
    };
    const provider = new ScriptedTutor([mutableOutput]);
    const { orchestrator, host } = createOrchestrator(provider);
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);

    const result = await orchestrator.runTurn(engine);
    expect(result.status).toBe('delivered');
    if (result.status !== 'delivered') throw new Error('Expected delivered tutor turn.');

    mutableOutput.narration[0]!.text = 'Caller changed this later';
    mutableOutput.actorCues[0]!.action = 'celebrate';

    expect(result.delivery.output.narration[0]?.text).toBe('Original narration');
    expect(result.delivery.output.actorCues[0]).toEqual({ type: 'action', action: 'idle' });
    expect(Object.isFrozen(result.delivery)).toBe(true);
    expect(Object.isFrozen(result.delivery.output)).toBe(true);
    expect(Object.isFrozen(result.delivery.output.narration)).toBe(true);
    expect(Object.isFrozen(provider.requests[0])).toBe(true);
    expect(Object.isFrozen(provider.requests[0]?.observation.state)).toBe(true);
    expect(JSON.parse(JSON.stringify(result.delivery))).toEqual(result.delivery);
    expect(JSON.parse(JSON.stringify(provider.requests[0]))).toEqual(provider.requests[0]);
    expect(host.deliveries[0]).toBe(result.delivery);
  });

  it('cancels in-flight provider work and ignores its late output', async () => {
    const provider = new DeferredTutor();
    const { orchestrator, host } = createOrchestrator(provider);
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);

    const pending = orchestrator.runTurn(engine);
    expect(provider.request?.requestId).toBe('session-alpha:turn:1:request:1');
    expect(orchestrator.cancelActiveTurn('learner interrupted')).toBe(true);
    expect(provider.cancellation).toMatchObject({ cancelled: true, reason: 'learner interrupted' });

    provider.resolve(FIRST_OUTPUT);
    await expect(pending).resolves.toEqual({
      status: 'cancelled',
      turnId: 'session-alpha:turn:1',
      reason: 'learner interrupted',
    });
    expect(host.deliveries).toEqual([]);
  });

  it('suppresses disposed late work and rejects all later turns', async () => {
    const provider = new DeferredTutor();
    const { orchestrator, host } = createOrchestrator(provider);
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);

    const pending = orchestrator.runTurn(engine);
    orchestrator.dispose('place exited');
    provider.resolve(FIRST_OUTPUT);

    await expect(pending).resolves.toEqual({
      status: 'cancelled',
      turnId: 'session-alpha:turn:1',
      reason: 'place exited',
    });
    expect(host.deliveries).toEqual([]);
    expect(orchestrator.sessionStatus).toBe('disposed');
    await expect(orchestrator.runTurn(engine)).rejects.toMatchObject({ code: 'session-disposed' });
  });

  it('fails closed on stale observations and experience identity changes', async () => {
    const firstEngine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const staleObservation = snapshotTutorObservation(firstEngine);
    const provider = new ScriptedTutor([FIRST_OUTPUT, PRACTICE_OUTPUT]);
    const { orchestrator, host } = createOrchestrator(provider);

    await orchestrator.runTurn(firstEngine);
    firstEngine.dispatch({
      type: 'submit-outcome',
      stepId: 'welcome',
      expectedRevision: 0,
      outcomeId: 'practice',
    });
    await orchestrator.runTurn(firstEngine);

    await expect(orchestrator.runTurn(staleObservation)).rejects.toMatchObject({
      code: 'stale-observation',
    });

    const otherEngine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    await expect(orchestrator.runTurn(otherEngine)).rejects.toMatchObject({
      code: 'experience-mismatch',
    });
    expect(host.deliveries).toHaveLength(2);
  });

  it('closes the tutor session when authoritative A4 state is already completed', async () => {
    const engine = ExperienceEngine.start(BRANCHING_EXPERIENCE_FIXTURE);
    completeBranchingExperience(engine);
    const provider = new ScriptedTutor([FIRST_OUTPUT]);
    const { orchestrator, host } = createOrchestrator(provider);

    await expect(orchestrator.runTurn(engine)).rejects.toMatchObject({ code: 'session-completed' });
    expect(orchestrator.sessionStatus).toBe('completed');
    expect(provider.requests).toEqual([]);
    expect(host.deliveries).toEqual([]);
    await expect(orchestrator.runTurn(engine)).rejects.toMatchObject({ code: 'session-completed' });
  });

  it('rejects internally inconsistent A4 observation snapshots before contacting a provider', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const provider = new ScriptedTutor([FIRST_OUTPUT]);
    const { orchestrator } = createOrchestrator(provider);

    const inconsistent = {
      state: engine.state,
      currentStep: { id: 'not-welcome', kind: 'instruction' as const },
      events: engine.events,
    };

    await expect(orchestrator.runTurn(inconsistent)).rejects.toMatchObject({
      code: 'experience-mismatch',
    });
    expect(provider.requests).toEqual([]);
  });
});
