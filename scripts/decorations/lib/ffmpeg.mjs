/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Wrapper ffmpeg dùng cho pipeline (không cần ffprobe — parse thẳng stderr của `ffmpeg -i`).
 *  - resolveFfmpeg: FFMPEG_PATH → PATH → ffmpeg-static (npm, nếu đã cài).
 *  - probeVideo: duration + fps + size + codec từ stderr.
 *  - decodeFramesRgba / extractFrameRgba: ra rawvideo RGBA qua pipe.
 *  - WebM VP9 CÓ ALPHA phải đặt `-c:v libvpx-vp9` TRƯỚC `-i` (decoder vp9 mặc định bỏ kênh alpha).
 */
import { spawn, execSync } from 'node:child_process';

export function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    return execSync('command -v ffmpeg', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

export function requireFfmpeg() {
  const path = resolveFfmpeg();
  if (!path) throw new Error('Không tìm thấy ffmpeg — đặt biến môi trường FFMPEG_PATH.');
  return path;
}

export function runFfmpeg(args, { allowFailure = false } = {}) {
  const ffmpeg = requireFfmpeg();
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let stdout = Buffer.alloc(0);
    child.stdout.on('data', (chunk) => {
      stdout = stdout.length ? Buffer.concat([stdout, chunk]) : Buffer.from(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code !== 0 && !allowFailure) {
        reject(new Error(`ffmpeg thoát mã ${code}: ${stderr.slice(-700)}`));
        return;
      }
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Parse stderr `ffmpeg -i` → { width, height, fps, durationMs, codec, hasAlpha }.
 */
export function probeVideo(inputArgs, filePath) {
  const ffmpeg = requireFfmpeg();
  return new Promise((resolve) => {
    let stderr = '';
    const child = spawn(ffmpeg, ['-hide_banner', ...inputArgs, '-i', filePath], { stdio: ['ignore', 'ignore', 'pipe'] });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    const done = () => {
      try {
        child.kill();
      } catch {
        /* đã tắt */
      }
      const stream = stderr.split('\n').find((line) => line.includes('Stream #0:0')) || '';
      const size = /(\d{2,5})x(\d{2,5})/.exec(stream);
      const rate = /(\d+(?:\.\d+)?)\s+fps/.exec(stream);
      const duration = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
      resolve({
        width: size ? Number(size[1]) : 0,
        height: size ? Number(size[2]) : 0,
        fps: rate ? Number(rate[1]) : 0,
        durationMs: duration ? Math.round((Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])) * 1000) : 0,
        codec: /Video:\s*([a-z0-9_-]+)/.exec(stream)?.[1] || '',
        hasAlpha: /yuva|\(alpha\)/i.test(stream),
        raw: stderr,
      });
    };
    child.on('close', done);
    child.on('error', () => {
      resolve({ width: 0, height: 0, fps: 0, durationMs: 0, codec: '', hasAlpha: false, raw: stderr });
    });
    setTimeout(done, 15000);
  });
}

export async function decodeFramesRgba(filePath, { width, height, inputArgs = [], maxFrames = 0 }) {
  const args = [...inputArgs, '-i', filePath];
  if (maxFrames > 0) args.push('-frames:v', String(maxFrames));
  /* passthrough: không nhân bản frame theo timeline (APNG có delay không đều) → chỉ số frame
     khớp với select=eq(n,…) ở extractFrameRgba. */
  args.push('-vf', `scale=${width}:${height}:flags=area,format=rgba`, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1');
  const { stdout } = await runFfmpeg(['-loglevel', 'error', ...args]);
  const frameBytes = width * height * 4;
  const count = Math.floor(stdout.length / frameBytes);
  return { buffer: stdout, count, frameBytes };
}

/** Lấy đúng 1 frame (chỉ số n) ở độ phân giải gốc dưới dạng RGBA thô. */
export async function extractFrameRgba(filePath, { index, width, height, inputArgs = [] }) {
  const args = ['-loglevel', 'error', ...inputArgs];
  args.push('-i', filePath, '-vf', `select=eq(n\\,${index}),scale=${width}:${height}:flags=lanczos,format=rgba`, '-frames:v', '1', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1');
  const { stdout } = await runFfmpeg(args);
  const expected = width * height * 4;
  if (stdout.length < expected) throw new Error(`Không trích được frame ${index} từ ${filePath}`);
  return stdout.subarray(0, expected);
}
