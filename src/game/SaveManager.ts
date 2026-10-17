import { GameSaveData, GameSettings } from './types.ts';
import { createInitialProgress } from './rules.ts';
import { PLAYER_SPAWN } from './levelData.ts';

const SAVE_KEY = 'the_wrong_voice_save_v1';
const SETTINGS_KEY = 'the_wrong_voice_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  lookSensitivity: 1.0,
  leftHanded: false,
  reducedShake: false,
  subtitles: true,
  masterVolume: 0.75,
  quality: 'medium',
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      lookSensitivity:
        typeof parsed.lookSensitivity === 'number'
          ? Math.max(0.3, Math.min(2.5, parsed.lookSensitivity))
          : DEFAULT_SETTINGS.lookSensitivity,
      leftHanded: Boolean(parsed.leftHanded),
      reducedShake: Boolean(parsed.reducedShake),
      subtitles: parsed.subtitles !== undefined ? Boolean(parsed.subtitles) : true,
      masterVolume:
        typeof parsed.masterVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.masterVolume))
          : DEFAULT_SETTINGS.masterVolume,
      quality:
        parsed.quality === 'low' || parsed.quality === 'medium' || parsed.quality === 'high'
          ? parsed.quality
          : 'medium',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors in restricted webviews
  }
}

export function hasSavedGame(): boolean {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}

export function loadSavedGame(): GameSaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSaveData;
    if (!parsed || typeof parsed.playerX !== 'number' || !parsed.progress) {
      return null;
    }
    return {
      version: 1,
      savedAt: parsed.savedAt || Date.now(),
      playerX: parsed.playerX ?? PLAYER_SPAWN.x,
      playerZ: parsed.playerZ ?? PLAYER_SPAWN.z,
      playerYaw: parsed.playerYaw ?? PLAYER_SPAWN.yaw,
      progress: {
        ...createInitialProgress(),
        ...parsed.progress,
      },
    };
  } catch {
    return null;
  }
}

export function saveGame(data: GameSaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage errors
  }
}
