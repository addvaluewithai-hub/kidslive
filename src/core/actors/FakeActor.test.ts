import { describe, expect, it } from 'vitest';
import { FakeActor } from './FakeActor';

const anchor = (id: string) => ({ kind: 'anchor' as const, id });

describe('FakeActor', () => {
  it('records deterministic actor commands and observable state', async () => {
    const actor = new FakeActor();

    await actor.moveTo(anchor('hub-home'));
    actor.lookAt(anchor('english-place'));
    actor.setEmotion('curious');
    await actor.perform('greet');
    await actor.speak('Ready to explore?');

    expect(actor.currentAnchor).toEqual(anchor('hub-home'));
    expect(actor.lookTarget).toEqual(anchor('english-place'));
    expect(actor.emotion).toBe('curious');
    expect(actor.lastAction).toBe('greet');
    expect(actor.lastSpokenText).toBe('Ready to explore?');
    expect(actor.commands.map((command) => command.type)).toEqual([
      'moveTo',
      'lookAt',
      'setEmotion',
      'perform',
      'speak',
    ]);
  });

  it('disposes idempotently and rejects later commands', async () => {
    const actor = new FakeActor();
    actor.dispose();
    actor.dispose();

    expect(actor.commands).toEqual([{ type: 'dispose' }]);
    await expect(actor.moveTo(anchor('somewhere'))).rejects.toThrow('Actor has been disposed');
    expect(() => actor.setEmotion('warm')).toThrow('Actor has been disposed');
  });
});
