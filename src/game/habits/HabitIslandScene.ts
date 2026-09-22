import Phaser from 'phaser';

const DESIGN_W = 1280;
const DESIGN_H = 720;
const JOURNEY_DAYS = 30;
const STORAGE_KEY = 'kidslive.mystery-island.progress.v1';

const MILESTONES = [
  { day: 1, label: 'A shoreline appears' },
  { day: 3, label: 'The forest wakes up' },
  { day: 7, label: 'A waterfall reveals itself' },
  { day: 14, label: 'A hidden tower rises' },
  { day: 21, label: 'The star gate starts glowing' },
  { day: 30, label: 'Mystery Island is yours' },
] as const;

type SavedProgress = {
  completedDays: number;
  lastCompletedDate: string | null;
};

type RevealLayer = {
  day: number;
  target: Phaser.GameObjects.GameObject & { alpha: number; setAlpha(alpha: number): unknown };
  alpha: number;
};

function localDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readProgress(): SavedProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedDays: 0, lastCompletedDate: null };
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    const completedDays = Math.max(0, Math.min(JOURNEY_DAYS, Number(parsed.completedDays) || 0));
    return {
      completedDays,
      lastCompletedDate: typeof parsed.lastCompletedDate === 'string' ? parsed.lastCompletedDate : null,
    };
  } catch {
    return { completedDays: 0, lastCompletedDate: null };
  }
}

function writeProgress(progress: SavedProgress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export class HabitIslandScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private world?: Phaser.GameObjects.Container;
  private ui?: Phaser.GameObjects.Container;
  private progress = readProgress();
  private revealLayers: RevealLayer[] = [];
  private fog?: Phaser.GameObjects.Container;
  private dayLabel?: Phaser.GameObjects.Text;
  private progressBar?: Phaser.GameObjects.Graphics;
  private novaBubble?: Phaser.GameObjects.Text;
  private actionBg?: Phaser.GameObjects.Graphics;
  private actionLabel?: Phaser.GameObjects.Text;
  private actionZone?: Phaser.GameObjects.Zone;
  private scaleFactor = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor() {
    super('habit-island');
  }

  create() {
    this.cameras.main.setBackgroundColor('#07111f');
    this.root = this.add.container();
    this.world = this.add.container();
    this.ui = this.add.container();
    this.root.add([this.world, this.ui]);

    this.buildSky();
    this.buildIsland();
    this.buildFog();
    this.buildNova();
    this.buildUi();
    this.applyProgress(false);

    this.layout(this.scale.width, this.scale.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private buildSky() {
    if (!this.world) return;

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x071525, 0x071525, 0x173b58, 0x24536a, 1);
    sky.fillRect(0, 0, DESIGN_W, DESIGN_H);

    const horizonGlow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    horizonGlow.fillStyle(0x7ed7d1, 0.13);
    horizonGlow.fillEllipse(770, 335, 860, 430);
    horizonGlow.fillStyle(0xc1a7ff, 0.08);
    horizonGlow.fillEllipse(860, 180, 560, 360);

    const stars = this.add.graphics();
    for (let index = 0; index < 78; index += 1) {
      const x = 320 + ((index * 97) % 930);
      const y = 24 + ((index * 53) % 330);
      const radius = index % 11 === 0 ? 2.1 : 1;
      stars.fillStyle(index % 7 === 0 ? 0xffefbd : 0xd8eeff, index % 5 === 0 ? 0.72 : 0.34);
      stars.fillCircle(x, y, radius);
    }

    const moon = this.add.circle(1054, 112, 42, 0xffefc9, 0.92).setBlendMode(Phaser.BlendModes.ADD);
    const moonShade = this.add.circle(1070, 101, 37, 0x183653, 0.88);

    const sea = this.add.graphics();
    sea.fillGradientStyle(0x0c2a3d, 0x0c2a3d, 0x10384b, 0x061c2b, 1);
    sea.fillRect(0, 388, DESIGN_W, DESIGN_H - 388);
    sea.lineStyle(2, 0x8be0dc, 0.08);
    for (let row = 0; row < 13; row += 1) {
      const y = 414 + row * 22;
      sea.beginPath();
      for (let x = 260; x < DESIGN_W + 80; x += 84) {
        sea.moveTo(x + (row % 2) * 30, y);
        sea.lineTo(x + 42 + (row % 2) * 30, y - 5);
      }
      sea.strokePath();
    }

    this.world.add([sky, horizonGlow, stars, moon, moonShade, sea]);
  }

  private buildIsland() {
    if (!this.world) return;

    const shadow = this.add.ellipse(825, 548, 590, 104, 0x020911, 0.5);

    const island = this.add.container(820, 415);
    const base = this.add.graphics();
    base.fillStyle(0x152b36, 1);
    base.fillPoints([
      new Phaser.Geom.Point(-260, 72),
      new Phaser.Geom.Point(-202, 142),
      new Phaser.Geom.Point(-86, 170),
      new Phaser.Geom.Point(48, 164),
      new Phaser.Geom.Point(192, 120),
      new Phaser.Geom.Point(268, 52),
      new Phaser.Geom.Point(210, 20),
      new Phaser.Geom.Point(82, 5),
      new Phaser.Geom.Point(-72, 9),
      new Phaser.Geom.Point(-202, 35),
    ], true);
    base.fillStyle(0x315f54, 1);
    base.fillEllipse(0, 30, 520, 170);
    base.fillStyle(0x5e9471, 1);
    base.fillEllipse(-8, 5, 462, 134);

    const beach = this.add.graphics();
    beach.fillStyle(0xe0c890, 0.96);
    beach.fillEllipse(-92, 78, 222, 55);
    beach.fillStyle(0x8fb38c, 0.7);
    beach.fillEllipse(46, 52, 150, 42);

    const hills = this.add.graphics();
    hills.fillStyle(0x2d6e5b, 1);
    hills.fillTriangle(-190, 44, -98, -102, 6, 42);
    hills.fillStyle(0x3d8468, 1);
    hills.fillTriangle(-136, 45, -48, -74, 70, 42);
    hills.fillStyle(0x275d55, 1);
    hills.fillTriangle(34, 42, 124, -72, 218, 44);
    hills.fillStyle(0xa6d2a1, 0.78);
    hills.fillTriangle(-109, -87, -98, -102, -81, -82);

    island.add([base, beach, hills]);
    this.world.add([shadow, island]);

    this.revealLayers.push({ day: 1, target: island, alpha: 1 });

    const forest = this.add.container(735, 388);
    for (let index = 0; index < 12; index += 1) {
      const x = ((index * 43) % 190) - 86;
      const y = ((index * 29) % 72) - 18;
      const trunk = this.add.rectangle(x, y + 22, 7, 33, 0x5a4737, 1);
      const crown = this.add.circle(x, y, 17 + (index % 3) * 3, index % 2 === 0 ? 0x4d9a68 : 0x3f835e, 1);
      forest.add([trunk, crown]);
    }
    this.world.add(forest);
    this.revealLayers.push({ day: 3, target: forest, alpha: 1 });

    const waterfall = this.add.container(666, 350);
    const rock = this.add.graphics();
    rock.fillStyle(0x234e4c, 1).fillTriangle(-44, 45, 8, -52, 62, 46);
    const waterGlow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    waterGlow.fillStyle(0x82eff0, 0.42).fillRoundedRect(3, -26, 16, 94, 8);
    waterGlow.fillStyle(0xbffcff, 0.5).fillEllipse(11, 67, 56, 15);
    waterfall.add([rock, waterGlow]);
    this.world.add(waterfall);
    this.revealLayers.push({ day: 7, target: waterfall, alpha: 1 });

    const tower = this.add.container(920, 323);
    const towerBody = this.add.graphics();
    towerBody.fillStyle(0x544f78, 1).fillRoundedRect(-28, -55, 56, 112, 8);
    towerBody.fillStyle(0x716b9f, 1).fillTriangle(-42, -51, 0, -92, 42, -51);
    towerBody.fillStyle(0xe6c67f, 0.9).fillRoundedRect(-7, -18, 14, 23, 6);
    const towerGlow = this.add.circle(0, -96, 8, 0xffe5a6, 0.95).setBlendMode(Phaser.BlendModes.ADD);
    tower.add([towerBody, towerGlow]);
    this.world.add(tower);
    this.revealLayers.push({ day: 14, target: tower, alpha: 1 });

    const gate = this.add.container(1030, 420);
    const gateArt = this.add.graphics();
    gateArt.lineStyle(13, 0x6c7fae, 1);
    gateArt.strokeCircle(0, 0, 48);
    gateArt.lineStyle(4, 0xc8d4ff, 0.42);
    gateArt.strokeCircle(0, 0, 35);
    gateArt.fillStyle(0x1a2742, 0.75).fillCircle(0, 0, 31);
    const gateGlow = this.add.circle(0, 0, 25, 0x8ce8e1, 0.36).setBlendMode(Phaser.BlendModes.ADD);
    gate.add([gateArt, gateGlow]);
    this.tweens.add({
      targets: gateGlow,
      alpha: { from: 0.2, to: 0.62 },
      scale: { from: 0.88, to: 1.08 },
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.world.add(gate);
    this.revealLayers.push({ day: 21, target: gate, alpha: 1 });

    const unlocked = this.add.container(824, 316);
    const aura = this.add.circle(0, 0, 164, 0xfff0aa, 0.08).setBlendMode(Phaser.BlendModes.ADD);
    const sparkles = this.add.graphics();
    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const radius = 116 + (index % 3) * 25;
      sparkles.fillStyle(index % 2 === 0 ? 0xfff2b8 : 0x9af6e8, 0.82);
      sparkles.fillCircle(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.52, index % 4 === 0 ? 3 : 2);
    }
    unlocked.add([aura, sparkles]);
    this.world.add(unlocked);
    this.revealLayers.push({ day: 30, target: unlocked, alpha: 1 });
  }

  private buildFog() {
    if (!this.world) return;
    this.fog = this.add.container();

    const fogBack = this.add.graphics();
    fogBack.fillStyle(0xdcebf0, 0.19);
    fogBack.fillEllipse(820, 424, 660, 270);
    fogBack.fillEllipse(710, 390, 370, 190);
    fogBack.fillEllipse(978, 386, 370, 190);

    const clouds: Phaser.GameObjects.Arc[] = [];
    for (let index = 0; index < 20; index += 1) {
      const x = 540 + ((index * 73) % 590);
      const y = 345 + ((index * 41) % 185);
      const radius = 38 + (index % 4) * 11;
      const cloud = this.add.circle(x, y, radius, 0xe7f1f2, 0.24 + (index % 3) * 0.06);
      clouds.push(cloud);
    }

    this.fog.add([fogBack, ...clouds]);
    this.world.add(this.fog);

    this.tweens.add({
      targets: clouds,
      x: '+=10',
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
      delay: this.tweens.stagger(55),
    });
  }

  private buildNova() {
    if (!this.world) return;
    const nova = this.add.container(430, 392);

    const glow = this.add.circle(0, 0, 62, 0x9a8cff, 0.18).setBlendMode(Phaser.BlendModes.ADD);
    const body = this.add.circle(0, 0, 37, 0x786ee8, 1);
    const belly = this.add.ellipse(0, 10, 48, 45, 0xa7a0ff, 0.7);
    const earLeft = this.add.triangle(-25, -33, 0, 28, 19, 2, 32, 30, 0x786ee8, 1).setRotation(-0.2);
    const earRight = this.add.triangle(25, -33, 0, 30, 13, 2, 31, 28, 0x786ee8, 1).setRotation(0.2);
    const eyeLeft = this.add.circle(-13, -6, 5, 0x0d1730, 1);
    const eyeRight = this.add.circle(13, -6, 5, 0x0d1730, 1);
    const eyeSparkLeft = this.add.circle(-11, -8, 1.6, 0xffffff, 1);
    const eyeSparkRight = this.add.circle(15, -8, 1.6, 0xffffff, 1);
    const antenna = this.add.rectangle(0, -49, 4, 24, 0xbab6ff, 1).setRotation(0.05);
    const antennaGlow = this.add.circle(1, -63, 7, 0xffef9d, 0.98).setBlendMode(Phaser.BlendModes.ADD);

    nova.add([glow, antenna, antennaGlow, earLeft, earRight, body, belly, eyeLeft, eyeRight, eyeSparkLeft, eyeSparkRight]);
    this.world.add(nova);

    this.tweens.add({
      targets: nova,
      y: 378,
      duration: 1650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: antennaGlow,
      alpha: { from: 0.55, to: 1 },
      scale: { from: 0.85, to: 1.2 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0x0b1730, 0.93).fillRoundedRect(330, 240, 320, 104, 22);
    bubbleBg.lineStyle(1, 0xb8b2ff, 0.26).strokeRoundedRect(330, 240, 320, 104, 22);
    bubbleBg.fillStyle(0x0b1730, 0.93).fillTriangle(406, 342, 446, 342, 430, 365);
    this.novaBubble = this.add.text(354, 264, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#f5f6ff',
      wordWrap: { width: 270 },
      lineSpacing: 4,
    });
    this.world.add([bubbleBg, this.novaBubble]);
  }

  private buildUi() {
    if (!this.ui) return;

    const leftPanel = this.add.container(28, 92);
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x071326, 0.9).fillRoundedRect(0, 0, 290, 470, 28);
    panelBg.lineStyle(1, 0x9eb0d4, 0.14).strokeRoundedRect(0, 0, 290, 470, 28);

    const eyebrow = this.add.text(24, 24, 'YOUR CURRENT ADVENTURE', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#8da7c3',
      letterSpacing: 1.5,
    });
    const title = this.add.text(24, 50, 'Mystery Island', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#f5f8ff',
    });
    const subtitle = this.add.text(24, 88, 'A 30-day adventure — not a promise that a habit is “formed” on day 30.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#8fa5bd',
      wordWrap: { width: 240 },
      lineSpacing: 3,
    });

    const habitCard = this.add.graphics();
    habitCard.fillStyle(0x10233a, 0.94).fillRoundedRect(18, 154, 254, 92, 20);
    habitCard.lineStyle(1, 0x9de8d7, 0.16).strokeRoundedRect(18, 154, 254, 92, 20);
    const habitLabel = this.add.text(38, 172, 'TODAY’S REAL-LIFE QUEST', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#7cc9bd',
      letterSpacing: 1,
    });
    const habit = this.add.text(38, 196, 'Read for 10 minutes', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#f3f9fb',
    });
    const habitHint = this.add.text(38, 223, 'One small action. One new piece of the island.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#98aec2',
    });

    this.dayLabel = this.add.text(24, 278, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#dbe6ef',
    });
    this.progressBar = this.add.graphics();
    leftPanel.add([panelBg, eyebrow, title, subtitle, habitCard, habitLabel, habit, habitHint, this.dayLabel, this.progressBar]);

    const milestoneTitle = this.add.text(24, 334, 'WHAT’S NEXT', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#778da6',
      letterSpacing: 1.2,
    });
    leftPanel.add(milestoneTitle);

    MILESTONES.slice(1).forEach((milestone, index) => {
      const y = 358 + index * 20;
      const text = this.add.text(24, y, `Day ${milestone.day}  ·  ${milestone.label}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10.5px',
        color: '#7890a9',
      });
      leftPanel.add(text);
    });

    this.ui.add(leftPanel);

    const topTitle = this.add.text(350, 30, 'Every good day reveals something new.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '27px',
      fontStyle: 'bold',
      color: '#f5f7ff',
    }).setShadow(0, 4, '#00000055', 7, true, true);
    const topSubtitle = this.add.text(352, 66, 'You’re not collecting points. You’re uncovering a place that remembers your progress.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#a5b9ca',
    });
    this.ui.add([topTitle, topSubtitle]);

    this.actionBg = this.add.graphics();
    this.actionLabel = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#071523',
    }).setOrigin(0.5);
    this.actionZone = this.add.zone(0, 0, 250, 58).setInteractive({ useHandCursor: true });
    this.actionZone.on('pointerdown', this.completeToday, this);

    const action = this.add.container(1042, 642, [this.actionBg, this.actionLabel, this.actionZone]);
    this.ui.add(action);

    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      const demo = this.add.text(350, 684, 'DEMO MODE · each tap advances one day', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#6f89a1',
        letterSpacing: 1,
      });
      this.ui.add(demo);
    }
  }

  private completeToday() {
    if (this.progress.completedDays >= JOURNEY_DAYS) {
      this.sayNova('You did it. Mystery Island is open — and it will stay part of your world. ✨');
      return;
    }

    const demoMode = new URLSearchParams(window.location.search).get('demo') === '1';
    const today = localDayKey();
    if (!demoMode && this.progress.lastCompletedDate === today) {
      this.sayNova('Today’s piece is already here. Come back tomorrow and we’ll reveal the next one together.');
      return;
    }

    this.progress = {
      completedDays: Math.min(JOURNEY_DAYS, this.progress.completedDays + 1),
      lastCompletedDate: demoMode ? this.progress.lastCompletedDate : today,
    };
    writeProgress(this.progress);

    this.applyProgress(true);
    this.cameras.main.flash(320, 190, 245, 233, false);
  }

  private applyProgress(animate: boolean) {
    const days = this.progress.completedDays;
    const ratio = days / JOURNEY_DAYS;

    for (const layer of this.revealLayers) {
      const visible = days >= layer.day;
      if (animate && visible && layer.target.alpha < layer.alpha) {
        this.tweens.add({
          targets: layer.target,
          alpha: layer.alpha,
          scaleX: { from: 0.94, to: 1 },
          scaleY: { from: 0.94, to: 1 },
          duration: 650,
          ease: 'Back.Out',
        });
      } else {
        layer.target.setAlpha(visible ? layer.alpha : 0);
      }
    }

    if (this.fog) {
      const targetAlpha = Phaser.Math.Clamp(0.92 - ratio * 0.82, 0.08, 0.92);
      if (animate) {
        this.tweens.add({ targets: this.fog, alpha: targetAlpha, duration: 820, ease: 'Sine.Out' });
      } else {
        this.fog.setAlpha(targetAlpha);
      }
    }

    if (this.dayLabel) {
      this.dayLabel.setText(days >= JOURNEY_DAYS ? 'Island unlocked · 30 / 30 days' : `Journey progress · ${days} / ${JOURNEY_DAYS} days`);
    }

    if (this.progressBar) {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x1b3046, 1).fillRoundedRect(24, 309, 242, 9, 5);
      this.progressBar.fillStyle(0x82d8c9, 1).fillRoundedRect(24, 309, Math.max(8, 242 * ratio), 9, 5);
    }

    this.refreshAction();
    this.sayNova(this.novaLineFor(days));
  }

  private refreshAction() {
    if (!this.actionBg || !this.actionLabel || !this.actionZone) return;
    const demoMode = new URLSearchParams(window.location.search).get('demo') === '1';
    const complete = this.progress.completedDays >= JOURNEY_DAYS;
    const doneToday = !demoMode && this.progress.lastCompletedDate === localDayKey();

    this.actionBg.clear();
    if (complete) {
      this.actionBg.fillStyle(0xffe6a1, 1).fillRoundedRect(-125, -29, 250, 58, 19);
      this.actionLabel.setText('Enter Mystery Island ✨');
    } else if (doneToday) {
      this.actionBg.fillStyle(0x294055, 1).fillRoundedRect(-125, -29, 250, 58, 19);
      this.actionLabel.setText('Done for today ✓').setColor('#b9c8d5');
    } else {
      this.actionBg.fillStyle(0x8ee0cb, 1).fillRoundedRect(-125, -29, 250, 58, 19);
      this.actionLabel.setText('I did it today').setColor('#071523');
    }
  }

  private novaLineFor(days: number) {
    if (days === 0) return 'See that fog? There’s an island hiding inside it. Want to discover it with me?';
    if (days >= 30) return 'Look at it! You revealed the whole island. This place exists because you kept showing up. ✨';
    if (days >= 21) return 'The star gate is awake now… I think we’re getting very close.';
    if (days >= 14) return 'A tower! Okay, now I really need to know what’s inside this place.';
    if (days >= 7) return 'Wait — can you hear that? A waterfall just appeared behind the trees!';
    if (days >= 3) return 'The forest is waking up. Yesterday this was only fog.';
    return 'There! A little piece of shoreline. Tomorrow we might see what’s behind it.';
  }

  private sayNova(text: string) {
    this.novaBubble?.setText(text);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height);
  }

  private layout(width: number, height: number) {
    if (!this.root) return;
    this.scaleFactor = Math.min(width / DESIGN_W, height / DESIGN_H);
    this.offsetX = (width - DESIGN_W * this.scaleFactor) / 2;
    this.offsetY = (height - DESIGN_H * this.scaleFactor) / 2;
    this.root.setScale(this.scaleFactor);
    this.root.setPosition(this.offsetX, this.offsetY);
  }

  private handleShutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }
}
