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

# Completed phase

## A2 — Planet Hub foundation

**Status: DONE**

A2 completed D1–D5, Q, F, and P. The final stage gate is `project/gates/A2.md` with **PASS WITH FOLLOW-UP**. The Planet Hub now provides stable scene/catalog/navigation/asset lifecycle foundations for A3.

Non-blocking A2 follow-ups:
- revisit bundle startup/code-splitting only when evidence shows a real loading problem;
- refresh physical Android frame pacing once actor/vertical-slice rendering density is representative;
- strengthen transition synchronization only if real CI flakiness appears.

---

# Current phase plan

## A3 — Character/actor system

**Phase outcome:** KidsLive has a character-agnostic `WorldActor` system with a real Phaser implementation, deterministic test actor, replaceable character definition/assets, bounded movement/look/emotion/action/speech behavior, and clean integration with the A2 hub/place lifecycle. The first KidsLive companion proves the system without becoming a domain assumption.

**Architecture constraints:**
- `WorldActor` is renderer-independent; Phaser details stay behind `PhaserActor`.
- Do not add PixiJS or a second render/game loop. Historical Pixi/Nova is reference evidence only.
- Character identity, voice, animation set, emotion presentation, and visuals come from replaceable definition/configuration rather than generic-domain constants.
- A3 remains deterministic without live tutor, TTS, or model providers.
- Reuse A2 scene lifecycle, responsive layout, asset/runtime seams rather than creating a parallel runtime.

### A3-D1 — WorldActor contract + first production actor end-to-end
**Status: DONE**

**Outcome delivered:** a configured Nova companion is visibly present in the production Planet Hub through a renderer-independent actor contract, and callers can use a deterministic fake without Phaser.

**Evidence / implementation notes:**
- inspected KidsLive PR #1 and PixiLive PR #9 under D-007;
- reused only renderer-independent concepts: semantic destination ownership, action/emotion vocabulary, and explicit actor lifecycle intent;
- explicitly did **not** port Pixi display objects, Pixi renderer lifecycle, SDK embedding, Gemini/TTS, or the Pixi flight implementation;
- added `src/core/actors/WorldActor.ts` and deterministic `FakeActor` command history/state coverage;
- added configurable `CharacterDefinition` and initial `KIDSLIVE_COMPANION` definition so Nova identity/palette/capabilities are data, not generic actor branching;
- added initial `PhaserActor` renderer/controller and wired it into `PlanetHubScene` with explicit shutdown disposal and responsive home placement;
- runtime debug detail now reports the active actor id;
- CI run `34425187811` passed quality (boundaries/typecheck/tests/build), Playwright desktop/mobile flows, and Android debug APK;
- Playwright visual artifacts were directly reviewed: Nova is visible in the hub on both 1280×720 desktop and 390×844 mobile without breaking the existing place navigation flow.

### A3-D2 — Movement, look targets, emotion + responsive spatial behavior
**Status: DONE**

**Outcome delivered:** the companion now inhabits the hub through semantic movement/look targets, configurable emotion presentation, deterministic overlap cancellation, and responsive reflow rather than teleport-only/static behavior.

**Evidence / implementation notes:**
- `WorldActor` now defines an explicit `ActorOperationCancelledError`; a newer unfinished `moveTo` deterministically rejects the previous movement instead of leaking promises/tweens;
- `FakeActor` supports manual deterministic movement completion/cancellation so future engine/tutor tests can exercise overlap semantics without Phaser;
- `PhaserActor.moveTo` visibly interpolates with configured timing, tracks the current semantic anchor/look target, and exposes Phaser-only `snapTo`/`reflow` lifecycle helpers without leaking coordinates into generic callers;
- hub semantic targets cover home, center, and per-place companion/focus anchors resolved from the responsive A2 place layout;
- selecting a place moves Nova beside it, points attention toward it, and applies the configured `curious` presentation; Overview returns Nova home/warm and points attention center;
- emotion face tint/mouth/glow and movement timing live in `CharacterDefinition`, not Nova-specific branches inside the generic renderer;
- resize/layout re-resolves current or active semantic movement targets and preserves one actor instance; scene shutdown still cancels/disposes outstanding movement cleanly;
- visual QA exposed and fixed a real facing regression where negative container scale mirrored the `Nova` label; only the actor visual body now flips, keeping labels readable;
- CI run `34429648866` passed formatting/boundaries/typecheck, 20 unit tests, production build, all 10 Playwright tests across desktop/mobile, and Android debug APK;
- successful Playwright evidence was directly reviewed on 1280×720 and 390×844: focused Nova visibly sits beside English and faces it with a curious expression, Overview restores a readable warm home state, labels remain unmirrored, and mobile composition remains usable.

### A3-D3 — Bounded perform/speak sequencing + interruption semantics
**Status: DONE**

**Outcome delivered:** the actor can now execute bounded movement, configured actions, and local speech presentation as deterministic awaited sequences, with explicit same-channel supersession and whole-actor interruption/cleanup semantics and no live AI/TTS dependency.

**Evidence / implementation notes:**
- `WorldActor` documents independent long-running movement/action/speech channels: a newer command cancels the previous unfinished command on the same channel with `ActorOperationCancelledError`, independent channels may overlap deliberately, and callers use `await` when strict sequence ordering is required;
- added `interrupt(reason?)` to cancel all unfinished actor operations without disposing the actor, while `dispose()` permanently cancels operations and releases resources;
- `FakeActor` now supports manual deterministic completion of movement, action, and speech, same-channel cancellation, whole-actor interruption, post-interrupt reuse, and disposal coverage for future A4/A5 tests;
- `CharacterDefinition` now owns per-action duration/lift/scale presentation and bounded local speech timing/width configuration instead of hard-coding Nova-specific timing inside generic actor behavior;
- `PhaserActor.perform()` uses configured completion-aware visual tweens; `speak()` shows a deterministic local speech bubble for a bounded configured duration with no network, TTS, or model provider;
- action presentation is isolated from the outer movement container and facing visual, so move/action/look behavior can coexist without corrupting semantic position or readable labels;
- hub selection now demonstrates a real awaited sequence: interrupt stale intent → move to the selected place → perform `think` → switch emotion → speak `Let's explore <place>!`; selecting another intent, Overview, resize, place entry, or scene shutdown cancels outstanding work cleanly;
- CI run `34432950071` on implementation head `c30f81efc55a45cd6962762c78994319a888caaf` passed formatting/boundaries/typecheck, 23 unit tests, production build, Playwright desktop/mobile flows, and Android debug APK;
- Playwright evidence was directly reviewed on 1280×720 and 390×844: the `Let's explore English!` speech bubble is readable above Nova while she sits beside English, labels remain readable, the compact mobile composition remains usable, and Overview removes the active speech presentation without browser errors.

### A3-D4 — Character definition/assets + hub/place lifecycle integration
**Status: DONE**

**Outcome delivered:** character identity now includes authored visual assets behind replaceable definitions, and one deliberate active-scene ownership policy carries the companion cleanly through Hub → Place → Hub without sharing Phaser instances across scene boundaries.

**Evidence / implementation notes:**
- `CharacterDefinition` now owns a persistent authored asset pack and visual texture key in addition to palette, actions, emotions, movement, action, and speech presentation data;
- added a newly authored generic `companion-shell.svg` through the existing A2 `queueAssetPack` lifecycle seam; historical Pixi/Nova review again justified reusing behavior vocabulary/timing concepts only, not Pixi display code or renderer assets that would couple the new runtime;
- startup now uses `BootScene` to preload the active companion's persistent assets once before entering the hub; `PhaserActor` consumes the loaded shell when present and retains a primitive fallback if character art fails;
- added `TEST_COMPANION` (`Ember`) with a distinct identity/palette/asset key but the same `CharacterDefinition`/`PhaserActor` contract, plus deterministic coverage proving the renderer-facing definition is not Nova-specific;
- actor ownership is explicitly **active-scene scoped**: the Hub owns one actor while active, the Place owns one actor while active, every shutdown disposes its actor and cancels operations, and the character texture cache remains persistent across transitions;
- `PlaceholderPlaceScene` now renders the companion, keeps it responsive through semantic place anchors/reflow, interrupts it before leaving, and disposes it before releasing scene-owned place art;
- `PhaserActor.getDebugState()` exposes renderer-local id/anchor/look/active operation state; Place runtime debug also reports actor object count and asset/cache/failure state without production UI clutter;
- existing six-place Playwright traversal now exercises actor create/dispose/recreate across every enter/return cycle on desktop and mobile, including the authored-place failure fallback path;
- CI run `34436700371` on implementation head `a2cc6ffd5a00b59b8b05809058d27368fa22b952` passed format/lint/tests/build, browser desktop/mobile flows, and Android debug APK;
- Playwright artifacts were directly reviewed: Nova is visible and readable inside English and Music on 1280×720 and 390×844, remains clear of the mobile back control, the forced place-art fallback remains usable with the actor present, and returned hub captures after repeated traversal show no visible duplicate actor regression.

### A3-D5 — Cohesive actor integration + representative runtime hardening
**Status: NEXT**

**Outcome:** all A3 capabilities work together as one companion foundation ready for A4 Experience Engine commands without actor/runtime rewrites.

**Done when:**
- one representative scripted flow combines spawn, movement, look, emotion, action, speech presentation, interruption, resize, place transition, return, and cleanup;
- generic callers depend on `WorldActor`, not `PhaserActor`, character identity, or Phaser scene internals;
- repeated scripted/navigation cycles reveal no duplicate display objects/listeners/tweens, unresolved operations, or scene-owned asset leaks;
- touch/mobile composition remains usable at the added actor density;
- refresh representative Android frame-pacing evidence if final A3 density is materially representative; never fabricate physical-device evidence;
- lightweight deterministic checks, browser flow, and visual review pass, leaving A3 feature-complete for Q.

### A3-Q — Phase QA / critique
**Status: PLANNED**

Perform the full evidence-based A3 review against `TASKS.md`, `ARCHITECTURE.md`, D-007, `TESTING.md`, and `STAGE_GATES.md`. Review architecture/replaceability, actor lifecycle/interruption resilience, product/visual quality, deterministic CI boundaries, representative performance evidence, and safety/privacy implications. Record blocking and non-blocking findings; do not start A4.

### A3-F — Fix / polish
**Status: PLANNED**

Fix A3-Q blockers and high-value regressions/polish, rerun focused deterministic/visual/runtime evidence, and leave the actor system safe for A4 to consume. Do not add Experience Engine scope.

### A3-P — Close A3 + plan A4
**Status: PLANNED**

If A3 has no unresolved blocker, record `project/gates/A3.md`, mark A3 `DONE` and A4 current in `TASKS.md`, then decompose **A4 Experience Engine v1** into at most five substantial D sessions plus A4-Q/F/P using what actor integration taught us.

---

# Future phases

Do not keep detailed D1–D5 plans for distant phases here. Each phase receives its detailed five-session delivery decomposition during the P session of the immediately preceding phase.
