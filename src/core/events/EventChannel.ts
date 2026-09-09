export type EventListener<Payload> = (payload: Payload) => void;

export interface EventChannel<Events extends object> {
  emit<Key extends keyof Events>(type: Key, payload: Events[Key]): void;
  subscribe<Key extends keyof Events>(
    type: Key,
    listener: EventListener<Events[Key]>,
  ): () => void;
  clear(): void;
}

/**
 * Small synchronous event boundary for communication between product layers.
 *
 * Domain code can depend on the EventChannel contract without importing React,
 * Phaser, browser APIs, native bridges, or network providers. Runtime owners can
 * create one channel and pass only the narrow event maps each layer needs.
 */
export class InMemoryEventChannel<Events extends object>
  implements EventChannel<Events>
{
  private readonly listeners = new Map<
    keyof Events,
    Set<EventListener<Events[keyof Events]>>
  >();

  subscribe<Key extends keyof Events>(
    type: Key,
    listener: EventListener<Events[Key]>,
  ): () => void {
    let listenersForType = this.listeners.get(type);

    if (!listenersForType) {
      listenersForType = new Set<EventListener<Events[keyof Events]>>();
      this.listeners.set(type, listenersForType);
    }

    const storedListener = listener as EventListener<Events[keyof Events]>;
    listenersForType.add(storedListener);

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;

      const currentListeners = this.listeners.get(type);
      currentListeners?.delete(storedListener);

      if (currentListeners?.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  emit<Key extends keyof Events>(type: Key, payload: Events[Key]): void {
    const listenersForType = this.listeners.get(type);
    if (!listenersForType) return;

    // Snapshot before dispatch so subscribe/unsubscribe during a callback cannot
    // reorder or skip listeners in the current emission.
    for (const listener of [...listenersForType]) {
      const typedListener = listener as EventListener<Events[Key]>;
      typedListener(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
