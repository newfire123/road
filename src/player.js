export function createPlayer(level = 1) {
  const baseMax = 100;
  const maxStamina = baseMax + level * 8;
  return {
    x: 0,
    y: 0,
    speed: 160,
    dashSpeed: 320,
    dashDuration: 0.18,
    dashTimeRemaining: 0,
    dashVector: { x: 0, y: 0 },
    stamina: maxStamina,
    maxStamina,
    isFlying: false,
    w: 18,
    h: 18,
  };
}

export function updateStamina(player, dt, rates) {
  const isDraining = player.isFlying || player.dashTimeRemaining > 0;
  if (isDraining) {
    const drain = player.isFlying ? rates.flyDrainPerSec : rates.dashDrainPerSec;
    player.stamina = Math.max(0, player.stamina - drain * dt);
  } else {
    player.stamina = Math.min(player.maxStamina, player.stamina + rates.regenPerSec * dt);
  }
}

export function toggleFlight(player, wantsToggle) {
  if (!wantsToggle) return;
  if (player.isFlying) {
    player.isFlying = false;
    return;
  }
  if (player.stamina > 0) {
    player.isFlying = true;
  }
}

export function tryStartDash(player, inputVector) {
  if (player.isFlying) return;
  if (player.dashTimeRemaining > 0) return;
  if (player.stamina <= 0) return;
  if (inputVector.x === 0 && inputVector.y === 0) return;
  player.dashVector = { x: inputVector.x, y: inputVector.y };
  player.dashTimeRemaining = player.dashDuration;
}

export function updateDash(player, dt) {
  player.dashTimeRemaining = Math.max(0, player.dashTimeRemaining - dt);
}
