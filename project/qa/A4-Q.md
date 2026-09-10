# A4-Q — Experience Engine v1 phase QA / critique

**Phase:** A4 — Experience Engine v1
**QA slot:** Q
**Date:** 2026-09-10
**Reviewed main:** `58a79c75c42468d4729fe433e3e17a355e06224b`
**Latest reviewed CI:** `34476700575` — SUCCESS

## QA decision

**BLOCKING FINDINGS — proceed to A4-F; do not close A4 or begin A5 yet.**

A4 has a strong pure-TypeScript foundation and the deterministic suite was green, but adversarial phase review found four authority/recovery gaps that must be resolved before tutor/model orchestration consumes the engine.

## Evidence reviewed

- A4-D1 through A4-D5 delivery evidence recorded in `project/SESSIONS.md`.
- Main CI `34476700575`: quality PASS, browser stage-gate PASS, Android debug APK PASS.
- No live AI/model provider is involved in CI.
- A4 changed no React/Phaser/rendering/layout/navigation/audio surface, so no A4-specific visual or physical-device evidence was required.

## Architecture/product assessment

Strengths retained by the phase:
- experience definitions and authority remain pure TypeScript;
- assessment truth, retries, hints, graph transitions, and completion are deterministic;
- tools are represented as bounded approved intents rather than direct renderer/backend/model execution;
- checkpoints are provider/storage independent;
- representative fixtures are audience-, character-, renderer-, and provider-independent.

## Blocking findings

### B1 — Direct public educational mutators bypass stale-command authority

`dispatch(command)` checks active `stepId` and `expectedRevision`, while the public `submitOutcome`, `submitAssessment`, and `useHint` methods mutate the same authority without those guards. A delayed/replayed host action could therefore bypass D5's revision protection.

**A4-F requirement:** expose one guarded public educational mutation path and make outcome/assessment/hint helpers internal only. Regression evidence must replay stale commands and prove no state/event mutation.

### B2 — Checkpoint validation is structural, not semantically replay-safe

Checkpoint parsing validates shape, identity/version, authored IDs, basic assessment constraints, and monotonic revisions, but does not prove that state and event history could actually have been produced by legal authored execution. A fabricated checkpoint can skip graph/mastery authority while still looking structurally valid.

**A4-F requirement:** reconstruct/verify checkpoint authority against the authored graph before resume. Validate exact revision progression, current step/completion, assessment attempts/correctness/results/hints, transition ordering, tool permissions/parameters, and reject fabricated or skipped authority before constructing a resumed engine.

### B3 — Caller mutation can change an active validated definition

The engine validates the supplied definition once and then retains caller-owned nested references. TypeScript `readonly` does not provide runtime immutability, so later caller mutation can alter transitions, accepted answers, hints, or tool permissions after validation.

**A4-F requirement:** defensively snapshot/freeze the complete authored definition before validation/execution/resume and use only that owned snapshot for runtime authority.

### B4 — Numeric tool parameters accept non-finite values

Tool parameter validation checks `typeof value === 'number'`, which accepts `NaN` and infinities. Those values are not JSON-safe and can silently serialize as `null`, contradicting the approved-intent/checkpoint serialization contract.

**A4-F requirement:** reject all non-finite numeric tool parameters without state/event mutation, including untrusted checkpoint histories.

## Non-blocking follow-ups

- Measure large authored-graph/content performance when representative A6/A15 content density exists rather than inventing a synthetic A4 performance gate.
- A5 must consume only the final guarded A4 authority API; tutor/provider code must never recreate educational truth.
- A11 persistence must continue treating checkpoint payloads as untrusted input and preserve semantic validation before restoration.

## Exit criteria for A4-F

A4 can proceed to P only when all four blockers above are fixed with deterministic adversarial regression coverage, focused package-boundary/typecheck/lint/tests/build evidence is green, and no new authority or recovery blocker is discovered. Otherwise A4 remains open as an explicit exception.
