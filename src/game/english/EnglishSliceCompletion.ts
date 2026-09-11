import type { ExperienceState } from '../../core/experience/ExperienceDefinition';

export const ENGLISH_SLICE_EXPERIENCE_ID = 'english-first-words';
export const ENGLISH_SLICE_EXPERIENCE_VERSION = '1';
export const ENGLISH_SLICE_GRANT_ID = 'a6:english-first-word-complete';
export const ENGLISH_SLICE_WORLD_CHANGE_ID = 'english:first-word-star';

export interface EnglishSliceCompletionReceipt {
  readonly grantId: typeof ENGLISH_SLICE_GRANT_ID;
  readonly experienceId: typeof ENGLISH_SLICE_EXPERIENCE_ID;
  readonly experienceVersion: typeof ENGLISH_SLICE_EXPERIENCE_VERSION;
  readonly completedRevision: number;
  readonly worldChangeId: typeof ENGLISH_SLICE_WORLD_CHANGE_ID;
}

/**
 * Minimal in-memory A6 completion authority.
 *
 * This deliberately is not a generalized progression/economy or persistence system.
 * A8 owns progression/economy and A11 owns persistence. For A6 this store proves that
 * an authoritative A4 completion can produce exactly one deterministic world change.
 */
export class EnglishSliceCompletionStore {
  private receiptValue?: EnglishSliceCompletionReceipt;

  get completed(): boolean {
    return this.receiptValue !== undefined;
  }

  get receipt(): EnglishSliceCompletionReceipt | undefined {
    return this.receiptValue;
  }

  grantFromAuthoritativeState(state: ExperienceState): EnglishSliceCompletionReceipt | undefined {
    if (
      state.status !== 'completed' ||
      state.experienceId !== ENGLISH_SLICE_EXPERIENCE_ID ||
      state.experienceVersion !== ENGLISH_SLICE_EXPERIENCE_VERSION
    ) {
      return undefined;
    }

    if (this.receiptValue) return this.receiptValue;

    this.receiptValue = Object.freeze({
      grantId: ENGLISH_SLICE_GRANT_ID,
      experienceId: ENGLISH_SLICE_EXPERIENCE_ID,
      experienceVersion: ENGLISH_SLICE_EXPERIENCE_VERSION,
      completedRevision: state.revision,
      worldChangeId: ENGLISH_SLICE_WORLD_CHANGE_ID,
    });
    return this.receiptValue;
  }
}

/** Session-lifetime A6 slice state; intentionally replaced by A11 persistence later. */
export const englishSliceCompletion = new EnglishSliceCompletionStore();
