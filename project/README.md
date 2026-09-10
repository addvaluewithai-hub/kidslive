# KidsLive Project HQ

This folder is the authoritative handoff for future conversations.

## Product
KidsLive is a code-first, mobile-first interactive 2D learning universe where children travel between authored learning environments with an AI companion that can speak, act, move, and use bounded product tools.

The current product is child-first, but the core platform must remain replaceable across character, audience, theme, tone, and presentation so future teen/adult experiences do not require a learning-platform rewrite.

## Current state

**A0 architecture selection is DONE. A1 repository/development foundation is DONE. A2 Planet Hub foundation is DONE. A3 Character/actor system is DONE. A4 Experience Engine v1 is DONE. A5 Tutor/AI orchestration v1 is DONE. A6 English World vertical slice is IN PROGRESS.**

Locked runtime:
- Phaser 3 + TypeScript for the living world.
- React for product UI and overlays.
- Capacitor for Android/iOS packaging and native bridges.
- Pure TypeScript domain logic for curriculum, assessment, progression, rewards, and permissions.

A1 established the production repository foundation, deterministic CI, explicit core/adaptor seams, documented web/Android workflows, and a clean Android debug APK build path. The stage-gate record is `gates/A1.md`.

A2 established the production Planet Hub foundation: six authored places, responsive camera/touch navigation, reusable enter/return scene lifecycle, typed asset packs with deterministic failure behavior, development runtime visibility, and bounded cleanup/re-entry behavior. The stage-gate record is `gates/A2.md`.

A3 established the character-agnostic actor foundation: renderer-independent `WorldActor`, deterministic `FakeActor`, configurable character definitions/assets, production `PhaserActor`, bounded movement/look/emotion/action/speech behavior, interruption semantics, and stable Hub/Place ownership/fallback behavior. The stage-gate record is `gates/A3.md`.

A4 established the framework-independent Experience Engine v1: authored deterministic step graphs, assessment/retry/hint authority, semantic checkpoint/resume validation, guarded host commands, bounded approved tool intents, content validation, and immutable/serializable state/events. The stage-gate record is `gates/A4.md`.

A5 established provider-neutral tutor orchestration: bounded tutor contracts, deterministic scripted/failure/slow providers, speech/text and `WorldActor` coordination, guarded A4 command/tool bridging, cancellation/timeout/failure containment, data-minimized lifecycle diagnostics, and a cohesive `TutorSession` composition root. A4 remains the only educational authority and CI requires no live model/TTS provider. The stage-gate record is `gates/A5.md`.

The working tree was deliberately cleaned after A0. Godot, React Native Skia, synthetic stress scenes, and shootout-specific build code are not production dependencies.

## Resume protocol
1. Read this file.
2. Read `DECISIONS.md`.
3. Read `ARCHITECTURE.md`.
4. Read `TASKS.md` and identify the current `NEXT`/`IN PROGRESS` roadmap phase.
5. Read `SESSIONS.md` and execute the first unfinished session slot for that phase.
6. Check `main` CI before changing code so current failures or duplicate work are visible.
7. Follow the slot role exactly: delivery (`D1`–`D5`), phase QA (`Q`), fix/polish (`F`), or next-phase planning (`P`).
8. Delivery sessions should pursue the whole substantial outcome with multiple files/commits when useful; do not stop after one micro-change.
9. Run lightweight checks relevant to delivery work and visual QA only when user-visible behavior changed.
10. The dedicated `Q` session performs the full phase critique; the following `F` session fixes its findings.
11. The `P` session closes the phase only when safe, then divides the next phase into at most five substantial delivery sessions plus its own `Q`, `F`, and `P` slots.
12. Do not advance a phase with unresolved blocking findings merely to preserve the session count.
13. Treat `main` as authoritative; old PR/branch names are historical evidence only.

## Session principle
Each roadmap phase uses a standard **8-session operating cadence**: up to **5 substantial delivery sessions**, then **1 dedicated QA session**, **1 fix/polish session**, and **1 planning session for the next phase**. `SESSIONS.md` is authoritative for the current decomposition.

The five delivery sessions are a maximum budget, not permission to create tiny tasks. If implementation finishes early, skip unused delivery slots and begin Q. If five delivery sessions are insufficient because the decomposition was too conservative, combine/re-scope work rather than silently turning the phase into an endless chain of micro-sessions.

Ordinary delivery should optimize roughly for **80% building / 20% checking**. Full multi-dimensional critique belongs in the dedicated Q session. The F session exists to act on that critique. The P session exists to convert what was learned into the next phase's five-session plan.

## Product principles
1. Learning is authored; AI makes it alive.
2. Curriculum truth, assessment, rewards, ownership, and progression are deterministic.
3. Code is the source of truth; no required proprietary/editor-only workflow.
4. Performance is tested early on representative Android hardware.
5. Renderer/provider details stay behind one-way interfaces.
6. CI never depends on a live model provider.
7. Child safety and permissions are architectural boundaries, not prompt conventions.
8. Learning should create visible, persistent change in the user's world.
9. The core platform must not hard-code one companion, audience, theme, or permanently isolated single-user world.
10. Every roadmap phase ends with dedicated QA, fix/polish, and next-phase planning before the next implementation phase begins.
