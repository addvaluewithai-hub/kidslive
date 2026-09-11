import Phaser from 'phaser';
import type { ActorAnchor } from '../../core/actors/WorldActor';
import { ExperienceEngine } from '../../core/experience/ExperienceEngine';
import { ScriptedTutor } from '../../core/tutor/ScriptedTutor';
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
import { ENGLISH_INITIAL_TUTOR_OUTPUT, ENGLISH_LESSON } from './englishLesson';

type AssetLoadState = 'idle' | 'loading' | 'ready' | 'error';

const ACTOR_HOME: ActorAnchor = { kind: 'anchor', id: 'english-companion-home' };
const LESSON_FOCUS: ActorAnchor = { kind: 'anchor', id: 'english-lesson-focus' };

class PhaserActorSpeechAdapter implements TutorSpeechAdapter {
  constructor(private readonly actor: PhaserActor) {}

  async speak(request: TutorSpeechRequest, cancellation: TutorCancellationToken): Promise<void> {
    if (cancellation.cancelled) return;
    await this.actor.speak(request.text);
  }

  interrupt(reason: string): void {
    this.actor.interrupt(reason);
  }
}

class SceneTutorTextPresenter implements TutorTextPresenter {
  constructor(private readonly label: Phaser.GameObjects.Text) {}

  present(presentation: TutorTextPresentation): void {
    this.label.setText(presentation.text);
  }

  clear(): void {
    this.label.setText('');
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
  private tutorText?: Phaser.GameObjects.Text;
  private statusLabel?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Text;
  private actor?: PhaserActor;
  private engine?: ExperienceEngine;
  private tutorSession?: TutorSession;
  private debugOverlay?: RuntimeDebugOverlay;
  private returning = false;

  constructor() {
    super('english-world');
  }

  init() {
    this.assetPack = getPlaceAssetPack('english');
    this.queuedAssets = undefined;
    this.assetLoadState = 'idle';
    this.failedAssetKeys.clear();
    this.returning = false;
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
      this.portalImage = this.add.image(0, 0, 'shared:place-portal-frame').setAlpha(0.28);
      this.markerImage = this.add.image(0, 0, 'place:english:marker').setTint(0x68b8ff).setAlpha(0.7);
    } else {
      this.fallbackCircle = this.add.circle(0, 0, 120, 0x68b8ff, 0.18);
    }

    this.title = this.add
      .text(0, 0, 'English World', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#f5f8ff',
      })
      .setOrigin(0.5);

    this.lessonCard = this.add.rectangle(0, 0, 300, 170, 0x102b4d, 0.96).setStrokeStyle(2, 0x68b8ff, 0.7);
    this.lessonWord = this.add
      .text(0, 0, 'APPLE', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.tutorText = this.add
      .text(0, 0, 'Your companion is getting the lesson ready…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#d7e4fa',
        align: 'center',
      })
      .setOrigin(0.5);

    this.statusLabel = this.add
      .text(
        0,
        0,
        this.assetLoadState === 'ready'
          ? 'Lesson 1 · First words'
          : 'Lesson art is unavailable, so a safe fallback is being used.',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: this.assetLoadState === 'ready' ? '#8fb0d9' : '#ffcf9f',
        },
      )
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

    this.engine = ExperienceEngine.start(ENGLISH_LESSON);
    this.tutorSession = new TutorSession({
      sessionId: 'english-world:lesson-1',
      engine: this.engine,
      persona: { personaId: 'kidslive-companion', toneId: 'warm-guide', locale: 'en' },
      provider: new ScriptedTutor([ENGLISH_INITIAL_TUTOR_OUTPUT]),
      actor: this.actor,
      speech: new PhaserActorSpeechAdapter(this.actor),
      text: new SceneTutorTextPresenter(this.tutorText),
      voice: { voiceId: 'companion-default', locale: 'en' },
    });

    this.layout(this.scale.width, this.scale.height);
    void this.tutorSession.runTurn().then((result) => {
      if (result.status === 'failed') {
        this.tutorText?.setText('The lesson is ready. You can continue even without tutor audio.');
      }
    });

    this.debugOverlay = new RuntimeDebugOverlay(this, () => ({
      scene: this.scene.key,
      viewport: `${this.scale.width}x${this.scale.height}`,
      camera: `z=${this.cameras.main.zoom.toFixed(2)} x=${Math.round(this.cameras.main.scrollX)} y=${Math.round(this.cameras.main.scrollY)}`,
      mode: this.returning ? 'returning' : `lesson:${this.engine?.state.currentStepId ?? 'none'}`,
      objects: this.children.length,
      detail: `assets=${this.assetLoadState} cached=${this.queuedAssets?.cachedKeys.length ?? 0} failed=${this.failedAssetKeys.size} tutor=${this.tutorSession?.sessionStatus ?? 'none'}`,
    }));

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height);
    this.actor?.reflow();
  }

  private handleShutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.tutorSession?.dispose('English World scene shutdown');
    this.tutorSession = undefined;
    this.actor?.dispose();
    this.actor = undefined;
    this.engine = undefined;
    this.tweens.killAll();
    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;
    if (this.assetPack) releaseSceneOwnedAssets(this, this.assetPack);
  }

  private layout(width: number, height: number) {
    const compact = width < 700;
    const centerX = width / 2;
    const centerY = height / 2;
    const artSize = Math.min(width, height) * (compact ? 0.52 : 0.6);

    this.portalImage?.setPosition(centerX, centerY).setDisplaySize(artSize, artSize);
    this.markerImage?.setPosition(centerX, centerY).setDisplaySize(artSize * 0.48, artSize * 0.48);
    this.fallbackCircle?.setPosition(centerX, centerY).setRadius(Math.min(width, height) * 0.2);
    this.title?.setPosition(centerX, compact ? 70 : 76).setFontSize(compact ? 32 : 42);
    this.statusLabel?.setPosition(centerX, compact ? 112 : 128);
    this.lessonCard?.setPosition(centerX, centerY - (compact ? 28 : 12)).setSize(compact ? 250 : 310, compact ? 150 : 175);
    this.lessonWord?.setPosition(centerX, centerY - (compact ? 28 : 12)).setFontSize(compact ? 32 : 38);
    this.tutorText
      ?.setPosition(centerX, centerY + (compact ? 105 : 124))
      .setFontSize(compact ? 16 : 18)
      .setWordWrapWidth(Math.min(600, width - 54));
    if (compact) this.backButton?.setOrigin(0, 1).setPosition(18, height - 18);
    else this.backButton?.setOrigin(0, 0).setPosition(20, 58);
  }

  private resolveActorAnchor(anchor: ActorAnchor) {
    const compact = this.scale.width < 700;
    if (anchor.id === ACTOR_HOME.id) {
      return {
        x: compact ? this.scale.width - 58 : this.scale.width - 105,
        y: compact ? this.scale.height - 148 : this.scale.height - 108,
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
    this.tutorSession?.cancelActiveTurn('Leaving English World');
    this.backButton?.disableInteractive().setText('Returning…');
    this.cameras.main.fadeOut(180, 7, 20, 38);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('planet-hub', { selectedPlaceId: 'english' });
    });
  }
}
