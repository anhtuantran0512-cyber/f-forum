/* Bản quyền trí tuệ thuộc về BroAmStuck */
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
  } catch {
    /* Safe ignore */
  }
}
