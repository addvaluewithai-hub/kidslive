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
The architecture gate was then moved to a realistic scene rather than a torture scene. It keeps the kinds of work we actually expect to ship active at the same time:
- Six richer floating worlds with animated portals and orbiters.
- Multi-layer parallax/star background and static world decoration.
- A code-drawn flying actor with idle, glow, blink/speech-state motion.
- Camera travel and portal celebration effects.
- A preallocated/pool-based particle system with no per-effect object allocation.
- React product UI, simulated live tutor/subtitle overlay, and continuously updating metrics.
- **PRODUCTION STEADY** for normal hub density.
- **BUSY LESSON** for sustained extra ambient motion, speech animation and recurring pooled effects.

Metrics use a rolling frame window: current FPS, average FPS, approximate 1% low FPS, average/worst frame time, long frames (>32 ms), active effects, and animated-object count.

### First physical Android result
On the first representative Android test of Spike 001C:
- **PRODUCTION STEADY:** ~24 FPS average.
- **BUSY LESSON:** ~13 FPS average.
- Subjective visible jank was described as light/not very noticeable, but the measured frame rate is far below the intended performance budget and leaves no credible headroom for real audio, AI, networking, richer content, or lower-end devices.

This result means the **naive production implementation fails the performance gate**. It does not yet prove that Phaser itself must be abandoned, because this scene still uses several expensive patterns that a real mobile build should avoid: many vector Shape game objects, nested Containers, all six worlds kept live, and relatively little texture baking/culling.

## Spike 001D — one final production-pattern optimization gate
Before switching engines, run one deliberate optimization pass using normal mobile-game practices, not heroic or product-compromising hacks:
- Bake static/procedural vector art to textures where practical instead of rendering many Shape objects every frame.
- Keep only genuinely dynamic parts as live vector/game objects.
- Cull or sleep off-camera world content.
- Reduce unnecessary nested Containers and per-frame JS work.
- Keep particles pooled and bounded.
- Preserve the intended visual density and interaction model; do not win the benchmark by deleting the product.

### Decision threshold
The same physical Android device is the decision device.

**Phaser PASS:** optimized production steady is roughly 50–60 FPS with stable pacing, and busy lesson remains roughly 45+ FPS with no repeatable visible hitch, leaving meaningful headroom for audio/AI.

**Phaser FAIL → Godot:** the optimized scene remains materially below those targets, or reaching them requires invasive renderer-specific tricks, major visual cuts, or ongoing browser/WebView fighting.

A result around 24 FPS steady / 13 FPS busy is not acceptable for shipping even if it feels tolerable subjectively.

## Trusted measurement hierarchy
1. **Physical fixed Android benchmark device** — architecture and regression truth.
2. Physical iPhone reference device — platform parity.
3. Local desktop/browser profiling — diagnosis and iteration.
4. Emulator/simulator — smoke behavior, not final performance truth.
5. Hosted GitHub runner — deterministic checks only, not FPS truth.

## Future automated budgets
- JS bundle and route/chunk sizes.
- decoded texture-memory estimates and max texture dimension.
- active object/particle/sound caps per scene class.
- scene teardown object counts.
- fixed-device frame-time percentiles and long-frame count.
- app memory after repeated enter/exit cycles.
