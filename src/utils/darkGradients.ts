/* Bản quyền trí tuệ thuộc về BroAmStuck */

export const DARK_GRADIENT_PRESETS = [
  {
    id: 'obsidian',
    label: 'Mực',
    gradient: 'radial-gradient(ellipse at 18% 0%, rgba(94, 112, 158, 0.22), transparent 48%), radial-gradient(ellipse at 90% 78%, rgba(115, 74, 107, 0.11), transparent 40%), linear-gradient(145deg, #0a0e17 0%, #101722 52%, #080b11 100%)',
  },
  {
    id: 'midnight',
    label: 'Lam',
    gradient: 'radial-gradient(ellipse at 12% 4%, rgba(45, 112, 176, 0.23), transparent 48%), radial-gradient(ellipse at 86% 82%, rgba(36, 77, 132, 0.14), transparent 42%), linear-gradient(145deg, #070d17 0%, #0c1725 54%, #080c13 100%)',
  },
  {
    id: 'forest',
    label: 'Rêu',
    gradient: 'radial-gradient(ellipse at 14% 0%, rgba(72, 135, 103, 0.2), transparent 48%), radial-gradient(ellipse at 92% 80%, rgba(164, 126, 68, 0.11), transparent 42%), linear-gradient(145deg, #09120f 0%, #101c17 54%, #080d0b 100%)',
  },
  {
    id: 'plum',
    label: 'Mận',
    gradient: 'radial-gradient(ellipse at 14% 0%, rgba(121, 81, 151, 0.22), transparent 49%), radial-gradient(ellipse at 88% 78%, rgba(88, 82, 149, 0.12), transparent 42%), linear-gradient(145deg, #0d0a16 0%, #181322 54%, #0a0911 100%)',
  },
  {
    id: 'ember',
    label: 'Hổ phách',
    gradient: 'radial-gradient(ellipse at 12% 0%, rgba(172, 91, 57, 0.2), transparent 48%), radial-gradient(ellipse at 90% 78%, rgba(154, 117, 54, 0.12), transparent 42%), linear-gradient(145deg, #120c0a 0%, #1a1411 54%, #0b0909 100%)',
  },
] as const;

export type DarkGradientId = (typeof DARK_GRADIENT_PRESETS)[number]['id'];

export const resolveDarkGradientId = (stored: string | null | undefined): DarkGradientId =>
  DARK_GRADIENT_PRESETS.find((preset) => preset.id === stored)?.id || 'obsidian';

export const getDarkGradient = (id: string) =>
  DARK_GRADIENT_PRESETS.find((preset) => preset.id === id) || DARK_GRADIENT_PRESETS[0];
