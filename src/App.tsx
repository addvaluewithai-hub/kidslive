import { useEffect, useMemo, useRef, useState } from 'react';
import { createGame } from './game/createGame';
import { PLACES } from './game/worldConfig';
import { worldBus, type StressLevel, type WorldMetrics } from './game/worldBus';

const EMPTY_METRICS: WorldMetrics = {
  fps: 0,
  averageFps: 0,
  onePercentLowFps: 0,
  frameMs: 0,
  worstFrameMs: 0,
  longFrames: 0,
  objects: 0,
  stressLevel: 0,
  stressLabel: 'NORMAL',
};

const STRESS_LEVELS: Array<{ level: StressLevel; label: string }> = [
  { level: 0, label: 'NORMAL' },
  { level: 1, label: 'BUSY ×4' },
  { level: 2, label: 'HEAVY ×10' },
  { level: 3, label: 'TORTURE ×20' },
];

export function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState(PLACES[0].id);
  const [metrics, setMetrics] = useState<WorldMetrics>(EMPTY_METRICS);
  const selected = useMemo(() => PLACES.find((place) => place.id === selectedId) ?? PLACES[0], [selectedId]);

  useEffect(() => {
    const parent = stageRef.current;
    if (!parent) return;

    const game = createGame(parent);
    const onReady = () => setReady(true);
    const onSelected = (id: string) => setSelectedId(id);
    const onMetrics = (next: WorldMetrics) => setMetrics(next);

    worldBus.on('ready', onReady);
    worldBus.on('selected', onSelected);
    worldBus.on('metrics', onMetrics);

    return () => {
      worldBus.off('ready', onReady);
      worldBus.off('selected', onSelected);
      worldBus.off('metrics', onMetrics);
      game.destroy(true);
    };
  }, []);

  return (
    <main className="app-shell">
      <div className="world-stage" ref={stageRef} data-testid="planet-stage" />

      <header className="topbar">
        <div>
          <span className="eyebrow">KIDSLIVE / ARCHITECTURE SPIKE 001B</span>
          <h1>Nova Planet</h1>
        </div>
        <div className="metrics" aria-label="performance metrics">
          <span><b>{metrics.fps || '—'}</b> now</span>
          <span><b>{metrics.averageFps || '—'}</b> avg</span>
          <span><b>{metrics.onePercentLowFps || '—'}</b> 1% low</span>
          <span><b>{metrics.frameMs || '—'}</b> ms</span>
          <span><b>{metrics.worstFrameMs || '—'}</b> worst</span>
          <span><b>{metrics.longFrames}</b> long</span>
          <span><b>{metrics.objects || '—'}</b> objects</span>
          <span className={ready ? 'ready' : ''}>{ready ? metrics.stressLabel : 'Booting…'}</span>
        </div>
      </header>

      <aside className="control-panel">
        <span className="eyebrow">FLY TO A PLACE</span>
        <div className="place-list">
          {PLACES.map((place) => (
            <button
              key={place.id}
              className={place.id === selectedId ? 'active' : ''}
              onClick={() => worldBus.emit('visit', place.id)}
            >
              <strong>{place.name}</strong>
              <small>{place.subtitle}</small>
            </button>
          ))}
        </div>

        <div className="actions">
          <button onClick={() => worldBus.emit('tour')}>Next world</button>
        </div>

        <div className="stress-panel" data-testid="stress-panel">
          <span className="eyebrow">PERFORMANCE LOAD</span>
          <div className="stress-grid">
            {STRESS_LEVELS.map((item) => (
              <button
                key={item.level}
                className={metrics.stressLevel === item.level ? 'stress-on' : ''}
                onClick={() => worldBus.emit('stress-level', item.level)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <small>Give each level ~10 seconds, then fly between worlds. TORTURE intentionally redraws geometry and moves ~9k extra sprites every frame.</small>
        </div>
      </aside>

      <section className="place-card" data-testid="selected-place">
        <span>Currently exploring</span>
        <strong>{selected.name}</strong>
        <p>{selected.subtitle}. This is only the world/performance spike — no curriculum or AI is wired yet.</p>
      </section>
    </main>
  );
}
