# A2 Phase QA — Planet Hub foundation

**Review result:** BLOCKING FINDINGS — proceed to A2-F, not A2-P
**Reviewed commit:** `c35c0c4e742fbfad77b02b693d3c8eee96705ab3`
**CI run:** `34407944545`
**Date:** 2026-09-10

This is the dedicated A2-Q review artifact. It is intentionally not the final `project/gates/A2.md`; the phase gate is recorded only after A2-F resolves the blocking findings and focused evidence is rerun.

## Acceptance review

A2 promised a production Planet Hub foundation with camera/touch behavior, responsive composition, six authored place placeholders, transitions, asset loading/lifecycle, development visibility, and bounded runtime behavior.

The implementation is substantially present:

- all six authored places are rendered from one catalog and can be selected, focused, entered, and returned from;
- the place scene is reusable rather than English-specific;
- return restores the selected place/focused hub state while resize deliberately resets to overview;
- authored SVG assets load through typed packs with explicit persistent vs scene ownership;
- loading/error states exist and scene-owned textures are released on shutdown;
- development-only runtime visibility exposes scene/camera/object/tween/asset facts;
- resize and scene shutdown paths explicitly clean listeners/tweens/debug state;
- CI remains deterministic and has no live AI/model dependency.

The phase is therefore feature-complete enough for fix/polish, but not yet safe to close because the focused hub presentation has a visible regression and the asset-failure resilience contract lacks deterministic evidence.

## Deterministic evidence reviewed

Latest main CI `34407944545` completed successfully on the reviewed commit.

- formatting: PASS
- architecture boundary check: PASS
- TypeScript typecheck: PASS
- unit tests: PASS — 16 tests across 5 files
- production build: PASS
- browser/e2e: PASS — 6 Playwright tests across desktop and mobile Chromium
- six-place traversal: PASS on both desktop and mobile projects
- Android debug APK packaging: PASS
- live AI/model dependency: none

The production build emits a non-fatal bundle-size warning: the main JS chunk is approximately 1.40 MB minified / 383 KB gzip. This is recorded below as a follow-up, not an A2 blocker by itself.

## Visual evidence reviewed

Reviewed all eight PNG attachments from Playwright artifact `playwright-qa-34407944545-1` rather than relying only on the job result.

States included:

- desktop overview;
- mobile overview;
- desktop English placeholder;
- mobile English placeholder;
- desktop Music placeholder;
- mobile Music placeholder;
- desktop hub after six-place traversal with Music focused;
- mobile hub after six-place traversal with Music focused.

Overview and placeholder-place states are readable and do not show obvious clipping. The focused-return state is not acceptable yet: the camera shift/zoom moves non-selected place content through the fixed heading area. On mobile this becomes severe, with the hub title/subtitle overlapping planet labels and top content clipping outside the viewport. Desktop shows the same structural issue at lower severity.

## Critique

### Architecture

The implementation respects the documented boundary: world rendering, camera, touch, transitions, asset lifecycle, and debug overlay remain in Phaser/game code. No curriculum truth or future AI authority has leaked into the hub. The single authored place catalog is a useful source of truth and is a suitable seam for A3 actor integration.

One design caveat is that the current hub scene combines camera-world layout and HUD compensation logic manually. That is acceptable for A2, but the focused-state collision demonstrates that the separation is not yet visually robust across camera transforms. Fix the actual composition in A2-F; do not add a new abstraction solely for theoretical cleanliness.

### Product / learning

A2 correctly establishes the planet as a persistent world entry point rather than a plain list. Six places are distinguishable and the enter/return loop is understandable. Placeholder scenes deliberately do not claim to be real learning experiences yet, which matches phase scope.

The focused-state regression weakens spatial orientation: focusing one place should clarify the choice, not make the rest of the world collide with the product heading. This is a blocking product/UX issue because focus is a core A2 interaction, not edge-case polish.

### UX / visual

Overview composition is coherent at 1280×720 and 390×844. Place placeholder layouts are readable in the reviewed English/Music samples and back navigation remains visible.

Focused-return composition fails the bar. On 390×844, the title/subtitle collide with world labels and top planets are partially clipped. On desktop, Math/Science content intrudes into the title region. The Enter and Overview actions themselves remain available, but the state looks broken and reduces readability.

### Resilience

The asset loader has explicit ready/error behavior and a safe fallback visual in code. However, current Playwright coverage only exercises successful local SVG loads. There is no deterministic test that forces an authored asset request to fail and verifies the fallback message plus safe return-to-hub path. Because A2 explicitly introduced asset loading/error behavior, this is unresolved resilience evidence rather than optional future coverage.

Repeated place traversal across all six places gives useful practical lifecycle coverage. Shutdown code explicitly removes resize listeners, kills scene tweens, destroys debug overlays, and releases scene-owned assets. No obvious unbounded allocation occurs in the hub update loop.

### Performance

No new current-product physical-device frame-pacing measurement was produced in A2. The existing A0 Android benchmark remains the framework-selection baseline. For this early placeholder-density hub, the code review and repeated browser traversal show no obvious unbounded update/allocation pattern, so fresh physical FPS evidence is not treated as an A2 blocker. It becomes important again when A3/A6 introduce representative actors, animation, richer art/audio, and real production density.

The 1.40 MB minified main bundle warning is worth tracking; most of that cost is plausibly framework/runtime weight at this stage. Do not derail A2-F into speculative bundling work unless profiling shows a real user-visible startup problem.

### Safety / privacy

A2 introduces no user data, model provider, speech capture, permissions, progression authority, social state, or external service dependency. No new child-safety or privacy boundary is crossed. CI remains deterministic and provider-free.

## Findings

### Blocking — A2-F must resolve

1. **Focused hub composition collides/clips across camera focus, especially mobile.** Fix the selected/focused state so product HUD remains legible and world labels/planets do not visibly collide with the heading or clip in a broken-looking way on the representative desktop/mobile viewports. Preserve touch controls and the intended spatial focus behavior rather than simply removing navigation.
2. **Authored asset failure path lacks deterministic evidence.** Add one focused deterministic browser test using the existing Playwright stack (for example request interception of a place SVG) that proves a failed authored asset produces the safe fallback/error presentation and still allows return to the hub. Do not create new QA infrastructure.

### Non-blocking follow-ups

1. Production build warns that the main JS chunk is ~1.40 MB minified / 383 KB gzip. Revisit startup/code-splitting when there is a representative product-loading problem or during later asset/offline/performance work rather than expanding A2 scope now.
2. Fresh physical Android frame-pacing evidence is not required to fix these A2 blockers at placeholder density, but should be refreshed once actor/vertical-slice rendering density becomes representative.
3. The current browser traversal uses small fixed waits around Phaser transitions. It is passing reliably on current CI; replace waits with stronger runtime synchronization only if flakiness becomes a real regression rather than building test machinery pre-emptively.

## Required A2-F exit evidence

A2-F should stay tightly scoped to the blockers above:

- repair focused hub composition on both desktop and mobile;
- add the deterministic asset-failure exercise and make any product fix it exposes;
- rerun format/lint/typecheck/unit/build plus the affected Playwright desktop/mobile flow;
- directly inspect the refreshed focused-state and failure-state visual evidence;
- if those pass with no new blocker, leave A2 ready for A2-P to record the final stage gate and plan A3.
