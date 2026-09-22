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
    const prototype = params.get('prototype');

    if (prototype === 'habit-home') {
      this.scene.start('habit-home');
      return;
    }

    if (prototype === 'planet-hub') {
      this.scene.start('planet-hub');
      return;
    }

    this.scene.start('habit-island');
  }
}
