function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function computeVolume(master, channel) {
  return clamp(master * channel);
}

export class AudioManager {
  constructor(sounds, settings) {
    this.sounds = sounds;
    this.settings = settings;
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambienceGain = null;
    this.buffers = new Map();
    this.elements = new Map();
    this.sfxPools = new Map();
    this.sfxIndex = new Map();
  }

  init() {
    if (this.ctx) return;
    if (!window.AudioContext && !window.webkitAudioContext) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.ambienceGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.ambienceGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    for (const [name, sound] of Object.entries(this.sounds)) {
      if (sound.type === 'sfx') {
        this.createSfxPool(name, sound.src);
      } else {
        this.createElement(name, sound.src, this.ambienceGain, true);
      }
    }

    this.updateVolumes(this.settings);
  }

  createElement(name, src, gainNode, loop = false) {
    const el = new Audio(src);
    el.preload = 'auto';
    el.loop = loop;
    this.elements.set(name, el);
    if (this.ctx) {
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
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateVolumes(settings) {
    this.settings = settings;
    const master = computeVolume(settings.masterVolume, 1);
    const sfx = computeVolume(settings.masterVolume, settings.sfxVolume);
    const ambience = computeVolume(settings.masterVolume, settings.ambienceVolume);

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
      if (name.includes('_')) continue;
      el.volume = ambience;
    }
  }

  playSfx(name) {
    const pool = this.sfxPools.get(name);
    if (!pool || pool.length === 0) return;
    const idx = this.sfxIndex.get(name) ?? 0;
    const el = pool[idx];
    this.sfxIndex.set(name, (idx + 1) % pool.length);
    this.ensureUnlocked();
    el.currentTime = 0;
    el.play();
  }

  playAmbience(name) {
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
}
