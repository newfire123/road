import { computeCoinSpread } from './coins.js';

export function buildLevelConfig(level) {
  const clamped = Math.max(1, Math.min(level, 9));
  const baseSpeed = 60 + clamped * 12;
  const variance = 0.12 + clamped * 0.015;
  const speedRange = [baseSpeed * (1 - variance), baseSpeed * (1 + variance)];
  const vehicleCountMax = Math.min(10, 5 + Math.floor(clamped / 2));
  const lengthMin = 0.6 + clamped * 0.01;
  const lengthMax = 1.1 + clamped * 0.05;

  return {
    clamped,
    baseSpeed,
    speedRange,
    vehicleCountMax,
    lengthRange: [Number(lengthMin.toFixed(2)), Number(lengthMax.toFixed(2))],
    reverseChance: Math.min(0.2, 0.1 + clamped * 0.01),
    variableSpeedChance: Math.min(0.6, 0.15 + clamped * 0.05),
    coinSpread: computeCoinSpread(clamped),
  };
}

export function generateLevel(level) {
  const config = buildLevelConfig(level);
  const clamped = config.clamped;
  const laneCount = 3 + clamped;
  const baseSpeed = config.baseSpeed;

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
    airMonsterCount: Math.max(1, Math.ceil(clamped / 2)),
    staminaRegenPerSec: 10,
    flyDrainPerSec: 20,
    dashDrainPerSec: 25,
    variableSpeedChance: config.variableSpeedChance,
    vehicleLengthRange: config.lengthRange,
    coinCount: 15,
    coinTarget: 9,
    coinSpread: config.coinSpread,
    reverseChance: config.reverseChance,
    vehicleCountPerLane: Math.min(config.vehicleCountMax, 5 + Math.floor(clamped / 3)),
    speedRange: config.speedRange,
    vehicleCountMax: config.vehicleCountMax,
  };
}
