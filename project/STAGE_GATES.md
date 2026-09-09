# Stage Gates

Every roadmap phase ends with a small evidence-based critique before the next phase starts. The purpose is to catch architectural drift, product weakness, visual regressions, hidden setup, performance risk, and safety problems while they are still cheap to fix.

## Transition rule
A phase may move to `DONE`, and the following phase may become `NEXT`, only when its gate is recorded as `PASS` or `PASS WITH FOLLOW-UP`.

`PASS WITH FOLLOW-UP` is allowed only for a clearly non-blocking issue that does not undermine the next phase or hide a regression. Blocking uncertainty stays in the current phase.

If the gate is `BLOCKED`, keep working on the same phase. Do not skip ahead merely because later work is more interesting.

## Gate loop
1. **Acceptance check** — compare the implementation against the phase's `Done when`/scope and current architecture decisions.
2. **Deterministic QA** — run the relevant typecheck, unit, integration, content/schema, browser, and failure-path tests.
3. **Visual evidence** — inspect desktop and mobile screenshots for every materially changed surface/state. Add named fixtures or screenshot baselines when a surface becomes stable enough to protect.
4. **Architecture critique** — check domain/UI/renderer/adapter boundaries, hard-coded audience/character assumptions, ownership/permission seams, and whether temporary shortcuts leaked into production APIs.
5. **Product/learning critique** — ask whether the current slice makes the intended user loop clearer, more useful, more engaging, and educationally deterministic rather than merely adding machinery.
6. **Resilience critique** — inspect loading, slow/failure/offline/permission states whenever the phase introduces a dependency that can fail.
7. **Performance critique** — use CI for deterministic budgets and representative physical Android evidence whenever rendering density, assets, effects, React overlays, lifecycle, or audio changes materially.
8. **Safety/privacy critique** — review permissions, child boundaries, data minimization, model/tool authority, ownership, and future social exposure when relevant.
9. **Fix and rerun** — resolve blocking findings, regenerate evidence, and repeat the gate.
10. **Record decision** — write the short gate record and only then advance the roadmap.

## Required gate record
Create `project/gates/A<N>.md` for each completed phase using this shape:

```md
# A<N> Stage Gate — <phase name>

**Decision:** PASS | PASS WITH FOLLOW-UP | BLOCKED
**Commit/PR:** <reference>
**Date:** YYYY-MM-DD

## Acceptance
- What the phase promised.
- What is actually complete.

## Automated evidence
- Typecheck/build:
- Unit/integration:
- Browser/e2e:
- Content/schema, if applicable:
- Relevant CI run/artifacts:

## Visual evidence
- Desktop states reviewed:
- Mobile states reviewed:
- Approved screenshot baselines, if any:
- Visual issues found/fixed:

## Critique
- Architecture:
- Product/learning:
- UX/visual:
- Resilience:
- Performance:
- Safety/privacy:

## Findings
### Blocking
- None, or explicit blockers.

### Non-blocking follow-ups
- None, or narrowly scoped follow-ups.

## Decision rationale
Why it is safe, or not safe, to begin the next phase.
```

## Evidence expectations by phase maturity
Early foundation phases may have simple visual evidence because there is little product UI, but they still require architecture and setup critique. Product-facing phases must capture representative visual states rather than one happy-path screenshot. Later phases should grow regression coverage instead of relying only on subjective review.

A visual snapshot passing does not prove the UX is good; it proves it did not unexpectedly change. The critique is responsible for judging whether the intended design itself is good enough to advance.

## CI boundary
CI must remain deterministic and must never require a live AI/model provider. Automated critique may use the artifacts outside CI, but the merge/build gate itself must remain reproducible with scripted/fake adapters.
