import { safeStorage } from './storage';

export const PWA_DISMISSED_KEY = 'fforum_pwa_banner_dismissed';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(canInstall: boolean) => void>();

export const initPwaInstallListener = (): void => {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((listener) => listener(false));
  });
};

export const subscribePwaInstallState = (cb: (canInstall: boolean) => void): (() => void) => {
  listeners.add(cb);
  cb(deferredPrompt !== null);
  return () => {
    listeners.delete(cb);
  };
};

export const isPwaInstallAvailable = (): boolean => {
  return deferredPrompt !== null;
};

export const isPwaInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isStandalone || isIosStandalone;
};

export const promptPwaInstall = async (): Promise<boolean> => {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    listeners.forEach((listener) => listener(false));
    return choice.outcome === 'accepted';
  } catch {
    return false;
  }
};

export const isPwaBannerDismissed = (): boolean => {
  return safeStorage.getItem(PWA_DISMISSED_KEY) === 'true';
};

export const dismissPwaBanner = (): void => {
  safeStorage.setItem(PWA_DISMISSED_KEY, 'true');
};

export const registerPwaServiceWorker = (): void => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
};
