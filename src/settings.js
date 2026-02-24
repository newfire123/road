export const defaultSettings = {
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
  lengthMinMax: 1.0,
  lengthMax: 1.3,
  lengthMaxMin: 1.0,
  lengthMaxMax: 1.6,
  debugAudio: false,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeSettings(input = {}) {
  const merged = { ...defaultSettings, ...input };
  const lengthMin = clamp(merged.lengthMin, defaultSettings.lengthMinMin, defaultSettings.lengthMinMax);
  const lengthMaxRaw = clamp(
    merged.lengthMax,
    defaultSettings.lengthMaxMin,
    defaultSettings.lengthMaxMax
  );
  const lengthMax = Math.max(lengthMin, lengthMaxRaw);

  return {
    ...merged,
    masterVolume: clamp(merged.masterVolume, 0, 1),
    sfxVolume: clamp(merged.sfxVolume, 0, 1),
    ambienceVolume: clamp(merged.ambienceVolume, 0, 1),
    vehicleCountScale: clamp(
      merged.vehicleCountScale,
      defaultSettings.vehicleCountScaleMin,
      defaultSettings.vehicleCountScaleMax
    ),
    speedScale: clamp(merged.speedScale, defaultSettings.speedScaleMin, defaultSettings.speedScaleMax),
    reverseChance: clamp(
      merged.reverseChance,
      defaultSettings.reverseChanceMin,
      defaultSettings.reverseChanceMax
    ),
    lengthMin,
    lengthMax,
    debugAudio: Boolean(merged.debugAudio),
  };
}

export function loadSettings(storage, key = 'crossRoadSettings') {
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return normalizeSettings();
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return normalizeSettings();
  }
}

export function saveSettings(storage, settings, key = 'crossRoadSettings') {
  if (!storage?.setItem) return;
  storage.setItem(key, JSON.stringify(normalizeSettings(settings)));
}
