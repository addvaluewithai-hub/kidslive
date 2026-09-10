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

  it('runs awaited action and speech as deterministic sequence steps', async () => {
    const actor = new FakeActor({ manualActions: true, manualSpeech: true });
    const action = actor.perform('think');
    let actionSettled = false;
    void action.then(() => {
      actionSettled = true;
    });

    expect(actor.completeSpeech()).toBe(false);
    expect(actor.completeAction()).toBe(true);
    await action;
    expect(actionSettled).toBe(true);
    expect(actor.lastAction).toBe('think');

    const speech = actor.speak('Let us explore English!');
    expect(actor.lastSpokenText).toBeUndefined();
    expect(actor.completeSpeech()).toBe(true);
    await speech;
    expect(actor.lastSpokenText).toBe('Let us explore English!');
  });

  it('cancels only the superseded channel while independent channels can overlap', async () => {
    const actor = new FakeActor({ manualMovement: true, manualActions: true, manualSpeech: true });
    const movement = actor.moveTo(anchor('english-companion'));
    const firstAction = actor.perform('think');
    const speech = actor.speak('English is this way.');
    const secondAction = actor.perform('greet');

    await expect(firstAction).rejects.toBeInstanceOf(ActorOperationCancelledError);
    expect(actor.completeMovement()).toBe(true);
    expect(actor.completeSpeech()).toBe(true);
    expect(actor.completeAction()).toBe(true);
    await Promise.all([movement, speech, secondAction]);

    expect(actor.currentAnchor).toEqual(anchor('english-companion'));
    expect(actor.lastSpokenText).toBe('English is this way.');
    expect(actor.lastAction).toBe('greet');
  });

  it('interrupts all unfinished channels without disposing the actor', async () => {
    const actor = new FakeActor({ manualMovement: true, manualActions: true, manualSpeech: true });
    const movement = actor.moveTo(anchor('somewhere'));
    const action = actor.perform('explain');
    const speech = actor.speak('Still working...');

    actor.interrupt('Scene intent changed');

    await expect(movement).rejects.toBeInstanceOf(ActorOperationCancelledError);
    await expect(action).rejects.toBeInstanceOf(ActorOperationCancelledError);
    await expect(speech).rejects.toBeInstanceOf(ActorOperationCancelledError);
    expect(actor.commands.at(-1)).toEqual({ type: 'interrupt', reason: 'Scene intent changed' });

    await actor.perform('greet');
    expect(actor.lastAction).toBe('greet');
  });

  it('disposes idempotently, cancels all operations, and rejects later commands', async () => {
    const actor = new FakeActor({ manualMovement: true, manualActions: true, manualSpeech: true });
    const movement = actor.moveTo(anchor('somewhere'));
    const action = actor.perform('think');
    const speech = actor.speak('Goodbye');
    actor.dispose();
    actor.dispose();

    await expect(movement).rejects.toBeInstanceOf(ActorOperationCancelledError);
    await expect(action).rejects.toBeInstanceOf(ActorOperationCancelledError);
    await expect(speech).rejects.toBeInstanceOf(ActorOperationCancelledError);
    expect(actor.commands.at(-1)).toEqual({ type: 'dispose' });
    expect(() => actor.moveTo(anchor('elsewhere'))).toThrow('Actor has been disposed');
    expect(() => actor.setEmotion('warm')).toThrow('Actor has been disposed');
    expect(() => actor.interrupt()).toThrow('Actor has been disposed');
  });
});
