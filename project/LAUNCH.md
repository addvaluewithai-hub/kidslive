# Launch Gate

This checklist is intentionally high-level. `TASKS.md` contains the work packages that produce these outcomes.

## Product
- [ ] Planet hub feels intentional and polished, not like a menu with animation.
- [ ] At least one complete learning world is launch-quality.
- [ ] A second distinct world validates platform reuse.
- [ ] Actor/tutor behavior is responsive, child-appropriate, and failure-tolerant.
- [ ] Quizzes/assessment, progression, rewards, streaks, and unlocks are coherent.
- [ ] Parent and child experiences are clearly separated.

## Engineering
- [ ] CI is green and deterministic with no live-AI dependency.
- [ ] Production backend and migrations are tested.
- [ ] Offline/cache/update behavior is defined and tested.
- [ ] iOS and Android release builds pass the critical-flow suite.
- [ ] Performance budgets pass on fixed target devices.
- [ ] Crash/error/AI-tool observability is live.
- [ ] Rollback/release ownership is documented.

## Safety & privacy
- [ ] Model/tool permissions are enforced outside prompts.
- [ ] Child data collection is minimized and documented.
- [ ] Parent controls and consent/age flows match launch requirements.
- [ ] Transcripts/telemetry retention and access policies are explicit.
- [ ] Content and AI failure review process exists.

## Content
- [ ] Content schemas compile with no broken references or unreachable required steps.
- [ ] Learning objectives and answer truth have human review.
- [ ] Audio/text/localization/captions are QA'd for launch content.
- [ ] Content versioning supports safe rollout and rollback.

## Operations & distribution
- [ ] Production domains/secrets/services are owned and monitored.
- [ ] App-store metadata, screenshots, privacy declarations, and policies are complete.
- [ ] Support/feedback path exists for parents.
- [ ] Staged rollout and launch-day monitoring plan are ready.
