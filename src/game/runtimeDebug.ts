import Phaser from 'phaser';

export type RuntimeDebugSnapshot = {
  scene: string;
  viewport: string;
  camera: string;
  mode: string;
  objects: number;
  detail?: string;
};

export function formatRuntimeDebugSnapshot(snapshot: RuntimeDebugSnapshot): string {
  const lines = [
    `scene ${snapshot.scene}`,
    `viewport ${snapshot.viewport}`,
    `camera ${snapshot.camera}`,
    `mode ${snapshot.mode}`,
    `objects ${snapshot.objects}`,
  ];

  if (snapshot.detail) lines.push(snapshot.detail);
  return lines.join('\n');
}

export class RuntimeDebugOverlay {
  private readonly label?: Phaser.GameObjects.Text;
  private readonly refreshTimer?: Phaser.Time.TimerEvent;
  private lastText = '';

  constructor(
    scene: Phaser.Scene,
    readSnapshot: () => RuntimeDebugSnapshot,
  ) {
    if (!import.meta.env.DEV) return;

    this.label = scene.add
      .text(12, 12, '', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '11px',
        color: '#d7e4fa',
        backgroundColor: '#071426dd',
        padding: { x: 8, y: 6 },
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(10_000);

    const refresh = () => {
      const text = formatRuntimeDebugSnapshot(readSnapshot());
      if (text === this.lastText) return;
      this.lastText = text;
      this.label?.setText(text);
    };

    refresh();
    this.refreshTimer = scene.time.addEvent({
      delay: 250,
      loop: true,
      callback: refresh,
    });
  }

  destroy(): void {
    this.refreshTimer?.remove(false);
    this.label?.destroy();
  }
}
