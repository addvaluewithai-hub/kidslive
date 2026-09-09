# Testing Strategy

## PR/CI
- TypeScript typecheck.
- Domain/unit tests.
- Browser smoke test for the React + Phaser shell.
- Content/schema validation once authored content exists.
- No live AI/model dependency.

## Test doubles
Production integrations must have deterministic substitutes, including `FakeTutor`, `ScriptedTutor`, `FailureTutor`, `SlowTutor`, `FakeActor`, and `InstantActor` as those interfaces are introduced.

## Performance
CI runners do not decide FPS. Performance gates are run on representative physical Android hardware with production-density scenes/assets. Frame pacing and visual quality matter more than a single average FPS number.
