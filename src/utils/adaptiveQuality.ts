/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * KIẾN TRÚC "FULL QUALITY + FULL PERFORMANCE" (ADAPTIVE QUALITY ARCHITECTURE)
 *
 * Triết lý cốt lõi:
 *  "Không cắt giảm NỘI DUNG — chỉ thay đổi CÁCH THỨC và THỜI ĐIỂM giao nội dung đó,
 *   tùy theo khả năng thiết bị của từng user."
 *
 * Phân tầng 3 Tier (không phải bật/tắt nhị phân):
 *  - TIER A (High-end): RAM ≥ 8GB, GPU rời/mạnh, mạng 4G/WiFi ổn định, không bật Save-Data
 *      → Full animation, video decoration 4K, particle WebGL 100%, shadow/blur cao cấp, preload aggressive
 *  - TIER B (Mid-range): RAM 4–8GB, GPU trung bình
 *      → Animation giữ nguyên bằng CSS transform/opacity thuần (GPU compositor),
 *        particle Canvas/WebGL 65%, video decoration HD
 *  - TIER C (Low-end): RAM < 4GB, GPU yếu, hoặc mạng chậm (2g/3g) / Save-Data bật
 *      → Vẫn hiển thị ĐẦY ĐỦ decoration/hiệu ứng (SD video / APNG tối ưu),
 *        ưu tiên tuyệt đối animation của CHÍNH USER trước (fetchpriority="high"),
 *        giới hạn số animation đồng thời của người khác ở mức an toàn (vượt ngưỡng thì
 *        hiển thị 1 khung hình tĩnh CHẤT LƯỢNG CAO trích từ animation — không bao giờ mất tính năng).
 */

import { createContext, useContext } from 'react';
import {
  type DeviceTier,
  SOFTWARE_RENDERER,
  WEAK_GPU,
  measureFps,
  readWebglRenderer,
} from './deviceTier.ts';
import { safeStorage } from './storage.ts';

export type AdaptiveQualityTier = 'tier-a' | 'tier-b' | 'tier-c';
export type VideoQualityLevel = '4k' | 'hd' | 'sd';
export type EffectiveConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'wifi' | 'unknown';

export interface GPUCapability {
  /** 3 = High-end (RTX/Radeon RX/Apple M-series/Adreno 7xx), 2 = Mid-range, 1 = Low-end/Software */
  tier: 1 | 2 | 3;
  renderer: string;
  webgl: boolean;
  webgl2: boolean;
  isSoftware: boolean;
  estimatedFps?: number;
}

export interface DeviceProfile {
  /** GB RAM ước tính (navigator.deviceMemory || 4) */
  memory: number;
  /** Số core CPU logic (navigator.hardwareConcurrency || 4) */
  cores: number;
  /** Loại kết nối mạng ('4g' | '3g' | '2g' | 'slow-2g') */
  connection: EffectiveConnectionType;
  /** Băng thông ước tính (Mbps) */
  downlinkMbps: number;
  /** Độ trễ mạng ước tính (ms) */
  rttMs: number;
  /** User bật chế độ tiết kiệm dữ liệu (Data Saver) */
  saveData: boolean;
  /** Thông tin năng lực GPU */
  gpu: GPUCapability;
  /** Tổng số điểm ảnh màn hình (window.screen.width * window.screen.height) */
  screenSize: number;
  /** Tỉ lệ điểm ảnh vật lý */
  devicePixelRatio: number;
  /** Hệ điều hành hoặc người dùng bật giảm chuyển động */
  prefersReducedMotion: boolean;
}

export interface TierCapabilities {
  tier: AdaptiveQualityTier;
  legacyTier: DeviceTier;
  label: string;
  badgeText: string;
  /** Độ phân giải video decoration mục tiêu ('4k' | 'hd' | 'sd') */
  videoQuality: VideoQualityLevel;
  /** Tỉ lệ hạt particle trên Canvas/WebGL (1.0 = 100%, 0.65 = 65%, 0.35 = 35%) */
  particleScale: number;
  /** Số lượng video/animation trang trí của NGƯỜI KHÁC chạy đồng thời tối đa trong viewport */
  maxConcurrentOtherAnimations: number;
  /** Chính sách tải trước tài nguyên */
  preloadStrategy: 'aggressive' | 'viewport' | 'self-priority';
  /** Mức hiệu ứng đổ bóng / làm mờ kính */
  shadowBlurMode: 'ultra' | 'gpu-balanced' | 'compositor-safe';
  /** Sử dụng OffscreenCanvas + Web Worker cho tính toán vật lý particle */
  useOffscreenWorker: boolean;
  /** Dùng định dạng nhẹ (SD WebM / APNG / HQ Keyframe) cho thiết bị yếu khi vượt ngân sách */
  useLightweightFallbackWhenCrowded: boolean;
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

/** Phát hiện GPU Tier (1..3) kết hợp WebGL/WebGL2 renderer + FPS thực tế. */
export const detectGPUTier = async (sampleFpsMs = 240): Promise<GPUCapability> => {
  const base = readWebglRenderer();
  let webgl2 = false;
  if (typeof document !== 'undefined') {
    try {
      const c = document.createElement('canvas');
      const gl2 = c.getContext('webgl2') as WebGL2RenderingContext | null;
      if (gl2) {
        webgl2 = true;
        gl2.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      webgl2 = false;
    }
  }
  const renderer = base.renderer || '';
  const isSoftware = !base.webgl || SOFTWARE_RENDERER.test(renderer);
  const fps = sampleFpsMs > 0 ? await measureFps(sampleFpsMs) : undefined;

  if (isSoftware) {
    return { tier: 1, renderer, webgl: base.webgl, webgl2, isSoftware: true, estimatedFps: fps };
  }
  if (WEAK_GPU.test(renderer) || (typeof fps === 'number' && fps > 0 && fps < 34)) {
    return { tier: 1, renderer, webgl: base.webgl, webgl2, isSoftware: false, estimatedFps: fps };
  }
  if (HIGH_END_GPU.test(renderer) || (typeof fps === 'number' && fps >= 55 && webgl2)) {
    return { tier: 3, renderer, webgl: base.webgl, webgl2, isSoftware: false, estimatedFps: fps };
  }
  return {
    tier: webgl2 || !renderer ? 2 : 1,
    renderer,
    webgl: base.webgl,
    webgl2,
    isSoftware: false,
    estimatedFps: fps,
  };
};

/** Thu thập toàn bộ hồ sơ thiết bị & mạng khi khởi động (thuần/an toàn SSR). */
export const collectDeviceProfile = async (sampleFpsMs = 240): Promise<DeviceProfile> => {
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
  const gpu = await detectGPUTier(sampleFpsMs);
  const rawConn = String(nav.connection?.effectiveType || '4g').toLowerCase();
  const connection: EffectiveConnectionType =
    rawConn === '4g' || rawConn === '3g' || rawConn === '2g' || rawConn === 'slow-2g' || rawConn === 'wifi'
      ? rawConn
      : '4g';

  const memory =
    typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : 4;
  const cores =
    typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0
      ? nav.hardwareConcurrency
      : 4;
  const screenW = win?.screen?.width || 1920;
  const screenH = win?.screen?.height || 1080;
  const prefersReducedMotion = Boolean(
    win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );

  return {
    memory,
    cores,
    connection,
    downlinkMbps: typeof nav.connection?.downlink === 'number' ? nav.connection.downlink : 10,
    rttMs: typeof nav.connection?.rtt === 'number' ? nav.connection.rtt : 50,
    saveData: Boolean(nav.connection?.saveData),
    gpu,
    screenSize: screenW * screenH,
    devicePixelRatio: win?.devicePixelRatio || 1,
    prefersReducedMotion,
  };
};

/** Bản đồ năng lực chi tiết cho từng Tier A / B / C. */
export const getCapabilitiesForTier = (tier: AdaptiveQualityTier): TierCapabilities => {
  switch (tier) {
    case 'tier-a':
      return {
        tier: 'tier-a',
        legacyTier: 'high',
        label: 'Tier A · Siêu cấp (4K / Full GPU)',
        badgeText: 'TIER A · 4K ULTRA',
        videoQuality: '4k',
        particleScale: 1.0,
        maxConcurrentOtherAnimations: 48,
        preloadStrategy: 'aggressive',
        shadowBlurMode: 'ultra',
        useOffscreenWorker: true,
        useLightweightFallbackWhenCrowded: false,
      };
    case 'tier-b':
      return {
        tier: 'tier-b',
        legacyTier: 'mid',
        label: 'Tier B · Cân bằng (HD / GPU Compositor)',
        badgeText: 'TIER B · HD GPU',
        videoQuality: 'hd',
        particleScale: 0.65,
        maxConcurrentOtherAnimations: 18,
        preloadStrategy: 'viewport',
        shadowBlurMode: 'gpu-balanced',
        useOffscreenWorker: true,
        useLightweightFallbackWhenCrowded: true,
      };
    case 'tier-c':
    default:
      return {
        tier: 'tier-c',
        legacyTier: 'low',
        label: 'Tier C · Thích ứng thông minh (SD / Ưu tiên cá nhân)',
        badgeText: 'TIER C · SMART SD',
        videoQuality: 'sd',
        particleScale: 0.35,
        maxConcurrentOtherAnimations: 6,
        preloadStrategy: 'self-priority',
        shadowBlurMode: 'compositor-safe',
        useOffscreenWorker: true,
        useLightweightFallbackWhenCrowded: true,
      };
  }
};

/**
 * Phân loại thiết bị thành 3 Tier A / B / C theo đúng đặc tả:
 *  - TIER A: RAM ≥ 8GB, GPU tốt (tier >= 2, không yếu), mạng 4G/WiFi ổn định, không bật Save-Data
 *  - TIER C: RAM < 4GB, hoặc GPU yếu/software (tier === 1), hoặc mạng 2G/3G, hoặc Save-Data bật
 *  - TIER B: Các cấu hình tầm trung (RAM 4–8GB, GPU trung bình)
 */
export const classifyDeviceProfile = (profile: DeviceProfile): AdaptiveQualityAssessment => {
  const reasons: string[] = [];
  const slowNetwork =
    profile.connection === '2g' ||
    profile.connection === 'slow-2g' ||
    profile.connection === '3g' ||
    (profile.downlinkMbps > 0 && profile.downlinkMbps < 1.5);

  if (profile.memory < 4) reasons.push(`RAM thiết bị ~${profile.memory}GB (< 4GB)`);
  if (profile.cores <= 2) reasons.push(`CPU ${profile.cores} luồng xử lý`);
  if (profile.gpu.tier === 1) {
    reasons.push(
      profile.gpu.isSoftware
        ? 'Trình duyệt đang render phần mềm (Software WebGL)'
        : 'GPU di động/tích hợp tiết kiệm điện',
    );
  }
  if (profile.saveData) reasons.push('Đang bật chế độ Tiết kiệm dữ liệu (Save-Data)');
  if (slowNetwork) reasons.push(`Kết nối mạng ${profile.connection.toUpperCase()} băng thông thấp`);

  let tier: AdaptiveQualityTier;
  if (
    profile.memory < 4 ||
    profile.cores <= 2 ||
    profile.gpu.tier === 1 ||
    profile.saveData ||
    slowNetwork
  ) {
    tier = 'tier-c';
  } else if (
    profile.memory >= 8 &&
    profile.cores >= 6 &&
    (profile.gpu.tier === 3 || (profile.gpu.tier === 2 && (profile.gpu.estimatedFps ?? 60) >= 55)) &&
    (profile.connection === '4g' || profile.connection === 'wifi') &&
    !profile.saveData
  ) {
    tier = 'tier-a';
    reasons.push(`RAM ${profile.memory}GB, ${profile.cores} nhân, GPU tăng tốc phần cứng tốt`);
  } else {
    tier = 'tier-b';
    reasons.push(`Cấu hình tầm trung (RAM ${profile.memory}GB, ${profile.cores} nhân, GPU Tier ${profile.gpu.tier})`);
  }

  const capabilities = getCapabilitiesForTier(tier);
  return {
    tier,
    legacyTier: capabilities.legacyTier,
    profile,
    capabilities,
    reasons,
  };
};

/* ========================================================================== */
/* CONCURRENT ANIMATION SCHEDULER (Ưu tiên chính user, giới hạn an toàn Tier C) */
/* ========================================================================== */

class AnimationBudgetScheduler {
  private activeOtherIds = new Set<string>();
  private activeOwnIds = new Set<string>();
  private maxOther = 18;

  setMaxConcurrentOther(limit: number): void {
    this.maxOther = Math.max(1, limit);
  }

  /**
   * Đăng ký slot chạy animation trang trí:
   *  - Trang trí của CHÍNH USER (isOwnUser = true) LUÔN LUÔN được cấp phép chạy 100% ở mọi Tier.
   *  - Trang trí của user khác được cấp phép nếu chưa vượt ngân sách concurrent của Tier hiện tại.
   */
  acquire(id: string, isOwnUser: boolean): boolean {
    if (isOwnUser) {
      this.activeOwnIds.add(id);
      return true;
    }
    if (this.activeOtherIds.has(id)) return true;
    if (this.activeOtherIds.size < this.maxOther) {
      this.activeOtherIds.add(id);
      return true;
    }
    return false;
  }

  release(id: string): void {
    this.activeOwnIds.delete(id);
    this.activeOtherIds.delete(id);
  }

  getStats(): { ownActive: number; otherActive: number; maxOther: number } {
    return {
      ownActive: this.activeOwnIds.size,
      otherActive: this.activeOtherIds.size,
      maxOther: this.maxOther,
    };
  }

  resetForTest(): void {
    this.activeOwnIds.clear();
    this.activeOtherIds.clear();
    this.maxOther = 18;
  }
}

export const animationBudget = new AnimationBudgetScheduler();

/* ========================================================================== */
/* GPU COMPOSITOR HELPERS — will-change có chủ đích                           */
/* ========================================================================== */

/**
 * Chỉ bật `will-change: transform, opacity` khi phần tử bắt đầu animate
 * và tự động gỡ (`will-change: auto`) ngay khi animation kết thúc để giải phóng VRAM.
 */
export const attachTransientWillChange = (element: HTMLElement | null): (() => void) => {
  if (!element) return () => {};
  const promote = () => {
    element.style.willChange = 'transform, opacity';
  };
  const release = () => {
    element.style.willChange = 'auto';
  };
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

/* ========================================================================== */
/* PHẦN 6: ĐO LƯỜNG CHẤT LƯỢNG HÌNH ẢNH (SSIM ≥ 0.95) & A/B TESTING           */
/* ========================================================================== */

export const MIN_ACCEPTABLE_SSIM = 0.95;

/**
 * Tính chỉ số tương đồng cấu trúc SSIM (Structural Similarity Index, 0..1)
 * giữa ảnh gốc và ảnh sau tối ưu (RGBA Uint8Array / Uint8ClampedArray).
 * SSIM > 0.95 nghĩa là mắt thường không thể phân biệt sự khác biệt.
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
    // Độ chói cảm nhận chuẩn ITU-R BT.601
    const y1 =
      0.299 * referenceRgba[idx] +
      0.587 * referenceRgba[idx + 1] +
      0.114 * referenceRgba[idx + 2];
    const y2 =
      0.299 * candidateRgba[idx] +
      0.587 * candidateRgba[idx + 1] +
      0.114 * candidateRgba[idx + 2];
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

/**
 * Perceptual Hash (aHash 64-bit) trên lưới 8×8 độ chói để so sánh nhanh độ tương đồng thị giác.
 */
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
  for (let i = 0; i < 64; i += 1) {
    bits += grid[i] >= avg ? '1' : '0';
  }
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
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

/**
 * Đánh giá A/B Testing trước khi áp dụng tối ưu hoá:
 * Chỉ cho phép merge khi:
 *  1. SSIM ≥ 0.95 (mắt thường không phân biệt được sự suy giảm chất lượng)
 *  2. Hiệu năng tăng đáng kể (LCP giảm ≥ 8% hoặc FPS tăng ≥ 10% hoặc RAM giảm ≥ 10%)
 *  3. Tương tác người dùng (engagementRate) không suy giảm quá 2%.
 */
export const evaluateOptimizationABTest = (
  baseline: OptimizationExperimentMetrics,
  candidate: OptimizationExperimentMetrics,
  minSsim = MIN_ACCEPTABLE_SSIM,
): OptimizationDecision => {
  const ssimPassed = candidate.ssim >= minSsim;
  const lcpGainPercent =
    baseline.lcpMs > 0 ? ((baseline.lcpMs - candidate.lcpMs) / baseline.lcpMs) * 100 : 0;
  const fpsGainPercent =
    baseline.fps > 0 ? ((candidate.fps - baseline.fps) / baseline.fps) * 100 : 0;
  const memSavedPercent =
    baseline.memoryMb > 0 ? ((baseline.memoryMb - candidate.memoryMb) / baseline.memoryMb) * 100 : 0;

  const performanceImproved = lcpGainPercent >= 8 || fpsGainPercent >= 10 || memSavedPercent >= 10;
  const engagementRetained = candidate.engagementRate >= baseline.engagementRate * 0.98;
  const approved = ssimPassed && performanceImproved && engagementRetained;

  let reason = 'Đạt chuẩn Full Quality + Full Performance (SSIM ≥ 0.95 & hiệu năng cải thiện rõ rệt).';
  if (!ssimPassed) {
    reason = `Từ chối: Điểm chất lượng hình ảnh SSIM (${candidate.ssim.toFixed(3)}) thấp hơn ngưỡng ${minSsim}.`;
  } else if (!performanceImproved) {
    reason = 'Từ chối: Mức cải thiện hiệu năng (LCP/FPS/Memory) chưa đủ đáng kể.';
  } else if (!engagementRetained) {
    reason = 'Từ chối: Tỉ lệ tương tác người dùng bị sụt giảm.';
  }

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

/* ========================================================================== */
/* REAL USER MONITORING (RUM) THEO DEVICE TIER                                */
/* ========================================================================== */

export interface RumTierSample {
  tier: AdaptiveQualityTier;
  lcpMs: number;
  fidMs: number;
  fps: number;
  memoryMb: number;
  videoQuality: VideoQualityLevel;
  gpuTier: 1 | 2 | 3;
  gpuRenderer: string;
  saveData: boolean;
  connection: EffectiveConnectionType;
  ssimScore: number;
  activeAnimations: number;
}

export const readSavedTierOverride = (): AdaptiveQualityTier | 'auto' => {
  const raw = safeStorage.getItem(ADAPTIVE_TIER_OVERRIDE_KEY);
  if (raw === 'tier-a' || raw === 'tier-b' || raw === 'tier-c') return raw;
  return 'auto';
};

export const saveTierOverride = (tier: AdaptiveQualityTier | 'auto'): void => {
  if (tier === 'auto') {
    safeStorage.removeItem(ADAPTIVE_TIER_OVERRIDE_KEY);
  } else {
    safeStorage.setItem(ADAPTIVE_TIER_OVERRIDE_KEY, tier);
  }
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
}

export const DEFAULT_DEVICE_PROFILE: DeviceProfile = {
  memory: 8,
  cores: 8,
  connection: '4g',
  downlinkMbps: 20,
  rttMs: 35,
  saveData: false,
  gpu: {
    tier: 3,
    renderer: 'Hardware WebGL2 Compositor',
    webgl: true,
    webgl2: true,
    isSoftware: false,
    estimatedFps: 60,
  },
  screenSize: 1920 * 1080,
  devicePixelRatio: 1,
  prefersReducedMotion: false,
};

export const DEFAULT_ADAPTIVE_CONTEXT: AdaptiveQualityContextValue = {
  tier: 'tier-a',
  detectedTier: 'tier-a',
  overrideTier: 'auto',
  setOverrideTier: () => {},
  profile: DEFAULT_DEVICE_PROFILE,
  capabilities: getCapabilitiesForTier('tier-a'),
  reasons: [],
  isReady: false,
};

export const AdaptiveQualityContext = createContext<AdaptiveQualityContextValue>(
  DEFAULT_ADAPTIVE_CONTEXT,
);

export const useAdaptiveQuality = (): AdaptiveQualityContextValue =>
  useContext(AdaptiveQualityContext);

