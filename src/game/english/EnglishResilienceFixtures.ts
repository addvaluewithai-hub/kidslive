import type {
  TutorCancellationToken,
  TutorOutput,
  TutorProvider,
  TutorRequest,
} from '../../core/tutor/TutorContract';
import { EnglishLessonTutor } from './englishLesson';

export type EnglishTutorFixture = 'normal' | 'fail-once' | 'slow-once';
export type EnglishSpeechFixture = 'normal' | 'fail-once';

function debugFixtureParam(name: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  if (params.get('runtimeDebug') !== '1') return undefined;
  return params.get(name) ?? undefined;
}

export function resolveEnglishTutorFixture(): EnglishTutorFixture {
  const fixture = debugFixtureParam('tutorFixture');
  return fixture === 'fail-once' || fixture === 'slow-once' ? fixture : 'normal';
}

export function resolveEnglishSpeechFixture(): EnglishSpeechFixture {
  return debugFixtureParam('speechFixture') === 'fail-once' ? 'fail-once' : 'normal';
}

class FailOnceTutor implements TutorProvider {
  private failed = false;

  constructor(private readonly delegate: TutorProvider) {}

  generate(request: TutorRequest, cancellation: TutorCancellationToken): Promise<TutorOutput> {
    if (!this.failed) {
      this.failed = true;
      return Promise.reject(new Error('Deterministic English tutor failure'));
    }
    return this.delegate.generate(request, cancellation);
  }
}

class SlowOnceTutor implements TutorProvider {
  private delayed = false;

  constructor(
    private readonly delegate: TutorProvider,
    private readonly delayMs = 2_000,
  ) {}

  async generate(request: TutorRequest, cancellation: TutorCancellationToken): Promise<TutorOutput> {
    if (!this.delayed) {
      this.delayed = true;
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, this.delayMs));
    }
    return this.delegate.generate(request, cancellation);
  }
}

export function createEnglishTutorProvider(fixture = resolveEnglishTutorFixture()): TutorProvider {
  const tutor = new EnglishLessonTutor();
  if (fixture === 'fail-once') return new FailOnceTutor(tutor);
  if (fixture === 'slow-once') return new SlowOnceTutor(tutor);
  return tutor;
}
