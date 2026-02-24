export function createPlayer() {
  return {
    x: 0,
    y: 0,
    speed: 160,
    sprintSpeed: 240,
    energy: 100,
    maxEnergy: 100,
    isFlying: false,
  };
}

export function updateEnergy(player, dt, drainPerSec, regenPerSec) {
  if (player.isFlying) {
    player.energy = Math.max(0, player.energy - drainPerSec * dt);
  } else {
    player.energy = Math.min(player.maxEnergy, player.energy + regenPerSec * dt);
  }
}
