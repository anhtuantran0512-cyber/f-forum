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

export const toggleThemeWithCircularReveal = (
  coordsOrEvent?: MouseEvent | { clientX: number; clientY: number } | null
): ThemeMode => {
  const current = getThemeMode();
  const nextMode: ThemeMode = current === 'dark' ? 'light' : 'dark';

  if (typeof document === 'undefined') return nextMode;

  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };

  const isReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!doc.startViewTransition || isReducedMotion) {
    return setThemeMode(nextMode);
  }

  const x =
    coordsOrEvent && typeof coordsOrEvent.clientX === 'number'
      ? coordsOrEvent.clientX
      : typeof window !== 'undefined'
      ? window.innerWidth / 2
      : 0;
  const y =
    coordsOrEvent && typeof coordsOrEvent.clientY === 'number'
      ? coordsOrEvent.clientY
      : typeof window !== 'undefined'
      ? window.innerHeight / 2
      : 0;

  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  try {
    const transition = doc.startViewTransition(() => {
      setThemeMode(nextMode);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 480,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    }).catch(() => {});
  } catch {
    return setThemeMode(nextMode);
  }

  return nextMode;
};

export const toggleThemeMode = (
  coordsOrEvent?: MouseEvent | { clientX: number; clientY: number } | null
): ThemeMode => toggleThemeWithCircularReveal(coordsOrEvent);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== 'fforum_theme' || (event.newValue !== 'light' && event.newValue !== 'dark')) return;
    const mode = event.newValue as ThemeMode;
    document.documentElement.classList.toggle('light', mode === 'light');
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode;
    window.dispatchEvent(new CustomEvent('fforum_theme_sync', { detail: { theme: mode } }));
  });
}
