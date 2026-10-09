/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { Plugin } from 'vite';

export function forumServerPlugin(): Plugin {
  return {
    name: 'forum-server-plugin',
    async configureServer(server) {
      /* EPIC 5: header bảo mật cho MỌI response (HTML, asset, API). Middleware gắn
         trực tiếp ở đây chạy TRƯỚC middleware nội bộ của Vite. Bản dev dùng CSP nới
         (React Refresh cần script nội tuyến) và không chặn nhúng iframe (khung xem trước). */
      const { securityHeadersMiddleware } = await import('./securityHeaders.ts');
      server.middlewares.use(securityHeadersMiddleware('dev'));
      /* Nạp backend sau khi Vite đã đọc cấu hình môi trường, để các secret
         FFORUM_* (không có tiền tố VITE_) không bị chốt thành giá trị rỗng. */
      const { setupForumServer } = await import('./forumServer.ts');
      setupForumServer(server.httpServer, server.middlewares);
    },
    async configurePreviewServer(server) {
      const { securityHeadersMiddleware } = await import('./securityHeaders.ts');
      server.middlewares.use(securityHeadersMiddleware('preview'));
      const { setupForumServer } = await import('./forumServer.ts');
      setupForumServer(server.httpServer, server.middlewares);
    },
  };
}

/**
 * EPIC 5 — chỉ ở bản build: chèn `/security-boot.js` (public/) lên ĐẦU <head>.
 *
 * Phải là script thường, chạy trước mọi module: React DOM đọc
 * `__REACT_DEVTOOLS_GLOBAL_HOOK__` ngay khi chunk vendor-react được nạp — sớm hơn
 * bất kỳ dòng code nào trong entry. Tệp ngoài (không nội tuyến) để CSP production
 * giữ được `script-src 'self'` mà không cần 'unsafe-inline'.
 */
export function securityBootPlugin(): Plugin {
  return {
    name: 'fforum-security-boot',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'script', attrs: { src: '/security-boot.js' }, injectTo: 'head-prepend' }];
    },
  };
}
