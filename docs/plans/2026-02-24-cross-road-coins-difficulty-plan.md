# Cross Road Coins/Difficulty Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add coin-collection win condition, coin distribution by difficulty, and vehicle complexity (variable length, variable speed, reverse chance) while keeping single-file build output.

**Architecture:** Keep gameplay logic in `src/` with tests, update `level-gen` to include coin and vehicle behavior params, and render coins + UI in `game`/`renderer`. Build continues to bundle JS into `index.html` via esbuild.

**Tech Stack:** HTML5 Canvas, JavaScript (ES modules), Node.js `node:test`, esbuild.

---

### Task 1: Add coin model and collection logic

**Files:**
- Create: `src/coins.js`
- Create: `tests/coins.test.js`

**Step 1: Write the failing test**

```js
// tests/coins.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectCoin, shouldCollectCoin } from '../src/coins.js';

const player = { x: 10, y: 10, w: 10, h: 10, isFlying: false };
const coin = { x: 12, y: 12, r: 6, collected: false };

test('collects coin on overlap when not flying', () => {
  const canCollect = shouldCollectCoin(player, coin);
  assert.equal(canCollect, true);
  const count = collectCoin(0, 9, coin, canCollect);
  assert.equal(count, 1);
  assert.equal(coin.collected, true);
});

test('does not collect coin when flying', () => {
  const flyingPlayer = { ...player, isFlying: true };
  const canCollect = shouldCollectCoin(flyingPlayer, coin);
  assert.equal(canCollect, false);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/coins.test.js`
Expected: FAIL with missing module/export

**Step 3: Write minimal implementation**

```js
// src/coins.js
import { aabbIntersects } from './collision.js';

export function shouldCollectCoin(player, coin) {
  if (player.isFlying) return false;
  const box = { x: coin.x - coin.r, y: coin.y - coin.r, w: coin.r * 2, h: coin.r * 2 };
  return aabbIntersects(player, box);
}

export function collectCoin(current, target, coin, canCollect) {
  if (!canCollect) return current;
  if (coin.collected) return current;
  if (current >= target) return current;
  coin.collected = true;
  return current + 1;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/coins.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/coins.js tests/coins.test.js
git commit -m "feat: add coin collection helpers"
```

---

### Task 2: Update level generation for coins and vehicle complexity

**Files:**
- Modify: `src/level-gen.js`
- Create: `tests/level-gen-coins.test.js`

**Step 1: Write the failing test**

```js
// tests/level-gen-coins.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel } from '../src/level-gen.js';

test('coin spread increases with level', () => {
  const l1 = generateLevel(1);
  const l9 = generateLevel(9);
  assert.ok(l1.coinSpread < l9.coinSpread);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/level-gen-coins.test.js`
Expected: FAIL with missing field

**Step 3: Write minimal implementation**

```js
// src/level-gen.js (add fields)
return {
  ...,
  coinCount: 15,
  coinTarget: 9,
  coinSpread: 0.2 + clamped * 0.06,
  reverseChance: 0.1 + clamped * 0.01,
  vehicleCountPerLane: Math.min(8, 5 + Math.floor(clamped / 3)),
};
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/level-gen-coins.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/level-gen.js tests/level-gen-coins.test.js
git commit -m "feat: add coin and vehicle scaling params"
```

---

### Task 3: Implement coin spawning and win condition in game loop

**Files:**
- Modify: `src/game.js`
- Modify: `src/renderer.js`
- Modify: `docs/manual-test.md`

**Step 1: Write the failing test**

```md
# docs/manual-test.md (append)
- Coins spawn 15 per level in road area only
- Need 9 coins + reach far side to win
- Reaching far side with <9 coins does not win
- Coins cannot be collected while flying
```

**Step 2: Run test to verify it fails**

Run: `npm run build` then open `index.html`
Expected: Missing coin behavior

**Step 3: Write minimal implementation**

```js
// src/game.js (high level)
// - create coins array on level start
// - update coin collection with shouldCollectCoin/collectCoin
// - win condition requires coinCount >= target AND reach far side
```

```js
// src/renderer.js
// - draw coins as small pixel circles/rects
// - draw coin UI text: "金币 x/9"
```

**Step 4: Run test to verify it passes**

Run: `npm run build` and open `index.html`
Expected: Coin collection and win condition match checklist

**Step 5: Commit**

```bash
git add src/game.js src/renderer.js docs/manual-test.md
 git commit -m "feat: add coin win condition"
```

---

### Task 4: Vehicle reverse behavior + difficulty balancing

**Files:**
- Modify: `src/entities.js`
- Modify: `src/game.js`

**Step 1: Write the failing test**

```js
// tests/vehicle-reverse.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maybeReverseVehicle } from '../src/entities.js';

test('vehicle reverses when random triggers', () => {
  const v = { dir: 1, reverseCooldown: 0 };
  maybeReverseVehicle(v, 1, 1);
  assert.equal(v.dir, -1);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/vehicle-reverse.test.js`
Expected: FAIL with missing export

**Step 3: Write minimal implementation**

```js
// src/entities.js
export function maybeReverseVehicle(vehicle, dt, chance) {
  vehicle.reverseCooldown = Math.max(0, vehicle.reverseCooldown - dt);
  if (vehicle.reverseCooldown > 0) return;
  if (Math.random() < chance) {
    vehicle.dir *= -1;
    vehicle.reverseCooldown = 3 + Math.random() * 2;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/vehicle-reverse.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/entities.js tests/vehicle-reverse.test.js
 git commit -m "feat: add vehicle reverse behavior"
```

---

### Task 5: Build and verify single-file output

**Files:**
- Modify: `index.html` (generated)
- Modify: `dist/bundle.js` (generated)

**Step 1: Build**

Run: `npm run build`
Expected: Updated `dist/bundle.js` and `index.html`

**Step 2: Manual check**

Open: `index.html` via file://
Expected: Game loads, coins required to win, difficulty balanced

**Step 3: Commit**

```bash
git add dist/bundle.js index.html
 git commit -m "build: update bundled output"
```
