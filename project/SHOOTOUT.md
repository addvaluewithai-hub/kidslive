# Architecture Shootout — Phaser vs Godot vs React Native Skia

Status: **COMPLETE — REACT NATIVE SKIA SELECTED**

The purpose of this shootout was to choose the KidsLive world/rendering runtime using physical-device evidence, not framework preference.

## Candidates

### A — Phaser + React + Capacitor
Location: existing root app plus disposable `capacitor.config.json` packaging.

The optimized Phaser benchmark restores smooth WebGL antialiasing so Phaser is not allowed to buy frame rate by looking visibly pixelated. For the physical shootout it was packaged into an installable Capacitor Android APK so the comparison was app-vs-app on the same phone rather than Chrome-vs-native.

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

We did not try to write identical engine internals. Each candidate used the production-friendly pattern its ecosystem is good at while presenting approximately the same product density:

- Six authored-looking floating places.
- Camera travel among places.
- One animated procedural companion actor.
- Normal/steady world mode.
- Sustained busy-lesson mode.
- Roughly tens of ambient moving objects, not pathological thousands.
- Repeated lightweight visual effects.
- Product UI/metrics overlay.
- No live AI, microphone, networking, physics or large art assets yet.

A candidate was not penalized for using an efficient native primitive such as Skia Atlas or Godot canvas nodes, because that is exactly what production would use.

The primary physical comparison used three installable Android APKs on the same phone.

## Physical Android result

User-reported same-phone results:

| Candidate | Steady avg | Busy avg | Result |
|---|---:|---:|---|
| Phaser sharp WebGL + Capacitor / Orbit One | 60 FPS | 44 FPS | Good steady, but busy load loses substantial headroom |
| Godot native / Orbit Two | 60 FPS | 50 FPS | Strong native result |
| React Native Skia / Orbit Three | 60 FPS | 60 FPS | Best result; held display-rate performance under busy load |

The exact per-engine metric implementations are not mathematically identical, so the numbers should not be treated as laboratory-grade cross-engine telemetry. The result is still strong enough for the architecture decision: Skia was the only candidate that remained at 60 FPS in both steady and busy modes on the same physical device.

## Decision

**Winner: Expo + React Native + React Native Skia + Reanimated/Worklets.**

Why:

1. It provided the best physical-device headroom in the production-density benchmark: **60 FPS steady / 60 FPS busy**.
2. It keeps the core mobile product, UI, native capabilities, and world rendering in one React Native/TypeScript architecture rather than introducing a second application runtime or a second primary language.
3. Skia gives crisp native rendering without the browser/canvas quality-performance tradeoff encountered during the Phaser spike.
4. Reanimated/Worklets let frame-critical animation live off ordinary React render state.
5. The build is reproducible in GitHub Actions and remains code-first.
6. KidsLive is interaction/animation-heavy rather than physics-heavy, so owning a small world/camera/actor layer is acceptable and preferable to carrying a full game engine solely for rendering primitives.

Godot remains useful evidence and would be the first renderer fallback if a future production workload exposes a capability Skia cannot satisfy cleanly. Phaser and Godot benchmark implementations are disposable A0 evidence and must not become parallel production engines.

## Reopen criteria

Reopen the runtime decision only with concrete production evidence, for example:

- representative Android devices cannot hold the product performance budget after real assets/audio/world complexity are added;
- a required game mechanic would force us to build a large general-purpose engine layer on top of Skia;
- lifecycle/audio/input/native integration reveals a recurring architecture problem rather than a local implementation bug.

Do not reopen based only on framework preference or the old Nova/Pixi prototype.

## Build evidence

The shootout established green GitHub Actions build paths for all three candidates:

- `.github/workflows/shootout-phaser.yml` → installable Phaser + Capacitor APK.
- `.github/workflows/shootout-godot.yml` → installable Godot APK.
- `.github/workflows/shootout-skia.yml` → installable React Native Skia APK.
- Root CI (`quality` + `browser-smoke`) also passed during the shootout.

A0 is complete. Production work continues with the React Native Skia path only.