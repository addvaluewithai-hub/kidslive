# Architecture Shootout — Phaser vs Godot vs React Native Skia

Status: **BUILD GATE PASSED — PHYSICAL ANDROID COMPARISON NEXT**

The purpose of this shootout is to choose the KidsLive world/rendering runtime using physical-device evidence, not framework preference.

## Candidates

### A — Phaser + React + Capacitor
Location: existing root app plus disposable `capacitor.config.json` packaging.

The optimized Phaser benchmark restores smooth WebGL antialiasing so Phaser is not allowed to buy frame rate by looking visibly pixelated. For the physical shootout it is packaged into an installable Capacitor Android APK, so the primary comparison is app-vs-app on the same phone rather than Chrome-vs-native.

### B — Godot native 2D
Location: `benchmarks/godot/`.

- Godot 4.7.2 stable.
- GDScript/code-authored scene; no editor-authored binary source of truth.
- Native Android export from GitHub Actions.
- Compatibility renderer for broad Android coverage.
- Same conceptual scene: six worlds, camera travel, procedural actor, steady/busy ambience, pooled-style FX, metrics and touch controls.

### C — Expo + React Native Skia
Location: `benchmarks/skia/`.

- Expo SDK 57 / React Native 0.86.
- React Native Skia 2.6.
- Reanimated/Worklets keep per-frame animation on the UI runtime rather than React state.
- Atlas rendering is used for repeated ambient/FX instances.
- Native Android release APK is generated in GitHub Actions.

## Fairness rules

We are not trying to write identical engine internals. Each candidate should use the production-friendly pattern that its ecosystem is good at while presenting approximately the same product density:

- Six authored-looking floating places.
- Camera travel among places.
- One animated procedural companion actor.
- Normal/steady world mode.
- Sustained busy-lesson mode.
- Roughly tens of ambient moving objects, not pathological thousands.
- Repeated lightweight visual effects.
- Product UI/metrics overlay.
- No live AI, microphone, networking, physics or large art assets yet.

A candidate should not be penalized for using an efficient native primitive (for example Skia Atlas or Godot canvas nodes), because that is exactly what we would use in production.

The primary physical comparison uses **three installable Android APKs**. The Phaser browser deployment may still be used as a secondary diagnostic, but it is not the apples-to-apples scorecard run.

## Physical Android test

Use the same phone for all three candidates. Close/reopen each candidate before its run.

For each candidate:

1. Run **Steady** for 20 seconds while pressing **Next** through several worlds.
2. Record average FPS, approximate 1% low, worst frame time and visible jank.
3. Switch to **Busy** and reset the sample.
4. Run for 30 seconds while travelling through several worlds.
5. Record the same metrics.
6. Judge visual sharpness at normal viewing distance: `poor / acceptable / sharp`.
7. Judge touch/camera feel: `poor / acceptable / excellent`.
8. Leave it open for two minutes and repeat Busy once to expose obvious thermal degradation.

Install these three separate apps:
- **Phaser + Capacitor**: `kidslive-phaser-benchmark.apk`.
- **Godot**: `kidslive-godot-benchmark.apk`.
- **React Native Skia**: `kidslive-skia-benchmark.apk`.

They use different Android package IDs, so all three can remain installed at the same time.

## Scorecard

Record results here after physical testing.

| Candidate | Steady avg | Busy avg | 1% low | Visual sharpness | Jank | Touch feel | Notes |
|---|---:|---:|---:|---|---|---|---|
| Phaser sharp WebGL + Capacitor | — | — | — | — | — | — | Android APK |
| Godot native | — | — | — | — | — | — | Android APK |
| React Native Skia | — | — | — | — | — | — | Android APK |

## Decision criteria

Raw FPS alone does not choose the stack. The winning option must give KidsLive enough headroom for real audio/AI/networking while remaining pleasant to build and test.

Priority order:

1. Stable frame pacing on representative Android hardware.
2. Crisp visual output without sacrificing core world density.
3. No renderer/runtime architecture that creates recurring mobile-specific hacks.
4. Code-first workflow and strong GitHub Actions reproducibility.
5. Fast AI-assisted development and deterministic tests.
6. Reasonable path to audio, microphone, lifecycle and native product features.
7. Minimal duplicated framework/glue code.

## Decision rule

- If one candidate clearly wins performance/quality and remains code-first, choose it and close A0.
- If Godot and Skia are both effectively locked at display refresh, prefer the one with the simpler complete-product architecture after considering audio/AI/product UI integration.
- Do not keep multiple world engines in production. The shootout is disposable evidence, not a permanent multi-engine architecture.

## Build artifacts

GitHub Actions workflows:

- `.github/workflows/shootout-phaser.yml` → `kidslive-phaser-benchmark-apk` — **GREEN**.
- `.github/workflows/shootout-godot.yml` → `kidslive-godot-benchmark-apk` — **GREEN**.
- `.github/workflows/shootout-skia.yml` → `kidslive-skia-benchmark-apk` — **GREEN**.
- Root CI (`quality` + `browser-smoke`) — **GREEN** on the shootout branch before physical testing.

Known-good installable APK artifacts now exist for all three candidates. The remaining A0 gate is physical same-phone comparison and recording one winner.