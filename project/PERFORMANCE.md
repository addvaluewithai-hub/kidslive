# Performance Gates

Performance is a product requirement and an architecture gate.

## Spike 001 goal
Prove that the intended visual density and React/Phaser integration can remain smooth on representative weak/medium Android hardware before committing to the stack.

The original stress toggle was too conservative: 140 baseline motes versus 420 stress motes produced no visible difference on the first physical Android check. That was encouraging, but not enough evidence to lock the architecture.

## Spike 001B — synthetic failure boundary
The second benchmark intentionally pushed pathological independent per-frame sprite work:
- **NORMAL** — baseline world.
- **BUSY ×4** — ~1,200 extra independently animated sprites.
- **HEAVY ×10** — ~3,600 extra independently animated sprites.
- **TORTURE ×20** — ~9,000 extra animated sprites plus additive blending and dynamic geometry redrawn every frame.

Physical Android result: BUSY ×4 already showed serious jank; HEAVY ×10 effectively froze the experience before TORTURE could be selected. This successfully found a synthetic failure wall. It is not evidence that a production Phaser scene will behave the same way, because shipping content should not update thousands of independent sprites every frame.

## Spike 001C — production-density benchmark
The current architecture gate is a realistic scene rather than a torture scene. It keeps the kinds of work we actually expect to ship active at the same time:
- Six richer floating worlds with animated portals and orbiters.
- Multi-layer parallax/star background and static world decoration.
- A code-drawn flying actor with idle, glow, blink/speech-state motion.
- Camera travel and portal celebration effects.
- A preallocated/pool-based particle system with no per-effect object allocation.
- React product UI, simulated live tutor/subtitle overlay, and continuously updating metrics.
- **PRODUCTION STEADY** for normal hub density.
- **BUSY LESSON** for sustained extra ambient motion, speech animation and recurring pooled effects.

Metrics use a rolling frame window: current FPS, average FPS, approximate 1% low FPS, average/worst frame time, long frames (>32 ms), active effects, and animated-object count.

### Physical test procedure
1. Open the deployed `main` URL on Chrome on the target Android device.
2. Leave **Steady world** selected for 15–20 seconds and travel through several worlds.
3. Record average FPS, 1% low, worst frame time, long-frame count, and whether movement visibly hitches.
4. Tap **Reset sample**.
5. Enable **Busy lesson**, leave it running for 20–30 seconds, and travel through several worlds.
6. Record the same metrics and subjective jank.
7. Repeat once after the page has been open for a few minutes to catch obvious thermal/memory problems.

## Initial target behavior
These are starting budgets, not promises carved in stone:
- Normal navigation and actor flight should feel 60 FPS on target mid-range devices.
- Production steady should remain near display refresh with no repeatable visible hitch.
- Busy lesson should retain comfortable headroom for real audio/AI/network work that is not yet wired.
- No unbounded memory growth after repeated scene/app lifecycle cycles.
- World boot and transitions should be measurable and later given explicit time budgets.

## Trusted measurement hierarchy
1. **Physical fixed Android benchmark device** — architecture and regression truth.
2. Physical iPhone reference device — platform parity.
3. Local desktop/browser profiling — diagnosis and iteration.
4. Emulator/simulator — smoke behavior, not final performance truth.
5. Hosted GitHub runner — deterministic checks only, not FPS truth.

## PASS / FAIL rule for Phaser
**PASS:** the representative device runs the production-density scene smoothly in steady mode and remains acceptably smooth in busy mode, with enough margin to add audio/AI without renderer hacks.

**FAIL:** realistic production density itself requires invasive renderer hacks, removing core product visuals, or repeatedly fighting browser/WebView constraints. If this happens early, move to the Godot fallback rather than building a permanent hybrid workaround.

## Future automated budgets
- JS bundle and route/chunk sizes.
- decoded texture-memory estimates and max texture dimension.
- active object/particle/sound caps per scene class.
- scene teardown object counts.
- fixed-device frame-time percentiles and long-frame count.
- app memory after repeated enter/exit cycles.
