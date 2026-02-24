# Cross Road Stamina/Dash/Balancing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add stamina-gated dash + flight, dash charge behavior, flight vehicle immunity, and multi-dimensional difficulty scaling while keeping a build that outputs a single `index.html` runnable via `file://`.

**Architecture:** Keep modular source files for testing, then add a small build step that bundles JS and injects it into a single-file `index.html` template. Game logic updates remain in `src/` and are bundled for distribution.

**Tech Stack:** HTML5 Canvas, JavaScript (ES modules), Node.js `node:test`, esbuild (dev dependency).

---

### Task 1: Add build pipeline for single-file output

**Files:**
- Create: `index.template.html`
- Create: `scripts/build-inline.js`
- Modify: `package.json`
- Test: `tests/build-inline.test.js`

**Step 1: Write the failing test**

```js
// tests/build-inline.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inlineTemplate } from '../scripts/build-inline.js';

test('inlineTemplate injects JS into template', () => {
  const html = '<html><body><!-- INLINE_SCRIPT --></body></html>';
  const result = inlineTemplate(html, 'console.log(1);');
  assert.ok(result.includes('<script>'));
  assert.ok(result.includes('console.log(1);'));
  assert.ok(!result.includes('INLINE_SCRIPT'));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/build-inline.test.js`
Expected: FAIL with "Cannot find module" or "inlineTemplate is not a function"

**Step 3: Write minimal implementation**

```js
// scripts/build-inline.js
import fs from 'node:fs';
import path from 'node:path';

export function inlineTemplate(templateHtml, jsCode) {
  return templateHtml.replace('<!-- INLINE_SCRIPT -->', `<script>\n${jsCode}\n</script>`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.cwd();
  const templatePath = path.join(root, 'index.template.html');
  const bundlePath = path.join(root, 'dist', 'bundle.js');
  const outPath = path.join(root, 'index.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  const result = inlineTemplate(template, bundle);
  fs.writeFileSync(outPath, result);
}
```

```html
<!-- index.template.html -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cross Road</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <canvas id="game" width="960" height="540"></canvas>
    <!-- INLINE_SCRIPT -->
  </body>
</html>
```

```json
// package.json
{
  "name": "cross-road",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "build:bundle": "esbuild src/main.js --bundle --format=iife --global-name=CrossRoad --outfile=dist/bundle.js",
    "build:inline": "node scripts/build-inline.js",
    "build": "npm run build:bundle && npm run build:inline"
  },
  "devDependencies": {
    "esbuild": "^0.23.0"
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/build-inline.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add index.template.html scripts/build-inline.js package.json tests/build-inline.test.js
git commit -m "build: add inline bundle pipeline"
```

---

### Task 2: Update stamina model for dash + flight sharing

**Files:**
- Modify: `src/player.js`
- Create: `tests/stamina.test.js`

**Step 1: Write the failing test**

```js
// tests/stamina.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, updateStamina } from '../src/player.js';

test('stamina drains with drainRate and regens on ground', () => {
  const p = createPlayer(1);
  p.isFlying = true;
  updateStamina(p, 1, { flyDrainPerSec: 20, dashDrainPerSec: 10, regenPerSec: 5 });
  assert.ok(p.stamina < p.maxStamina);
  p.isFlying = false;
  updateStamina(p, 1, { flyDrainPerSec: 20, dashDrainPerSec: 10, regenPerSec: 5 });
  assert.ok(p.stamina > 0);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/stamina.test.js`
Expected: FAIL with missing export or function

**Step 3: Write minimal implementation**

```js
// src/player.js (add or replace relevant pieces)
export function createPlayer(level) {
  const baseMax = 100;
  const maxStamina = baseMax + level * 8;
  return {
    x: 0,
    y: 0,
    speed: 160,
    sprintSpeed: 280,
    dashSpeed: 320,
    dashDuration: 0.18,
    dashTimeRemaining: 0,
    dashVector: { x: 0, y: 0 },
    stamina: maxStamina,
    maxStamina,
    isFlying: false,
  };
}

export function updateStamina(player, dt, rates) {
  const isDraining = player.isFlying || player.dashTimeRemaining > 0;
  if (isDraining) {
    const drain = player.isFlying ? rates.flyDrainPerSec : rates.dashDrainPerSec;
    player.stamina = Math.max(0, player.stamina - drain * dt);
  } else {
    player.stamina = Math.min(player.maxStamina, player.stamina + rates.regenPerSec * dt);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/stamina.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/player.js tests/stamina.test.js
git commit -m "feat: add stamina model"
```

---

### Task 3: Dash lock-direction behavior

**Files:**
- Modify: `src/player.js`
- Create: `tests/dash.test.js`

**Step 1: Write the failing test**

```js
// tests/dash.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, tryStartDash, updateDash } from '../src/player.js';

test('dash locks direction and consumes time', () => {
  const p = createPlayer(1);
  tryStartDash(p, { x: 1, y: 0 });
  assert.equal(p.dashTimeRemaining > 0, true);
  assert.equal(p.dashVector.x, 1);
  updateDash(p, 0.2);
  assert.equal(p.dashTimeRemaining, 0);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/dash.test.js`
Expected: FAIL with missing export or function

**Step 3: Write minimal implementation**

```js
// src/player.js
export function tryStartDash(player, inputVector) {
  if (player.dashTimeRemaining > 0) return;
  if (player.stamina <= 0) return;
  if (inputVector.x === 0 && inputVector.y === 0) return;
  player.dashVector = { x: inputVector.x, y: inputVector.y };
  player.dashTimeRemaining = player.dashDuration;
}

export function updateDash(player, dt) {
  player.dashTimeRemaining = Math.max(0, player.dashTimeRemaining - dt);
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/dash.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/player.js tests/dash.test.js
git commit -m "feat: add dash lock behavior"
```

---

### Task 4: Update game loop for stamina + dash + flight immunity

**Files:**
- Modify: `src/game.js`
- Modify: `src/level-gen.js`
- Modify: `src/renderer.js`
- Modify: `src/main.js`
- Modify: `docs/manual-test.md`

**Step 1: Write the failing test**

```md
# docs/manual-test.md (append)
- Dash requires direction + stamina, locks direction, has short burst
- Dash and flight drain the same stamina bar
- Stamina increases with level
- Flying ignores vehicle collision but still dies to air monsters
- Vehicles include variable length and periodic speed changes
```

**Step 2: Run test to verify it fails**

Run: Open `index.template.html` via dev server (or `npm run build` then open `index.html`)
Expected: Missing new behaviors

**Step 3: Write minimal implementation**

```js
// src/level-gen.js (add new fields)
return {
  ...,
  staminaBase: 100,
  staminaPerLevel: 8,
  staminaRegenPerSec: 10,
  flyDrainPerSec: 20,
  dashDrainPerSec: 25,
  variableSpeedChance: Math.min(0.6, 0.15 + clamped * 0.05),
  vehicleLengthRange: [0.7, 1.3],
};
```

```js
// src/game.js (high level changes)
// - createPlayer(level)
// - input: D triggers tryStartDash with input vector
// - if dashing: movement uses dashVector * dashSpeed
// - updateStamina + updateDash each frame
// - skip vehicle collision when player.isFlying
// - air monsters count and spawn scaled
// - vehicles store speedPhase, fast/slow speeds and update by timer
```

```js
// src/renderer.js
// - energy bar renamed to stamina bar
```

**Step 4: Run test to verify it passes**

Run: `npm run build` then open `index.html` via file://
Expected: Behaviors match manual checklist

**Step 5: Commit**

```bash
git add src/game.js src/level-gen.js src/renderer.js src/main.js docs/manual-test.md
 git commit -m "feat: update stamina dash and scaling"
```

---

### Task 5: Verify build output

**Files:**
- Modify: `index.html` (generated)

**Step 1: Build**

Run: `npm run build`
Expected: `dist/bundle.js` and updated `index.html`

**Step 2: Manual check**

Open: `index.html` via file://
Expected: Game loads without CORS error

**Step 3: Commit**

```bash
git add index.html dist/bundle.js
git commit -m "build: update single-file output"
```
