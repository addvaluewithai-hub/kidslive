import { useEffect, useMemo, useRef, useState } from 'react';
import { createGame } from './game/createGame';
import { PLACES } from './game/worldConfig';
import { worldBus, type WorldMetrics } from './game/worldBus';

const EMPTY_METRICS: WorldMetrics = { fps: 0, objects: 0, stress: false };

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
          <span className="eyebrow">KIDSLIVE / ARCHITECTURE SPIKE 001</span>
          <h1>Nova Planet</h1>
        </div>
        <div className="metrics" aria-label="performance metrics">
          <span><b>{metrics.fps || '—'}</b> FPS</span>
          <span><b>{metrics.objects || '—'}</b> objects</span>
          <span className={ready ? 'ready' : ''}>{ready ? 'World spike ready' : 'Booting…'}</span>
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
          <button
            className={metrics.stress ? 'stress-on' : ''}
            onClick={() => worldBus.emit('stress', !metrics.stress)}
          >
            {metrics.stress ? 'Stress mode ON' : 'Enable stress mode'}
          </button>
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
