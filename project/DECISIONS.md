# Architecture Decision Log

Use this as a compact ADR log. New decisions should include date, decision, why, alternatives rejected, and what evidence would justify reopening it.

## D-001 — Nova does not choose the product stack
**Status:** Accepted — 2026-09-08

The current Nova/PixiLive prototype was inexpensive to build and can be reimplemented. Existing character code is not a constraint on the world architecture.

## D-002 — Start with Phaser + TypeScript + React
**Status:** Accepted provisionally — 2026-09-08

We will validate Phaser as the 2D world/game layer because it gives scenes, camera, input, tweens, animation, particles, asset lifecycle, and game-loop primitives without building a game framework on top of a renderer.

React owns normal product UI. Phaser owns the living world. Pure TypeScript owns curriculum/domain state.

**Reopen if:** the real-device performance gate fails without heroic optimization, or a required interaction cannot be implemented cleanly.

**Primary fallback:** Godot. Do not drift into a long hybrid rescue architecture if the gate fails.

## D-003 — Capacitor is the intended mobile wrapper, not a requirement of Spike 001
**Status:** Accepted provisionally — 2026-09-08

Browser development stays extremely fast and CI-friendly. Capacitor will be introduced after the Phaser browser spike passes so we test the same world in iOS/Android WebViews and add native plugins only where justified.

## D-004 — Experience Engine is framework-independent
**Status:** Accepted — 2026-09-08

Lesson progression, quiz truth, retry policy, hints, progress, unlocks, XP, streaks, and assessment are pure deterministic TypeScript/domain logic. Phaser, React, and AI consume commands/events from this layer; they do not own its truth.

## D-005 — AI is a bounded tutor/actor, never the authority
**Status:** Accepted — 2026-09-08

The model may speak, explain, adapt wording, select allowed examples, perform, move, and request approved tools. It cannot directly award XP, change assessment truth, unlock arbitrary content, or mutate arbitrary backend state.

## D-006 — CI cannot depend on a live model provider
**Status:** Accepted — 2026-09-08

All AI integration must have scripted/fake adapters so pull requests are deterministic, cheap, and runnable without secrets or provider availability.

## D-007 — Performance decisions require device evidence
**Status:** Accepted — 2026-09-08

Hosted GitHub runner FPS is not a release metric. PR CI checks deterministic budgets and functional regressions; a fixed real Android device becomes the trusted performance benchmark before the stack is considered locked.
