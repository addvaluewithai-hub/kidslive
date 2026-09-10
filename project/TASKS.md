# Roadmap

Statuses: `DONE`, `IN PROGRESS`, `NEXT`, `PLANNED`.

## Product-direction constraints
These are architectural constraints, not near-term scope commitments:

1. **Learning should change the user's world.** Progression is not only numeric: earned XP/rewards may build, unlock, upgrade, or customize persistent personal spaces and objects such as a home, garden, vehicle, rooms, collections, and future functional objects.
2. **The core platform must be audience- and character-agnostic.** KidsLive is child-first today, but domain/runtime code must not assume one age group, one companion, one art direction, one reward vocabulary, or one presentation style. A future teen/adult experience should be possible by changing audience/theme/content packs rather than rewriting the learning platform.
3. **Personal worlds must not assume permanent isolation.** v1 can be private, but ownership, identity, visibility, and permission boundaries should leave room for future safe visits, viewing other users' spaces, shared places, and possibly richer multiplayer/social experiences.
4. **Social features are deliberately future scope.** Do not build realtime multiplayer early. Preserve the architectural option while product value, child safety, moderation, identity, parental controls, privacy, and interaction models are proven first.
5. **AI remains bounded.** Characters, themes, and social context may change, but curriculum truth, assessment, rewards, ownership, progression, permissions, and safety-critical state remain deterministic product authority.

## A0 — Architecture & performance selection
**Status: DONE**

Selected Phaser + React + Capacitor after physical Android comparison. Benchmark implementations are disposable evidence and have been removed from the working tree.

## A1 — Repository and development foundation
**Status: DONE**

Turn the clean starter into the maintainable production skeleton: package boundaries, lint/format rules, environment handling, typed world/domain events, adapter interfaces/test doubles, mobile build path, test helpers, CI artifacts, and developer scripts.

Foundation boundaries must avoid hard-coding the current child audience, companion identity, visual theme, currency/reward names, or a permanently single-user/private-world assumption. Establish explicit seams for audience/theme configuration, profile identity, world ownership, and future visibility/permission models without implementing future social features yet.

**Done when:** a clean checkout reaches running web + installable Android build + complete CI through documented commands, with no benchmark-only code or hidden local setup, and the core package boundaries can support alternate character/theme/audience implementations without framework rewrites.

## A2 — Planet hub foundation
**Status: DONE**

Build the production planet hub: camera/touch behavior, responsive composition, six authored place placeholders, transitions, asset loading/lifecycle, debug overlay, and bounded memory/performance. Treat the hub as the user's persistent world entry point rather than a disposable level-select screen.

**Gate:** `project/gates/A2.md` — PASS WITH FOLLOW-UP on 2026-09-10. Non-blocking follow-ups are deferred bundle/startup profiling, representative Android frame-pacing at actor/vertical-slice density, and stronger transition synchronization only if real CI flakiness appears.

## A3 — Character/actor system
**Status: DONE**

Build a character-agnostic companion system in Phaser TypeScript behind `WorldActor`; port reusable renderer-independent behavior/assets from the Pixi prototype and add deterministic test actors. The first KidsLive companion is an implementation/configuration of the actor system, not an identity baked into domain logic. Character, voice, animation set, tone, and presentation must remain replaceable for future audiences and themes.

**Gate:** `project/gates/A3.md` — PASS WITH FOLLOW-UP on 2026-09-10. Non-blocking follow-ups are measured bundle/startup profiling only if user-impact evidence appears, representative physical Android frame pacing at A6 density, and preserving replaceable voice/tone/persona seams in A5.

## A4 — Experience Engine v1
**Status: DONE**
Authored step graph, events, assessment transitions, retries, hints, checkpoints/resume, tool permissions, and content validation in pure TypeScript. Experience definitions describe educational intent independently from a specific character or visual skin.

**Gate:** `project/gates/A4.md` — PASS WITH FOLLOW-UP on 2026-09-10. Non-blocking follow-ups are representative large-content performance measurement in A6/A15, preserving the guarded A4 authority API as A5's only educational mutation boundary, and treating checkpoints as untrusted input when A11 persistence arrives.

## A5 — Tutor/AI orchestration v1
**Status: DONE**
Provider-independent tutor contracts, scripted/failure/slow test tutors, speech/text adapter, tool permissions, interruption handling, and event observability. Tutor persona/tone is configurable separately from curriculum truth and actor rendering.

**Gate:** `project/gates/A5.md` — PASS WITH FOLLOW-UP on 2026-09-11. A5 closed with provider-neutral orchestration, guarded A4 authority bridging, cancellation/timeout/failure containment, data-minimized lifecycle diagnostics, and deterministic offline provider/speech fixtures. Non-blocking follow-ups are real vertical-slice runtime integration and representative Android frame pacing in A6, native audio lifecycle in A12, and production telemetry/privacy integration in A14.

## A6 — English World vertical slice
**Status: IN PROGRESS**
One small complete learning environment from planet entry through authored lesson, interactions, feedback/reward, and return to changed planet state. Prove the core loop: enter world → learn/interact → deterministic assessment → reward → visible persistent change → return.

This is a platform/product proof slice, **not the full English curriculum**. Full curriculum production begins only after the development roadmap is complete.

## A7 — Assessment & reusable interactions
**Status: PLANNED**
Choice, matching/sorting, text/voice where appropriate, hints/retries, normalization, deterministic scoring.

## A8 — Progression, XP, economy, streaks & unlocks
**Status: PLANNED**
Reward ledger, XP, currencies/resources where justified, streak semantics, unlocks, achievements, grants/spends, offline/duplicate safety, and explicit separation between learning mastery and reward presentation. The reward model must support future building/customization without coupling individual lessons directly to specific house/world objects.

## A9 — Personal World v1
**Status: PLANNED**
Create the first persistent user-owned life layer: home, garden, vehicle and/or equivalent initial spaces; owned objects; placement/customization; upgrades; unlock requirements; reward spending; collections; and visible state changes driven by progression.

Model personal-world state using generic ownership and space/object concepts so future themes can replace a child's house/garden/car with materially different environments for teens or adults. Start private-only, but store ownership/visibility concepts in a way that does not block safe future visits or shared spaces.

## A10 — Profile, audience policy & parent experience
**Status: PLANNED**
Build a generic underlying user/profile model plus the child-specific policy layer required by KidsLive: parent controls, progress overview, permissions, privacy/settings surfaces, age-appropriate defaults, and protected boundaries. Keep audience-specific policy and presentation separate enough that future teen/adult products can use different controls and UX without replacing the core progression/world model.

## A11 — Persistence/backend/sync
**Status: PLANNED**
Minimal production backend based on proven vertical-slice and personal-world needs. Persist learning progress, rewards/economy, ownership, personal-world state, profile/policy state, and sync semantics safely. Design identifiers and ownership boundaries so a later social graph or world-visit system can be added without migrating from an implicitly single-user data model.

## A12 — Mobile hardening
**Status: PLANNED**
Android/iOS packaging, lifecycle, safe areas, audio focus, microphone, keyboard/input, deep links, storage, build configuration.

## A13 — Offline/assets
**Status: PLANNED**
Bundle/cache/download strategy, content versioning, compression, recovery, and offline-safe handling for authored worlds and personal-world assets.

## A14 — Safety/privacy/observability
**Status: PLANNED**
Child-safe model/tool boundaries, data minimization, telemetry, errors, auditability, ownership/permission auditing, and foundations that future social features must pass through rather than bypass. Social safety must be an architectural boundary, not a later moderation patch.

## A15 — Content, audience & theme pipeline
**Status: PLANNED**
Schemas, generators, validators, previews, fixtures, content tests, and authoring docs. Support separation between educational content, actor/persona configuration, audience/tone rules, and visual/theme packs so the same platform can support different age groups and product presentations.

## A16 — Second-world validation
**Status: PLANNED**
Build a materially different second learning world (candidate: Chess or German) without architecture rewrites. Validate not only content reuse but also that progression, rewards, actor contracts, and personal-world effects remain generic.

## A17 — Alternate-theme/audience validation
**Status: PLANNED**
Before treating the platform as truly reusable, create a small non-production alternate presentation proving that the core can swap companion identity, visual style, terminology, reward presentation, tone, and age-oriented UX rules without rewriting curriculum/progression/ownership engines. This can be a thin teen/adult prototype rather than a second launched product.

## A18 — Polish/accessibility/performance
**Status: PLANNED**
Animation/assets/loading/touch/typography/reduced motion/localization/audio captions and device hardening across learning worlds and the personal-world layer.

## A19 — Closed beta
**Status: PLANNED**
Analytics, learning/product feedback, retention signals, crash/performance monitoring, support and rollback. Specifically test whether learning-driven world progression gives users a reason to return, not only whether individual lessons work.

## A20 — Launch
**Status: PLANNED**
Store/privacy/legal/release/ops/staged rollout readiness for the child-first product. Public release does not require social/multiplayer features.

## A21 — Social foundations
**Status: PLANNED — POST-LAUNCH / FUTURE VISION**
Only after the single-user product, safety model, and personal-world value are proven: introduce safe identity/relationship concepts, world visibility, approved visitors, viewable world snapshots, parent/age policy, reporting/moderation/audit requirements, and asynchronous visit experiments. Prefer the least risky interaction model that proves user value before realtime presence.

## A22 — Shared places / multiplayer experiments
**Status: PLANNED — LONG-TERM VISION**
Explore users meeting in bounded shared places, co-presence, cooperative activities, or richer world visits. Realtime multiplayer is one possible implementation, not a product assumption. Any experiment must preserve deterministic learning authority, privacy, age-appropriate identity, permission controls, moderation, abuse prevention, and the ability to disable social systems without breaking the core learning/personal-world experience.

# Post-development curriculum production

Curriculum production begins **only after A0–A22 are complete**. These phases must not interrupt, reorder, or expand the current development roadmap. Until A22 is finished, curriculum work below is planning-only future scope.

Each full curriculum gets its **own roadmap phase** so curriculum design, authored lessons, assessment coverage, progression mapping, content QA, accessibility, and release readiness can be treated as one coherent body of work rather than mixed across subjects.

Curriculum phases should use the same session cadence as development phases: up to five substantial delivery sessions, then dedicated QA, Fix/Polish, and Planning/transition sessions. The detailed five-session decomposition should be created only when the immediately preceding phase reaches its Planning session.

The initial curriculum sequence follows the six authored learning places already present in the product. The exact subject order may be revised at the end of A22 without changing the rule that one complete curriculum occupies one phase.

## A23 — English curriculum production
**Status: PLANNED — AFTER DEVELOPMENT**
Build the full English curriculum on top of the completed platform: curriculum map, authored units/lessons, deterministic assessments, progression/reward integration, companion/tutor embodiment, content validation, accessibility, and curriculum-level QA. Reuse A6 evidence but do not treat the A6 vertical slice as curriculum completion.

## A24 — Science curriculum production
**Status: PLANNED — AFTER DEVELOPMENT**
Build the full Science curriculum as its own authored program using the shared experience, assessment, progression, tutor, world, and content pipelines without subject-specific platform rewrites.

## A25 — Math curriculum production
**Status: PLANNED — AFTER DEVELOPMENT**
Build the full Math curriculum as its own authored program with deterministic mastery/assessment semantics, reusable interactions, progression integration, and curriculum-level QA.

## A26 — Chess curriculum production
**Status: PLANNED — AFTER DEVELOPMENT**
Build the full Chess curriculum as its own authored program, validating that the platform can support materially different instructional structure and interactions while preserving shared learning authority and progression boundaries.

## A27 — Art curriculum production
**Status: PLANNED — AFTER DEVELOPMENT**
Build the full Art curriculum as its own authored program, including appropriate creative interactions, authored guidance, progression, accessibility, and deterministic product authority where scoring/rewards are involved.

## A28 — Music curriculum production
**Status: PLANNED — AFTER DEVELOPMENT**
Build the full Music curriculum as its own authored program, including audio-aware interactions, authored instruction, progression, accessibility/captioning needs, and deterministic assessment/reward boundaries where applicable.

## Additional curricula
Any curriculum added beyond the initial six must be appended as **one new roadmap phase per curriculum**. Do not combine multiple full curricula into a single phase merely to shorten the roadmap.
