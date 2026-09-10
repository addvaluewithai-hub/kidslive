import type { ActorAction, ActorEmotion } from '../core/actors/WorldActor';

export type CharacterEmotionPresentation = {
  faceTint: number;
  mouthWidth: number;
  mouthHeight: number;
  glowAlpha: number;
};

export type CharacterDefinition = {
  id: string;
  displayName: string;
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
};

export const KIDSLIVE_COMPANION: CharacterDefinition = {
  id: 'nova',
  displayName: 'Nova',
  palette: {
    primary: 0x7c8cff,
    secondary: 0x273469,
    accent: 0xffd166,
    eye: 0x071426,
  },
  scale: 1,
  movementDurationMs: 420,
  supportedActions: ['idle', 'greet', 'explain', 'celebrate', 'think'],
  supportedEmotions: ['neutral', 'warm', 'curious', 'excited'],
  emotionPresentation: {
    neutral: { faceTint: 0x7c8cff, mouthWidth: 14, mouthHeight: 5, glowAlpha: 0.16 },
    warm: { faceTint: 0x7c8cff, mouthWidth: 18, mouthHeight: 7, glowAlpha: 0.2 },
    curious: { faceTint: 0x7c8cff, mouthWidth: 9, mouthHeight: 9, glowAlpha: 0.24 },
    excited: { faceTint: 0xffd166, mouthWidth: 18, mouthHeight: 12, glowAlpha: 0.32 },
  },
};
