import type { WorldActor } from '../actors/WorldActor';
import type { ExperienceEngine } from '../experience/ExperienceEngine';
import {
  GuardedTutorOutputHost,
  type TutorAuthorityAuditSink,
} from './TutorAuthorityBridge';
import type {
  TutorDiagnosticsSink,
  TutorPersonaConfig,
  TutorProvider,
  TutorTimeoutScheduler,
  TutorTurnResult,
} from './TutorContract';
import {
  TutorDeliveryCoordinator,
  type TutorSpeechAdapter,
  type TutorTextPresenter,
  type TutorVoiceConfig,
} from './TutorDeliveryCoordinator';
import { TutorOrchestrator } from './TutorOrchestrator';

export interface TutorSessionOptions {
  readonly sessionId: string;
  readonly engine: ExperienceEngine;
  readonly persona: TutorPersonaConfig;
  readonly provider: TutorProvider;
  readonly actor: WorldActor;
  readonly speech: TutorSpeechAdapter;
  readonly text: TutorTextPresenter;
  readonly voice: TutorVoiceConfig;
  readonly diagnostics?: TutorDiagnosticsSink;
  readonly authorityAudit?: TutorAuthorityAuditSink;
  readonly providerTimeout?: {
    readonly delayMs: number;
    readonly scheduler: TutorTimeoutScheduler;
  };
}

/**
 * Production-facing composition root for one tutor session.
 *
 * The session deliberately binds observation and authority mutation to the same
 * ExperienceEngine instance. Provider output must pass through the guarded A4
 * bridge before the renderer/audio delivery adapters receive it.
 */
export class TutorSession {
  private readonly engine: ExperienceEngine;
  private readonly orchestrator: TutorOrchestrator;
  readonly delivery: TutorDeliveryCoordinator;

  constructor(options: TutorSessionOptions) {
    this.engine = options.engine;
    this.delivery = new TutorDeliveryCoordinator({
      actor: options.actor,
      speech: options.speech,
      text: options.text,
      voice: options.voice,
    });

    const guardedHost = new GuardedTutorOutputHost({
      engine: options.engine,
      downstream: this.delivery,
      ...(options.authorityAudit === undefined ? {} : { audit: options.authorityAudit }),
    });

    const providerTimeout = options.providerTimeout === undefined
      ? undefined
      : Object.freeze({
          delayMs: options.providerTimeout.delayMs,
          scheduler: options.providerTimeout.scheduler,
        });

    this.orchestrator = new TutorOrchestrator({
      sessionId: options.sessionId,
      persona: options.persona,
      provider: options.provider,
      host: guardedHost,
      ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
      ...(providerTimeout === undefined ? {} : { providerTimeout }),
    });
  }

  get sessionStatus(): 'active' | 'completed' | 'disposed' {
    return this.orchestrator.sessionStatus;
  }

  runTurn(): Promise<TutorTurnResult> {
    return this.orchestrator.runTurn(this.engine);
  }

  cancelActiveTurn(reason = 'Tutor turn cancelled'): boolean {
    return this.orchestrator.cancelActiveTurn(reason);
  }

  dispose(reason = 'Tutor session disposed'): void {
    this.orchestrator.dispose(reason);
  }
}
