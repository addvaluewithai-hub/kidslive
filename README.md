# KidsLive

KidsLive is a mobile-first interactive 2D learning universe for children.

## Locked runtime

- **Phaser 3 + TypeScript** for the living world.
- **React** for product UI and overlays.
- **Capacitor** for Android/iOS packaging and native bridges.
- Pure TypeScript domain logic for curriculum, assessment, progression, rewards, and permissions.

A0 architecture validation is complete. The repository working tree has been reset to a small production starter; benchmark implementations and alternate-engine spikes are intentionally not part of the current source tree.

## Web development

Prerequisites: Node 22 and pnpm 10.17.1.

```bash
pnpm install
pnpm dev
```

## Quality checks

The deterministic local checks do not require a live AI/model provider.

```bash
pnpm format:check
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

`pnpm ci` runs the repository checks plus browser e2e locally when Playwright Chromium is installed.

## Android debug build

Prerequisites: Node 22, pnpm 10.17.1, JDK 21, and an Android SDK available to Gradle.

From a clean checkout:

```bash
pnpm install
pnpm build
pnpm android:add
pnpm android:sync
cd android
./gradlew assembleDebug
```

The installable debug APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions runs the same build path on `main` and uploads the APK as a CI artifact.

For project context, read `project/README.md`, then `project/DECISIONS.md`, then `project/TASKS.md`.

**`main` is authoritative. Historical PRs/branch names are not product direction.**
