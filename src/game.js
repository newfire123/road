import { canWin, collectCoin, shouldCollectCoin } from './coins.js';
import { generateLevel } from './level-gen.js';
import { createPlayer, toggleFlight, tryStartDash, updateDash, updateStamina } from './player.js';
import { inputVector } from './input.js';
import { updateVehicle } from './entities.js';
import { aabbIntersects } from './collision.js';
import { clearScreen, drawCoin, drawDashBar, drawPixelRect, drawStaminaBar, drawText } from './renderer.js';
import { normalizeSettings } from './settings.js';

const SAFE_ZONE_HEIGHT = 60;
const AIR_MONSTER_SIZE = 16;
const GROUND_MONSTER_SIZE = 18;
const VEHICLE_HEIGHT_RATIO = 0.6;
const DASH_BAR_WIDTH = 90;
const DASH_BAR_HEIGHT = 8;
const COIN_RADIUS = 6;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

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
    this.coins = [];
    this.coinsCollected = 0;
    this.audio = null;
    this.settings = normalizeSettings();
  }

  setKeys(keys) {
    this.keys = keys;
  }

  setAudio(audio) {
    this.audio = audio;
  }

  setSettings(settings) {
    this.settings = normalizeSettings(settings);
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
    this.player = createPlayer(levelIndex);
    this.player.x = this.width / 2 - this.player.w / 2;
    this.player.y = this.height - SAFE_ZONE_HEIGHT / 2 - this.player.h / 2;

    this.vehicles = this.buildVehicles();
    this.groundMonsters = this.buildGroundMonsters();
    this.airMonsters = this.buildAirMonsters();
    this.coins = this.buildCoins();
    this.coinsCollected = 0;
  }

  buildVehicles() {
    const roadTop = SAFE_ZONE_HEIGHT;
    const roadBottom = this.height - SAFE_ZONE_HEIGHT;
    const roadHeight = roadBottom - roadTop;
    const laneHeight = roadHeight / this.level.lanes.length;

    return this.level.lanes.flatMap((lane, i) => {
      const y = roadTop + i * laneHeight + laneHeight * (1 - VEHICLE_HEIGHT_RATIO) / 2;
      const scaledCount = Math.round(this.level.vehicleCountPerLane * this.settings.vehicleCountScale);
      const vehicleCount = Math.max(5, Math.min(8, scaledCount + (i % 2)));
      return Array.from({ length: vehicleCount }, (_, v) => {
        const lengthMin = this.settings.lengthMin;
        const lengthMax = this.settings.lengthMax;
        const lengthScale = randomBetween(lengthMin, lengthMax);
        const w = 42 * lengthScale;
        const h = laneHeight * VEHICLE_HEIGHT_RATIO;
        const x = (v * (this.width / vehicleCount)) % this.width;
        const isVariable = Math.random() < this.level.variableSpeedChance;
        const baseSpeed = lane.speed * this.settings.speedScale;
        const fastSpeed = baseSpeed * 1.35;
        const slowSpeed = baseSpeed * 0.75;
        return {
          x,
          y,
          w,
          h,
          dir: lane.direction,
          speed: baseSpeed,
          variable: isVariable,
          fastSpeed,
          slowSpeed,
          fastDuration: 1.5,
          slowDuration: 1.5,
          phase: 'fast',
          phaseTime: Math.random() * 1.5,
          reverseChance: this.settings.reverseChance,
          reverseCooldown: 1 + Math.random() * 2,
          color: lane.direction === 1 ? '#f8575d' : '#4bc0ff',
        };
      });
    });
  }

  buildCoins() {
    const roadTop = SAFE_ZONE_HEIGHT;
    const roadBottom = this.height - SAFE_ZONE_HEIGHT;
    const padding = 14;
    const minDist = 18 + this.level.coinSpread * 24;
    const coins = [];

    let attempts = 0;
    while (coins.length < this.level.coinCount && attempts < this.level.coinCount * 30) {
      attempts += 1;
      const x = randomBetween(padding, this.width - padding);
      const y = randomBetween(roadTop + padding, roadBottom - padding);
      const tooClose = coins.some((c) => Math.hypot(c.x - x, c.y - y) < minDist);
      if (tooClose) continue;
      coins.push({ x, y, r: COIN_RADIUS, collected: false });
    }

    while (coins.length < this.level.coinCount) {
      coins.push({
        x: randomBetween(padding, this.width - padding),
        y: randomBetween(roadTop + padding, roadBottom - padding),
        r: COIN_RADIUS,
        collected: false,
      });
    }

    return coins;
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
    const pressedDash = this.wasPressed('KeyD');
    const pressedFlight = this.wasPressed('KeyF');
    const pressedPause = this.wasPressed('Space');

    if (this.state === 'title') {
      if (pressedEnter) {
        this.startLevel(1);
        this.state = 'play';
        this.audio?.playSfx('ui');
      }
      this.syncKeys();
      return;
    }

    if (this.state === 'pause') {
      if (pressedPause) {
        this.state = 'play';
        this.audio?.playSfx('ui');
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
        this.audio?.playSfx('ui');
      }
      this.syncKeys();
      return;
    }

    if (this.state === 'complete') {
      if (pressedEnter) {
        this.state = 'title';
        this.audio?.playSfx('ui');
      }
      this.syncKeys();
      return;
    }

    if (this.state === 'fail') {
      if (pressedEnter) {
        this.startLevel(this.levelIndex);
        this.state = 'play';
        this.audio?.playSfx('ui');
      }
      this.syncKeys();
      return;
    }

    if (this.state !== 'play') {
      this.syncKeys();
      return;
    }

    if (pressedPause) {
      this.state = 'pause';
      this.audio?.playSfx('ui');
      this.syncKeys();
      return;
    }

    const move = inputVector(this.keys);
    if (pressedDash) {
      tryStartDash(this.player, move);
    }
    toggleFlight(this.player, pressedFlight);

    updateDash(this.player, dt);
    updateStamina(this.player, dt, {
      flyDrainPerSec: this.level.flyDrainPerSec,
      dashDrainPerSec: this.level.dashDrainPerSec,
      regenPerSec: this.level.staminaRegenPerSec,
    });
    if (this.player.stamina <= 0) {
      this.player.isFlying = false;
      if (this.player.dashTimeRemaining > 0) {
        this.player.dashTimeRemaining = 0;
      }
    }

    if (this.player.dashTimeRemaining > 0) {
      this.player.x += this.player.dashVector.x * this.player.dashSpeed * dt;
      this.player.y += this.player.dashVector.y * this.player.dashSpeed * dt;
    } else {
      this.player.x += move.x * this.player.speed * dt;
      this.player.y += move.y * this.player.speed * dt;
    }

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

    if (!this.player.isFlying) {
      if (this.vehicles.some((v) => aabbIntersects(playerBox, v))) {
        this.state = 'fail';
        this.audio?.playSfx('fail');
        return;
      }

      if (this.groundMonsters.some((m) => aabbIntersects(playerBox, m))) {
        this.state = 'fail';
        this.audio?.playSfx('fail');
        return;
      }
    }

    if (this.airMonsters.some((m) => m.active && aabbIntersects(playerBox, m))) {
      this.state = 'fail';
      this.audio?.playSfx('fail');
      return;
    }

    for (const coin of this.coins) {
      if (coin.collected) continue;
      const canCollect = shouldCollectCoin(this.player, coin);
      const before = this.coinsCollected;
      this.coinsCollected = collectCoin(this.coinsCollected, this.level.coinTarget, coin, canCollect);
      if (this.coinsCollected > before) {
        this.audio?.playSfx('coin');
      }
    }

    const roadTop = SAFE_ZONE_HEIGHT;
    if (canWin(this.coinsCollected, this.level.coinTarget, this.player.y, roadTop, this.player.h)) {
      this.state = 'win';
      this.audio?.playSfx('success');
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

    if (this.state === 'pause') {
      this.renderOverlay('已暂停', '按 空格 继续');
      return;
    }

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
      const bodyColor = vehicle.variable
        ? vehicle.phase === 'fast'
          ? '#ff8c61'
          : vehicle.color
        : vehicle.color;
      drawPixelRect(this.ctx, vehicle.x, vehicle.y, vehicle.w, vehicle.h, bodyColor);
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

    for (const coin of this.coins) {
      if (coin.collected) continue;
      drawCoin(this.ctx, coin.x, coin.y, coin.r);
    }

    const staminaRatio = this.player.stamina / this.player.maxStamina;
    drawStaminaBar(this.ctx, 20, 16, 140, 16, staminaRatio);
    if (this.player.dashTimeRemaining > 0) {
      const dashRatio = this.player.dashTimeRemaining / this.player.dashDuration;
      drawDashBar(this.ctx, 20, 36, DASH_BAR_WIDTH, DASH_BAR_HEIGHT, dashRatio);
    }
    drawText(this.ctx, `关卡 ${this.levelIndex}/9`, this.width - 80, 22, 14, '#c7ccd8', 'right');
    drawText(this.ctx, `金币 ${this.coinsCollected}/${this.level.coinTarget}`, this.width - 80, 40, 12, '#f2d45c', 'right');
    drawText(this.ctx, '方向键移动 | D冲刺 | F飞行', this.width / 2, this.height - 18, 12, '#9aa0af');

    if (this.player.y <= SAFE_ZONE_HEIGHT - this.player.h / 2 && this.coinsCollected < this.level.coinTarget) {
      drawText(this.ctx, '金币不足', this.width / 2, SAFE_ZONE_HEIGHT + 10, 14, '#f5a45b');
    }

    if (this.settings?.debugAudio && this.audio?.debug) {
      const d = this.audio.debug;
      drawText(this.ctx, `AUDIO init:${d.initCount} ctx:${d.ctxState}`, 12, 520, 10, '#7fd6f1', 'left');
      drawText(this.ctx, `sfxPools:${d.sfxPools} last:${d.lastSfx}`, 12, 532, 10, '#7fd6f1', 'left');
    }
  }
}
