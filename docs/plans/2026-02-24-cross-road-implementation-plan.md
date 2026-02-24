# Cross Road Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a pure HTML5 Canvas road-crossing game with 9 levels, smooth movement, sprint, flight with energy, vehicle hazards, ground patrol monsters, and airborne trackers that activate during flight.

**Architecture:** ES module-based browser app. `Game` handles state, `Level` generator scales difficulty, entities update each frame with collisions, and Canvas renderer draws pixel-art shapes plus UI.

**Tech Stack:** HTML5 Canvas, JavaScript (ES modules), CSS, Node.js built-in test runner for unit tests.

---

### Task 1: Bootstrap structure and test runner

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/main.js`
- Create: `package.json`
- Create: `tests/smoke.test.js`

**Step 1: Write the failing test**

```js
// tests/smoke.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('smoke test', () => {
  assert.equal(1 + 1, 2);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/smoke.test.js`
Expected: FAIL with "Cannot find module" (before file exists)

**Step 3: Write minimal implementation**

```json
// package.json
{
  "name": "cross-road",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cross Road</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <canvas id="game" width="960" height="540"></canvas>
    <script type="module" src="./src/main.js"></script>
  </body>
</html>
```

```js
// src/main.js
console.log('Cross Road boot');
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/smoke.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add index.html styles.css src/main.js package.json tests/smoke.test.js
git commit -m "chore: bootstrap project"
```

---

### Task 2: Level generator with scaling

**Files:**
- Create: `src/level-gen.js`
- Create: `tests/level-gen.test.js`

**Step 1: Write the failing test**

```js
// tests/level-gen.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel } from '../src/level-gen.js';

test('level 1 has fewer lanes than level 9', () => {
  const l1 = generateLevel(1);
  const l9 = generateLevel(9);
  assert.ok(l1.lanes.length < l9.lanes.length);
});

test('vehicle speed scales with level', () => {
  const l1 = generateLevel(1);
  const l9 = generateLevel(9);
  assert.ok(l1.lanes[0].speed < l9.lanes[0].speed);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/level-gen.test.js`
Expected: FAIL with "Cannot find module" (or function missing)

**Step 3: Write minimal implementation**

```js
// src/level-gen.js
export function generateLevel(level) {
  const clamped = Math.max(1, Math.min(level, 9));
  const laneCount = 3 + clamped; // 4..12
  const baseSpeed = 60 + clamped * 12;
  const lanes = Array.from({ length: laneCount }, (_, i) => ({
    index: i,
    direction: i % 2 === 0 ? 1 : -1,
    speed: baseSpeed + i * 6,
    vehicleCount: 2 + Math.floor(clamped / 2),
  }));
  return {
    level: clamped,
    lanes,
    groundMonsterCount: Math.floor(clamped / 2),
    airMonsterCount: Math.max(1, Math.floor(clamped / 3)),
    energyDrainPerSec: 18,
    energyRegenPerSec: 10,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/level-gen.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/level-gen.js tests/level-gen.test.js
git commit -m "feat: add level generator"
```

---

### Task 3: Player energy + flight state

**Files:**
- Create: `src/player.js`
- Create: `tests/player-energy.test.js`

**Step 1: Write the failing test**

```js
// tests/player-energy.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, updateEnergy } from '../src/player.js';

test('energy drains in flight and regens on ground', () => {
  const p = createPlayer();
  p.isFlying = true;
  updateEnergy(p, 1, 20, 10);
  assert.ok(p.energy < 100);
  p.isFlying = false;
  updateEnergy(p, 1, 20, 10);
  assert.ok(p.energy > 0);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/player-energy.test.js`
Expected: FAIL with "Cannot find module" (or function missing)

**Step 3: Write minimal implementation**

```js
// src/player.js
export function createPlayer() {
  return {
    x: 0,
    y: 0,
    speed: 160,
    sprintSpeed: 240,
    energy: 100,
    maxEnergy: 100,
    isFlying: false,
  };
}

export function updateEnergy(player, dt, drainPerSec, regenPerSec) {
  if (player.isFlying) {
    player.energy = Math.max(0, player.energy - drainPerSec * dt);
  } else {
    player.energy = Math.min(player.maxEnergy, player.energy + regenPerSec * dt);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/player-energy.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/player.js tests/player-energy.test.js
git commit -m "feat: add player energy model"
```

---

### Task 4: Collision helpers

**Files:**
- Create: `src/collision.js`
- Create: `tests/collision.test.js`

**Step 1: Write the failing test**

```js
// tests/collision.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aabbIntersects } from '../src/collision.js';

test('AABB intersection works', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  const b = { x: 5, y: 5, w: 10, h: 10 };
  const c = { x: 20, y: 20, w: 5, h: 5 };
  assert.equal(aabbIntersects(a, b), true);
  assert.equal(aabbIntersects(a, c), false);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/collision.test.js`
Expected: FAIL with "Cannot find module" (or function missing)

**Step 3: Write minimal implementation**

```js
// src/collision.js
export function aabbIntersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/collision.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/collision.js tests/collision.test.js
git commit -m "feat: add collision helper"
```

---

### Task 5: Entity updates (vehicles + monsters)

**Files:**
- Create: `src/entities.js`
- Create: `tests/entities.test.js`

**Step 1: Write the failing test**

```js
// tests/entities.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateVehicle } from '../src/entities.js';

test('vehicle wraps across bounds', () => {
  const v = { x: 101, y: 0, w: 10, h: 10, speed: 50, dir: 1 };
  updateVehicle(v, 1, 100);
  assert.ok(v.x < 0);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/entities.test.js`
Expected: FAIL with "Cannot find module" (or function missing)

**Step 3: Write minimal implementation**

```js
// src/entities.js
export function updateVehicle(vehicle, dt, width) {
  vehicle.x += vehicle.speed * vehicle.dir * dt;
  if (vehicle.dir === 1 && vehicle.x > width) {
    vehicle.x = -vehicle.w;
  }
  if (vehicle.dir === -1 && vehicle.x + vehicle.w < 0) {
    vehicle.x = width;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/entities.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/entities.js tests/entities.test.js
git commit -m "feat: add entity updates"
```

---

### Task 6: Input system + player movement

**Files:**
- Create: `src/input.js`
- Modify: `src/player.js`
- Modify: `src/main.js`

**Step 1: Write the failing test**

```js
// tests/input.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inputVector } from '../src/input.js';

test('input vector normalizes diagonals', () => {
  const keys = { ArrowUp: true, ArrowRight: true };
  const v = inputVector(keys);
  assert.ok(Math.abs(v.x) < 1 && Math.abs(v.y) < 1);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/input.test.js`
Expected: FAIL with "Cannot find module" (or function missing)

**Step 3: Write minimal implementation**

```js
// src/input.js
export function inputVector(keys) {
  let x = 0;
  let y = 0;
  if (keys.ArrowLeft) x -= 1;
  if (keys.ArrowRight) x += 1;
  if (keys.ArrowUp) y -= 1;
  if (keys.ArrowDown) y += 1;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/input.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/input.js tests/input.test.js src/player.js src/main.js
git commit -m "feat: add input vector"
```

---

### Task 7: Game loop, states, UI, rendering

**Files:**
- Create: `src/game.js`
- Create: `src/renderer.js`
- Modify: `src/main.js`
- Modify: `styles.css`
- Create: `docs/manual-test.md`

**Step 1: Write the failing test**

```md
# docs/manual-test.md
- Title screen shows game title and "Press Enter"
- Enter starts level 1
- Player moves with arrow keys
- D triggers sprint
- F triggers flight + energy drain + air monsters appear
- Collision with vehicle or monster triggers fail screen
- Reaching far side triggers win and next level
- Level 9 win shows final completion screen
```

**Step 2: Run test to verify it fails**

Run: Open `index.html`
Expected: Missing UI and gameplay

**Step 3: Write minimal implementation**

```js
// src/game.js (outline)
export class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = 'title';
    this.levelIndex = 1;
  }
  update(dt, input) {
    // state machine updates
  }
  render() {
    // draw background, entities, UI overlays
  }
}
```

```js
// src/renderer.js (outline)
export function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
```

**Step 4: Run test to verify it passes**

Run: Open `index.html`
Expected: Title screen, playable level, UI overlays, win/fail flow

**Step 5: Commit**

```bash
git add src/game.js src/renderer.js src/main.js styles.css docs/manual-test.md
git commit -m "feat: add game loop and UI"
```

---

### Task 8: Full gameplay integration and balancing

**Files:**
- Modify: `src/game.js`
- Modify: `src/entities.js`
- Modify: `src/player.js`
- Modify: `src/level-gen.js`
- Modify: `src/renderer.js`
- Modify: `styles.css`

**Step 1: Write the failing test**

```md
# docs/manual-test.md (append)
- Sprint feels faster than base movement
- Flight drains energy and auto-lands at zero
- Energy recovers only on ground
- Air monsters activate only when flying
- Difficulty scales across 9 levels
```

**Step 2: Run test to verify it fails**

Run: Open `index.html`
Expected: Missing some behaviors

**Step 3: Write minimal implementation**

Implement sprint cooldown, flight toggle, air monster activation, level scaling, and improved pixel art.

**Step 4: Run test to verify it passes**

Run: Open `index.html`
Expected: Behaviors match manual checklist

**Step 5: Commit**

```bash
git add src/game.js src/entities.js src/player.js src/level-gen.js src/renderer.js styles.css docs/manual-test.md
git commit -m "feat: integrate gameplay and balance"
```
