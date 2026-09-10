# Session Delivery Model

This file defines how autonomous development sessions turn roadmap phases into substantial delivery outcomes.

`TASKS.md` defines **what phase we are in**. This file defines **how that phase is executed session by session**.

## Eight-session phase cadence

Every roadmap phase uses a standard **8-session budget**:

1. **D1 — Delivery 1**
2. **D2 — Delivery 2**
3. **D3 — Delivery 3**
4. **D4 — Delivery 4**
5. **D5 — Delivery 5**
6. **Q — QA / critique**
7. **F — Fix / polish**
8. **P — Plan the next phase**

The first five are the maximum implementation budget. They must be large coherent outcomes, not micro-tasks. If implementation finishes early, move directly to Q. Do not silently invent D6 because earlier delivery sessions were undersized.

The only reason to exceed the normal cadence is a real blocking defect, external dependency, or failed phase gate that would make advancing dishonest or unsafe.

## Delivery-session rule

A D session should complete one meaningful capability end-to-end, not one file, interface, test, tweak, or commit. Multiple files and commits are normal. Keep working until the objective is complete, a genuine blocker prevents useful work, or the remaining work truly cannot reasonably be completed in the run.

Small fixes belong inside the active objective. Ordinary delivery should optimize roughly for **80% building / 20% checking**.

## Q — QA / critique

Use `TESTING.md` and `STAGE_GATES.md` to evaluate the whole phase. Run relevant deterministic checks, inspect representative visual evidence when applicable, and critique architecture, product/learning quality, UX, resilience, performance risk, safety/privacy boundaries, and regression risk. Record blocking vs non-blocking findings. Q evaluates; it does not become another feature session.

## F — Fix / polish

Fix Q blockers and high-value regressions/polish aggressively, rerun focused evidence, and leave the phase genuinely safe to close. Do not add unrelated features. If blockers remain, record the exception and do not advance merely to preserve the session count.

## P — Close + plan next phase

Only after the current phase is genuinely ready to close: record the gate, update `TASKS.md`, make the next phase current, divide it into at most five substantial D sessions with concrete done-when criteria, then append Q/F/P. Detailed planning belongs in the P session immediately before a phase starts.

## Hourly execution loop

1. Read `README.md`, `TASKS.md`, this file, and relevant architecture/decision docs.
2. Identify the current phase and first unfinished session slot.
3. Execute that slot according to D/Q/F/P semantics.
4. Preserve deterministic CI and never require a live AI/model provider.
5. Update this file only when the active slot is genuinely complete.

---

# Completed phases

## A2 — Planet Hub foundation

**Status: DONE**

A2 completed D1–D5, Q, F, and P. The final stage gate is `project/gates/A2.md` with **PASS WITH FOLLOW-UP**. The Planet Hub provides stable scene/catalog/navigation/asset lifecycle foundations.

Non-blocking A2 follow-ups:
- revisit bundle startup/code-splitting only when evidence shows a real loading problem;
- refresh physical Android frame pacing once actor/vertical-slice rendering density is representative;
- strengthen transition synchronization only if real CI flakiness appears.

## A3 — Character/actor system

**Status: DONE**

A3 completed D1–D5, Q, F, and P. The final stage gate is `project/gates/A3.md` with **PASS WITH FOLLOW-UP**. The runtime has a renderer-independent `WorldActor`, deterministic `FakeActor`, configurable character identity/assets, production `PhaserActor`, bounded movement/look/emotion/action/speech behavior, interruption/disposal semantics, and stable active-scene ownership across Hub → Place → Hub.

A3-Q blockers around nondeterministic resize/re-entry evidence and missing direct companion-art failure coverage were resolved in A3-F. Final implementation CI `34450624817` and closure baseline `34451067873` passed.

Non-blocking A3 follow-ups:
- profile/code-split only if measured loading evidence shows a real problem;
- refresh physical Android frame pacing at representative A6 density;
- keep A5 voice/tone/persona replaceable outside renderer semantics;
- keep runtime debug UI development-only.

---

# Current phase plan

## A4 — Experience Engine v1

**Status: IN PROGRESS**

**Phase outcome:** KidsLive has a framework-independent authored experience engine that can validate and run deterministic step graphs, process bounded learner inputs and assessment transitions, apply retries/hints, checkpoint and resume safely, enforce declared tool permissions, and expose typed state/events suitable for later tutor/world hosts without giving AI or rendering code authority over educational truth.

**Architecture constraints:**
- all experience definitions, validation, transition logic, assessment truth, retries, hints, checkpoints, and permissions live in pure TypeScript with no Phaser, React, browser, native, network, persistence-provider, or model imports;
- experience definitions describe educational intent and bounded product effects, not Nova-specific dialogue, Phaser coordinates, visual skins, or provider prompts;
- the engine is authoritative for allowed transitions and assessment outcomes; future A5 tutor code may request or narrate actions but cannot bypass engine state/permissions;
- no live AI/TTS/model provider is required for implementation or CI;
- persistence in A4 is a serializable checkpoint/resume contract and deterministic test storage only; production backend/sync remains A11;
- A4 should consume existing typed-event/actor seams only through framework-independent contracts where useful, without moving Phaser lifecycle into domain code.

### A4-D1 — Authored definition contract + deterministic graph runner end-to-end
**Status: DONE**

**Outcome delivered:** added the foundational pure-TypeScript Experience Engine contract, structural validator, authoritative deterministic graph runner, typed commands/events, immutable serializable state snapshots, and a representative branching authored fixture.

**Implementation/evidence notes:**
- `ExperienceDefinition` defines stable experience/version/step/outcome ids, instruction/activity steps, explicit authored transitions, typed commands, state, and engine events;
- preflight validation catches empty identity/version, empty graphs, duplicate step ids/outcomes, missing initial steps, invalid transition targets, and unreachable authored steps with deterministic path/id-oriented diagnostics;
- `ExperienceEngine.start()` refuses invalid definitions before execution; legal outcomes deterministically transition or complete, while unknown outcomes and terminal commands reject without mutating state/event history;
- state/event getters return frozen copies so callers can inspect/serialize engine truth without receiving mutable authority;
- representative fixture proves both direct and practice-loop branches through explicit completion;
- tests cover valid branching, duplicate ids, bad references, duplicate outcomes, unreachable steps, missing initial state, illegal outcomes, terminal behavior, ordered events, and immutable/JSON-serializable snapshots;
- focused CI evidence: run `34454645616` quality job passed format, package-boundary/typecheck lint, all unit tests, and production build on implementation head `0d6f278df044529669cade4e438b8ad9e619784d`;
- no user-visible React/Phaser surface changed, so delivery visual QA was intentionally not added.

### A4-D2 — Assessment transitions, retries, hints + mastery-safe state
**Status: DONE**

**Outcome delivered:** added engine-owned assessment steps and deterministic learner submission semantics end-to-end: authored normalization/correct-answer policy, bounded attempts, retry-vs-exhaustion behavior, authored hint availability, persistent assessment history, typed events, and success/failure graph branching without exposing educational authority to renderer or tutor code.

**Implementation/evidence notes:**
- `ExperienceDefinition` now distinguishes assessment steps and declares accepted answers, deterministic normalization, maximum attempts, correct/exhausted outcome ids, and authored hints with availability thresholds;
- assessment commands are separate from ordinary authored outcomes, so callers cannot submit `correct`/`exhausted` directly to bypass engine evaluation;
- submissions normalize and evaluate inside `ExperienceEngine`, append immutable attempt history, remain on-step while retries are available, and transition only on authoritative correctness or attempt exhaustion;
- assessment state persists per step with attempts, used hints, and the current mastery-relevant result (`retrying`, `correct`, or `exhausted`), and nested snapshots/events are frozen and JSON-serializable for A4-D3;
- hints are engine-authorized: unknown, premature, duplicate, post-resolution, and non-assessment hint requests reject without mutating state or event history; successful hint use is recorded and subsequent attempts capture which hints were used;
- validation now rejects essential unsafe assessment definitions such as no accepted answers, non-positive attempt limits, missing configured assessment outcomes, duplicate hint ids, and impossible hint availability values; broader graph/policy validation remains in A4-D4;
- representative fixture/tests cover immediate normalized success, retry-to-success, three-attempt exhaustion, hint-assisted success, direct-outcome bypass attempts, unknown/premature/duplicate hints, empty submissions, nested immutability, and malformed assessment policy;
- focused CI evidence: run `34460581636` quality job passed style, package-boundary/typecheck lint, all unit tests, and production build on implementation head `a9dcda56e11dbfe1750e8abfaba0ad6ed2a2039e`;
- no React/Phaser/rendering/navigation surface changed, so delivery visual QA was intentionally not run.

### A4-D3 — Checkpoints, resume, restart + version-safe recovery
**Status: NEXT**

Deliver resumability end-to-end: define checkpoint snapshots containing only authoritative engine state, deterministic serialization/restoration, restart semantics, safe handling of completed experiences, and explicit rejection/recovery behavior for malformed, mismatched-experience, or incompatible-version snapshots. Use deterministic in-memory test storage only; do not implement A11 backend sync.

**Done when:**
- a representative multi-step/assessment experience can checkpoint mid-flow, recreate the engine, resume at the exact authoritative state, and continue to the same deterministic result as uninterrupted execution;
- attempts, hints, current step, completion state, and relevant event/order semantics survive resume without duplication;
- restart intentionally clears run state according to a documented contract;
- corrupt/mismatched/incompatible checkpoints fail safely with typed errors or explicit recovery results rather than partially applying state;
- focused tests/typecheck/build pass.

### A4-D4 — Tool permissions + authored content validation boundary
**Status: PLANNED**

Add bounded tool/effect declarations and permission enforcement as an engine-level authority seam for later A5/A6 hosts. Definitions declare which educational/product effects a step may request; runtime requests are validated against the active step/state and emitted as typed approved intents rather than executing renderer/backend/model work directly. Expand content validation to catch contradictory policies, invalid assessment/hint/retry configuration, impossible completion paths, and undeclared tool references.

**Done when:**
- unauthorized or out-of-state tool/effect requests are deterministically rejected and cannot mutate engine truth;
- approved requests produce typed intents/events suitable for a future host adapter without importing Phaser/model/backend code;
- validation reports actionable path/id-specific diagnostics for malformed policy, assessment, transition, and tool declarations;
- tests include allowed/denied tool requests, stale-step requests, malformed declarations, and graph/policy combinations that cannot complete safely;
- focused tests/typecheck/build pass and CI remains provider-free.

### A4-D5 — Cohesive representative experience + engine hardening
**Status: PLANNED**

Exercise the full A4 engine coherently with one representative authored experience fixture that combines branching, deterministic assessment, retry, hint use, approved/denied tool intents, checkpoint/resume, restart, completion, and event/state inspection. Harden command ordering, stale/duplicate submissions, terminal-state behavior, immutability boundaries, and deterministic replay-equivalence where applicable. Keep this as engine integration evidence, not an A6 visual lesson.

**Done when:**
- one end-to-end fixture proves the complete A4 contract from validation/start through assessment/retry/hint/tool intent/checkpoint/resume to deterministic completion;
- duplicate/stale/terminal commands cannot double-apply attempts, hints, transitions, or completion;
- resumed execution is equivalent to uninterrupted execution for authoritative state/outcome under the documented contract;
- public engine APIs remain framework/provider/audience/character agnostic and are ready for A5 tutor orchestration and A6 world hosting;
- focused unit/integration/typecheck/build evidence is green; add browser/visual evidence only if A4 integration intentionally changes an existing user-visible surface.

### A4-Q — Phase QA / critique
**Status: PLANNED**

Perform the dedicated A4 phase-level critique from `TESTING.md` and `STAGE_GATES.md`. Review deterministic correctness, graph/content validation, assessment authority, retry/hint semantics, checkpoint/resume resilience, tool-permission enforcement, API immutability, architecture boundaries, safety implications, and readiness for A5. Record concrete blocking and non-blocking findings; do not add A5 tutor features.

### A4-F — Fix / polish
**Status: PLANNED**

Aggressively fix A4-Q blockers and directly related regressions/polish, then rerun focused deterministic evidence. Do not add unrelated A5/A6 scope. If an engine-authority, validation, resume, or permission blocker remains, record the exception and keep A4 open.

### A4-P — Close A4 + plan A5
**Status: PLANNED**

Only if A4 is genuinely ready: record `project/gates/A4.md`, mark A4 `DONE` and A5 current in `TASKS.md`, then decompose **A5 Tutor/AI orchestration v1** into at most five substantial end-to-end D sessions plus A5-Q/F/P. Preserve the post-development curriculum phases in `TASKS.md` without pulling curriculum production into current development.

---

# Future phases

Do not keep detailed D1–D5 plans for distant phases here. Each phase receives its detailed five-session delivery decomposition during the P session of the immediately preceding phase.
