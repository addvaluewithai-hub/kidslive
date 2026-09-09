# KidsLive Project HQ

This folder is the authoritative handoff for future conversations.

## Product
KidsLive is a code-first, mobile-first interactive 2D learning universe where children travel between authored learning environments with an AI companion that can speak, act, move, and use bounded product tools.

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
5. Check `main` CI before changing code.
6. Treat `main` as authoritative; old PR/branch names are historical evidence only.

## Product principles
1. Learning is authored; AI makes it alive.
2. Curriculum truth, assessment, rewards, and progression are deterministic.
3. Code is the source of truth; no required proprietary/editor-only workflow.
4. Performance is tested early on representative Android hardware.
5. Renderer/provider details stay behind one-way interfaces.
6. CI never depends on a live model provider.
7. Child safety and permissions are architectural boundaries, not prompt conventions.
