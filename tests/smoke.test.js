import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';

test('game class is defined', () => {
  assert.equal(typeof Game, 'function');
});
