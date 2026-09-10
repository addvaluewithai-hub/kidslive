import type { ActorAction, ActorEmotion } from '../core/actors/WorldActor';

export type CharacterEmotionPresentation = {
  faceTint: number;
  mouthWidth: number;
  mouthHeight: number;
  glowAlpha: number;
};

export type CharacterActionPresentation = {
  durationMs: number;
  lift: number;
  scale: number;
};

export type CharacterAssetDefinition = {
  key: string;
  type: 'svg';
  url: string;
  ownership: 'persistent';
};

export type CharacterDefinition = {
  id: string;
  displayName: string;
  assetPack: {
    id: string;
    assets: readonly CharacterAssetDefinition[];
  };
  visual: {
    shellTextureKey: string;
  };
  palette: {
    primary: number;
    secondary: number;
    accent: number;
    eye: number;
  };
  scale: number;
  movementDurationMs: number;
  supportedActions: readonly ActorAction[];
  supportedEmotions: readonly ActorEmotion[];
  emotionPresentation: Record<ActorEmotion, CharacterEmotionPresentation>;
  actionPresentation: Record<ActorAction, CharacterActionPresentation>;
  speechPresentation: {
    minDurationMs: number;
    maxDurationMs: number;
    msPerCharacter: number;
    maxWidth: number;
  };
};

function createCharacterDefinition(
  identity: Pick<CharacterDefinition, 'id' | 'displayName' | 'palette'>,
): CharacterDefinition {
  const shellTextureKey = `character:${identity.id}:shell`;

  return {
    ...identity,
    assetPack: {
      id: `character:${identity.id}`,
      assets: [
        {
          key: shellTextureKey,
          type: 'svg',
          url: '/assets/characters/companion-shell.svg',
          ownership: 'persistent',
        },
      ],
    },
    visual: { shellTextureKey },
    scale: 1,
    movementDurationMs: 420,
    supportedActions: ['idle', 'greet', 'explain', 'celebrate', 'think'],
    supportedEmotions: ['neutral', 'warm', 'curious', 'excited'],
    emotionPresentation: {
      neutral: { faceTint: identity.palette.primary, mouthWidth: 14, mouthHeight: 5, glowAlpha: 0.16 },
      warm: { faceTint: identity.palette.primary, mouthWidth: 18, mouthHeight: 7, glowAlpha: 0.2 },
      curious: { faceTint: identity.palette.primary, mouthWidth: 9, mouthHeight: 9, glowAlpha: 0.24 },
      excited: { faceTint: identity.palette.accent, mouthWidth: 18, mouthHeight: 12, glowAlpha: 0.32 },
    },
    actionPresentation: {
      idle: { durationMs: 180, lift: 0, scale: 1 },
      greet: { durationMs: 420, lift: 8, scale: 1.08 },
      explain: { durationMs: 520, lift: 5, scale: 1.04 },
      celebrate: { durationMs: 620, lift: 14, scale: 1.16 },
      think: { durationMs: 520, lift: 4, scale: 0.96 },
    },
    speechPresentation: {
      minDurationMs: 900,
      maxDurationMs: 2_400,
      msPerCharacter: 42,
      maxWidth: 190,
    },
  };
}

export const KIDSLIVE_COMPANION = createCharacterDefinition({
  id: 'nova',
  displayName: 'Nova',
  palette: {
    primary: 0x7c8cff,
    secondary: 0x273469,
    accent: 0xffd166,
    eye: 0x071426,
  },
});

/** Lightweight alternate definition proving the renderer is not coupled to Nova identity. */
export const TEST_COMPANION = createCharacterDefinition({
  id: 'ember',
  displayName: 'Ember',
  palette: {
    primary: 0xff8a65,
    secondary: 0x5a2742,
    accent: 0x7ee8a3,
    eye: 0x16111f,
  },
});
