import { describe, expect, it } from 'vitest';
import { ExperienceEngine } from '../experience/ExperienceEngine';
import { COHESIVE_A4_EXPERIENCE_FIXTURE } from '../experience/fixtures';
import { RecordingTutorHost, ScriptedTutor } from './ScriptedTutor';
import type { TutorOutput } from './TutorContract';
import {
  GuardedTutorOutputHost,
  RecordingTutorAuthorityAudit,
  TutorAuthorityBridge,
  TutorAuthorityBridgeError,
} from './TutorAuthorityBridge';
import { TutorOrchestrator } from './TutorOrchestrator';

function source(engine: ExperienceEngine) {
  return { state: engine.state, currentStep: engine.currentStep, events: engine.events };
}

function output(authorityProposal: TutorOutput['authorityProposal']): TutorOutput {
  return {
    narration: [{ text: 'Bounded tutor turn.', mode: 'display-only' }],
    actorCues: [],
    authorityProposal,
  };
}

describe('TutorAuthorityBridge', () => {
  it('connects scripted tutor proposals through guarded A4 command and tool APIs end to end', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const downstream = new RecordingTutorHost();
    const audit = new RecordingTutorAuthorityAudit();
    const host = new GuardedTutorOutputHost({ engine, downstream, audit });
    const provider = new ScriptedTutor([
      output({
        type: 'submit-outcome',
        stepId: 'welcome',
        expectedRevision: 0,
        outcomeId: 'practice',
      }),
      output({
        type: 'request-tool',
        stepId: 'practice',
        expectedRevision: 1,
        toolId: 'highlight-object',
        parameters: { target: 'mercury-card' },
      }),
      output({
        type: 'submit-outcome',
        stepId: 'practice',
        expectedRevision: 2,
        outcomeId: 'ready',
      }),
      output({
        type: 'submit-assessment',
        stepId: 'planet-check',
        expectedRevision: 3,
        answer: 'venus',
      }),
      output({
        type: 'use-hint',
        stepId: 'planet-check',
        expectedRevision: 4,
        hintId: 'first-letter',
      }),
      output({
        type: 'submit-assessment',
        stepId: 'planet-check',
        expectedRevision: 5,
        answer: '  MERCURY  ',
      }),
    ]);
    const orchestrator = new TutorOrchestrator({
      sessionId: 'guarded-session',
      persona: { personaId: 'companion-default', toneId: 'warm-guide', locale: 'en-US' },
      provider,
      host,
    });

    await orchestrator.runTurn(source(engine));
    expect(engine.state).toMatchObject({ currentStepId: 'practice', revision: 1 });

    await orchestrator.runTurn(source(engine));
    expect(engine.state).toMatchObject({ currentStepId: 'practice', revision: 2 });
    expect(engine.events.at(-1)).toMatchObject({
      type: 'tool-intent-approved',
      toolId: 'highlight-object',
      parameters: { target: 'mercury-card' },
    });

    await orchestrator.runTurn(source(engine));
    await orchestrator.runTurn(source(engine));
    expect(engine.state.assessments[0]).toMatchObject({ result: 'retrying' });
    await orchestrator.runTurn(source(engine));
    await orchestrator.runTurn(source(engine));

    expect(engine.state).toMatchObject({ currentStepId: 'celebrate', revision: 6 });
    expect(engine.state.assessments[0]).toMatchObject({
      usedHintIds: ['first-letter'],
      result: 'correct',
    });
    expect(downstream.deliveries).toHaveLength(6);
    expect(audit.entries.map((entry) => entry.result.status)).toEqual([
      'approved-command',
      'approved-tool',
      'approved-command',
      'approved-command',
      'approved-command',
      'approved-command',
    ]);
    expect(audit.entries[1]?.result).toMatchObject({
      status: 'approved-tool',
      intent: { kind: 'world-effect', toolId: 'highlight-object' },
    });
  });

  it('rejects stale, unauthorized, out-of-step, and malformed tutor authority without mutation', () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const bridge = new TutorAuthorityBridge(engine);

    const approved = bridge.apply({
      type: 'submit-outcome',
      stepId: 'welcome',
      expectedRevision: 0,
      outcomeId: 'ready',
    });
    expect(approved.status).toBe('approved-command');
    expect(engine.state).toMatchObject({ currentStepId: 'planet-check', revision: 1 });

    const before = JSON.stringify({ state: engine.state, events: engine.events });

    expect(
      bridge.apply({
        type: 'submit-outcome',
        stepId: 'welcome',
        expectedRevision: 0,
        outcomeId: 'ready',
      }),
    ).toMatchObject({ status: 'rejected', code: 'engine-rejected', engineCode: 'stale-command' });

    expect(
      bridge.apply({
        type: 'submit-outcome',
        stepId: 'planet-check',
        expectedRevision: 1,
        outcomeId: 'correct',
      }),
    ).toMatchObject({
      status: 'rejected',
      code: 'engine-rejected',
      engineCode: 'invalid-command-for-step',
    });

    expect(
      bridge.apply({
        type: 'request-tool',
        stepId: 'planet-check',
        expectedRevision: 1,
        toolId: 'record-celebration',
        parameters: { reason: 'pretend-success' },
      }),
    ).toMatchObject({ status: 'rejected', code: 'engine-rejected', engineCode: 'tool-not-allowed' });

    expect(
      bridge.apply({
        type: 'submit-assessment',
        stepId: 'planet-check',
        expectedRevision: 1,
        answer: 'Mercury',
        correct: true,
      }),
    ).toMatchObject({ status: 'rejected', code: 'malformed-proposal' });

    expect(
      bridge.apply({
        type: 'request-tool',
        stepId: 'planet-check',
        expectedRevision: 1,
        toolId: 'highlight-object',
        parameters: { target: 'card', amount: Number.POSITIVE_INFINITY },
      }),
    ).toMatchObject({ status: 'rejected', code: 'malformed-proposal' });

    expect(JSON.stringify({ state: engine.state, events: engine.events })).toBe(before);
  });

  it('makes engine rejection observable to orchestration and withholds downstream delivery', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    const downstream = new RecordingTutorHost();
    const audit = new RecordingTutorAuthorityAudit();
    const host = new GuardedTutorOutputHost({ engine, downstream, audit });
    const provider = new ScriptedTutor([
      output({
        type: 'request-tool',
        stepId: 'welcome',
        expectedRevision: 0,
        toolId: 'record-celebration',
        parameters: { reason: 'model-says-so' },
      }),
    ]);
    const orchestrator = new TutorOrchestrator({
      sessionId: 'rejection-session',
      persona: { personaId: 'companion-default', toneId: 'warm-guide', locale: 'en-US' },
      provider,
      host,
    });

    await expect(orchestrator.runTurn(source(engine))).rejects.toMatchObject({
      name: 'TutorAuthorityBridgeError',
      result: { status: 'rejected', engineCode: 'tool-not-allowed' },
    } satisfies Partial<TutorAuthorityBridgeError>);
    expect(engine.state.revision).toBe(0);
    expect(engine.events).toHaveLength(1);
    expect(downstream.deliveries).toHaveLength(0);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]?.result).toMatchObject({
      status: 'rejected',
      code: 'engine-rejected',
      engineCode: 'tool-not-allowed',
    });
  });

  it('does not execute approved tool intents and snapshots proposal parameters before host delivery', async () => {
    const engine = ExperienceEngine.start(COHESIVE_A4_EXPERIENCE_FIXTURE);
    engine.dispatch({
      type: 'submit-outcome',
      stepId: 'welcome',
      expectedRevision: 0,
      outcomeId: 'practice',
    });
    const mutableParameters: Record<string, string> = { target: 'original-card' };
    const provider = new ScriptedTutor([
      output({
        type: 'request-tool',
        stepId: 'practice',
        expectedRevision: 1,
        toolId: 'highlight-object',
        parameters: mutableParameters,
      }),
    ]);
    const downstream = new RecordingTutorHost();
    const audit = new RecordingTutorAuthorityAudit();
    const host = new GuardedTutorOutputHost({ engine, downstream, audit });
    const orchestrator = new TutorOrchestrator({
      sessionId: 'snapshot-session',
      persona: { personaId: 'companion-default', toneId: 'warm-guide', locale: 'en-US' },
      provider,
      host,
    });

    const result = await orchestrator.runTurn(source(engine));
    mutableParameters.target = 'mutated-after-generation';

    expect(result.status).toBe('delivered');
    expect(audit.entries[0]?.result).toMatchObject({
      status: 'approved-tool',
      intent: { parameters: { target: 'original-card' } },
    });
    expect(engine.events.at(-1)).toMatchObject({
      type: 'tool-intent-approved',
      parameters: { target: 'original-card' },
    });
    expect(Object.isFrozen(result.status === 'delivered' ? result.delivery.output.authorityProposal : null)).toBe(true);
  });
});
