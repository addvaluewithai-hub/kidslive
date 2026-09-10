import { describe, expect, it } from 'vitest';
import { ExperienceEngine } from '../experience/ExperienceEngine';
import { COHESIVE_A4_EXPERIENCE_FIXTURE } from '../experience/fixtures';
import { RecordingTutorHost, ScriptedTutor } from './ScriptedTutor';
import type {
  TutorAuthorityAuditRecord,
  TutorAuthorityAuditSink,
} from './TutorAuthorityBridge';
import { GuardedTutorOutputHost } from './TutorAuthorityBridge';
import type {
  TutorCancellationToken,
  TutorOutput,
  TutorProvider,
  TutorRequest,
} from './TutorContract';
import { TutorOrchestrator } from './TutorOrchestrator';
import {
  ManualTutorTimeoutScheduler,
  RecordingTutorDiagnostics,
  SlowTutor,
} from './TutorResilienceDoubles';

const SAFE_OUTPUT: TutorOutput = {
  narration: [{ text: 'Continue safely.', mode: 'display-only' }],
  actorCues: [],
};

class FirstCallIgnoresCancellationTutor implements TutorProvider {
  calls = 0;

  generate(_request: TutorRequest, _cancellation: TutorCancellationToken): Promise<TutorOutput> {
    this.calls += 1;
    if (this.calls === 1) return new Promise<TutorOutput>(() => undefined);
    return Promise.resolve(SAFE_OUTPUT);
  }
}

class ThrowingAudit implements TutorAuthorityAuditSink {
  record(_entry: TutorAuthorityAuditRecord): void {
    throw new Error('deterministic audit outage');
  }
}

function orchestrator(provider: TutorProvider, host = new RecordingTutorHost(), scheduler?: ManualTutorTimeoutScheduler) {
  return new TutorOrchestrator({
    sessionId: 'a5-f-session',
    persona: { personaId: 'replaceable', toneId: 'calm', locale: 'en-US' },
    provider,
    host,
    ...(scheduler === undefined
      ? {}
      : { providerTimeout: { delayMs: 5000, scheduler } }),
  });
}

describe('A5 fix/polish regressions', () => {
  it('settles explicit cancellation even when the provider never cooperates', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const provider = new SlowTutor();
    const tutor = orchestrator(provider);

    const pending = tutor.runTurn(engine);
    expect(tutor.cancelActiveTurn('learner interrupted')).toBe(true);

    await expect(pending).resolves.toEqual({
      status: 'cancelled',
      turnId: 'a5-f-session:turn:1',
      reason: 'learner interrupted',
    });
    expect(provider.cancellations[0]).toMatchObject({ cancelled: true, reason: 'learner interrupted' });
  });

  it('settles superseded and disposed turns without waiting for ignored provider cancellation', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const provider = new FirstCallIgnoresCancellationTutor();
    const tutor = orchestrator(provider);

    const superseded = tutor.runTurn(engine);
    const replacement = tutor.runTurn(engine);

    await expect(superseded).resolves.toMatchObject({
      status: 'cancelled',
      reason: 'Tutor turn superseded by a newer turn',
    });
    await expect(replacement).resolves.toMatchObject({ status: 'delivered' });

    const neverSettlingProvider = new SlowTutor();
    const disposable = orchestrator(neverSettlingProvider);
    const pending = disposable.runTurn(engine);
    disposable.dispose('place exited');
    await expect(pending).resolves.toMatchObject({ status: 'cancelled', reason: 'place exited' });
  });

  it('cancels timeout handles immediately when explicit cancellation wins the provider race', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const scheduler = new ManualTutorTimeoutScheduler();
    const tutor = orchestrator(new SlowTutor(), new RecordingTutorHost(), scheduler);

    const pending = tutor.runTurn(engine);
    await Promise.resolve();
    expect(scheduler.pendingCount).toBe(1);
    tutor.cancelActiveTurn('navigation changed');

    await expect(pending).resolves.toMatchObject({ status: 'cancelled', reason: 'navigation changed' });
    expect(scheduler.pendingCount).toBe(0);
  });

  it('keeps approved authority and downstream delivery intact when the audit sink throws', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const downstream = new RecordingTutorHost();
    const diagnostics = new RecordingTutorDiagnostics();
    const host = new GuardedTutorOutputHost({ engine, downstream, audit: new ThrowingAudit() });
    const provider = new ScriptedTutor([
      {
        narration: [{ text: 'PRIVATE NARRATION', mode: 'display-only' }],
        actorCues: [],
        authorityProposal: {
          type: 'submit-outcome',
          stepId: 'welcome',
          expectedRevision: 0,
          outcomeId: 'practice',
        },
      },
    ]);
    const tutor = new TutorOrchestrator({
      sessionId: 'audit-failure-session',
      persona: { personaId: 'replaceable', toneId: 'calm', locale: 'en-US' },
      provider,
      host,
      diagnostics,
    });

    await expect(tutor.runTurn(engine)).resolves.toMatchObject({ status: 'delivered' });
    expect(engine.state).toMatchObject({ currentStepId: 'practice', revision: 1 });
    expect(downstream.deliveries).toHaveLength(1);
    expect(JSON.stringify(diagnostics.events)).not.toContain('PRIVATE NARRATION');
    expect(diagnostics.events.at(-1)?.type).toBe('turn-delivered');
  });
});
