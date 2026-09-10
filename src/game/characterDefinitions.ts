import type { ActorAction, ActorEmotion } from '../core/actors/WorldActor';

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
  supportedActions: readonly ActorAction[];
  supportedEmotions: readonly ActorEmotion[];
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
  supportedActions: ['idle', 'greet', 'explain', 'celebrate', 'think'],
  supportedEmotions: ['neutral', 'warm', 'curious', 'excited'],
};
