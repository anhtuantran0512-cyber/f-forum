/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * PHẦN 2.3 & 2.4 — GPU-Accelerated Particle System (1 <canvas> WebGL / Worker)
 *
 * Thay vì render N phần tử DOM <div> riêng lẻ, component này gom toàn bộ
 * particle vào 1 <canvas> duy nhất, xử lý vật lý qua Web Worker (hoặc
 * Float32Array typed buffer) và vẽ bằng WebGL batch (1 draw call) hoặc
 * Canvas 2D GPU-composited.
 *
 * Tương thích 3 Tier:
 *  - Tier A: 100% số hạt
 *  - Tier B: 65% số hạt
 *  - Tier C: 35% số hạt (VẪN CÓ HIỆU ỨNG PARTICLE, không bao giờ cắt bỏ về 0
 *    trừ khi người dùng chủ động bật prefers-reduced-motion).
 */
import React, { useEffect, useRef } from 'react';
import { useAdaptiveQuality } from '../../utils/adaptiveQuality';
import {
  PARTICLE_STRIDE,
  createInlineParticleWorker,
  createParticleBuffer,
  stepParticleBuffer,
} from '../../utils/particlePhysicsWorker';

export interface GpuParticleCanvasProps {
  /** Số tăng dần để kích hoạt đợt bắn hạt mới (hoặc > 0 với mode='mythic-orbit'). */
  trigger: number;
  /** Bảng màu hex của hạt. */
  palette: string[];
  /** Số lượng hạt cơ sở ở Tier A (mặc định 48). */
  baseCount?: number;
  /** Chế độ hiệu ứng: 'confetti' (bắn ăn mừng) hoặc 'mythic-orbit' (hạt bay quanh Mythic). */
  mode?: 'confetti' | 'mythic-orbit';
  className?: string;
}

const hexToRgbFloat = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16) || 0xfbbf24;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const GpuParticleCanvas: React.FC<GpuParticleCanvasProps> = ({
  trigger,
  palette,
  baseCount = 48,
  mode = 'confetti',
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { capabilities, profile } = useAdaptiveQuality();

  useEffect(() => {
    if (!trigger) return;
    if (typeof window === 'undefined') return;
    if (
      profile.prefersReducedMotion ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('reduce-motion')
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    /* Tỉ lệ hạt theo Device Tier: Tier A = 100%, Tier B = 65%, Tier C = 35% (tối thiểu 12 hạt) */
    const scaledCount = Math.max(12, Math.round(baseCount * capabilities.particleScale));
    const width = Math.max(240, canvas.clientWidth || window.innerWidth || 800);
    const height = Math.max(180, canvas.clientHeight || window.innerHeight || 600);
    canvas.width = width;
    canvas.height = height;

    /* Bật will-change có chủ đích khi bắt đầu animate và gỡ ngay khi kết thúc (PHẦN 2.2) */
    canvas.style.willChange = 'transform, opacity';

    let buffer = createParticleBuffer({
      count: scaledCount,
      width,
      height,
      seed: trigger,
      paletteLength: palette.length,
      mode,
    });

    /* Khởi tạo WebGL 1 draw call trước (gl.POINTS) để tận dụng GPU phần cứng;
       nếu trình duyệt/thiết bị không hỗ trợ thì fallback sang Canvas 2D mượt mà. */
    let gl: WebGLRenderingContext | null = null;
    let glProgram: WebGLProgram | null = null;
    let glBuffer: WebGLBuffer | null = null;
    let aPosSizeLoc = -1;
    let aColorLoc = -1;
    let ctx2d: CanvasRenderingContext2D | null = null;

    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
      if (gl) {
        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(
          vs,
          `
          attribute vec3 aPosSize;
          attribute vec4 aColor;
          varying vec4 vColor;
          void main() {
            gl_Position = vec4(aPosSize.xy, 0.0, 1.0);
            gl_PointSize = aPosSize.z;
            vColor = aColor;
          }
          `,
        );
        gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(
          fs,
          `
          precision mediump float;
          varying vec4 vColor;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            if (dot(c, c) > 0.25) discard;
            gl_FragColor = vColor;
          }
          `,
        );
        gl.compileShader(fs);
        const prog = gl.createProgram()!;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          glProgram = prog;
          glBuffer = gl.createBuffer();
          aPosSizeLoc = gl.getAttribLocation(prog, 'aPosSize');
          aColorLoc = gl.getAttribLocation(prog, 'aColor');
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        } else {
          gl = null;
        }
      }
    } catch {
      gl = null;
    }

    if (!gl) {
      ctx2d = canvas.getContext('2d');
    }

    const rgbPalette = palette.map(hexToRgbFloat);
    const vertexData = new Float32Array(scaledCount * 7);

    /* Offload tính toán vật lý sang Web Worker nếu được phép (PHẦN 2.4) */
    let workerAliveCount = scaledCount;
    const worker = capabilities.useOffscreenWorker ? createInlineParticleWorker() : null;
    if (worker) {
      const initCopy = new Float32Array(buffer);
      worker.postMessage(
        { type: 'INIT', buffer: initCopy.buffer, width, height, mode },
        [initCopy.buffer],
      );
      worker.onmessage = (e) => {
        if (e.data?.type === 'FRAME' && e.data.buffer) {
          buffer = new Float32Array(e.data.buffer);
          if (typeof e.data.alive === 'number') {
            workerAliveCount = e.data.alive;
          }
        }
      };
    }

    let rafId = 0;
    let lastTime = performance.now();
    let running = true;

    const renderFrame = (now: number) => {
      if (!running) return;
      const dtMs = Math.min(48, Math.max(4, now - lastTime));
      lastTime = now;

      let aliveCount = workerAliveCount;
      if (worker) {
        worker.postMessage({ type: 'STEP', dtMs });
      } else {
        aliveCount = stepParticleBuffer(buffer, dtMs, width, height, mode);
      }

      const count = Math.floor(buffer.length / PARTICLE_STRIDE);
      if (gl && glProgram && glBuffer) {
        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(glProgram);

        for (let i = 0; i < count; i += 1) {
          const b = i * PARTICLE_STRIDE;
          const v = i * 7;
          const clipX = (buffer[b + 0] / width) * 2 - 1;
          const clipY = 1 - (buffer[b + 1] / height) * 2;
          const rgb = rgbPalette[Math.floor(buffer[b + 8]) % rgbPalette.length] || [1, 0.8, 0.2];
          vertexData[v + 0] = clipX;
          vertexData[v + 1] = clipY;
          vertexData[v + 2] = buffer[b + 4] * 1.4;
          vertexData[v + 3] = rgb[0];
          vertexData[v + 4] = rgb[1];
          vertexData[v + 5] = rgb[2];
          vertexData[v + 6] = buffer[b + 7];
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(aPosSizeLoc);
        gl.vertexAttribPointer(aPosSizeLoc, 3, gl.FLOAT, false, 28, 0);
        gl.enableVertexAttribArray(aColorLoc);
        gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, 28, 12);
        /* 1 draw call duy nhất cho toàn bộ hệ hạt trên GPU */
        gl.drawArrays(gl.POINTS, 0, count);
      } else if (ctx2d) {
        ctx2d.clearRect(0, 0, width, height);
        for (let i = 0; i < count; i += 1) {
          const b = i * PARTICLE_STRIDE;
          const alpha = buffer[b + 7];
          if (alpha <= 0.02) continue;
          ctx2d.save();
          ctx2d.globalAlpha = alpha;
          ctx2d.fillStyle = palette[Math.floor(buffer[b + 8]) % palette.length] || '#fbbf24';
          ctx2d.translate(buffer[b + 0], buffer[b + 1]);
          ctx2d.rotate(buffer[b + 5]);
          const sz = buffer[b + 4];
          ctx2d.fillRect(-sz * 0.5, -sz * 0.5, sz, sz);
          ctx2d.restore();
        }
      }

      if (mode === 'confetti' && aliveCount === 0) {
        if (ctx2d) ctx2d.clearRect(0, 0, width, height);
        running = false;
        canvas.style.willChange = 'auto';
        return;
      }
      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (worker) worker.terminate();
      if (gl) {
        try {
          gl.viewport(0, 0, width, height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch {
          /* ignore */
        }
      }
      if (ctx2d) ctx2d.clearRect(0, 0, width, height);
      canvas.style.willChange = 'auto';
    };
  }, [trigger, palette, baseCount, mode, capabilities.particleScale, capabilities.useOffscreenWorker, profile.prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={className || 'ff-celebrate__gpu-canvas'}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};
