# KidsLive Project HQ

This folder is the authoritative handoff for future conversations.

## Product
KidsLive is a code-first, mobile-first interactive 2D learning universe where children travel between authored learning environments with an AI companion that can speak, act, move, and use bounded product tools.

The current product is child-first, but the core platform must remain replaceable across character, audience, theme, tone, and presentation so future teen/adult experiences do not require a learning-platform rewrite.

## Current state

**A0 architecture selection is DONE. A1 repository/development foundation is DONE. A2 Planet Hub foundation is IN PROGRESS.**

Locked runtime:
- Phaser 3 + TypeScript for the living world.
- React for product UI and overlays.
- Capacitor for Android/iOS packaging and native bridges.
- Pure TypeScript domain logic for curriculum, assessment, progression, rewards, and permissions.

A1 established the production repository foundation, deterministic CI, explicit core/adaptor seams, documented web/Android workflows, and a clean Android debug APK build path. The stage-gate record is `gates/A1.md`.

The working tree was deliberately cleaned after A0. Godot, React Native Skia, synthetic stress scenes, and shootout-specific build code are not production dependencies.

## Resume protocol
1. Read this file.
2. Read `DECISIONS.md`.
3. Read `ARCHITECTURE.md`.
4. Read `TASKS.md` and identify the first `NEXT`/`IN PROGRESS` roadmap phase.
5. Read `SESSIONS.md` and continue the first unfinished session target inside that phase.
6. Check `main` CI before changing code so current failures or duplicate work are visible.
7. Work toward the complete session objective, using multiple files/commits if useful. Do not stop merely because one small safe commit landed.
8. Run lightweight checks relevant to the change; run visual QA only when user-visible surfaces changed.
9. Read `TESTING.md` and `STAGE_GATES.md` when the current roadmap phase is close to completion, then perform the full phase gate.
10. Do not advance to the next roadmap phase until the current phase's stage gate passes.
11. Treat `main` as authoritative; old PR/branch names are historical evidence only.

## Session principle
A normal autonomous run should deliver one meaningful capability or a substantial portion of one, not one interface, config change, isolated visual tweak, or QA artifact. Small fixes belong inside the active session objective. `SESSIONS.md` is the authoritative decomposition for the current and near-term phases.

Ordinary development should optimize roughly for **80% building / 20% checking**. Full multi-dimensional critique belongs at phase completion, not after every micro-change.

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
10. Every roadmap phase ends with evidence-based QA and critique before the next phase begins.
