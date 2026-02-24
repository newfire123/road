import { generateLevel } from './level-gen.js';
import { createPlayer, toggleFlight, tryStartSprint, updateEnergy, updateSprint } from './player.js';
import { inputVector } from './input.js';
import { updateVehicle } from './entities.js';
import { aabbIntersects } from './collision.js';
import { clearScreen, drawEnergyBar, drawPixelRect, drawText } from './renderer.js';

const SAFE_ZONE_HEIGHT = 60;
const PLAYER_SIZE = 18;
const AIR_MONSTER_SIZE = 16;
const GROUND_MONSTER_SIZE = 18;
const VEHICLE_HEIGHT_RATIO = 0.6;

export class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;

    this.state = 'title';
    this.levelIndex = 1;

    this.keys = {};
    this.lastKeys = {};

    this.player = null;
    this.level = null;
    this.vehicles = [];
    this.groundMonsters = [];
    this.airMonsters = [];
  }

  setKeys(keys) {
    this.keys = keys;
  }

  wasPressed(code) {
    return Boolean(this.keys[code]) && !this.lastKeys[code];
  }

  syncKeys() {
    this.lastKeys = { ...this.keys };
  }

  startLevel(levelIndex) {
    this.levelIndex = levelIndex;
    this.level = generateLevel(levelIndex);
    this.player = createPlayer();
    this.player.w = PLAYER_SIZE;
    this.player.h = PLAYER_SIZE;
    this.player.x = this.width / 2 - PLAYER_SIZE / 2;
    this.player.y = this.height - SAFE_ZONE_HEIGHT / 2 - PLAYER_SIZE / 2;

    this.vehicles = this.buildVehicles();
    this.groundMonsters = this.buildGroundMonsters();
    this.airMonsters = this.buildAirMonsters();
  }

  buildVehicles() {
    const roadTop = SAFE_ZONE_HEIGHT;
    const roadBottom = this.height - SAFE_ZONE_HEIGHT;
    const roadHeight = roadBottom - roadTop;
    const laneHeight = roadHeight / this.level.lanes.length;

    return this.level.lanes.flatMap((lane, i) => {
      const y = roadTop + i * laneHeight + laneHeight * (1 - VEHICLE_HEIGHT_RATIO) / 2;
      return Array.from({ length: lane.vehicleCount }, (_, v) => {
        const w = 42;
        const h = laneHeight * VEHICLE_HEIGHT_RATIO;
        const x = (v * (this.width / lane.vehicleCount)) % this.width;
        return {
          x,
          y,
          w,
          h,
          dir: lane.direction,
          speed: lane.speed,
          color: lane.direction === 1 ? '#f8575d' : '#4bc0ff',
        };
      });
    });
  }

  buildGroundMonsters() {
    const roadTop = SAFE_ZONE_HEIGHT;
    const roadBottom = this.height - SAFE_ZONE_HEIGHT;
    const spacing = (roadBottom - roadTop) / (this.level.groundMonsterCount + 1);
    return Array.from({ length: this.level.groundMonsterCount }, (_, i) => {
      const y = roadTop + spacing * (i + 1) - GROUND_MONSTER_SIZE / 2;
      return {
        x: 40 + (i % 2) * (this.width - 80),
        y,
        w: GROUND_MONSTER_SIZE,
        h: GROUND_MONSTER_SIZE,
        minX: 40,
        maxX: this.width - 40 - GROUND_MONSTER_SIZE,
        speed: 40 + i * 6,
        dir: i % 2 === 0 ? 1 : -1,
      };
    });
  }

  buildAirMonsters() {
    return Array.from({ length: this.level.airMonsterCount }, (_, i) => ({
      x: this.width - 80 - i * 20,
      y: 30 + i * 20,
      w: AIR_MONSTER_SIZE,
      h: AIR_MONSTER_SIZE,
      speed: 80 + i * 10,
      active: false,
    }));
  }

  update(dt) {
    const pressedEnter = this.wasPressed('Enter');
    const pressedSprint = this.wasPressed('KeyD');
    const pressedFlight = this.wasPressed('KeyF');

    if (this.state === 'title') {
      if (pressedEnter) {
        this.startLevel(1);
        this.state = 'play';
      }
      this.syncKeys();
      return;
    }

    if (this.state === 'win') {
      if (pressedEnter) {
        if (this.levelIndex >= 9) {
          this.state = 'complete';
        } else {
          this.startLevel(this.levelIndex + 1);
          this.state = 'play';
        }
      }
      this.syncKeys();
      return;
    }

    if (this.state === 'complete') {
      if (pressedEnter) {
        this.state = 'title';
      }
      this.syncKeys();
      return;
    }

    if (this.state === 'fail') {
      if (pressedEnter) {
        this.startLevel(this.levelIndex);
        this.state = 'play';
      }
      this.syncKeys();
      return;
    }

    if (this.state !== 'play') {
      this.syncKeys();
      return;
    }

    const move = inputVector(this.keys);
    if (pressedSprint) {
      tryStartSprint(this.player);
    }
    toggleFlight(this.player, pressedFlight);

    updateSprint(this.player, dt);
    updateEnergy(this.player, dt, this.level.energyDrainPerSec, this.level.energyRegenPerSec);
    if (this.player.energy <= 0) {
      this.player.isFlying = false;
    }

    const speed = this.player.sprintTimeRemaining > 0 ? this.player.sprintSpeed : this.player.speed;
    this.player.x += move.x * speed * dt;
    this.player.y += move.y * speed * dt;

    this.player.x = Math.max(0, Math.min(this.player.x, this.width - this.player.w));
    this.player.y = Math.max(0, Math.min(this.player.y, this.height - this.player.h));

    for (const vehicle of this.vehicles) {
      updateVehicle(vehicle, dt, this.width);
    }

    for (const monster of this.groundMonsters) {
      monster.x += monster.speed * monster.dir * dt;
      if (monster.x <= monster.minX || monster.x >= monster.maxX) {
        monster.dir *= -1;
      }
    }

    for (const monster of this.airMonsters) {
      monster.active = this.player.isFlying;
      if (!monster.active) continue;
      const dx = this.player.x - monster.x;
      const dy = this.player.y - monster.y;
      const len = Math.hypot(dx, dy) || 1;
      monster.x += (dx / len) * monster.speed * dt;
      monster.y += (dy / len) * monster.speed * dt;
    }

    const playerBox = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };

    if (this.vehicles.some((v) => aabbIntersects(playerBox, v))) {
      this.state = 'fail';
      return;
    }

    if (this.groundMonsters.some((m) => aabbIntersects(playerBox, m))) {
      this.state = 'fail';
      return;
    }

    if (this.airMonsters.some((m) => m.active && aabbIntersects(playerBox, m))) {
      this.state = 'fail';
      return;
    }

    const roadTop = SAFE_ZONE_HEIGHT;
    if (this.player.y <= roadTop - this.player.h / 2) {
      this.state = 'win';
    }

    this.syncKeys();
  }

  render() {
    clearScreen(this.ctx, this.width, this.height);

    if (this.state === 'title') {
      this.renderTitle();
      return;
    }

    this.renderWorld();

    if (this.state === 'fail') {
      this.renderOverlay('失败', '按 Enter 重来');
      return;
    }

    if (this.state === 'win') {
      this.renderOverlay('过关', '按 Enter 继续');
      return;
    }

    if (this.state === 'complete') {
      this.renderOverlay('通关完成', '按 Enter 回到标题');
    }
  }

  renderTitle() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    drawText(this.ctx, 'Cross Road', cx, cy - 40, 42, '#f5f5f5');
    drawText(this.ctx, '按 Enter 开始', cx, cy + 20, 18, '#9aa0af');
  }

  renderOverlay(title, subtitle) {
    drawPixelRect(this.ctx, 0, 0, this.width, this.height, 'rgba(0,0,0,0.45)');
    drawText(this.ctx, title, this.width / 2, this.height / 2 - 10, 36, '#f5f5f5');
    drawText(this.ctx, subtitle, this.width / 2, this.height / 2 + 26, 16, '#9aa0af');
  }

  renderWorld() {
    const roadTop = SAFE_ZONE_HEIGHT;
    const roadBottom = this.height - SAFE_ZONE_HEIGHT;
    drawPixelRect(this.ctx, 0, 0, this.width, roadTop, '#1a2a1f');
    drawPixelRect(this.ctx, 0, roadTop, this.width, roadBottom - roadTop, '#2a2e3a');
    drawPixelRect(this.ctx, 0, roadBottom, this.width, SAFE_ZONE_HEIGHT, '#1a2a1f');

    const laneHeight = (roadBottom - roadTop) / this.level.lanes.length;
    for (let i = 1; i < this.level.lanes.length; i += 1) {
      const y = roadTop + i * laneHeight;
      drawPixelRect(this.ctx, 0, y, this.width, 2, '#3a3f4c');
    }

    for (const vehicle of this.vehicles) {
      drawPixelRect(this.ctx, vehicle.x, vehicle.y, vehicle.w, vehicle.h, vehicle.color);
      drawPixelRect(this.ctx, vehicle.x + 4, vehicle.y + 4, 6, 6, '#ffe57a');
    }

    for (const monster of this.groundMonsters) {
      drawPixelRect(this.ctx, monster.x, monster.y, monster.w, monster.h, '#2cc38a');
      drawPixelRect(this.ctx, monster.x + 4, monster.y + 4, 4, 4, '#0a5b3b');
    }

    drawPixelRect(this.ctx, this.player.x, this.player.y, this.player.w, this.player.h, '#f5d34b');
    if (this.player.isFlying) {
      drawPixelRect(this.ctx, this.player.x + 4, this.player.y + this.player.h, 8, 6, '#ff8c42');
    }

    for (const monster of this.airMonsters) {
      if (!monster.active) continue;
      drawPixelRect(this.ctx, monster.x, monster.y, monster.w, monster.h, '#4d7cff');
      drawPixelRect(this.ctx, monster.x + 2, monster.y + 2, 4, 4, '#a4c2ff');
    }

    const energyRatio = this.player.energy / this.player.maxEnergy;
    drawEnergyBar(this.ctx, 20, 16, 140, 16, energyRatio);
    drawText(this.ctx, `关卡 ${this.levelIndex}/9`, this.width - 80, 22, 14, '#c7ccd8', 'right');
    drawText(this.ctx, '方向键移动 | D冲刺 | F飞行', this.width / 2, this.height - 18, 12, '#9aa0af');
  }
}
