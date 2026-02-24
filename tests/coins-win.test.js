import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canWin } from '../src/coins.js';

test('requires coin target and reaching far side', () => {
  const roadTop = 60;
  const playerH = 18;
  assert.equal(canWin(8, 9, 40, roadTop, playerH), false);
  assert.equal(canWin(9, 9, 40, roadTop, playerH), true);
  assert.equal(canWin(9, 9, 200, roadTop, playerH), false);
});
