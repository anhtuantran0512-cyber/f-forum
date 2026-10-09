/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * EPIC 5 — Đánh giá "sức khoẻ" thiết bị để GỢI Ý Potato Mode (không bao giờ ép).
 *
 * Tín hiệu (đều là API công khai của trình duyệt, không gửi đi đâu):
 *  - GPU: tên renderer WebGL. "SwiftShader", "llvmpipe", "Microsoft Basic Render"…
 *    nghĩa là trình duyệt đang vẽ bằng CPU (không có tăng tốc phần cứng) — dấu hiệu
 *    mạnh nhất. Không tạo được WebGL cũng là dấu hiệu mạnh.
 *  - CPU: navigator.hardwareConcurrency; RAM: navigator.deviceMemory (Chromium).
 *  - FPS đo thật trong ~1 giây lúc trang rảnh.
 *  - Chế độ tiết kiệm dữ liệu (Save-Data).
 * Máy mạnh không bị đụng tới: chỉ khi tổng điểm "yếu" vượt ngưỡng mới hiện gợi ý.
 */

export type DeviceTier = 'low' | 'mid' | 'high';

export interface DeviceSignals {
  cores?: number;
  memoryGb?: number;
  renderer?: string;
  webgl: boolean;
  saveData: boolean;
  fps?: number;
}

export interface TierAssessment {
  tier: DeviceTier;
  score: number;
  reasons: string[];
  signals: DeviceSignals;
}

/** Renderer phần mềm (vẽ bằng CPU). */
export const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software rasterizer|basic render|mesa offscreen/i;
/** GPU tích hợp đời cũ / di động cấp thấp — chỉ cộng điểm nhẹ. */
export const WEAK_GPU =
  /intel\(r\) (?:hd graphics(?: [2-5]\d{2,3})?|gma)|mali-(?:4|t6|t7|g31|g51|g52)|adreno \(tm\) (?:3|4|50[5-9]|51\d)|powervr sgx/i;

/** Ngưỡng điểm: ≥ 4 là máy yếu (gợi ý Potato), 2–3 là tầm trung. */
export const LOW_TIER_SCORE = 4;
export const MID_TIER_SCORE = 2;

/** Chấm điểm thuần — tách riêng để kiểm thử không cần trình duyệt. */
export const scoreDeviceSignals = (signals: DeviceSignals): TierAssessment => {
  let score = 0;
  const reasons: string[] = [];
  const renderer = signals.renderer || '';

  if (!signals.webgl) {
    score += 3;
    reasons.push('Trình duyệt không bật được tăng tốc đồ hoạ (WebGL)');
  } else if (SOFTWARE_RENDERER.test(renderer)) {
    score += 3;
    reasons.push('Trình duyệt đang vẽ bằng CPU (không có tăng tốc phần cứng)');
  } else if (WEAK_GPU.test(renderer)) {
    score += 1;
    reasons.push('GPU tích hợp đời cũ');
  }

  if (typeof signals.cores === 'number' && signals.cores > 0) {
    if (signals.cores <= 2) {
      score += 2;
      reasons.push(`CPU chỉ có ${signals.cores} luồng xử lý`);
    } else if (signals.cores <= 4) {
      score += 1;
    }
  }

  if (typeof signals.memoryGb === 'number' && signals.memoryGb > 0) {
    if (signals.memoryGb <= 2) {
      score += 2;
      reasons.push(`Bộ nhớ khoảng ${signals.memoryGb} GB`);
    } else if (signals.memoryGb <= 4) {
      score += 1;
    }
  }

  if (typeof signals.fps === 'number' && signals.fps > 0) {
    if (signals.fps < 30) {
      score += 2;
      reasons.push(`Đo được khoảng ${Math.round(signals.fps)} khung hình/giây`);
    } else if (signals.fps < 45) {
      score += 1;
    }
  }

  if (signals.saveData) {
    score += 1;
    reasons.push('Đang bật chế độ tiết kiệm dữ liệu');
  }

  const tier: DeviceTier = score >= LOW_TIER_SCORE ? 'low' : score >= MID_TIER_SCORE ? 'mid' : 'high';
  return { tier, score, reasons, signals };
};

/** Tên GPU qua WebGL (giải phóng context ngay sau khi đọc). */
export const readWebglRenderer = (): { webgl: boolean; renderer?: string } => {
  if (typeof document === 'undefined') return { webgl: true };
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return { webgl: false };
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      (debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null) || gl.getParameter(gl.RENDERER) || '',
    );
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { webgl: true, renderer };
  } catch {
    return { webgl: true };
  }
};

/** Đo FPS thật bằng requestAnimationFrame (chỉ khi tab đang hiện). */
export const measureFps = (durationMs = 1000): Promise<number | undefined> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function' || document.hidden) {
      resolve(undefined);
      return;
    }
    let frames = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      frames += 1;
      if (document.hidden) {
        resolve(undefined);
        return;
      }
      if (now - start >= durationMs) {
        resolve((frames * 1000) / (now - start));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

/** Gom mọi tín hiệu và chấm điểm. */
export const assessDeviceTier = async (): Promise<TierAssessment> => {
  const nav = (typeof navigator !== 'undefined' ? navigator : {}) as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const gpu = readWebglRenderer();
  const fps = await measureFps(1000);
  return scoreDeviceSignals({
    cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined,
    memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
    renderer: gpu.renderer,
    webgl: gpu.webgl,
    saveData: Boolean(nav.connection?.saveData),
    fps,
  });
};

/* -------------------------------------------------------------------------- */
/* Trạng thái gợi ý (lưu cục bộ)                                               */
/* -------------------------------------------------------------------------- */

export const POTATO_HINT_KEY = 'fforum_potato_hint';
/** "Để sau" → hỏi lại sau 3 ngày. */
export const POTATO_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export type PotatoHintState = { kind: 'never' } | { kind: 'snoozed'; until: number } | { kind: 'none' };

export const parsePotatoHint = (raw: string | null): PotatoHintState => {
  if (raw === 'never') return { kind: 'never' };
  const until = raw ? Number(raw) : NaN;
  if (Number.isFinite(until) && until > 0) return { kind: 'snoozed', until };
  return { kind: 'none' };
};

/** Có nên hiện gợi ý không (thuần — dễ kiểm thử). */
export const shouldSuggestPotato = (
  assessment: Pick<TierAssessment, 'tier'>,
  hint: PotatoHintState,
  potatoAlreadyOn: boolean,
  now: number = Date.now(),
): boolean => {
  if (potatoAlreadyOn || assessment.tier !== 'low') return false;
  if (hint.kind === 'never') return false;
  if (hint.kind === 'snoozed' && hint.until > now) return false;
  return true;
};
