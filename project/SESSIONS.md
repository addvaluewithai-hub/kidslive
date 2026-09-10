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
**Status: DONE**

**Outcome delivered:** added a versioned, framework-independent checkpoint contract with deterministic JSON round-tripping, exact state/event-history restoration, restart semantics, completed-run restoration, and fail-closed validation for malformed, mismatched, incompatible, or impossible snapshots.

**Implementation/evidence notes:**
- `ExperienceCheckpoint` is an explicit format-versioned envelope containing experience identity/version plus immutable authoritative engine state and ordered run events; no backend/provider/storage implementation was introduced;
- `ExperienceEngine.checkpoint()` emits JSON-safe frozen snapshots, and `ExperienceEngine.resume()` validates the authored definition and the entire checkpoint before constructing restored authority;
- resume restores current step, revision, assessment attempts/results, consumed hints, completion state, and prior ordered events without replaying or duplicating historical events;
- checkpoint parsing rejects malformed fields/events, unsupported checkpoint format versions, mismatched experience ids, incompatible authored versions, unknown current steps, duplicate/invalid assessment state, undeclared hints, non-sequential attempts, impossible attempt counts, and inconsistent event revisions/status;
- `restart()` deliberately resets the same engine to the authored initial step with revision 0, empty assessment/hint state, and one fresh `experience-started` event, discarding the previous run history by contract;
- integration tests serialize through JSON as deterministic in-memory storage evidence, recreate the engine mid-assessment after an incorrect attempt + hint, continue both resumed and uninterrupted runs, and prove identical final state/events; completed checkpoints and invalid recovery paths are also covered;
- the first test commit exposed a test-only error-code inference failure; it was corrected without weakening assertions;
- focused CI evidence: run `34465429623` quality job passed format, package-boundary/typecheck lint, unit tests, and production build on implementation head `0a5ceeebaa62e14e3f00d9aa4f719172d4fc4548`;
- no React/Phaser/rendering/navigation surface changed, so delivery visual QA was intentionally not run.

### A4-D4 — Tool permissions + authored content validation boundary
**Status: DONE**

**Outcome delivered:** added a bounded engine-owned tool/effect authority seam for later A5/A6 hosts plus stronger authored-policy validation. Experiences can declare typed world/product effects and parameter contracts; individual steps explicitly allow a subset; runtime requests are checked against active step identity and engine revision before producing immutable approved intents. The engine still executes no renderer, backend, native, or model work.

**Implementation/evidence notes:**
- `ExperienceDefinition` now supports framework-independent tool declarations with stable ids, `world-effect`/`product-effect` kinds, typed primitive parameter declarations, and per-step `allowedToolIds`;
- `ExperienceEngine.requestTool()` requires the request's step id and expected revision to match current authority, rejects unknown/unauthorized/stale requests and missing/unknown/wrong-type parameters without state/event mutation, and returns an immutable `ExperienceToolIntent` only after authorization;
- approved intent issuance advances engine revision as authority bookkeeping and appends a typed `tool-intent-approved` event, while leaving educational step/assessment truth unchanged; the host remains responsible for executing or presenting the approved effect;
- approved tool events are JSON-safe and checkpoint/resume parsing preserves them, so a future host can reconstruct authoritative intent history without provider-specific state;
- validation now reports duplicate/invalid tool declarations, duplicate parameters, undeclared/duplicate step permissions, contradictory assessment result outcomes, empty/duplicate normalized accepted answers, and reachable graph regions with no path to completion using step/tool/parameter ids where relevant;
- focused tests cover allowed typed intents, denied/unknown tools, malformed parameters, stale revision and stale-step requests, checkpoint round-trip, malformed tool declarations, impossible completion cycles, and contradictory assessment policy;
- focused CI evidence: run `34471085528` quality job passed format, package-boundary/typecheck lint, all unit tests, and production build on implementation head `fbbaeaadc961b2033e520d8c0f7940549d7bf929`;
- no React/Phaser/rendering/navigation surface changed, so delivery visual QA was intentionally not run.

### A4-D5 — Cohesive representative experience + engine hardening
**Status: DONE**

**Outcome delivered:** hardened the host-facing command path against delayed/duplicate educational mutations and added one cohesive representative A4 fixture/test flow that exercises graph branching, approved/denied tools, assessment retry, hint use, checkpoint/resume, deterministic continuation, restart, completion, terminal rejection, and immutable inspection as one engine contract.

**Implementation/evidence notes:**
- every host-facing `ExperienceCommand` now carries active `stepId` plus `expectedRevision`; `dispatch()` verifies both against current authority before any mutation and rejects stale/delayed/replayed commands with `stale-command` without changing state or event history;
- tool requests retain the equivalent step/revision guard, so duplicate approved effects and delayed tool intents fail closed just like educational commands;
- `COHESIVE_A4_EXPERIENCE_FIXTURE` combines a real practice/direct branch, a typed world effect, a three-attempt normalized assessment with hint policy, success/review branches, and a success-only product effect without introducing renderer, tutor, provider, or audience-specific details;
- integration evidence deliberately replays the same assessment command, hint command, and tool request and proves they cannot double-apply; unauthorized tool requests also leave authority unchanged;
- a JSON checkpoint is taken after incorrect attempt + hint, resumed into a new engine, then completed; final authoritative state and ordered events are exactly equal to an uninterrupted execution of the same accepted command/effect sequence;
- restart discards prior attempts/hints/tool history/revision and proves a clean alternate direct branch can complete from revision zero; a pre-restart command is stale against the new run;
- completed experiences reject terminal commands without adding a second completion event, while state/events/tool parameters/checkpoints remain frozen and JSON-safe for future A5/A6 hosts;
- focused CI evidence: run `34476462578` quality job passed format, package-boundary/typecheck lint, all unit tests, and production build on implementation head `10af0bbb1de036c5fec439d028daf96bfae80dde`;
- no React/Phaser/rendering/navigation surface changed, so delivery visual QA was intentionally not run.

### A4-Q — Phase QA / critique
**Status: NEXT**

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
