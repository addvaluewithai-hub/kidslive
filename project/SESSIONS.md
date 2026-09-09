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

The first five are the maximum implementation budget for the phase. They must be large, coherent outcomes rather than micro-tasks. If the implementation is genuinely complete before D5, do not invent filler work; move directly to Q. The normal operating model is therefore **up to five delivery sessions + three mandatory transition sessions**.

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

# Current phase plan

## A2 — Planet Hub foundation

A2 is using the new cadence retroactively. Work already completed before this cadence counts toward D1.

### A2-D1 — Spatial hub + selection/navigation foundation
**Status: DONE**

**Outcome:** the user sees a responsive spatial hub with six authored places and can select/focus a place and return to overview.

Includes the current spatial composition, place selection, camera focus/navigation, responsive mobile/desktop layout, and overview behavior.

### A2-D2 — Enter/exit a place end-to-end
**Status: DONE**

**Outcome:** from the Planet Hub, the user can choose a place, enter a real reusable placeholder place scene through an intentional transition, then return to the hub with expected state preserved.

**Done when:**
- hub selection exposes a clear enter interaction;
- a reusable place-scene contract exists rather than an English-only hack;
- at least one authored placeholder place opens as its own Phaser scene/state;
- transition in/out is coherent on touch and desktop;
- returning restores or deliberately resets hub selection/camera state according to one documented rule;
- repeated enter/return cycles do not accumulate duplicate listeners/display objects;
- relevant tests/build/browser checks pass and the visible flow is reviewed.

**Delivered:** all authored hub places now share one place catalog and reusable placeholder scene. Enter/return uses Phaser scene transitions, returns with the selected place and focused camera restored, and resize deliberately resets to overview. Browser coverage exercises English enter/return twice on desktop and touch/mobile viewports to catch lifecycle regressions; the fixed HUD remains usable through camera zoom.

### A2-D3 — Asset loading + lifecycle end-to-end
**Status: DONE**

**Outcome:** hub/place navigation uses a reusable authored asset-loading path with explicit ownership and lifecycle behavior.

**Done when:**
- one representative asset manifest/pack is loaded through a reusable path;
- loading, ready, and error behavior are explicit enough for future authored worlds;
- repeated scene entry does not blindly reload or leak resources;
- persistent vs scene-local asset ownership is clear;
- the flow remains deterministic without live services.

**Delivered:** every authored place now resolves through a typed asset pack. The pack reuses one persistent portal-frame texture across place visits while each place marker is explicitly scene-owned and released on scene shutdown. `PlaceholderPlaceScene` queues only uncached textures, exposes loading progress and a safe authored-asset error state, renders the loaded SVG assets in the real place flow, and remains fully local/deterministic. Existing browser coverage entered and returned from English twice in the same session successfully, exercising cleanup/re-entry; desktop and mobile visual evidence showed the loaded portal/marker without clipping or broken return state.

### A2-D4 — Runtime visibility + mobile/runtime hardening
**Status: DONE**

**Outcome:** the hub can be debugged and exercised confidently while remaining bounded and usable on representative mobile conditions.

**Done when:**
- development-only visibility exposes useful scene/camera/selection/asset facts;
- production presentation remains clean;
- resize/orientation/re-entry paths avoid duplicate objects/listeners;
- touch targets and camera behavior are usable on the representative mobile viewport;
- obvious unbounded update/allocation patterns are removed.

**Delivered:** an opt-in development overlay (`?runtimeDebug=1`) now exposes scene, viewport, camera, mode/selection, object/tween counts, and place asset queue/cache/failure state on a bounded 250 ms cadence; normal development and production presentation stay clean. Hub HUD synchronization now runs only while camera zoom actually changes instead of rebuilding positioning work every frame. Both hub and place scenes explicitly remove resize listeners, stop scene tweens, and destroy debug state on shutdown; the place also releases scene-owned assets. `PlaceholderPlaceScene` now relayouts existing objects on resize/orientation changes instead of recreating them, and compact touch controls have larger hit areas with the place back action moved to a clear bottom-edge position. Visual review caught and fixed a mobile title/control overlap before completion. Final quality, browser/touch enter-return-reentry, build, and Android debug APK paths pass on the completed head.

### A2-D5 — Cohesive hub integration
**Status: DONE**

**Outcome:** all A2 capabilities work together as one coherent Planet Hub foundation ready for the companion system to be added without rewriting hub fundamentals.

**Done when:**
- all six authored placeholders remain navigable;
- selection, focus, enter/return, loading/lifecycle, responsive behavior, and dev visibility coexist cleanly;
- repeated navigation is stable;
- any rough integration gaps discovered while combining D1–D4 are resolved;
- the phase is feature-complete enough to enter dedicated QA rather than adding more hub scope.

**Delivered:** the authored place catalog is now the single source for place identity, responsive desktop/compact spatial positions, and derived asset packs, removing duplicated integration metadata between hub rendering, asset lifecycle, and browser exercise code. The representative browser traversal now selects, enters, returns from, and restores the hub across all six authored places on both desktop and touch/mobile projects. While integrating the six-place flow, the browser check exposed two test-contract defects rather than product regressions: the exhaustive desktop traversal needed an explicit realistic test budget, and mobile touchscreen coordinates needed conversion through the canvas page bounds rather than treating game coordinates as page coordinates. Both were corrected. Final CI on the completed implementation passes format/lint/typecheck/tests/build, the complete desktop/mobile six-place traversal, and Android debug APK packaging.

### A2-Q — Phase QA / critique
**Status: DONE**

**Outcome:** perform the full evidence-based A2 review and leave a concrete blocking/non-blocking findings list. Do not treat this as another feature session.

**Delivered:** reviewed acceptance, architecture boundaries, latest main CI, all eight current Playwright screenshots, resilience, performance risk, and safety/privacy impact. The review is recorded in `project/qa/A2-Q.md`. Two blocking findings were identified: focused hub composition visibly collides/clips with the fixed heading, especially on the representative mobile viewport, and the authored asset-error fallback has no deterministic failure-path evidence. Non-blocking follow-ups cover the current bundle-size warning, later representative-device performance evidence, and avoiding premature test synchronization machinery.

### A2-F — Fix / polish
**Status: DONE**

**Outcome:** fix A2-Q findings, rerun focused checks/evidence, and leave A2 genuinely ready to close. If blockers remain, do not advance.

**Required focus:** repair focused hub composition on desktop/mobile and deterministically exercise the authored asset failure/fallback/return path using the existing Playwright stack. Keep the session scoped to QA findings rather than new hub features.

**Delivered:** the fixed Planet Hub HUD now has an explicit high-depth backdrop/safe region, so camera pan/zoom can preserve spatial context without moving world planets and labels visibly through the heading. Refreshed desktop and 390×844 mobile evidence shows the focused return state with a legible title/subtitle and no prior heading collision. The existing Playwright stack now deliberately aborts the authored place-marker SVG, verifies that the request is exercised, captures the safe fallback presentation, and returns to the hub on both desktop and mobile. The first failure-path check exposed an assertion timing issue despite the fallback rendering correctly; the assertion was changed to synchronize on the actual asset request rather than adding new test infrastructure. Final CI run `34416649282` passes formatting, architecture/lint/type checks, unit tests, production build, all eight browser tests across desktop/mobile including the forced asset failure, and Android debug APK packaging. The A2-Q blocking findings are resolved; non-blocking bundle/performance follow-ups remain deferred to representative later phases as documented.

### A2-P — Close A2 + plan A3
**Status: NEXT**

**Outcome:** record the final A2 gate/status, then decompose **A3 Character/actor system** into at most five substantial delivery sessions plus A3-Q, A3-F, and A3-P using what A2 taught us.

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
