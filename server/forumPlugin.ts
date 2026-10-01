import type { Plugin } from 'vite';
import { setupForumServer } from './forumServer.ts';

export function forumServerPlugin(): Plugin {
  return {
    name: 'forum-server-plugin',
    configureServer(server) {
      setupForumServer(server.httpServer, server.middlewares);
    },
    configurePreviewServer(server) {
      setupForumServer(server.httpServer, server.middlewares);
    },
  };
}
