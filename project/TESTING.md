# Testing Strategy

## Principle
QA is a continuous phase loop, not a final cleanup step. Every roadmap phase must produce enough deterministic and visual evidence to critique the current state before the next phase begins.

The loop is:

1. Build a meaningful slice of the current phase.
2. Run deterministic automated checks.
3. Capture browser/mobile visual evidence for relevant states.
4. Critique correctness, architecture, product/learning quality, visual/UX quality, performance risk, resilience, and safety/privacy impact.
5. Fix blocking issues and rerun the evidence.
6. Record a phase gate using `STAGE_GATES.md`.
7. Advance only when the gate passes.

## PR/CI
- TypeScript typecheck/build.
- Domain/unit tests.
- Browser functional smoke coverage for the React + Phaser shell and later critical flows.
- Desktop and mobile-sized Chromium runs.
- Playwright QA evidence uploaded as GitHub Actions artifacts.
- Screenshots/traces/video retained when useful for diagnosis; a deterministic evidence test attaches the current full-page UI in each configured viewport.
- Content/schema validation once authored content exists.
- No live AI/model dependency.

## Visual QA
Visual quality is evidence-backed but not delegated to a live model inside CI.

GitHub Actions should make the current product easy to inspect by producing stable screenshots and failure diagnostics. The stage-gate critique then reviews those artifacts for clipping/overflow, responsive composition, touch ergonomics, hierarchy, readability, obvious rendering regressions, world/UI integration, and phase-specific acceptance criteria.

Once a surface is intentionally stable, add approved Playwright screenshot baselines for regression gating. Do not freeze exploratory visuals too early or update golden images merely to silence a failure; a changed baseline represents an explicit visual decision.

Important product states should eventually have named evidence fixtures so QA can reproduce loading, empty, success, error, slow-provider, offline, permission-denied, reduced-motion, and representative progression states without live services.

## Stage gates
The required transition process and critique template live in `STAGE_GATES.md`. A roadmap item does not become `DONE` merely because its code merged; its phase gate must pass or explicitly document a narrowly accepted non-blocking follow-up.

## Test doubles
Production integrations must have deterministic substitutes, including `FakeTutor`, `ScriptedTutor`, `FailureTutor`, `SlowTutor`, `FakeActor`, and `InstantActor` as those interfaces are introduced.

## Performance
CI runners do not decide FPS. Performance gates are run on representative physical Android hardware with production-density scenes/assets. Frame pacing and visual quality matter more than a single average FPS number.

CI may catch deterministic budgets and obvious regressions, but any phase that materially changes rendering density, assets, animation, React overlays, audio, or lifecycle behavior must consider whether fresh physical-device evidence is required before its stage gate passes.
