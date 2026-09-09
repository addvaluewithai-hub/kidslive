import Phaser from 'phaser';
import { HUB_PLACES } from './places';

export type AssetOwnership = 'persistent' | 'scene';

export type AuthoredAsset = {
  key: string;
  type: 'svg';
  url: string;
  ownership: AssetOwnership;
};

export type AuthoredAssetPack = {
  id: string;
  assets: readonly AuthoredAsset[];
};

const SHARED_PORTAL_FRAME: AuthoredAsset = {
  key: 'shared:place-portal-frame',
  type: 'svg',
  url: '/assets/places/portal-frame.svg',
  ownership: 'persistent',
};

function createPlacePack(placeId: string): AuthoredAssetPack {
  return {
    id: `place:${placeId}`,
    assets: [
      SHARED_PORTAL_FRAME,
      {
        key: `place:${placeId}:marker`,
        type: 'svg',
        url: '/assets/places/place-marker.svg',
        ownership: 'scene',
      },
    ],
  };
}

const PLACE_ASSET_PACKS = new Map<string, AuthoredAssetPack>(
  HUB_PLACES.map((place) => [place.id, createPlacePack(place.id)]),
);

export function getPlaceAssetPack(placeId: string): AuthoredAssetPack | undefined {
  return PLACE_ASSET_PACKS.get(placeId);
}

export type QueuedAssetPack = {
  queuedKeys: readonly string[];
  cachedKeys: readonly string[];
};

export function queueAssetPack(scene: Phaser.Scene, pack: AuthoredAssetPack): QueuedAssetPack {
  const queuedKeys: string[] = [];
  const cachedKeys: string[] = [];

  for (const asset of pack.assets) {
    if (scene.textures.exists(asset.key)) {
      cachedKeys.push(asset.key);
      continue;
    }

    scene.load.svg(asset.key, asset.url);
    queuedKeys.push(asset.key);
  }

  return { queuedKeys, cachedKeys };
}

export function isAssetPackReady(scene: Phaser.Scene, pack: AuthoredAssetPack): boolean {
  return pack.assets.every((asset) => scene.textures.exists(asset.key));
}

export function releaseSceneOwnedAssets(scene: Phaser.Scene, pack: AuthoredAssetPack): void {
  for (const asset of pack.assets) {
    if (asset.ownership === 'scene' && scene.textures.exists(asset.key)) {
      scene.textures.remove(asset.key);
    }
  }
}
