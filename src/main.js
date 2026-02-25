import { AudioManager } from './audio.js';
import { Game } from './game.js';
import { loadSettings, normalizeSettings, saveSettings } from './settings.js';
import { toDirection } from './touch.js';
import { shouldShowTouchUI } from './mobile.js';
import { computeTargetScale } from './scale.js';

const BASE_WIDTH = 960;
const BASE_HEIGHT = 540;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game(canvas, ctx);
const gameWrap = document.getElementById('game-wrap');
const debugOverlay = document.createElement('div');
debugOverlay.style.position = 'absolute';
debugOverlay.style.left = '8px';
debugOverlay.style.top = '8px';
debugOverlay.style.padding = '6px 8px';
debugOverlay.style.background = 'rgba(0,0,0,0.6)';
debugOverlay.style.color = '#aef';
debugOverlay.style.fontSize = '10px';
debugOverlay.style.zIndex = '10';
debugOverlay.style.whiteSpace = 'pre';
debugOverlay.style.pointerEvents = 'none';
debugOverlay.style.display = 'block';
document.body.appendChild(debugOverlay);

let settings = loadSettings(localStorage);

game.setSettings(settings);

const audio = new AudioManager(
  {
    coin: { src: 'assets/audio/coin.mp3', type: 'sfx' },
    ui: { src: 'assets/audio/ui-click.mp3', type: 'sfx' },
    success: { src: 'assets/audio/success.mp3', type: 'sfx' },
    fail: { src: 'assets/audio/gameover.mp3', type: 'sfx' },
    traffic: { src: 'assets/audio/traffic.ogg', type: 'ambience' },
  },
  settings
);

game.setAudio(audio);

const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

function unlockAudio() {
  audio.init();
  audio.ensureUnlocked();
}

window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

const settingsPanel = document.getElementById('settings-panel');
let settingsDirty = false;

function updateSettingLabel(id, value, format = (v) => v.toFixed(2)) {
  const label = document.getElementById(`${id}Value`);
  if (label) label.textContent = format(value);
}

function bindSlider(id, key, format) {
  const input = document.getElementById(id);
  if (!input) return;
  input.value = settings[key];
  updateSettingLabel(id, settings[key], format);
  input.addEventListener('input', () => {
    settings = normalizeSettings({ ...settings, [key]: parseFloat(input.value) });
    updateSettingLabel(id, settings[key], format);
    saveSettings(localStorage, settings);
    game.setSettings(settings);
    audio.updateVolumes(settings);
    if (
      key === 'vehicleCountScale' ||
      key === 'speedScale' ||
      key === 'reverseChance' ||
      key === 'lengthMin' ||
      key === 'lengthMax'
    ) {
      settingsDirty = true;
    }
    audio.playSfx('ui');
  });
}

bindSlider('masterVolume', 'masterVolume', (v) => Math.round(v * 100));
bindSlider('sfxVolume', 'sfxVolume', (v) => Math.round(v * 100));
bindSlider('ambienceVolume', 'ambienceVolume', (v) => Math.round(v * 100));
bindSlider('vehicleCountScale', 'vehicleCountScale', (v) => v.toFixed(2));
bindSlider('speedScale', 'speedScale', (v) => v.toFixed(2));
bindSlider('reverseChance', 'reverseChance', (v) => v.toFixed(2));
bindSlider('lengthMin', 'lengthMin', (v) => v.toFixed(2));
bindSlider('lengthMax', 'lengthMax', (v) => v.toFixed(2));

const debugAudio = document.getElementById('debugAudio');
if (debugAudio) {
  debugAudio.checked = settings.debugAudio;
  debugAudio.addEventListener('change', () => {
    settings = normalizeSettings({ ...settings, debugAudio: debugAudio.checked });
    saveSettings(localStorage, settings);
    game.setSettings(settings);
    audio.playSfx('ui');
  });
}

function syncSettingsUI() {
  settings = normalizeSettings(settings);
  for (const key of [
    'masterVolume',
    'sfxVolume',
    'ambienceVolume',
    'vehicleCountScale',
    'speedScale',
    'reverseChance',
    'lengthMin',
    'lengthMax',
    'debugAudio',
  ]) {
    const input = document.getElementById(key);
    if (!input) continue;
    if (input.type === 'checkbox') {
      input.checked = Boolean(settings[key]);
    } else {
      input.value = settings[key];
    }
    if (key === 'debugAudio') continue;
    updateSettingLabel(
      key,
      settings[key],
      (v) => (key.includes('Volume') ? Math.round(v * 100) : v.toFixed(2))
    );
  }
}

syncSettingsUI();

const touchUi = document.getElementById('touch-ui');
const touchPause = document.getElementById('touch-pause');
const touchJoystick = document.getElementById('touch-joystick');
const touchStick = document.getElementById('touch-stick');
const touchDash = document.getElementById('touch-dash');
const touchFly = document.getElementById('touch-fly');
const mobileStart = document.getElementById('mobile-start');
const mobileRetry = document.getElementById('mobile-retry');
const mobileNext = document.getElementById('mobile-next');

const touchState = {
  dir: { x: 0, y: 0, active: false },
  dashPressed: false,
  flyPressed: false,
  pausePressed: false,
};

game.setTouchState(touchState);

let currentScale = 1;
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
    gameWrap.style.transformOrigin = 'top left';
  }

  const rect = gameWrap?.getBoundingClientRect();
  debugOverlay.textContent =
    `inner: ${window.innerWidth}x${window.innerHeight}\n` +
    `safe: t${top} r${right} b${bottom} l${left}\n` +
    `ratio: ${ratio}\n` +
    `scale: ${currentScale.toFixed(3)}\n` +
    `wrap: ${rect ? `${rect.x.toFixed(1)},${rect.y.toFixed(1)} ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}` : 'n/a'}`;
}

function applyOrientationClass() {
  if (!touchUi) return;
  const portrait = window.innerHeight >= window.innerWidth;
  touchUi.classList.toggle('portrait', portrait);
  touchUi.classList.toggle('landscape', !portrait);
}

function updateMobileUi() {
  const isMobile = shouldShowTouchUI(window.innerWidth);
  if (touchUi) {
    touchUi.classList.toggle('active', isMobile);
    touchUi.setAttribute('aria-hidden', isMobile ? 'false' : 'true');
  }
  if (mobileStart) {
    mobileStart.classList.toggle('active', isMobile && game.state === 'title');
  }
  if (mobileRetry) {
    mobileRetry.classList.toggle('active', isMobile && game.state === 'fail');
  }
  if (mobileNext) {
    mobileNext.classList.toggle('active', isMobile && (game.state === 'win' || game.state === 'complete'));
    if (game.state === 'complete') {
      mobileNext.textContent = '回到标题';
    } else {
      mobileNext.textContent = '下一关';
    }
  }
}

updateScale();
applyOrientationClass();
updateMobileUi();
window.addEventListener('resize', () => {
  updateScale();
  applyOrientationClass();
  updateMobileUi();
});
window.addEventListener('orientationchange', () => {
  updateScale();
  applyOrientationClass();
  updateMobileUi();
});

let joystickPointerId = null;
let joystickCenter = { x: 0, y: 0 };
const joystickRadius = 50;

function screenToGame(clientX, clientY) {
  const rect = gameWrap?.getBoundingClientRect();
  if (!rect) return { x: clientX, y: clientY };
  return {
    x: (clientX - rect.left) / currentScale,
    y: (clientY - rect.top) / currentScale,
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
  touchStick.style.transform = 'translate(0px, 0px)';
}

if (touchJoystick) {
  touchJoystick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    joystickPointerId = event.pointerId;
    const rect = touchJoystick.getBoundingClientRect();
    const centerScreen = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    joystickCenter = screenToGame(centerScreen.x, centerScreen.y);
    const pos = screenToGame(event.clientX, event.clientY);
    const dx = pos.x - joystickCenter.x;
    const dy = pos.y - joystickCenter.y;
    const dir = toDirection(dx, dy, 12);
    touchState.dir = { ...dir, active: true };
    updateStickVisual(dir.x * joystickRadius, dir.y * joystickRadius);
  });

  touchJoystick.addEventListener('pointermove', (event) => {
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

  touchJoystick.addEventListener('pointerup', endJoystick);
  touchJoystick.addEventListener('pointercancel', endJoystick);
  touchJoystick.addEventListener('pointerleave', endJoystick);
}

function bindPressButton(button, key) {
  if (!button) return;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    touchState[key] = true;
    button.classList.add('active');
  });
  const release = (event) => {
    if (event) event.preventDefault();
    touchState[key] = false;
    button.classList.remove('active');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
}

bindPressButton(touchDash, 'dashPressed');
bindPressButton(touchFly, 'flyPressed');

if (touchPause) {
  touchPause.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    touchState.pausePressed = true;
    setTimeout(() => {
      touchState.pausePressed = false;
    }, 120);
  });
}

if (mobileStart) {
  mobileStart.addEventListener('click', () => {
    if (game.state !== 'title') return;
    game.startLevel(1);
    game.state = 'play';
    audio.playSfx('ui');
    updateMobileUi();
  });
}

if (mobileRetry) {
  mobileRetry.addEventListener('click', () => {
    if (game.state !== 'fail') return;
    game.startLevel(game.levelIndex);
    game.state = 'play';
    audio.playSfx('ui');
    updateMobileUi();
  });
}

if (mobileNext) {
  mobileNext.addEventListener('click', () => {
    if (game.state === 'complete') {
      game.state = 'title';
      audio.playSfx('ui');
      updateMobileUi();
      return;
    }
    if (game.state !== 'win') return;
    game.startLevel(game.levelIndex + 1);
    game.state = 'play';
    audio.playSfx('ui');
    updateMobileUi();
  });
}

let last = performance.now();
let lastState = game.state;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.setKeys(keys);
  game.setTouchState(touchState);
  game.update(dt);
  game.render();

  if (game.state !== lastState) {
    if (game.state === 'pause') {
      settingsPanel.classList.add('open');
      settingsPanel.setAttribute('aria-hidden', 'false');
    } else {
      settingsPanel.classList.remove('open');
      settingsPanel.setAttribute('aria-hidden', 'true');
      if (lastState === 'pause' && settingsDirty) {
        game.startLevel(game.levelIndex);
        settingsDirty = false;
      }
    }
    updateMobileUi();
    lastState = game.state;
  }

  if (game.state === 'play') {
    audio.playAmbience('traffic');
  } else {
    audio.stopAmbience('traffic');
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
