/* One shared gradient palette powers Settings, Potator and profile banners. */
import { GRADIENT_PRESETS } from './gradients.ts';

export const GODRAY_PRESETS = GRADIENT_PRESETS.filter(p => p.id !== '10').map(p => ({
  id: p.id,
  gradient: p.css,
  accent: p.colors[0],
}));
