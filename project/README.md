# KidsLive Project HQ

This folder is the durable project reference from architecture validation to public launch. A new conversation should be able to read this folder and continue without relying on chat history.

## Product in one sentence
KidsLive is a code-first, mobile-first interactive 2D learning universe where children travel between carefully authored learning environments with an AI character that can speak, act, move, and use bounded product tools.

## Current direction
- Product shell: React + TypeScript.
- Interactive world: Phaser.
- Build/dev: Vite.
- Package manager: pnpm.
- Mobile packaging target: Capacitor after the browser architecture spike passes the real-device gate.
- Experience/curriculum logic: pure TypeScript, deterministic and testable without Phaser or AI.
- AI: an adapter behind bounded tutor/tool contracts; the model never owns curriculum truth, rewards, or progress.
- CI: GitHub Actions; every PR should be buildable and testable without external AI calls.

## Current status
**Architecture Spike 001: Phaser world/performance spike — browser CI is green; real-device Android performance validation is the remaining architecture gate.**

PR #2 contains the first spike. It intentionally contains no real curriculum and no live AI. It proves the world/rendering/development loop first. The stack remains provisional until the fixed-device performance check in `PERFORMANCE.md` passes.

## How to resume in a future conversation
1. Read `project/README.md`.
2. Read `project/DECISIONS.md` for decisions that should not be casually reopened.
3. Read `project/TASKS.md`; continue the first task marked `NEXT` or `IN PROGRESS`.
4. Check current PRs and CI before writing code.
5. Update this folder whenever architecture, scope, acceptance criteria, or launch assumptions change.

## Product principles
1. **Learning is authored; AI makes it alive.** Curriculum progression and assessment remain deterministic.
2. **Code is the source of truth.** Avoid required proprietary editors or export workflows.
3. **Performance is a feature.** We test on weak/medium Android hardware early, not only developer laptops.
4. **One-way escape hatches.** Framework choices must not leak into curriculum/domain logic.
5. **Fast PRs.** Unit tests, world validation, build, and browser smoke tests run in GitHub Actions.
6. **No fake gamification.** Rewards should reinforce learning and consistency, not dark-pattern engagement.
7. **Child safety by architecture.** Tool permissions, content boundaries, parent controls, data minimization, and auditability are platform concerns.

## Definition of launch
Launch means more than an app-store binary. The launch gate is tracked in `LAUNCH.md`: stable mobile builds, production backend, first polished learning world, progression/rewards, safety and parent flows, observability, content QA, performance budgets, and store readiness.
