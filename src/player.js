export function createPlayer() {
  return {
    x: 0,
    y: 0,
    speed: 160,
    sprintSpeed: 240,
    sprintDuration: 0.45,
    sprintCooldown: 1.2,
    sprintTimeRemaining: 0,
    sprintCooldownRemaining: 0,
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

export function toggleFlight(player, wantsToggle) {
  if (!wantsToggle) return;
  if (player.isFlying) {
    player.isFlying = false;
    return;
  }
  if (player.energy > 0) {
    player.isFlying = true;
  }
}

export function tryStartSprint(player) {
  if (player.sprintCooldownRemaining > 0) return;
  if (player.sprintTimeRemaining > 0) return;
  player.sprintTimeRemaining = player.sprintDuration;
  player.sprintCooldownRemaining = player.sprintCooldown;
}

export function updateSprint(player, dt) {
  player.sprintTimeRemaining = Math.max(0, player.sprintTimeRemaining - dt);
  player.sprintCooldownRemaining = Math.max(0, player.sprintCooldownRemaining - dt);
}
