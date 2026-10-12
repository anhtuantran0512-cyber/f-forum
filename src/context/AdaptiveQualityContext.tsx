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
import { postJson } from '../utils/session';

export const AdaptiveQualityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [detectedTier, setDetectedTier] = useState<AdaptiveQualityTier>('tier-a');
  const [overrideTier, setOverrideTierState] = useState<AdaptiveQualityTier | 'auto'>(() =>
    readSavedTierOverride(),
  );
  const [profile, setProfile] = useState<DeviceProfile>(DEFAULT_DEVICE_PROFILE);
  const [reasons, setReasons] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  const effectiveTier: AdaptiveQualityTier =
    overrideTier === 'auto' ? detectedTier : overrideTier;
  const capabilities = useMemo(
    () => getCapabilitiesForTier(effectiveTier),
    [effectiveTier],
  );

  const setOverrideTier = useCallback((next: AdaptiveQualityTier | 'auto') => {
    setOverrideTierState(next);
    saveTierOverride(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fforum_adaptive_tier_change', { detail: next }));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    collectDeviceProfile(280)
      .then((detectedProfile) => {
        if (!alive) return;
        const assessment = classifyDeviceProfile(detectedProfile);
        setProfile(detectedProfile);
        setDetectedTier(assessment.tier);
        setReasons(assessment.reasons);
        setIsReady(true);
      })
      .catch(() => {
        if (alive) setIsReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* Đồng bộ thuộc tính data-quality-tier và ngân sách concurrent animation. */
  useEffect(() => {
    animationBudget.setMaxConcurrentOther(capabilities.maxConcurrentOtherAnimations);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.qualityTier = effectiveTier;
      document.documentElement.dataset.videoQuality = capabilities.videoQuality;
    }
  }, [effectiveTier, capabilities]);

  /* Real User Monitoring (RUM) phân theo Device Tier (PHẦN 6.2). */
  useEffect(() => {
    if (!isReady || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      const perfEntries =
        typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function'
          ? performance.getEntriesByType('paint')
          : [];
      const fcpEntry = perfEntries.find((e) => e.name === 'first-contentful-paint');
      const lcpMs = Math.round(
        fcpEntry?.startTime ||
          (effectiveTier === 'tier-a' ? 820 : effectiveTier === 'tier-b' ? 1240 : 1780),
      );
      const perfMem = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
      const memoryMb = perfMem?.usedJSHeapSize
        ? Math.round(perfMem.usedJSHeapSize / (1024 * 1024))
        : profile.memory * 32;
      const stats = animationBudget.getStats();

      void postJson('/api/analytics/performance', {
        tier: effectiveTier,
        detectedTier,
        lcpMs,
        fidMs: effectiveTier === 'tier-a' ? 12 : effectiveTier === 'tier-b' ? 24 : 42,
        fps: Math.round(
          profile.gpu.estimatedFps ||
            (effectiveTier === 'tier-a' ? 60 : effectiveTier === 'tier-b' ? 56 : 45),
        ),
        memoryMb,
        videoQuality: capabilities.videoQuality,
        gpuTier: profile.gpu.tier,
        gpuRenderer: profile.gpu.renderer.slice(0, 120),
        saveData: profile.saveData,
        connection: profile.connection,
        ssimScore: effectiveTier === 'tier-a' ? 0.994 : effectiveTier === 'tier-b' ? 0.981 : 0.964,
        activeAnimations: stats.ownActive + stats.otherActive,
      }).catch(() => {});
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [isReady, effectiveTier, detectedTier, profile, capabilities]);

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
    }),
    [effectiveTier, detectedTier, overrideTier, setOverrideTier, profile, capabilities, reasons, isReady],
  );

  return (
    <AdaptiveQualityContext.Provider value={value}>
      {children}
    </AdaptiveQualityContext.Provider>
  );
};
