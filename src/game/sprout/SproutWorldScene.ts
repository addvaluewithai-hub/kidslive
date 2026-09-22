import Phaser from 'phaser';
import { novaProviders, visibleNovaContext } from '../../nova/NovaConversationProvider';
import { getSproutDay, SPROUT_HABITS } from '../../story/sproutStory';
import { sproutStoryStore } from '../../story/storyStore';
import type { HabitId, SproutStoryState } from '../../story/types';
import { SproutAudio } from './SproutAudio';
import {
  addRoundedButton,
  addSoftLeaf,
  addSparkleField,
  createLumiActor,
  createNovaActor,
  type CharacterActor,
  type LumiPose,
  type NovaPose,
} from './SproutSceneKit';

const VIEW_W = 720;
const VIEW_H = 1280;
const WORLD_W = 1440;
const MEADOW_CENTER = 360;
const RIVER_CENTER = 1080;
const UI_DEPTH = 100;

type HabitRow = {
  status: Phaser.GameObjects.Text;
  dot: Phaser.GameObjects.Arc;
};

export class SproutWorldScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private state: SproutStoryState = sproutStoryStore.getState();
  private audio = new SproutAudio();
  private nova?: CharacterActor<NovaPose>;
  private lumi?: CharacterActor<LumiPose>;

  private light?: Phaser.GameObjects.Container;
  private pathVines?: Phaser.GameObjects.Container;
  private seed?: Phaser.GameObjects.Container;
  private waterFlower?: Phaser.GameObjects.Container;
  private moonFlower?: Phaser.GameObjects.Container;
  private shelterFrame?: Phaser.GameObjects.Container;
  private shelterLeaves?: Phaser.GameObjects.Container;
  private hiddenPathCover?: Phaser.GameObjects.Container;
  private woodsReveal?: Phaser.GameObjects.Container;

  private dayText?: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;
  private novaText?: Phaser.GameObjects.Text;
  private habitRows = new Map<HabitId, HabitRow>();
  private progressText?: Phaser.GameObjects.Text;
  private dayDoneText?: Phaser.GameObjects.Text;

  private mapOverlay?: Phaser.GameObjects.Container;
  private parentOverlay?: Phaser.GameObjects.Container;
  private choiceOverlay?: Phaser.GameObjects.Container;
  private novaOverlay?: Phaser.GameObjects.Container;
  private debugOverlay?: Phaser.GameObjects.Container;
  private parentPendingText?: Phaser.GameObjects.Text;
  private parentHabitSummary?: Phaser.GameObjects.Text;
  private novaReply?: Phaser.GameObjects.Text;
  private mapDayText?: Phaser.GameObjects.Text;

  private lastApplied?: SproutStoryState;
  private revealBusy = false;

  constructor() {
    super('sprout-world');
  }

  create() {
    sproutStoryStore.rollForwardIfNewDay();
    this.state = sproutStoryStore.getState();
    this.cameras.main.setBackgroundColor('#e6eee9');
    this.cameras.main.setBounds(0, 0, WORLD_W, VIEW_H);

    this.buildSharedWorld();
    this.buildMeadow();
    this.buildRiver();
    this.buildCharacters();
    this.buildHud();
    this.buildMapOverlay();
    this.buildParentOverlay();
    this.buildChoiceOverlay();
    this.buildNovaOverlay();
    this.buildDebugOverlay();

    this.layout(this.scale.width, this.scale.height);
    this.applyState(false);

    this.unsubscribe = sproutStoryStore.subscribe((next) => {
      this.state = next;
      this.applyState(true);
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.input.once('pointerdown', () => void this.audio.ensureStarted());
  }

  private buildSharedWorld() {
    const sky = this.add.graphics().setScrollFactor(0.08);
    sky.fillGradientStyle(0xdbe9e4, 0xdbe9e4, 0xa7c6be, 0x88aab0, 1);
    sky.fillRect(-120, 0, WORLD_W + 240, VIEW_H);

    this.add.circle(470, 190, 86, 0xffedc8, 0.5).setScrollFactor(0.12).setBlendMode(Phaser.BlendModes.ADD);
    const cloudLayer = this.add.container(0, 0).setScrollFactor(0.18);
    for (let index = 0; index < 12; index += 1) {
      const x = 40 + index * 145;
      const y = 150 + (index % 4) * 72;
      const cloud = this.add.container(x, y);
      cloud.add([
        this.add.ellipse(0, 0, 112, 34, 0xf8fbf8, 0.46),
        this.add.circle(-28, -8, 27, 0xf8fbf8, 0.42),
        this.add.circle(20, -12, 34, 0xf8fbf8, 0.44),
      ]);
      cloudLayer.add(cloud);
      this.tweens.add({ targets: cloud, x: x + 32, duration: 9000 + index * 430, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    const farMountains = this.add.graphics().setScrollFactor(0.28);
    farMountains.fillStyle(0x78978e, 0.52);
    farMountains.fillTriangle(-120, 620, 160, 290, 450, 620);
    farMountains.fillTriangle(220, 620, 560, 330, 900, 620);
    farMountains.fillTriangle(680, 620, 1020, 270, 1380, 620);
    farMountains.fillTriangle(1120, 620, 1450, 350, 1660, 620);
    farMountains.fillStyle(0xa8bfb3, 0.64);
    farMountains.fillTriangle(20, 650, 290, 390, 570, 650);
    farMountains.fillTriangle(510, 650, 780, 430, 1050, 650);
    farMountains.fillTriangle(950, 650, 1240, 400, 1510, 650);

    const mist = this.add.graphics().setScrollFactor(0.44);
    mist.fillStyle(0xf1f5ed, 0.26);
    for (let x = -60; x < WORLD_W + 140; x += 180) mist.fillEllipse(x, 590 + ((x / 180) % 2) * 20, 290, 90);

    const ground = this.add.graphics();
    ground.fillStyle(0x6f9271, 1).fillRect(0, 570, WORLD_W, 710);
    ground.fillStyle(0x7da47a, 1).fillEllipse(360, 670, 820, 310);
    ground.fillStyle(0x688d6b, 1).fillEllipse(1070, 690, 790, 330);
    ground.fillStyle(0x5c7f64, 1).fillRect(0, 870, WORLD_W, 410);

    const texture = this.add.graphics();
    for (let index = 0; index < 160; index += 1) {
      const x = (index * 91) % WORLD_W;
      const y = 600 + ((index * 47) % 600);
      texture.fillStyle(index % 3 === 0 ? 0x91b187 : 0x54765d, 0.24);
      texture.fillCircle(x, y, index % 5 === 0 ? 3 : 1.5);
    }

    addSparkleField(this, 365, 640, 350, 18, 0xeef7d2).setScrollFactor(0.7);
    addSparkleField(this, 1090, 650, 340, 21, 0xdff5d9).setScrollFactor(0.7);
  }

  private buildMeadow() {
    const backTrees = this.add.container(0, 0).setScrollFactor(0.74);
    for (let index = 0; index < 9; index += 1) {
      const x = 40 + index * 88;
      const y = 610 + (index % 3) * 26;
      const tree = this.add.container(x, y);
      tree.add([
        this.add.rectangle(0, 58, 18, 110, 0x6a5845, 1),
        this.add.circle(-20, 0, 44, 0x547a5c, 0.96),
        this.add.circle(22, 6, 52, 0x648a65, 0.96),
        this.add.circle(3, -32, 50, 0x6f946d, 0.98),
      ]);
      backTrees.add(tree);
    }

    const riverClue = this.add.container(565, 700);
    const glow = this.add.circle(0, 0, 48, 0xcafbe3, 0.2).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.circle(0, 0, 10, 0xe9fff2, 0.95).setBlendMode(Phaser.BlendModes.ADD);
    riverClue.add([glow, core]);
    riverClue.setSize(124, 124).setInteractive({ useHandCursor: true });
    riverClue.on('pointerdown', () => {
      this.nova?.setPose('pointing');
      this.cameras.main.pan(520, 650, 750, 'Sine.easeInOut');
    });
    this.tweens.add({ targets: glow, scale: { from: 0.8, to: 1.24 }, alpha: { from: 0.12, to: 0.38 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.light = riverClue;

    const path = this.add.graphics();
    path.fillStyle(0xc6b68f, 0.5);
    path.fillPoints([
      new Phaser.Geom.Point(440, 855),
      new Phaser.Geom.Point(535, 770),
      new Phaser.Geom.Point(665, 718),
      new Phaser.Geom.Point(720, 728),
      new Phaser.Geom.Point(720, 790),
      new Phaser.Geom.Point(585, 822),
      new Phaser.Geom.Point(495, 900),
    ], true);

    this.pathVines = this.add.container(638, 745);
    for (let index = 0; index < 12; index += 1) {
      const leaf = addSoftLeaf(this, -55 + (index % 6) * 23, -35 + Math.floor(index / 6) * 44, 0.9 + (index % 3) * 0.15, index % 2 ? 0x4f7b5c : 0x5e8c61, index % 2 ? 0.7 : -0.65);
      this.pathVines.add(leaf);
    }

    const greatTree = this.add.container(220, 720);
    const trunk = this.add.graphics();
    trunk.fillStyle(0x735c47, 1).fillRoundedRect(-34, -60, 68, 190, 30);
    trunk.fillStyle(0x8a6e52, 0.65).fillRoundedRect(-12, -48, 20, 145, 10);
    const crown = this.add.container();
    crown.add([
      this.add.circle(-58, -72, 66, 0x638663, 1),
      this.add.circle(42, -92, 74, 0x6e936b, 1),
      this.add.circle(0, -145, 84, 0x789e71, 1),
      this.add.circle(80, -40, 56, 0x5f855e, 1),
    ]);
    greatTree.add([trunk, crown]);
    this.tweens.add({ targets: crown, rotation: 0.014, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    for (let index = 0; index < 24; index += 1) {
      addSoftLeaf(this, 20 + ((index * 71) % 640), 865 + ((index * 29) % 270), 0.45 + (index % 4) * 0.16, index % 2 ? 0x86a676 : 0x6e9369, (index % 5) * 0.34 - 0.6);
    }
  }

  private buildRiver() {
    const river = this.add.graphics();
    river.fillStyle(0x4f8990, 0.92);
    river.fillPoints([
      new Phaser.Geom.Point(760, 770),
      new Phaser.Geom.Point(880, 735),
      new Phaser.Geom.Point(1000, 760),
      new Phaser.Geom.Point(1130, 835),
      new Phaser.Geom.Point(1260, 880),
      new Phaser.Geom.Point(1440, 850),
      new Phaser.Geom.Point(1440, 1060),
      new Phaser.Geom.Point(1260, 1080),
      new Phaser.Geom.Point(1090, 1020),
      new Phaser.Geom.Point(970, 930),
      new Phaser.Geom.Point(850, 880),
      new Phaser.Geom.Point(760, 890),
    ], true);
    river.fillStyle(0x91c2bb, 0.26);
    for (let index = 0; index < 15; index += 1) river.fillEllipse(810 + (index * 73) % 610, 808 + ((index * 41) % 195), 90, 8);

    const waveLayer = this.add.container();
    for (let index = 0; index < 12; index += 1) {
      const wave = this.add.ellipse(820 + (index * 89) % 570, 805 + ((index * 53) % 190), 84, 6, 0xd9f4ed, 0.18);
      waveLayer.add(wave);
      this.tweens.add({ targets: wave, x: wave.x + 32, alpha: { from: 0.08, to: 0.32 }, duration: 1500 + (index % 4) * 240, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    const stones = this.add.container();
    ([[820, 850], [880, 900], [945, 950], [1040, 1010], [1170, 1042]] as const).forEach(([x, y], index) => {
      stones.add(this.add.ellipse(x, y, 52 + index * 5, 24 + index * 2, index % 2 ? 0x7c8c82 : 0x8d9b8e, 0.95));
    });

    const tree = this.add.container(1195, 685);
    const trunk = this.add.graphics();
    trunk.fillStyle(0x6f5842, 1).fillRoundedRect(-46, -40, 92, 245, 38);
    trunk.fillStyle(0x5e4a39, 1).fillTriangle(-18, 130, -125, 245, 18, 178);
    trunk.fillTriangle(20, 132, 122, 240, 4, 182);
    const crown = this.add.container();
    crown.add([
      this.add.circle(-72, -105, 92, 0x53775d, 1),
      this.add.circle(35, -145, 108, 0x628466, 1),
      this.add.circle(120, -78, 78, 0x587e60, 1),
      this.add.circle(5, -235, 88, 0x6f926d, 1),
    ]);
    tree.add([trunk, crown]);
    this.tweens.add({ targets: crown, rotation: -0.012, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.seed = this.add.container(940, 820).setVisible(false);
    const seedGlow = this.add.circle(0, 0, 52, 0xffe6a6, 0.15).setBlendMode(Phaser.BlendModes.ADD);
    const seedCore = this.add.ellipse(0, 0, 20, 30, 0xf4d77b, 1).setRotation(0.35);
    this.seed.add([seedGlow, seedCore, addSparkleField(this, 0, 0, 62, 10, 0xfff2bc)]);
    this.tweens.add({ targets: seedGlow, scale: { from: 0.8, to: 1.22 }, alpha: { from: 0.08, to: 0.32 }, duration: 900, yoyo: true, repeat: -1 });

    this.waterFlower = this.createFlower(930, 845, 0x8ed8da, 0xdffdf1);
    this.moonFlower = this.createFlower(1184, 835, 0xc4b8de, 0xf4ebff);
    this.waterFlower.setVisible(false);
    this.moonFlower.setVisible(false);

    this.shelterFrame = this.add.container(1284, 850).setVisible(false);
    const frame = this.add.graphics();
    frame.lineStyle(10, 0x8b6e4e, 1);
    frame.lineBetween(-56, 52, -56, -28);
    frame.lineBetween(56, 52, 56, -28);
    frame.lineBetween(-56, -28, 0, -72);
    frame.lineBetween(0, -72, 56, -28);
    frame.lineBetween(-56, 52, 56, 52);
    this.shelterFrame.add(frame);

    this.shelterLeaves = this.add.container(1284, 850).setVisible(false);
    const roof = this.add.graphics();
    roof.fillStyle(0x617d59, 1).fillTriangle(-70, -22, 0, -88, 72, -22);
    roof.fillStyle(0x76956a, 0.82).fillTriangle(-54, -28, 4, -75, 58, -28);
    roof.fillStyle(0x826b50, 1).fillRoundedRect(-49, -20, 98, 74, 16);
    roof.fillStyle(0x314a3b, 1).fillRoundedRect(-18, 8, 36, 46, 14);
    this.shelterLeaves.add(roof);

    this.hiddenPathCover = this.add.container(1370, 720);
    for (let index = 0; index < 14; index += 1) {
      this.hiddenPathCover.add(addSoftLeaf(this, -55 + (index % 5) * 28, -90 + Math.floor(index / 5) * 55, 1.05, index % 2 ? 0x496d54 : 0x5a7c59, index % 2 ? 0.7 : -0.6));
    }

    this.woodsReveal = this.add.container(1390, 570).setAlpha(0.16);
    const woodsMist = this.add.graphics();
    woodsMist.fillStyle(0xdbe9e3, 0.18).fillEllipse(0, 130, 250, 170);
    const woodsTrees = this.add.graphics();
    for (let index = 0; index < 7; index += 1) {
      const x = -115 + index * 38;
      const height = 170 + (index % 3) * 60;
      woodsTrees.fillStyle(index % 2 ? 0x283f3a : 0x344d43, 0.88);
      woodsTrees.fillTriangle(x - 38, 160, x, 160 - height, x + 38, 160);
    }
    const distantLight = this.add.circle(32, 85, 9, 0x9fffe2, 0.7).setBlendMode(Phaser.BlendModes.ADD);
    const shadowCreature = this.add.ellipse(88, 112, 24, 42, 0x172a2b, 0.7);
    this.woodsReveal.add([woodsTrees, woodsMist, distantLight, shadowCreature]);

    for (let index = 0; index < 27; index += 1) {
      addSoftLeaf(this, 760 + ((index * 83) % 650), 885 + ((index * 37) % 280), 0.45 + (index % 3) * 0.18, index % 2 ? 0x78976b : 0x658761, (index % 5) * 0.28 - 0.5);
    }

    const foreground = this.add.container(710, 0).setScrollFactor(1.15).setDepth(40);
    for (let index = 0; index < 9; index += 1) {
      foreground.add(addSoftLeaf(this, -45 + (index % 3) * 42, 580 + Math.floor(index / 3) * 95, 1.4, index % 2 ? 0x466a52 : 0x55775b, index % 2 ? 0.8 : -0.8));
    }
  }

  private createFlower(x: number, y: number, petalColor: number, centerColor: number) {
    const flower = this.add.container(x, y);
    const stem = this.add.rectangle(0, 30, 7, 62, 0x5f8258, 1);
    const petals = this.add.container(0, 0);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      petals.add(this.add.ellipse(Math.cos(angle) * 22, Math.sin(angle) * 22, 20, 40, petalColor, 0.96).setRotation(angle));
    }
    petals.add(this.add.circle(0, 0, 12, centerColor, 1));
    flower.add([stem, petals, addSparkleField(this, 0, -6, 62, 8, centerColor)]);
    this.tweens.add({ targets: petals, rotation: 0.06, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return flower;
  }

  private buildCharacters() {
    this.nova = createNovaActor(this, 350, 845);
    this.nova.view.setDepth(30);
    this.lumi = createLumiActor(this, 1040, 842);
    this.lumi.view.setDepth(29).setVisible(false);
  }

  private buildHud() {
    const top = this.add.container(0, 0).setScrollFactor(0).setDepth(UI_DEPTH);
    const topBg = this.add.graphics();
    topBg.fillStyle(0x17382f, 0.88).fillRoundedRect(22, 28, 676, 164, 30);
    topBg.lineStyle(1, 0xffffff, 0.08).strokeRoundedRect(22, 28, 676, 164, 30);
    const planet = this.add.text(52, 52, 'SPROUT PLANET', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#b8d4c2',
      letterSpacing: 2,
    });
    this.dayText = this.add.text(52, 79, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f7fbf3',
    });
    this.hintText = this.add.text(52, 119, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#dbe8dc',
      wordWrap: { width: 600 },
      align: 'right',
    });
    top.add([topBg, planet, this.dayText, this.hintText]);

    const story = this.add.container(0, 0).setScrollFactor(0).setDepth(UI_DEPTH + 1);
    const bubble = this.add.graphics();
    bubble.fillStyle(0xf5f1e7, 0.94).fillRoundedRect(32, 220, 656, 116, 26);
    bubble.lineStyle(1, 0x274d42, 0.08).strokeRoundedRect(32, 220, 656, 116, 26);
    this.novaText = this.add.text(60, 247, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#264238',
      wordWrap: { width: 600 },
      align: 'right',
    });
    story.add([bubble, this.novaText]);

    const habits = this.add.container(0, 0).setScrollFactor(0).setDepth(UI_DEPTH + 2);
    const panel = this.add.graphics();
    panel.fillStyle(0x102e28, 0.94).fillRoundedRect(24, 905, 672, 342, 32);
    panel.lineStyle(1, 0xffffff, 0.08).strokeRoundedRect(24, 905, 672, 342, 32);
    const title = this.add.text(52, 930, 'عادات النهارده', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#f2f7ef',
    });
    this.progressText = this.add.text(650, 936, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#a8c8b0',
    }).setOrigin(1, 0);
    habits.add([panel, title, this.progressText]);

    SPROUT_HABITS.forEach((habit, index) => {
      const rowY = 984 + index * 62;
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x1b4037, 0.9).fillRoundedRect(48, rowY, 624, 50, 18);
      const dot = this.add.circle(78, rowY + 25, 12, 0x375a50, 1).setStrokeStyle(2, 0x9ab7a2, 0.6);
      const label = this.add.text(105, rowY + 13, habit.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#f4f8f1',
      });
      const status = this.add.text(642, rowY + 15, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#b9d1bf',
      }).setOrigin(1, 0);
      const hit = this.add.zone(360, rowY + 25, 624, 50).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        void this.audio.ensureStarted();
        sproutStoryStore.toggleHabit(habit.id);
      });
      habits.add([rowBg, dot, label, status, hit]);
      this.habitRows.set(habit.id, { status, dot });
    });

    this.dayDoneText = this.add.text(52, 1180, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#d8ebd8',
      wordWrap: { width: 330 },
    });
    habits.add(this.dayDoneText);
    habits.add(addRoundedButton(this, 390, 1172, 94, 54, 'Nova ✦', () => this.showOverlay(this.novaOverlay), { fill: 0x665fae, fontSize: 13 }));
    habits.add(addRoundedButton(this, 492, 1172, 88, 54, 'الخريطة', () => this.showOverlay(this.mapOverlay), { fill: 0x294d43, fontSize: 13 }));
    habits.add(addRoundedButton(this, 588, 1172, 84, 54, 'الأهل', () => this.showOverlay(this.parentOverlay), { fill: 0x294d43, fontSize: 13 }));
  }

  private buildMapOverlay() {
    this.mapOverlay = this.createModalShell('خريطة Sprout Planet');
    this.mapDayText = this.add.text(70, 190, '', { fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#5c7468' });
    this.mapOverlay.add(this.mapDayText);
    const regions = ['Landing Meadow', 'River Clearing', 'Great Tree', 'Whisper Woods', 'Crystal Caves', 'Planet Heart'];
    regions.forEach((name, index) => {
      const y = 270 + index * 118;
      if (index < regions.length - 1) {
        const line = this.add.rectangle(112, y + 64, 4, 86, index < 1 ? 0x749981 : 0xc8d2ca, 0.8);
        this.mapOverlay?.add(line);
      }
      const unlocked = index < 2;
      const node = this.add.circle(112, y, 28, unlocked ? (index === 0 ? 0x7aa37e : 0x568b7e) : 0xd8ded8, 1);
      const number = this.add.text(112, y, `${index + 1}`, { fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: unlocked ? '#ffffff' : '#8d9b92' }).setOrigin(0.5);
      const label = this.add.text(166, y - 13, name, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: unlocked ? '#29463d' : '#9aa69e' });
      const sub = this.add.text(166, y + 14, unlocked ? (index === 0 ? 'بداية الحكاية' : 'المكان الحالي في التجربة') : 'لسه قدامنا', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#819087' });
      this.mapOverlay?.add([node, number, label, sub]);
    });
    this.mapOverlay.setVisible(false);
  }

  private buildParentOverlay() {
    this.parentOverlay = this.createModalShell('لوحة ولي الأمر');
    const intro = this.add.text(70, 190, 'واجهة هادية وسريعة لمتابعة التقدم والموافقات.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#66786f',
      wordWrap: { width: 560 },
    });
    const planet = this.add.text(70, 252, 'Current planet  ·  Sprout Planet', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#29443a' });
    this.parentHabitSummary = this.add.text(70, 320, '', { fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: '#40584d', lineSpacing: 10, wordWrap: { width: 560 } });
    this.parentPendingText = this.add.text(70, 545, '', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#725f3a', wordWrap: { width: 560 } });
    const approve = addRoundedButton(this, 70, 600, 560, 64, 'تأكيد ترتيب السرير', () => sproutStoryStore.approveBed(), { fill: 0x355f52, fontSize: 16 });
    const manage = this.add.text(70, 710, 'Manage habits\n• 2 of 3 required to advance\n• ترتيب السرير = parent approval\n• باقي العادات = child trust', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#62736a',
      lineSpacing: 9,
    });
    this.parentOverlay.add([intro, planet, this.parentHabitSummary, this.parentPendingText, approve, manage]);
    this.parentOverlay.setVisible(false);
  }

  private buildChoiceOverlay() {
    this.choiceOverlay = this.createModalShell('أين نضع البذرة؟', false);
    const text = this.add.text(70, 225, 'اختيارك هيغيّر شكل المكان، لكن الحكاية الرئيسية هتكمل في الحالتين.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#355046',
      wordWrap: { width: 560 },
      align: 'right',
    });
    const water = addRoundedButton(this, 70, 360, 560, 84, 'قرب الماء  💧', () => sproutStoryStore.chooseSeed('water'), { fill: 0x4d817f, fontSize: 20 });
    const tree = addRoundedButton(this, 70, 468, 560, 84, 'تحت الشجرة  ◐', () => sproutStoryStore.chooseSeed('tree'), { fill: 0x716987, fontSize: 20 });
    this.choiceOverlay.add([text, water, tree]);
    this.choiceOverlay.setVisible(false);
  }

  private buildNovaOverlay() {
    this.novaOverlay = this.createModalShell('اتكلم مع Nova');
    const mode = this.add.text(70, 192, 'Conversation provider قابل للتبديل بين mock / live.', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#718078' });
    this.novaReply = this.add.text(70, 250, 'اختار سؤال صغير لـ Nova.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#314a41',
      wordWrap: { width: 560 },
      lineSpacing: 7,
      align: 'right',
    });
    const ask = (message: string) => void this.askNova(message);
    const a = addRoundedButton(this, 70, 470, 560, 68, 'إيه اللي حصل النهارده؟', () => ask('إيه اللي حصل؟'), { fill: 0x665fae, fontSize: 16 });
    const b = addRoundedButton(this, 70, 555, 560, 68, 'إيه اللي هيحصل بعد كده؟', () => ask('إيه اللي هيحصل بعد كده؟'), { fill: 0x665fae, fontSize: 16 });
    const c = addRoundedButton(this, 70, 640, 560, 68, 'قولي حاجة عن Lumi', () => ask('قولي حاجة عن Lumi'), { fill: 0x665fae, fontSize: 16 });
    this.novaOverlay.add([mode, this.novaReply, a, b, c]);
    this.novaOverlay.setVisible(false);
  }

  private buildDebugOverlay() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('dev')) return;
    this.debugOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(UI_DEPTH + 20);
    const bg = this.add.graphics();
    bg.fillStyle(0x111b1a, 0.96).fillRoundedRect(28, 360, 664, 510, 24);
    const title = this.add.text(48, 382, 'DEV · Sprout story controls', { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#dff7e5' });
    this.debugOverlay.add([bg, title]);
    for (let day = 1; day <= 7; day += 1) {
      this.debugOverlay.add(addRoundedButton(this, 48 + (day - 1) * 86, 425, 74, 48, `D${day}`, () => sproutStoryStore.jumpToDay(day), { fill: 0x28463f, fontSize: 13 }));
    }
    this.debugOverlay.add([
      addRoundedButton(this, 48, 490, 180, 50, 'Complete habits', () => sproutStoryStore.completeTrustedHabits(), { fill: 0x385c50, fontSize: 13 }),
      addRoundedButton(this, 242, 490, 180, 50, 'Approve bed', () => sproutStoryStore.approveBed(), { fill: 0x385c50, fontSize: 13 }),
      addRoundedButton(this, 436, 490, 180, 50, 'Next day', () => sproutStoryStore.nextDayForDemo(), { fill: 0x385c50, fontSize: 13 }),
      addRoundedButton(this, 48, 555, 180, 50, 'Choice: water', () => sproutStoryStore.chooseSeed('water'), { fill: 0x4d7774, fontSize: 13 }),
      addRoundedButton(this, 242, 555, 180, 50, 'Choice: tree', () => sproutStoryStore.chooseSeed('tree'), { fill: 0x665e79, fontSize: 13 }),
      addRoundedButton(this, 436, 555, 180, 50, 'Spawn Lumi', () => sproutStoryStore.setLumiDiscovered(true), { fill: 0x6a704a, fontSize: 13 }),
      addRoundedButton(this, 48, 620, 180, 50, 'Shelter 0', () => sproutStoryStore.setShelterProgress(0), { fill: 0x5e4c3d, fontSize: 13 }),
      addRoundedButton(this, 242, 620, 180, 50, 'Shelter 1', () => sproutStoryStore.setShelterProgress(1), { fill: 0x5e4c3d, fontSize: 13 }),
      addRoundedButton(this, 436, 620, 180, 50, 'Shelter 2', () => sproutStoryStore.setShelterProgress(2), { fill: 0x5e4c3d, fontSize: 13 }),
      addRoundedButton(this, 48, 685, 180, 50, 'Unlock path', () => sproutStoryStore.setHiddenPath(true), { fill: 0x365748, fontSize: 13 }),
      addRoundedButton(this, 242, 685, 180, 50, 'Nova mock/live', () => sproutStoryStore.setNovaMode(this.state.novaMode === 'mock' ? 'live' : 'mock'), { fill: 0x5e5795, fontSize: 13 }),
      addRoundedButton(this, 436, 685, 180, 50, 'RESET STORY', () => sproutStoryStore.reset(), { fill: 0x7a4d4a, fontSize: 13 }),
    ]);
    this.debugOverlay.add(addRoundedButton(this, 242, 775, 180, 52, 'Hide panel', () => this.debugOverlay?.setVisible(false), { fill: 0x2c3935, fontSize: 13 }));
  }

  private createModalShell(title: string, closable = true) {
    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(UI_DEPTH + 10);
    const shade = this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x10211d, 0.48);
    const card = this.add.graphics();
    card.fillStyle(0xf5f3eb, 0.985).fillRoundedRect(34, 110, 652, 1040, 34);
    card.lineStyle(1, 0x1e4738, 0.1).strokeRoundedRect(34, 110, 652, 1040, 34);
    const heading = this.add.text(70, 142, title, { fontFamily: 'system-ui, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#29453b' });
    root.add([shade, card, heading]);
    if (closable) root.add(addRoundedButton(this, 570, 132, 82, 48, 'إغلاق', () => root.setVisible(false), { fill: 0xdde5dd, textColor: '#385248', fontSize: 13 }));
    return root;
  }

  private showOverlay(overlay?: Phaser.GameObjects.Container) {
    if (!overlay) return;
    this.mapOverlay?.setVisible(false);
    this.parentOverlay?.setVisible(false);
    this.novaOverlay?.setVisible(false);
    overlay.setVisible(true);
  }

  private async askNova(message: string) {
    if (!this.novaReply) return;
    this.novaReply.setText('Nova بتفكر…');
    this.nova?.setPose('thinking');
    try {
      const provider = novaProviders[this.state.novaMode];
      const response = await provider.ask(message, visibleNovaContext(this.state));
      this.novaReply.setText(response);
      this.nova?.setPose('talk');
    } catch (error) {
      this.novaReply.setText(error instanceof Error ? error.message : 'Nova Live غير متاح دلوقتي.');
      this.nova?.setPose('idle');
    }
  }

  private applyState(animated: boolean) {
    const previous = this.lastApplied;
    const day = getSproutDay(this.state.currentDay);
    const completed = Object.values(this.state.habits).filter((status) => status === 'done').length;

    this.dayText?.setText(`Day ${this.state.currentDay} of 30`);
    this.hintText?.setText(day.hint);
    this.novaText?.setText(this.state.dayResolved ? `${day.resolvedLine}\n${day.hook}` : day.intro);
    this.progressText?.setText(`${completed} / ${day.requiredHabits} مطلوب`);
    this.dayDoneText?.setText(this.state.dayResolved ? (this.state.currentDay === 7 ? 'نكمل بكرة · Whisper Woods مستنيانا' : 'قصة النهارده اتقدمت ✓') : 'العادات بتحرّك الحكاية نفسها — مفيش عملات.');

    for (const habit of SPROUT_HABITS) {
      const row = this.habitRows.get(habit.id);
      if (!row) continue;
      const status = this.state.habits[habit.id];
      row.status.setText(status === 'done' ? 'تم ✓' : status === 'pending' ? 'مستني موافقة' : habit.verification === 'parent_approval' ? 'يحتاج موافقة' : 'اضغط لما تخلص');
      row.dot.setFillStyle(status === 'done' ? 0x8dcf8d : status === 'pending' ? 0xe2b96d : 0x375a50, 1);
    }

    this.light?.setScale(this.state.currentDay > 1 || (this.state.currentDay === 1 && this.state.dayResolved) ? 1.34 : 0.9);
    const pathOpen = this.state.storyEventsSeen.includes('path_opens') || this.state.currentDay >= 3;
    this.pathVines?.setAlpha(pathOpen ? 0.08 : 1);
    this.seed?.setVisible(this.state.seedDiscovered && !this.state.seedChoice);
    this.waterFlower?.setVisible(this.state.flowerType === 'water' && this.state.currentDay >= 4);
    this.moonFlower?.setVisible(this.state.flowerType === 'moon' && this.state.currentDay >= 4);
    this.lumi?.view.setVisible(this.state.lumiDiscovered);
    this.lumi?.setPose(this.state.currentDay === 6 && !this.state.dayResolved ? 'sleeping' : this.state.dayResolved ? 'happy' : 'idle');
    this.shelterFrame?.setVisible(this.state.shelterProgress >= 1);
    this.shelterLeaves?.setVisible(this.state.shelterProgress >= 2);
    this.hiddenPathCover?.setAlpha(this.state.hiddenPathUnlocked ? 0.04 : 1);
    this.woodsReveal?.setAlpha(this.state.hiddenPathUnlocked ? 1 : 0.14);

    this.parentPendingText?.setText(this.state.habits.bed === 'pending' ? 'طلب موافقة: الطفل علّم "رتّب سريرك" كمكتمل.' : 'لا توجد موافقات معلقة الآن.');
    this.parentHabitSummary?.setText(`Day ${this.state.currentDay} / 30\nاشرب مياه: ${this.state.habits.water}\nاقرأ 10 دقايق: ${this.state.habits.read}\nرتّب سريرك: ${this.state.habits.bed}`);
    this.mapDayText?.setText(`Day ${this.state.currentDay} / 30 · منطقتان مكتملتان في الـ vertical slice`);

    const choiceNeeded = this.state.currentDay === 3 && this.state.seedDiscovered && !this.state.seedChoice;
    this.choiceOverlay?.setVisible(choiceNeeded);

    if (!animated || !previous) this.moveCameraToState(false);
    else this.runStateTransition(previous);

    this.audio.setRiverPresence(this.state.currentLocation === 'river');
    this.lastApplied = structuredClone(this.state);
  }

  private moveCameraToState(animated: boolean) {
    const target = this.state.currentLocation === 'river' ? RIVER_CENTER : MEADOW_CENTER;
    if (animated) this.cameras.main.pan(target, VIEW_H / 2, 1150, 'Sine.easeInOut');
    else this.cameras.main.centerOn(target, VIEW_H / 2);
    if (this.nova) {
      const x = this.state.currentLocation === 'river' ? 860 : 350;
      const y = this.state.currentLocation === 'river' ? 790 : 845;
      if (animated) this.nova.moveTo(x, y, 1050);
      else this.nova.view.setPosition(x, y);
    }
  }

  private runStateTransition(previous: SproutStoryState) {
    if (this.revealBusy) {
      this.moveCameraToState(false);
      return;
    }
    const newEvents = this.state.storyEventsSeen.filter((event) => !previous.storyEventsSeen.includes(event));
    const important = newEvents.at(-1);
    if (!important) {
      if (previous.currentLocation !== this.state.currentLocation) this.moveCameraToState(true);
      return;
    }

    this.revealBusy = true;
    void this.audio.ensureStarted().then(() => {
      this.audio.cue(important === 'hidden_path_unlock' ? 'final' : important === 'lumi_emerges' ? 'lumi' : important === 'seed_discovered' ? 'discovery' : 'reveal');
    });

    if (important === 'path_opens') {
      this.nova?.setPose('excited');
      this.tweens.add({ targets: this.pathVines, alpha: 0.08, x: this.pathVines ? this.pathVines.x + 85 : 0, duration: 900, ease: 'Sine.InOut' });
      this.time.delayedCall(500, () => this.moveCameraToState(true));
      this.time.delayedCall(1700, () => { this.revealBusy = false; });
      return;
    }

    if (important === 'seed_discovered') {
      this.nova?.setPose('thinking');
      this.cameras.main.pan(960, 720, 820, 'Sine.easeInOut');
      this.time.delayedCall(1200, () => { this.revealBusy = false; });
      return;
    }

    if (important === 'lumi_emerges') {
      this.nova?.setPose('excited');
      this.lumi?.view.setVisible(true).setScale(0.2);
      this.tweens.add({ targets: this.lumi?.view, scale: 1, duration: 700, ease: 'Back.Out' });
      this.cameras.main.pan(1040, 720, 700, 'Sine.easeInOut');
      this.time.delayedCall(1250, () => { this.revealBusy = false; });
      return;
    }

    if (important === 'hidden_path_unlock') {
      this.nova?.setPose('pointing');
      this.lumi?.setPose('run');
      this.lumi?.moveTo(1330, 760, 900);
      this.tweens.add({ targets: this.hiddenPathCover, alpha: 0.04, x: this.hiddenPathCover ? this.hiddenPathCover.x + 95 : 0, duration: 950, ease: 'Sine.InOut' });
      this.tweens.add({ targets: this.woodsReveal, alpha: 1, duration: 1100 });
      this.cameras.main.pan(1265, 650, 1350, 'Sine.easeInOut');
      this.time.delayedCall(2600, () => { this.revealBusy = false; });
      return;
    }

    this.nova?.setPose(important === 'flower_blooms' || important === 'shelter_complete' ? 'happy' : 'excited');
    this.cameras.main.shake(240, 0.0012);
    this.time.delayedCall(950, () => { this.revealBusy = false; });
  }

  private layout(width: number, height: number) {
    const zoom = Math.min(width / VIEW_W, height / VIEW_H);
    const camera = this.cameras.main;
    camera.setZoom(zoom);
    camera.setViewport(0, 0, width, height);
    this.moveCameraToState(false);
  }

  private readonly handleResize = (gameSize: Phaser.Structs.Size) => {
    this.layout(gameSize.width, gameSize.height);
  };

  private readonly handleShutdown = () => {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  };
}
