# Godot Habit Home — production-style visual spike

A deliberately isolated Godot 4.7.2 prototype for evaluating the new habit-building product direction without rewriting the existing Phaser app first.

## What this spike proves

- Orthographic **real 3D** rendered as a cozy 2.5D/isometric room.
- Habit completion → currency.
- Shop → buy furniture → furniture appears in the room.
- Furniture can be selected, dragged on a hidden placement grid, and rotated.
- Small persisted demo state (`user://habit_home_spike.json`).
- Responsive HUD: desktop layout plus a compact mobile arrangement.
- No external art dependency yet: architecture and furniture are built from stylized 3D primitives and toon-like materials so the engine/workflow itself can be judged.

## Run

Use Godot **4.7.2 stable** and open this folder as a project, then run `main.tscn` / F6.

## Controls

- Complete habits from the left panel.
- Buy items from the shop.
- Click/tap an owned furniture item and drag it across the floor.
- `R` or **Rotate** turns the selected item by 90°.
- Mouse wheel changes camera zoom on desktop.
- **Reset demo** clears prototype state.

## Production direction if this visual recipe wins

Replace primitive furniture with authored GLB assets while keeping the same runtime contracts: `HabitState` owns economy/inventory; `FurnitureFactory` becomes a catalog/prefab loader; placement remains grid-backed; the orthographic camera and Godot UI stay intact. That lets visual quality increase without changing the core loop.
