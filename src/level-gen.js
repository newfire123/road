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
    airMonsterCount: Math.max(1, Math.floor(clamped / 3)),
    energyDrainPerSec: 18,
    energyRegenPerSec: 10,
  };
}
