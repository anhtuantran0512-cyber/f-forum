/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * HỆ THỐNG TỐI ƯU HÓA ĐỒ HỌA 3D / WEBGL / DOM THEO THỨ TỰ ƯU TIÊN P0 → P4
 *
 * Triển khai đầy đủ kiến trúc chẩn đoán (renderer.info) và 5 cấp độ tối ưu:
 *  - P0: Giới hạn DPR <= 2 (clampPixelRatio) + Render On-Demand (frameloop="demand" / invalidate)
 *  - P1: Giảm Draw Calls (< 100 Desktop, < 50 Mobile) qua Batching, Instancing & Dirty-Checking
 *  - P2: Giảm Post-Processing (tối đa 1-2 pass, tắt khi FPS < 30, tắt AA khi DPR >= 2, Baked Shadows)
 *  - P3: Nén Texture (<= 2048px, Power-of-Two mipmap) & quản lý bộ nhớ VRAM (.dispose() khi unmount)
 *  - P4: LOD (Level of Detail), Frustum/Back-Hemisphere Culling & Adaptive Quality (FPS < 30 / < 15)
 */

export type RenderQualityMode = 'high' | 'balanced' | 'low-poly' | '2d-fallback';

export interface RendererInfoSnapshot {
  render: {
    frame: number;
    calls: number;
    triangles: number;
    points: number;
    lines: number;
  };
  memory: {
    geometries: number;
    textures: number;
    programs: number;
    videoDecoders: number;
    domCompositeLayers: number;
  };
  pipeline: {
    fps: number;
    frameTimeMs: number;
    dpr: number;
    nativeDpr: number;
    maxDpr: number;
    renderLoopMode: 'demand' | 'continuous';
    postProcessingPasses: number;
    postProcessingEnabled: boolean;
    antialiasEnabled: boolean;
    shadowsMode: 'baked' | 'realtime' | 'off';
    qualityMode: RenderQualityMode;
    culledObjects: number;
    visibleObjects: number;
  };
}

export interface BottleneckDiagnostic {
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  code: string;
  severity: 'critical' | 'warning' | 'ok';
  message: string;
  recommendation: string;
}

/* ========================================================================== */
/* P0.1 — GIỚI HẠN PIXEL RATIO (DPR CAP <= 2)                                 */
/* ========================================================================== */

/**
 * Luôn giới hạn DPR tối đa ở mức 2 (hoặc thấp hơn khi adaptive quality kích hoạt).
 * Màn hình Retina DPR=3 hoặc DPR=4 làm tăng số fragment shader gấp 9–16 lần.
 */
export function clampPixelRatio(
  nativeDpr: number = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  maxDpr = 2,
): number {
  const safeNative = Number.isFinite(nativeDpr) && nativeDpr > 0 ? nativeDpr : 1;
  const safeMax = Number.isFinite(maxDpr) && maxDpr > 0 ? Math.min(maxDpr, 2) : 2;
  return Math.min(Math.max(1, safeNative), safeMax);
}

/* ========================================================================== */
/* P2 — ANTIALIAS & POST-PROCESSING BUDGET                                    */
/* ========================================================================== */

/**
 * Tắt MSAA (antialias) khi DPR >= 2 vì mật độ điểm ảnh vật lý cao đã tự khử răng cưa.
 */
export function shouldEnableAntialias(dpr: number): boolean {
  return dpr < 2;
}

/**
 * Giới hạn số pass Post-Processing tối đa 1–2 pass; tự động tắt về 0 khi FPS < 30.
 */
export function clampPostProcessingPasses(requestedPasses: number, currentFps: number): number {
  if (currentFps > 0 && currentFps < 30) {
    return 0;
  }
  return Math.max(0, Math.min(2, Math.floor(requestedPasses)));
}

/* ========================================================================== */
/* P3 — TEXTURE COMPRESSION & POWER-OF-TWO MIPMAP SIZING                      */
/* ========================================================================== */

/**
 * Làm tròn kích thước về lũy thừa của 2 (512, 1024, 2048) để GPU tạo mipmap phần cứng.
 */
export function nearestPowerOfTwo(value: number, maxDim = 2048): number {
  const clamped = Math.max(16, Math.min(maxDim, Math.round(value || 16)));
  return Math.min(maxDim, Math.pow(2, Math.round(Math.log2(clamped))));
}

/**
 * Giới hạn kích thước texture không bao giờ vượt quá 2048px (hoặc maxDim tùy chọn).
 */
export function clampTextureDimensions(
  width: number,
  height: number,
  maxDim = 2048,
): { width: number; height: number; scaled: boolean } {
  const w = Math.max(1, Math.round(width || 1));
  const h = Math.max(1, Math.round(height || 1));
  const limit = Math.max(64, Math.min(2048, maxDim));
  if (w <= limit && h <= limit) {
    return { width: w, height: h, scaled: false };
  }
  const aspect = w / h;
  if (w >= h) {
    return {
      width: limit,
      height: Math.max(1, Math.round(limit / aspect)),
      scaled: true,
    };
  }
  return {
    width: Math.max(1, Math.round(limit * aspect)),
    height: limit,
    scaled: true,
  };
}

/* ========================================================================== */
/* P1 — DRAW CALL BUDGET & DIRTY-CHECKED 3D SPHERE BATCHER                    */
/* ========================================================================== */

export function getDrawCallBudget(isMobile = false): { maxDrawCalls: number } {
  return { maxDrawCalls: isMobile ? 50 : 100 };
}

/**
 * P1 + P4: Bộ cập nhật theo lô (Batch + Dirty-Checking + Hemisphere Frustum Culling)
 * cho 48 thẻ trên quả cầu 3D Fibonacci (KhuVinhDanhView & AboutUs).
 *
 * Thay vì ghi 144 thuộc tính DOM mỗi khung hình (48 thẻ * 3 thuộc tính),
 * bộ đệm kiểu tĩnh (TypedArray) chỉ ghi vào DOM khi giá trị lượng tử hóa thực sự thay đổi,
 * đồng thời áp dụng Frustum/Back-Hemisphere Culling để ẩn các thẻ quay lưng ở bán cầu sau.
 */
export class SphereCardBatchUpdater {
  private readonly count: number;
  private readonly lastDim: Float32Array;
  private readonly lastZIndex: Int16Array;
  private readonly lastPointer: Int8Array;
  private readonly lastVisible: Int8Array;

  constructor(count: number) {
    this.count = Math.max(1, count);
    this.lastDim = new Float32Array(this.count).fill(-1);
    this.lastZIndex = new Int16Array(this.count).fill(-999);
    this.lastPointer = new Int8Array(this.count).fill(-1);
    this.lastVisible = new Int8Array(this.count).fill(-1);
  }

  public reset(): void {
    this.lastDim.fill(-1);
    this.lastZIndex.fill(-999);
    this.lastPointer.fill(-1);
    this.lastVisible.fill(-1);
  }

  /**
   * Cập nhật 1 thẻ trên mặt cầu nếu có thay đổi.
   * Trả về { mutated, visible } để đo đạc chính xác số draw/composite call trong renderer.info.
   */
  public updateCard(
    index: number,
    cardEl: HTMLElement | null,
    zf: number,
    dim: number,
    cullThreshold = -0.42,
    lowPolyStep = 1,
  ): { mutated: boolean; visible: boolean } {
    if (!cardEl || index < 0 || index >= this.count) {
      return { mutated: false, visible: false };
    }

    /* P4: LOD & Back-Hemisphere Culling — ẩn các thẻ ở mặt khuất phía sau quả cầu
       hoặc giảm mật độ thẻ (lowPolyStep > 1) khi FPS < 15. */
    const isLodSkipped = lowPolyStep > 1 && index % lowPolyStep !== 0;
    const isVisible = !isLodSkipped && zf >= cullThreshold ? 1 : 0;

    let mutated = false;
    if (this.lastVisible[index] !== isVisible) {
      this.lastVisible[index] = isVisible;
      cardEl.style.visibility = isVisible ? 'visible' : 'hidden';
      mutated = true;
    }

    if (!isVisible) {
      if (this.lastPointer[index] !== 0) {
        this.lastPointer[index] = 0;
        cardEl.style.pointerEvents = 'none';
      }
      return { mutated, visible: false };
    }

    /* Lượng tử hóa độ tối (--d) theo bước 0.015 để tránh ghi lại chuỗi CSS vô ích mỗi frame */
    const quantizedDim = Math.round(dim * 66) / 66;
    if (Math.abs(this.lastDim[index] - quantizedDim) >= 0.014) {
      this.lastDim[index] = quantizedDim;
      cardEl.style.setProperty('--d', quantizedDim.toFixed(2));
      mutated = true;
    }

    /* Lượng tử hóa zIndex theo 40 mức độ sâu thay vì 200 mức biến thiên liên tục */
    const zBucket = Math.round((zf + 1) * 20);
    if (this.lastZIndex[index] !== zBucket) {
      this.lastZIndex[index] = zBucket;
      cardEl.style.zIndex = String(zBucket);
      mutated = true;
    }

    const canInteract = zf >= -0.18 ? 1 : 0;
    if (this.lastPointer[index] !== canInteract) {
      this.lastPointer[index] = canInteract;
      cardEl.style.pointerEvents = canInteract ? 'auto' : 'none';
      mutated = true;
    }

    return { mutated, visible: true };
  }
}

/* ========================================================================== */
/* P4 — ADAPTIVE QUALITY GOVERNOR (FPS < 30 & FPS < 15)                       */
/* ========================================================================== */

export interface AdaptiveStepInput {
  fps: number;
  currentDpr: number;
  nativeDpr?: number;
  postProcessingEnabled: boolean;
  qualityMode: RenderQualityMode;
}

export interface AdaptiveStepResult {
  dpr: number;
  postProcessingEnabled: boolean;
  qualityMode: RenderQualityMode;
  lowPolyStep: number;
  changed: boolean;
}

/**
 * P4: Tự động điều chỉnh chất lượng theo FPS thực tế:
 *  - Nếu FPS < 30: hạ DPR * 0.8 (tối thiểu 1.0) và tắt Post-Processing.
 *  - Nếu FPS < 15: chuyển sang chế độ Low-Poly / 2D Fallback.
 *  - Nếu FPS >= 52 ổn định: khôi phục về chế độ cân bằng (DPR <= 2).
 */
export function evaluateAdaptiveQualityStep(input: AdaptiveStepInput): AdaptiveStepResult {
  const maxSafeDpr = clampPixelRatio(input.nativeDpr ?? input.currentDpr, 2);
  let nextDpr = clampPixelRatio(input.currentDpr, maxSafeDpr);
  let nextPost = input.postProcessingEnabled;
  let nextMode: RenderQualityMode = input.qualityMode;
  let lowPolyStep = nextMode === 'low-poly' || nextMode === '2d-fallback' ? 2 : 1;

  if (input.fps > 0 && input.fps < 15) {
    nextDpr = Math.max(1, Number((nextDpr * 0.75).toFixed(2)));
    nextPost = false;
    nextMode = 'low-poly';
    lowPolyStep = 2;
  } else if (input.fps > 0 && input.fps < 30) {
    nextDpr = Math.max(1, Number((nextDpr * 0.8).toFixed(2)));
    nextPost = false;
    if (nextMode === 'high') {
      nextMode = 'balanced';
    }
    lowPolyStep = 1;
  } else if (input.fps >= 54) {
    nextDpr = maxSafeDpr;
    nextPost = true;
    if (nextMode === 'low-poly') {
      nextMode = 'balanced';
    }
    lowPolyStep = 1;
  }

  const changed =
    Math.abs(nextDpr - input.currentDpr) > 0.04 ||
    nextPost !== input.postProcessingEnabled ||
    nextMode !== input.qualityMode;

  return {
    dpr: nextDpr,
    postProcessingEnabled: nextPost,
    qualityMode: nextMode,
    lowPolyStep,
    changed,
  };
}

/* ========================================================================== */
/* PHẦN A — GLOBAL RENDERER.INFO PROFILER & RESOURCE REGISTRY (P3 .dispose()) */
/* ========================================================================== */

const internalState: RendererInfoSnapshot = {
  render: {
    frame: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
  },
  memory: {
    geometries: 0,
    textures: 0,
    programs: 0,
    videoDecoders: 0,
    domCompositeLayers: 0,
  },
  pipeline: {
    fps: 60,
    frameTimeMs: 16.6,
    dpr: clampPixelRatio(),
    nativeDpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    maxDpr: 2,
    renderLoopMode: 'demand',
    postProcessingPasses: 1,
    postProcessingEnabled: true,
    antialiasEnabled: shouldEnableAntialias(clampPixelRatio()),
    shadowsMode: 'baked',
    qualityMode: 'high',
    culledObjects: 0,
    visibleObjects: 0,
  },
};

const activeDisposables = new Map<string, () => void>();

/**
 * P3: Đăng ký tài nguyên GPU/WebGL/ImageBitmap/Geometry để tự động .dispose()
 * triệt để khi component unmount hoặc khi chuyển phân khu.
 */
export function registerDisposableResource(
  id: string,
  kind: 'geometry' | 'texture' | 'program' | 'video',
  disposeFn: () => void,
): () => void {
  if (activeDisposables.has(id)) {
    try {
      activeDisposables.get(id)?.();
    } catch {
      /* ignore */
    }
    activeDisposables.delete(id);
  } else {
    if (kind === 'geometry') internalState.memory.geometries += 1;
    if (kind === 'texture') internalState.memory.textures += 1;
    if (kind === 'program') internalState.memory.programs += 1;
    if (kind === 'video') internalState.memory.videoDecoders += 1;
  }

  const cleanup = () => {
    if (!activeDisposables.has(id)) return;
    activeDisposables.delete(id);
    if (kind === 'geometry') internalState.memory.geometries = Math.max(0, internalState.memory.geometries - 1);
    if (kind === 'texture') internalState.memory.textures = Math.max(0, internalState.memory.textures - 1);
    if (kind === 'program') internalState.memory.programs = Math.max(0, internalState.memory.programs - 1);
    if (kind === 'video') internalState.memory.videoDecoders = Math.max(0, internalState.memory.videoDecoders - 1);
    try {
      disposeFn();
    } catch {
      /* ignore */
    }
    syncWindowRendererInfo();
  };

  activeDisposables.set(id, cleanup);
  syncWindowRendererInfo();
  return cleanup;
}

/**
 * Ghi nhận thông số frame từ các engine 3D/WebGL/DOM và tự động kích hoạt
 * P4 Adaptive Quality khi FPS tụt xuống dưới 30 hoặc 15.
 */
export function recordRenderFrameMetrics(metrics: {
  calls?: number;
  triangles?: number;
  points?: number;
  culledObjects?: number;
  visibleObjects?: number;
  frameTimeMs?: number;
  fps?: number;
}): RendererInfoSnapshot {
  internalState.render.frame += 1;
  if (typeof metrics.calls === 'number') internalState.render.calls = metrics.calls;
  if (typeof metrics.triangles === 'number') internalState.render.triangles = metrics.triangles;
  if (typeof metrics.points === 'number') internalState.render.points = metrics.points;
  if (typeof metrics.culledObjects === 'number') internalState.pipeline.culledObjects = metrics.culledObjects;
  if (typeof metrics.visibleObjects === 'number') internalState.pipeline.visibleObjects = metrics.visibleObjects;

  if (typeof metrics.frameTimeMs === 'number' && metrics.frameTimeMs > 0) {
    internalState.pipeline.frameTimeMs = Number(metrics.frameTimeMs.toFixed(2));
  }
  if (typeof metrics.fps === 'number' && metrics.fps > 0) {
    /* Làm mượt EMA để tránh nhiễu 1 frame đơn lẻ */
    internalState.pipeline.fps = Math.round(internalState.pipeline.fps * 0.75 + metrics.fps * 0.25);
    const step = evaluateAdaptiveQualityStep({
      fps: internalState.pipeline.fps,
      currentDpr: internalState.pipeline.dpr,
      nativeDpr: internalState.pipeline.nativeDpr,
      postProcessingEnabled: internalState.pipeline.postProcessingEnabled,
      qualityMode: internalState.pipeline.qualityMode,
    });
    if (step.changed) {
      internalState.pipeline.dpr = step.dpr;
      internalState.pipeline.postProcessingEnabled = step.postProcessingEnabled;
      internalState.pipeline.postProcessingPasses = step.postProcessingEnabled ? 1 : 0;
      internalState.pipeline.qualityMode = step.qualityMode;
      applyAdaptiveQualityDomFlags(step);
    }
  }

  syncWindowRendererInfo();
  return getRendererInfo();
}

export function applyAdaptiveQualityDomFlags(step: {
  dpr: number;
  postProcessingEnabled: boolean;
  qualityMode: RenderQualityMode;
}): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;
  root.dataset.postprocess = step.postProcessingEnabled ? 'on' : 'off';
  root.dataset.renderMode = step.qualityMode;
  root.style.setProperty('--ff-effective-dpr', String(step.dpr));
}

function syncWindowRendererInfo(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as { __FFORUM_RENDERER_INFO__?: RendererInfoSnapshot }).__FFORUM_RENDERER_INFO__ =
    internalState;
}

export function getRendererInfo(): RendererInfoSnapshot {
  syncWindowRendererInfo();
  return {
    render: { ...internalState.render },
    memory: { ...internalState.memory },
    pipeline: { ...internalState.pipeline },
  };
}

/**
 * PHẦN A: Chẩn đoán tự động các nút cổ chai hiệu năng theo chuẩn renderer.info.
 */
export function diagnoseRenderBottlenecks(
  snapshot: RendererInfoSnapshot = getRendererInfo(),
  isMobile = false,
): BottleneckDiagnostic[] {
  const diagnostics: BottleneckDiagnostic[] = [];
  const budget = getDrawCallBudget(isMobile);

  if (snapshot.pipeline.dpr > 2) {
    diagnostics.push({
      priority: 'P0',
      code: 'DPR_UNCAPPED',
      severity: 'critical',
      message: `DPR đang ở mức ${snapshot.pipeline.dpr} (> 2), gây quá tải fragment shader trên màn hình Retina.`,
      recommendation: 'Áp dụng clampPixelRatio(window.devicePixelRatio, 2).',
    });
  }

  if (snapshot.pipeline.renderLoopMode === 'continuous') {
    diagnostics.push({
      priority: 'P0',
      code: 'CONTINUOUS_RAF_LOOP',
      severity: 'critical',
      message: 'Vòng lặp requestAnimationFrame đang chạy liên tục ngay cả khi scene tĩnh.',
      recommendation: 'Chuyển sang createDemandRenderLoop() / frameloop="demand" + invalidate().',
    });
  }

  if (snapshot.render.calls > budget.maxDrawCalls) {
    diagnostics.push({
      priority: 'P1',
      code: 'EXCESSIVE_DRAW_CALLS',
      severity: 'critical',
      message: `Số lượng Draw Calls (${snapshot.render.calls}) vượt ngưỡng mục tiêu (${budget.maxDrawCalls}).`,
      recommendation: 'Gộp geometry/mesh bằng InstancedMesh / SphereCardBatchUpdater và dùng chung material.',
    });
  }

  if (snapshot.pipeline.postProcessingPasses > 2 || snapshot.pipeline.shadowsMode === 'realtime') {
    diagnostics.push({
      priority: 'P2',
      code: 'HEAVY_POSTPROCESS_OR_SHADOWS',
      severity: 'warning',
      message: `Post-processing (${snapshot.pipeline.postProcessingPasses} passes) hoặc realtime shadows đang gây nghẽn GPU.`,
      recommendation: 'Giới hạn tối đa 1–2 pass, dùng Baked Shadows và tắt Post-Processing khi FPS < 30.',
    });
  }

  if (snapshot.memory.textures > 64 || snapshot.memory.geometries > 64) {
    diagnostics.push({
      priority: 'P3',
      code: 'HIGH_VRAM_FOOTPRINT',
      severity: 'warning',
      message: `Bộ nhớ đang giữ ${snapshot.memory.textures} textures và ${snapshot.memory.geometries} geometries.`,
      recommendation: 'Nén texture <= 2048px (WebP/KTX2) và gọi .dispose() khi unmount.',
    });
  }

  if (snapshot.pipeline.fps < 30) {
    diagnostics.push({
      priority: 'P4',
      code: 'LOW_FPS_DETECTED',
      severity: snapshot.pipeline.fps < 15 ? 'critical' : 'warning',
      message: `FPS hiện tại (${snapshot.pipeline.fps} FPS) thấp hơn ngưỡng mượt mà.`,
      recommendation: 'Kích hoạt Frustum/Back-Hemisphere Culling, giảm DPR * 0.8 và bật chế độ Low-Poly/2D fallback.',
    });
  }

  return diagnostics;
}

/* ========================================================================== */
/* P0.2 — DEMAND-DRIVEN RENDER LOOP (frameloop="demand" + invalidate())       */
/* ========================================================================== */

export interface DemandRenderLoopController {
  /** Đánh thức vòng lặp vẽ N khung hình tiếp theo (mặc định 1 frame, hoặc chuỗi quán tính). */
  invalidate: (framesToKeepAlive?: number) => void;
  /** Bắt đầu chế độ hoạt động liên tục có kiểm soát (ví dụ khi người dùng đang giữ chuột kéo). */
  startContinuous: () => void;
  /** Dừng chế độ liên tục và chuyển về ngủ ngay khi hết quán tính. */
  stopContinuous: () => void;
  /** Hủy hoàn toàn vòng lặp khi unmount. */
  dispose: () => void;
  /** Kiểm tra vòng lặp có đang thức hay không. */
  isActive: () => boolean;
}

export interface DemandRenderLoopOptions {
  /** Tùy chọn giới hạn FPS (mặc định 0 = KHÔNG giới hạn FPS, chạy tối đa theo tần số quét màn hình 120Hz/144Hz/240Hz). */
  maxFps?: number;
  /** Tự động chạy số frame khởi tạo ban đầu khi mount. */
  initialFrames?: number;
}

/**
 * P0: Thay thế vòng lặp requestAnimationFrame vô tận bằng cơ chế Render On-Demand.
 *  - Không khóa trần FPS (hỗ trợ trọn vẹn màn hình 120Hz/144Hz/240Hz+).
 *  - Khi không có tương tác và quán tính đã hội tụ (renderFn trả về false), vòng lặp TỰ ĐỘNG NGỦ (0% CPU/GPU).
 *  - Khi có sự kiện (pointermove, wheel, scroll, resize, state change), gọi invalidate() để vẽ ngay lập tức.
 */
export function createDemandRenderLoop(
  renderFn: (now: number, dtMs: number) => boolean,
  options: DemandRenderLoopOptions = {},
): DemandRenderLoopController {
  const maxFps = options.maxFps && options.maxFps > 0 ? options.maxFps : 0;
  const minFrameInterval = maxFps > 0 ? 1000 / (maxFps + 2) : 0;

  let rafId = 0;
  let remainingFrames = Math.max(0, options.initialFrames ?? 2);
  let continuous = false;
  let disposed = false;
  let lastFrameTime = 0;
  let fpsWindowStart = 0;
  let fpsFrameCount = 0;

  const scheduleNext = () => {
    if (disposed || rafId !== 0) return;
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
    rafId = window.requestAnimationFrame(tick);
  };

  const tick = (now: number) => {
    rafId = 0;
    if (disposed) return;

    /* Tạm ngủ hoàn toàn khi tab bị ẩn */
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    const elapsed = now - lastFrameTime;
    if (minFrameInterval > 0 && lastFrameTime > 0 && elapsed < minFrameInterval) {
      scheduleNext();
      return;
    }

    const dtMs = lastFrameTime > 0 ? Math.min(64, Math.max(0.5, elapsed)) : 8.33;
    lastFrameTime = now;

    /* Đo FPS thực tế trong cửa sổ 500ms để nuôi bộ điều khiển P4 Adaptive Quality */
    if (fpsWindowStart === 0) {
      fpsWindowStart = now;
      fpsFrameCount = 0;
    }
    fpsFrameCount += 1;
    const windowElapsed = now - fpsWindowStart;
    let measuredFps: number | undefined;
    if (windowElapsed >= 500) {
      measuredFps = (fpsFrameCount * 1000) / windowElapsed;
      fpsWindowStart = now;
      fpsFrameCount = 0;
    }

    const needsMoreFrames = renderFn(now, dtMs);
    if (remainingFrames > 0) {
      remainingFrames -= 1;
    }

    if (measuredFps !== undefined) {
      recordRenderFrameMetrics({ frameTimeMs: dtMs, fps: measuredFps });
    }

    if (continuous || needsMoreFrames || remainingFrames > 0) {
      scheduleNext();
    } else {
      lastFrameTime = 0;
      fpsWindowStart = 0;
      fpsFrameCount = 0;
    }
  };

  if (remainingFrames > 0) {
    scheduleNext();
  }

  return {
    invalidate(frames = 2) {
      if (disposed) return;
      remainingFrames = Math.max(remainingFrames, Math.max(1, frames));
      scheduleNext();
    },
    startContinuous() {
      if (disposed) return;
      continuous = true;
      scheduleNext();
    },
    stopContinuous() {
      continuous = false;
    },
    dispose() {
      disposed = true;
      continuous = false;
      remainingFrames = 0;
      if (rafId !== 0 && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
    isActive() {
      return rafId !== 0 || continuous || remainingFrames > 0;
    },
  };
}
