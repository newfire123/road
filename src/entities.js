export function updateVehicle(vehicle, dt, width) {
  vehicle.x += vehicle.speed * vehicle.dir * dt;
  if (vehicle.dir === 1 && vehicle.x > width) {
    vehicle.x = -vehicle.w;
  }
  if (vehicle.dir === -1 && vehicle.x + vehicle.w < 0) {
    vehicle.x = width;
  }
}
