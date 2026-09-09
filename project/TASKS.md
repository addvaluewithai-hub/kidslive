# Roadmap

Statuses: `DONE`, `IN PROGRESS`, `NEXT`, `PLANNED`.

## A0 — Architecture & performance selection
**Status: DONE**

Selected Phaser + React + Capacitor after physical Android comparison. Benchmark implementations are disposable evidence and have been removed from the working tree.

## A1 — Repository and development foundation
**Status: NEXT**

Turn the clean starter into the maintainable production skeleton: package boundaries, lint/format rules, environment handling, typed world/domain events, adapter interfaces/test doubles, mobile build path, test helpers, CI artifacts, and developer scripts.

**Done when:** a clean checkout reaches running web + installable Android build + complete CI through documented commands, with no benchmark-only code or hidden local setup.

## A2 — Planet hub foundation
**Status: PLANNED**
Build the production planet hub: camera/touch behavior, responsive composition, six authored place placeholders, transitions, asset loading/lifecycle, debug overlay, and bounded memory/performance.

## A3 — Character/actor system
**Status: PLANNED**
Rebuild the companion in Phaser TypeScript behind `WorldActor`; port reusable renderer-independent behavior/assets from the Pixi prototype and add deterministic test actors.

## A4 — Experience Engine v1
**Status: PLANNED**
Authored step graph, events, assessment transitions, retries, hints, checkpoints/resume, tool permissions, and content validation in pure TypeScript.

## A5 — Tutor/AI orchestration v1
**Status: PLANNED**
Provider-independent tutor contracts, scripted/failure/slow test tutors, speech/text adapter, tool permissions, interruption handling, and event observability.

## A6 — English World vertical slice
**Status: PLANNED**
One small complete learning environment from planet entry through authored lesson, interactions, feedback/reward, and return to changed planet state.

## A7 — Assessment & reusable interactions
**Status: PLANNED**
Choice, matching/sorting, text/voice where appropriate, hints/retries, normalization, deterministic scoring.

## A8 — Progression, XP, streaks, unlocks
**Status: PLANNED**
Reward ledger, streak semantics, unlocks, achievements, offline/duplicate safety.

## A9 — Child profile & parent experience
**Status: PLANNED**
Profile boundaries, parent controls, progress overview, permissions, privacy/settings surfaces.

## A10 — Persistence/backend/sync
**Status: PLANNED**
Minimal production backend based on proven vertical-slice needs.

## A11 — Mobile hardening
**Status: PLANNED**
Android/iOS packaging, lifecycle, safe areas, audio focus, microphone, keyboard/input, deep links, storage, build configuration.

## A12 — Offline/assets
**Status: PLANNED**
Bundle/cache/download strategy, content versioning, compression, recovery.

## A13 — Safety/privacy/observability
**Status: PLANNED**
Child-safe model/tool boundaries, data minimization, telemetry, errors, auditability.

## A14 — Content pipeline
**Status: PLANNED**
Schemas, generators, validators, previews, fixtures, content tests, authoring docs.

## A15 — Second-world validation
**Status: PLANNED**
Build a materially different second world (candidate: Chess or German) without architecture rewrites.

## A16 — Polish/accessibility/performance
**Status: PLANNED**
Animation/assets/loading/touch/typography/reduced motion/localization/audio captions and device hardening.

## A17 — Closed beta
**Status: PLANNED**
Analytics, feedback, crash/performance monitoring, support and rollback.

## A18 — Launch
**Status: PLANNED**
Store/privacy/legal/release/ops/staged rollout readiness.
