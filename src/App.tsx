import { useEffect, useRef } from 'react';
import { createGame } from './game/createGame';

export function App() {
  const gameRoot = useRef<HTMLDivElement>(null);
  const params = new URLSearchParams(window.location.search);
  const immersiveSprout =
    !params.has('runtimeDebug') &&
    params.get('prototype') !== 'legacy' &&
    params.get('prototype') !== 'habit-home';

  useEffect(() => {
    if (!gameRoot.current) return;
    const game = createGame(gameRoot.current);
    return () => game.destroy(true);
  }, []);

  return (
    <main className="app-shell">
      <header className={`app-title${immersiveSprout ? ' app-title--immersive' : ''}`}>KidsLive</header>
      <div ref={gameRoot} className="game-root" data-testid="game-root" />
    </main>
  );
}
