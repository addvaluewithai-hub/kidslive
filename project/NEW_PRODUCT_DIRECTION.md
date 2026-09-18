# KidsLive — New Product Direction

**Status:** Current product direction / handoff source of truth  
**Date fixed:** 2026-09-19  
**Supersedes:** the previous "educational worlds / curriculum-first" product direction for new product decisions.

> Existing educational architecture, roadmap, and prototypes remain in the repository as useful technical history. They should **not** be treated as the active product brief unless this document explicitly reuses a piece of them.

---

## 1. The pivot in one sentence

KidsLive is becoming a **child-focused habit-building companion with an AI character (Nova) and a small, magical 3D adventure world that grows and unlocks as the child completes real-life habits**.

It is **not primarily an educational app anymore**.

It is also **not primarily a house-decoration or car-customization game**. Those were explored as reward ideas, but they are no longer the core direction.

---

## 2. The product idea

The strongest part of the concept is now:

1. The child has a small set of real-life habits / routines.
2. Nova acts as the friendly AI companion around those habits.
3. Completing habits earns meaningful progression resources such as **Sparks** and milestone items such as **Star Keys**.
4. Progress changes a playable 3D world in visible ways.
5. New areas, short adventures, Nova abilities/cosmetics, collectibles, story beats, and mini experiences unlock over time.
6. The child comes back because they want to see **what happens next in their world with Nova**, not merely because a counter went up.

The intended emotional loop is:

**Do something good in real life → Nova notices and celebrates → the world changes → something new becomes reachable → curiosity pulls the child back tomorrow.**

---

## 3. Core product loop

A concrete version of the loop:

**Habit → Spark → visible world change → milestone/key → new adventure/zone → return tomorrow**

Example:

- Drink water → +1 Spark.
- Read for 20 minutes → +1 Spark.
- Move your body → +1 Spark.
- First Spark makes the central tree grow.
- Second Spark repairs / extends a bridge.
- Third Spark powers a Star Gate.
- The completed day can award a **Star Key**.
- Several Star Keys unlock a new short adventure or zone.

The exact currency names and numbers are not final. The important rule is that rewards must produce **visible, emotionally meaningful change**, not just sit in a wallet.

---

## 4. Nova is central, not decorative

Nova should be one of the strongest reasons to use the product.

Nova is envisioned as:

- a persistent companion in the 3D world;
- a friendly conversational AI agent;
- aware of the child's allowed habit/progress context;
- able to encourage, celebrate, explain, suggest small challenges, and participate in adventures;
- visually reactive to progress;
- progressively unlockable/evolvable through expressions, animations, cosmetics, abilities, companions, or story moments.

Nova should **not** become the authority for deterministic game state. The AI may speak about progress, but deterministic product code should remain authoritative for:

- whether a habit was completed;
- earned Sparks / keys;
- unlocks;
- inventory/ownership;
- world mutations;
- permissions and parental rules.

This keeps the world consistent even if the model fails, disconnects, hallucinates, or is offline.

---

## 5. Reward direction

### Strong reward candidates

The current reward hierarchy, roughly from most interesting to more optional:

1. **Unlocking new adventure zones**
2. **World transformation** — trees grow, bridges appear, gates power on, landmarks evolve
3. **Nova progression** — new expressions, powers, animations, looks, trails, accessories
4. **Short story chapters / quests**
5. **Mini adventures / mini-games**
6. **Collectibles / creatures / artifacts / badges**
7. Optional cosmetics

### Ideas deliberately moved out of the core

The following may return later as side systems, but should **not drive the product now**:

- decorating a bedroom as the primary progression loop;
- buying sofas/furniture as the primary reason to complete habits;
- car ownership/customization as a main progression pillar.

The earlier house/car exploration was useful because it exposed the real question: **what would a child genuinely want to earn tomorrow?**

The answer currently looks much closer to **discovery, progression, Nova, and adventure**.

---

## 6. World direction

We want a **real 3D world**, but not "Minecraft" in scope.

The target is:

- compact, authored 3D zones;
- stylized / toy-like / soft low-poly art direction;
- mobile-friendly;
- third-person or slightly elevated adventure camera;
- a controllable child/avatar;
- Nova physically present and following/leading/reacting;
- portals or transitions connecting zones;
- interactive landmarks;
- strong environmental transformation tied to habits.

Think **small magical adventure spaces**, not a giant sandbox.

A useful structure could be:

- **Star Meadow** — first safe home/adventure zone
- forest zone
- moon / space zone
- underwater zone
- cloud / sky zone
- future themed worlds

Each zone should be small enough to make beautifully and deeply interactive rather than large and empty.

---

## 7. First world: Star Meadow

The first proof-of-direction is **Star Meadow**.

The desired experience:

- child/avatar can move around;
- Nova follows as a companion;
- three demo habits are available;
- each completion grants a Spark;
- progress physically changes the environment;
- a tree grows;
- a broken path/bridge becomes traversable;
- a Star Gate powers up;
- completing the loop makes the next adventure feel reachable.

The important thing to test is not "can Godot render a meadow?". It is:

> **Does completing a real-life habit feel satisfying because it immediately affects a world the child cares about?**

---

## 8. Current technical direction

### 3D engine candidate: Godot

Godot is currently the strongest candidate for the new world direction.

Why:

- proper 3D scene editor;
- character/world/camera workflow is native rather than simulated;
- animation, lighting, navigation, materials, particles and imported 3D assets fit the problem directly;
- can target mobile and Web for prototypes;
- lightweight enough for an indie-scale product;
- much better fit for a world/adventure product than trying to stretch Phaser into 3D.

This is a **directional choice, not an irreversible lock-in yet**. The next prototypes should prove production visual quality and mobile feel before declaring the engine decision permanent.

### Phaser

Phaser was originally selected for the educational game's 2D gameplay. It was not a bad choice for that problem.

For the new 3D adventure direction, Phaser should **not** be assumed to remain the world engine.

### 3D asset pipeline

The prototype currently uses procedural/basic geometry to validate the loop. That is not the intended production art quality.

The next visual proof should test a fast asset workflow such as:

**concept art / ImageGen → generated or authored 3D asset → cleanup/optimization → GLB import → Godot materials/animation/gameplay**

Potential tooling can include AI 3D generation services such as Meshy or similar tools, plus conventional modeling/cleanup when needed. No specific vendor is locked yet.

### AI / Gemini

Nova remains intended to have real AI capability. Earlier Gemini work and provider-boundary thinking are still relevant.

Rules that should survive the pivot:

- do not ship API keys in the client;
- use a secure server-side boundary;
- strict timeouts/cancellation/fallbacks;
- AI handles language/personality/coaching, not deterministic game authority;
- core CI should remain able to run without a live model provider.

---

## 9. Prototype already in the repo

A separate Godot adventure spike was added specifically for this new direction:

`prototypes/godot-adventure-world/`

Current relevant commits:

- `190e3a77b074d08c212746a13d691ba401c9447e` — Add Godot Star Meadow adventure spike
- `c4bc3a5ab96d4ebeabcfc585d3f7fa5ee18ea2fd` — Polish Star Meadow adventure presentation

There is also a dedicated GitHub Actions workflow:

`.github/workflows/godot-adventure-spike.yml`

It validates the Godot project, exports a Web build, renders a real screenshot from Godot, and uploads both as CI artifacts.

The latest polished Godot adventure workflow had passed at the time this document was written.

---

## 10. What the current prototype proves — and does not prove

### It proves enough to continue exploring

- Godot can host the basic world loop cleanly.
- Avatar + Nova + 3D environment + habit-driven world mutation is technically straightforward.
- Web export and automated rendering work in CI.
- The new loop is materially closer to the product idea than the earlier furniture/home prototype.

### It does NOT yet prove

- production-level art quality;
- final Nova character quality;
- final player character quality;
- mobile touch feel;
- final camera/control scheme;
- real AI conversation inside the 3D world;
- parental habit setup / approval model;
- long-term retention;
- final economy/progression balance;
- safe child-facing social features.

The current primitives should never be mistaken for the visual ceiling of the concept.

---

## 11. What to build next

The next work should be highly visible and should answer product questions rather than build generic infrastructure.

### Next vertical proof

Build one **small but production-looking Star Meadow loop**:

1. Strong stylized environment assets instead of primitive shapes.
2. Canonical Nova 3D model/rig or a convincing temporary production-quality substitute.
3. A child/avatar with good movement and animation.
4. Mobile-friendly movement/camera controls.
5. Three habits connected to immediate world reactions.
6. One genuinely exciting unlock: complete bridge + powered portal + glimpse/entry into the next zone.
7. Nova reaction/animation to each completion.
8. Optional first bounded Gemini interaction if the secure server path is ready.

The goal is to answer:

> **Would a child want to come back tomorrow to progress this world with Nova?**

If that answer is weak, change the product loop before adding backend scale or large content systems.

---

## 12. Explicit non-goals for now

Do **not** accidentally turn this into:

- a Minecraft clone;
- a huge procedural open world;
- a crafting/mining survival system;
- a furniture catalog with habits attached;
- a car customization product;
- a multiplayer/social network in the first release;
- a large curriculum platform;
- a complicated virtual economy before the reward loop is proven.

We want a **small magical world with strong meaning**, not a large world with lots of systems.

---

## 13. Product principles

Keep these principles visible during future decisions:

- **Real life comes first.** The game rewards healthy action outside the game rather than maximizing screen time.
- **Every important reward should be felt, not merely counted.**
- **Nova is a relationship layer, not a chatbot bolted onto menus.**
- **The world should visibly remember progress.**
- **Small authored worlds beat large empty worlds.**
- **One delightful loop beats ten shallow systems.**
- **AI language can be flexible; progression authority must be deterministic.**
- **Production visuals matter early.** Do not hide weak product experience behind infrastructure work.
- **Mobile performance is a first-class constraint.**
- **Child safety and parental control are product architecture, not late compliance work.**

---

## 14. Important open product questions

These are intentionally **not decided yet** and should be discussed in the next conversation rather than silently assumed:

- Exact child age range.
- Who creates/approves habits: parent, child, Nova, or a combination.
- How habit completion is verified, if at all.
- Whether Nova is voice-first, text-first, or both.
- Exact progression cadence: Sparks, Star Keys, chapters, zones.
- Whether the player has a customizable avatar.
- How much free roaming versus guided adventure is desirable.
- Whether mini-games are generic rewards or tied to each zone/story.
- Monetization model.
- Offline expectations.
- When/if safe friend visits or social play enter the roadmap.
- Whether Godot becomes the permanent app/game runtime or only the 3D world layer.

---

## 15. Handoff summary for a new conversation

If this file is being used to start a fresh conversation, use this as the working brief:

> We pivoted KidsLive away from a curriculum-first educational app and then away from a house/car decoration habit app. The new product is a child-focused habit companion built around Nova, an AI character, and a compact magical 3D adventure world. Completing real-life habits earns Sparks/keys that immediately transform the world and eventually unlock new zones, adventures, Nova progression, collectibles, story, and mini experiences. We want the world to be real stylized 3D, but intentionally small/authored rather than Minecraft-scale. Godot is the current engine candidate. A Star Meadow Godot spike already exists under `prototypes/godot-adventure-world/` and proves avatar movement, Nova companionship, three habit completions, world transformation, bridge/portal progression, Web export, and CI screenshot capture. The next priority is a production-looking vertical slice with real stylized 3D assets, strong movement/camera feel, Nova reactions, and one compelling portal unlock. Do not continue the old educational roadmap by default; this document is the current product-direction source of truth.

---

## 16. Current decision checkpoint

**Direction to explore:** Habits + Nova AI companion + meaningful adventure progression in a compact stylized 3D world.

**Current engine candidate:** Godot.

**Current first zone:** Star Meadow.

**Immediate proof needed:** production-level visual/interaction pass demonstrating that the habit → world-change → discovery loop is genuinely compelling.
