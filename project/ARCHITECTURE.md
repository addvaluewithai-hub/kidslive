# Target Architecture

## Runtime boundaries

```text
React product shell
  onboarding / profile / HUD / quizzes / parent UI / settings
                 |
          commands + events
                 v
Phaser world runtime
  planet / environments / actor / camera / portals / effects / mini-games
                 |
          commands + events
                 v
Pure TypeScript domain
  experience engine / assessment / progression / rewards / tool permissions
                 |
                 v
Adapters
  AI tutor / audio / persistence / analytics / backend / native capabilities
```

The important boundary is not React vs Phaser. The important boundary is that the **domain can run headless**.

## Core contracts to grow toward

```ts
interface WorldActor {
  moveTo(anchorId: string): Promise<void>;
  lookAt(targetId: string): void;
  perform(action: ActorAction): Promise<void>;
  setEmotion(emotion: Emotion): void;
}

interface Tutor {
  respond(context: TutorContext): AsyncIterable<TutorEvent>;
}

interface ExperienceRuntime {
  getState(): ExperienceState;
  dispatch(event: ExperienceEvent): ExperienceState;
}
```

Production implementations can be animated or asynchronous. Tests can use `InstantActor`, `ScriptedTutor`, and in-memory persistence.

## World model
Keep the first version intentionally small:
- World
- Scene
- Place
- Anchor
- Portal
- Hotspot
- Actor
- Camera
- Effect

Do not add ECS, global physics, a custom editor, or generic game-engine abstractions until a real feature requires them.

## Experience model
An experience is authored data/code with explicit objectives and transitions. Each step defines allowed actions, success/failure conditions, retry/hint policy, and reward requests. AI can improvise inside a step but cannot silently change the graph.

## Content ownership
Environment visuals, place definitions, experience definitions, assessment rules, and tool schemas are version-controlled. Build-time validators should reject duplicate IDs, broken transitions, missing anchors, unreachable required steps, and invalid reward references.

## Backend
Backend choice is intentionally deferred until the vertical slice establishes concrete needs. Required capabilities are expected to include child/parent identities, progress sync, content versions, safe AI session tokens, rewards, and observability. Avoid provider soup before those requirements exist.
