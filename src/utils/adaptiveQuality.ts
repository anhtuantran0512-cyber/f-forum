/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Client-side quality hints and utilities. Device hints are optional and can be
 * coarsened or missing; balanced is used until enough signals are available.
 * Tier-specific settings currently control effects/particle budgets, not video
 * resolution variants. No FPS benchmark or synthetic RUM sample is generated.
 */

import { createContext, useContext } from 'react';
import {
  type DeviceTier,
  SOFTWARE_RENDERER,
  WEAK_GPU,
  readWebglRenderer,
} from './deviceTier.ts';
import { safeStorage } from './storage.ts';

export type AdaptiveQualityTier = 'tier-a' | 'tier-b' | 'tier-c';
export type EffectiveConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'wifi' | 'unknown';

export interface GPUCapability {
  /** Heuristic renderer family tier; not a measured GPU benchmark. */
  tier: 1 | 2 | 3;
  renderer: string;
  webgl: boolean;
  webgl2: boolean;
  isSoftware: boolean;
}

export interface DeviceProfile {
  memory: number | null;
  cores: number | null;
  connection: EffectiveConnectionType;
  downlinkMbps: number | null;
  rttMs: number | null;
  saveData: boolean | null;
  gpu: GPUCapability;
  screenSize: number | null;
  devicePixelRatio: number | null;
  prefersReducedMotion: boolean | null;
  batteryLow?: boolean;
  batteryLevel?: number;
  batteryCharging?: boolean;
}

export interface TierCapabilities {
  tier: AdaptiveQualityTier;
  legacyTier: DeviceTier;
  label: string;
  badgeText: string;
  particleScale: number;
  maxConcurrentOtherAnimations: number;
  useOffscreenWorker: boolean;
}

export interface AdaptiveQualityAssessment {
  tier: AdaptiveQualityTier;
  legacyTier: DeviceTier;
  profile: DeviceProfile;
  capabilities: TierCapabilities;
  reasons: string[];
}

export const HIGH_END_GPU =
  /nvidia geforce (?:rtx|gtx 1[6-9]|gtx 2\d)|radeon rx (?:[56789]\d{2,3})|apple m[1-9]|apple gpu|adreno \(tm\) [678]\d{2}|mali-g(?:7[6-9]|[89]\d)|intel\(r\) (?:iris\(r\) xe|arc)/i;

export const ADAPTIVE_TIER_OVERRIDE_KEY = 'fforum_adaptive_tier_override_v1';

/** Classify exposed GPU hints without running an FPS benchmark. */
export const detectGPUTier = async (): Promise<GPUCapability> => {
  const base = readWebglRenderer();
  const renderer = base.renderer || '';
  const webgl2 = base.webgl2;
  const isSoftware = SOFTWARE_RENDERER.test(renderer);

  if (!base.webgl || isSoftware || WEAK_GPU.test(renderer)) {
    return { tier: 1, renderer, webgl: base.webgl, webgl2, isSoftware };
  }
  if (HIGH_END_GPU.test(renderer)) {
    return { tier: 3, renderer, webgl: base.webgl, webgl2, isSoftware: false };
  }
  return { tier: 2, renderer, webgl: base.webgl, webgl2, isSoftware: false };
};

/** Read available browser/device hints; unsupported fields remain null/unknown. */
export const collectDeviceProfile = async (): Promise<DeviceProfile> => {
  const nav = (typeof navigator !== 'undefined' ? navigator : {}) as Navigator & {
    deviceMemory?: number;
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };
  const win = typeof window !== 'undefined' ? window : undefined;
  const gpu = await detectGPUTier();
  const rawConn = String(nav.connection?.effectiveType || '').toLowerCase();
  const connection: EffectiveConnectionType =
    rawConn === '4g' || rawConn === '3g' || rawConn === '2g' || rawConn === 'slow-2g' || rawConn === 'wifi'
      ? rawConn
      : 'unknown';
  const memory = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : null;
  const cores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0
    ? nav.hardwareConcurrency
    : null;
  const screenWidth = Number(win?.screen?.width);
  const screenHeight = Number(win?.screen?.height);
  const screenSize = Number.isFinite(screenWidth) && screenWidth > 0 && Number.isFinite(screenHeight) && screenHeight > 0
    ? screenWidth * screenHeight
    : null;
  const dpr = Number(win?.devicePixelRatio);
  const motionQuery = typeof win?.matchMedia === 'function'
    ? win.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  const prefersReducedMotion = motionQuery ? motionQuery.matches : null;
  const downlink = nav.connection?.downlink;
  const rtt = nav.connection?.rtt;
  const saveData = nav.connection?.saveData;

  return {
    memory,
    cores,
    connection,
    downlinkMbps: typeof downlink === 'number' && Number.isFinite(downlink) && downlink > 0 ? downlink : null,
    rttMs: typeof rtt === 'number' && Number.isFinite(rtt) && rtt >= 0 ? rtt : null,
    saveData: typeof saveData === 'boolean' ? saveData : null,
    gpu,
    screenSize,
    devicePixelRatio: Number.isFinite(dpr) && dpr > 0 ? dpr : null,
    prefersReducedMotion,
  };
};

/** Tier affects currently implemented particle and concurrent-decoration budgets only. */
export const getCapabilitiesForTier = (tier: AdaptiveQualityTier): TierCapabilities => {
  switch (tier) {
    case 'tier-a':
      return {
        tier: 'tier-a',
        legacyTier: 'high',
        label: 'Tier A · Hiệu ứng đầy đủ',
        badgeText: 'TIER A · FULL EFFECTS',
        particleScale: 1,
        maxConcurrentOtherAnimations: 48,
        useOffscreenWorker: true,
      };
    case 'tier-b':
      return {
        tier: 'tier-b',
        legacyTier: 'mid',
        label: 'Tier B · Cân bằng',
        badgeText: 'TIER B · BALANCED',
        particleScale: 0.65,
        maxConcurrentOtherAnimations: 18,
        useOffscreenWorker: true,
      };
    case 'tier-c':
    default:
      return {
        tier: 'tier-c',
        legacyTier: 'low',
        label: 'Tier C · Tiết kiệm tài nguyên',
        badgeText: 'TIER C · SAVER',
        particleScale: 0.35,
        maxConcurrentOtherAnimations: 6,
        useOffscreenWorker: true,
      };
  }
};

/** Missing hints never count as high-end; balanced is the conservative fallback. */
export const classifyDeviceProfile = (profile: DeviceProfile): AdaptiveQualityAssessment => {
  const reasons: string[] = [];
  const slowNetwork =
    profile.connection === '2g' ||
    profile.connection === 'slow-2g' ||
    profile.connection === '3g' ||
    (profile.downlinkMbps !== null && profile.downlinkMbps > 0 && profile.downlinkMbps < 1.5);
  const lowMemory = profile.memory !== null && profile.memory < 4;
  const lowCores = profile.cores !== null && profile.cores <= 2;
  const saveData = profile.saveData === true;
  const batteryLow = profile.batteryLow === true;

  if (lowMemory) reasons.push(`Trình duyệt báo bộ nhớ thiết bị khoảng ${profile.memory} GB (< 4 GB)`);
  if (lowCores) reasons.push(`Trình duyệt báo ${profile.cores} luồng CPU logic`);
  if (profile.gpu.tier === 1) {
    reasons.push(!profile.gpu.webgl
      ? 'Không tạo được WebGL context'
      : profile.gpu.isSoftware
        ? 'Renderer báo đang dùng đồ hoạ phần mềm'
        : 'Tên renderer thuộc nhóm GPU tài nguyên thấp');
  }
  if (saveData) reasons.push('Đang bật chế độ tiết kiệm dữ liệu (Save-Data)');
  if (batteryLow) reasons.push('Pin yếu (< 20% khi đang xả pin, theo Battery API)');
  if (slowNetwork) reasons.push(`Gợi ý kết nối ${profile.connection.toUpperCase()} hoặc downlink thấp`);

  let tier: AdaptiveQualityTier;
  if (lowMemory || lowCores || profile.gpu.tier === 1 || saveData || batteryLow || slowNetwork) {
    tier = 'tier-c';
  } else {
    const highEndEvidence =
      profile.memory !== null && profile.memory >= 8 &&
      profile.cores !== null && profile.cores >= 6 &&
      profile.gpu.tier === 3 &&
      (profile.connection === '4g' || profile.connection === 'wifi') &&
      profile.saveData === false;
    if (highEndEvidence) {
      tier = 'tier-a';
      reasons.push('Available browser hints meet the configured high-resource thresholds');
    } else {
      tier = 'tier-b';
      const missing: string[] = [];
      if (profile.memory === null) missing.push('device memory');
      if (profile.cores === null) missing.push('CPU count');
      if (profile.connection === 'unknown') missing.push('connection type');
      if (profile.saveData === null) missing.push('Save-Data preference');
      reasons.push(missing.length
        ? `Balanced fallback; unavailable browser hints: ${missing.join(', ')}`
        : 'Available browser hints indicate a balanced configuration');
    }
  }

  const capabilities = getCapabilitiesForTier(tier);
  return { tier, legacyTier: capabilities.legacyTier, profile, capabilities, reasons };
};

/* Concurrent budget for media animations; the app uses this for viewport content. */
class AnimationBudgetScheduler {
  private activeOtherIds = new Set<string>();
  private activeOwnIds = new Set<string>();
  private waitingOtherIds = new Set<string>();
  private listeners = new Map<string, Set<() => void>>();
  private maxOther = 18;

  subscribe = (id: string, listener: () => void): (() => void) => {
    let subscribers = this.listeners.get(id);
    if (!subscribers) {
      subscribers = new Set();
      this.listeners.set(id, subscribers);
    }
    subscribers.add(listener);
    return () => {
      subscribers?.delete(listener);
      if (subscribers?.size === 0 && this.listeners.get(id) === subscribers) this.listeners.delete(id);
    };
  };

  private notify(ids: Iterable<string>): void {
    for (const id of new Set(ids)) {
      this.listeners.get(id)?.forEach((listener) => listener());
    }
  }

  hasSlot(id: string): boolean {
    return this.activeOwnIds.has(id) || this.activeOtherIds.has(id);
  }

  private promoteWaiting(): string[] {
    const promoted: string[] = [];
    while (this.activeOtherIds.size < this.maxOther && this.waitingOtherIds.size > 0) {
      const nextId = this.waitingOtherIds.values().next().value as string | undefined;
      if (!nextId) break;
      this.waitingOtherIds.delete(nextId);
      this.activeOtherIds.add(nextId);
      promoted.push(nextId);
    }
    return promoted;
  }

  setMaxConcurrentOther(limit: number): void {
    const next = Math.max(1, Math.floor(limit));
    if (next === this.maxOther) return;
    this.maxOther = next;
    const changedIds = new Set<string>();
    while (this.activeOtherIds.size > this.maxOther) {
      const oldestId = this.activeOtherIds.values().next().value as string | undefined;
      if (!oldestId) break;
      this.activeOtherIds.delete(oldestId);
      this.waitingOtherIds.add(oldestId);
      changedIds.add(oldestId);
    }
    this.promoteWaiting().forEach((id) => changedIds.add(id));
    this.notify(changedIds);
  }

  acquire(id: string, isOwnUser: boolean): boolean {
    if (isOwnUser) {
      const waitingChanged = this.waitingOtherIds.delete(id);
      const otherChanged = this.activeOtherIds.delete(id);
      const wasActive = this.activeOwnIds.has(id);
      this.activeOwnIds.add(id);
      const changedIds = this.promoteWaiting();
      if (!wasActive || waitingChanged || otherChanged) changedIds.push(id);
      this.notify(changedIds);
      return true;
    }
    const ownChanged = this.activeOwnIds.delete(id);
    const changedIds = this.promoteWaiting();
    if (this.activeOtherIds.has(id)) {
      if (ownChanged) changedIds.push(id);
      this.notify(changedIds);
      return true;
    }
    if (this.activeOtherIds.size < this.maxOther) {
      this.waitingOtherIds.delete(id);
      this.activeOtherIds.add(id);
      changedIds.push(id);
      this.notify(changedIds);
      return true;
    }
    this.waitingOtherIds.add(id);
    if (ownChanged) changedIds.push(id);
    this.notify(changedIds);
    return false;
  }

  release(id: string): void {
    const ownChanged = this.activeOwnIds.delete(id);
    const otherChanged = this.activeOtherIds.delete(id);
    this.waitingOtherIds.delete(id);
    const changedIds = this.promoteWaiting();
    if (ownChanged || otherChanged) changedIds.push(id);
    this.notify(changedIds);
  }

  getStats(): { ownActive: number; otherActive: number; maxOther: number } {
    return {
      ownActive: this.activeOwnIds.size,
      otherActive: this.activeOtherIds.size,
      maxOther: this.maxOther,
    };
  }

  resetForTest(): void {
    const changedIds = [...this.activeOwnIds, ...this.activeOtherIds];
    this.activeOwnIds.clear();
    this.activeOtherIds.clear();
    this.waitingOtherIds.clear();
    this.maxOther = 18;
    this.notify(changedIds);
  }
}

export const animationBudget = new AnimationBudgetScheduler();

/** Add and remove compositor hints only around actual transitions/animations. */
export const attachTransientWillChange = (element: HTMLElement | null): (() => void) => {
  if (!element) return () => {};
  const promote = () => { element.style.willChange = 'transform, opacity'; };
  const release = () => { element.style.willChange = 'auto'; };
  element.addEventListener('animationstart', promote, { passive: true });
  element.addEventListener('transitionstart', promote, { passive: true });
  element.addEventListener('animationend', release, { passive: true });
  element.addEventListener('animationcancel', release, { passive: true });
  element.addEventListener('transitionend', release, { passive: true });
  element.addEventListener('transitioncancel', release, { passive: true });
  return () => {
    element.removeEventListener('animationstart', promote);
    element.removeEventListener('transitionstart', promote);
    element.removeEventListener('animationend', release);
    element.removeEventListener('animationcancel', release);
    element.removeEventListener('transitionend', release);
    element.removeEventListener('transitioncancel', release);
    element.style.willChange = 'auto';
  };
};

export const MIN_ACCEPTABLE_SSIM = 0.95;

/**
 * Compute SSIM (0..1) for two RGBA image buffers. The selected threshold is a
 * heuristic; it does not prove that differences are imperceptible.
 */
export const computeSSIM = (
  referenceRgba: Uint8Array | Uint8ClampedArray,
  candidateRgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): number => {
  const totalPixels = Math.min(
    width * height,
    Math.floor(referenceRgba.length / 4),
    Math.floor(candidateRgba.length / 4),
  );
  if (totalPixels <= 0) return 1;

  let sumX = 0;
  let sumY = 0;
  const lumX = new Float32Array(totalPixels);
  const lumY = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i += 1) {
    const idx = i * 4;
    const y1 = 0.299 * referenceRgba[idx] + 0.587 * referenceRgba[idx + 1] + 0.114 * referenceRgba[idx + 2];
    const y2 = 0.299 * candidateRgba[idx] + 0.587 * candidateRgba[idx + 1] + 0.114 * candidateRgba[idx + 2];
    lumX[i] = y1;
    lumY[i] = y2;
    sumX += y1;
    sumY += y2;
  }

  const meanX = sumX / totalPixels;
  const meanY = sumY / totalPixels;
  let varX = 0;
  let varY = 0;
  let covXY = 0;
  for (let i = 0; i < totalPixels; i += 1) {
    const dx = lumX[i] - meanX;
    const dy = lumY[i] - meanY;
    varX += dx * dx;
    varY += dy * dy;
    covXY += dx * dy;
  }
  varX /= totalPixels;
  varY /= totalPixels;
  covXY /= totalPixels;

  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;
  const numerator = (2 * meanX * meanY + c1) * (2 * covXY + c2);
  const denominator = (meanX * meanX + meanY * meanY + c1) * (varX + varY + c2);
  if (denominator === 0) return 1;
  return Math.max(0, Math.min(1, numerator / denominator));
};

/** Perceptual hash (aHash, 64-bit) over an 8×8 grid. */
export const computePerceptualHash = (rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): string => {
  if (width <= 0 || height <= 0 || rgba.length < 4) return '0000000000000000';
  const grid = new Float32Array(64);
  let sum = 0;
  for (let gy = 0; gy < 8; gy += 1) {
    for (let gx = 0; gx < 8; gx += 1) {
      const sx = Math.min(width - 1, Math.floor(((gx + 0.5) * width) / 8));
      const sy = Math.min(height - 1, Math.floor(((gy + 0.5) * height) / 8));
      const idx = (sy * width + sx) * 4;
      const lum = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
      grid[gy * 8 + gx] = lum;
      sum += lum;
    }
  }
  const avg = sum / 64;
  let bits = '';
  for (let i = 0; i < 64; i += 1) bits += grid[i] >= avg ? '1' : '0';
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
};

export interface OptimizationExperimentMetrics {
  lcpMs: number;
  fidMs: number;
  memoryMb: number;
  fps: number;
  ssim: number;
  engagementRate: number;
}

export interface OptimizationDecision {
  approved: boolean;
  ssimPassed: boolean;
  performanceImproved: boolean;
  engagementRetained: boolean;
  ssim: number;
  lcpGainPercent: number;
  reason: string;
}

/** Pure threshold helper for caller-supplied numbers; it does not run experiments. */
export const evaluateOptimizationABTest = (
  baseline: OptimizationExperimentMetrics,
  candidate: OptimizationExperimentMetrics,
  minSsim = MIN_ACCEPTABLE_SSIM,
): OptimizationDecision => {
  const ssimPassed = candidate.ssim >= minSsim;
  const lcpGainPercent = baseline.lcpMs > 0 ? ((baseline.lcpMs - candidate.lcpMs) / baseline.lcpMs) * 100 : 0;
  const fpsGainPercent = baseline.fps > 0 ? ((candidate.fps - baseline.fps) / baseline.fps) * 100 : 0;
  const memSavedPercent = baseline.memoryMb > 0 ? ((baseline.memoryMb - candidate.memoryMb) / baseline.memoryMb) * 100 : 0;
  const performanceImproved = lcpGainPercent >= 8 || fpsGainPercent >= 10 || memSavedPercent >= 10;
  const engagementRetained = candidate.engagementRate >= baseline.engagementRate * 0.98;
  const approved = ssimPassed && performanceImproved && engagementRetained;
  let reason = 'Input values meet this utility’s configured thresholds.';
  if (!ssimPassed) reason = `Rejected: supplied SSIM (${candidate.ssim.toFixed(3)}) is below ${minSsim}.`;
  else if (!performanceImproved) reason = 'Rejected: supplied performance deltas do not meet the configured threshold.';
  else if (!engagementRetained) reason = 'Rejected: supplied engagement value is below the configured tolerance.';
  return {
    approved,
    ssimPassed,
    performanceImproved,
    engagementRetained,
    ssim: Number(candidate.ssim.toFixed(4)),
    lcpGainPercent: Number(lcpGainPercent.toFixed(2)),
    reason,
  };
};

export const readSavedTierOverride = (): AdaptiveQualityTier | 'auto' => {
  const raw = safeStorage.getItem(ADAPTIVE_TIER_OVERRIDE_KEY);
  if (raw === 'tier-a' || raw === 'tier-b' || raw === 'tier-c') return raw;
  return 'auto';
};

export const saveTierOverride = (tier: AdaptiveQualityTier | 'auto'): void => {
  if (tier === 'auto') safeStorage.removeItem(ADAPTIVE_TIER_OVERRIDE_KEY);
  else safeStorage.setItem(ADAPTIVE_TIER_OVERRIDE_KEY, tier);
};

export interface AdaptiveQualityContextValue {
  tier: AdaptiveQualityTier;
  detectedTier: AdaptiveQualityTier;
  overrideTier: AdaptiveQualityTier | 'auto';
  setOverrideTier: (next: AdaptiveQualityTier | 'auto') => void;
  profile: DeviceProfile;
  capabilities: TierCapabilities;
  reasons: string[];
  isReady: boolean;
  isBatterySaverActive?: boolean;
}

export const DEFAULT_DEVICE_PROFILE: DeviceProfile = {
  memory: null,
  cores: null,
  connection: 'unknown',
  downlinkMbps: null,
  rttMs: null,
  saveData: null,
  gpu: { tier: 2, renderer: '', webgl: false, webgl2: false, isSoftware: false },
  screenSize: null,
  devicePixelRatio: null,
  prefersReducedMotion: null,
};

export const DEFAULT_ADAPTIVE_CONTEXT: AdaptiveQualityContextValue = {
  tier: 'tier-b',
  detectedTier: 'tier-b',
  overrideTier: 'auto',
  setOverrideTier: () => {},
  profile: DEFAULT_DEVICE_PROFILE,
  capabilities: getCapabilitiesForTier('tier-b'),
  reasons: [],
  isReady: false,
  isBatterySaverActive: false,
};

export const AdaptiveQualityContext = createContext<AdaptiveQualityContextValue>(DEFAULT_ADAPTIVE_CONTEXT);

export const useAdaptiveQuality = (): AdaptiveQualityContextValue => useContext(AdaptiveQualityContext);
