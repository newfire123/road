import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLevelConfig } from '../src/level-gen.js';

test('higher levels increase reverse chance and speed variance without exploding counts', () => {
  const low = buildLevelConfig(1);
  const high = buildLevelConfig(9);
  assert.ok(high.reverseChance > low.reverseChance);
  assert.ok(high.speedRange[1] - high.speedRange[0] > low.speedRange[1] - low.speedRange[0]);
  assert.ok(high.vehicleCountMax <= 10);
});
