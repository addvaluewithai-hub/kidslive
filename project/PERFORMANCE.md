# Performance Gates

Performance is a product requirement and an architecture gate.

## Spike 001 goal
Prove that the intended visual density and React/Phaser integration can remain smooth on representative weak/medium Android hardware before committing to the stack.

The original stress toggle was too conservative: 140 baseline motes versus 420 stress motes produced no visible difference on the first physical Android check. That is encouraging, but it is not enough evidence to lock the architecture.

## Spike 001B — stress ladder
The benchmark now has four explicit load levels:
- **NORMAL** — baseline world.
- **BUSY ×4** — ~1,200 extra independently animated sprites.
- **HEAVY ×10** — ~3,600 extra independently animated sprites.
- **TORTURE ×20** — ~9,000 extra animated sprites plus additive blending and dynamic geometry redrawn every frame.

Metrics are reported over a rolling frame window: current FPS, average FPS, approximate 1% low FPS, average frame time, worst frame time, long frames (>32 ms), and active object count. The purpose is to find the device's failure boundary, not to claim TORTURE resembles production content.

Actor travel was also separated from the actor's idle bob and camera pixel rounding was enabled after the first Android check showed visible actor micro-jitter during camera travel.

## Initial target behavior
These are starting budgets, not promises carved in stone:
- Normal navigation and actor flight should feel 60 FPS on target mid-range devices.
- Expected production density should keep strong headroom below the device's measured stress failure boundary.
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
**PASS:** representative device runs expected production-density scenes smoothly and shows a comfortable failure boundary above that density, leaving headroom for audio/AI/UI.

**FAIL:** acceptable behavior requires invasive renderer hacks, removing core product visuals, or repeatedly fighting WebView/browser constraints. If this happens early, move to the Godot fallback rather than building a permanent hybrid workaround.

## Future automated budgets
- JS bundle and route/chunk sizes.
- decoded texture-memory estimates and max texture dimension.
- active object/particle/sound caps per scene class.
- scene teardown object counts.
- fixed-device frame-time percentiles and long-frame count.
- app memory after repeated enter/exit cycles.
