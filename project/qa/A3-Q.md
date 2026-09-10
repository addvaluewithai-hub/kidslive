# A3-Q — Character/actor system phase QA

**Phase:** A3 — Character/actor system
**QA date:** 2026-09-10
**Reviewed implementation head:** `aee687f59ab30df61bcc516280cd45e9e1026de9`
**Current main at QA start:** `2bad280849456756a9fd0e4c7fc275c749d8fa37`

## Verdict

A3 is **not ready to close yet**. The architecture and visible actor slice are strong enough to proceed to the dedicated A3-F fix/polish slot, but two blocking resilience/evidence findings must be resolved first.

## Acceptance review

A3 delivers the intended renderer-independent `WorldActor` seam, a deterministic `FakeActor`, a production `PhaserActor`, configurable character definitions/assets, semantic movement/look targets, bounded emotion/action/speech behavior, interruption/disposal semantics, active-scene ownership, and Hub → Place → Hub integration. No Pixi runtime or live tutor/TTS/model provider was introduced.

The implementation also proves alternate identity/configuration through `TEST_COMPANION`, while Nova remains only the current KidsLive configuration. The current speech implementation is intentionally local/deterministic rather than a provider integration.

## Deterministic evidence

- CI run `34442537653` on implementation head `aee687f5` passed quality, browser desktop/mobile, and Android debug APK.
- Quality evidence: style/boundaries/typecheck passed; 7 Vitest files / 24 tests passed; production build passed.
- Build output is still one large JS chunk: 1,413.30 kB minified / 386.22 kB gzip, with Vite's >500 kB warning.
- Browser evidence on `aee687f5` passed all 12 Playwright tests across desktop/mobile, including six-place traversal, place-art failure fallback, actor action/speech interruption, cohesive resize/repeated ownership, and named visual evidence.
- The immediately following bookkeeping-only main commit initially exposed nondeterministic cohesive lifecycle evidence: desktop observed `resizeListeners` change from 5 to 6 after resize and mobile timed out waiting for expected runtime state. A targeted rerun subsequently passed, indicating an observation/synchronization race rather than a deterministic runtime break, but A3-F must make the proof stable rather than relying on luck.

## Visual evidence reviewed

Reviewed the successful Playwright artifact from run `34442537653`, including regular 1280×720 / 390×844 Hub and Place states, forced place-art fallback, actor scripted speech/focus states, and resized 960×680 / 430×760 cohesive-flow captures.

Observed product state is coherent for the current foundation phase: one visible companion, readable actor label, usable speech bubble, no obvious duplicate actor, responsive place layouts, and safe fallback/place-return surfaces. The debug overlay is intentionally development-only and can overlap product copy in debug captures; that is not treated as a production UX regression.

## Architecture critique

### Strengths

- `WorldActor` contains no Phaser/browser/provider dependency and exposes explicit cancellation semantics.
- Phaser-specific coordinate resolution, display objects, tweens, timers, and `reflow`/`snapTo` helpers remain in the renderer layer.
- Character identity/palette/asset key/presentation timing live in replaceable definitions instead of Nova branches.
- Active-scene actor ownership is simple and avoids sharing Phaser objects across scene boundaries.
- CI remains provider-free and deterministic by design.

### Risks / observations

- `ActorAction` and `ActorEmotion` are currently closed generic unions. That is acceptable for A3's bounded vocabulary, but A4/A5 should avoid allowing authored educational intent or tutor persona to expand these renderer commands ad hoc without validation.
- Voice/persona/tone are not yet first-class character definition fields. This is not blocking in A3 because no voice/tutor adapter exists yet; A5 should preserve their replaceability rather than adding Nova assumptions around the actor renderer.

## Product / UX critique

The actor meaningfully improves the world foundation: selection now has visible attention, movement, expression, action and local speech instead of a static level-select avatar. The current scripted copy is only demonstration glue and should not become curriculum/tutor authority when A4/A5 arrive.

No obvious desktop/mobile clipping, mirrored labels, duplicate companion, or unsafe touch regression was visible in the reviewed successful artifacts.

## Resilience critique

The operation model is strong at unit level: same-channel supersession, whole-actor interruption, reuse after interrupt, and disposal are deterministic in `FakeActor`, while repeated Hub/Place ownership is exercised in browser tests.

Two resilience gaps block closure:

1. **Cohesive lifecycle evidence needs deterministic synchronization.** The implementation can pass, but one run observed transient listener-count drift and a mobile wait timeout. A3-F should wait on the actual settled actor/listener invariants instead of fixed timing windows, without weakening one-actor / zero-tween / stable-listener assertions.
2. **Companion asset failure is implemented but not directly exercised.** `PhaserActor` falls back to a primitive shell when the configured character texture is missing, but the current failure-path Playwright test intentionally fails place art, not `companion-shell.svg`. A3-F should force that request to fail and prove Hub/Place usability, actor behavior, and navigation still work.

## Performance critique

The actor adds only one lightweight companion per active scene and current browser/runtime metrics show bounded actors/tweens in successful runs. No physical Android FPS claim is available and none should be fabricated. D-006 remains authoritative; refresh physical frame-pacing when a device-equipped run has representative vertical-slice density. The existing 1.41 MB minified / 386 kB gzip bundle warning remains a non-blocking startup/code-splitting follow-up unless measured loading evidence shows user impact.

## Safety / privacy critique

A3 adds no model calls, microphone/audio capture, personal data, external telemetry, permissions, persistence mutation, or social exposure. Speech text is local presentation only. The actor has no authority over curriculum truth, assessment, rewards, ownership, progression, permissions, or backend state, so D-004 remains intact.

## Findings

### Blocking

- **A3-Q-B1 — Stabilize cohesive lifecycle evidence.** Make resize/re-entry observation deterministic without weakening one-actor / zero-tween / stable-listener assertions, then require a clean browser run.
- **A3-Q-B2 — Exercise character-art failure fallback end-to-end.** Fail `/assets/characters/companion-shell.svg` deterministically and verify fallback actor presence, Hub interaction, Place entry/return, and no browser error/ownership regression on desktop and mobile.

### Non-blocking follow-ups

- Keep the bundle/startup warning visible; do not code-split speculatively until loading evidence justifies it.
- Refresh physical Android frame pacing on representative production-density world/actor content; current CI correctness is not an FPS gate.
- When A5 introduces voice/tutor persona, make voice/tone configuration replaceable outside `WorldActor` rendering semantics rather than hard-coding Nova/KidsLive identity.
- The dev debug overlay may overlap product copy at some compact/resized debug-only captures; leave it opt-in and avoid treating debug layout as production polish scope.

## Handoff to A3-F

A3-F should stay tightly scoped to the two blockers above plus any directly related regression polish. Do not begin Experience Engine work. After fixing, rerun focused unit/build evidence, desktop/mobile cohesive actor flow, forced companion-asset failure, and inspect the resulting representative screenshots before deciding whether A3-P may close the phase.
