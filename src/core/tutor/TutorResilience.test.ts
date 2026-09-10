import { describe, expect, it } from 'vitest';
import { ExperienceEngine } from '../experience/ExperienceEngine';
import { COHESIVE_A4_EXPERIENCE_FIXTURE } from '../experience/fixtures';
import { RecordingTutorHost, ScriptedTutor } from './ScriptedTutor';
import type {
  TutorCancellationToken,
  TutorOutput,
  TutorOutputHost,
  TutorProvider,
  TutorRequest,
  TutorTurnDelivery,
} from './TutorContract';
import { TutorOrchestrator } from './TutorOrchestrator';
import {
  FailingTutor,
  ManualTutorTimeoutScheduler,
  RecordingTutorDiagnostics,
  SlowTutor,
} from './TutorResilienceDoubles';

const SAFE_OUTPUT: TutorOutput = {
  narration: [{ text: 'Try the next step.', mode: 'display-only' }],
  actorCues: [{ type: 'emotion', emotion: 'encouraging' }],
};

function createOrchestrator(
  provider: TutorProvider,
  options: {
    host?: TutorOutputHost;
    diagnostics?: RecordingTutorDiagnostics;
    scheduler?: ManualTutorTimeoutScheduler;
  } = {},
): TutorOrchestrator {
  return new TutorOrchestrator({
    sessionId: 'resilience-session',
    persona: { personaId: 'replaceable', toneId: 'calm', locale: 'en-US' },
    provider,
    host: options.host ?? new RecordingTutorHost(),
    diagnostics: options.diagnostics,
    ...(options.scheduler === undefined
      ? {}
      : { providerTimeout: { delayMs: 5000, scheduler: options.scheduler } }),
  });
}

class RecoveringTutor implements TutorProvider {
  private calls = 0;

  generate(_request: TutorRequest, _cancellation: TutorCancellationToken): Promise<TutorOutput> {
    this.calls += 1;
    if (this.calls === 1) return Promise.reject(new Error('temporary provider outage'));
    return Promise.resolve(SAFE_OUTPUT);
  }
}

class FailingHost implements TutorOutputHost {
  readonly interruptions: Array<{ turnId: string; reason: string }> = [];

  publish(_delivery: TutorTurnDelivery): Promise<void> {
    return Promise.reject(new Error('deterministic speech/actor delivery failure'));
  }

  interrupt(turnId: string, reason: string): void {
    this.interruptions.push({ turnId, reason });
  }
}

describe('TutorOrchestrator resilience', () => {
  it('converts provider failures into bounded recoverable results and permits retry', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const diagnostics = new RecordingTutorDiagnostics();
    const orchestrator = createOrchestrator(new RecoveringTutor(), { diagnostics });

    await expect(orchestrator.runTurn(engine)).resolves.toEqual({
      status: 'failed',
      turnId: 'resilience-session:turn:1',
      requestId: 'resilience-session:turn:1:request:1',
      phase: 'provider',
      code: 'provider-failed',
      recoverable: true,
    });

    await expect(orchestrator.runTurn(engine)).resolves.toMatchObject({
      status: 'delivered',
      delivery: { turnId: 'resilience-session:turn:2' },
    });
    expect(orchestrator.sessionStatus).toBe('active');
    expect(diagnostics.events.map((event) => event.type)).toEqual([
      'turn-started',
      'turn-failed',
      'turn-started',
      'provider-completed',
      'turn-delivered',
    ]);
  });

  it('times out slow provider work deterministically and makes late output inert', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const provider = new SlowTutor();
    const scheduler = new ManualTutorTimeoutScheduler();
    const host = new RecordingTutorHost();
    const diagnostics = new RecordingTutorDiagnostics();
    const orchestrator = createOrchestrator(provider, { scheduler, host, diagnostics });

    const timedOut = orchestrator.runTurn(engine);
    await Promise.resolve();
    expect(scheduler.pendingCount).toBe(1);
    scheduler.fireNext();

    await expect(timedOut).resolves.toMatchObject({
      status: 'failed',
      phase: 'provider',
      code: 'provider-timeout',
      recoverable: true,
    });
    expect(provider.cancellations[0]).toMatchObject({
      cancelled: true,
      reason: 'Tutor provider timed out',
    });
    expect(host.deliveries).toEqual([]);

    provider.resolveNext({
      narration: [{ text: 'LATE PRIVATE CONTENT MUST STAY INERT', mode: 'display-only' }],
      actorCues: [],
    });
    await Promise.resolve();
    expect(host.deliveries).toEqual([]);

    const retry = orchestrator.runTurn(engine);
    await Promise.resolve();
    provider.resolveNext(SAFE_OUTPUT);
    await expect(retry).resolves.toMatchObject({ status: 'delivered' });
    expect(host.deliveries).toHaveLength(1);
    expect(diagnostics.events.filter((event) => event.type === 'turn-failed')).toHaveLength(1);
  });

  it('rejects malformed provider output before host delivery without learner-content diagnostics', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const diagnostics = new RecordingTutorDiagnostics();
    const host = new RecordingTutorHost();
    const malformed = {
      narration: [{ text: 'SENSITIVE LEARNER CONTENT', mode: 'invented-mode' }],
      actorCues: [],
      authorityProposal: {
        type: 'request-tool',
        stepId: 'welcome',
        expectedRevision: 0,
        toolId: 'anything',
        parameters: { amount: Number.POSITIVE_INFINITY },
      },
    } as unknown as TutorOutput;
    const orchestrator = createOrchestrator(new ScriptedTutor([malformed]), { host, diagnostics });

    await expect(orchestrator.runTurn(engine)).resolves.toMatchObject({
      status: 'failed',
      phase: 'provider-output',
      code: 'malformed-output',
      recoverable: true,
    });
    expect(host.deliveries).toEqual([]);

    const serializedDiagnostics = JSON.stringify(diagnostics.events);
    expect(serializedDiagnostics).not.toContain('SENSITIVE LEARNER CONTENT');
    expect(serializedDiagnostics).not.toContain('anything');
    expect(diagnostics.events.at(-1)).toEqual({
      type: 'turn-failed',
      sessionId: 'resilience-session',
      turnId: 'resilience-session:turn:1',
      requestId: 'resilience-session:turn:1:request:1',
      phase: 'provider-output',
      code: 'malformed-output',
    });
  });

  it('contains host adapter failure without mutating A4 authority', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const beforeState = engine.state;
    const beforeEvents = engine.events;
    const diagnostics = new RecordingTutorDiagnostics();
    const orchestrator = createOrchestrator(new ScriptedTutor([SAFE_OUTPUT]), {
      host: new FailingHost(),
      diagnostics,
    });

    await expect(orchestrator.runTurn(engine)).resolves.toMatchObject({
      status: 'failed',
      phase: 'delivery',
      code: 'delivery-failed',
      recoverable: true,
    });
    expect(engine.state).toEqual(beforeState);
    expect(engine.events).toEqual(beforeEvents);
    expect(orchestrator.sessionStatus).toBe('active');
  });

  it('contains deterministic failure tutors without network or live-provider state', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const provider = new FailingTutor();
    const orchestrator = createOrchestrator(provider);

    await expect(orchestrator.runTurn(engine)).resolves.toMatchObject({
      status: 'failed',
      code: 'provider-failed',
    });
    expect(provider.requests).toHaveLength(1);
  });
});
