# Architecture Decision Log

Use this as a compact ADR log. New decisions should include date, decision, why, alternatives rejected, and what evidence would justify reopening it.

## D-001 — Nova does not choose the product stack
**Status:** Accepted — 2026-09-08

The current Nova/PixiLive prototype was inexpensive to build and can be reimplemented. Existing character code is not a constraint on the world architecture.

## D-002 — Start with Phaser + TypeScript + React
**Status:** Superseded by D-008 — 2026-09-09

Phaser was the first serious runtime candidate because it supplied scenes, camera, input, tweens, particles, asset lifecycle, and a game loop without building a game framework over a raw renderer.

Physical testing changed the decision. The initial realistic scene measured about 24 FPS steady / 13 FPS busy. A production-pattern optimization pass improved speed but created an unacceptable visual-quality tradeoff, so a fair three-way native APK shootout was run instead.

Final same-phone result:
- Phaser + Capacitor: **60 FPS steady / 44 FPS busy**.
- Godot native: **60 FPS steady / 50 FPS busy**.
- React Native Skia: **60 FPS steady / 60 FPS busy**.

Phaser remains useful spike evidence but is not the production world runtime.

## D-003 — Capacitor is conditional on the web runtime winning A0
**Status:** Superseded by D-008 — 2026-09-09

Capacitor was only intended if the web/Phaser runtime won A0. Because A0 selected React Native Skia, Capacitor is no longer the intended production mobile shell.

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

## D-008 — Use Expo + React Native + Skia for the production mobile/world runtime
**Status:** Accepted — 2026-09-09

KidsLive will use **Expo + React Native + TypeScript** as the mobile/product runtime, with **React Native Skia** for the living 2D world and **Reanimated/Worklets** for frame-critical animation.

### Evidence

The three candidates were built as installable Android APKs and tested on the same physical phone at approximately the same product density:

- Phaser + Capacitor: **60 FPS steady / 44 FPS busy**.
- Godot native: **60 FPS steady / 50 FPS busy**.
- React Native Skia: **60 FPS steady / 60 FPS busy**.

The per-engine metrics are not laboratory-identical, but Skia was the only candidate that remained at display-rate performance under both steady and busy load.

### Why this wins beyond FPS

- Native mobile rendering with no browser canvas/WebView world runtime.
- Crisp rendering without the quality compromise encountered in the optimized Phaser spike.
- One primary application language/ecosystem: TypeScript + React Native.
- Product UI, navigation, lifecycle, permissions, audio, and native capabilities live in the same app architecture as the world.
- Reanimated/Worklets keep per-frame state outside ordinary React reconciliation.
- Skia is a renderer rather than a game engine, but KidsLive is primarily authored 2D interaction/animation rather than physics-heavy gameplay. We will own only the minimal world primitives we actually need: camera, scene/place lifecycle, actor, timeline, hotspots, and bounded pooled effects.

### Alternatives rejected

- **Phaser + Capacitor:** acceptable steady performance, but lower busy headroom and a previous sharpness/performance tradeoff increased browser-runtime risk.
- **Godot:** excellent performance and strong 2D primitives, but introduces a second primary language/runtime and more app-to-engine integration for a product that also needs substantial native UI, AI, audio, parent, and account surfaces.

### Reopen only if

Real production evidence shows that representative Android hardware cannot meet the product budget with real assets/audio/world density, or Skia forces a large general-purpose game-engine layer. Framework preference alone is not sufficient reason to reopen this decision.
