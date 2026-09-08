# Architecture Decision Log

Use this as a compact ADR log. New decisions should include date, decision, why, alternatives rejected, and what evidence would justify reopening it.

## D-001 — Nova does not choose the product stack
**Status:** Accepted — 2026-09-08

The current Nova/PixiLive prototype was inexpensive to build and can be reimplemented. Existing character code is not a constraint on the world architecture.

## D-002 — Start with Phaser + TypeScript + React
**Status:** Provisional, under final performance review — 2026-09-08

We are validating Phaser as the 2D world/game layer because it gives scenes, camera, input, tweens, animation, particles, asset lifecycle, and game-loop primitives without building a game framework on top of a renderer.

React owns normal product UI. Phaser owns the living world. Pure TypeScript owns curriculum/domain state.

### Evidence
- Synthetic test: ×4 independent-sprite stress produced serious jank; ×10 effectively froze on the physical Android device.
- First realistic production-density benchmark: approximately **24 FPS steady** and **13 FPS busy**. Subjective jank was light, but the measured performance is below the product budget and leaves insufficient headroom.
- The realistic scene still contains avoidable expensive patterns (live vector Shape objects, nested Containers, always-live off-camera worlds), so this is considered a failure of the naive implementation rather than final proof against Phaser.

### Final gate
One production-pattern optimization pass is allowed: bake static procedural art to textures, cull/sleep off-camera content, reduce unnecessary containers/per-frame JS, and keep pooled effects bounded without cutting intended product density.

**Lock Phaser if:** the same device reaches roughly 50–60 FPS steady and 45+ FPS busy with stable pacing.

**Reject Phaser if:** it remains materially below that target or requires heroic renderer/browser workarounds.

**Primary fallback:** Godot. Do not drift into a long hybrid rescue architecture if the optimized gate fails.

## D-003 — Capacitor is conditional on the web runtime winning A0
**Status:** Provisional — 2026-09-08

Capacitor remains the preferred mobile wrapper only if the Phaser/web runtime passes A0. If A0 selects Godot, this decision is superseded for the game/world runtime rather than forcing Godot into a hybrid wrapper.

## D-004 — Experience Engine is framework-independent
**Status:** Accepted — 2026-09-08

Lesson progression, quiz truth, retry policy, hints, progress, unlocks, XP, streaks, and assessment are pure deterministic TypeScript/domain logic. The renderer, product UI, and AI consume commands/events from this layer; they do not own its truth.

## D-005 — AI is a bounded tutor/actor, never the authority
**Status:** Accepted — 2026-09-08

The model may speak, explain, adapt wording, select allowed examples, perform, move, and request approved tools. It cannot directly award XP, change assessment truth, unlock arbitrary content, or mutate arbitrary backend state.

## D-006 — CI cannot depend on a live model provider
**Status:** Accepted — 2026-09-08

All AI integration must have scripted/fake adapters so pull requests are deterministic, cheap, and runnable without secrets or provider availability.

## D-007 — Performance decisions require device evidence
**Status:** Accepted — 2026-09-08

Hosted GitHub runner FPS is not a release metric. PR CI checks deterministic budgets and functional regressions; a fixed real Android device becomes the trusted performance benchmark before the stack is considered locked.
