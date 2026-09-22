# Phaser Skills Catalog for KidsLive

This is the **routing index** for the Phaser reference skills checked into this repository. Start here, choose the smallest relevant set of skills, then read those skill sections before implementation.

## Compatibility rule

- KidsLive currently uses **Phaser 3.90**.
- Most uploaded skills explicitly document **Phaser 4**.
- Never copy a Phaser 4 API into KidsLive without checking it exists in the installed version.
- Use the skills for design principles, architecture, QA patterns, and API research; project source-of-truth documents override generic guidance.

## Fast routing for KidsLive

| Task | Read these first |
|---|---|
| Make Sprout Planet look production-quality | `game-designer`, `cameras`, `tweens`, `particles`, `filters-and-postfx`, `audio-and-sound` |
| Build reusable layered world locations | `scenes`, `groups-and-containers`, `graphics-and-shapes`, `sprites-and-images`, `loading-assets` |
| Improve Nova / Lumi performance | `animations`, `tweens`, `curves-and-paths`, `audio-and-sound`, `events-system` |
| Improve mobile portrait UX | `scale-and-responsive`, `input-keyboard-mouse-touch`, `text-and-bitmaptext`, `cameras` |
| Scale story from 7 to 30 days | `game-architecture`, `events-system`, `scenes`, `time-and-timers`, `loading-assets` |
| Validate product quality before merge | `game-qa`, `game-designer`, `scale-and-responsive` |
| Evaluate Phaser 4 migration | `v4-new-features`, `game-setup-and-config`, then the implementation-specific skills involved |

## Skill directory

### Product, design & quality

#### [game designer](./01-product-design-quality.md#skill-game-designer)

**Description:** Game UI/UX designer that analyzes and improves the visual polish, atmosphere, and player experience of browser games. Use when a game needs visual improvements, better backgrounds, particles, animations, screen transitions, juice/feel, or overall aesthetic upgrades.

**KidsLive use:** Visual polish, atmosphere, hierarchy, game feel, transitions, and player-facing experience.

#### [game architecture](./01-product-design-quality.md#skill-game-architecture)

**Description:** Game architecture patterns and best practices for browser games. Use when designing game systems, planning architecture, structuring a game project, or making architectural decisions about game code.

**KidsLive use:** System boundaries, story/world state, event flow, maintainability, and scaling Days 8–30.

#### [game qa](./01-product-design-quality.md#skill-game-qa)

**Description:** Game QA testing with Playwright — visual regression, gameplay verification, performance, and accessibility for browser games. Use when writing or running game tests, debugging test failures, or building QA infrastructure. This is the reference skill — use qa-game for the user-facing command.

**KidsLive use:** Playwright E2E, visual regression, persistence tests, performance checks, and mobile QA gates.

### Game setup & runtime structure

#### [game setup and config](./02-runtime-structure.md#skill-game-setup-and-config)

**Description:** Use this skill when creating a new Phaser 4 game instance or configuring GameConfig options. Covers renderer selection, canvas setup, scaling, pixel art, FPS settings, boot sequence, and all config sub-objects. Triggers on: new Phaser.Game, GameConfig, game setup, renderer, pixel art, FPS.

**KidsLive use:** Renderer, game config, boot choices, canvas behavior, FPS and engine setup.

#### [scenes](./02-runtime-structure.md#skill-scenes)

**Description:** Use this skill when working with Phaser 4 scenes. Covers scene lifecycle methods, scene transitions, parallel scenes, scene communication, sleeping, pausing, restarting, and the SceneManager. Triggers on: Scene, scene lifecycle, preload, create, update, scene transition, SceneManager.

**KidsLive use:** Scene lifecycle, transitions, overlays, parallel UI/world scenes, pause/sleep/restart patterns.

#### [events system](./02-runtime-structure.md#skill-events-system)

**Description:** Use this skill when working with the Phaser 4 event system. Covers EventEmitter, scene events, game events, custom events, and event-driven communication. Triggers on: events, on, emit, EventEmitter, scene events, listeners.

**KidsLive use:** Decoupled story events, Nova/world communication, and state-driven reactions.

#### [time and timers](./02-runtime-structure.md#skill-time-and-timers)

**Description:** Use this skill when using timers and time-based events in Phaser 4. Covers TimerEvent, delayed calls, looping timers, the Clock plugin, and time scaling. Triggers on: timer, delay, delayedCall, TimerEvent, Clock, time event.

**KidsLive use:** Authored beat timing, delayed reveals, repeatable ambient motion, and story sequencing.

#### [actions and utilities](./02-runtime-structure.md#skill-actions-and-utilities)

**Description:** Use this skill when working with Phaser 4 utility functions, actions, alignment, grid layout, or batch operations on game objects. Triggers on: align, grid layout, actions, set operations on groups of game objects.

**KidsLive use:** Batch alignment/layout and utility operations across repeated world objects.

### World objects & rendering

#### [graphics and shapes](./03-world-rendering.md#skill-graphics-and-shapes)

**Description:** Use this skill when drawing shapes and graphics in Phaser 4. Covers the Graphics game object, lines, rectangles, circles, arcs, polygons, gradients, fill, stroke, and generated textures. Triggers on: Graphics, draw shape, fillRect, lineStyle, polygon, arc.

**KidsLive use:** Procedural/vector-like world art, masks, paths, gradients, and reusable scene primitives.

#### [sprites and images](./03-world-rendering.md#skill-sprites-and-images)

**Description:** Use this skill when creating Sprites or Images in Phaser 4. Covers factory methods, texture/frame selection, position, scale, rotation, tint, flip, alpha, origin, depth, and the component mixin system. Triggers on: Sprite, Image, this.add.sprite, this.add.image, texture, setTint, setAlpha.

**KidsLive use:** Production sprite/image placement, tint/alpha/depth/origin, and small reusable asset kits.

#### [groups and containers](./03-world-rendering.md#skill-groups-and-containers)

**Description:** Use this skill when using Groups or Containers in Phaser 4. Covers organizing game objects, object pooling, batch operations, and nested transforms with Containers. Triggers on: Group, Container, object pool, getFirstDead, children.

**KidsLive use:** Reusable scene layers, character rigs, object pooling, and nested transforms.

#### [game object components](./03-world-rendering.md#skill-game-object-components)

**Description:** Use this skill when working with Phaser 4 game object components and the mixin system. Covers Transform, Alpha, Tint, Origin, Depth, Flip, Mask, GetBounds, Lighting, and other shared component behaviors. Triggers on: component, mixin, transform, mask, bounds, lighting.

**KidsLive use:** Shared transforms, masks, bounds, depth, lighting-like behaviors, and object composition.

#### [render textures](./03-world-rendering.md#skill-render-textures)

**Description:** Use this skill when using RenderTexture or DynamicTexture in Phaser 4. Covers drawing game objects to textures, dynamic texture creation, snapshot/screenshot, stamps, and off-screen rendering. Triggers on: RenderTexture, DynamicTexture, snapshot, draw to texture, stamp.

**KidsLive use:** Off-screen composition, dynamic textures, snapshots, stamps, and cached layered effects.

#### [v4 new features](./03-world-rendering.md#skill-v4-new-features)

**Description:** Use this skill when learning about new features, game objects, components, and rendering capabilities added in Phaser 4. Covers Filters, RenderNodes, CaptureFrame, Gradient, Noise, SpriteGPULayer, TilemapGPULayer, Lighting component, RenderSteps, and new tint modes. Triggers on: new in v4, Phaser 4 features, RenderNode, SpriteGPULayer, CaptureFrame, Gradient game object, Noise game object, new tint modes. For migrating v3 code to v4, see the v3-to-v4-migration skill instead.

**KidsLive use:** Evaluate Phaser 4 rendering/features before migration; never assume availability in Phaser 3.90.

### Motion, camera & visual effects

#### [animations](./04-motion-camera-vfx.md#skill-animations)

**Description:** Use this skill when creating or controlling sprite animations in Phaser 4. Covers spritesheets, atlases, AnimationManager, AnimationState, play/stop/chain, frame callbacks, and animation events. Triggers on: sprite animation, spritesheet, play animation, animation frames.

**KidsLive use:** Character sprite animation states for Nova/Lumi and reusable environment animation clips.

#### [tweens](./04-motion-camera-vfx.md#skill-tweens)

**Description:** Use this skill when animating properties over time in Phaser 4. Covers tweens, tween chains, easing functions, stagger, yoyo, repeat, callbacks, number tweens, and the TweenManager. Triggers on: tween, ease, animate, this.tweens.add, tween chain, stagger.

**KidsLive use:** Game feel, idle motion, reveals, UI transitions, anticipation/overshoot, and camera-adjacent timing.

#### [cameras](./04-motion-camera-vfx.md#skill-cameras)

**Description:** Use this skill when working with cameras in Phaser 4. Covers camera effects (shake, fade, flash, pan, zoom), following sprites, scroll, bounds, viewports, multiple cameras, and minimap. Triggers on: camera, viewport, scroll, zoom, follow, shake, fade.

**KidsLive use:** Portrait framing, pans/zooms, follow behavior, bounds, transitions, and connected-world illusion.

#### [particles](./04-motion-camera-vfx.md#skill-particles)

**Description:** Use this skill when creating particle effects in Phaser 4. Covers ParticleEmitter, emission zones, death zones, particle properties, textures, gravity wells, and particle movement. Triggers on: particles, emitter, particle effect, explosion, fire, smoke.

**KidsLive use:** Ambient magic, seed/flower/Lumi reveals, environmental dust, and milestone effects.

#### [filters and postfx](./04-motion-camera-vfx.md#skill-filters-and-postfx)

**Description:** Use this skill when applying visual filters or post-processing effects in Phaser 4. Covers bloom, blur, glow, color matrix, barrel distortion, displacement, custom shaders, and the filter pipeline. Triggers on: filter, post-processing, shader, bloom, blur, glow, color effects.

**KidsLive use:** Bloom/glow/blur/color grading and restrained magical emphasis where supported.

#### [curves and paths](./04-motion-camera-vfx.md#skill-curves-and-paths)

**Description:** Use this skill when working with curves and paths in Phaser 4. Covers splines, bezier curves, lines, ellipses, path followers, and mathematical curve types. Triggers on: curve, path, spline, bezier, path follower.

**KidsLive use:** Lumi/Nova movement paths, drifting particles, vines, camera-friendly motion arcs.

### Mobile UX, content & delivery

#### [input keyboard mouse touch](./05-mobile-content-delivery.md#skill-input-keyboard-mouse-touch)

**Description:** Use this skill when handling user input in Phaser 4. Covers keyboard keys, mouse clicks and movement, touch events, pointer handling, drag and drop, hit areas, interactive objects, and gamepad support. Triggers on: keyboard, mouse, touch, pointer, drag, drop, click, input, gamepad, cursor keys.

**KidsLive use:** Mobile touch hit areas, gestures, pointer interactions, drag/drop, and device input behavior.

#### [scale and responsive](./05-mobile-content-delivery.md#skill-scale-and-responsive)

**Description:** Use this skill when making a Phaser 4 game responsive or handling display scaling. Covers ScaleManager, scale modes (FIT, RESIZE, EXPAND, ENVELOP), auto-center, fullscreen, and browser resize handling. Triggers on: ScaleManager, responsive, resize, fullscreen, FIT, scale mode.

**KidsLive use:** 9:16 mobile layout, safe resizing, fit/expand strategy, and browser/native viewport behavior.

#### [text and bitmaptext](./05-mobile-content-delivery.md#skill-text-and-bitmaptext)

**Description:** Use this skill when displaying text in Phaser 4. Covers Text game objects, BitmapText, web fonts, text styling, word wrap, alignment, padding, and dynamic text content. Triggers on: Text, BitmapText, this.add.text, font, word wrap, text style.

**KidsLive use:** Readable mobile typography, hints, dialogue, labels, wrapping, and future localization concerns.

#### [loading assets](./05-mobile-content-delivery.md#skill-loading-assets)

**Description:** Use this skill when loading assets in Phaser 4. Covers the Loader plugin, loading images, spritesheets, atlases, audio, JSON, tilemaps, bitmap fonts, and tracking load progress. Triggers on: preload, this.load, asset loading, spritesheet, atlas, load progress.

**KidsLive use:** Preload strategy, lazy scene assets, compact region kits, progress handling, and memory-friendly delivery.

#### [audio and sound](./05-mobile-content-delivery.md#skill-audio-and-sound)

**Description:** Use this skill when adding audio or sound to a Phaser 4 game. Covers loading audio, playing sounds, music, volume, spatial audio, Web Audio API, and SoundManager. Triggers on: sound, audio, music, volume, mute.

**KidsLive use:** Ambient loops, river sound, authored cues, volume/mute, spatial feel, and emotional timing.

## Standard workflow

1. Open this catalog and identify the task.
2. Read the listed skill sections in the category files.
3. Check Phaser 3.90 / Phaser 4 compatibility before implementation.
4. Adapt the guidance to KidsLive rather than applying generic examples blindly.
5. Run QA and visually inspect the 9:16 experience before calling the task complete.

## Imported skill count

**25 skills** imported from `all phaser skills.zip`.
