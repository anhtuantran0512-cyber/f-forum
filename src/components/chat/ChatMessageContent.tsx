/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useMemo } from 'react';
import type { ChatMessage, User } from '../../types';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface ChatMessageContentProps {
  message: Pick<ChatMessage, 'content' | 'mentionIds'>;
  users: Record<string, User>;
  currentUser?: User | null;
}

/** Render only server-validated @mentions as highlighted, actionable-looking text. */
export function ChatMessageContent({ message, users, currentUser }: ChatMessageContentProps) {
  const mentionNames = useMemo(() => {
    const usersById = new Map<string, User>();
    Object.values(users || {}).forEach((user) => {
      if (user?.id) usersById.set(user.id, user);
    });
    if (currentUser?.id) usersById.set(currentUser.id, currentUser);
    const mentionedNames = (message.mentionIds || [])
      .map((id) => usersById.get(id)?.name?.replace(/\s+/g, ' ').trim())
      .filter((name): name is string => Boolean(name && !/[@\r\n]/.test(name)));
    return [...new Set(mentionedNames)]
      .sort((a, b) => b.length - a.length)
      .map((name) => `@${escapeRegExp(name).replace(/\s+/g, '\\s+')}`);
  }, [currentUser, message.mentionIds, users]);

  const segments = useMemo(() => {
    if (mentionNames.length === 0) return [{ text: message.content, isMention: false }];
    const pattern = new RegExp(`(^|[\\s([{,;])(${mentionNames.join('|')})(?=$|[\\s.,!?;:)\\]}…])`, 'giu');
    const parts: { text: string; isMention: boolean }[] = [];
    let cursor = 0;
    for (const match of message.content.matchAll(pattern)) {
      const prefix = match[1] || '';
      const token = match[2] || '';
      const start = (match.index || 0) + prefix.length;
      if (start < cursor) continue;
      if (start > cursor) parts.push({ text: message.content.slice(cursor, start), isMention: false });
      parts.push({ text: token, isMention: true });
      cursor = start + token.length;
    }
    if (cursor < message.content.length) parts.push({ text: message.content.slice(cursor), isMention: false });
    return parts;
  }, [mentionNames, message.content]);

  return (
    <>
      {segments.map((segment, index) => segment.isMention
        ? <span key={`${index}-${segment.text}`} className="ff-chat-mention-highlight">{segment.text}</span>
        : <React.Fragment key={index}>{segment.text}</React.Fragment>)}
    </>
  );
}
