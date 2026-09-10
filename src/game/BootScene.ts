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
    this.scene.start('planet-hub');
  }
}
