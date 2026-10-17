/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleForumApiRequest } from '../server/forumServer.ts';

/**
 * Điểm vào Vercel Serverless Function cho đường dẫn /api
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleForumApiRequest(req, res);
}
