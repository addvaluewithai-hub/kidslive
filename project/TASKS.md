# Roadmap — Medium-Sized Work Packages

Statuses: `DONE`, `IN PROGRESS`, `NEXT`, `PLANNED`, `BLOCKED`.

Each item is intentionally a meaningful deliverable, not a list of tiny implementation chores. Implementation details live in PRs/issues when needed.

## A0 — Architecture & performance spike
**Status: IN PROGRESS — final Phaser optimization gate**

Validate the world/runtime direction on representative Android hardware before locking the stack.

Evidence so far:
- Browser CI/build/unit smoke is green.
- Synthetic Phaser stress test found the failure wall: ×4 janks badly and ×10 effectively freezes.
- First realistic production-density Phaser benchmark measured ~24 FPS steady and ~13 FPS busy on the physical Android test device. Subjective jank was light, but these numbers are below the required budget and leave insufficient headroom.

**Next:** run one production-pattern optimization pass (texture baking, off-camera culling/sleeping, bounded pooled effects, less live vector/container overhead) without reducing the intended product density.

**Done when:** the same Android device either (a) reaches a credible production budget — approximately 50–60 FPS steady and 45+ FPS busy with stable pacing — and D-002 is locked to Phaser, or (b) fails that fair optimized gate and D-002 is closed in favor of the Godot fallback.

## A1 — Repository and development foundation
**Status: NEXT after A0 engine decision**

Turn the winning spike into the maintainable project skeleton: package boundaries, formatting/linting, environment handling, typed event contracts, test helpers, PR conventions, build artifacts, and developer scripts.

**Done when:** a clean checkout reaches running app + complete CI with one documented command path and no hidden local setup.

## A2 — Planet hub foundation
**Status: PLANNED**

Build the first production-quality planet hub: camera behavior, touch gestures, responsive composition, place/portal lifecycle, transitions, asset loading strategy, world debug overlay, and deterministic visual state for tests.

**Done when:** six placeholder places can be entered/exited reliably on desktop and mobile with bounded memory and stable frame pacing.

## A3 — Character/actor system
**Status: PLANNED**

Implement the production actor contract and a code-drawn character independent of curriculum and model provider. Include movement, gaze, emotion, gesture, speech-state hooks, interruption behavior, and test actors.

**Done when:** any experience can command an actor through the same interface and tests can replace animation with an instant deterministic actor.

## A4 — Experience Engine v1
**Status: PLANNED**

Create the framework-independent authored learning runtime: step graph, events, success/failure transitions, retries, hints, checkpoints, resume, tool permissions, and content validation.

**Done when:** a multi-step lesson can run entirely headless in tests, including wrong answers, retries, resume, and completion.

## A5 — Tutor/AI orchestration v1
**Status: PLANNED**

Create provider-agnostic tutor contracts, scripted/failure/slow test tutors, live speech/text adapter, tool-call permission enforcement, interruption handling, and transcript/event observability.

**Done when:** the same experience runs with a fake tutor in CI and a live tutor locally without changing curriculum code.

## A6 — English World vertical slice
**Status: PLANNED**

Build one small but complete English learning environment from planet entry to lesson completion. This is the first real product slice, not a tech demo.

**Done when:** a child can enter, meet the actor, complete an authored interactive lesson with at least two interaction types, receive feedback/reward, and return to a visibly changed planet state.

## A7 — Assessment & interactive quiz system
**Status: PLANNED**

Create reusable interaction primitives for choices, sorting/matching, text/voice responses where appropriate, hints, retry feedback, answer normalization, and deterministic scoring.

**Done when:** experiences can compose assessed interactions without embedding assessment truth in UI, renderer, or AI prompts.

## A8 — Progression, XP, streaks, and unlocks
**Status: PLANNED**

Design and implement progression with anti-cheat/server-authoritative boundaries, streak semantics, bonuses, achievements, world unlocks, and child-friendly reward presentation.

**Done when:** progression survives retries/offline sync without duplicate rewards and can be fully simulated in unit tests.

## A9 — Child profile and parent experience
**Status: PLANNED**

Implement account/profile boundaries, age-appropriate setup, parent controls, progress overview, settings, permissions, and data/privacy surfaces needed for a real child product.

**Done when:** parent and child flows are clearly separated and product-sensitive settings cannot be changed from the child surface accidentally.

## A10 — Persistence, backend, and sync
**Status: PLANNED**

Choose and implement the minimal production backend based on proven product needs: identity, progress, content versions, reward ledger, AI session authorization, sync, and migration strategy.

**Done when:** progress is resilient across reinstall/device changes and offline/duplicate writes converge safely.

## A11 — Mobile packaging
**Status: PLANNED**

Package the validated runtime for iOS/Android using the mobile path selected by A0, then solve safe areas, lifecycle/backgrounding, audio focus, microphone permissions, keyboard/input, deep links, native storage, and build configuration.

**Done when:** internal builds on both platforms can complete the English vertical slice with parity to the development runtime.

## A12 — Offline and asset delivery
**Status: PLANNED**

Define bundle boundaries, preload/stream policy, cache versioning, offline lesson behavior, asset compression, CDN/storage strategy, and recovery from interrupted downloads.

**Done when:** a selected learning pack can run without network after download and updates do not corrupt cached content.

## A13 — Safety, moderation, privacy, and observability
**Status: PLANNED**

Implement child-safe model/tool boundaries, privacy/data minimization, telemetry events, error reporting, session diagnostics, abuse/failure handling, and internal review surfaces.

**Done when:** critical AI/tool events are auditable, sensitive data is minimized, and failure modes are visible without exposing child data unnecessarily.

## A14 — Content pipeline and authoring ergonomics
**Status: PLANNED**

Make authored worlds/experiences pleasant to build in code: schemas, generators, validators, previews, fixtures, content tests, and documentation for adding a new place/lesson.

**Done when:** a developer can add a small lesson safely without touching engine internals and CI catches broken references before merge.

## A15 — Second-world validation
**Status: PLANNED**

Build a second materially different experience (candidate: Chess or German) to prove the architecture is reusable rather than overfit to English.

**Done when:** the second world reuses platform contracts and forces no major English-specific rewrites.

## A16 — Product polish, accessibility, and performance hardening
**Status: PLANNED**

Tune animation budgets, asset memory, loading, touch targets, typography, reduced-motion behavior, localization foundations, audio captions, error states, and device-specific performance.

**Done when:** target-device budgets in `PERFORMANCE.md` pass and the vertical slices remain usable under accessibility and failure scenarios.

## A17 — Closed beta
**Status: PLANNED**

Prepare a controlled real-user beta with analytics, feedback loop, crash/performance monitoring, content QA, parent messaging, support process, and rollback strategy.

**Done when:** beta exit criteria are met with known critical issues closed or explicitly accepted.

## A18 — Launch readiness and store release
**Status: PLANNED**

Complete store assets/listings, privacy/legal requirements, production secrets/domains, release builds, final regression, rollback plan, operations ownership, and staged rollout.

**Done when:** every launch gate in `LAUNCH.md` is checked and production can be monitored/rolled back intentionally.
