# Architecture

```text
React product UI / Phaser world
              |
       commands + events
              v
       Pure TypeScript domain
 experience / assessment / progression / rewards / permissions
              |
              v
            Adapters
 AI tutor / audio / persistence / analytics / backend / native capabilities
```

## Ownership boundaries

### React
Menus, parent/product UI, settings, normal forms, overlays, accessibility-heavy surfaces, and non-world application chrome.

### Phaser
World rendering, scene/place lifecycle, camera, touch/world input, actor visuals, animation/tweens, hotspots, lightweight effects, and world transitions.

### Pure TypeScript domain
Curriculum sequence, correct answers, retries, hints policy, checkpoints, progression, rewards, permissions, and deterministic state transitions. No Phaser, React, browser, native, network, or model imports.

### Adapters
AI, speech/audio, storage, backend, analytics, and native features. All important adapters require deterministic test doubles.

## Companion/AI character

The character is two separate concerns:

```ts
interface WorldActor {
  moveTo(target: Anchor): Promise<void>;
  lookAt(target: Target): void;
  speak(text: string): Promise<void>;
  perform(action: ActorAction): Promise<void>;
  setEmotion(emotion: Emotion): void;
}
```

`PhaserActor` is the production visual implementation. `FakeActor`/`InstantActor` are used in domain/integration tests.

The tutor/model talks to the product through bounded commands; it never owns Phaser objects directly. The old Pixi character is a reference implementation only: port useful assets/data/behavior, **not PixiJS itself**.

## Rule of thumb
If code answers “what should happen educationally?”, it belongs in domain. If it answers “how does it look/move?”, it belongs in Phaser. If it answers “what did the model/service/device say?”, it belongs behind an adapter.
