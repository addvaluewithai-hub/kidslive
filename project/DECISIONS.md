# Architecture Decision Log

Only accepted current decisions are kept here. Historical experiments remain in Git history but are not current architecture.

## D-001 — Existing Pixi/Nova prototype does not constrain the stack
**Status:** Accepted — 2026-09-08

The old Pixi-based character prototype was inexpensive and disposable. Its renderer is not a production dependency.

## D-002 — Phaser + React + Capacitor is the production runtime
**Status:** Accepted — 2026-09-09

KidsLive will use **Phaser 3 + TypeScript** for the living world, **React** for product UI, and **Capacitor** for mobile packaging/native bridges.

### Physical-device evidence
At approximately the same benchmark density on the same Android phone:
- Phaser + Capacitor: **60 FPS steady / 44 FPS busy**.
- Godot native: **60 / 50**.
- React Native Skia: **60 / 60**.

Skia won raw renderer headroom, but Phaser was selected for the complete product because the observed busy result remained acceptable while Phaser already supplies scenes, camera/input, tweens, timelines, hit testing, particles/effects, asset lifecycle, and a mature game loop. This avoids spending product time building and maintaining a mini game engine above a lower-level renderer. Phaser also produced a substantially smaller benchmark APK.

### Reopen only if
A representative production vertical slice with real art/audio/UI cannot maintain acceptable frame pacing on target Android hardware without unacceptable visual compromise. Framework preference or a synthetic benchmark alone is not enough.

## D-003 — Domain/curriculum logic is framework-independent
**Status:** Accepted — 2026-09-08

Lesson progression, assessment truth, retries, hints, progress, unlocks, XP, streaks, rewards, and permissions live in deterministic TypeScript logic outside Phaser/React/network/model code.

## D-004 — AI is a bounded tutor/actor, never the authority
**Status:** Accepted — 2026-09-08

AI may explain, adapt wording, speak, move the actor, perform allowed actions, and request approved tools. It cannot directly change curriculum truth, assessment results, unlocks, XP, or arbitrary backend state.

## D-005 — CI cannot depend on a live model provider
**Status:** Accepted — 2026-09-08

Live AI/audio providers require fake/scripted/failure/slow adapters for deterministic CI.

## D-006 — Device evidence governs performance decisions
**Status:** Accepted — 2026-09-08

Hosted CI is for correctness and deterministic budgets. Physical Android hardware is the trusted performance gate.

## D-007 — Rebuild the Pixi character visual layer in Phaser TypeScript
**Status:** Accepted — 2026-09-09

Do **not** embed PixiJS inside Phaser or run two rendering/game loops. The production companion will implement a renderer-independent `WorldActor` contract, with a `PhaserActor` implementation written in TypeScript.

Reusable pieces from the old prototype may be ported if renderer-independent: personality/prompts, state names, movement math, audio/TTS logic, timing data, SVG/PNG assets, and behavioral rules. Pixi display objects, Pixi animation code, and Pixi renderer lifecycle are replaced with Phaser equivalents.
