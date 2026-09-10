import type {
  TutorCancellationToken,
  TutorOutput,
  TutorOutputHost,
  TutorProvider,
  TutorRequest,
  TutorTurnDelivery,
} from './TutorContract';

export class ScriptedTutor implements TutorProvider {
  readonly requests: TutorRequest[] = [];
  private nextResponse = 0;

  constructor(private readonly responses: readonly TutorOutput[]) {}

  generate(request: TutorRequest, cancellation: TutorCancellationToken): Promise<TutorOutput> {
    this.requests.push(request);
    if (cancellation.cancelled) {
      return Promise.reject(new Error(cancellation.reason ?? 'Tutor request cancelled'));
    }

    const response = this.responses[this.nextResponse];
    if (response === undefined) {
      return Promise.reject(new Error(`ScriptedTutor has no response for request ${request.requestId}.`));
    }
    this.nextResponse += 1;
    return Promise.resolve(response);
  }
}

export class RecordingTutorHost implements TutorOutputHost {
  readonly deliveries: TutorTurnDelivery[] = [];

  publish(delivery: TutorTurnDelivery): void {
    this.deliveries.push(delivery);
  }
}
