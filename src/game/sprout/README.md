# Sprout Planet reusable scene kit

The 7-day slice is intentionally built from reusable layers and small procedural/vector-like objects rather than day-sized illustrations.

Core files:

- `SproutWorldScene.ts` — world composition, state-driven visibility, transitions, portrait UI.
- `SproutSceneKit.ts` — reusable leaves, particles, buttons, Nova rig and Lumi rig.
- `SproutAudio.ts` — tiny procedural ambient / river / reveal audio layer with no downloaded audio assets.
- `../../story/sproutStory.ts` — editable day content and habit definitions.
- `../../story/storyStore.ts` — persisted story state, choices, approvals and debug controls.

Run the slice at the normal app URL. Add `?dev=1` to expose developer controls. Existing legacy acceptance tests can still force the old hub using `?runtimeDebug=1`.
