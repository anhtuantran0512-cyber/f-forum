/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * EPIC 5 — Header bảo mật & Content-Security-Policy.
 *
 * Trước Epic 5 server không gửi header bảo mật nào: không CSP, không nosniff,
 * không Referrer-Policy, không chống clickjacking, API trả CORS `*`.
 *
 * Nguyên tắc:
 *  - CSP liệt kê ĐÚNG các nguồn ngoài app đang dùng (kiểm kê từ index.html + src:
 *    font Google/onlinewebfonts/CloudFront, video CloudFront, SDK Google/Facebook).
 *    Thêm domain mới thì phải thêm vào CSP_ORIGINS — test epic5 khoá danh sách này.
 *  - Bản dev cần `'unsafe-inline'` cho script vì @vitejs/plugin-react chèn đoạn
 *    preamble React Refresh nội tuyến; bản build (vite preview / production) thì
 *    KHÔNG có script nội tuyến nào được chạy (JSON-LD là khối dữ liệu, không thực thi).
 *  - `frame-ancestors`: dev server KHÔNG chặn nhúng vì khung xem trước (live preview)
 *    nhúng app trong iframe; bản production mặc định chỉ cho cùng nguồn, cấu hình
 *    lại bằng FFORUM_FRAME_ANCESTORS nếu cần nhúng ở nơi khác.
 *  - HSTS chỉ gửi ở production và chỉ khi kết nối thật sự là HTTPS — gửi HSTS qua
 *    HTTP thường vô nghĩa, còn gửi ở LAN http sẽ khoá người dùng khỏi site.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export type SecurityMode = 'dev' | 'preview';

/** Mọi nguồn ngoài được phép — giữ ngắn và có lý do cho từng dòng. */
export const CSP_ORIGINS = {
  /** Google Identity Services + Facebook JS SDK (đăng nhập social). */
  scripts: ['https://accounts.google.com', 'https://apis.google.com', 'https://connect.facebook.net'],
  /** Google Fonts CSS, font Garet (onlinewebfonts), nút GIS. */
  styles: ['https://fonts.googleapis.com', 'https://db.onlinewebfonts.com', 'https://accounts.google.com'],
  /** Tệp font: Google, onlinewebfonts, font Ogg trên CloudFront. */
  fonts: ['https://fonts.gstatic.com', 'https://db.onlinewebfonts.com', 'https://dcym8fthxf5uu.cloudfront.net'],
  /** Video nền và phim giới thiệu. */
  media: ['https://d8j0ntlcm91z4.cloudfront.net'],
  /** XHR của OAuth: userinfo Google, Graph API Facebook. */
  connect: [
    'https://accounts.google.com',
    'https://oauth2.googleapis.com',
    'https://www.googleapis.com',
    'https://graph.facebook.com',
    'https://www.facebook.com',
    'https://connect.facebook.net',
  ],
  /** Iframe ẩn của GIS và FB SDK. */
  frames: [
    'https://accounts.google.com',
    'https://www.facebook.com',
    'https://web.facebook.com',
    'https://staticxx.facebook.com',
  ],
} as const;

/* Host hợp lệ (tên miền / IPv4 / [IPv6] + cổng) — không bao giờ chép chuỗi lạ vào header. */
const SAFE_HOST = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|\[[0-9a-f:.]+\])(?::\d{1,5})?$/i;
/* Một nguồn CSP hợp lệ cho frame-ancestors: 'self' / 'none' / https://host / *.host. */
const SAFE_SOURCE = /^(?:'self'|'none'|https?:\/\/(?:\*\.)?[a-z0-9.-]+(?::\d{1,5})?)$/i;

const firstHeader = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value || '').split(',')[0].trim();

/** Host mà trình duyệt đang gọi (ưu tiên X-Forwarded-Host khi đi qua proxy). */
export const requestHost = (req: IncomingMessage): string | null => {
  const host = firstHeader(req.headers['x-forwarded-host']) || firstHeader(req.headers.host);
  return host && SAFE_HOST.test(host) ? host.toLowerCase() : null;
};

/**
 * Trình duyệt có đang nói chuyện với ta qua HTTPS không?
 *
 * Dùng để quyết định cờ `Secure` của cookie và HSTS. Tin X-Forwarded-Proto/Origin
 * ở đây là AN TOÀN: giả mạo chúng chỉ khiến chính kẻ giả mạo nhận cookie Secure
 * mà trình duyệt của họ vứt đi — không ảnh hưởng tới người dùng khác.
 */
export const requestIsHttps = (req: IncomingMessage): boolean => {
  if ((req.socket as { encrypted?: boolean } | undefined)?.encrypted) return true;
  if (firstHeader(req.headers['x-forwarded-proto']).toLowerCase() === 'https') return true;
  const origin = firstHeader(req.headers.origin);
  return origin.startsWith('https://');
};

/** frame-ancestors theo chế độ: dev = không đặt (cho phép khung xem trước). */
export const resolveFrameAncestors = (mode: SecurityMode, env: NodeJS.ProcessEnv = process.env): string | null => {
  const configured = String(env.FFORUM_FRAME_ANCESTORS || '').trim();
  if (configured) {
    const sources = configured.split(/\s+/).filter((s) => SAFE_SOURCE.test(s));
    if (sources.length > 0) return sources.join(' ');
  }
  return mode === 'preview' ? "'self'" : null;
};

/** Origin của CDN ảnh (nếu cấu hình FFORUM_MEDIA_CDN_BASE). */
export const mediaCdnOrigin = (env: NodeJS.ProcessEnv = process.env): string | null => {
  const base = String(env.FFORUM_MEDIA_CDN_BASE || '').trim();
  if (!base) return null;
  try {
    const url = new URL(base);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
};

export interface CspOptions {
  mode: SecurityMode;
  host?: string | null;
  frameAncestors?: string | null;
  cdnOrigin?: string | null;
}

export const buildContentSecurityPolicy = ({ mode, host, frameAncestors, cdnOrigin }: CspOptions): string => {
  const dev = mode === 'dev';
  /* 'self' (CSP3) đã gồm ws/wss cùng host; liệt kê thêm host cụ thể cho trình duyệt
     cũ. Ở dev, HMR của Vite đôi khi đi qua cổng proxy khác nên nới thành ws:/wss:. */
  const sockets = dev
    ? ['ws:', 'wss:']
    : host && SAFE_HOST.test(host)
      ? [`wss://${host}`, `ws://${host}`]
      : [];
  const cdn = cdnOrigin ? [cdnOrigin] : [];

  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", ...(dev ? ["'unsafe-inline'"] : []), ...CSP_ORIGINS.scripts]],
    /* style nội tuyến là bắt buộc: React `style={{…}}`, Tailwind dev, @font-face trong index.html. */
    ['style-src', ["'self'", "'unsafe-inline'", ...CSP_ORIGINS.styles]],
    ['font-src', ["'self'", 'data:', ...CSP_ORIGINS.fonts, ...cdn]],
    /* Ảnh đại diện có thể đến từ Google/Facebook/URL người dùng dán → mọi nguồn https. */
    ['img-src', ["'self'", 'data:', 'blob:', 'https:']],
    ['media-src', ["'self'", 'blob:', ...CSP_ORIGINS.media, ...cdn]],
    ['connect-src', ["'self'", ...sockets, ...CSP_ORIGINS.connect, ...cdn]],
    ['frame-src', ["'self'", ...CSP_ORIGINS.frames]],
    ['worker-src', ["'self'", 'blob:']],
    ['manifest-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
  ];
  if (frameAncestors) directives.push(['frame-ancestors', frameAncestors.split(/\s+/)]);
  return directives.map(([name, sources]) => `${name} ${sources.join(' ')}`).join('; ');
};

/** Gắn toàn bộ header bảo mật vào một response. */
export const applySecurityHeaders = (
  req: IncomingMessage,
  res: ServerResponse,
  mode: SecurityMode,
  env: NodeJS.ProcessEnv = process.env,
): void => {
  if (res.headersSent) return;
  const frameAncestors = resolveFrameAncestors(mode, env);
  res.setHeader(
    'Content-Security-Policy',
    buildContentSecurityPolicy({ mode, host: requestHost(req), frameAncestors, cdnOrigin: mediaCdnOrigin(env) }),
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  /* Popup OAuth (Google/Facebook) cần gửi postMessage về trang mở nó. */
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (frameAncestors === "'self'") res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (mode === 'preview' && requestIsHttps(req)) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
};

type Next = (err?: unknown) => void;

/** Middleware connect (Vite dev / preview). */
export const securityHeadersMiddleware =
  (mode: SecurityMode) =>
  (req: IncomingMessage, res: ServerResponse, next: Next): void => {
    applySecurityHeaders(req, res, mode);
    next();
  };

/* -------------------------------------------------------------------------- */
/* CORS: chỉ cùng nguồn hoặc danh sách cho phép                                */
/* -------------------------------------------------------------------------- */

/**
 * Trước đây mọi response API đều có `Access-Control-Allow-Origin: *`, tức trang web
 * BẤT KỲ cũng đọc được phản hồi API nếu có cách lấy token. Nay chỉ phản hồi CORS
 * cho chính site (Origin trùng Host) hoặc các origin khai báo trong
 * FFORUM_ALLOWED_ORIGINS (phân cách bằng dấu phẩy). Request cùng nguồn của chính
 * app không cần header CORS nên không bị ảnh hưởng.
 */
export const allowedCorsOrigin = (req: IncomingMessage, env: NodeJS.ProcessEnv = process.env): string | null => {
  const origin = firstHeader(req.headers.origin);
  if (!origin) return null;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const host = requestHost(req);
  if (host && parsed.host.toLowerCase() === host) return parsed.origin;
  const allowlist = String(env.FFORUM_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean);
  return allowlist.includes(parsed.origin.toLowerCase()) ? parsed.origin : null;
};

export const applyCorsHeaders = (req: IncomingMessage, res: ServerResponse): void => {
  if (res.headersSent) return;
  res.setHeader('Vary', 'Origin');
  const origin = allowedCorsOrigin(req);
  if (!origin) return;
  /* Không gửi Allow-Credentials: origin ngoài (nếu được cho phép) dùng Bearer,
     cookie phiên SameSite=Strict không bao giờ đi theo request khác site. */
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-FForum-Session');
  res.setHeader('Access-Control-Max-Age', '600');
};
