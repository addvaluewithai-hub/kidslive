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
- keep voice/tone/persona replaceable outside renderer semantics;
- keep runtime debug UI development-only.

## A4 — Experience Engine v1

**Status: DONE**

A4 completed D1–D5, Q, F, and P. The final stage gate is `project/gates/A4.md` with **PASS WITH FOLLOW-UP**. The platform has a pure-TypeScript authored experience engine with deterministic graph transitions, assessment/retry/hint authority, bounded tool intents, checkpoint/restart semantics, semantic resume verification, immutable serializable state/events, authored-policy validation, and guarded step/revision host commands.

A4-Q blockers around public mutation bypasses, semantically forgeable checkpoints, caller-owned mutable authored definitions, and non-finite numeric tool parameters were all closed in A4-F. Focused implementation CI `34489766907` passed.

Non-blocking A4 follow-ups:
- measure validation/runtime cost with representative authored graph/content density in A6/A15;
- persistence in A11 must continue treating checkpoint payloads as untrusted input.

## A5 — Tutor/AI orchestration v1

**Status: DONE**

A5 completed D1–D5, Q, F, and P. The final stage gate is `project/gates/A5.md` with **PASS WITH FOLLOW-UP**. The platform now has provider-neutral tutor contracts, deterministic scripted/failure/slow tutors, speech/text and `WorldActor` coordination, guarded A4 authority bridging, cancellation/timeout/failure containment, data-minimized lifecycle diagnostics, and a cohesive `TutorSession` composition root.

A5-Q identified three blockers: cancellation could hang on a provider that ignored cancellation, a throwing authority-audit sink could disrupt behavior after A4 mutation, and browser evidence had a repeated desktop actor lifecycle timeout. A5-F closed the first two with deterministic regression coverage and current-main CI `34537307775` passed quality, browser stage-gate, and Android evidence, clearing the third without speculative runtime changes.

Non-blocking A5 follow-ups:
- exercise `TutorSession` inside the real A6 English-world runtime with representative interruption/failure states;
- keep native audio-focus/microphone lifecycle in A12 rather than leaking device policy into tutor core;
- keep production telemetry/privacy integration in A14 while preserving data-minimized diagnostics;
- refresh physical Android frame pacing at A6 rendering density.

---

# Current phase plan

## A6 — English World vertical slice

**Status: IN PROGRESS**

**Phase outcome:** one small but genuinely complete English learning environment proves the product loop end-to-end: Planet Hub entry → authored lesson → embodied tutor/actor guidance → learner interaction → deterministic assessment/hints/retries → bounded completion/reward signal → visible changed Hub/world state → safe return/re-entry. A6 is a platform/product proof slice, not full English curriculum production and not a substitute for the reusable interaction, progression/economy, persistence, or content-pipeline phases that follow.

**Architecture constraints:**
- A4 remains educational authority for lesson graph, assessment correctness, retries, hints, completion, and tool permissions;
- A5 `TutorSession` makes the lesson alive but cannot decide correctness, completion, rewards, or arbitrary world mutations;
- Phaser owns world rendering/input/lifecycle; React is reserved for product/accessibility-heavy overlays where that is materially better; domain rules stay pure TypeScript;
- A6 may add only the minimum slice-specific interaction and completion/world-change seams needed to prove the loop. Do not pre-build generalized A7 interaction frameworks, A8 economy/progression, or A11 backend persistence;
- the visible post-lesson world change must be driven by deterministic product state, not by tutor wording or a model tool side effect;
- provider/speech behavior used by automated tests remains deterministic/offline; CI never depends on live AI/TTS;
- because A6 materially changes rendering density and user-visible flow, delivery sessions that change those surfaces require representative desktop/mobile visual evidence, and the phase gate must consider physical Android frame pacing per `PERFORMANCE.md`/D-006.

### A6-D1 — English World runtime + authored lesson entry end-to-end
**Status: DONE**

Replace the English placeholder path with a production English-world scene/composition that is entered from the existing Planet Hub and owns one small validated A4 `ExperienceDefinition`. Wire scene lifecycle to one A4 engine plus A5 `TutorSession`, reuse the production companion actor, and establish deterministic world anchors/assets/loading/fallback behavior for the lesson without introducing curriculum breadth.

**Done when:** selecting English on the Hub enters a real lesson environment rather than the generic placeholder; one authored lesson graph starts through A4 and produces an initial A5 tutor turn/actor behavior through production seams; leaving/re-entering does not leak scene/tutor/actor work; asset/load failure has deterministic fallback behavior; existing non-English places still use their prior lifecycle; focused typecheck/tests/build pass; desktop and mobile visual evidence covers Hub → English entry, initial lesson state, and fallback/loading state where applicable.

**Evidence:** `EnglishWorldScene` now owns the validated `english-first-words` A4 graph and an offline scripted A5 `TutorSession` using the production `PhaserActor`; English Hub entry routes to this scene while non-English places retain `PlaceholderPlaceScene`; scene shutdown disposes tutor/actor work and releases scene-owned assets; deterministic authored-art fallback remains usable. Unit composition evidence plus dedicated Playwright desktop/mobile entry/fallback captures were added, and legacy A3/generic-place smoke coverage was kept intact by moving generic placeholder lifecycle assertions to Science. CI `34546844143` passed format/lint/typecheck-equivalent quality checks, unit/integration tests, production build, browser stage-gate, and Android debug APK on implementation head `420fb040`.

### A6-D2 — Learner interaction + tutor-guided lesson loop
**Status: NEXT**

Build the slice's actual learner interaction flow around the authored English lesson: present the minimum touch/keyboard-accessible interaction needed by this lesson, route learner actions through guarded A4 commands, reflect wrong/correct/hint/retry states visibly, and let A5 narration/speech/actor cues respond without owning educational truth. Keep the interaction slice-specific rather than prematurely generalizing A7.

**Done when:** a learner can complete the lesson's teaching/practice path from visible prompts and interactions; wrong answers, retry limits, hints, and normalized correct answers are determined by A4 and represented coherently in the world/UI; interruption or tutor/provider failure does not block learner progress or mutate correctness; touch targets/readability work at desktop and mobile sizes; deterministic tests plus representative visual evidence cover happy path, wrong/retry/hint, and tutor-failure/display-only behavior.

### A6-D3 — Deterministic completion reward + visible changed-world return
**Status: PLANNED**

Complete the product loop by translating authoritative lesson completion into one minimal deterministic A6 completion/reward receipt and one visible Hub/world change on return. The change may be a specific English-place upgrade/marker/decoration/unlock state for this slice, but must be stored outside Phaser display objects and must not become a generalized XP/currency/economy system ahead of A8 or backend sync ahead of A11.

**Done when:** successful A4 completion emits exactly one idempotent slice completion grant; replay/re-entry cannot double-grant it; returning to the Hub visibly reflects the completed English-world state and re-entering English recognizes prior slice completion; incomplete/failed/abandoned lessons do not grant the change; tutor/tool output cannot forge the grant; deterministic integration tests prove idempotency and authority boundaries; desktop/mobile visual evidence shows before/after Hub state and completed-world re-entry.

### A6-D4 — Vertical-slice resilience, responsive polish + lifecycle hardening
**Status: PLANNED**

Harden the complete Hub ↔ English lesson loop under repeated entry/exit, resize/orientation-sized layouts, interruption, slow/failing scripted tutor/speech, asset failure, scene shutdown, and rapid navigation. Polish the lesson's visual hierarchy, touch ergonomics, text readability, actor positioning, reduced-motion-friendly behavior where already supported, and cleanup so the slice behaves like a product flow rather than an integration demo.

**Done when:** repeated Hub ↔ English cycles leave no stale tutor/actor/scene effects; rapid exit during narration/actor work is safe; mobile/desktop layouts remain readable and tappable; deterministic failure fixtures produce recoverable user-visible states without live services; existing Hub/other-place flows remain intact; focused browser evidence covers representative happy/failure/interruption/re-entry states and no unresolved lifecycle regression remains.

### A6-D5 — Cohesive product proof + performance/evidence hardening
**Status: PLANNED**

Exercise and harden the whole A6 product loop as one coherent slice, close integration gaps between scene lifecycle, A4, A5, interaction UI, completion state, and Hub change, and gather representative evidence at the actual slice density. Do not add new curriculum breadth; spend the session making the single slice trustworthy, observable, and ready for phase QA.

**Done when:** one deterministic end-to-end browser flow proves enter → teach/interact → wrong/hint/retry where relevant → assess → complete → grant once → return to visibly changed Hub → re-enter safely; desktop/mobile visual evidence is named and reproducible; build/typecheck/affected tests are green; representative Android build succeeds; physical Android frame-pacing is captured at A6 density when hardware is available, and lack of required device evidence is recorded honestly for Q rather than replaced with hosted-CI FPS.

### A6-Q — Phase QA / critique
**Status: PLANNED**

Run the dedicated A6 critique from `TESTING.md` and `STAGE_GATES.md`. Evaluate the complete learning loop, educational authority, tutor embodiment, interaction clarity, before/after world change, lifecycle/resilience, responsive visuals, touch ergonomics, accessibility risk, asset/failure states, regression risk, and representative Android performance evidence. Record concrete blocking and non-blocking findings; do not add features.

### A6-F — Fix / polish
**Status: PLANNED**

Aggressively fix A6-Q blockers and high-value product/visual/lifecycle regressions, rerun focused deterministic and visual evidence, and keep A6 open if the vertical slice is not genuinely trustworthy or required performance evidence remains blocking.

### A6-P — Close A6 + plan A7
**Status: PLANNED**

Only if A6 is genuinely ready: record `project/gates/A6.md`, mark A6 `DONE` and A7 current in `TASKS.md`, then decompose **A7 Assessment & reusable interactions** into at most five substantial end-to-end delivery sessions plus A7-Q/F/P. Do not turn A7 planning into full-curriculum production or pull later progression/economy/backend scope forward.

---

# Future phases

Do not keep detailed D1–D5 plans for distant phases here. Each phase receives its detailed five-session delivery decomposition during the P session of the immediately preceding phase.
