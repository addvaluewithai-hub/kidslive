export type AudienceId = string;
export type ThemeId = string;
export type ProfileId = string;
export type WorldId = string;

export type WorldVisibility = 'private' | 'approved-visitors' | 'shared';

export interface AudienceConfig {
  readonly id: AudienceId;
}

export interface ThemeConfig {
  readonly id: ThemeId;
}

export interface ProfileIdentity {
  readonly profileId: ProfileId;
}

export interface WorldOwnership {
  readonly worldId: WorldId;
  readonly ownerProfileId: ProfileId;
  readonly visibility: WorldVisibility;
}

export interface ProductContext {
  readonly audience: AudienceConfig;
  readonly theme: ThemeConfig;
  readonly profile: ProfileIdentity;
  readonly world: WorldOwnership;
}

export function createProductContext(context: ProductContext): ProductContext {
  if (context.world.ownerProfileId !== context.profile.profileId) {
    throw new Error('World owner must match the active profile');
  }

  return Object.freeze({
    audience: Object.freeze({ ...context.audience }),
    theme: Object.freeze({ ...context.theme }),
    profile: Object.freeze({ ...context.profile }),
    world: Object.freeze({ ...context.world }),
  });
}
