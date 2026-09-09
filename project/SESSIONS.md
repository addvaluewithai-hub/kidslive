# Session Delivery Model

This file defines how autonomous development sessions turn roadmap phases into meaningful delivery outcomes.

The roadmap in `TASKS.md` defines **what phase we are in**. This file defines **what one working session should try to finish**.

## Core rule

A normal session should aim to complete one meaningful capability end-to-end, not one file, one interface, one test, or one commit.

**Prefer one substantial outcome over several micro-tasks.** Multiple commits are normal inside one session. A session should keep working on the same objective until one of these is true:

1. the objective is complete and the relevant lightweight checks pass;
2. a genuine external/technical blocker prevents further useful progress; or
3. substantial progress has been made and the remaining work has a clear, durable handoff that cannot reasonably be completed in the current run.

Do not stop merely because one safe commit landed.

## Session size

The default target is deliberately larger than a micro-slice. A good session usually changes enough of the system to create a capability that can be exercised or meaningfully verified.

Good session outcomes:
- a complete navigation flow;
- a renderer/runtime subsystem wired end-to-end;
- one authored interaction working through domain + presentation boundaries;
- one persistence/reward capability with its deterministic tests;
- one representative product state that can be opened and used.

Usually too small to consume a session by themselves:
- a single type/interface;
- renaming or formatting;
- one config flag;
- one isolated adapter with no current consumer;
- one visual tweak;
- adding tests for already-working behavior without a discovered regression;
- QA infrastructure that does not protect current product behavior.

Small fixes should normally be folded into the active session objective.

## Execution loop

1. Read `README.md`, `TASKS.md`, this file, and the relevant architecture/decision docs.
2. Identify the first unfinished session target inside the current `NEXT`/`IN PROGRESS` phase.
3. State a concrete success condition internally: **"By the end of this session, X works from start to finish."**
4. Implement the whole coherent outcome. Use as many files and commits as needed.
5. Run lightweight checks relevant to the change: normally typecheck, affected unit/integration tests, and build.
6. Run visual QA only when user-visible React/Phaser/rendering/layout changed.
7. Fix issues discovered by those checks while they are part of the same objective.
8. Update the target status only when its success condition is actually satisfied.
9. Perform the full `STAGE_GATES.md` process only when the roadmap phase itself is close to completion.

Ordinary sessions should optimize roughly for **80% building / 20% checking**. QA protects delivery; it is not the primary deliverable.

## A2 — Planet Hub foundation

### A2-S1 — Spatial hub + selection/navigation foundation
**Status: DONE**

**Outcome:** the user sees a responsive spatial hub with six authored places and can select/focus a place and return to overview.

Includes the current spatial composition, place selection, camera focus/navigation, responsive mobile/desktop layout, and overview behavior.

### A2-S2 — Enter/exit a place end-to-end
**Status: NEXT**

**Outcome:** from the Planet Hub, the user can choose a place, enter a real placeholder place scene through an intentional transition, then return to the hub with expected hub state preserved.

**Done when:**
- hub selection exposes a clear enter action or direct enter interaction;
- a reusable place-scene contract exists rather than a one-off English-only hack;
- at least one authored placeholder place opens as its own Phaser scene/state;
- transition in/out is coherent on touch and desktop;
- returning restores the expected hub selection/camera state or deliberately resets it according to a documented rule;
- scene lifecycle does not accumulate duplicate listeners/display objects across repeated enter/return cycles;
- relevant unit/build/browser checks pass, with visual review because this changes the user-visible flow.

### A2-S3 — Asset lifecycle + loading path
**Status: PLANNED**

**Outcome:** the hub/place flow has a real, reusable asset-loading policy rather than relying only on inline primitive graphics.

**Done when:**
- one representative asset pack/manifest is loaded through a reusable path;
- loading/ready/error behavior is explicit enough for future authored worlds;
- repeated scene entry does not blindly reload or leak resources;
- ownership of persistent vs scene-local assets is documented in code or architecture notes;
- the place still works deterministically without live services.

### A2-S4 — Developer visibility + bounded runtime behavior
**Status: PLANNED**

**Outcome:** A2 can be debugged and exercised without guessing, while production behavior remains bounded.

**Done when:**
- a development-only debug overlay or equivalent can expose useful hub facts such as scene/camera/selection/object or asset state;
- it is absent or safely disabled in normal production presentation;
- resize/orientation/re-entry paths do not create obvious duplicate objects/listeners;
- touch targets and camera behavior are usable on the representative mobile viewport;
- obvious unbounded update/allocation patterns are removed.

### A2-S5 — Hub completion + A2 stage gate
**Status: PLANNED**

**Outcome:** Planet Hub foundation is cohesive enough that A3 can add the companion without needing to rewrite hub fundamentals.

**Done when:**
- S1–S4 are complete;
- six authored place placeholders remain responsive and navigable;
- enter/return + loading/lifecycle paths are stable;
- lightweight Android/browser evidence is representative;
- the full A2 stage gate is recorded as PASS or PASS WITH FOLLOW-UP.

## A3 — Character/actor system

Define detailed session targets when A3 becomes current. The intended session-sized sequence is:

1. **Actor contract + first production actor end-to-end** — `WorldActor` backed by a real `PhaserActor`, visible in the hub, with deterministic fake actor coverage.
2. **Movement/look/emotion behavior** — anchors/targets, movement and orientation, replaceable character definition, no Nova-specific domain assumptions.
3. **Speech/action orchestration surface** — actor can perform bounded speak/action sequences using fake/scripted adapters, with interruption/cleanup behavior.
4. **Hub integration + A3 gate** — companion survives hub navigation/scene lifecycle cleanly and A3 passes its phase gate.

## A4 — Experience Engine v1

Intended session-sized sequence:

1. **Executable authored step graph** — load a small authored experience and deterministically advance through steps/events.
2. **Assessment/retry/hint state machine** — correct/incorrect/retry/hint behavior with pure TypeScript tests.
3. **Checkpoint/resume + tool permissions** — deterministic resume and bounded tool requests.
4. **Content validation + runtime integration** — invalid experiences fail clearly; one experience drives a real Phaser flow.
5. **A4 gate**.

## A5 — Tutor/AI orchestration v1

Intended session-sized sequence:

1. **Tutor contract + scripted tutor end-to-end** — one experience can request tutor behavior without a live provider.
2. **Failure/slow/interruption behavior** — deterministic failure and delayed adapters, cancellation/interruption semantics.
3. **Speech/text + bounded tools** — tutor outputs can drive approved speech/action/tool commands but never curriculum truth or rewards.
4. **Observability + A5 gate** — useful event trail and phase-level QA without live-model CI dependency.

## A6 — English World vertical slice

A6 sessions should be especially outcome-oriented and may legitimately span many files/commits:

1. **Enter English World + authored opening**.
2. **Complete learning interaction loop** — context → instruction → user interaction → deterministic assessment → feedback.
3. **Tutor/actor embodiment** — companion participates physically/verbally using A3/A5 contracts.
4. **Reward + persistent visible change + return to hub**.
5. **Vertical-slice polish/resilience + A6 gate**.

## Future phases

When a later phase becomes `NEXT`, define 3–6 similarly substantial session targets before doing implementation. Do not pre-plan distant phases into tiny tasks now; their best decomposition should use evidence from the completed vertical slice.
