# A4-Q — Experience Engine v1 phase QA / critique

**Phase:** A4 — Experience Engine v1  
**QA slot:** Q  
**Date:** 2026-09-10  
**Reviewed main:** `58a79c75c42468d4729fe433e3e17a355e06224b`  
**Latest reviewed CI:** `34476700575` — SUCCESS

## QA decision

**BLOCKING FINDINGS — proceed to A4-F; do not close A4 or begin A5 yet.**

A4 has a strong pure-TypeScript foundation and the existing deterministic suite/CI is green, but phase-level adversarial review found authority and recovery gaps that undermine claims central to A4: stale-command enforcement is bypassable through public mutation methods, checkpoint recovery does not prove that restored state/event history could actually have been produced by the authored graph, and the engine retains mutable authored-definition authority after one-time validation. These are fixable inside A4-F and should be resolved before tutor/model orchestration is allowed to consume the engine.

## Acceptance review

A4 promised a framework-independent authored experience engine that validates/runs deterministic step graphs, owns assessment truth/retries/hints, supports checkpoint/resume/restart, enforces declared tool permissions, and exposes typed immutable state/events without giving AI/rendering code educational authority.

Substantially complete:
- pure TypeScript authored graph and validator;
- deterministic graph transitions and terminal completion;
- engine-owned assessment normalization/correctness, retries, exhaustion, and hints;
- typed event/state contracts and immutable returned snapshots;
- versioned checkpoint/resume/restart contract;
- declared typed tool intents with step/revision authorization;
- cohesive fixture proving normal branching, assessment, tool, checkpoint, restart, and completion flows;
- no Phaser, React, browser, native, network, persistence-provider, or model implementation inside the experience package.

Not safe to declare phase-complete yet because the authority/recovery invariants below can be bypassed despite the happy-path suite passing.

## Deterministic evidence reviewed

Latest main CI `34476700575` completed successfully after A4-D5:
- `quality`: PASS — format, lint/package boundaries/typecheck, unit/integration tests, production build;
- `browser-stage-gate`: PASS — existing React/Phaser regression smoke/evidence;
- `android-debug-apk`: PASS — production web build, Capacitor sync, Android debug APK.

Delivery evidence already recorded in `SESSIONS.md` also shows focused green quality runs for D1–D5. No live AI/model provider is involved.

This Q session intentionally did not add product features. Static/adversarial contract review was used to identify cases the current deterministic suite does not exercise; A4-F should add regression tests while fixing them.

## Visual / UX evidence

A4 changed no React, Phaser, rendering, layout, navigation, asset, animation, or audio surface. New A4-specific screenshot/visual QA is therefore not required. The latest browser-stage-gate remains useful regression evidence for the existing product shell and is green.

No fresh physical Android frame-pacing evidence is required for A4 because the phase did not materially change rendering density, assets, effects, overlays, lifecycle, or audio.

## Architecture critique

### What is strong
- Experience definitions and engine logic remain inside `src/core/experience` and align with D-003.
- The engine produces bounded tool intents rather than executing Phaser/backend/model effects itself, aligning with D-004.
- Assessment truth is computed inside the deterministic engine instead of accepted from the host.
- The cohesive fixture remains audience/character/provider independent.
- CI remains deterministic and provider-free, aligning with D-005.

### Blocking architecture findings

#### B1 — Public direct mutators bypass the D5 authority-token/stale-command boundary

`dispatch(command)` checks `stepId` and `expectedRevision`, but `submitOutcome(outcomeId)`, `submitAssessment(answer)`, and `useHint(hintId)` are also public and mutate authoritative state directly without an authority token. Existing tests still call these direct methods extensively.

Impact:
- a delayed/replayed host/tutor operation can bypass the stale-command protection simply by calling the direct public method;
- future A5 integration has two mutation APIs, one safe and one weaker, which undermines the claim that host-facing educational mutations are revision guarded;
- duplicate/reordered commands are not prevented by the engine contract itself.

A4-F should expose one guarded mutation path. Internal helpers may remain private; tests/fixtures should use the same public guarded API that A5 will consume.

#### B2 — Checkpoint validation is structurally strict but not semantically replay-safe

`parseExperienceCheckpoint()` validates shapes, identity/version, authored step IDs, some assessment record constraints, and monotonic event revisions. It does **not** establish that the supplied state and event history are mutually consistent or that they could have been produced by legal execution of the authored graph.

A forged checkpoint can, for example, provide a `running` state at any authored step with a high revision while retaining only the valid revision-0 `experience-started` event. The current checks accept a valid current step and merely require event revisions to be nondecreasing and no greater than state revision. That can skip required assessment/branch authority on resume.

Related semantic gaps include no full proof that:
- current step follows from the event transition path;
- final state revision equals the authoritative event progression rather than merely being an upper bound;
- assessment records/results/correct flags match the authored normalization, attempt history, hint policy, and assessment events;
- tool-intent events reference a tool allowed by the relevant authored step with valid parameters;
- completion/transition events form a legal single run rather than a syntactically valid fabricated history.

Impact: persisted or corrupted data can restore educational truth the engine itself never authorized. This directly violates A4's fail-closed checkpoint/recovery outcome and must be fixed before A11 persistence or A5 orchestration relies on resume.

A4-F should either deterministically replay/verify checkpoint history against the authored definition to derive/compare authority, or enforce equivalent complete semantic invariants. Add adversarial checkpoints proving illegal step skipping, fabricated mastery, revision gaps, invalid hint/tool history, and inconsistent completion are rejected without partial application.

#### B3 — Authored definition authority remains externally mutable after validation

`ExperienceEngine.start()` validates the supplied `ExperienceDefinition` once, then the engine retains that same object and maps values from its mutable-at-runtime arrays/objects. TypeScript `readonly` is compile-time only; callers can legitimately own a mutable object that is structurally assignable to the readonly interface, or mutate through another reference. `currentStep` also returns the authored step object directly.

Impact:
- transitions, assessment policy, accepted answers, max attempts, hints, and tool declarations/permissions may change after validation;
- validation can therefore be invalidated during a run without another preflight check;
- checkpoint compatibility keyed only by `id/version` assumes authored content for that version is stable, which this runtime ownership does not enforce.

A4-F should take an engine-owned deep immutable snapshot (or equivalent defensive canonicalization) at start/resume and avoid exposing mutable internal definition references. Add evidence that mutation of the caller's original definition after engine creation cannot change the active run.

#### B4 — Tool `number` parameters accept non-finite values despite the JSON-safe contract

Runtime tool parameter validation checks only `typeof value === 'number'`. `NaN`, `Infinity`, and `-Infinity` therefore pass. They are not safely JSON round-trippable (`JSON.stringify` converts them to `null`), after which checkpoint parsing rejects the result.

Impact: an engine-approved tool intent/event can violate A4's JSON-safe/checkpoint round-trip guarantee and poison later persistence or host execution.

A4-F should require finite numbers (`Number.isFinite`) and add round-trip/rejection evidence for non-finite values.

## Product / learning critique

The engine now meaningfully encodes educational authority instead of being generic workflow machinery: assessment correctness, retry/exhaustion, hint timing, and branching are deterministic and authored. The cohesive fixture gives A5 a useful contract to narrate rather than own.

However B1–B3 are product/learning correctness blockers because they provide alternate paths to fabricated mastery or skipped assessment outside the intended authored flow. They must be fixed before tutor behavior is layered on top; otherwise A5 could accidentally normalize an unsafe integration pattern.

## Resilience critique

Strong:
- malformed basic checkpoint shapes/versions/ids fail closed;
- invalid/unknown/denied runtime operations generally avoid partial mutation;
- restart/resume happy paths are deterministic;
- terminal operations are rejected.

Blocking:
- semantic checkpoint corruption/fabrication is not fail-closed enough (B2);
- non-finite tool numbers break serialization assumptions (B4).

## Performance critique

A4 is pure domain logic and introduces no material renderer/device workload. No physical FPS rerun is warranted. Graph validation and checkpoint parsing are currently straightforward in-memory operations; no evidence suggests a performance blocker at present.

Non-blocking future consideration: if authored curricula later produce very large graphs/history, benchmark validation/checkpoint replay size before optimizing. Do not pre-optimize in A4-F unless the correctness fix exposes a concrete issue.

## Safety / privacy critique

Positive:
- AI/model code has no direct authority in A4;
- approved tools are declared and step-scoped;
- the engine executes no backend/native/model effects;
- no child personal data or provider data was introduced.

Blocking safety implication:
- B1/B2 weaken the permission/authority boundary a future tutor will depend on. They are correctness/safety architecture issues even though no live model is present yet.

No new privacy/data-minimization blocker was found in A4 itself.

## Findings

### Blocking
1. **B1:** remove or guard public direct educational mutators so all external state changes require step/revision authority.
2. **B2:** make checkpoint resume semantically verify legal authored execution/state, not only structural shape and monotonic revisions.
3. **B3:** snapshot/freeze authored definitions so post-validation caller mutation cannot change active engine authority.
4. **B4:** reject non-finite numeric tool parameters to preserve JSON-safe intent/event/checkpoint guarantees.

### Non-blocking follow-ups
1. Keep large-graph/event-history performance measurement for representative authored content rather than optimizing speculatively.
2. A5 should consume only the final guarded A4 public command/tool API; do not create tutor-specific authority shortcuts.
3. A11 persistence should treat checkpoints as validated untrusted input and preserve the semantic validation added in A4-F.

## A4-F required evidence

A4-F should fix the blockers above and rerun focused deterministic evidence, at minimum:
- package boundaries/typecheck/lint;
- experience unit/integration tests;
- production build;
- adversarial stale/replay tests proving no unguarded mutation path remains;
- caller-definition mutation tests;
- adversarial checkpoint tests for skipped steps, fabricated assessment mastery/hints/tools, revision/event inconsistency, and illegal completion;
- non-finite tool parameter rejection plus JSON round-trip evidence.

No A5 tutor/provider features should be added in F. If any authority or checkpoint semantic blocker remains after serious fixing, keep A4 open as an explicit exception rather than advancing to P.
