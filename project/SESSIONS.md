# Session Delivery Model

This file defines how autonomous development sessions turn roadmap phases into substantial delivery outcomes.

`TASKS.md` defines **what phase we are in**. This file defines **how that phase is executed session by session**.

## Eight-session phase cadence

Every roadmap phase is run with a standard **8-session budget**:

1. **D1 — Delivery 1**
2. **D2 — Delivery 2**
3. **D3 — Delivery 3**
4. **D4 — Delivery 4**
5. **D5 — Delivery 5**
6. **Q — QA / critique**
7. **F — Fix / polish**
8. **P — Plan the next phase**

The first five are the maximum implementation budget for the phase. They must be large, coherent outcomes rather than micro-tasks. If implementation is genuinely complete before D5, do not invent filler work; move directly to Q. The normal operating model is therefore **up to five delivery sessions + three mandatory transition sessions**.

A phase must not silently consume a sixth ordinary delivery session because the first five were undersized. If the five-session decomposition proves too small, the planning was wrong: re-scope within the phase acceptance criteria, combine work more aggressively, or explicitly record a genuine blocker/exception.

The only acceptable reason to exceed the normal 8-session cadence is a real blocking defect, external dependency, or failed phase gate that would make advancing dishonest or unsafe. Never advance a broken phase just to preserve the count.

## Delivery-session rule (D1–D5)

A delivery session should aim to complete one meaningful capability end-to-end, not one file, one interface, one test, one visual tweak, or one commit.

**Prefer one substantial outcome over several micro-tasks.** Multiple files and multiple commits are normal. Keep working on the same delivery objective until one of these is true:

1. the objective is complete and relevant lightweight checks pass;
2. a genuine blocker prevents further useful progress; or
3. substantial progress is durable and the remaining work truly cannot reasonably be completed in the current run.

Do not stop merely because one safe commit landed. Small fixes belong inside the active delivery objective.

Ordinary delivery sessions should optimize roughly for **80% building / 20% checking**.

### Good delivery outcomes
- a complete navigation flow;
- a renderer/runtime subsystem wired end-to-end;
- one authored interaction working through domain + presentation boundaries;
- one persistence/reward capability with its deterministic tests;
- one representative product state that can be opened and used.

### Usually too small for a delivery session by themselves
- a single type/interface;
- renaming or formatting;
- one config flag;
- one isolated adapter with no current consumer;
- one visual tweak;
- tests for already-working behavior without a discovered regression;
- QA infrastructure that does not protect current product behavior.

## Session 6 — Q: QA / critique

This is a dedicated phase-level review session. Its job is to **evaluate**, not to turn into another implementation session.

Use `TESTING.md` and `STAGE_GATES.md` and inspect the phase against its acceptance criteria. Run the relevant deterministic checks, inspect representative visual evidence when the phase changed user-visible behavior, and critique architecture, product/learning quality, UX, resilience, performance risk, safety/privacy boundaries, and regression risk as applicable.

Record concrete findings and classify them as blocking or non-blocking. Avoid broad feature additions during Q; trivial corrections are acceptable only when they do not distract from the review. The main output of Q is a trustworthy defect/polish list for F.

## Session 7 — F: Fix / polish

This session executes the findings from Q aggressively and coherently.

Fix all blocking findings that can reasonably be fixed, address high-value polish/regressions, rerun the relevant checks, and leave the phase in a state that is genuinely safe to close. Do not use F to invent unrelated features or expand scope.

If blocking findings remain after a serious F session, the phase does **not** advance. Record the blocker and continue only as an explicit exception to the normal 8-session cadence. Quality wins over bookkeeping.

## Session 8 — P: Plan the next phase

This session happens only after the current phase is genuinely ready to close.

P must:

1. finalize/record the current phase gate and roadmap status;
2. mark the next roadmap phase `NEXT`/`IN PROGRESS` as appropriate;
3. use the evidence and lessons from the completed phase to divide the next phase into **no more than five substantial delivery sessions (D1–D5)**;
4. give each delivery session a concrete end-to-end outcome and `Done when` criteria;
5. append the next phase's mandatory **Q, F, P** transition sessions;
6. update this file so the next autonomous run has an unambiguous first target.

Do not pre-plan distant phases into tiny tasks. Detailed decomposition belongs in the P session immediately before that phase begins, when evidence is fresh.

## Execution loop for the hourly agent

1. Read `README.md`, `TASKS.md`, this file, and relevant architecture/decision docs.
2. Identify the current phase and its first unfinished session slot.
3. Execute that slot according to its role: D, Q, F, or P.
4. For D sessions, deliver the full coherent objective using as many files/commits as useful.
5. For Q, review and record findings rather than expanding scope.
6. For F, fix the Q findings and rerun focused evidence.
7. For P, close the current phase and create the next phase's five-session delivery plan plus Q/F/P.
8. Update this file when a session slot is genuinely complete.
9. Preserve deterministic CI and never require a live AI/model provider.

---

# Completed phase

## A2 — Planet Hub foundation

**Status: DONE**

A2 completed D1–D5, dedicated Q, F, and P. The final stage gate is `project/gates/A2.md` with **PASS WITH FOLLOW-UP**. The Planet Hub now provides the stable scene/catalog/navigation/asset lifecycle foundation that A3 may build on rather than replace.

A2 follow-ups that remain deliberately non-blocking:
- revisit bundle startup/code-splitting when there is evidence of a real loading problem;
- refresh physical Android frame pacing once actor/vertical-slice rendering density is representative;
- replace small transition waits with stronger synchronization only if real CI flakiness appears.

---

# Current phase plan

## A3 — Character/actor system

**Phase outcome:** KidsLive has a character-agnostic `WorldActor` system with a real Phaser implementation, deterministic test actor, replaceable character definition/assets, bounded movement/look/emotion/action/speech behavior, and clean integration with the A2 hub/place lifecycle. The first KidsLive companion proves the system without becoming a domain assumption.

**Architecture constraints:**
- `WorldActor` is renderer-independent; Phaser details stay behind `PhaserActor`.
- Do not add PixiJS or a second render/game loop. Inspect the historical Pixi/Nova implementation for reusable renderer-independent assets, timing, movement math, state names, and behavior only.
- Character identity, voice, animation set, emotion vocabulary/presentation, and visual assets must come from replaceable definition/configuration rather than domain constants.
- A3 must remain deterministic without a live tutor, TTS, or model provider. A5 owns provider orchestration later.
- Reuse A2 scene lifecycle, asset loading, responsive layout, and runtime visibility rather than creating a parallel character runtime.

### A3-D1 — WorldActor contract + first production actor end-to-end
**Status: NEXT**

**Outcome:** a real configured companion is visibly present in the production hub through a renderer-independent actor contract, with a deterministic test actor proving callers do not need Phaser.

**Done when:**
- inspect the historical Pixi/Nova source referenced by D-007 and explicitly choose only reusable renderer-independent concepts/assets; do not restore PixiJS;
- define the minimal production `WorldActor` contract and supporting actor target/action/emotion types in a renderer-independent location;
- implement `FakeActor`/`InstantActor` (or equivalent deterministic test actor) with observable command history/state;
- implement the initial `PhaserActor` renderer/controller and create it through a character definition/config rather than hard-coded Nova/KidsLive identity inside generic actor logic;
- wire one configured companion into `PlanetHubScene` using A2 lifecycle/asset seams so it is actually visible and survives normal responsive layout;
- cleanly destroy/unsubscribe actor-owned Phaser objects on scene shutdown/recreation;
- add focused deterministic tests for the contract/test actor plus relevant build/browser checks and visual review of desktop/mobile hub presence.

### A3-D2 — Movement, look targets, emotion + responsive spatial behavior
**Status: PLANNED**

**Outcome:** the companion can inhabit the world rather than act as a static sprite: callers can move it to semantic anchors, direct attention, and change emotion/presentation consistently across desktop/mobile layout.

**Done when:**
- introduce renderer-independent semantic anchors/targets that do not expose Phaser coordinates to domain/caller code;
- `moveTo` has deterministic completion/cancellation semantics and the Phaser implementation visibly interpolates/moves without teleport-only behavior;
- `lookAt`/orientation and `setEmotion` affect actor presentation through replaceable definition data rather than one-character branching;
- resize/orientation changes preserve a coherent actor position/target instead of duplicating or losing the actor;
- overlapping movement/state requests have an explicit rule rather than leaking tweens/promises;
- deterministic actor tests cover state/command semantics; browser visual evidence covers representative movement/emotion states on desktop/mobile.

### A3-D3 — Bounded perform/speak sequencing + interruption semantics
**Status: PLANNED**

**Outcome:** the actor can execute bounded action and speech presentation commands in deterministic sequences, including interruption/cleanup, without introducing a live AI/TTS dependency or stealing authority from later Experience/Tutor systems.

**Done when:**
- `perform(action)` maps generic actor actions to configured Phaser presentation/animation behavior with explicit completion semantics;
- `speak(text)` has a deterministic local/scripted presentation path suitable for A3 (for example bounded speech state/bubble or fake speech adapter) and does not require network audio/TTS;
- sequential and overlapping move/perform/speak commands have documented ordering/interruption/cancellation behavior;
- scene shutdown or actor disposal settles/cancels outstanding actor operations without dangling promises/tweens/listeners;
- `FakeActor` can reproduce command sequences deterministically for A4/A5 tests later;
- one visible scripted sequence exercises move/look/emotion/perform/speak end-to-end in the current runtime and is visually reviewed where presentation changes.

### A3-D4 — Character definition/assets + hub/place lifecycle integration
**Status: PLANNED**

**Outcome:** the companion system is demonstrably replaceable and coexists cleanly with A2 navigation: character visuals/config are authored data, and actor ownership across hub/place transitions follows one deliberate lifecycle policy.

**Done when:**
- character definition contains identity/presentation assets and supported actions/emotions without leaking child-specific terminology into generic actor/runtime contracts;
- port only justified reusable art/timing/behavior data from the historical prototype through the existing asset lifecycle or another compatible A2 seam;
- prove replaceability with at least one lightweight alternate/test character definition using the same `PhaserActor` implementation, without building an A17 alternate-product prototype early;
- define and implement whether the companion persists, is recreated, or is transferred across hub → place → hub transitions, with no duplicate actors/listeners/assets after repeated traversal;
- runtime debug visibility exposes enough actor state to diagnose lifecycle/command issues without production clutter;
- relevant desktop/mobile enter/return/re-entry flow succeeds with the actor present.

### A3-D5 — Cohesive actor system integration + representative runtime hardening
**Status: PLANNED**

**Outcome:** all A3 capabilities work together as one companion foundation ready for A4 Experience Engine commands without needing actor/runtime rewrites.

**Done when:**
- one representative scripted companion flow combines spawn, movement, look, emotion, action, speech presentation, interruption, resize, place transition, return, and cleanup;
- generic callers depend on `WorldActor`, not `PhaserActor`, character identity, or Phaser scene internals;
- repeated scripted/navigation cycles do not reveal duplicate display objects, listeners, tweens, unresolved operations, or scene-owned asset leaks;
- touch/mobile composition remains usable with the actor added to the hub/place density;
- refresh representative Android frame-pacing evidence if the final A3 animation/art density is materially representative enough to make the A2 follow-up meaningful; record rather than fabricate evidence if no physical-device path is available;
- lightweight deterministic checks, browser flow, and relevant visual review pass, leaving A3 feature-complete enough for Q rather than adding more companion scope.

### A3-Q — Phase QA / critique
**Status: PLANNED**

**Outcome:** perform the full evidence-based A3 review against `TASKS.md`, `ARCHITECTURE.md`, D-007, `TESTING.md`, and `STAGE_GATES.md`. Review architecture/replaceability, actor lifecycle and interruption resilience, product/visual quality, deterministic CI boundaries, representative performance evidence, and any safety/privacy implications. Record blocking and non-blocking findings; do not turn Q into A4 work.

### A3-F — Fix / polish
**Status: PLANNED**

**Outcome:** aggressively fix A3-Q blockers and high-value polish/regressions, rerun focused deterministic/visual/runtime evidence, and leave the actor system genuinely safe for A4 to consume. Do not add Experience Engine scope.

### A3-P — Close A3 + plan A4
**Status: PLANNED**

**Outcome:** if A3 has no unresolved blocker, record `project/gates/A3.md`, mark A3 `DONE` and A4 current in `TASKS.md`, then decompose **A4 Experience Engine v1** into at most five substantial D sessions plus A4-Q, A4-F, and A4-P using what the actor integration taught us.

---

# Future phases

Do not keep detailed D1–D5 plans for distant phases here. Each phase receives its detailed five-session delivery decomposition during the **P session of the immediately preceding phase**.

The roadmap in `TASKS.md` remains authoritative for phase order and scope. The standard structure for every future phase is:

- `A<N>-D1` — substantial delivery outcome
- `A<N>-D2` — substantial delivery outcome
- `A<N>-D3` — substantial delivery outcome
- `A<N>-D4` — substantial delivery outcome
- `A<N>-D5` — substantial delivery outcome
- `A<N>-Q` — dedicated QA / critique
- `A<N>-F` — dedicated fix / polish
- `A<N>-P` — close phase + plan next phase into D1–D5 + Q/F/P
