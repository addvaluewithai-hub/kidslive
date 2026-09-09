# KidsLive Project HQ

This folder is the durable project reference from architecture validation to public launch. A new conversation should be able to read this folder and continue without relying on chat history.

## Product in one sentence
KidsLive is a code-first, mobile-first interactive 2D learning universe where children travel between carefully authored learning environments with an AI character that can speak, act, move, and use bounded product tools.

## Current direction
The production runtime is now locked by physical-device evidence:

- **Expo + React Native + TypeScript** for the mobile/product application.
- **React Native Skia** for the living 2D world.
- **Reanimated/Worklets** for frame-critical animation and movement that should not flow through ordinary React state.
- Pure TypeScript domain logic for curriculum, progression, assessment, rewards, permissions, and deterministic simulation.
- AI behind bounded tutor/actor/tool contracts; the model never owns curriculum truth, rewards, or progress.
- GitHub Actions as the reproducible build/test backbone.

The current Nova/Pixi prototype remains disposable and is not a stack constraint. The companion character will be reimplemented behind the actor contract using the selected runtime.

See `SHOOTOUT.md` for the architecture bake-off and `DECISIONS.md` for D-008.

## Current status
**A0 — Architecture & performance spike: DONE.**

Same-phone Android shootout result:
- Phaser + Capacitor: **60 FPS steady / 44 FPS busy**.
- Godot native: **60 FPS steady / 50 FPS busy**.
- React Native Skia: **60 FPS steady / 60 FPS busy**.

React Native Skia won because it held display-rate performance under the busy benchmark while also keeping the product UI, native capabilities, and world renderer in one TypeScript/React Native architecture.

**A1 — Repository and development foundation: NEXT.**

A1 should turn the Skia benchmark into a clean production skeleton rather than promoting the whole shootout branch as-is. The Phaser and Godot implementations are retained only as architecture evidence and should not become parallel production runtimes.

## Architecture boundary

```text
Expo / React Native product shell
  onboarding / profile / HUD / quizzes / parent UI / settings
                 |
          commands + events
                 v
React Native Skia world runtime
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

Rules:
- Skia does not know curriculum truth.
- React components do not own per-frame world coordinates/state.
- AI does not own either.
- Domain logic must run headless in tests.
- Frame-critical animation belongs in Skia/Reanimated/Worklets, not React reconciliation.

## How to resume in a future conversation
1. Read `project/README.md`.
2. Read `project/DECISIONS.md`; D-008 locks the runtime unless real production evidence justifies reopening it.
3. Read `project/TASKS.md`; continue the first task marked `NEXT` or `IN PROGRESS`.
4. Read `project/SHOOTOUT.md` only if the runtime decision or performance evidence matters to the current task.
5. Check current PRs and CI before writing code.
6. Update this folder whenever architecture, scope, acceptance criteria, or launch assumptions change.

## Product principles
1. **Learning is authored; AI makes it alive.** Curriculum progression and assessment remain deterministic.
2. **Code is the source of truth.** Avoid required proprietary editors or export workflows.
3. **Performance is a feature.** We test on weak/medium Android hardware early, not only developer laptops.
4. **One-way escape hatches.** Framework choices must not leak into curriculum/domain logic.
5. **Fast PRs.** Unit tests, world validation, builds, and smoke tests run in GitHub Actions.
6. **No fake gamification.** Rewards should reinforce learning and consistency, not dark-pattern engagement.
7. **Child safety by architecture.** Tool permissions, content boundaries, parent controls, data minimization, and auditability are platform concerns.

## Definition of launch
Launch means more than an app-store binary. The launch gate is tracked in `LAUNCH.md`: stable mobile builds, production backend, first polished learning world, progression/rewards, safety and parent flows, observability, content QA, performance budgets, and store readiness.
