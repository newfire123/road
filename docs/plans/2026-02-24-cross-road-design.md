# Cross Road Design

**Goal:** Build a pure HTML5 Canvas 2D road-crossing game with 9 fixed levels. Player moves smoothly with arrow keys, can sprint with `D`, and can fly with `F` using an energy bar that auto-recovers. Win by reaching the far side of the road. Lose on collision with vehicles or monsters. Ground monsters patrol fixed paths; flying attracts airborne tracking monsters. Visuals are simple programmatic pixel art, no external frameworks.

## Architecture Overview
- **Entry:** `index.html` loads `main.js` (ES modules) and Canvas.
- **Core:** `Game` state machine (title, play, pause, fail, win).
- **Level:** procedural generator by level index, outputs lane count, speeds, monster counts, and parameters.
- **Entities:** player, vehicles, ground monsters, air monsters.
- **Systems:** input, update loop, collisions, rendering, UI.
- **Loop:** `requestAnimationFrame` updates by `dt`, then renders.

## Gameplay Systems
- **Movement:** smooth 2D movement via velocity from input.
- **Sprint:** `D` increases speed briefly, with cooldown.
- **Flight:** `F` toggles flight while energy lasts; energy drains in flight and recovers on ground.
- **Attraction:** in flight, spawn/activate airborne trackers that follow with capped speed.
- **Collisions:** any contact with vehicles or monsters triggers immediate fail.

## Level Scaling
Levels scale by index:
- Increase lane count
- Increase vehicle speed
- Increase monster count (ground and air)

## Rendering & UI
- Pixel-art style drawn via Canvas shapes.
- Layer order: road, lane lines, vehicles, ground monsters, player, air monsters, UI.
- UI: title screen, pause, fail/win overlays, energy bar, level number, control hints.

## Testing Strategy
- Lightweight unit tests for level generation and energy logic.
- Manual verification for collision, flight attraction, and UI state transitions.
