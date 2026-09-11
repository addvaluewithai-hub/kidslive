# A6-F — Fix / polish evidence

**Phase:** A6 — English World vertical slice
**Slot:** F — Fix / polish
**Date:** 2026-09-11
**Implementation commit:** `dad4d5ff844cef402b0f7d97ce84b1a497fd616a`
**CI:** `34569270149` — quality PASS, browser stage-gate PASS, Android debug APK PASS.

## Outcome

A6-F made substantial progress but is **not complete** because A6-Q blocker B1 still requires representative physical Android frame-pacing evidence. Do not advance to A6-P while that evidence is unavailable.

A6-Q blocker B2 is closed. Runtime lifecycle instrumentation is now separated from the visible development overlay: `?runtimeDebug=1` still publishes `window.__KIDSLIVE_RUNTIME_DEBUG__` for deterministic Playwright synchronization and lifecycle assertions, but it does not draw instrumentation over the product surface. The visible overlay is opt-in through `?runtimeDebug=1&runtimeDebugOverlay=1`. Production/non-development behavior remains debug-disabled.

Unit coverage now verifies the split explicitly: development instrumentation can be enabled without a visible overlay, overlay rendering requires both flags, and all debug instrumentation remains disabled outside development.

## Focused deterministic / build evidence

CI `34569270149` passed:

- format check;
- lint/package-boundary/typecheck-equivalent quality checks;
- unit/integration tests, including the new runtime-debug option coverage;
- production build;
- full Playwright browser stage-gate;
- Android debug APK build.

The browser suite passing is important evidence that hiding the overlay did not remove the deterministic runtime snapshot used by lifecycle and product-flow assertions.

## Clean visual evidence — B2 closed

Reviewed Playwright artifact `playwright-qa-34569270149-1` from the implementation commit. The artifact was regenerated with `runtimeDebug=1`, but because visible instrumentation is now independently opt-in, the representative screenshots are product-clean.

Representative states inspected:

- desktop English lesson interaction/practice: title, lesson card, narration, back control, and companion remain in bounds with no debug text over the surface;
- desktop completion: `First word complete!` hierarchy is clear, the companion remains visually separate from the lesson card, and no instrumentation obscures the title/status area;
- changed desktop Hub: `English: First word learned ✓` and the English place subtitle are readable, with no debug overlay covering the planet surface;
- completed mobile re-entry: the welcome-back card, companion, learner copy, keyboard hint, and back control remain inside the viewport with no clipped runtime-debug detail line;
- 900×500 short-landscape: the compact lesson card, companion, and back control remain in bounds and readable with no instrumentation collision.

No blocking clipping, overflow, hierarchy, or touch-target regression was found in the reviewed clean captures. The existing later-roadmap accessibility/polish follow-ups remain non-blocking and were not expanded in F.

## Remaining blocker — B1 physical Android frame pacing

No representative physical Android device is available in the current execution environment. The Android debug APK builds successfully, but per D-006 and `project/PERFORMANCE.md`, an APK build or hosted Chromium timing is not a substitute for physical-device frame pacing.

A6 therefore remains open. To finish A6-F, run the production-density A6 slice on representative physical Android hardware and record at minimum:

1. steady English World interaction frame pacing;
2. representative busy lesson/tutor/actor activity;
3. Hub ↔ English transitions and completed re-entry;
4. whether sustained busy behavior falls below the current 45 FPS investigation threshold;
5. any visible quality compromise, thermal instability, or frame-pacing hitch that would require a product/runtime fix.

If the device evidence is acceptable, A6-F can be completed and A6-P may evaluate phase closure. If it reveals a regression, fix that regression inside the A6-F exception before planning A7.

## Scope discipline

No curriculum breadth, reusable A7 interaction framework, A8 progression/economy, A11 persistence, live AI/TTS dependency, or unrelated feature work was added.
