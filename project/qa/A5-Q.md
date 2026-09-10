# A5-Q — Tutor/AI orchestration v1 phase QA / critique

**Phase:** A5 — Tutor/AI orchestration v1
**QA slot:** Q
**Date:** 2026-09-11
**Reviewed main:** `7b489431d54921566c2b43b9ca26516c2430e186`
**Latest reviewed CI:** `34525896943` — quality PASS, Android PASS, browser stage-gate FAILED on first attempt; failed browser job re-run requested during QA and was still in progress when this record was written.

## QA decision

**BLOCKING FINDINGS — proceed to A5-F; do not close A5 or begin A6 yet.**

A5 has a strong provider-neutral orchestration boundary and good deterministic coverage, but phase-level adversarial review found two orchestration/observability defects plus one unresolved regression/evidence blocker on current `main`.

## Evidence reviewed

- A5-D1 through A5-D5 delivery evidence recorded in `project/SESSIONS.md`.
- Current `main` CI `34525896943`: quality job PASS (`format:check`, lint/package boundaries/typecheck, unit/integration tests, production build) and Android debug APK PASS.
- Browser stage-gate first attempt: 15/16 Playwright tests passed; desktop Chromium `cohesive actor flow stays bounded through resize and repeated scene ownership` timed out after 75s while waiting for runtime state. The mobile version of the same test and both current visual-evidence captures passed. A re-run of the failed browser job was requested during Q to distinguish transient runner timing from a reproducible lifecycle regression.
- No live AI/model/TTS provider is used by deterministic A5 tests or CI.
- A5 introduced no React/Phaser rendering/layout/navigation surface, so no new A5-specific screenshot baseline or physical-device performance gate is warranted; existing browser/mobile shell evidence remains the relevant visual regression signal.

## Architecture/product assessment

Strengths retained by the phase:
- `TutorSession` binds observation and educational mutation to one `ExperienceEngine`, preserving A4 as the sole authority for correctness, retries, hints, completion, and tool permissions;
- provider, speech, text, actor, diagnostics, and audit concerns remain behind explicit TypeScript contracts and deterministic substitutes;
- persona/tone/voice are configured separately from curriculum truth and actor renderer identity;
- tutor proposals are bounded and pass through guarded A4 `dispatch()` / `requestTool()` paths;
- malformed, stale, unauthorized, and non-JSON-safe authority proposals fail closed;
- provider timeout/failure and delivery failures are represented without live-service CI dependencies;
- lifecycle diagnostics are data-minimized and omit narration/tool payload content.

## Blocking findings

### B1 — Explicit cancellation does not settle a provider promise that ignores cancellation

`cancelActiveTurn()` marks the token cancelled and clears local active-turn state, but `runTurn()` remains blocked inside `generateProviderOutput()` until the provider promise settles or a configured provider timeout fires. With no timeout configured, a provider that ignores the token and never resolves leaves the caller promise hung indefinitely. Even with a timeout configured, an explicit learner interruption can wait until the timeout boundary instead of settling immediately. The existing cancellation test demonstrates this indirectly: it calls `cancelActiveTurn(...)` and then must manually `provider.resolve(...)` before the pending `runTurn()` can resolve as cancelled.

This contradicts the A5-D4 done-when requirement that failure/cancellation paths reach bounded states with **no hung promises**, and it weakens scene-exit/disposal guarantees for real adapters.

**A5-F requirement:** make cancellation itself participate in the provider race so `runTurn()` settles promptly as `cancelled` even when the provider never cooperates. Preserve late-provider inertness and cancel any timeout handle cleanly. Add deterministic tests for explicit cancel, supersede, and dispose against a never-settling/ignoring provider, both with and without provider timeout configured.

### B2 — Authority-audit sink failure can change product behavior after authority already mutated

`GuardedTutorOutputHost.publish()` applies the authority proposal first, then calls `audit.record(...)`, then forwards downstream. Unlike lifecycle diagnostics, the audit call is not isolated. If an audit adapter throws after an approved command/tool request, A4 authority may already have advanced while downstream narration/actor delivery is skipped; the orchestrator then sees a generic delivery failure. That creates an observability-induced split-brain result: educational state changed, learner-facing delivery did not occur, and the result is labelled recoverable as though delivery were the only effect.

Observability must not be able to corrupt or suppress the authoritative product path.

**A5-F requirement:** contain audit-sink failures so recording is best-effort (or otherwise transactionally ordered without rolling back A4 authority). Add regression evidence proving a throwing audit sink cannot alter whether legal authority and downstream delivery occur, cannot convert an approved authority mutation into a misleading failure result, and cannot leak payload content through diagnostics.

### B3 — Current `main` browser stage-gate is red on a repeated actor lifecycle timeout

The latest `main` CI first attempt failed desktop Chromium in the existing cohesive actor resize/repeated-scene-ownership smoke while quality and Android passed. A substantially similar desktop actor smoke timeout was already observed earlier during A5 delivery, so the phase cannot simply classify this as irrelevant noise without evidence. A5 itself did not intentionally change Phaser rendering, but phase closure requires a trustworthy green regression baseline or a concrete diagnosis proving the failure is infrastructure/test synchronization rather than product lifecycle instability.

**A5-F requirement:** inspect the failed Playwright artifact/trace and the re-run outcome. If reproducible, fix the actor/runtime synchronization regression without adding unrelated scope. If transient, harden only the deterministic wait/synchronization point that is demonstrably flaky and rerun focused desktop/mobile browser evidence. A5 must not advance to P with unexplained red `main` browser evidence.

## Non-blocking findings / follow-ups

- `TutorOrchestrator` accepts an `ObservationSource` directly and therefore can be miswired with caller-fabricated state/events outside the production-facing `TutorSession`. The production composition root correctly binds to one `ExperienceEngine`, so this is not currently an authority bypass. Prefer `TutorSession` as the supported integration surface and avoid exposing standalone orchestration wiring to product code without an authoritative observation source.
- `TutorOrchestrator` itself retains the supplied `providerTimeout` object reference; `TutorSession` snapshots it before construction, so production composition is isolated. If standalone orchestrator construction remains supported beyond tests/internal composition, snapshot timeout configuration there too for consistency.
- A5 intentionally does not solve model-language moderation, parental policy, analytics persistence, or backend telemetry; those remain later safety/privacy/observability roadmap work. The important A5 boundary is that model output still cannot acquire deterministic educational or tool authority.
- Representative physical Android frame-pacing remains deferred until A6 introduces production-density learning-world behavior; A5 made no material rendering-density change.

## Exit criteria for A5-F

A5 can proceed to P only when B1 and B2 are fixed with adversarial deterministic regression coverage, B3 has a concrete green/diagnosed browser result, focused typecheck/lint/tests/build are green, and no new authority/safety/resilience blocker is discovered. If any of these remain unresolved, keep A5 open as an explicit exception rather than beginning A6.
