# KidsLive

A code-first interactive learning universe for children.

## Current work
The project is validating a **React + TypeScript + Phaser** world architecture before committing to mobile packaging. The first implementation is a deliberately busy planet/world spike with a procedural flying character, six learning destinations, camera movement, animated objects, a stress mode, and CI coverage.

Run locally:

```bash
corepack enable
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm e2e
```

## Project reference
Start with [`project/README.md`](project/README.md). It is the durable project HQ containing architecture decisions, medium-sized roadmap tasks, testing/performance strategy, and launch gates.
