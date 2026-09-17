import Phaser from 'phaser';
import { queueAssetPack } from './assetPacks';
import { KIDSLIVE_COMPANION } from './characterDefinitions';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    queueAssetPack(this, KIDSLIVE_COMPANION.assetPack);
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    this.scene.start(params.get('prototype') === 'habit-home' ? 'habit-home' : 'planet-hub');
  }
}
