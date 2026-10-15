/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from './storage';

export type ThemeMode = 'dark' | 'light';

export const getThemeMode = (): ThemeMode => {
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('light')) return 'light';
    if (document.documentElement.classList.contains('dark')) return 'dark';
  }
  const saved = safeStorage.getItem('fforum_theme');
  return saved === 'light' ? 'light' : 'dark';
};

export const setThemeMode = (mode: ThemeMode): ThemeMode => {
  safeStorage.setItem('fforum_theme', mode);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('light', mode === 'light');
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fforum_theme_sync', { detail: { theme: mode } }));
  }
  return mode;
};

export const toggleThemeMode = (): ThemeMode =>
  setThemeMode(getThemeMode() === 'dark' ? 'light' : 'dark');
