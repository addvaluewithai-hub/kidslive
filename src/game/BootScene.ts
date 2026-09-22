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
    if (params.get('prototype') === 'habit-home') {
      this.scene.start('habit-home');
      return;
    }

    // Preserve the legacy acceptance harness while making Sprout the real default product slice.
    if (params.has('runtimeDebug') || params.get('prototype') === 'legacy') {
      this.scene.start('planet-hub');
      return;
    }

    this.scene.start('sprout-world');
  }
}
