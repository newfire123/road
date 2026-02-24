import { AudioManager } from './audio.js';
import { Game } from './game.js';
import { defaultSettings, loadSettings, normalizeSettings, saveSettings } from './settings.js';

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
  ]) {
    const input = document.getElementById(key);
    if (input) input.value = settings[key];
    updateSettingLabel(key, settings[key], (v) => (key.includes('Volume') ? Math.round(v * 100) : v.toFixed(2)));
  }
}

syncSettingsUI();

let last = performance.now();
let lastState = game.state;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.setKeys(keys);
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
