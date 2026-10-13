/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * PHẦN 2.3 & 2.4 — OffscreenCanvas + Web Worker Particle Physics Engine
 *
 * Thay vì tạo hàng chục / hàng trăm DOM node (mỗi <div> bắt trình duyệt tính
 * layout/paint riêng), toàn bộ hệ hạt được lưu trong 1 Float32Array liên tục
 * (stride = 9 floats/hạt) và tính toán vật lý trên Worker thread, sau đó vẽ
 * toàn bộ trong 1 draw call trên <canvas> (WebGL / 2D).
 */

export const PARTICLE_STRIDE = 9;
/* Layout mỗi hạt trong Float32Array:
 * [0]: x (0..width)
 * [1]: y (0..height)
 * [2]: vx (px/s)
 * [3]: vy (px/s)
 * [4]: size (px)
 * [5]: rotation (rad)
 * [6]: angularVelocity (rad/s)
 * [7]: alpha (0..1)
 * [8]: colorIndex (0..palette.length-1)
 */

export interface ParticleSeedOptions {
  count: number;
  width: number;
  height: number;
  seed?: number;
  paletteLength?: number;
  mode?: 'confetti' | 'mythic-orbit';
}

/** Khởi tạo mảng Float32Array chứa trạng thái ban đầu của toàn bộ hệ hạt (tất định theo seed). */
export const createParticleBuffer = ({
  count,
  width,
  height,
  seed = 1,
  paletteLength = 5,
  mode = 'confetti',
}: ParticleSeedOptions): Float32Array => {
  const safeCount = Math.max(0, Math.floor(count));
  const buf = new Float32Array(safeCount * PARTICLE_STRIDE);
  let s = ((seed || 1) * 9301 + 49297) % 233280;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = 0; i < safeCount; i += 1) {
    const base = i * PARTICLE_STRIDE;
    if (mode === 'mythic-orbit') {
      const angle = (i / Math.max(1, safeCount)) * Math.PI * 2 + rnd() * 0.5;
      const radius = Math.min(width, height) * (0.34 + rnd() * 0.14);
      buf[base + 0] = width * 0.5 + Math.cos(angle) * radius;
      buf[base + 1] = height * 0.5 + Math.sin(angle) * radius;
      buf[base + 2] = -Math.sin(angle) * (18 + rnd() * 24);
      buf[base + 3] = Math.cos(angle) * (18 + rnd() * 24);
      buf[base + 4] = 2.5 + rnd() * 3.5;
      buf[base + 5] = angle;
      buf[base + 6] = (rnd() - 0.5) * 3.2;
      buf[base + 7] = 0.45 + rnd() * 0.55;
      buf[base + 8] = Math.floor(rnd() * Math.max(1, paletteLength));
    } else {
      buf[base + 0] = rnd() * width;
      buf[base + 1] = -12 - rnd() * (height * 0.18);
      buf[base + 2] = (rnd() - 0.5) * 140;
      buf[base + 3] = 180 + rnd() * 260;
      buf[base + 4] = 5 + rnd() * 6.5;
      buf[base + 5] = rnd() * Math.PI * 2;
      buf[base + 6] = (rnd() - 0.5) * 8;
      buf[base + 7] = 0.85 + rnd() * 0.15;
      buf[base + 8] = Math.floor(rnd() * Math.max(1, paletteLength));
    }
  }
  return buf;
};

/**
 * Bước mô phỏng vật lý 1 khung hình (thuần, chạy được trên cả Web Worker và Main Thread).
 * Trả về số hạt còn sống (alpha > 0.02 và trong biên).
 */
export const stepParticleBuffer = (
  buf: Float32Array,
  dtMs: number,
  width: number,
  height: number,
  mode: 'confetti' | 'mythic-orbit' = 'confetti',
): number => {
  const dt = Math.min(0.05, Math.max(0.001, dtMs / 1000));
  const count = Math.floor(buf.length / PARTICLE_STRIDE);
  let alive = 0;
  const cx = width * 0.5;
  const cy = height * 0.5;

  for (let i = 0; i < count; i += 1) {
    const base = i * PARTICLE_STRIDE;
    let x = buf[base + 0];
    let y = buf[base + 1];
    let vx = buf[base + 2];
    let vy = buf[base + 3];
    let rot = buf[base + 5];
    const spin = buf[base + 6];
    let alpha = buf[base + 7];

    if (mode === 'mythic-orbit') {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.max(8, Math.hypot(dx, dy));
      /* Lực hướng tâm giữ hạt bay quanh tâm trang trí Mythic */
      const pull = 36 / dist;
      vx += (-dy / dist) * 14 * dt - (dx / dist) * pull;
      vy += (dx / dist) * 14 * dt - (dy / dist) * pull;
      x += vx * dt;
      y += vy * dt;
      rot += spin * dt;
      alpha = 0.4 + 0.55 * Math.abs(Math.sin(rot));
      alive += 1;
    } else {
      /* Trọng lực + lực cản không khí + gió xoáy nhẹ */
      vy += 320 * dt;
      vx *= 0.992;
      x += vx * dt + Math.sin(rot * 1.7) * 0.6;
      y += vy * dt;
      rot += spin * dt;
      if (y > height * 0.72) {
        alpha = Math.max(0, alpha - dt * 1.4);
      }
      if (alpha > 0.02 && y < height + 32) {
        alive += 1;
      }
    }

    buf[base + 0] = x;
    buf[base + 1] = y;
    buf[base + 2] = vx;
    buf[base + 3] = vy;
    buf[base + 5] = rot;
    buf[base + 7] = alpha;
  }

  return alive;
};

/**
 * Tạo Web Worker nội tuyến (Blob URL) để chạy tính toán vật lý tách khỏi Main Thread.
 * Nếu môi trường không hỗ trợ Worker (SSR / test Node) → trả null để dùng hàm thuần.
 */
export const createInlineParticleWorker = (): Worker | null => {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof Blob === 'undefined') {
    return null;
  }
  try {
    const workerCode = `
      const STRIDE = 9;
      let buffer = null;
      let width = 800;
      let height = 600;
      let mode = 'confetti';
      self.onmessage = (e) => {
        const msg = e.data;
        if (!msg) return;
        if (msg.type === 'INIT') {
          buffer = new Float32Array(msg.buffer);
          width = msg.width || 800;
          height = msg.height || 600;
          mode = msg.mode || 'confetti';
          return;
        }
        if (msg.type === 'STEP' && buffer) {
          const dt = Math.min(0.05, Math.max(0.001, (msg.dtMs || 16) / 1000));
          const count = Math.floor(buffer.length / STRIDE);
          let alive = 0;
          const cx = width * 0.5;
          const cy = height * 0.5;
          for (let i = 0; i < count; i++) {
            const b = i * STRIDE;
            let x = buffer[b], y = buffer[b+1], vx = buffer[b+2], vy = buffer[b+3];
            let rot = buffer[b+5], spin = buffer[b+6], alpha = buffer[b+7];
            if (mode === 'mythic-orbit') {
              const dx = x - cx, dy = y - cy;
              const dist = Math.max(8, Math.hypot(dx, dy));
              const pull = 36 / dist;
              vx += (-dy / dist) * 14 * dt - (dx / dist) * pull;
              vy += (dx / dist) * 14 * dt - (dy / dist) * pull;
              x += vx * dt; y += vy * dt; rot += spin * dt;
              alpha = 0.4 + 0.55 * Math.abs(Math.sin(rot));
              alive++;
            } else {
              vy += 320 * dt;
              vx *= 0.992;
              x += vx * dt + Math.sin(rot * 1.7) * 0.6;
              y += vy * dt;
              rot += spin * dt;
              if (y > height * 0.72) alpha = Math.max(0, alpha - dt * 1.4);
              if (alpha > 0.02 && y < height + 32) alive++;
            }
            buffer[b] = x; buffer[b+1] = y; buffer[b+2] = vx; buffer[b+3] = vy;
            buffer[b+5] = rot; buffer[b+7] = alpha;
          }
          const copy = new Float32Array(buffer);
          self.postMessage({ type: 'FRAME', buffer: copy.buffer, alive }, [copy.buffer]);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  } catch {
    return null;
  }
};
