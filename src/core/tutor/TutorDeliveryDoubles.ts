import type { TutorCancellationToken } from './TutorContract';
import type {
  TutorSpeechAdapter,
  TutorSpeechRequest,
  TutorTextPresentation,
  TutorTextPresenter,
} from './TutorDeliveryCoordinator';

export class TutorSpeechInterruptedError extends Error {
  constructor(message = 'Tutor speech interrupted') {
    super(message);
    this.name = 'TutorSpeechInterruptedError';
  }
}

export class InstantSpeechAdapter implements TutorSpeechAdapter {
  readonly requests: TutorSpeechRequest[] = [];

  speak(request: TutorSpeechRequest, cancellation: TutorCancellationToken): Promise<void> {
    this.requests.push(request);
    if (cancellation.cancelled) {
      return Promise.reject(new TutorSpeechInterruptedError(cancellation.reason ?? undefined));
    }
    return Promise.resolve();
  }

  interrupt(): void {}
}

type PendingSpeech = {
  readonly request: TutorSpeechRequest;
  readonly cancellation: TutorCancellationToken;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
};

export class ManualSpeechAdapter implements TutorSpeechAdapter {
  readonly requests: TutorSpeechRequest[] = [];
  readonly interruptions: string[] = [];
  private pending: PendingSpeech | null = null;

  speak(request: TutorSpeechRequest, cancellation: TutorCancellationToken): Promise<void> {
    if (this.pending !== null) {
      return Promise.reject(new Error('ManualSpeechAdapter already has pending speech.'));
    }
    this.requests.push(request);
    return new Promise<void>((resolve, reject) => {
      this.pending = { request, cancellation, resolve, reject };
    });
  }

  complete(): boolean {
    const pending = this.pending;
    if (pending === null) return false;
    this.pending = null;
    if (pending.cancellation.cancelled) {
      pending.reject(new TutorSpeechInterruptedError(pending.cancellation.reason ?? undefined));
    } else {
      pending.resolve();
    }
    return true;
  }

  interrupt(reason: string): void {
    this.interruptions.push(reason);
    const pending = this.pending;
    if (pending === null) return;
    this.pending = null;
    pending.reject(new TutorSpeechInterruptedError(reason));
  }
}

export class FailingSpeechAdapter implements TutorSpeechAdapter {
  readonly requests: TutorSpeechRequest[] = [];

  constructor(private readonly error: Error = new Error('Deterministic speech failure')) {}

  speak(request: TutorSpeechRequest): Promise<void> {
    this.requests.push(request);
    return Promise.reject(this.error);
  }

  interrupt(): void {}
}

export class RecordingTextPresenter implements TutorTextPresenter {
  readonly presentations: TutorTextPresentation[] = [];
  readonly clearedTurnIds: string[] = [];

  present(presentation: TutorTextPresentation): void {
    this.presentations.push(presentation);
  }

  clear(turnId: string): void {
    this.clearedTurnIds.push(turnId);
  }
}
