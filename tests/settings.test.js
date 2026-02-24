import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, normalizeSettings } from '../src/settings.js';

test('normalizeSettings clamps values and fills defaults', () => {
  const input = {
    masterVolume: 2,
    sfxVolume: -1,
    ambienceVolume: 0.3,
    vehicleCountScale: 2,
    speedScale: 0.1,
    reverseChance: 0.5,
    lengthMin: 0.2,
    lengthMax: 0.9,
  };
  const out = normalizeSettings(input);
  assert.equal(out.masterVolume, 1);
  assert.equal(out.sfxVolume, 0);
  assert.equal(out.ambienceVolume, 0.3);
  assert.ok(out.vehicleCountScale <= defaultSettings.vehicleCountScaleMax);
  assert.ok(out.speedScale >= defaultSettings.speedScaleMin);
  assert.ok(out.reverseChance <= defaultSettings.reverseChanceMax);
  assert.ok(out.lengthMin >= defaultSettings.lengthMinMin);
  assert.ok(out.lengthMax >= out.lengthMin);
});
