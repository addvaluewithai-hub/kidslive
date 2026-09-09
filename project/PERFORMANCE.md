# Performance

## A0 physical baseline
Same Android phone, approximately equivalent shootout density:
- Phaser + Capacitor: **60 FPS steady / 44 FPS busy**.
- Godot: **60 / 50**.
- React Native Skia: **60 / 60**.

Phaser was accepted because the busy case remained usable while delivering much more built-in world/game infrastructure and a smaller benchmark package.

## Current working budget
Until a real vertical slice provides better evidence:
- Aim for display-rate steady interaction.
- Treat sustained **<45 FPS** in representative busy gameplay as a regression requiring investigation.
- Prefer stable frame pacing over a misleading high average.
- Never buy performance with visibly pixelated output.
- Bound particles/effects, avoid uncontrolled allocations in `update`, cull/sleep inactive world content, and bake/cache static procedural art where useful.

Revisit budgets with real assets, audio, React overlays, and device thermal runs before beta.
