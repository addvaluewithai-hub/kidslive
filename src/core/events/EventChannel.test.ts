import { describe, expect, it, vi } from 'vitest';
import { InMemoryEventChannel } from './EventChannel';

interface TestEvents {
  'world.ready': { sceneId: string };
  'domain.rewarded': { amount: number };
}

describe('InMemoryEventChannel', () => {
  it('delivers only the payload type registered for an event', () => {
    const channel = new InMemoryEventChannel<TestEvents>();
    const ready = vi.fn();
    const rewarded = vi.fn();

    channel.subscribe('world.ready', ready);
    channel.subscribe('domain.rewarded', rewarded);

    channel.emit('world.ready', { sceneId: 'planet-hub' });

    expect(ready).toHaveBeenCalledOnce();
    expect(ready).toHaveBeenCalledWith({ sceneId: 'planet-hub' });
    expect(rewarded).not.toHaveBeenCalled();
  });

  it('supports idempotent unsubscribe', () => {
    const channel = new InMemoryEventChannel<TestEvents>();
    const ready = vi.fn();
    const unsubscribe = channel.subscribe('world.ready', ready);

    unsubscribe();
    unsubscribe();
    channel.emit('world.ready', { sceneId: 'planet-hub' });

    expect(ready).not.toHaveBeenCalled();
  });

  it('uses a listener snapshot for deterministic dispatch', () => {
    const channel = new InMemoryEventChannel<TestEvents>();
    const calls: string[] = [];

    let unsubscribeSecond = () => {};
    channel.subscribe('world.ready', () => {
      calls.push('first');
      unsubscribeSecond();
    });
    unsubscribeSecond = channel.subscribe('world.ready', () => {
      calls.push('second');
    });

    channel.emit('world.ready', { sceneId: 'planet-hub' });
    channel.emit('world.ready', { sceneId: 'planet-hub' });

    expect(calls).toEqual(['first', 'second', 'first']);
  });

  it('can clear all subscriptions between runtime/test lifecycles', () => {
    const channel = new InMemoryEventChannel<TestEvents>();
    const ready = vi.fn();
    const rewarded = vi.fn();

    channel.subscribe('world.ready', ready);
    channel.subscribe('domain.rewarded', rewarded);
    channel.clear();

    channel.emit('world.ready', { sceneId: 'planet-hub' });
    channel.emit('domain.rewarded', { amount: 10 });

    expect(ready).not.toHaveBeenCalled();
    expect(rewarded).not.toHaveBeenCalled();
  });
});
