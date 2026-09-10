import { describe, expect, it } from 'vitest';
import { ActorOperationCancelledError } from './WorldActor';
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

  it('settles manual movement only when explicitly completed', async () => {
    const actor = new FakeActor({ manualMovement: true });
    const movement = actor.moveTo(anchor('science-companion'));

    expect(actor.currentAnchor).toBeUndefined();
    expect(actor.completeMovement()).toBe(true);
    await movement;
    expect(actor.currentAnchor).toEqual(anchor('science-companion'));
    expect(actor.completeMovement()).toBe(false);
  });

  it('cancels an unfinished movement when a newer movement starts', async () => {
    const actor = new FakeActor({ manualMovement: true });
    const first = actor.moveTo(anchor('english-companion'));
    const second = actor.moveTo(anchor('math-companion'));

    await expect(first).rejects.toBeInstanceOf(ActorOperationCancelledError);
    expect(actor.currentAnchor).toBeUndefined();

    actor.completeMovement();
    await second;
    expect(actor.currentAnchor).toEqual(anchor('math-companion'));
  });

  it('disposes idempotently, cancels movement, and rejects later commands', async () => {
    const actor = new FakeActor({ manualMovement: true });
    const movement = actor.moveTo(anchor('somewhere'));
    actor.dispose();
    actor.dispose();

    await expect(movement).rejects.toBeInstanceOf(ActorOperationCancelledError);
    expect(actor.commands).toEqual([
      { type: 'moveTo', target: anchor('somewhere') },
      { type: 'dispose' },
    ]);
    await expect(actor.moveTo(anchor('elsewhere'))).rejects.toThrow('Actor has been disposed');
    expect(() => actor.setEmotion('warm')).toThrow('Actor has been disposed');
  });
});
