import type {
  TutorCancellationToken,
  TutorDiagnosticsSink,
  TutorLifecycleEvent,
  TutorOutput,
  TutorProvider,
  TutorRequest,
  TutorTimeoutHandle,
  TutorTimeoutScheduler,
} from './TutorContract';

export class FailingTutor implements TutorProvider {
  readonly requests: TutorRequest[] = [];

  constructor(private readonly error = new Error('Deterministic tutor failure')) {}

  generate(request: TutorRequest, _cancellation: TutorCancellationToken): Promise<TutorOutput> {
    this.requests.push(request);
    return Promise.reject(this.error);
  }
}

export class SlowTutor implements TutorProvider {
  readonly requests: TutorRequest[] = [];
  readonly cancellations: TutorCancellationToken[] = [];
  private pending: Array<{
    readonly resolve: (output: TutorOutput) => void;
    readonly reject: (error: Error) => void;
  }> = [];

  generate(request: TutorRequest, cancellation: TutorCancellationToken): Promise<TutorOutput> {
    this.requests.push(request);
    this.cancellations.push(cancellation);
    return new Promise<TutorOutput>((resolve, reject) => {
      this.pending.push({ resolve, reject });
    });
  }

  resolveNext(output: TutorOutput): void {
    const pending = this.pending.shift();
    if (pending === undefined) throw new Error('SlowTutor has no pending request.');
    pending.resolve(output);
  }

  rejectNext(error = new Error('Deterministic late tutor failure')): void {
    const pending = this.pending.shift();
    if (pending === undefined) throw new Error('SlowTutor has no pending request.');
    pending.reject(error);
  }
}

export class ManualTutorTimeoutScheduler implements TutorTimeoutScheduler {
  private nextId = 0;
  private readonly pending = new Map<number, { readonly onTimeout: () => void; cancelled: boolean }>();

  schedule(_delayMs: number, onTimeout: () => void): TutorTimeoutHandle {
    const id = ++this.nextId;
    const entry = { onTimeout, cancelled: false };
    this.pending.set(id, entry);
    return {
      cancel: () => {
        entry.cancelled = true;
        this.pending.delete(id);
      },
    };
  }

  fireNext(): void {
    const next = this.pending.entries().next().value as [number, { readonly onTimeout: () => void; cancelled: boolean }] | undefined;
    if (next === undefined) throw new Error('No tutor timeout is pending.');
    const [id, entry] = next;
    this.pending.delete(id);
    if (!entry.cancelled) entry.onTimeout();
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}

export class RecordingTutorDiagnostics implements TutorDiagnosticsSink {
  readonly events: TutorLifecycleEvent[] = [];

  record(event: TutorLifecycleEvent): void {
    this.events.push(event);
  }
}
