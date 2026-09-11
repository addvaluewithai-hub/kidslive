import Phaser from 'phaser';
import type { ActorAnchor } from '../../core/actors/WorldActor';
import type { TutorCancellationToken } from '../../core/tutor/TutorContract';
import type {
  TutorSpeechAdapter,
  TutorSpeechRequest,
  TutorTextPresentation,
  TutorTextPresenter,
} from '../../core/tutor/TutorDeliveryCoordinator';
import { TutorSession } from '../../core/tutor/TutorSession';
import {
  getPlaceAssetPack,
  isAssetPackReady,
  queueAssetPack,
  releaseSceneOwnedAssets,
  type AuthoredAssetPack,
  type QueuedAssetPack,
} from '../assetPacks';
import { KIDSLIVE_COMPANION } from '../characterDefinitions';
import { PhaserActor } from '../PhaserActor';
import { RuntimeDebugOverlay } from '../runtimeDebug';
import { EnglishLessonFlow } from './EnglishLessonFlow';
import {
  createEnglishTutorProvider,
  resolveEnglishSpeechFixture,
  resolveEnglishTutorFixture,
  type EnglishSpeechFixture,
  type EnglishTutorFixture,
} from './EnglishResilienceFixtures';

type AssetLoadState = 'idle' | 'loading' | 'ready' | 'error';
type Choice = { readonly label: string; readonly answer: string; readonly key: string };

const ACTOR_HOME: ActorAnchor = { kind: 'anchor', id: 'english-companion-home' };
const LESSON_FOCUS: ActorAnchor = { kind: 'anchor', id: 'english-lesson-focus' };
const CHOICES: readonly Choice[] = Object.freeze([
  Object.freeze({ label: '1 · APPLE', answer: 'apple', key: '1' }),
  Object.freeze({ label: '2 · PEAR', answer: 'pear', key: '2' }),
  Object.freeze({ label: '3 · BANANA', answer: 'banana', key: '3' }),
]);

class PhaserActorSpeechAdapter implements TutorSpeechAdapter {
  private failed = false;

  constructor(
    private readonly actor: PhaserActor,
    private readonly fixture: EnglishSpeechFixture,
  ) {}

  async speak(request: TutorSpeechRequest, cancellation: TutorCancellationToken): Promise<void> {
    if (cancellation.cancelled) return;
    if (this.fixture === 'fail-once' && !this.failed) {
      this.failed = true;
      throw new Error('Deterministic English speech failure');
    }
    await this.actor.speak(request.text);
  }

  interrupt(reason: string): void {
    this.actor.interrupt(reason);
  }
}

class SceneTutorTextPresenter implements TutorTextPresenter {
  constructor(private readonly label: Phaser.GameObjects.Text) {}

  present(presentation: TutorTextPresentation): void {
    if (this.label.active) this.label.setText(presentation.text);
  }

  clear(): void {
    if (this.label.active) this.label.setText('');
  }
}

export class EnglishWorldScene extends Phaser.Scene {
  private assetPack?: AuthoredAssetPack;
  private queuedAssets?: QueuedAssetPack;
  private assetLoadState: AssetLoadState = 'idle';
  private failedAssetKeys = new Set<string>();
  private loadingLabel?: Phaser.GameObjects.Text;
  private portalImage?: Phaser.GameObjects.Image;
  private markerImage?: Phaser.GameObjects.Image;
  private fallbackCircle?: Phaser.GameObjects.Arc;
  private title?: Phaser.GameObjects.Text;
  private lessonCard?: Phaser.GameObjects.Rectangle;
  private lessonWord?: Phaser.GameObjects.Text;
  private promptLabel?: Phaser.GameObjects.Text;
  private feedbackLabel?: Phaser.GameObjects.Text;
  private tutorText?: Phaser.GameObjects.Text;
  private statusLabel?: Phaser.GameObjects.Text;
  private primaryButton?: Phaser.GameObjects.Text;
  private hintButton?: Phaser.GameObjects.Text;
  private shortcutLabel?: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Text[] = [];
  private backButton?: Phaser.GameObjects.Text;
  private actor?: PhaserActor;
  private lesson?: EnglishLessonFlow;
  private tutorSession?: TutorSession;
  private debugOverlay?: RuntimeDebugOverlay;
  private returning = false;
  private learnerActionBusy = false;
  private lifecycleRevision = 0;
  private tutorFixture: EnglishTutorFixture = 'normal';
  private speechFixture: EnglishSpeechFixture = 'normal';

  constructor() {
    super('english-world');
  }

  init() {
    this.lifecycleRevision += 1;
    this.assetPack = getPlaceAssetPack('english');
    this.queuedAssets = undefined;
    this.assetLoadState = 'idle';
    this.failedAssetKeys.clear();
    this.returning = false;
    this.learnerActionBusy = false;
    this.tutorFixture = resolveEnglishTutorFixture();
    this.speechFixture = resolveEnglishSpeechFixture();
  }

  preload() {
    const assetPack = this.assetPack;
    if (!assetPack) return;

    this.assetLoadState = 'loading';
    this.loadingLabel = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Loading English World…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#d7e4fa',
      })
      .setOrigin(0.5);

    this.queuedAssets = queueAssetPack(this, assetPack);
    const recordFailure = (file: { key: string }) => this.failedAssetKeys.add(file.key);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, recordFailure);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, recordFailure);
      this.assetLoadState =
        this.failedAssetKeys.size === 0 && isAssetPackReady(this, assetPack) ? 'ready' : 'error';
    });
  }

  create() {
    const assetPack = this.assetPack;
    this.loadingLabel?.destroy();
    this.loadingLabel = undefined;
    if (!assetPack) {
      this.scene.start('planet-hub', { selectedPlaceId: 'english' });
      return;
    }

    this.cameras.main.setBackgroundColor('#071426');
    if (this.assetLoadState === 'ready') {
      this.portalImage = this.add.image(0, 0, 'shared:place-portal-frame').setAlpha(0.22);
      this.markerImage = this.add.image(0, 0, 'place:english:marker').setTint(0x68b8ff).setAlpha(0.52);
    } else {
      this.fallbackCircle = this.add.circle(0, 0, 120, 0x68b8ff, 0.16);
    }

    this.title = this.add
      .text(0, 0, 'English World', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#f5f8ff',
      })
      .setOrigin(0.5);

    this.lessonCard = this.add.rectangle(0, 0, 430, 250, 0x102b4d, 0.97).setStrokeStyle(2, 0x68b8ff, 0.75);
    this.lessonWord = this.add
      .text(0, 0, 'APPLE', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.promptLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#f5f8ff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.feedbackLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#b8d6ff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.tutorText = this.add
      .text(0, 0, 'Your companion is getting the lesson ready…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '17px',
        color: '#d7e4fa',
        align: 'center',
      })
      .setOrigin(0.5);
    this.statusLabel = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: this.assetLoadState === 'ready' ? '#8fb0d9' : '#ffcf9f',
      })
      .setOrigin(0.5);

    this.primaryButton = this.makeActionButton('Start practice', () => this.handlePrimaryAction());
    this.hintButton = this.makeActionButton('Hint · H', () => this.handleHint());
    this.choiceButtons = CHOICES.map((choice) =>
      this.makeActionButton(choice.label, () => this.handleChoice(choice.answer)),
    );
    this.shortcutLabel = this.add
      .text(0, 0, 'Keyboard: Enter continue · 1/2/3 choose · H hint', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#7899c2',
        align: 'center',
      })
      .setOrigin(0.5);
    this.backButton = this.add
      .text(20, 58, '← Back to planet', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f5f8ff',
        backgroundColor: '#132947',
        padding: { x: 13, y: 13 },
      })
      .setInteractive({ useHandCursor: true });
    this.backButton.on('pointerdown', () => this.returnToHub());

    this.actor = new PhaserActor(this, KIDSLIVE_COMPANION, (anchor) => this.resolveActorAnchor(anchor));
    this.actor.setEmotion('warm');
    this.actor.snapTo(ACTOR_HOME);
    this.actor.lookAt(LESSON_FOCUS);

    this.lesson = new EnglishLessonFlow();
    this.tutorSession = new TutorSession({
      sessionId: 'english-world:lesson-1',
      engine: this.lesson.engine,
      persona: { personaId: 'kidslive-companion', toneId: 'warm-guide', locale: 'en' },
      provider: createEnglishTutorProvider(this.tutorFixture),
      actor: this.actor,
      speech: new PhaserActorSpeechAdapter(this.actor, this.speechFixture),
      text: new SceneTutorTextPresenter(this.tutorText),
      voice: { voiceId: 'companion-default', locale: 'en' },
    });

    this.input.keyboard?.on('keydown-ENTER', this.handlePrimaryAction, this);
    this.input.keyboard?.on('keydown-ONE', this.handleChoiceOne, this);
    this.input.keyboard?.on('keydown-TWO', this.handleChoiceTwo, this);
    this.input.keyboard?.on('keydown-THREE', this.handleChoiceThree, this);
    this.input.keyboard?.on('keydown-H', this.handleHint, this);

    this.refreshLessonView();
    this.layout(this.scale.width, this.scale.height);
    void this.runTutorTurn();

    this.debugOverlay = new RuntimeDebugOverlay(this, () => ({
      scene: this.scene.key,
      viewport: `${this.scale.width}x${this.scale.height}`,
      camera: `z=${this.cameras.main.zoom.toFixed(2)} x=${Math.round(this.cameras.main.scrollX)} y=${Math.round(this.cameras.main.scrollY)}`,
      mode: this.returning
        ? 'returning'
        : `lesson:${this.lesson?.engine.state.currentStepId ?? this.lesson?.engine.state.status ?? 'none'}`,
      objects: this.children.length,
      detail: `assets=${this.assetLoadState} cached=${this.queuedAssets?.cachedKeys.length ?? 0} failed=${this.failedAssetKeys.size} tutor=${this.tutorSession?.sessionStatus ?? 'none'} phase=${this.lesson?.view.phase ?? 'none'} attempts=${this.lesson?.view.attempts ?? 0} hint=${this.lesson?.view.hintUsed ? 'used' : 'unused'} busy=${this.learnerActionBusy ? 'yes' : 'no'} fixture=${this.tutorFixture}/${this.speechFixture}`,
    }));

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private makeActionButton(label: string, action: () => void): Phaser.GameObjects.Text {
    const button = this.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1f5e9f',
        padding: { x: 18, y: 14 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', action);
    return button;
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height);
    this.actor?.reflow();
  }

  private handleShutdown() {
    this.lifecycleRevision += 1;
    this.returning = true;
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.off('keydown-ENTER', this.handlePrimaryAction, this);
    this.input.keyboard?.off('keydown-ONE', this.handleChoiceOne, this);
    this.input.keyboard?.off('keydown-TWO', this.handleChoiceTwo, this);
    this.input.keyboard?.off('keydown-THREE', this.handleChoiceThree, this);
    this.input.keyboard?.off('keydown-H', this.handleHint, this);
    this.tutorSession?.dispose('English World scene shutdown');
    this.tutorSession = undefined;
    this.actor?.dispose();
    this.actor = undefined;
    this.lesson = undefined;
    this.tweens.killAll();
    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;
    if (this.assetPack) releaseSceneOwnedAssets(this, this.assetPack);
  }

  private handlePrimaryAction() {
    const lesson = this.lesson;
    if (!lesson || this.returning || this.learnerActionBusy) return;
    const phase = lesson.view.phase;
    try {
      if (phase === 'welcome') lesson.startPractice();
      else if (phase === 'practice') lesson.beginCheck();
      else if (phase === 'celebrate' || phase === 'review') lesson.finish();
      else return;
      this.afterLearnerAction();
    } catch {
      this.feedbackLabel?.setText('That action is not available yet.');
    }
  }

  private handleChoiceOne() {
    this.handleChoice(CHOICES[0].answer);
  }

  private handleChoiceTwo() {
    this.handleChoice(CHOICES[1].answer);
  }

  private handleChoiceThree() {
    this.handleChoice(CHOICES[2].answer);
  }

  private handleChoice(answer: string) {
    const lesson = this.lesson;
    if (!lesson || lesson.view.phase !== 'check' || this.returning || this.learnerActionBusy) return;
    try {
      lesson.submitAnswer(answer);
      this.afterLearnerAction();
    } catch {
      this.feedbackLabel?.setText('Choose one of the visible word answers.');
    }
  }

  private handleHint() {
    const lesson = this.lesson;
    if (!lesson || !lesson.view.hintAvailable || this.returning || this.learnerActionBusy) return;
    try {
      lesson.useHint();
      this.afterLearnerAction();
    } catch {
      this.feedbackLabel?.setText('The hint is not available yet.');
    }
  }

  private afterLearnerAction() {
    this.tutorSession?.cancelActiveTurn('Learner moved to the next lesson state');
    this.refreshLessonView();
    this.layout(this.scale.width, this.scale.height);
    void this.runTutorTurn();
  }

  private async runTutorTurn() {
    const tutorSession = this.tutorSession;
    const lifecycleRevision = this.lifecycleRevision;
    if (!tutorSession || tutorSession.sessionStatus !== 'active' || this.returning) return;

    this.learnerActionBusy = true;
    this.setInteractionEnabled(false);
    try {
      const result = await tutorSession.runTurn();
      if (!this.isCurrentTutorTurn(lifecycleRevision, tutorSession)) return;
      if (result.status === 'failed') {
        this.tutorText?.setText('Your companion is quiet for a moment. You can keep learning.');
      }
    } catch {
      if (!this.isCurrentTutorTurn(lifecycleRevision, tutorSession)) return;
      this.tutorText?.setText('Your companion is quiet for a moment. You can keep learning.');
    } finally {
      if (this.isCurrentTutorTurn(lifecycleRevision, tutorSession)) {
        this.learnerActionBusy = false;
        this.setInteractionEnabled(true);
      }
    }
  }

  private isCurrentTutorTurn(lifecycleRevision: number, tutorSession: TutorSession): boolean {
    return (
      lifecycleRevision === this.lifecycleRevision &&
      tutorSession === this.tutorSession &&
      !this.returning &&
      this.scene.isActive()
    );
  }

  private setInteractionEnabled(enabled: boolean) {
    const buttons = [this.primaryButton, this.hintButton, ...this.choiceButtons];
    for (const button of buttons) {
      if (!button?.active || !button.visible) continue;
      if (enabled) button.setInteractive({ useHandCursor: true });
      else button.disableInteractive();
    }
  }

  private refreshLessonView() {
    const lesson = this.lesson;
    if (!lesson) return;
    const view = lesson.view;
    this.promptLabel?.setText(view.prompt);
    this.feedbackLabel?.setText(view.feedback);
    this.lessonWord?.setText('APPLE');

    const assetStatus = this.assetLoadState === 'ready' ? 'Lesson 1 · First words' : 'Safe art fallback · Lesson 1';
    const attemptStatus = view.phase === 'check' ? ` · Try ${Math.min(view.attempts + 1, 3)} of 3` : '';
    this.statusLabel?.setText(`${assetStatus}${attemptStatus}`);

    const showChoices = view.phase === 'check';
    this.choiceButtons.forEach((button) => button.setVisible(showChoices));
    this.hintButton?.setVisible(showChoices && view.hintAvailable);

    const primaryLabel =
      view.phase === 'welcome'
        ? 'Start practice · Enter'
        : view.phase === 'practice'
          ? 'Start word check · Enter'
          : view.phase === 'celebrate' || view.phase === 'review'
            ? 'Finish lesson · Enter'
            : '';
    this.primaryButton?.setText(primaryLabel).setVisible(primaryLabel.length > 0);

    if (view.hintUsed && view.phase === 'check') {
      this.feedbackLabel?.setText('Hint: listen for the short A sound at the start.');
    }
    if (view.phase === 'complete') {
      this.tutorText?.setText('Lesson complete. Return to the planet when you are ready.');
    }
  }

  private layout(width: number, height: number) {
    const compact = width < 700 || height < 620;
    const short = height < 560;
    const centerX = width / 2;
    const centerY = height / 2;
    const artSize = Math.min(width, height) * (compact ? 0.5 : 0.58);
    const cardWidth = Math.min(compact ? width - 34 : 520, 520);
    const cardHeight = compact ? Math.min(330, height - 150) : 300;

    this.portalImage?.setPosition(centerX, centerY).setDisplaySize(artSize, artSize);
    this.markerImage?.setPosition(centerX, centerY).setDisplaySize(artSize * 0.48, artSize * 0.48);
    this.fallbackCircle?.setPosition(centerX, centerY).setRadius(Math.min(width, height) * 0.2);
    this.title?.setPosition(centerX, short ? 34 : compact ? 48 : 58).setFontSize(short ? 25 : compact ? 30 : 40);
    this.statusLabel?.setPosition(centerX, short ? 64 : compact ? 84 : 101);
    this.lessonCard?.setPosition(centerX, centerY - (compact ? 6 : 8)).setSize(cardWidth, cardHeight);
    this.lessonWord?.setPosition(centerX, centerY - (compact ? 110 : 105)).setFontSize(short ? 27 : compact ? 31 : 38);
    this.promptLabel
      ?.setPosition(centerX, centerY - (compact ? 66 : 56))
      .setFontSize(short ? 16 : compact ? 18 : 20)
      .setWordWrapWidth(cardWidth - 44);
    this.feedbackLabel
      ?.setPosition(centerX, centerY - (compact ? 28 : 19))
      .setFontSize(short ? 13 : 15)
      .setWordWrapWidth(cardWidth - 44);

    const choiceY = centerY + (compact ? 25 : 37);
    if (compact) {
      const spacing = short ? 42 : 48;
      this.choiceButtons.forEach((button, index) =>
        button.setPosition(centerX, choiceY + index * spacing).setFontSize(short ? 13 : 15),
      );
      this.hintButton?.setPosition(centerX, choiceY + spacing * 3 + 6).setFontSize(short ? 13 : 15);
      this.primaryButton?.setPosition(centerX, centerY + 55).setFontSize(short ? 13 : 15);
    } else {
      const offsets = [-128, 0, 128];
      this.choiceButtons.forEach((button, index) => button.setPosition(centerX + offsets[index], choiceY));
      this.hintButton?.setPosition(centerX, choiceY + 58);
      this.primaryButton?.setPosition(centerX, centerY + 52);
    }

    if (compact) {
      this.tutorText
        ?.setPosition(centerX - (short ? 0 : 38), height - (short ? 118 : 155))
        .setFontSize(short ? 13 : 15)
        .setWordWrapWidth(Math.min(short ? width - 48 : 250, width - 80));
      this.shortcutLabel
        ?.setVisible(!short)
        .setPosition(centerX - 42, height - 76)
        .setWordWrapWidth(Math.min(235, width - 135));
      this.backButton?.setOrigin(0, 1).setPosition(18, height - 18);
    } else {
      this.tutorText
        ?.setPosition(centerX, centerY + 190)
        .setFontSize(17)
        .setWordWrapWidth(Math.min(650, width - 54));
      this.shortcutLabel?.setVisible(true).setPosition(centerX, height - 28).setWordWrapWidth(width - 48);
      this.backButton?.setOrigin(0, 0).setPosition(20, 58);
    }
  }

  private resolveActorAnchor(anchor: ActorAnchor) {
    const compact = this.scale.width < 700 || this.scale.height < 620;
    const short = this.scale.height < 560;
    if (anchor.id === ACTOR_HOME.id) {
      return {
        x: compact ? this.scale.width - (short ? 48 : 58) : this.scale.width - 105,
        y: compact ? this.scale.height - (short ? 88 : 148) : this.scale.height - 108,
      };
    }
    if (anchor.id === LESSON_FOCUS.id) {
      return { x: this.scale.width / 2, y: this.scale.height / 2 - 20 };
    }
    return undefined;
  }

  private returnToHub() {
    if (this.returning) return;
    this.returning = true;
    this.learnerActionBusy = true;
    this.setInteractionEnabled(false);
    this.tutorSession?.cancelActiveTurn('Leaving English World');
    this.actor?.interrupt('Leaving English World');
    this.backButton?.disableInteractive().setText('Returning…');
    this.cameras.main.fadeOut(180, 7, 20, 38);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('planet-hub', { selectedPlaceId: 'english' });
    });
  }
}
