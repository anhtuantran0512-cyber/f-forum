import { safeStorage } from './storage';

export type SpiritSpecies = 'koi' | 'owl' | 'nautilus';
export type SpiritSkin = 'solar' | 'astral' | 'jade' | 'kintsugi' | 'sumi';

export interface SpiritSettings {
  enabled: boolean;
  species: SpiritSpecies;
  skin: SpiritSkin;
  scale: number;
  showLotus: boolean;
  showCard: boolean;
}

const STORAGE_KEY = 'ff_scholar_spirit_settings';
export const LIFETIME_FOCUS_KEY = 'ff_lifetime_focus_minutes';

const DEFAULT_SETTINGS: SpiritSettings = {
  enabled: true,
  species: 'koi',
  skin: 'kintsugi',
  scale: 1.05,
  showLotus: true,
  showCard: false,
};

export function loadSpiritSettings(): SpiritSettings {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      species: ['koi', 'owl', 'nautilus'].includes(parsed.species) ? parsed.species : DEFAULT_SETTINGS.species,
      skin: ['solar', 'astral', 'jade', 'kintsugi', 'sumi'].includes(parsed.skin) ? parsed.skin : DEFAULT_SETTINGS.skin,
      scale: typeof parsed.scale === 'number' && parsed.scale >= 0.7 && parsed.scale <= 1.45 ? parsed.scale : DEFAULT_SETTINGS.scale,
      showLotus: typeof parsed.showLotus === 'boolean' ? parsed.showLotus : DEFAULT_SETTINGS.showLotus,
      showCard: typeof parsed.showCard === 'boolean' ? parsed.showCard : DEFAULT_SETTINGS.showCard,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSpiritSettings(settings: SpiritSettings): void {
  try {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('ff_spirit_settings_changed', { detail: settings }));
  } catch {}
}

export function getLifetimeFocusMinutes(): number {
  try {
    const raw = safeStorage.getItem(LIFETIME_FOCUS_KEY);
    if (!raw) return 0;
    const val = parseInt(raw, 10);
    return isNaN(val) || val < 0 ? 0 : val;
  } catch {
    return 0;
  }
}

export function addLifetimeFocusMinutes(minutes: number): number {
  try {
    const current = getLifetimeFocusMinutes();
    const updated = current + Math.max(0, Math.round(minutes));
    safeStorage.setItem(LIFETIME_FOCUS_KEY, updated.toString());
    window.dispatchEvent(new CustomEvent('ff_lifetime_focus_changed', { detail: { minutes: updated } }));
    return updated;
  } catch {
    return 0;
  }
}
