export function updateVehicle(vehicle, dt, width) {
  maybeReverseVehicle(vehicle, dt, vehicle.reverseChance ?? 0);
  if (vehicle.variable) {
    vehicle.phaseTime += dt;
    const duration = vehicle.phase === 'fast' ? vehicle.fastDuration : vehicle.slowDuration;
    if (vehicle.phaseTime >= duration) {
      vehicle.phaseTime = 0;
      vehicle.phase = vehicle.phase === 'fast' ? 'slow' : 'fast';
    }
    vehicle.speed = vehicle.phase === 'fast' ? vehicle.fastSpeed : vehicle.slowSpeed;
  }
  vehicle.x += vehicle.speed * vehicle.dir * dt;
  if (vehicle.dir === 1 && vehicle.x > width) {
    vehicle.x = -vehicle.w;
  }
  if (vehicle.dir === -1 && vehicle.x + vehicle.w < 0) {
    vehicle.x = width;
  }
}

export function maybeReverseVehicle(vehicle, dt, chance) {
  vehicle.reverseCooldown = Math.max(0, (vehicle.reverseCooldown ?? 0) - dt);
  if (vehicle.reverseCooldown > 0) return;
  if (Math.random() < chance) {
    vehicle.dir *= -1;
    vehicle.reverseCooldown = 3 + Math.random() * 2;
  }
}
