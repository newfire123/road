import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootMessage } from '../src/main.js';

test('boot message is defined', () => {
  assert.equal(bootMessage(), 'Cross Road boot');
});
