# Performance Gates

Performance is a product requirement and an architecture gate.

## Spike 001 goal
Prove that the intended visual density and React/Phaser integration can remain smooth on representative weak/medium Android hardware before committing to the stack.

The spike includes normal mode and an intentionally heavier stress mode. It is not a benchmark if it only looks good on a developer laptop.

## Initial target behavior
These are starting budgets, not promises carved in stone:
- Normal navigation and actor flight should feel 60 FPS on target mid-range devices.
- No repeatable visible frame hitch on camera movement, portal selection, UI overlay interaction, or actor movement.
- No unbounded memory growth after repeated scene/app lifecycle cycles.
- World boot and transitions should be measurable and later given explicit time budgets.

## Trusted measurement hierarchy
1. **Physical fixed Android benchmark device** — architecture and regression truth.
2. Physical iPhone reference device — platform parity.
3. Local desktop/browser profiling — diagnosis and iteration.
4. Emulator/simulator — smoke behavior, not final performance truth.
5. Hosted GitHub runner — deterministic checks only, not FPS truth.

## PASS / FAIL rule for Phaser
**PASS:** representative device runs the stress scene and expected production-density scene without visible jank or abnormal memory behavior, with comfortable headroom for audio/AI/UI.

**FAIL:** acceptable behavior requires invasive renderer hacks, removing core product visuals, or repeatedly fighting WebView/browser constraints. If this happens early, move to the Godot fallback rather than building a permanent hybrid workaround.

## Future automated budgets
- JS bundle and route/chunk sizes.
- decoded texture-memory estimates and max texture dimension.
- active object/particle/sound caps per scene class.
- scene teardown object counts.
- fixed-device frame-time percentiles and long-frame count.
- app memory after repeated enter/exit cycles.
