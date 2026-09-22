import Phaser from 'phaser';
import { getSproutDay, SPROUT_HABITS } from '../../story/sproutStory';
import { sproutStoryStore } from '../../story/storyStore';
import type { HabitId, SproutStoryState } from '../../story/types';
import { addRoundedButton } from './SproutSceneKit';
import { SproutWorldScene } from './SproutWorldScene';

type HabitChip = {
  background: Phaser.GameObjects.Graphics;
  dot: Phaser.GameObjects.Arc;
  status: Phaser.GameObjects.Text;
};

type BaseOverlayAccess = {
  mapOverlay?: Phaser.GameObjects.Container;
  parentOverlay?: Phaser.GameObjects.Container;
  novaOverlay?: Phaser.GameObjects.Container;
  debugOverlay?: Phaser.GameObjects.Container;
};

const HUD_DEPTH = 104;

/**
 * Presentation pass for the production-style portrait slice.
 *
 * The base scene owns world rendering, transitions, audio, story effects, and
 * the large functional prototype UI. This subclass deliberately keeps that
 * behavior intact while replacing the always-visible prototype HUD with a much
 * smaller mobile composition so the living world remains the hero.
 */
export class SproutWorldSceneProduction extends SproutWorldScene {
  private productionHud?: Phaser.GameObjects.Container;
  private productionUnsubscribe?: () => void;
  private productionDay?: Phaser.GameObjects.Text;
  private productionHint?: Phaser.GameObjects.Text;
  private productionStory?: Phaser.GameObjects.Text;
  private productionProgress?: Phaser.GameObjects.Text;
  private productionFooter?: Phaser.GameObjects.Text;
  private readonly productionHabits = new Map<HabitId, HabitChip>();

  create() {
    super.create();
    this.hidePrototypeChrome();
    this.buildProductionHud();
    this.applyProductionState(sproutStoryStore.getState());
    this.productionUnsubscribe = sproutStoryStore.subscribe((state) => this.applyProductionState(state));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.productionUnsubscribe?.();
      this.productionUnsubscribe = undefined;
    });
  }

  private baseOverlays() {
    return this as unknown as BaseOverlayAccess;
  }

  private hidePrototypeChrome() {
    for (const child of this.children.list) {
      if (!(child instanceof Phaser.GameObjects.Container)) continue;
      if (child.depth >= 100 && child.depth <= 102) child.setVisible(false);
    }

    // Developer controls are intentionally hidden until the small DEV chip is
    // tapped. This keeps ?dev=1 useful without turning QA screenshots into a
    // picture of the debug console.
    this.baseOverlays().debugOverlay?.setVisible(false);
  }

  private openOverlay(name: 'mapOverlay' | 'parentOverlay' | 'novaOverlay') {
    const overlays = this.baseOverlays();
    overlays.mapOverlay?.setVisible(false);
    overlays.parentOverlay?.setVisible(false);
    overlays.novaOverlay?.setVisible(false);
    overlays[name]?.setVisible(true);
  }

  private buildProductionHud() {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(HUD_DEPTH);
    this.productionHud = hud;

    const top = this.add.graphics();
    top.fillStyle(0x163a31, 0.88).fillRoundedRect(24, 24, 672, 108, 28);
    top.lineStyle(1, 0xffffff, 0.1).strokeRoundedRect(24, 24, 672, 108, 28);
    const eyebrow = this.add.text(48, 43, 'SPROUT PLANET', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#a9c8b5',
      letterSpacing: 1.8,
    });
    this.productionDay = this.add.text(48, 66, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '25px',
      fontStyle: 'bold',
      color: '#f7fbf3',
    });
    this.productionHint = this.add.text(48, 98, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#c9dbce',
      wordWrap: { width: 405 },
      maxLines: 1,
      rtl: true,
    });
    hud.add([top, eyebrow, this.productionDay, this.productionHint]);
    hud.add(addRoundedButton(this, 540, 52, 66, 54, 'خريطة', () => this.openOverlay('mapOverlay'), { fill: 0x2d5549, fontSize: 11 }));
    hud.add(addRoundedButton(this, 614, 52, 58, 54, 'أهل', () => this.openOverlay('parentOverlay'), { fill: 0x2d5549, fontSize: 11 }));

    const storyCard = this.add.graphics();
    storyCard.fillStyle(0xf4f1e7, 0.92).fillRoundedRect(50, 154, 620, 92, 24);
    storyCard.lineStyle(1, 0x26483d, 0.08).strokeRoundedRect(50, 154, 620, 92, 24);
    const novaMark = this.add.circle(84, 200, 22, 0x756cbe, 0.98);
    const novaSpark = this.add.text(84, 198, '✦', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.productionStory = this.add.text(118, 173, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#27463b',
      wordWrap: { width: 520 },
      maxLines: 2,
      lineSpacing: 4,
      rtl: true,
      align: 'right',
    });
    hud.add([storyCard, novaMark, novaSpark, this.productionStory]);

    const bottom = this.add.graphics();
    bottom.fillStyle(0x102f28, 0.93).fillRoundedRect(24, 1032, 672, 220, 30);
    bottom.lineStyle(1, 0xffffff, 0.08).strokeRoundedRect(24, 1032, 672, 220, 30);
    const habitsTitle = this.add.text(48, 1053, 'عادات النهارده', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f3f7ef',
    });
    this.productionProgress = this.add.text(670, 1057, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#aecbb7',
    }).setOrigin(1, 0);
    hud.add([bottom, habitsTitle, this.productionProgress]);

    SPROUT_HABITS.forEach((habit, index) => {
      const x = 48 + index * 207;
      const y = 1092;
      const background = this.add.graphics();
      background.fillStyle(0x1c4439, 0.92).fillRoundedRect(x, y, 190, 84, 20);
      const dot = this.add.circle(x + 22, y + 23, 8, 0x47685f, 1).setStrokeStyle(1, 0xb2c9b9, 0.55);
      const label = this.add.text(x + 38, y + 12, habit.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f2f7ef',
        wordWrap: { width: 136 },
        maxLines: 1,
        rtl: true,
      });
      const status = this.add.text(x + 14, y + 52, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#b7cabd',
        wordWrap: { width: 160 },
        maxLines: 1,
      });
      const hit = this.add.zone(x + 95, y + 42, 190, 84).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => sproutStoryStore.toggleHabit(habit.id));
      hud.add([background, dot, label, status, hit]);
      this.productionHabits.set(habit.id, { background, dot, status });
    });

    this.productionFooter = this.add.text(48, 1201, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#bed3c3',
      wordWrap: { width: 455 },
      maxLines: 1,
      rtl: true,
    });
    hud.add(this.productionFooter);
    hud.add(addRoundedButton(this, 540, 1190, 132, 42, 'Nova ✦', () => this.openOverlay('novaOverlay'), { fill: 0x625baa, fontSize: 12 }));

    if (new URLSearchParams(window.location.search).has('dev')) {
      const dev = addRoundedButton(this, 28, 954, 68, 42, 'DEV', () => {
        const overlay = this.baseOverlays().debugOverlay;
        overlay?.setVisible(!overlay.visible);
      }, { fill: 0x263c36, fontSize: 11 });
      hud.add(dev);
    }
  }

  private applyProductionState(state: SproutStoryState) {
    const day = getSproutDay(state.currentDay);
    const completeCount = Object.values(state.habits).filter((value) => value === 'done').length;

    this.productionDay?.setText(`Day ${state.currentDay}  ·  30`);
    this.productionHint?.setText(day.hint);
    this.productionStory?.setText(state.dayResolved ? `${day.resolvedLine}  ${day.hook}` : day.intro);
    this.productionProgress?.setText(`${completeCount} / ${day.requiredHabits} لفتح حدث اليوم`);
    this.productionFooter?.setText(
      state.dayResolved
        ? state.currentDay === 7
          ? 'Whisper Woods ظهر… الحكاية تكمل بكرة ✦'
          : 'العالم اتغيّر. ارجع بكرة عشان نكمل.'
        : 'كل عادة مكتملة بتحرّك الحكاية نفسها.',
    );

    for (const habit of SPROUT_HABITS) {
      const chip = this.productionHabits.get(habit.id);
      if (!chip) continue;
      const status = state.habits[habit.id];
      chip.background.clear();
      const fill = status === 'done' ? 0x315f48 : status === 'pending' ? 0x65543a : 0x1c4439;
      const x = 48 + SPROUT_HABITS.findIndex((entry) => entry.id === habit.id) * 207;
      chip.background.fillStyle(fill, 0.94).fillRoundedRect(x, 1092, 190, 84, 20);
      chip.dot.setFillStyle(status === 'done' ? 0x9fd796 : status === 'pending' ? 0xe2ba73 : 0x47685f, 1);
      chip.status.setText(
        status === 'done'
          ? 'تم ✓'
          : status === 'pending'
            ? 'مستني موافقة الأهل'
            : habit.verification === 'parent_approval'
              ? 'موافقة ولي الأمر'
              : 'اضغط لما تخلص',
      );
    }
  }
}
