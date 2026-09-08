import { useEffect, useMemo, useRef, useState } from 'react';
import { createGame } from './game/createGame';
import { PLACES } from './game/worldConfig';
import { worldBus, type BenchmarkLoad, type WorldMetrics } from './game/worldBus';

const EMPTY_METRICS: WorldMetrics = {
  fps: 0,
  averageFps: 0,
  onePercentLowFps: 0,
  frameMs: 0,
  worstFrameMs: 0,
  longFrames: 0,
  objects: 0,
  activeParticles: 0,
  animatedObjects: 0,
  renderer: 'WEBGL',
  benchmarkLoad: 'steady',
  benchmarkLabel: 'PRODUCTION STEADY',
};

const DEFAULT_TUTOR_LINE = 'Let’s explore this place together.';

export function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState(PLACES[0].id);
  const [metrics, setMetrics] = useState<WorldMetrics>(EMPTY_METRICS);
  const [tutorLine, setTutorLine] = useState(DEFAULT_TUTOR_LINE);
  const selected = useMemo(() => PLACES.find((place) => place.id === selectedId) ?? PLACES[0], [selectedId]);

  useEffect(() => {
    const parent = stageRef.current;
    if (!parent) return;

    const game = createGame(parent);
    const onReady = () => setReady(true);
    const onSelected = (id: string) => setSelectedId(id);
    const onMetrics = (next: WorldMetrics) => setMetrics(next);
    const onTutorLine = (line: string) => setTutorLine(line);

    worldBus.on('ready', onReady);
    worldBus.on('selected', onSelected);
    worldBus.on('metrics', onMetrics);
    worldBus.on('tutor-line', onTutorLine);

    return () => {
      worldBus.off('ready', onReady);
      worldBus.off('selected', onSelected);
      worldBus.off('metrics', onMetrics);
      worldBus.off('tutor-line', onTutorLine);
      game.destroy(true);
    };
  }, []);

  const setLoad = (load: BenchmarkLoad) => worldBus.emit('benchmark-load', load);

  return (
    <main className="app-shell">
      <div className="world-stage" ref={stageRef} data-testid="planet-stage" />

      <header className="topbar">
        <div className="brand-block">
          <span className="eyebrow">KIDSLIVE / ARCHITECTURE SPIKE 001D</span>
          <h1>Final Phaser Gate</h1>
          <p>Same product idea, rebuilt with production-friendly rendering patterns.</p>
        </div>

        <div className="metrics" aria-label="performance metrics">
          <span><b>{metrics.fps || '—'}</b> now</span>
          <span><b>{metrics.averageFps || '—'}</b> avg</span>
          <span><b>{metrics.onePercentLowFps || '—'}</b> 1% low</span>
          <span><b>{metrics.worstFrameMs || '—'}</b> worst ms</span>
          <span><b>{metrics.longFrames}</b> long</span>
          <span><b>{metrics.animatedObjects || '—'}</b> animated</span>
          <span><b>{metrics.activeParticles}</b> active FX</span>
          <span><b>{metrics.renderer}</b> renderer</span>
          <span className={ready ? 'ready' : ''} data-testid="benchmark-mode">
            {ready ? metrics.benchmarkLabel : 'Booting…'}
          </span>
        </div>
      </header>

      <aside className="control-panel">
        <div className="panel-heading">
          <span className="eyebrow">WORLD TRAVEL</span>
          <strong>{selected.name}</strong>
        </div>

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

        <div className="benchmark-panel">
          <span className="eyebrow">REALISTIC LOAD</span>
          <div className="benchmark-actions">
            <button
              className={metrics.benchmarkLoad === 'steady' ? 'benchmark-on' : ''}
              onClick={() => setLoad('steady')}
            >
              Steady world
            </button>
            <button
              className={metrics.benchmarkLoad === 'busy' ? 'benchmark-on busy' : ''}
              onClick={() => setLoad('busy')}
            >
              Busy lesson
            </button>
          </div>
          <div className="actions">
            <button onClick={() => worldBus.emit('tour')}>Next world</button>
            <button onClick={() => worldBus.emit('reset-metrics')}>Reset sample</button>
          </div>
          <small>
            Final gate uses baked world/actor textures, pooled local ambience, off-screen world sleeping, pooled FX and no mobile backdrop blur.
          </small>
        </div>
      </aside>

      <section className="tutor-card" aria-label="simulated AI tutor overlay">
        <div className="tutor-avatar"><span /></div>
        <div>
          <span className="eyebrow">NOVA / SIMULATED LIVE SPEECH</span>
          <p>{tutorLine}</p>
          <div className="speech-wave" aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
      </section>

      <section className="benchmark-note">
        <span>Decision gate</span>
        <strong>50–60 steady / 45+ busy.</strong>
        <p>If the same Android device still misses this after normal production optimizations, we stop investing in Phaser and move to Godot.</p>
      </section>
    </main>
  );
}
