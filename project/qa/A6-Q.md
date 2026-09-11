# A6-Q — English World vertical slice phase QA / critique

**Phase:** A6 — English World vertical slice
**QA slot:** Q
**Date:** 2026-09-11
**Reviewed main:** `5b2af13691a31be4bbdec7b2021045bd5f2371a6`
**Latest reviewed CI:** `34562400409` — quality PASS, browser stage-gate PASS, Android debug APK PASS.

## QA decision

**BLOCKING FINDINGS — proceed to A6-F; do not close A6 or begin A7 yet.**

The A6 slice now proves the intended product loop end-to-end with deterministic educational/reward authority, resilient tutor/scene lifecycle, desktop/mobile browser evidence, and a green current-main regression baseline. Phase QA still found two evidence/quality blockers that make an A6 gate premature: the physical Android performance evidence explicitly deferred into A6 is still missing, and the screenshots used for product-facing visual critique are contaminated by the development runtime-debug overlay rather than representing the production-clean surface.

## Evidence reviewed

- A6-D1 through A6-D5 evidence and done-when criteria in `project/SESSIONS.md`.
- Current `main` CI `34562400409`: quality PASS (`format:check`, lint/package-boundary/typecheck checks, unit/integration tests, production build), browser stage-gate PASS, Android debug APK PASS.
- Playwright artifact `playwright-qa-34562400409-1` from current `main`, including desktop 1280×720, mobile 390×844, and short-landscape 900×500 A6 states for entry, wrong/retry/hint, completion, changed Hub, re-entry, provider/speech failure, rapid exit, repeated cycling, and asset fallback.
- D5 deterministic cohesive journey proving welcome → practice → wrong answer → authored hint → normalized correct answer → authoritative A4 completion → one frozen idempotent completion receipt → changed Hub → completed re-entry.
- Prior CI `34561789489`: quality and Android passed while the existing desktop `cohesive actor flow stays bounded through resize and repeated scene ownership` smoke timed out once; the same A6 cohesive journey passed on desktop/mobile, the mobile actor smoke passed, and the next current-main run `34562400409` passed the full browser suite. Treat this as a tracked flake/regression risk rather than an active phase blocker unless it recurs.
- `project/evidence/A6-D5.md` records that no physical Android device was available during D5 and correctly does not substitute hosted-browser FPS.

## Acceptance and architecture assessment

Strengths retained by the phase:

- English Hub entry now reaches a real authored learning environment rather than a placeholder while all other places preserve their existing lifecycle.
- A4 `ExperienceEngine` remains the sole authority for lesson graph state, assessment correctness, normalization, retries, hints, completion, and guarded educational transitions.
- A5 `TutorSession` supplies narration, actor behavior, speech/text delivery, and failure containment without owning correctness, completion, or the A6 world-change grant.
- The slice-specific completion store accepts only a completed `english-first-words@1` A4 state, produces one idempotent receipt, and keeps the visible Hub change outside Phaser display-object authority.
- A6 deliberately keeps the completion receipt session-lifetime only instead of prematurely implementing A8 progression/economy or A11 persistence.
- Learner interaction has touch and keyboard paths; wrong/hint/retry/correct states are visible and deterministic.
- Slow/failing tutor and speech fixtures are offline/deterministic; rapid exit, repeated Hub ↔ English cycling, scene shutdown, asset failure, and late tutor completion are covered without live providers.
- `EnglishWorldScene` guards async tutor work with lifecycle revision/session identity and disables/cancels/interrupts work before returning to the Hub.
- Current CI remains independent of live AI/TTS and current `main` is green across quality, browser, and Android-build jobs.

## Product / learning critique

The slice communicates one clear learning target (`APPLE`) and gives the learner a short progression from guided practice to deterministic recognition. Wrong answers do not silently mutate mastery, a hint becomes available through authored A4 policy, normalized correct input is accepted authoritatively, and completion produces a visible world consequence on return. This is enough to prove the product loop without pretending the one-word slice is curriculum breadth.

The companion remains supportive rather than authoritative: provider/speech failures fall back to a learner-progress-preserving state, and the learner can continue through the authored lesson. The changed Hub state is derived from deterministic product state rather than tutor wording or a model tool request.

## Visual / UX critique

The reviewed desktop/mobile/short-landscape captures show the lesson card, choices, back control, companion, feedback, and tutor copy staying in-bounds across the representative viewports. Mobile choice controls remain materially tappable and the compact layout avoids the earlier short-landscape collision risk.

However, the A6 screenshots are captured with `?runtimeDebug=1`, which draws a development-only monospace overlay inside the Phaser scene. On desktop it overlaps the English title/status hierarchy; on mobile its long detail line clips off the left edge and obscures the top of the changed surface. `RuntimeDebugOverlay` is correctly DEV-only, so this is not a production UI defect, but it means the artifact used for phase visual QA is not a clean representation of the product surface. A product-facing phase should not pass its visual gate while its representative evidence is visibly polluted by instrumentation.

The production visual itself is intentionally spare and currently sufficient for a vertical-slice proof, but full accessibility semantics, richer visual polish, localization, and reduced-motion policy remain later roadmap work rather than A6 scope.

## Blocking findings

### B1 — Required A6-density physical Android frame-pacing evidence is still missing

This is the first production-density learning vertical slice and materially changes rendering density, assets, animation/lifecycle behavior, and interaction UI. Earlier A2/A3/A5 gates explicitly deferred representative physical Android frame-pacing to A6. D-006 states that device evidence governs performance decisions, `TESTING.md` says phases that materially change rendering/lifecycle must consider fresh physical-device evidence, and `PERFORMANCE.md` defines sustained `<45 FPS` in representative busy gameplay as an investigation threshold.

D5 correctly recorded the absence of device hardware instead of substituting hosted-CI FPS, but that leaves the performance question unanswered at exactly the phase where the deferred evidence becomes representative. An Android APK build succeeding proves packaging, not frame pacing or thermal/device behavior.

**A6-F requirement:** capture the complete A6 slice on representative physical Android hardware using the production build at both steady and representative busy states (lesson/tutor/actor active, transitions/re-entry), record frame-pacing observations against the current budget, and inspect for visible quality compromise. If no representative device is available, keep A6 open as an explicit external-evidence blocker; do not replace the evidence with hosted Chromium FPS.

### B2 — Product-facing visual QA artifacts are not production-clean because the DEV runtime overlay obscures the changed surface

The current Playwright visual artifact uses `runtimeDebug=1` to expose lifecycle metrics, and the same switch renders `RuntimeDebugOverlay` into screenshots. The overlay is useful for deterministic lifecycle assertions, but representative A6 product captures show it overlapping the English title/status on desktop and clipping across the mobile top edge. `TESTING.md` requires product-facing visual evidence to be reviewed for hierarchy, readability, clipping/overflow, touch ergonomics, and world/UI integration; instrumentation covering the target surface weakens that review.

This does not indicate the production build itself contains the debug UI: `runtimeDebug.ts` gates the overlay behind `import.meta.env.DEV`. The blocker is evidence quality, not runtime leakage.

**A6-F requirement:** preserve the deterministic runtime snapshot used by lifecycle tests while adding/using a production-clean evidence path with no visible debug overlay, then recapture the representative desktop/mobile A6 states (at minimum lesson interaction, completion, changed Hub, safe re-entry, and short-landscape). Review those clean captures for clipping, hierarchy, readability, and touch target regressions before phase closure.

## Non-blocking findings / follow-ups

- The completion/world-change store is intentionally session-lifetime only. Browser reload/native process restart will lose the A6 receipt until A11 persistence exists. This is acceptable for A6 because the code and roadmap explicitly avoid pulling backend persistence forward; A11 must later preserve the same idempotent authority semantics.
- The A6 interaction is keyboard/touch operable but Phaser canvas controls do not yet provide rich DOM accessibility semantics/focus narration. Do not generalize an accessibility framework inside A6-F; carry this into A18 while preserving the current keyboard path and avoiding regressions.
- CI `34561789489` had a one-off desktop actor lifecycle timeout while the corresponding mobile case and all A6 product-proof tests passed; current-main run `34562400409` is fully green. Keep the synchronization path under observation and only harden it if the timeout recurs with evidence.
- The one-word slice is intentionally narrow. Do not use A6-F to add curriculum breadth, reusable A7 interaction abstractions, A8 progression/economy, or A11 persistence.

## Safety / privacy critique

A6 introduces no new network, identity, persistence, social, microphone, or production telemetry surface. Automated tutor/speech behavior is deterministic/offline. Model/tutor output still cannot acquire correctness, completion, reward, or arbitrary world-mutation authority. No new child-sensitive data is introduced by the slice completion receipt.

## Exit criteria for A6-F

A6 can proceed to P only when:

1. B1 has representative physical Android frame-pacing evidence that does not reveal a performance regression, or the phase remains explicitly blocked if that external evidence cannot be obtained;
2. B2 has clean desktop/mobile/short-landscape visual evidence without visible runtime instrumentation and no resulting blocking visual/UX regression;
3. focused deterministic/browser/build evidence remains green after any evidence-path or polish changes;
4. no new educational-authority, lifecycle, reward-idempotency, or regression blocker is discovered.

If either blocker remains, keep A6 open rather than beginning A7.
