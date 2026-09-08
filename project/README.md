# KidsLive Project HQ

This folder is the durable project reference from architecture validation to public launch. A new conversation should be able to read this folder and continue without relying on chat history.

## Product in one sentence
KidsLive is a code-first, mobile-first interactive 2D learning universe where children travel between carefully authored learning environments with an AI character that can speak, act, move, and use bounded product tools.

## Current direction
The product principles and domain architecture are locked, but the **world/rendering runtime is deliberately not locked yet**.

Architecture Shootout A0 is comparing three candidates on the same physical Android device:
- **Phaser + React** — fastest web/TypeScript workflow; current candidate uses optimized production patterns with smooth WebGL sampling restored.
- **Godot 2D** — native game-engine candidate, authored from text/code and exported headlessly in GitHub Actions.
- **Expo + React Native Skia** — native TypeScript/React candidate using Skia + Reanimated/Worklets for the world runtime.

See `SHOOTOUT.md` for the fair comparison protocol and scorecard.

What does **not** depend on the winner:
- Experience/curriculum logic remains deterministic and renderer-independent.
- AI remains behind bounded tutor/tool contracts; the model never owns curriculum truth, rewards, or progress.
- Code is the source of truth; required proprietary/editor-only authoring workflows are avoided.
- GitHub Actions remains the reproducible build/test backbone.
- The current Nova/Pixi prototype is not a stack constraint and can be reimplemented behind the actor contract.

## Current status
**A0 — Architecture Shootout is IN PROGRESS.**

Evidence so far:
- The first synthetic Phaser torture test found a useful failure wall (×4 jank, ×10 effective freeze).
- The first realistic Phaser scene measured roughly 24 FPS steady / 13 FPS busy on the physical Android test device.
- A production-pattern Phaser optimization pass made performance feel high/smooth but the user rejected the visibly pixelated rendering compromise.
- The shootout therefore compares a visually sharp Phaser candidate against native Godot and native React Native Skia implementations at approximately the same product density.

Do not start A1 production foundation work until this shootout is tested on the same Android device and the runtime decision is recorded in `DECISIONS.md`.

## How to resume in a future conversation
1. Read `project/README.md`.
2. Read `project/DECISIONS.md` for decisions that should not be casually reopened.
3. Read `project/TASKS.md`; continue the first task marked `NEXT` or `IN PROGRESS`.
4. If A0 is still open, read `project/SHOOTOUT.md` and current benchmark/CI results before changing architecture.
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
