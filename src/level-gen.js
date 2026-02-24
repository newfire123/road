export function generateLevel(level) {
  const clamped = Math.max(1, Math.min(level, 9));
  const laneCount = 3 + clamped;
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
    airMonsterCount: Math.max(1, Math.ceil(clamped / 2)),
    staminaRegenPerSec: 10,
    flyDrainPerSec: 20,
    dashDrainPerSec: 25,
    variableSpeedChance: Math.min(0.6, 0.15 + clamped * 0.05),
    vehicleLengthRange: [0.7, 1.3],
    coinCount: 15,
    coinTarget: 9,
    coinSpread: 0.2 + clamped * 0.06,
    reverseChance: Math.min(0.2, 0.1 + clamped * 0.01),
    vehicleCountPerLane: Math.min(8, 5 + Math.floor(clamped / 3)),
  };
}
