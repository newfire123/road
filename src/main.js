import { AudioManager } from './audio.js';
import { Game } from './game.js';
import { defaultSettings, loadSettings, normalizeSettings, saveSettings } from './settings.js';
import { toDirection } from './touch.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game(canvas, ctx);

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

const touchState = {
  dir: { x: 0, y: 0, active: false },
  dashPressed: false,
  flyPressed: false,
  pausePressed: false,
};

game.setTouchState(touchState);

function setTouchUiActive(active) {
  if (!touchUi) return;
  if (active) {
    touchUi.classList.add('active');
    touchUi.setAttribute('aria-hidden', 'false');
  } else {
    touchUi.classList.remove('active');
    touchUi.setAttribute('aria-hidden', 'true');
  }
}

function applyOrientationClass() {
  if (!touchUi) return;
  const portrait = window.innerHeight >= window.innerWidth;
  touchUi.classList.toggle('portrait', portrait);
  touchUi.classList.toggle('landscape', !portrait);
}

applyOrientationClass();
window.addEventListener('resize', applyOrientationClass);
window.addEventListener('orientationchange', applyOrientationClass);

setTouchUiActive(window.innerWidth < 900);
window.addEventListener('resize', () => setTouchUiActive(window.innerWidth < 900));

let joystickPointerId = null;
let joystickCenter = { x: 0, y: 0 };
const joystickRadius = 50;

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
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const dx = event.clientX - joystickCenter.x;
    const dy = event.clientY - joystickCenter.y;
    const dir = toDirection(dx, dy, 12);
    touchState.dir = { ...dir, active: true };
    updateStickVisual(dir.x * joystickRadius, dir.y * joystickRadius);
  });

  touchJoystick.addEventListener('pointermove', (event) => {
    if (joystickPointerId !== event.pointerId) return;
    const dx = event.clientX - joystickCenter.x;
    const dy = event.clientY - joystickCenter.y;
    const dir = toDirection(dx, dy, 12);
    touchState.dir = { ...dir, active: true };
    updateStickVisual(dir.x * joystickRadius, dir.y * joystickRadius);
  });

  const endJoystick = (event) => {
    if (joystickPointerId !== event.pointerId) return;
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
  const release = () => {
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
