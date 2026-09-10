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

## A4 — Experience Engine v1

**Status: DONE**

A4 completed D1–D5, Q, F, and P. The final stage gate is `project/gates/A4.md` with **PASS WITH FOLLOW-UP**. The platform now has a pure-TypeScript authored experience engine with deterministic graph transitions, assessment/retry/hint authority, bounded tool intents, checkpoint/restart semantics, semantic resume verification, immutable serializable state/events, authored-policy validation, and guarded step/revision host commands.

A4-Q identified four blocking gaps: public mutation bypasses, structurally valid but semantically forgeable checkpoints, caller-owned mutable authored definitions, and non-finite numeric tool parameters. A4-F closed all four and added adversarial regression evidence. Focused implementation CI `34489766907` passed format, package boundaries/typecheck, unit/integration tests, and production build on implementation head `316497cb5c7a9e2826dd0dde899b340312b59f31`.

A4-P also corrected the documentation-only final-newline failure seen on CI `34490166471`; that run otherwise passed browser stage-gate and Android debug APK.

Non-blocking A4 follow-ups:
- measure validation/runtime cost with representative authored graph/content density when A6/A15 make that evidence meaningful;
- A5 must consume A4's guarded command/tool APIs instead of recreating educational truth in tutor/provider orchestration;
- A11 persistence must keep checkpoint payloads untrusted and preserve semantic validation before restoration.

---

# Current phase plan

## A5 — Tutor/AI orchestration v1

**Status: IN PROGRESS**

**Phase outcome:** KidsLive has a provider-independent tutor orchestration layer that can consume authoritative A4 experience state/events, turn bounded tutor decisions into narration/actor behavior/approved engine requests, coordinate speech/text and interruption lifecycles, expose deterministic observability, and degrade safely under slow/failing providers without ever giving a model authority over curriculum truth, assessment, rewards, or arbitrary product state.

**Architecture constraints:**
- tutor/model providers are adapters behind framework-independent contracts; no domain rule depends on a specific vendor, SDK, prompt format, model name, or network response shape;
- A4 remains the sole educational authority: tutor orchestration may inspect state/events and submit guarded commands/tool requests, but cannot invent correctness, retries, hints, completion, progression, or permissions;
- voice, persona, tone, and presentation configuration remain replaceable and separate from actor renderer identity and curriculum definitions;
- orchestration must not own Phaser objects directly; actor effects go through `WorldActor`, while speech/text/audio use explicit adapter contracts;
- deterministic `ScriptedTutor`, failure, and slow/cancellable test doubles are required; CI must never call a live AI/TTS provider;
- A5 may define provider-neutral observability/events but must not build production analytics/backend persistence, which remain later roadmap phases;
- keep child-safety/tool authority enforceable in code boundaries rather than prompt wording alone.

### A5-D1 — Provider-neutral tutor contract + deterministic orchestration kernel end-to-end
**Status: DONE**

Build the core tutor request/response contract and orchestration state machine around authoritative A4 snapshots/events. Add deterministic scripted/fake tutor adapters, stable turn/request IDs, explicit bounded tutor outputs, cancellation/session lifecycle, and a host seam that can accept narration/actor intentions without executing educational authority itself.

**Done when:** a representative authored experience can drive multiple tutor turns through a provider-neutral orchestrator using only deterministic adapters; outputs are typed/bounded and immutable/serializable where appropriate; stale/cancelled/completed sessions fail closed; no provider SDK, Phaser object, React component, browser API, or live model is required; focused typecheck/tests/build are green.

**Evidence:** provider-neutral contracts, deterministic `TutorOrchestrator`, `ScriptedTutor`, and `RecordingTutorHost` landed across commits `25db7147`, `fa2bdf56`, `b3838c98`, and `93f789d5`; strict test-fixture typing was corrected in `81ea96dd`. CI `34501896332` passed format, package boundaries/typecheck, unit/integration tests, and production build on the implementation head. No user-visible surface changed, so delivery visual QA was not required.

### A5-D2 — Speech/text delivery + interruption and actor coordination
**Status: DONE**

Add provider-independent speech/text output contracts and coordinate them with `WorldActor` behavior so tutor turns can speak, display text intent, move/look/emote/perform bounded actor actions, and be interrupted/replaced cleanly. Include deterministic instant/slow/failure speech adapters and cancellation semantics that prevent late audio/actor completion from reviving stale turns.

**Done when:** one tutor turn can coordinate text/speech and actor intentions end-to-end; a newer turn or explicit interruption deterministically cancels superseded work; slow/failing speech and actor operations settle into known states without hanging or mutating A4 authority; persona/tone/voice configuration remains replaceable; focused deterministic checks are green, with visual QA only if a user-visible surface is actually changed.

**Evidence:** commit `4fa207a9` added bounded move/look actor cues, `TutorDeliveryCoordinator`, replaceable voice/speech/text contracts, deterministic instant/manual/failure speech adapters, orchestration-to-host interruption propagation, and integration evidence for actor/text/speech coordination, superseded slow speech, explicit actor interruption, display-only fallback, deterministic speech failure, voice-config isolation, and unchanged A4 authority. CI `34507905386` passed the focused quality job including format, package boundaries/typecheck/lint, unit/integration tests, and production build. No React/Phaser rendering/layout/navigation surface changed, so delivery visual QA was not required.

### A5-D3 — Guarded Experience Engine command/tool bridge
**Status: DONE**

Connect bounded tutor decisions to A4 through the final guarded `dispatch()` and `requestTool()` APIs. Define explicit translation/authorization boundaries so tutor outputs may propose allowed learner-facing actions or product/world effects but can never submit correctness directly, bypass step/revision guards, broaden tool permissions, or execute arbitrary backend/native work.

**Done when:** approved tutor proposals can cause legal A4 commands/tool intents through one audited bridge; unauthorized, malformed, stale, duplicate, or out-of-step proposals are rejected without authority mutation; engine rejection is observable to orchestration; tests prove a malicious/incorrect scripted tutor cannot override educational truth or undeclared permissions.

**Evidence:** commits `72753832`, `e32ed83d`, and `c44bea50` added a typed single-proposal tutor authority contract, immutable proposal snapshotting, `TutorAuthorityBridge`, `GuardedTutorOutputHost`, structured audit records, runtime malformed-input rejection, and deterministic integration/adversarial coverage. Legal outcome/assessment/hint proposals reach only A4 `dispatch()`, legal tools reach only A4 `requestTool()`, approved tool intents are not executed by the bridge, and stale/duplicate/out-of-step/undeclared/malformed proposals fail closed without authority mutation or downstream delivery. CI `34514401082` passed format, package boundaries/typecheck, unit/integration tests, and production build in the focused quality job on implementation head `c44bea50`. No React/Phaser rendering/layout/navigation surface changed, so delivery visual QA was not required. The immediately preceding D2 bookkeeping CI failure remained an unrelated pre-existing desktop actor smoke timeout; its quality and Android jobs were green.

### A5-D4 — Failure/slow-provider resilience + observable turn lifecycle
**Status: DONE**

Harden orchestration for provider timeout/failure/cancellation, malformed outputs, duplicate/late responses, speech failures, actor failures, and recoverable retries. Add provider-neutral structured lifecycle events/diagnostics with data-minimized payloads suitable for later analytics integration, plus deterministic failure/slow tutor fixtures.

**Done when:** every provider/adapter failure path reaches a bounded terminal or recoverable orchestration state with no hung promises or stale side effects; late/duplicate responses cannot mutate current turns; diagnostics identify session/turn/provider-boundary failures without storing unnecessary learner content; deterministic failure/slow tests run without network access.

**Evidence:** commits `89accb77`, `e8483873`, `6d579948`, `f1e1b121`, `84b5f49c`, `c1432a4d`, `0c70ed08`, `7c597795`, and `3979c9c3` added bounded provider/output/delivery failure results, manual provider timeouts, provider-neutral lifecycle diagnostics, deterministic `FailingTutor`/`SlowTutor`/manual-timeout fixtures, malformed-output rejection, inert late-provider output, recoverable retries, data-minimized failure records, adapter-failure containment, cancellation cleanup that survives misbehaving interruption adapters, and regression coverage preserving D3 authority-rejection observability. CI `34520437485` passed format, package boundaries/typecheck/lint, all unit/integration tests, and production build in the focused quality job on implementation head `3979c9c3`; Android production build also passed while the broader jobs were still finishing. No React/Phaser rendering/layout/navigation surface changed, so delivery visual QA was not required.

### A5-D5 — Cohesive tutor session + orchestration hardening
**Status: DONE**

Exercise the whole A5 contract in one representative deterministic tutor session over the cohesive A4 experience: authored state/event observation, scripted narration, actor coordination, speech/text delivery, guarded assessment/hint/tool proposals, interruption, provider failure/recovery, completion, and disposal. Harden ordering, replay resistance, cleanup, and configuration isolation revealed by integration evidence.

**Done when:** one deterministic end-to-end session proves the tutor makes the experience feel alive while A4 remains authoritative; uninterrupted and interrupted/recovered paths converge on valid deterministic authority; stale work after completion/disposal is inert; no live provider is needed; all A5 contracts remain provider/character/audience replaceable; focused typecheck/tests/build pass and any genuinely changed user-visible surface receives representative visual evidence.

**Evidence:** commit `3f4a3d0c` added the production-facing `TutorSession` composition root that binds observation and authority mutation to one `ExperienceEngine`, layers the guarded A4 bridge in front of speech/text/actor delivery, and snapshots timeout configuration at the integration boundary. Commit `5a3674e8` added one cohesive deterministic A4→A5 session covering narration, actor emotion/movement/action, guarded outcome/assessment/hint/tool proposals, learner interruption during speech, provider failure with same-revision recovery, answer normalization/mastery, completion while speech is pending, stale-work cancellation, disposal, audit/diagnostic evidence, and persona/voice mutation isolation. CI exposed one scheduler-sensitive microtask assumption in that new test; commit `bf5ec160` replaced it with bounded microtask flushing without weakening the semantics. CI `34525739598` passed format, lint/package boundaries/typecheck, all unit/integration tests, and production build in the focused quality job on implementation head `bf5ec160`. No React/Phaser rendering/layout/navigation surface changed, so delivery visual QA was not required.

### A5-Q — Phase QA / critique
**Status: DONE**

Run the dedicated A5 phase critique from `TESTING.md` and `STAGE_GATES.md`. Review architecture/provider isolation, educational authority, tool safety, interruption and failure resilience, observability/data minimization, persona/voice replaceability, deterministic CI, and any user-visible evidence created during A5. Record concrete blocking and non-blocking findings; do not add features.

**Evidence:** `project/qa/A5-Q.md` records the phase critique against `TESTING.md` and `STAGE_GATES.md`. Q found three blockers: explicit cancellation does not settle a never-cooperating provider promise; a throwing authority-audit sink can disrupt downstream behavior after A4 authority has already mutated; and current `main` browser evidence is red on a repeated desktop actor lifecycle timeout that must be diagnosed or stabilized before phase closure. Current CI `34525896943` has quality and Android green; its failed browser job was re-run during Q to gather additional evidence. No A5-specific visual surface changed and no live provider is used.

### A5-F — Fix / polish
**Status: NEXT**

Aggressively fix A5-Q blockers and high-value regressions, rerun focused deterministic/failure/interruption evidence and any relevant visual evidence, and keep A5 open if a real authority/safety/resilience blocker remains.

### A5-P — Close A5 + plan A6
**Status: PLANNED**

Only if A5 is genuinely ready: record `project/gates/A5.md`, mark A5 `DONE` and A6 current in `TASKS.md`, then decompose **A6 English World vertical slice** into at most five substantial end-to-end delivery sessions plus A6-Q/F/P. A6 remains a platform/product vertical slice, not full English curriculum production; the post-development curriculum phases stay deferred until the development roadmap is complete.

---

# Future phases

Do not keep detailed D1–D5 plans for distant phases here. Each phase receives its detailed five-session delivery decomposition during the P session of the immediately preceding phase.
