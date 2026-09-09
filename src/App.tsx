import { useEffect, useRef } from 'react';
import { createGame } from './game/createGame';

export function App() {
  const gameRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRoot.current) return;
    const game = createGame(gameRoot.current);
    return () => game.destroy(true);
  }, []);

  return (
    <main className="app-shell">
      <header className="app-title">KidsLive</header>
      <div ref={gameRoot} className="game-root" data-testid="game-root" />
    </main>
  );
}
