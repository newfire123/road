import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, tryStartSprint, updateSprint } from '../src/player.js';

test('sprint starts and then cools down', () => {
  const p = createPlayer();
  tryStartSprint(p);
  assert.ok(p.sprintTimeRemaining > 0);
  updateSprint(p, p.sprintDuration + 0.1);
  assert.equal(p.sprintTimeRemaining, 0);
  const before = p.sprintCooldownRemaining;
  tryStartSprint(p);
  assert.equal(p.sprintTimeRemaining, 0);
  assert.ok(p.sprintCooldownRemaining >= before);
});
