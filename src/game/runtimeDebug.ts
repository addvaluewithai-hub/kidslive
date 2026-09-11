import type Phaser from 'phaser';

export type RuntimeDebugMetric = string | number | boolean;

export type RuntimeDebugSnapshot = {
  scene: string;
  viewport: string;
  camera: string;
  mode: string;
  objects: number;
  detail?: string;
  metrics?: Record<string, RuntimeDebugMetric>;
};

export type RuntimeDebugOptions = {
  enabled: boolean;
  overlay: boolean;
};

declare global {
  interface Window {
    __KIDSLIVE_RUNTIME_DEBUG__?: RuntimeDebugSnapshot;
  }
}

export function formatRuntimeDebugSnapshot(snapshot: RuntimeDebugSnapshot): string {
  const lines = [
    `scene ${snapshot.scene}`,
    `viewport ${snapshot.viewport}`,
    `camera ${snapshot.camera}`,
    `mode ${snapshot.mode}`,
    `objects ${snapshot.objects}`,
  ];

  if (snapshot.detail) lines.push(snapshot.detail);
  if (snapshot.metrics) {
    lines.push(
      Object.entries(snapshot.metrics)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(' '),
    );
  }
  return lines.join('\n');
}

export function parseRuntimeDebugOptions(search: string, isDev: boolean): RuntimeDebugOptions {
  if (!isDev) return { enabled: false, overlay: false };
  const params = new URLSearchParams(search);
  const enabled = params.get('runtimeDebug') === '1';
  return {
    enabled,
    overlay: enabled && params.get('runtimeDebugOverlay') === '1',
  };
}

function runtimeDebugOptions(): RuntimeDebugOptions {
  if (typeof window === 'undefined') return { enabled: false, overlay: false };
  return parseRuntimeDebugOptions(window.location.search, import.meta.env.DEV);
}

export class RuntimeDebugOverlay {
  private readonly label?: Phaser.GameObjects.Text;
  private readonly refreshTimer?: Phaser.Time.TimerEvent;
  private readonly enabled: boolean;
  private lastText = '';
  private lastScene?: string;

  constructor(
    scene: Phaser.Scene,
    readSnapshot: () => RuntimeDebugSnapshot,
  ) {
    const options = runtimeDebugOptions();
    this.enabled = options.enabled;
    if (!this.enabled) return;

    if (options.overlay) {
      this.label = scene.add
        .text(scene.scale.width - 12, 12, '', {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '11px',
          color: '#d7e4fa',
          backgroundColor: '#071426dd',
          padding: { x: 8, y: 6 },
          lineSpacing: 2,
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(10_000);
    }

    const refresh = () => {
      this.label?.setX(scene.scale.width - 12);
      const source = readSnapshot();
      const actorObjects = scene.children
        .getChildren()
        .filter((child) => child.name.startsWith('actor:')).length;
      const snapshot: RuntimeDebugSnapshot = {
        ...source,
        metrics: {
          actors: actorObjects,
          tweens: scene.tweens.getTweens().length,
          resizeListeners: scene.scale.listenerCount('resize'),
          ...source.metrics,
        },
      };
      this.lastScene = snapshot.scene;
      window.__KIDSLIVE_RUNTIME_DEBUG__ = snapshot;

      if (!this.label) return;
      const text = formatRuntimeDebugSnapshot(snapshot);
      if (text === this.lastText) return;
      this.lastText = text;
      this.label.setText(text);
    };

    // Publish only after the scene has finished synchronous create() wiring so lifecycle
    // metrics include listeners registered immediately after the overlay is constructed.
    this.refreshTimer = scene.time.addEvent({
      delay: 250,
      loop: true,
      callback: refresh,
    });
  }

  destroy(): void {
    this.refreshTimer?.remove(false);
    this.label?.destroy();
    if (
      this.enabled &&
      typeof window !== 'undefined' &&
      window.__KIDSLIVE_RUNTIME_DEBUG__?.scene === this.lastScene
    ) {
      delete window.__KIDSLIVE_RUNTIME_DEBUG__;
    }
  }
}
