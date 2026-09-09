# KidsLive Project HQ

This folder is the authoritative handoff for future conversations.

## Product
KidsLive is a code-first, mobile-first interactive 2D learning universe where children travel between authored learning environments with an AI companion that can speak, act, move, and use bounded product tools.

The current product is child-first, but the core platform must remain replaceable across character, audience, theme, tone, and presentation so future teen/adult experiences do not require a learning-platform rewrite.

## Current state

**A0 architecture selection is DONE. A1 repository/development foundation is NEXT.**

Locked runtime:
- Phaser 3 + TypeScript for the living world.
- React for product UI and overlays.
- Capacitor for Android/iOS packaging and native bridges.
- Pure TypeScript domain logic for curriculum, assessment, progression, rewards, and permissions.

The working tree was deliberately cleaned after A0. Godot, React Native Skia, synthetic stress scenes, and shootout-specific build code are not production dependencies.

## Resume protocol
1. Read this file.
2. Read `DECISIONS.md`.
3. Read `ARCHITECTURE.md`.
4. Read `TASKS.md` and continue the first `NEXT`/`IN PROGRESS` item.
5. Read `TESTING.md` and `STAGE_GATES.md` before deciding a phase is complete.
6. Check `main` CI and the latest available QA/stage-gate evidence before changing code.
7. Work in a small current-phase slice, run/inspect its QA evidence, critique the result, and fix blocking findings.
8. Do not advance to the next roadmap phase until the current phase's stage gate passes.
9. Treat `main` as authoritative; old PR/branch names are historical evidence only.

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
