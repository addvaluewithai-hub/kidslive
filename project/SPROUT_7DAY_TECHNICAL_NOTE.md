# Sprout Planet — 7-Day Vertical Slice Technical Note

## Engine choice: Phaser

For this experiment I chose Phaser rather than Godot.

The product being tested is a portrait-first 2D / subtle-2.5D story application with a large amount of ordinary mobile UI around the world: daily habits, a planet map, a practical parent dashboard, approvals, and eventually a web-native Nova conversation runtime. KidsLive already ships React + Phaser + Capacitor, so Phaser lets the world and the app share one TypeScript codebase and one mobile packaging path.

Godot remains a strong option if KidsLive later becomes a movement-heavy 3D adventure. For this specific art and interaction target, it would add a second UI/runtime stack without materially improving the core experiment.

## What the first world scene proved

The slice uses a 1440×1280 continuous world viewed through a 720×1280 portrait camera. Landing Meadow and River Clearing live in the same world space. The camera pans between them while a foreground vegetation layer crosses the camera, which creates exploration continuity without a loading-screen cut.

The world is assembled from independent layers and objects:

- gradient sky
- drifting cloud layer
- mountain-depth layers
- mist
- ground texture
- meadow trees
- river and animated wave marks
- main tree
- path vegetation
- glowing clue
- seed
- two persistent flower variants
- Nova rig
- Lumi rig
- shelter frame and finished shelter
- hidden-path vegetation
- Whisper Woods silhouette layer
- ambient sparkle fields
- foreground leaves

The implementation does not contain any day-sized background illustration.

## Reusable art / asset count

This prototype intentionally uses **zero external full-screen illustration assets** and **zero external audio files**.

The visual kit is composed inside Phaser from a small set of reusable primitives: circles, ellipses, triangles, rounded rectangles, lines, container rigs, and procedural sparkle/leaf helpers. Nova and Lumi are lightweight reusable rigs made from those primitives and animated by tweens.

In a production art pass, these primitives can be replaced selectively with small SVG/WebP assets while keeping the same scene graph and state system. A realistic production kit for a region would likely be tens of small reusable assets, not one giant illustration per day.

## Story/content workflow

Story content is separated from rendering.

`src/story/sproutStory.ts` defines the day content:

- day
- location
- entry state
- hint
- intro line
- required habit threshold
- story event IDs
- authored resolved line
- next-day hook

`src/story/storyStore.ts` owns persistent deterministic state and applies event effects. The renderer reads that state and updates individual objects.

Days 8–30 should therefore be produced primarily by:

1. authoring additional `DayDefinition` entries,
2. adding a small number of reusable story event handlers when a genuinely new behavior is introduced,
3. adding or reusing scene objects/regions,
4. testing transitions and persistent consequences in developer mode.

A new day should not require a new scene class unless it introduces a genuinely new location.

## Persistent choice model

Day 3 is implemented as branch → persistent consequence → converge.

- water choice → water flower near the river
- tree choice → moon flower under the main tree
- the chosen flower remains visible
- both branches converge on Lumi and the main story

This makes the choice visible without doubling the campaign.

## Parent approval

The habit architecture supports `child_trust` and `parent_approval` per habit. In the slice, `رتّب سريرك` enters a pending state until the parent dashboard confirms it. The story only counts approved habits as complete.

## Nova architecture

Nova conversation is behind `NovaConversationProvider`.

The slice includes:

- `MockNovaProvider`
- `LiveNovaProvider` interface seam
- a filtered story-context builder that exposes only already-discovered state

The live provider is intentionally not pretending to be connected: KidsLive does not currently contain the secured Gemini Live backend from PixiLive. The next integration should port that transport behind this provider contract rather than coupling story code directly to Gemini.

Authored story reactions remain deterministic even after live conversation is added.

## Audio

The prototype uses Web Audio to avoid shipping placeholder media:

- quiet two-note ambient pad
- filtered noise river layer that fades in near River Clearing
- discovery/reveal chimes
- Lumi cue
- larger Day 7 chord

Production should replace or augment these with a compact mastered sound kit, but the emotional timing pipeline already exists.

## Developer mode

Use `?dev=1` to expose controls for:

- Day 1–7 jump
- instant trusted-habit completion
- parent approval
- next day
- water/tree seed choice
- spawn Lumi
- shelter 0/1/2
- hidden path unlock
- Nova mock/live switch
- full reset

State persists in localStorage outside reset actions.

## What was easy

- portrait composition and fixed mobile HUD
- layered scene construction
- parallax and foreground occlusion
- object-level state changes
- camera movement between two locations
- persistent choices
- React/Capacitor compatibility because the game remains in the existing stack
- building UI and world from the same TypeScript product state

## What became difficult

The hard part is not rendering. The hard part is authoring polish:

- making every daily reveal feel distinct without adding one-off systems
- staging camera, Nova, Lumi, audio, and object changes so they feel intentionally directed
- preserving a calm visual hierarchy on a small portrait screen
- adding more regions without letting scene code become a pile of special cases

Those are content-production problems more than engine limitations.

## Recommendation

Continue this product direction in Phaser for the next proof.

The 7-day architecture is compatible with a full 30-day planet as long as we keep the rules that this slice establishes:

- a small number of authored locations
- many object states, not many full-screen backgrounds
- story configuration separate from renderer code
- new event handlers only for genuinely new behaviors
- persistent deterministic world state
- authored core story moments + live Nova conversation as a separate layer

Reconsider Godot only if future product decisions move the child experience toward free-roaming 3D character control rather than a directed 2D/2.5D living story world.
