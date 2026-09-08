# Testing & CI Strategy

## Principle
Most product correctness must be testable without rendering, network access, microphones, mobile devices, or a live AI model. Rendering and devices are additional layers, not the only way to know the product works.

## Every pull request
1. TypeScript typecheck.
2. Pure unit/domain tests (experience, assessment, rewards, permissions, validators).
3. Production build.
4. Browser smoke tests on desktop and mobile emulation using Playwright.
5. Upload useful failure artifacts/traces.

As the project grows, add lint/format, deterministic visual regression, content compilation/validation, bundle budgets, and leak/lifecycle smoke tests.

## AI testing
Production AI providers are forbidden as a CI dependency. Required test adapters:
- `ScriptedTutor` — emits a known sequence of speech/tool events.
- `FailureTutor` — fails at controlled points.
- `SlowTutor` — tests waiting/cancellation/interruption.
- `InvalidToolTutor` — verifies permission boundaries reject unsafe/unknown calls.

## Actor testing
Production animation timing must not make tests slow. Required substitutes:
- `InstantActor` — movement/gesture promises resolve immediately.
- `RecordingActor` — records commands for assertions.

## Browser E2E
Browser tests verify the real React ↔ Phaser integration, navigation commands, world boot, stress toggle, and later complete learning slices. Prefer stable semantic/test IDs in the React shell and explicit debug/test hooks over brittle pixel-coordinate clicking.

## Visual regression
Introduce after the production planet composition becomes intentional. World rendering must support deterministic seed/time/test mode so screenshots do not flicker because of random particles or animation phase.

## Mobile E2E
Do not make iOS/Android build time block every tiny PR initially. Add scheduled/merge-gate device workflows when Capacitor lands. Use a small critical-flow suite rather than duplicating all browser E2E.

## Performance CI
Do not use hosted-runner FPS as truth. GitHub-hosted runners enforce deterministic budgets (object counts, bundle size, asset limits, teardown/leak checks). A fixed physical Android device on a self-hosted runner becomes the trusted regression benchmark.
