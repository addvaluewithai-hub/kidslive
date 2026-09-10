import {
  ExperienceCommandError,
  type ExperienceCommandErrorCode,
  ExperienceEngine,
} from '../experience/ExperienceEngine';
import type {
  ExperienceCommand,
  ExperienceState,
  ExperienceToolIntent,
  ExperienceToolParameterValue,
} from '../experience/ExperienceDefinition';
import type {
  TutorAuthorityProposal,
  TutorOutputHost,
  TutorTurnDelivery,
  TutorTurnId,
} from './TutorContract';

export type TutorAuthorityBridgeRejectionCode = 'malformed-proposal' | 'engine-rejected';

export type TutorAuthorityBridgeResult =
  | {
      readonly status: 'approved-command';
      readonly proposalType: Exclude<TutorAuthorityProposal['type'], 'request-tool'>;
      readonly state: ExperienceState;
    }
  | {
      readonly status: 'approved-tool';
      readonly proposalType: 'request-tool';
      readonly intent: ExperienceToolIntent;
    }
  | {
      readonly status: 'rejected';
      readonly proposalType: string;
      readonly code: TutorAuthorityBridgeRejectionCode;
      readonly engineCode?: ExperienceCommandErrorCode;
      readonly message: string;
    };

type TutorAuthorityRejection = Extract<TutorAuthorityBridgeResult, { readonly status: 'rejected' }>;

export interface TutorAuthorityAuditRecord {
  readonly sessionId: string;
  readonly turnId: string;
  readonly requestId: string;
  readonly result: TutorAuthorityBridgeResult;
}

export interface TutorAuthorityAuditSink {
  record(entry: TutorAuthorityAuditRecord): void;
}

export class TutorAuthorityBridgeError extends Error {
  readonly result: TutorAuthorityRejection;

  constructor(result: TutorAuthorityRejection) {
    super(result.message);
    this.name = 'TutorAuthorityBridgeError';
    this.result = result;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function validAuthority(value: Record<string, unknown>): boolean {
  return (
    typeof value.stepId === 'string' &&
    value.stepId.length > 0 &&
    typeof value.expectedRevision === 'number' &&
    Number.isInteger(value.expectedRevision) &&
    value.expectedRevision >= 0
  );
}

function parseParameters(value: unknown): Readonly<Record<string, ExperienceToolParameterValue>> | null {
  if (!isRecord(value)) return null;
  const parsed: Record<string, ExperienceToolParameterValue> = {};
  for (const [key, parameterValue] of Object.entries(value)) {
    if (key.length === 0) return null;
    if (
      typeof parameterValue !== 'string' &&
      typeof parameterValue !== 'boolean' &&
      typeof parameterValue !== 'number'
    ) {
      return null;
    }
    if (typeof parameterValue === 'number' && !Number.isFinite(parameterValue)) return null;
    parsed[key] = parameterValue;
  }
  return Object.freeze(parsed);
}

function malformed(proposalType: string, message: string): TutorAuthorityRejection {
  return Object.freeze({
    status: 'rejected',
    proposalType,
    code: 'malformed-proposal',
    message,
  });
}

function parseProposal(value: unknown): TutorAuthorityProposal | TutorAuthorityRejection {
  if (!isRecord(value)) return malformed('unknown', 'Tutor authority proposal must be a plain object.');
  const proposalType = typeof value.type === 'string' ? value.type : 'unknown';
  if (!validAuthority(value)) {
    return malformed(proposalType, 'Tutor authority proposal requires a non-empty stepId and non-negative integer expectedRevision.');
  }

  switch (value.type) {
    case 'submit-outcome':
      if (
        !hasOnlyKeys(value, ['type', 'stepId', 'expectedRevision', 'outcomeId']) ||
        typeof value.outcomeId !== 'string' ||
        value.outcomeId.length === 0
      ) {
        return malformed(proposalType, 'Malformed submit-outcome tutor proposal.');
      }
      return Object.freeze({
        type: 'submit-outcome',
        stepId: value.stepId as string,
        expectedRevision: value.expectedRevision as number,
        outcomeId: value.outcomeId,
      });
    case 'submit-assessment':
      if (
        !hasOnlyKeys(value, ['type', 'stepId', 'expectedRevision', 'answer']) ||
        typeof value.answer !== 'string'
      ) {
        return malformed(proposalType, 'Malformed submit-assessment tutor proposal.');
      }
      return Object.freeze({
        type: 'submit-assessment',
        stepId: value.stepId as string,
        expectedRevision: value.expectedRevision as number,
        answer: value.answer,
      });
    case 'use-hint':
      if (
        !hasOnlyKeys(value, ['type', 'stepId', 'expectedRevision', 'hintId']) ||
        typeof value.hintId !== 'string' ||
        value.hintId.length === 0
      ) {
        return malformed(proposalType, 'Malformed use-hint tutor proposal.');
      }
      return Object.freeze({
        type: 'use-hint',
        stepId: value.stepId as string,
        expectedRevision: value.expectedRevision as number,
        hintId: value.hintId,
      });
    case 'request-tool': {
      if (
        !hasOnlyKeys(value, ['type', 'stepId', 'expectedRevision', 'toolId', 'parameters']) ||
        typeof value.toolId !== 'string' ||
        value.toolId.length === 0
      ) {
        return malformed(proposalType, 'Malformed request-tool tutor proposal.');
      }
      const parameters = parseParameters(value.parameters);
      if (parameters === null) {
        return malformed(proposalType, 'Tutor tool proposal parameters must be JSON-safe primitive values.');
      }
      return Object.freeze({
        type: 'request-tool',
        stepId: value.stepId as string,
        expectedRevision: value.expectedRevision as number,
        toolId: value.toolId,
        parameters,
      });
    }
    default:
      return malformed(proposalType, `Unknown tutor authority proposal type "${proposalType}".`);
  }
}

function isRejected(
  result: TutorAuthorityProposal | TutorAuthorityRejection,
): result is TutorAuthorityRejection {
  return 'status' in result;
}

export class TutorAuthorityBridge {
  constructor(private readonly engine: ExperienceEngine) {}

  apply(value: unknown): TutorAuthorityBridgeResult {
    const proposal = parseProposal(value);
    if (isRejected(proposal)) return proposal;

    try {
      if (proposal.type === 'request-tool') {
        const intent = this.engine.requestTool({
          toolId: proposal.toolId,
          stepId: proposal.stepId,
          expectedRevision: proposal.expectedRevision,
          parameters: proposal.parameters,
        });
        return Object.freeze({ status: 'approved-tool', proposalType: 'request-tool', intent });
      }

      const command: ExperienceCommand = proposal;
      const state = this.engine.dispatch(command);
      return Object.freeze({ status: 'approved-command', proposalType: proposal.type, state });
    } catch (error) {
      if (error instanceof ExperienceCommandError) {
        return Object.freeze({
          status: 'rejected',
          proposalType: proposal.type,
          code: 'engine-rejected',
          engineCode: error.code,
          message: error.message,
        });
      }
      throw error;
    }
  }
}

export interface GuardedTutorOutputHostOptions {
  readonly engine: ExperienceEngine;
  readonly downstream: TutorOutputHost;
  readonly audit?: TutorAuthorityAuditSink;
}

export class GuardedTutorOutputHost implements TutorOutputHost {
  private readonly bridge: TutorAuthorityBridge;
  private readonly downstream: TutorOutputHost;
  private readonly audit: TutorAuthorityAuditSink | undefined;

  constructor(options: GuardedTutorOutputHostOptions) {
    this.bridge = new TutorAuthorityBridge(options.engine);
    this.downstream = options.downstream;
    this.audit = options.audit;
  }

  async publish(delivery: TutorTurnDelivery): Promise<void> {
    const proposal = delivery.output.authorityProposal;
    if (proposal !== undefined) {
      const result = this.bridge.apply(proposal);
      try {
        this.audit?.record(
          Object.freeze({
            sessionId: delivery.sessionId,
            turnId: delivery.turnId,
            requestId: delivery.requestId,
            result,
          }),
        );
      } catch {
        // Authority audit is best-effort observability and must never alter product semantics.
      }
      if (result.status === 'rejected') throw new TutorAuthorityBridgeError(result);
    }
    await this.downstream.publish(delivery);
  }

  interrupt(turnId: TutorTurnId, reason: string): void {
    this.downstream.interrupt(turnId, reason);
  }
}

export class RecordingTutorAuthorityAudit implements TutorAuthorityAuditSink {
  readonly entries: TutorAuthorityAuditRecord[] = [];

  record(entry: TutorAuthorityAuditRecord): void {
    this.entries.push(entry);
  }
}
