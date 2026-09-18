# Godot Star Meadow Adventure Spike

A bounded 3D product spike for the new KidsLive direction:

**habits → Sparks → visible world change → bridge unlock → Star Gate → next adventure.**

This prototype deliberately avoids Minecraft-scale scope. It tests a small, authored 3D zone with strong progression feedback and Nova as the companion.

## What is implemented

- Stylized floating-island world built in Godot 4.7.2.
- Third-person kid avatar with WASD / arrow movement.
- Nova follows the player as a floating companion.
- Three habit actions, each granting one Spark.
- Every Spark visibly changes the world:
  - the Spark Tree grows,
  - a new bridge segment materializes,
  - the Star Gate gains energy.
- At 3/3 Sparks the bridge completes and the Star Gate activates.
- A destination island gives the player somewhere to move toward rather than decorating a static room.
- Production-style HUD for streak, habits, progression, chapter objective, and Nova guidance.
- Deterministic visual-capture scene and Web export in CI.

## Run locally

With Godot 4.7.2 installed:

```bash
godot --path prototypes/godot-adventure-world
```

The prototype is intentionally isolated from the current Phaser application. It exists to answer one product/engine question before any migration decision: **does a compact 3D adventure world make the habit loop feel substantially stronger?**
