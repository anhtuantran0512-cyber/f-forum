/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { Plugin } from 'vite';

export function forumServerPlugin(): Plugin {
  return {
    name: 'forum-server-plugin',
    async configureServer(server) {
      /* Nạp backend sau khi Vite đã đọc cấu hình môi trường, để các secret
         FFORUM_* (không có tiền tố VITE_) không bị chốt thành giá trị rỗng. */
      const { setupForumServer } = await import('./forumServer.ts');
      setupForumServer(server.httpServer, server.middlewares);
    },
    async configurePreviewServer(server) {
      const { setupForumServer } = await import('./forumServer.ts');
      setupForumServer(server.httpServer, server.middlewares);
    },
  };
}
