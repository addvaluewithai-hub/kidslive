import Phaser from 'phaser';

const DESIGN_W = 1280;
const DESIGN_H = 720;
const FLOOR_ORIGIN = { x: 676, y: 236 };
const TILE_W = 92;
const TILE_H = 46;
const GRID_W = 7;
const GRID_H = 6;

type FurnitureKind = 'sofa' | 'lamp' | 'plant' | 'desk';

type ShopItem = {
  id: FurnitureKind;
  label: string;
  price: number;
  icon: string;
  color: number;
};

const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 'sofa', label: 'Cloud Sofa', price: 80, icon: 'SOFA', color: 0x7c8cff },
  { id: 'lamp', label: 'Moon Lamp', price: 45, icon: 'LAMP', color: 0xffc766 },
  { id: 'plant', label: 'Tiny Palm', price: 35, icon: 'PLANT', color: 0x65d49b },
  { id: 'desk', label: 'Focus Desk', price: 120, icon: 'DESK', color: 0xff8eb5 },
];

const HABITS = [
  { id: 'water', label: 'Drink water', reward: 25 },
  { id: 'read', label: 'Read 20 min', reward: 35 },
  { id: 'move', label: 'Move your body', reward: 30 },
] as const;

export class HabitHomeScene extends Phaser.Scene {
  private root?: Phaser.GameObjects.Container;
  private roomLayer?: Phaser.GameObjects.Container;
  private uiLayer?: Phaser.GameObjects.Container;
  private coinText?: Phaser.GameObjects.Text;
  private toast?: Phaser.GameObjects.Text;
  private coins = 150;
  private completedHabits = new Set<string>();
  private placedKinds = new Set<FurnitureKind>();
  private scaleFactor = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor() {
    super('habit-home');
  }

  create() {
    this.cameras.main.setBackgroundColor('#10142e');
    this.root = this.add.container();
    this.roomLayer = this.add.container();
    this.uiLayer = this.add.container();
    this.root.add([this.roomLayer, this.uiLayer]);

    this.buildBackdrop();
    this.buildRoom();
    this.buildHabitsPanel();
    this.buildTopBar();
    this.buildShopDock();
    this.buildToast();

    this.layout(this.scale.width, this.scale.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private buildBackdrop() {
    if (!this.roomLayer) return;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x171b42, 0x171b42, 0x34204f, 0x1a2448, 1);
    bg.fillRect(0, 0, DESIGN_W, DESIGN_H);

    const glow = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    glow.fillStyle(0x8d7cff, 0.1);
    glow.fillEllipse(870, 120, 480, 300);
    glow.fillStyle(0x58c7ff, 0.07);
    glow.fillEllipse(1040, 300, 420, 340);

    const stars = this.add.graphics();
    for (let i = 0; i < 64; i += 1) {
      const x = 300 + ((i * 83) % 940);
      const y = 24 + ((i * 47) % 330);
      const r = i % 13 === 0 ? 2 : 1;
      stars.fillStyle(i % 9 === 0 ? 0xffe7a6 : 0xdde9ff, i % 5 === 0 ? 0.7 : 0.35);
      stars.fillCircle(x, y, r);
    }

    const city = this.add.graphics();
    city.fillStyle(0x0b1028, 0.78);
    for (let i = 0; i < 18; i += 1) {
      const w = 26 + (i % 4) * 9;
      const h = 35 + ((i * 17) % 80);
      const x = 360 + i * 53;
      const y = 338 - h;
      city.fillRect(x, y, w, h);
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          if ((i + row + col) % 3 === 0) {
            city.fillStyle(0xffd67a, 0.55);
            city.fillRect(x + 7 + col * 11, y + 9 + row * 16, 5, 7);
            city.fillStyle(0x0b1028, 0.78);
          }
        }
      }
    }

    this.roomLayer.add([bg, glow, stars, city]);
  }

  private buildRoom() {
    if (!this.roomLayer) return;

    const architecture = this.add.graphics();
    const floor = this.isoPoint(0, 0);
    const floorRight = this.isoPoint(GRID_W, 0);
    const floorBottom = this.isoPoint(GRID_W, GRID_H);
    const floorLeft = this.isoPoint(0, GRID_H);

    architecture.fillStyle(0x29315d, 1);
    architecture.fillPoints([
      new Phaser.Geom.Point(floor.x, floor.y - 210),
      new Phaser.Geom.Point(floorRight.x, floorRight.y - 210),
      new Phaser.Geom.Point(floorRight.x, floorRight.y),
      new Phaser.Geom.Point(floor.x, floor.y),
    ], true);
    architecture.fillStyle(0x20264b, 1);
    architecture.fillPoints([
      new Phaser.Geom.Point(floor.x, floor.y - 210),
      new Phaser.Geom.Point(floorLeft.x, floorLeft.y - 210),
      new Phaser.Geom.Point(floorLeft.x, floorLeft.y),
      new Phaser.Geom.Point(floor.x, floor.y),
    ], true);

    architecture.fillStyle(0x414b79, 1);
    architecture.fillPoints([
      new Phaser.Geom.Point(floor.x, floor.y),
      new Phaser.Geom.Point(floorRight.x, floorRight.y),
      new Phaser.Geom.Point(floorBottom.x, floorBottom.y),
      new Phaser.Geom.Point(floorLeft.x, floorLeft.y),
    ], true);

    architecture.lineStyle(2, 0x7481b4, 0.18);
    for (let x = 0; x <= GRID_W; x += 1) {
      const a = this.isoPoint(x, 0);
      const b = this.isoPoint(x, GRID_H);
      architecture.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let y = 0; y <= GRID_H; y += 1) {
      const a = this.isoPoint(0, y);
      const b = this.isoPoint(GRID_W, y);
      architecture.lineBetween(a.x, a.y, b.x, b.y);
    }

    const windowFrame = this.add.graphics();
    windowFrame.fillStyle(0x111831, 1).fillRoundedRect(770, 96, 210, 122, 12);
    windowFrame.fillStyle(0x243d70, 1).fillRoundedRect(779, 105, 192, 104, 8);
    windowFrame.fillGradientStyle(0x2d366e, 0x2d366e, 0x7d4a89, 0x2f6992, 1);
    windowFrame.fillRoundedRect(784, 110, 182, 94, 6);
    windowFrame.lineStyle(4, 0x111831, 1);
    windowFrame.lineBetween(875, 110, 875, 204);
    windowFrame.lineBetween(784, 157, 966, 157);

    const moon = this.add.circle(932, 130, 17, 0xffe7a6, 0.95);
    moon.setBlendMode(Phaser.BlendModes.ADD);

    const rug = this.add.graphics();
    const r1 = this.isoPoint(2.2, 2.3);
    const r2 = this.isoPoint(5.35, 2.3);
    const r3 = this.isoPoint(5.35, 4.7);
    const r4 = this.isoPoint(2.2, 4.7);
    rug.fillStyle(0x6f65c9, 0.72);
    rug.fillPoints([r1, r2, r3, r4].map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
    rug.lineStyle(3, 0xa9a2ff, 0.55);
    rug.strokePoints([r1, r2, r3, r4].map((p) => new Phaser.Geom.Point(p.x, p.y)), true);

    const shelf = this.buildShelf(5.75, 0.65);
    const bed = this.buildBed(0.55, 1.25);
    const plant = this.buildPlant(5.9, 3.95);
    const sideTable = this.buildSideTable(1.1, 4.55);

    this.roomLayer.add([architecture, windowFrame, moon, rug, shelf, bed, plant, sideTable]);
  }

  private buildHabitsPanel() {
    if (!this.uiLayer) return;
    const panel = this.add.container(26, 92);
    const bg = this.add.graphics();
    bg.fillStyle(0x0b1028, 0.88).fillRoundedRect(0, 0, 286, 328, 24);
    bg.lineStyle(1, 0x8295ff, 0.2).strokeRoundedRect(0, 0, 286, 328, 24);

    const title = this.add.text(22, 20, 'TODAY', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#8ea2cc',
      letterSpacing: 2,
    });
    const heading = this.add.text(22, 42, 'Build your life.\nBuild your space.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#f7f9ff',
      lineSpacing: 2,
    });
    const streak = this.add.text(22, 102, '🔥  6 day streak', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd166',
    });
    panel.add([bg, title, heading, streak]);

    HABITS.forEach((habit, index) => {
      const row = this.add.container(18, 138 + index * 58);
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x171f42, 0.96).fillRoundedRect(0, 0, 250, 48, 15);
      rowBg.lineStyle(1, 0xffffff, 0.07).strokeRoundedRect(0, 0, 250, 48, 15);
      const check = this.add.circle(24, 24, 13, 0x263158, 1).setStrokeStyle(2, 0x7587bf, 0.7);
      const label = this.add.text(48, 10, habit.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f2f5ff',
      });
      const reward = this.add.text(48, 29, `+${habit.reward} coins`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#8fd6b3',
      });
      const hit = this.add.zone(125, 24, 250, 48).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (this.completedHabits.has(habit.id)) return;
        this.completedHabits.add(habit.id);
        this.coins += habit.reward;
        check.setFillStyle(0x43d68b, 1).setStrokeStyle(0);
        row.add(this.add.text(24, 23, '✓', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#08281b',
        }).setOrigin(0.5));
        label.setColor('#a9b5d2');
        reward.setText('Done for today').setColor('#78d9a7');
        this.refreshCoins();
        this.burstCoins(panel.x + 246, panel.y + row.y + 20);
        this.showToast(`+${habit.reward} coins · habit complete`);
      });
      row.add([rowBg, check, label, reward, hit]);
      panel.add(row);
    });

    const hint = this.add.text(22, 310, 'Complete habits → earn coins → decorate', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#7386ad',
    });
    panel.add(hint);
    this.uiLayer.add(panel);
  }

  private buildTopBar() {
    if (!this.uiLayer) return;
    const title = this.add.text(340, 26, 'My Space', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#f8faff',
    }).setShadow(0, 4, '#00000066', 8, true, true);
    const subtitle = this.add.text(342, 61, 'Every good day leaves a mark.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#aebada',
    });

    const coinBg = this.add.graphics();
    coinBg.fillStyle(0x0d1531, 0.92).fillRoundedRect(1066, 24, 180, 46, 18);
    coinBg.lineStyle(1, 0xffd166, 0.28).strokeRoundedRect(1066, 24, 180, 46, 18);
    const coin = this.add.circle(1094, 47, 12, 0xffd166, 1);
    const shine = this.add.circle(1090, 43, 3, 0xffffff, 0.55);
    this.coinText = this.add.text(1116, 47, `${this.coins}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff0b7',
    }).setOrigin(0, 0.5);
    const coinLabel = this.add.text(1172, 48, 'coins', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#b9a868',
    }).setOrigin(0, 0.5);
    this.uiLayer.add([title, subtitle, coinBg, coin, shine, this.coinText, coinLabel]);
  }

  private buildShopDock() {
    if (!this.uiLayer) return;
    const dock = this.add.container(332, 590);
    const bg = this.add.graphics();
    bg.fillStyle(0x0b1028, 0.94).fillRoundedRect(0, 0, 914, 108, 24);
    bg.lineStyle(1, 0xffffff, 0.09).strokeRoundedRect(0, 0, 914, 108, 24);
    const title = this.add.text(20, 12, 'SHOP · make the room yours', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#9aabd0',
    });
    dock.add([bg, title]);

    SHOP_ITEMS.forEach((item, index) => {
      const cardX = 20 + index * 217;
      const card = this.add.container(cardX, 36);
      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x182142, 1).fillRoundedRect(0, 0, 198, 58, 15);
      cardBg.lineStyle(1, item.color, 0.26).strokeRoundedRect(0, 0, 198, 58, 15);
      const swatch = this.add.circle(28, 29, 18, item.color, 0.92);
      const icon = this.add.text(28, 29, item.icon.slice(0, 1), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#111833',
      }).setOrigin(0.5);
      const label = this.add.text(54, 11, item.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f7f9ff',
      });
      const price = this.add.text(54, 33, `● ${item.price}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffd166',
      });
      const hit = this.add.zone(99, 29, 198, 58).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => card.setScale(1.025));
      hit.on('pointerout', () => card.setScale(1));
      hit.on('pointerdown', () => this.buyAndPlace(item, card));
      card.add([cardBg, swatch, icon, label, price, hit]);
      dock.add(card);
    });
    this.uiLayer.add(dock);
  }

  private buyAndPlace(item: ShopItem, card: Phaser.GameObjects.Container) {
    if (this.placedKinds.has(item.id)) {
      this.showToast(`${item.label} is already in your room`);
      this.pulseCard(card, 0x7c8cff);
      return;
    }
    if (this.coins < item.price) {
      this.showToast(`Need ${item.price - this.coins} more coins`);
      this.pulseCard(card, 0xff7185);
      return;
    }

    this.coins -= item.price;
    this.placedKinds.add(item.id);
    this.refreshCoins();
    this.placePurchasedFurniture(item);
    this.showToast(`${item.label} added to your room ✦`);
    this.pulseCard(card, 0x43d68b);
  }

  private placePurchasedFurniture(item: ShopItem) {
    if (!this.roomLayer) return;
    const config: Record<FurnitureKind, { gx: number; gy: number }> = {
      sofa: { gx: 3.0, gy: 3.15 },
      lamp: { gx: 4.9, gy: 1.25 },
      plant: { gx: 0.9, gy: 4.15 },
      desk: { gx: 4.75, gy: 2.0 },
    };
    const { gx, gy } = config[item.id];
    let furniture: Phaser.GameObjects.Container;
    if (item.id === 'sofa') furniture = this.buildSofa(gx, gy);
    else if (item.id === 'lamp') furniture = this.buildLamp(gx, gy);
    else if (item.id === 'plant') furniture = this.buildPlant(gx, gy, true);
    else furniture = this.buildDesk(gx, gy);

    furniture.setAlpha(0).setScale(0.72);
    this.roomLayer.add(furniture);
    this.tweens.add({
      targets: furniture,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: furniture.y - 8,
      duration: 380,
      ease: 'Back.Out',
    });
    this.burstCoins(furniture.x, furniture.y - 54, false);
  }

  private buildBed(gx: number, gy: number) {
    const p = this.isoPoint(gx, gy);
    const c = this.add.container(p.x, p.y);
    const g = this.add.graphics();
    g.fillStyle(0x151a35, 0.35).fillEllipse(4, 26, 138, 44);
    g.fillStyle(0x6072bd, 1).fillPoints([
      new Phaser.Geom.Point(-62, -14), new Phaser.Geom.Point(0, -43),
      new Phaser.Geom.Point(67, -8), new Phaser.Geom.Point(6, 22),
    ], true);
    g.fillStyle(0x40518e, 1).fillPoints([
      new Phaser.Geom.Point(-62, -14), new Phaser.Geom.Point(6, 22),
      new Phaser.Geom.Point(6, 40), new Phaser.Geom.Point(-62, 4),
    ], true);
    g.fillStyle(0x303e76, 1).fillPoints([
      new Phaser.Geom.Point(6, 22), new Phaser.Geom.Point(67, -8),
      new Phaser.Geom.Point(67, 10), new Phaser.Geom.Point(6, 40),
    ], true);
    g.fillStyle(0xf0f3ff, 1).fillEllipse(-31, -20, 48, 24);
    g.fillStyle(0x99a7ef, 0.9).fillEllipse(26, -7, 56, 20);
    const star = this.add.text(18, -8, '✦', { fontSize: '18px', color: '#fff2a8' }).setOrigin(0.5);
    c.add([g, star]);
    return c;
  }

  private buildShelf(gx: number, gy: number) {
    const p = this.isoPoint(gx, gy);
    const c = this.add.container(p.x, p.y - 52);
    const g = this.add.graphics();
    g.fillStyle(0x3b2d46, 1).fillRoundedRect(-40, -70, 80, 112, 7);
    g.fillStyle(0x20192d, 1).fillRoundedRect(-32, -60, 64, 92, 4);
    for (let y = -34; y <= 10; y += 44) g.fillStyle(0x59405f, 1).fillRect(-32, y, 64, 6);
    const bookColors = [0xff7b8f, 0x7c8cff, 0xffc766, 0x65d49b];
    bookColors.forEach((color, i) => g.fillStyle(color, 1).fillRect(-25 + i * 13, -54, 9, 20 + (i % 2) * 7));
    c.add(g);
    return c;
  }

  private buildPlant(gx: number, gy: number, bright = false) {
    const p = this.isoPoint(gx, gy);
    const c = this.add.container(p.x, p.y - 20);
    const g = this.add.graphics();
    g.fillStyle(bright ? 0xffc96b : 0xc77f62, 1).fillEllipse(0, 21, 38, 18);
    g.fillStyle(bright ? 0xf1b65c : 0x9f5f49, 1).fillPoints([
      new Phaser.Geom.Point(-18, 17), new Phaser.Geom.Point(18, 17),
      new Phaser.Geom.Point(12, 44), new Phaser.Geom.Point(-12, 44),
    ], true);
    const leaf = bright ? 0x61df9b : 0x5ac88a;
    [-22, -10, 5, 18].forEach((x, i) => {
      g.fillStyle(leaf, 1).fillEllipse(x, -5 - (i % 2) * 11, 20, 50);
    });
    c.add(g);
    return c;
  }

  private buildSideTable(gx: number, gy: number) {
    const p = this.isoPoint(gx, gy);
    const c = this.add.container(p.x, p.y - 20);
    const g = this.add.graphics();
    g.fillStyle(0x252b50, 1).fillEllipse(0, 0, 54, 26);
    g.fillStyle(0x171b37, 1).fillRect(-4, 0, 8, 34);
    g.fillEllipse(0, 34, 38, 14);
    const lamp = this.add.circle(0, -22, 13, 0xffdc8c, 1).setBlendMode(Phaser.BlendModes.ADD);
    c.add([g, lamp]);
    return c;
  }

  private buildSofa(gx: number, gy: number) {
    const p = this.isoPoint(gx, gy);
    const c = this.add.container(p.x, p.y - 28);
    const g = this.add.graphics();
    g.fillStyle(0x0a0d21, 0.35).fillEllipse(4, 39, 150, 42);
    g.fillStyle(0x716fe0, 1).fillRoundedRect(-70, -30, 140, 62, 18);
    g.fillStyle(0x8585f1, 1).fillRoundedRect(-58, -18, 52, 42, 15);
    g.fillStyle(0x8585f1, 1).fillRoundedRect(6, -18, 52, 42, 15);
    g.fillStyle(0x4f51af, 1).fillRoundedRect(-78, -18, 22, 55, 11);
    g.fillStyle(0x4f51af, 1).fillRoundedRect(56, -18, 22, 55, 11);
    g.fillStyle(0xffd166, 1).fillCircle(27, -3, 10);
    const star = this.add.text(27, -4, '★', { fontSize: '12px', color: '#4a3a1b' }).setOrigin(0.5);
    c.add([g, star]);
    return c;
  }

  private buildLamp(gx: number, gy: number) {
    const p = this.isoPoint(gx, gy);
    const c = this.add.container(p.x, p.y - 40);
    const g = this.add.graphics();
    g.fillStyle(0x242b52, 1).fillRect(-4, -8, 8, 58);
    g.fillEllipse(0, 50, 34, 12);
    const halo = this.add.circle(0, -22, 37, 0xffdb82, 0.13).setBlendMode(Phaser.BlendModes.ADD);
    const moon = this.add.arc(0, -22, 21, 50, 290, false, 0xffda77, 1);
    const cut = this.add.circle(8, -29, 18, 0x20264b, 1);
    c.add([g, halo, moon, cut]);
    return c;
  }

  private buildDesk(gx: number, gy: number) {
    const p = this.isoPoint(gx, gy);
    const c = this.add.container(p.x, p.y - 26);
    const g = this.add.graphics();
    g.fillStyle(0x0b0f25, 0.3).fillEllipse(0, 38, 130, 32);
    g.fillStyle(0xd1926e, 1).fillPoints([
      new Phaser.Geom.Point(-64, -14), new Phaser.Geom.Point(0, -42),
      new Phaser.Geom.Point(64, -12), new Phaser.Geom.Point(0, 17),
    ], true);
    g.fillStyle(0x8f5f4c, 1).fillRect(-54, 1, 8, 49);
    g.fillRect(46, 1, 8, 49);
    g.fillStyle(0x1b2446, 1).fillRoundedRect(-20, -63, 40, 30, 4);
    g.fillStyle(0x78c9ff, 0.9).fillRoundedRect(-15, -58, 30, 20, 3);
    c.add(g);
    return c;
  }

  private burstCoins(x: number, y: number, gold = true) {
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const dot = this.add.circle(x, y, 4 + (i % 2), gold ? 0xffd166 : 0xa99cff, 1).setDepth(500);
      if (this.root) dot.setScale(this.scaleFactor);
      const angle = (Math.PI * 2 * i) / count;
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * (35 + (i % 3) * 11),
        y: y + Math.sin(angle) * (26 + (i % 2) * 10) - 22,
        alpha: 0,
        scale: 0.2,
        duration: 520,
        ease: 'Quad.Out',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private pulseCard(card: Phaser.GameObjects.Container, color: number) {
    const flash = this.add.rectangle(card.x + 99, card.y + 29, 198, 58, color, 0.16).setOrigin(0.5);
    card.parentContainer?.add(flash);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 360,
      onComplete: () => flash.destroy(),
    });
  }

  private buildToast() {
    if (!this.uiLayer) return;
    this.toast = this.add.text(DESIGN_W / 2, 548, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#f7f9ff',
      backgroundColor: '#101832ee',
      padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setAlpha(0);
    this.uiLayer.add(this.toast);
  }

  private showToast(text: string) {
    if (!this.toast) return;
    this.tweens.killTweensOf(this.toast);
    this.toast.setText(text).setAlpha(0).setY(555);
    this.tweens.add({
      targets: this.toast,
      alpha: 1,
      y: 540,
      duration: 180,
      ease: 'Quad.Out',
      hold: 1100,
      yoyo: true,
    });
  }

  private refreshCoins() {
    this.coinText?.setText(`${this.coins}`);
  }

  private isoPoint(gx: number, gy: number) {
    return {
      x: FLOOR_ORIGIN.x + (gx - gy) * (TILE_W / 2),
      y: FLOOR_ORIGIN.y + (gx + gy) * (TILE_H / 2),
    };
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height);
  }

  private layout(width: number, height: number) {
    if (!this.root) return;
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    this.scaleFactor = scale;
    this.offsetX = (width - DESIGN_W * scale) / 2;
    this.offsetY = (height - DESIGN_H * scale) / 2;
    this.root.setScale(scale).setPosition(this.offsetX, this.offsetY);
  }

  private handleShutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.tweens.killAll();
  }
}
