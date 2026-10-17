/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdaptiveQualityContext,
  type AdaptiveQualityContextValue,
  type AdaptiveQualityTier,
  DEFAULT_DEVICE_PROFILE,
  type DeviceProfile,
  animationBudget,
  classifyDeviceProfile,
  collectDeviceProfile,
  getCapabilitiesForTier,
  readSavedTierOverride,
  saveTierOverride,
} from '../utils/adaptiveQuality';

interface BatteryManagerLike extends EventTarget {
  level?: number;
  charging?: boolean;
}

const EMPTY_REASONS: string[] = [];

export const AdaptiveQualityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overrideTier, setOverrideTierState] = useState<AdaptiveQualityTier | 'auto'>(() =>
    readSavedTierOverride(),
  );
  const [profile, setProfile] = useState<DeviceProfile>(DEFAULT_DEVICE_PROFILE);
  const [isReady, setIsReady] = useState(false);

  const assessment = useMemo(() => classifyDeviceProfile(profile), [profile]);
  const detectedTier: AdaptiveQualityTier = isReady ? assessment.tier : 'tier-b';
  const reasons = isReady ? assessment.reasons : EMPTY_REASONS;
  const effectiveTier: AdaptiveQualityTier = overrideTier === 'auto' ? detectedTier : overrideTier;
  const capabilities = useMemo(() => getCapabilitiesForTier(effectiveTier), [effectiveTier]);

  const setOverrideTier = useCallback((next: AdaptiveQualityTier | 'auto') => {
    setOverrideTierState(next);
    saveTierOverride(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fforum_adaptive_tier_change', { detail: next }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    collectDeviceProfile()
      .then((detectedProfile) => {
        if (!active) return;
        setProfile(detectedProfile);
        setIsReady(true);
      })
      .catch(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const nav = typeof navigator !== 'undefined'
      ? navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> }
      : null;
    if (!nav?.getBattery) return;

    let active = true;
    let battery: BatteryManagerLike | null = null;
    const update = () => {
      if (!active || !battery || typeof battery.level !== 'number' || typeof battery.charging !== 'boolean') return;
      const level = battery.level;
      const charging = battery.charging;
      const batteryLow = !charging && level < 0.2;
      setProfile((current) => {
        if (
          current.batteryLow === batteryLow &&
          current.batteryLevel === level &&
          current.batteryCharging === charging
        ) return current;
        return { ...current, batteryLow, batteryLevel: level, batteryCharging: charging };
      });
    };

    nav.getBattery()
      .then((result) => {
        if (!active) return;
        battery = result;
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
        update();
      })
      .catch(() => {});

    return () => {
      active = false;
      battery?.removeEventListener('levelchange', update);
      battery?.removeEventListener('chargingchange', update);
    };
  }, []);

  useEffect(() => {
    animationBudget.setMaxConcurrentOther(capabilities.maxConcurrentOtherAnimations);
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.qualityTier = effectiveTier;
    if (typeof profile.batteryLow === 'boolean') {
      document.documentElement.dataset.batterySaver = String(profile.batteryLow);
    } else {
      delete document.documentElement.dataset.batterySaver;
    }
  }, [effectiveTier, capabilities.maxConcurrentOtherAnimations, profile.batteryLow]);

  /* Optional, anonymous RUM: submit only measurements observed by this browser. */
  useEffect(() => {
    if (!isReady || typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
    let lcpMs: number | null = null;
    let firstInputDelayMs: number | null = null;
    const observers: PerformanceObserver[] = [];
    const createObserver = (type: string, callback: (entry: PerformanceEntry) => void) => {
      try {
        const observer = new PerformanceObserver((list) => list.getEntries().forEach(callback));
        observer.observe({ type, buffered: true });
        observers.push(observer);
      } catch {
        /* Unsupported entry types remain unavailable rather than receiving a fallback. */
      }
    };

    createObserver('largest-contentful-paint', (entry) => {
      if (Number.isFinite(entry.startTime) && entry.startTime > 0) lcpMs = Math.round(entry.startTime);
    });
    createObserver('first-input', (entry) => {
      const event = entry as PerformanceEventTiming;
      const delay = event.processingStart - event.startTime;
      if (Number.isFinite(delay) && delay >= 0) firstInputDelayMs = Math.round(delay);
    });

    const timer = window.setTimeout(() => {
      for (const observer of observers) {
        observer.takeRecords().forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint' && Number.isFinite(entry.startTime) && entry.startTime > 0) {
            lcpMs = Math.round(entry.startTime);
          } else if (entry.entryType === 'first-input') {
            const event = entry as PerformanceEventTiming;
            const delay = event.processingStart - event.startTime;
            if (Number.isFinite(delay) && delay >= 0) firstInputDelayMs = Math.round(delay);
          }
        });
        observer.disconnect();
      }

      const perfMemory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
      const usedHeap = perfMemory?.usedJSHeapSize;
      const jsHeapMb = typeof usedHeap === 'number' && Number.isFinite(usedHeap) && usedHeap > 0
        ? Math.round(usedHeap / (1024 * 1024))
        : null;
      const animationStats = animationBudget.getStats();
      const sample: Record<string, unknown> = {
        tier: effectiveTier,
        activeAnimations: animationStats.ownActive + animationStats.otherActive,
      };
      if (lcpMs !== null) sample.lcpMs = lcpMs;
      if (firstInputDelayMs !== null) sample.firstInputDelayMs = firstInputDelayMs;
      if (jsHeapMb !== null) sample.jsHeapMb = jsHeapMb;

      void fetch('/api/analytics/performance', {
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sample),
      }).catch(() => {});
    }, 12_000);

    return () => {
      window.clearTimeout(timer);
      observers.forEach((observer) => observer.disconnect());
    };
  }, [isReady, effectiveTier]);

  const value = useMemo<AdaptiveQualityContextValue>(
    () => ({
      tier: effectiveTier,
      detectedTier,
      overrideTier,
      setOverrideTier,
      profile,
      capabilities,
      reasons,
      isReady,
      isBatterySaverActive: profile.batteryLow,
    }),
    [effectiveTier, detectedTier, overrideTier, setOverrideTier, profile, capabilities, reasons, isReady],
  );

  return <AdaptiveQualityContext.Provider value={value}>{children}</AdaptiveQualityContext.Provider>;
};
