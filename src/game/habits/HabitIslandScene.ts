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

type RevealTarget = {
  day: number;
  target: Phaser.GameObjects.Container;
};

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadProgress(): SavedProgress {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return { completedDays: 0, lastCompletedDate: null };
    const parsed = JSON.parse(value) as Partial<SavedProgress>;
    return {
      completedDays: Phaser.Math.Clamp(Number(parsed.completedDays) || 0, 0, JOURNEY_DAYS),
      lastCompletedDate: typeof parsed.lastCompletedDate === 'string' ? parsed.lastCompletedDate : null,
    };
  } catch {
    return { completedDays: 0, lastCompletedDate: null };
  }
}

export class HabitIslandScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private world?: Phaser.GameObjects.Container;
  private ui?: Phaser.GameObjects.Container;
  private fog?: Phaser.GameObjects.Container;
  private novaText?: Phaser.GameObjects.Text;
  private progressText?: Phaser.GameObjects.Text;
  private progressBar?: Phaser.GameObjects.Graphics;
  private actionBg?: Phaser.GameObjects.Graphics;
  private actionText?: Phaser.GameObjects.Text;
  private revealTargets: RevealTarget[] = [];
  private progress = loadProgress();

  constructor() {
    super('habit-island');
  }

  create() {
    this.cameras.main.setBackgroundColor('#07111f');
    this.root = this.add.container();
    this.world = this.add.container();
    this.ui = this.add.container();
    this.root.add([this.world, this.ui]);

    this.drawWorld();
    this.drawNova();
    this.drawUi();
    this.applyProgress(false);
    this.layout(this.scale.width, this.scale.height);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  private drawWorld() {
    if (!this.world) return;

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x071525, 0x071525, 0x173b58, 0x24536a, 1);
    sky.fillRect(0, 0, DESIGN_W, DESIGN_H);

    const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    glow.fillStyle(0x7ed7d1, 0.12).fillEllipse(815, 330, 900, 440);
    glow.fillStyle(0xb9a4ff, 0.07).fillEllipse(895, 170, 540, 320);

    const stars = this.add.graphics();
    for (let index = 0; index < 70; index += 1) {
      const x = 320 + ((index * 97) % 930);
      const y = 24 + ((index * 53) % 330);
      stars.fillStyle(index % 7 === 0 ? 0xffefbd : 0xd8eeff, index % 5 === 0 ? 0.7 : 0.32);
      stars.fillCircle(x, y, index % 11 === 0 ? 2 : 1);
    }

    const moon = this.add.circle(1060, 112, 42, 0xffefc9, 0.9).setBlendMode(Phaser.BlendModes.ADD);
    const moonShade = this.add.circle(1077, 101, 37, 0x183653, 0.88);

    const sea = this.add.graphics();
    sea.fillGradientStyle(0x0d2b3f, 0x0d2b3f, 0x11394b, 0x061c2b, 1);
    sea.fillRect(0, 388, DESIGN_W, DESIGN_H - 388);
    sea.lineStyle(2, 0x8be0dc, 0.08);
    for (let row = 0; row < 13; row += 1) {
      const y = 414 + row * 22;
      for (let x = 270; x < DESIGN_W; x += 92) {
        sea.lineBetween(x + (row % 2) * 24, y, x + 42 + (row % 2) * 24, y - 4);
      }
    }

    this.world.add([sky, glow, stars, moon, moonShade, sea]);

    const shadow = this.add.ellipse(824, 550, 590, 105, 0x020911, 0.5);
    this.world.add(shadow);

    const island = this.add.container(820, 420);
    const islandArt = this.add.graphics();
    islandArt.fillStyle(0x17323b, 1);
    islandArt.fillPoints([
      new Phaser.Geom.Point(-260, 70),
      new Phaser.Geom.Point(-195, 145),
      new Phaser.Geom.Point(-78, 170),
      new Phaser.Geom.Point(56, 160),
      new Phaser.Geom.Point(196, 118),
      new Phaser.Geom.Point(266, 50),
      new Phaser.Geom.Point(205, 18),
      new Phaser.Geom.Point(76, 2),
      new Phaser.Geom.Point(-76, 8),
      new Phaser.Geom.Point(-204, 34),
    ], true);
    islandArt.fillStyle(0x326356, 1).fillEllipse(0, 31, 520, 170);
    islandArt.fillStyle(0x609875, 1).fillEllipse(-8, 5, 460, 132);
    islandArt.fillStyle(0xe1c991, 0.96).fillEllipse(-94, 78, 220, 54);

    const hills = this.add.graphics();
    hills.fillStyle(0x2f715d, 1).fillTriangle(-192, 45, -100, -102, 8, 42);
    hills.fillStyle(0x40876a, 1).fillTriangle(-134, 44, -47, -73, 72, 41);
    hills.fillStyle(0x285f56, 1).fillTriangle(35, 42, 124, -72, 218, 43);
    island.add([islandArt, hills]);
    this.world.add(island);
    this.revealTargets.push({ day: 1, target: island });

    const forest = this.add.container(742, 390);
    for (let index = 0; index < 12; index += 1) {
      const x = ((index * 43) % 190) - 86;
      const y = ((index * 29) % 72) - 18;
      forest.add(this.add.rectangle(x, y + 20, 7, 31, 0x5a4737, 1));
      forest.add(this.add.circle(x, y, 16 + (index % 3) * 3, index % 2 ? 0x3f835e : 0x4d9a68, 1));
    }
    this.world.add(forest);
    this.revealTargets.push({ day: 3, target: forest });

    const waterfall = this.add.container(666, 350);
    const fallsArt = this.add.graphics();
    fallsArt.fillStyle(0x244f4c, 1).fillTriangle(-45, 45, 8, -52, 62, 46);
    fallsArt.fillStyle(0x8deef0, 0.78).fillRoundedRect(3, -26, 16, 94, 8);
    fallsArt.fillStyle(0xbffcff, 0.58).fillEllipse(11, 67, 58, 15);
    waterfall.add(fallsArt);
    this.world.add(waterfall);
    this.revealTargets.push({ day: 7, target: waterfall });

    const tower = this.add.container(920, 323);
    const towerArt = this.add.graphics();
    towerArt.fillStyle(0x56517c, 1).fillRoundedRect(-28, -55, 56, 112, 8);
    towerArt.fillStyle(0x736da1, 1).fillTriangle(-42, -51, 0, -92, 42, -51);
    towerArt.fillStyle(0xe8c980, 0.92).fillRoundedRect(-7, -18, 14, 23, 6);
    tower.add([towerArt, this.add.circle(0, -96, 8, 0xffe5a6, 0.96)]);
    this.world.add(tower);
    this.revealTargets.push({ day: 14, target: tower });

    const gate = this.add.container(1032, 420);
    const gateArt = this.add.graphics();
    gateArt.lineStyle(13, 0x6c7fae, 1).strokeCircle(0, 0, 48);
    gateArt.lineStyle(4, 0xc8d4ff, 0.42).strokeCircle(0, 0, 35);
    gateArt.fillStyle(0x1a2742, 0.76).fillCircle(0, 0, 31);
    const gateGlow = this.add.circle(0, 0, 25, 0x8ce8e1, 0.4).setBlendMode(Phaser.BlendModes.ADD);
    gate.add([gateArt, gateGlow]);
    this.tweens.add({
      targets: gateGlow,
      alpha: { from: 0.22, to: 0.64 },
      scale: { from: 0.88, to: 1.08 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.world.add(gate);
    this.revealTargets.push({ day: 21, target: gate });

    const finalMagic = this.add.container(824, 320);
    const aura = this.add.circle(0, 0, 164, 0xfff0aa, 0.09).setBlendMode(Phaser.BlendModes.ADD);
    const sparkles = this.add.graphics();
    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const radius = 116 + (index % 3) * 24;
      sparkles.fillStyle(index % 2 ? 0x9af6e8 : 0xfff2b8, 0.85);
      sparkles.fillCircle(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.52, index % 4 ? 2 : 3);
    }
    finalMagic.add([aura, sparkles]);
    this.world.add(finalMagic);
    this.revealTargets.push({ day: 30, target: finalMagic });

    this.fog = this.add.container();
    const fogArt = this.add.graphics();
    fogArt.fillStyle(0xe5f0f2, 0.18).fillEllipse(820, 425, 680, 290);
    fogArt.fillEllipse(705, 390, 380, 200);
    fogArt.fillEllipse(990, 390, 390, 205);
    this.fog.add(fogArt);
    for (let index = 0; index < 20; index += 1) {
      const cloud = this.add.circle(
        535 + ((index * 73) % 600),
        350 + ((index * 41) % 180),
        38 + (index % 4) * 11,
        0xe7f1f2,
        0.22 + (index % 3) * 0.05,
      );
      this.fog.add(cloud);
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 10,
        duration: 3000 + (index % 5) * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
    this.world.add(this.fog);
  }

  private drawNova() {
    if (!this.world) return;

    const nova = this.add.container(430, 392);
    const novaGlow = this.add.circle(0, 0, 62, 0x9a8cff, 0.18).setBlendMode(Phaser.BlendModes.ADD);
    const antenna = this.add.rectangle(0, -49, 4, 24, 0xbab6ff, 1);
    const antennaGlow = this.add.circle(0, -64, 7, 0xffef9d, 1).setBlendMode(Phaser.BlendModes.ADD);
    const leftEar = this.add.triangle(-25, -33, 0, 28, 19, 2, 32, 30, 0x786ee8, 1).setRotation(-0.2);
    const rightEar = this.add.triangle(25, -33, 0, 30, 13, 2, 31, 28, 0x786ee8, 1).setRotation(0.2);
    const body = this.add.circle(0, 0, 37, 0x786ee8, 1);
    const belly = this.add.ellipse(0, 10, 48, 45, 0xa7a0ff, 0.7);
    const leftEye = this.add.circle(-13, -6, 5, 0x0d1730, 1);
    const rightEye = this.add.circle(13, -6, 5, 0x0d1730, 1);
    nova.add([novaGlow, antenna, antennaGlow, leftEar, rightEar, body, belly, leftEye, rightEye]);
    this.world.add(nova);

    this.tweens.add({ targets: nova, y: 378, duration: 1650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const bubble = this.add.graphics();
    bubble.fillStyle(0x0b1730, 0.94).fillRoundedRect(330, 240, 320, 104, 22);
    bubble.lineStyle(1, 0xb8b2ff, 0.26).strokeRoundedRect(330, 240, 320, 104, 22);
    bubble.fillStyle(0x0b1730, 0.94).fillTriangle(406, 342, 446, 342, 430, 365);
    this.novaText = this.add.text(354, 263, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#f5f6ff',
      wordWrap: { width: 272 },
      lineSpacing: 4,
    });
    this.world.add([bubble, this.novaText]);
  }

  private drawUi() {
    if (!this.ui) return;

    const panel = this.add.container(28, 92);
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x071326, 0.9).fillRoundedRect(0, 0, 290, 470, 28);
    panelBg.lineStyle(1, 0x9eb0d4, 0.14).strokeRoundedRect(0, 0, 290, 470, 28);
    panel.add(panelBg);

    panel.add(this.add.text(24, 24, 'YOUR CURRENT ADVENTURE', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#8da7c3', letterSpacing: 1.5,
    }));
    panel.add(this.add.text(24, 50, 'Mystery Island', {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#f5f8ff',
    }));
    panel.add(this.add.text(24, 88, 'A 30-day adventure — not a promise that a habit is “formed” on day 30.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#8fa5bd', wordWrap: { width: 240 }, lineSpacing: 3,
    }));

    const habitCard = this.add.graphics();
    habitCard.fillStyle(0x10233a, 0.94).fillRoundedRect(18, 154, 254, 92, 20);
    habitCard.lineStyle(1, 0x9de8d7, 0.16).strokeRoundedRect(18, 154, 254, 92, 20);
    panel.add(habitCard);
    panel.add(this.add.text(38, 172, 'TODAY’S REAL-LIFE QUEST', {
      fontFamily: 'system-ui, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#7cc9bd', letterSpacing: 1,
    }));
    panel.add(this.add.text(38, 196, 'Read for 10 minutes', {
      fontFamily: 'system-ui, sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#f3f9fb',
    }));
    panel.add(this.add.text(38, 223, 'One small action. One new piece of the island.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#98aec2',
    }));

    this.progressText = this.add.text(24, 278, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#dbe6ef',
    });
    this.progressBar = this.add.graphics();
    panel.add([this.progressText, this.progressBar]);
    panel.add(this.add.text(24, 334, 'WHAT’S NEXT', {
      fontFamily: 'system-ui, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#778da6', letterSpacing: 1.2,
    }));

    MILESTONES.slice(1).forEach((milestone, index) => {
      panel.add(this.add.text(24, 358 + index * 20, `Day ${milestone.day}  ·  ${milestone.label}`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '10.5px', color: '#7890a9',
      }));
    });
    this.ui.add(panel);

    this.ui.add(this.add.text(350, 30, 'Every good day reveals something new.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#f5f7ff',
    }).setShadow(0, 4, '#00000055', 7, true, true));
    this.ui.add(this.add.text(352, 66, 'No coins. No shop. Just your real-life progress becoming a world.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#a5b9ca',
    }));

    const action = this.add.container(1042, 642);
    this.actionBg = this.add.graphics();
    this.actionText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#071523',
    }).setOrigin(0.5);
    const hit = this.add.zone(0, 0, 250, 58).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', this.completeToday, this);
    action.add([this.actionBg, this.actionText, hit]);
    this.ui.add(action);

    if (this.isDemoMode()) {
      this.ui.add(this.add.text(350, 684, 'DEMO MODE · each tap advances one day', {
        fontFamily: 'system-ui, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#6f89a1', letterSpacing: 1,
      }));
    }
  }

  private completeToday() {
    if (this.progress.completedDays >= JOURNEY_DAYS) {
      this.setNovaLine('You did it. Mystery Island is open — and it stays part of your world. ✨');
      return;
    }

    if (!this.isDemoMode() && this.progress.lastCompletedDate === todayKey()) {
      this.setNovaLine('Today’s piece is already here. Tomorrow we can reveal the next one together.');
      return;
    }

    this.progress = {
      completedDays: Math.min(JOURNEY_DAYS, this.progress.completedDays + 1),
      lastCompletedDate: this.isDemoMode() ? this.progress.lastCompletedDate : todayKey(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    this.applyProgress(true);
    this.cameras.main.flash(320, 190, 245, 233, false);
  }

  private applyProgress(animate: boolean) {
    const days = this.progress.completedDays;
    const ratio = days / JOURNEY_DAYS;

    this.revealTargets.forEach(({ day, target }) => {
      const visible = days >= day;
      if (animate && visible && target.alpha < 1) {
        this.tweens.add({ targets: target, alpha: 1, scale: { from: 0.94, to: 1 }, duration: 620, ease: 'Back.Out' });
      } else {
        target.setAlpha(visible ? 1 : 0);
      }
    });

    const fogAlpha = Phaser.Math.Clamp(0.93 - ratio * 0.84, 0.08, 0.93);
    if (this.fog) {
      if (animate) this.tweens.add({ targets: this.fog, alpha: fogAlpha, duration: 820, ease: 'Sine.Out' });
      else this.fog.setAlpha(fogAlpha);
    }

    this.progressText?.setText(days >= JOURNEY_DAYS ? 'Island unlocked · 30 / 30 days' : `Journey progress · ${days} / ${JOURNEY_DAYS} days`);
    if (this.progressBar) {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x1b3046, 1).fillRoundedRect(24, 309, 242, 9, 5);
      if (days > 0) this.progressBar.fillStyle(0x82d8c9, 1).fillRoundedRect(24, 309, 242 * ratio, 9, 5);
    }

    this.refreshAction();
    this.setNovaLine(this.novaLine(days));
  }

  private refreshAction() {
    if (!this.actionBg || !this.actionText) return;
    const finished = this.progress.completedDays >= JOURNEY_DAYS;
    const doneToday = !this.isDemoMode() && this.progress.lastCompletedDate === todayKey();

    this.actionBg.clear();
    if (finished) {
      this.actionBg.fillStyle(0xffe6a1, 1).fillRoundedRect(-125, -29, 250, 58, 19);
      this.actionText.setText('Enter Mystery Island ✨').setColor('#071523');
    } else if (doneToday) {
      this.actionBg.fillStyle(0x294055, 1).fillRoundedRect(-125, -29, 250, 58, 19);
      this.actionText.setText('Done for today ✓').setColor('#b9c8d5');
    } else {
      this.actionBg.fillStyle(0x8ee0cb, 1).fillRoundedRect(-125, -29, 250, 58, 19);
      this.actionText.setText('I did it today').setColor('#071523');
    }
  }

  private novaLine(days: number) {
    if (days === 0) return 'See that fog? There’s an island hiding inside it. Want to discover it with me?';
    if (days >= 30) return 'Look at it! You revealed the whole island. This place exists because you kept showing up. ✨';
    if (days >= 21) return 'The star gate is awake now… I think we’re getting very close.';
    if (days >= 14) return 'A tower! Okay, now I really need to know what’s inside this place.';
    if (days >= 7) return 'Wait — can you hear that? A waterfall just appeared behind the trees!';
    if (days >= 3) return 'The forest is waking up. Yesterday this was only fog.';
    return 'There! A little piece of shoreline. Tomorrow we might see what’s behind it.';
  }

  private setNovaLine(text: string) {
    this.novaText?.setText(text);
  }

  private isDemoMode() {
    return new URLSearchParams(window.location.search).get('demo') === '1';
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height);
  }

  private layout(width: number, height: number) {
    if (!this.root) return;
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    this.root.setScale(scale);
    this.root.setPosition((width - DESIGN_W * scale) / 2, (height - DESIGN_H * scale) / 2);
  }
}
