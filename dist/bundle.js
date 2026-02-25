var CrossRoad = (() => {
  // src/audio.js
  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }
  function computeVolume(master, channel) {
    return clamp(master * channel);
  }
  var AudioManager = class {
    constructor(sounds, settings2) {
      this.sounds = sounds;
      this.settings = settings2;
      this.ctx = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.ambienceGain = null;
      this.buffers = /* @__PURE__ */ new Map();
      this.elements = /* @__PURE__ */ new Map();
      this.sfxPools = /* @__PURE__ */ new Map();
      this.sfxIndex = /* @__PURE__ */ new Map();
      this.initialized = false;
      this.debug = {
        initCount: 0,
        lastSfx: "",
        lastSfxAt: 0,
        sfxPools: 0,
        ambienceCount: 0,
        ctxState: "none"
      };
    }
    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.debug.initCount += 1;
      const isFileProtocol = typeof window !== "undefined" && window.location?.protocol === "file:";
      if (!isFileProtocol && (window.AudioContext || window.webkitAudioContext)) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.ambienceGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);
        this.ambienceGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
        this.debug.ctxState = this.ctx.state;
      } else {
        this.debug.ctxState = isFileProtocol ? "file-no-ctx" : "unavailable";
      }
      for (const [name, sound] of Object.entries(this.sounds)) {
        if (sound.type === "sfx") {
          this.createSfxPool(name, sound.src);
        } else {
          this.createElement(name, sound.src, this.ambienceGain, true);
        }
      }
      this.debug.sfxPools = this.sfxPools.size;
      this.debug.ambienceCount = this.elements.size;
      this.updateVolumes(this.settings);
    }
    createElement(name, src, gainNode, loop2 = false) {
      const el = new Audio(src);
      el.preload = "auto";
      el.loop = loop2;
      this.elements.set(name, el);
      if (this.ctx && gainNode) {
        const node = this.ctx.createMediaElementSource(el);
        node.connect(gainNode);
      }
      return el;
    }
    createSfxPool(name, src) {
      const poolSize = 4;
      const pool = [];
      for (let i = 0; i < poolSize; i += 1) {
        const el = this.createElement(`${name}_${i}`, src, this.sfxGain, false);
        pool.push(el);
      }
      this.sfxPools.set(name, pool);
      this.sfxIndex.set(name, 0);
    }
    ensureUnlocked() {
      if (!this.initialized) {
        this.init();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      if (this.ctx) {
        this.debug.ctxState = this.ctx.state;
      }
    }
    updateVolumes(settings2) {
      this.settings = settings2;
      const master = computeVolume(settings2.masterVolume, 1);
      const sfx = computeVolume(settings2.masterVolume, settings2.sfxVolume);
      const ambience = computeVolume(settings2.masterVolume, settings2.ambienceVolume);
      if (this.masterGain) {
        this.masterGain.gain.value = master;
      }
      if (this.sfxGain) {
        this.sfxGain.gain.value = sfx;
      }
      if (this.ambienceGain) {
        this.ambienceGain.gain.value = ambience;
      }
      for (const pool of this.sfxPools.values()) {
        for (const el of pool) {
          el.volume = sfx;
        }
      }
      for (const [name, el] of this.elements.entries()) {
        if (name.includes("_")) continue;
        el.volume = ambience;
      }
    }
    playSfx(name) {
      if (!this.initialized) {
        this.init();
      }
      if (!this.ctx) {
        const sound = this.sounds[name];
        if (!sound) return;
        const el2 = new Audio(sound.src);
        el2.volume = computeVolume(this.settings.masterVolume, this.settings.sfxVolume);
        this.ensureUnlocked();
        el2.currentTime = 0;
        el2.play();
        this.debug.lastSfx = name;
        this.debug.lastSfxAt = performance.now();
        return;
      }
      const pool = this.sfxPools.get(name);
      if (!pool || pool.length === 0) return;
      const idx = this.sfxIndex.get(name) ?? 0;
      const el = pool[idx];
      this.sfxIndex.set(name, (idx + 1) % pool.length);
      this.ensureUnlocked();
      el.currentTime = 0;
      el.play();
      this.debug.lastSfx = name;
      this.debug.lastSfxAt = performance.now();
    }
    playAmbience(name) {
      if (!this.initialized) {
        this.init();
      }
      const el = this.elements.get(name);
      if (!el) return;
      this.ensureUnlocked();
      if (el.paused) {
        el.play();
      }
    }
    stopAmbience(name) {
      const el = this.elements.get(name);
      if (!el) return;
      el.pause();
      el.currentTime = 0;
    }
  };

  // src/collision.js
  function aabbIntersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // src/coins.js
  function shouldCollectCoin(player, coin) {
    if (player.isFlying) return false;
    const box = { x: coin.x - coin.r, y: coin.y - coin.r, w: coin.r * 2, h: coin.r * 2 };
    return aabbIntersects(player, box);
  }
  function collectCoin(current, target, coin, canCollect) {
    if (!canCollect) return current;
    if (coin.collected) return current;
    if (current >= target) return current;
    coin.collected = true;
    return current + 1;
  }
  function canWin(coinCount, target, playerY, roadTop, playerH) {
    return coinCount >= target && playerY <= roadTop - playerH / 2;
  }

  // src/level-gen.js
  function generateLevel(level) {
    const clamped = Math.max(1, Math.min(level, 9));
    const laneCount = 3 + clamped;
    const baseSpeed = 60 + clamped * 12;
    const lanes = Array.from({ length: laneCount }, (_, i) => ({
      index: i,
      direction: i % 2 === 0 ? 1 : -1,
      speed: baseSpeed + i * 6,
      vehicleCount: 2 + Math.floor(clamped / 2)
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
      vehicleCountPerLane: Math.min(8, 5 + Math.floor(clamped / 3))
    };
  }

  // src/player.js
  function createPlayer(level = 1) {
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
      h: 18
    };
  }
  function updateStamina(player, dt, rates) {
    const isDraining = player.isFlying || player.dashTimeRemaining > 0;
    if (isDraining) {
      const drain = player.isFlying ? rates.flyDrainPerSec : rates.dashDrainPerSec;
      player.stamina = Math.max(0, player.stamina - drain * dt);
    } else {
      player.stamina = Math.min(player.maxStamina, player.stamina + rates.regenPerSec * dt);
    }
  }
  function toggleFlight(player, wantsToggle) {
    if (!wantsToggle) return;
    if (player.isFlying) {
      player.isFlying = false;
      return;
    }
    if (player.stamina > 0) {
      player.isFlying = true;
    }
  }
  function tryStartDash(player, inputVector2) {
    if (player.isFlying) return;
    if (player.dashTimeRemaining > 0) return;
    if (player.stamina <= 0) return;
    if (inputVector2.x === 0 && inputVector2.y === 0) return;
    player.dashVector = { x: inputVector2.x, y: inputVector2.y };
    player.dashTimeRemaining = player.dashDuration;
  }
  function updateDash(player, dt) {
    player.dashTimeRemaining = Math.max(0, player.dashTimeRemaining - dt);
  }

  // src/input.js
  function inputVector(keys2) {
    let x = 0;
    let y = 0;
    if (keys2.ArrowLeft) x -= 1;
    if (keys2.ArrowRight) x += 1;
    if (keys2.ArrowUp) y -= 1;
    if (keys2.ArrowDown) y += 1;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }

  // src/entities.js
  function updateVehicle(vehicle, dt, width) {
    maybeReverseVehicle(vehicle, dt, vehicle.reverseChance ?? 0);
    if (vehicle.variable) {
      vehicle.phaseTime += dt;
      const duration = vehicle.phase === "fast" ? vehicle.fastDuration : vehicle.slowDuration;
      if (vehicle.phaseTime >= duration) {
        vehicle.phaseTime = 0;
        vehicle.phase = vehicle.phase === "fast" ? "slow" : "fast";
      }
      vehicle.speed = vehicle.phase === "fast" ? vehicle.fastSpeed : vehicle.slowSpeed;
    }
    vehicle.x += vehicle.speed * vehicle.dir * dt;
    if (vehicle.dir === 1 && vehicle.x > width) {
      vehicle.x = -vehicle.w;
    }
    if (vehicle.dir === -1 && vehicle.x + vehicle.w < 0) {
      vehicle.x = width;
    }
  }
  function maybeReverseVehicle(vehicle, dt, chance) {
    vehicle.reverseCooldown = Math.max(0, (vehicle.reverseCooldown ?? 0) - dt);
    if (vehicle.reverseCooldown > 0) return;
    if (Math.random() < chance) {
      vehicle.dir *= -1;
      vehicle.reverseCooldown = 3 + Math.random() * 2;
    }
  }

  // src/renderer.js
  function clearScreen(ctx2, width, height) {
    ctx2.clearRect(0, 0, width, height);
  }
  function drawPixelRect(ctx2, x, y, w, h, color) {
    ctx2.fillStyle = color;
    ctx2.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function drawText(ctx2, text, x, y, size, color, align = "center") {
    ctx2.fillStyle = color;
    ctx2.font = `${size}px "Courier New", Courier, monospace`;
    ctx2.textAlign = align;
    ctx2.textBaseline = "middle";
    ctx2.fillText(text, x, y);
  }
  function drawStaminaBar(ctx2, x, y, width, height, ratio) {
    drawPixelRect(ctx2, x, y, width, height, "#1b1f2a");
    drawPixelRect(ctx2, x + 2, y + 2, (width - 4) * ratio, height - 4, "#4ce1b6");
    ctx2.strokeStyle = "#2f3545";
    ctx2.strokeRect(x, y, width, height);
  }
  function drawDashBar(ctx2, x, y, width, height, ratio) {
    drawPixelRect(ctx2, x, y, width, height, "#1b1f2a");
    drawPixelRect(ctx2, x + 2, y + 2, (width - 4) * ratio, height - 4, "#f2a65a");
    ctx2.strokeStyle = "#2f3545";
    ctx2.strokeRect(x, y, width, height);
  }
  function drawCoin(ctx2, x, y, r) {
    drawPixelRect(ctx2, x - r, y - r, r * 2, r * 2, "#f5d34b");
    drawPixelRect(ctx2, x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4, "#e2b93f");
    drawPixelRect(ctx2, x - 1, y - 1, 2, 2, "#fff2a6");
  }

  // src/settings.js
  var defaultSettings = {
    masterVolume: 0.8,
    sfxVolume: 0.8,
    ambienceVolume: 0.5,
    vehicleCountScale: 1,
    vehicleCountScaleMin: 0.6,
    vehicleCountScaleMax: 1.4,
    speedScale: 1,
    speedScaleMin: 0.6,
    speedScaleMax: 1.6,
    reverseChance: 0.12,
    reverseChanceMin: 0,
    reverseChanceMax: 0.2,
    lengthMin: 0.7,
    lengthMinMin: 0.5,
    lengthMinMax: 1,
    lengthMax: 1.3,
    lengthMaxMin: 1,
    lengthMaxMax: 1.6,
    debugAudio: false
  };
  function clamp2(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function normalizeSettings(input = {}) {
    const merged = { ...defaultSettings, ...input };
    const lengthMin = clamp2(merged.lengthMin, defaultSettings.lengthMinMin, defaultSettings.lengthMinMax);
    const lengthMaxRaw = clamp2(
      merged.lengthMax,
      defaultSettings.lengthMaxMin,
      defaultSettings.lengthMaxMax
    );
    const lengthMax = Math.max(lengthMin, lengthMaxRaw);
    return {
      ...merged,
      masterVolume: clamp2(merged.masterVolume, 0, 1),
      sfxVolume: clamp2(merged.sfxVolume, 0, 1),
      ambienceVolume: clamp2(merged.ambienceVolume, 0, 1),
      vehicleCountScale: clamp2(
        merged.vehicleCountScale,
        defaultSettings.vehicleCountScaleMin,
        defaultSettings.vehicleCountScaleMax
      ),
      speedScale: clamp2(merged.speedScale, defaultSettings.speedScaleMin, defaultSettings.speedScaleMax),
      reverseChance: clamp2(
        merged.reverseChance,
        defaultSettings.reverseChanceMin,
        defaultSettings.reverseChanceMax
      ),
      lengthMin,
      lengthMax,
      debugAudio: Boolean(merged.debugAudio)
    };
  }
  function loadSettings(storage, key = "crossRoadSettings") {
    try {
      const raw = storage?.getItem?.(key);
      if (!raw) return normalizeSettings();
      return normalizeSettings(JSON.parse(raw));
    } catch {
      return normalizeSettings();
    }
  }
  function saveSettings(storage, settings2, key = "crossRoadSettings") {
    if (!storage?.setItem) return;
    storage.setItem(key, JSON.stringify(normalizeSettings(settings2)));
  }

  // src/touch.js
  function normalizeStick(dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    const x = dx / len;
    const y = dy / len;
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }
  function toDirection(dx, dy, deadZone = 0.2) {
    const len = Math.hypot(dx, dy);
    if (len < deadZone) return { x: 0, y: 0 };
    return normalizeStick(dx, dy);
  }
  function mergeInput(keyDir, touchDir) {
    if (touchDir?.active) return { x: touchDir.x, y: touchDir.y };
    return keyDir;
  }

  // src/game.js
  var SAFE_ZONE_HEIGHT = 60;
  var AIR_MONSTER_SIZE = 16;
  var GROUND_MONSTER_SIZE = 18;
  var VEHICLE_HEIGHT_RATIO = 0.6;
  var DASH_BAR_WIDTH = 90;
  var DASH_BAR_HEIGHT = 8;
  var COIN_RADIUS = 6;
  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }
  var Game = class {
    constructor(canvas2, ctx2) {
      this.canvas = canvas2;
      this.ctx = ctx2;
      this.width = canvas2.width;
      this.height = canvas2.height;
      this.state = "title";
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
      this.touchState = null;
    }
    setKeys(keys2) {
      this.keys = keys2;
    }
    setAudio(audio2) {
      this.audio = audio2;
    }
    setSettings(settings2) {
      this.settings = normalizeSettings(settings2);
    }
    setTouchState(touchState2) {
      this.touchState = touchState2;
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
        const vehicleCount = Math.max(5, Math.min(8, scaledCount + i % 2));
        return Array.from({ length: vehicleCount }, (_, v) => {
          const lengthMin = this.settings.lengthMin;
          const lengthMax = this.settings.lengthMax;
          const lengthScale = randomBetween(lengthMin, lengthMax);
          const w = 42 * lengthScale;
          const h = laneHeight * VEHICLE_HEIGHT_RATIO;
          const x = v * (this.width / vehicleCount) % this.width;
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
            phase: "fast",
            phaseTime: Math.random() * 1.5,
            reverseChance: this.settings.reverseChance,
            reverseCooldown: 1 + Math.random() * 2,
            color: lane.direction === 1 ? "#f8575d" : "#4bc0ff"
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
          collected: false
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
          x: 40 + i % 2 * (this.width - 80),
          y,
          w: GROUND_MONSTER_SIZE,
          h: GROUND_MONSTER_SIZE,
          minX: 40,
          maxX: this.width - 40 - GROUND_MONSTER_SIZE,
          speed: 40 + i * 6,
          dir: i % 2 === 0 ? 1 : -1
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
        active: false
      }));
    }
    update(dt) {
      const pressedEnter = this.wasPressed("Enter");
      const pressedDash = this.wasPressed("KeyD");
      const pressedFlight = this.wasPressed("KeyF");
      const pressedPause = this.wasPressed("Space");
      if (this.state === "title") {
        if (pressedEnter) {
          this.startLevel(1);
          this.state = "play";
          this.audio?.playSfx("ui");
        }
        this.syncKeys();
        return;
      }
      if (this.state === "pause") {
        if (pressedPause) {
          this.state = "play";
          this.audio?.playSfx("ui");
        }
        if (this.touchState?.pausePressed) {
          this.state = "play";
          this.audio?.playSfx("ui");
        }
        this.syncKeys();
        return;
      }
      if (this.state === "win") {
        if (pressedEnter) {
          if (this.levelIndex >= 9) {
            this.state = "complete";
          } else {
            this.startLevel(this.levelIndex + 1);
            this.state = "play";
          }
          this.audio?.playSfx("ui");
        }
        this.syncKeys();
        return;
      }
      if (this.state === "complete") {
        if (pressedEnter) {
          this.state = "title";
          this.audio?.playSfx("ui");
        }
        this.syncKeys();
        return;
      }
      if (this.state === "fail") {
        if (pressedEnter) {
          this.startLevel(this.levelIndex);
          this.state = "play";
          this.audio?.playSfx("ui");
        }
        this.syncKeys();
        return;
      }
      if (this.state !== "play") {
        this.syncKeys();
        return;
      }
      if (pressedPause || this.touchState?.pausePressed) {
        this.state = "pause";
        this.audio?.playSfx("ui");
        this.syncKeys();
        return;
      }
      const keyMove = inputVector(this.keys);
      const move = mergeInput(keyMove, this.touchState?.dir);
      const dashPressed = pressedDash || this.touchState?.dashPressed;
      const flyPressed = pressedFlight || this.touchState?.flyPressed;
      if (dashPressed) {
        tryStartDash(this.player, move);
      }
      toggleFlight(this.player, flyPressed);
      updateDash(this.player, dt);
      updateStamina(this.player, dt, {
        flyDrainPerSec: this.level.flyDrainPerSec,
        dashDrainPerSec: this.level.dashDrainPerSec,
        regenPerSec: this.level.staminaRegenPerSec
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
        monster.x += dx / len * monster.speed * dt;
        monster.y += dy / len * monster.speed * dt;
      }
      const playerBox = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
      if (!this.player.isFlying) {
        if (this.vehicles.some((v) => aabbIntersects(playerBox, v))) {
          this.state = "fail";
          this.audio?.playSfx("fail");
          return;
        }
        if (this.groundMonsters.some((m) => aabbIntersects(playerBox, m))) {
          this.state = "fail";
          this.audio?.playSfx("fail");
          return;
        }
      }
      if (this.airMonsters.some((m) => m.active && aabbIntersects(playerBox, m))) {
        this.state = "fail";
        this.audio?.playSfx("fail");
        return;
      }
      for (const coin of this.coins) {
        if (coin.collected) continue;
        const canCollect = shouldCollectCoin(this.player, coin);
        const before = this.coinsCollected;
        this.coinsCollected = collectCoin(this.coinsCollected, this.level.coinTarget, coin, canCollect);
        if (this.coinsCollected > before) {
          this.audio?.playSfx("coin");
        }
      }
      const roadTop = SAFE_ZONE_HEIGHT;
      if (canWin(this.coinsCollected, this.level.coinTarget, this.player.y, roadTop, this.player.h)) {
        this.state = "win";
        this.audio?.playSfx("success");
      }
      this.syncKeys();
    }
    render() {
      clearScreen(this.ctx, this.width, this.height);
      if (this.state === "title") {
        this.renderTitle();
        return;
      }
      this.renderWorld();
      if (this.state === "pause") {
        this.renderOverlay("\u5DF2\u6682\u505C", "\u6309 \u7A7A\u683C \u7EE7\u7EED");
        return;
      }
      if (this.state === "fail") {
        this.renderOverlay("\u5931\u8D25", "\u6309 Enter \u91CD\u6765");
        return;
      }
      if (this.state === "win") {
        this.renderOverlay("\u8FC7\u5173", "\u6309 Enter \u7EE7\u7EED");
        return;
      }
      if (this.state === "complete") {
        this.renderOverlay("\u901A\u5173\u5B8C\u6210", "\u6309 Enter \u56DE\u5230\u6807\u9898");
      }
    }
    renderTitle() {
      const cx = this.width / 2;
      const cy = this.height / 2;
      drawText(this.ctx, "Cross Road", cx, cy - 40, 42, "#f5f5f5");
      drawText(this.ctx, "\u6309 Enter \u5F00\u59CB", cx, cy + 20, 18, "#9aa0af");
    }
    renderOverlay(title, subtitle) {
      drawPixelRect(this.ctx, 0, 0, this.width, this.height, "rgba(0,0,0,0.45)");
      drawText(this.ctx, title, this.width / 2, this.height / 2 - 10, 36, "#f5f5f5");
      drawText(this.ctx, subtitle, this.width / 2, this.height / 2 + 26, 16, "#9aa0af");
    }
    renderWorld() {
      const roadTop = SAFE_ZONE_HEIGHT;
      const roadBottom = this.height - SAFE_ZONE_HEIGHT;
      drawPixelRect(this.ctx, 0, 0, this.width, roadTop, "#1a2a1f");
      drawPixelRect(this.ctx, 0, roadTop, this.width, roadBottom - roadTop, "#2a2e3a");
      drawPixelRect(this.ctx, 0, roadBottom, this.width, SAFE_ZONE_HEIGHT, "#1a2a1f");
      const laneHeight = (roadBottom - roadTop) / this.level.lanes.length;
      for (let i = 1; i < this.level.lanes.length; i += 1) {
        const y = roadTop + i * laneHeight;
        drawPixelRect(this.ctx, 0, y, this.width, 2, "#3a3f4c");
      }
      for (const vehicle of this.vehicles) {
        const bodyColor = vehicle.variable ? vehicle.phase === "fast" ? "#ff8c61" : vehicle.color : vehicle.color;
        drawPixelRect(this.ctx, vehicle.x, vehicle.y, vehicle.w, vehicle.h, bodyColor);
        drawPixelRect(this.ctx, vehicle.x + 4, vehicle.y + 4, 6, 6, "#ffe57a");
      }
      for (const monster of this.groundMonsters) {
        drawPixelRect(this.ctx, monster.x, monster.y, monster.w, monster.h, "#2cc38a");
        drawPixelRect(this.ctx, monster.x + 4, monster.y + 4, 4, 4, "#0a5b3b");
      }
      drawPixelRect(this.ctx, this.player.x, this.player.y, this.player.w, this.player.h, "#f5d34b");
      if (this.player.isFlying) {
        drawPixelRect(this.ctx, this.player.x + 4, this.player.y + this.player.h, 8, 6, "#ff8c42");
      }
      for (const monster of this.airMonsters) {
        if (!monster.active) continue;
        drawPixelRect(this.ctx, monster.x, monster.y, monster.w, monster.h, "#4d7cff");
        drawPixelRect(this.ctx, monster.x + 2, monster.y + 2, 4, 4, "#a4c2ff");
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
      drawText(this.ctx, `\u5173\u5361 ${this.levelIndex}/9`, this.width - 80, 22, 14, "#c7ccd8", "right");
      drawText(this.ctx, `\u91D1\u5E01 ${this.coinsCollected}/${this.level.coinTarget}`, this.width - 80, 40, 12, "#f2d45c", "right");
      drawText(this.ctx, "\u65B9\u5411\u952E\u79FB\u52A8 | D\u51B2\u523A | F\u98DE\u884C", this.width / 2, this.height - 18, 12, "#9aa0af");
      if (this.player.y <= SAFE_ZONE_HEIGHT - this.player.h / 2 && this.coinsCollected < this.level.coinTarget) {
        drawText(this.ctx, "\u91D1\u5E01\u4E0D\u8DB3", this.width / 2, SAFE_ZONE_HEIGHT + 10, 14, "#f5a45b");
      }
      if (this.settings?.debugAudio && this.audio?.debug) {
        const d = this.audio.debug;
        drawText(this.ctx, `AUDIO init:${d.initCount} ctx:${d.ctxState}`, 12, 520, 10, "#7fd6f1", "left");
        drawText(this.ctx, `sfxPools:${d.sfxPools} last:${d.lastSfx}`, 12, 532, 10, "#7fd6f1", "left");
      }
    }
  };

  // src/mobile.js
  function isMobileWidth(width, threshold = 900) {
    return width < threshold;
  }
  function shouldShowTouchUI(width) {
    return isMobileWidth(width);
  }

  // src/scale.js
  function computeScale(viewW, viewH, baseW = 960, baseH = 540) {
    return Math.min(viewW / baseW, viewH / baseH);
  }
  function computeTargetScale(viewW, viewH, baseW = 960, baseH = 540, ratio = 1) {
    return computeScale(viewW, viewH, baseW, baseH) * ratio;
  }

  // src/main.js
  var BASE_WIDTH = 960;
  var BASE_HEIGHT = 540;
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var game = new Game(canvas, ctx);
  var gameWrap = document.getElementById("game-wrap");
  var debugOverlay = document.createElement("div");
  debugOverlay.style.position = "absolute";
  debugOverlay.style.left = "8px";
  debugOverlay.style.top = "8px";
  debugOverlay.style.padding = "6px 8px";
  debugOverlay.style.background = "rgba(0,0,0,0.6)";
  debugOverlay.style.color = "#aef";
  debugOverlay.style.fontSize = "10px";
  debugOverlay.style.zIndex = "10";
  debugOverlay.style.whiteSpace = "pre";
  debugOverlay.style.pointerEvents = "none";
  debugOverlay.style.display = "block";
  document.body.appendChild(debugOverlay);
  var settings = loadSettings(localStorage);
  game.setSettings(settings);
  var audio = new AudioManager(
    {
      coin: { src: "assets/audio/coin.mp3", type: "sfx" },
      ui: { src: "assets/audio/ui-click.mp3", type: "sfx" },
      success: { src: "assets/audio/success.mp3", type: "sfx" },
      fail: { src: "assets/audio/gameover.mp3", type: "sfx" },
      traffic: { src: "assets/audio/traffic.ogg", type: "ambience" }
    },
    settings
  );
  game.setAudio(audio);
  var keys = {};
  window.addEventListener("keydown", (event) => {
    keys[event.code] = true;
  });
  window.addEventListener("keyup", (event) => {
    keys[event.code] = false;
  });
  function unlockAudio() {
    audio.init();
    audio.ensureUnlocked();
  }
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  var settingsPanel = document.getElementById("settings-panel");
  var settingsDirty = false;
  function updateSettingLabel(id, value, format = (v) => v.toFixed(2)) {
    const label = document.getElementById(`${id}Value`);
    if (label) label.textContent = format(value);
  }
  function bindSlider(id, key, format) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = settings[key];
    updateSettingLabel(id, settings[key], format);
    input.addEventListener("input", () => {
      settings = normalizeSettings({ ...settings, [key]: parseFloat(input.value) });
      updateSettingLabel(id, settings[key], format);
      saveSettings(localStorage, settings);
      game.setSettings(settings);
      audio.updateVolumes(settings);
      if (key === "vehicleCountScale" || key === "speedScale" || key === "reverseChance" || key === "lengthMin" || key === "lengthMax") {
        settingsDirty = true;
      }
      audio.playSfx("ui");
    });
  }
  bindSlider("masterVolume", "masterVolume", (v) => Math.round(v * 100));
  bindSlider("sfxVolume", "sfxVolume", (v) => Math.round(v * 100));
  bindSlider("ambienceVolume", "ambienceVolume", (v) => Math.round(v * 100));
  bindSlider("vehicleCountScale", "vehicleCountScale", (v) => v.toFixed(2));
  bindSlider("speedScale", "speedScale", (v) => v.toFixed(2));
  bindSlider("reverseChance", "reverseChance", (v) => v.toFixed(2));
  bindSlider("lengthMin", "lengthMin", (v) => v.toFixed(2));
  bindSlider("lengthMax", "lengthMax", (v) => v.toFixed(2));
  var debugAudio = document.getElementById("debugAudio");
  if (debugAudio) {
    debugAudio.checked = settings.debugAudio;
    debugAudio.addEventListener("change", () => {
      settings = normalizeSettings({ ...settings, debugAudio: debugAudio.checked });
      saveSettings(localStorage, settings);
      game.setSettings(settings);
      audio.playSfx("ui");
    });
  }
  function syncSettingsUI() {
    settings = normalizeSettings(settings);
    for (const key of [
      "masterVolume",
      "sfxVolume",
      "ambienceVolume",
      "vehicleCountScale",
      "speedScale",
      "reverseChance",
      "lengthMin",
      "lengthMax",
      "debugAudio"
    ]) {
      const input = document.getElementById(key);
      if (!input) continue;
      if (input.type === "checkbox") {
        input.checked = Boolean(settings[key]);
      } else {
        input.value = settings[key];
      }
      if (key === "debugAudio") continue;
      updateSettingLabel(
        key,
        settings[key],
        (v) => key.includes("Volume") ? Math.round(v * 100) : v.toFixed(2)
      );
    }
  }
  syncSettingsUI();
  var touchUi = document.getElementById("touch-ui");
  var touchPause = document.getElementById("touch-pause");
  var touchJoystick = document.getElementById("touch-joystick");
  var touchStick = document.getElementById("touch-stick");
  var touchDash = document.getElementById("touch-dash");
  var touchFly = document.getElementById("touch-fly");
  var mobileStart = document.getElementById("mobile-start");
  var mobileRetry = document.getElementById("mobile-retry");
  var mobileNext = document.getElementById("mobile-next");
  var touchState = {
    dir: { x: 0, y: 0, active: false },
    dashPressed: false,
    flyPressed: false,
    pausePressed: false
  };
  game.setTouchState(touchState);
  var currentScale = 1;
  function getSafeArea() {
    const style = getComputedStyle(document.body);
    const top = parseFloat(style.paddingTop) || 0;
    const right = parseFloat(style.paddingRight) || 0;
    const bottom = parseFloat(style.paddingBottom) || 0;
    const left = parseFloat(style.paddingLeft) || 0;
    return { top, right, bottom, left };
  }
  function updateScale() {
    const { top, right, bottom, left } = getSafeArea();
    const availW = window.innerWidth - left - right;
    const availH = window.innerHeight - top - bottom;
    const isPortrait = window.innerHeight >= window.innerWidth;
    const ratio = isPortrait ? 0.6 : 0.8;
    currentScale = computeTargetScale(availW, availH, BASE_WIDTH, BASE_HEIGHT, ratio);
    if (!Number.isFinite(currentScale) || currentScale <= 0) {
      currentScale = 1;
    }
    if (gameWrap) {
      const scaledW = BASE_WIDTH * currentScale;
      const scaledH = BASE_HEIGHT * currentScale;
      const offsetX = (availW - scaledW) / 2 + left;
      const offsetY = (availH - scaledH) / 2 + top;
      gameWrap.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`;
      gameWrap.style.transformOrigin = "top left";
    }
    const rect = gameWrap?.getBoundingClientRect();
    debugOverlay.textContent = `inner: ${window.innerWidth}x${window.innerHeight}
safe: t${top} r${right} b${bottom} l${left}
ratio: ${ratio}
scale: ${currentScale.toFixed(3)}
wrap: ${rect ? `${rect.x.toFixed(1)},${rect.y.toFixed(1)} ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}` : "n/a"}`;
  }
  function applyOrientationClass() {
    if (!touchUi) return;
    const portrait = window.innerHeight >= window.innerWidth;
    touchUi.classList.toggle("portrait", portrait);
    touchUi.classList.toggle("landscape", !portrait);
  }
  function updateMobileUi() {
    const isMobile = shouldShowTouchUI(window.innerWidth);
    if (touchUi) {
      touchUi.classList.toggle("active", isMobile);
      touchUi.setAttribute("aria-hidden", isMobile ? "false" : "true");
    }
    if (mobileStart) {
      mobileStart.classList.toggle("active", isMobile && game.state === "title");
    }
    if (mobileRetry) {
      mobileRetry.classList.toggle("active", isMobile && game.state === "fail");
    }
    if (mobileNext) {
      mobileNext.classList.toggle("active", isMobile && (game.state === "win" || game.state === "complete"));
      if (game.state === "complete") {
        mobileNext.textContent = "\u56DE\u5230\u6807\u9898";
      } else {
        mobileNext.textContent = "\u4E0B\u4E00\u5173";
      }
    }
  }
  updateScale();
  applyOrientationClass();
  updateMobileUi();
  window.addEventListener("resize", () => {
    updateScale();
    applyOrientationClass();
    updateMobileUi();
  });
  window.addEventListener("orientationchange", () => {
    updateScale();
    applyOrientationClass();
    updateMobileUi();
  });
  var joystickPointerId = null;
  var joystickCenter = { x: 0, y: 0 };
  var joystickRadius = 50;
  function screenToGame(clientX, clientY) {
    const rect = gameWrap?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left) / currentScale,
      y: (clientY - rect.top) / currentScale
    };
  }
  function updateStickVisual(dx, dy) {
    if (!touchStick) return;
    const max = joystickRadius;
    const clampedX = Math.max(-max, Math.min(max, dx));
    const clampedY = Math.max(-max, Math.min(max, dy));
    touchStick.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
  }
  function resetStickVisual() {
    if (!touchStick) return;
    touchStick.style.transform = "translate(0px, 0px)";
  }
  if (touchJoystick) {
    touchJoystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      joystickPointerId = event.pointerId;
      const rect = touchJoystick.getBoundingClientRect();
      const centerScreen = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      joystickCenter = screenToGame(centerScreen.x, centerScreen.y);
      const pos = screenToGame(event.clientX, event.clientY);
      const dx = pos.x - joystickCenter.x;
      const dy = pos.y - joystickCenter.y;
      const dir = toDirection(dx, dy, 12);
      touchState.dir = { ...dir, active: true };
      updateStickVisual(dir.x * joystickRadius, dir.y * joystickRadius);
    });
    touchJoystick.addEventListener("pointermove", (event) => {
      if (joystickPointerId !== event.pointerId) return;
      event.preventDefault();
      const pos = screenToGame(event.clientX, event.clientY);
      const dx = pos.x - joystickCenter.x;
      const dy = pos.y - joystickCenter.y;
      const dir = toDirection(dx, dy, 12);
      touchState.dir = { ...dir, active: true };
      updateStickVisual(dir.x * joystickRadius, dir.y * joystickRadius);
    });
    const endJoystick = (event) => {
      if (joystickPointerId !== event.pointerId) return;
      event.preventDefault();
      joystickPointerId = null;
      touchState.dir = { x: 0, y: 0, active: false };
      resetStickVisual();
    };
    touchJoystick.addEventListener("pointerup", endJoystick);
    touchJoystick.addEventListener("pointercancel", endJoystick);
    touchJoystick.addEventListener("pointerleave", endJoystick);
  }
  function bindPressButton(button, key) {
    if (!button) return;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      touchState[key] = true;
      button.classList.add("active");
    });
    const release = (event) => {
      if (event) event.preventDefault();
      touchState[key] = false;
      button.classList.remove("active");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  }
  bindPressButton(touchDash, "dashPressed");
  bindPressButton(touchFly, "flyPressed");
  if (touchPause) {
    touchPause.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      touchState.pausePressed = true;
      setTimeout(() => {
        touchState.pausePressed = false;
      }, 120);
    });
  }
  if (mobileStart) {
    mobileStart.addEventListener("click", () => {
      if (game.state !== "title") return;
      game.startLevel(1);
      game.state = "play";
      audio.playSfx("ui");
      updateMobileUi();
    });
  }
  if (mobileRetry) {
    mobileRetry.addEventListener("click", () => {
      if (game.state !== "fail") return;
      game.startLevel(game.levelIndex);
      game.state = "play";
      audio.playSfx("ui");
      updateMobileUi();
    });
  }
  if (mobileNext) {
    mobileNext.addEventListener("click", () => {
      if (game.state === "complete") {
        game.state = "title";
        audio.playSfx("ui");
        updateMobileUi();
        return;
      }
      if (game.state !== "win") return;
      game.startLevel(game.levelIndex + 1);
      game.state = "play";
      audio.playSfx("ui");
      updateMobileUi();
    });
  }
  var last = performance.now();
  var lastState = game.state;
  function loop(now) {
    const dt = Math.min((now - last) / 1e3, 0.05);
    last = now;
    game.setKeys(keys);
    game.setTouchState(touchState);
    game.update(dt);
    game.render();
    if (game.state !== lastState) {
      if (game.state === "pause") {
        settingsPanel.classList.add("open");
        settingsPanel.setAttribute("aria-hidden", "false");
      } else {
        settingsPanel.classList.remove("open");
        settingsPanel.setAttribute("aria-hidden", "true");
        if (lastState === "pause" && settingsDirty) {
          game.startLevel(game.levelIndex);
          settingsDirty = false;
        }
      }
      updateMobileUi();
      lastState = game.state;
    }
    if (game.state === "play") {
      audio.playAmbience("traffic");
    } else {
      audio.stopAmbience("traffic");
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
