/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useCallback, useMemo, useState, type ChangeEvent, type Dispatch, type KeyboardEvent, type RefObject, type SetStateAction, type SyntheticEvent } from 'react';
import type { OnlinePresenceUser, User } from '../types';

export interface ChatMentionCandidate {
  id: string;
  name: string;
  avatar: string;
  level?: number;
  email?: string;
  role?: User['role'];
  staffRole?: User['staffRole'];
  customRole?: string;
  isOnline: boolean;
  user?: User;
}

export interface ActiveChatMention {
  start: number;
  end: number;
  query: string;
}

export interface SelectedChatMention {
  id: string;
  name: string;
}

const normalizedSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (letter) => (letter === 'Đ' ? 'D' : 'd'))
    .toLocaleLowerCase('vi-VN');

/**
 * Chỉ xét token @... ở ngay trước con trỏ (hỗ trợ tên có khoảng trắng), đồng
 * thời không bắt nhầm địa chỉ email hay một @ khác nằm trước đó.
 */
export const findActiveChatMention = (value: string, caret = value.length): ActiveChatMention | null => {
  const cursor = Math.max(0, Math.min(value.length, caret));
  const beforeCaret = value.slice(0, cursor);
  const match = /(^|[\s([{,;:])@([^@\r\n]{0,40})$/u.exec(beforeCaret);
  if (!match) return null;
  return {
    start: match.index + match[1].length,
    end: cursor,
    query: match[2],
  };
};

const validRole = (value: unknown): value is User['role'] =>
  value === 'SUPER_ADMIN' || value === 'CLUB_LEADER' || value === 'STUDENT';

/** Build one stable list from the full member directory and live-presence feed. */
export const buildChatMentionCandidates = (
  users: Record<string, User>,
  onlineUsers: OnlinePresenceUser[] = [],
  currentUser: User | null = null,
): ChatMentionCandidate[] => {
  const onlineById = new Map<string, OnlinePresenceUser>();
  for (const online of onlineUsers) {
    if (online?.id) onlineById.set(online.id, online);
  }

  const members = new Map<string, ChatMentionCandidate>();
  const add = (user: User | OnlinePresenceUser, fullUser?: User) => {
    const id = String(user?.id || '').trim();
    const name = String(user?.name || '').replace(/\s+/g, ' ').trim();
    if (!id || !name || /[@\r\n]/.test(name)) return;
    const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
    const live = onlineById.get(id);
    const existing = members.get(id);
    const onlineRole = 'role' in user && validRole(user.role) ? user.role : undefined;
    members.set(id, {
      id,
      name,
      avatar: String(live?.avatar || user.avatar || fullUser?.avatar || ''),
      level: Number(live?.level ?? user.level ?? fullUser?.level) || 1,
      email: email || undefined,
      role: fullUser?.role || onlineRole || existing?.role,
      staffRole: fullUser?.staffRole || existing?.staffRole,
      customRole: fullUser?.customRole || existing?.customRole,
      isOnline: Boolean(live || existing?.isOnline),
      user: fullUser || existing?.user,
    });
  };

  Object.values(users || {}).forEach((user) => {
    if (user?.id) add(user, user);
  });
  onlineUsers.forEach((user) => {
    if (!members.has(user.id)) add(user);
    else add(user, members.get(user.id)?.user);
  });
  if (currentUser?.id && !members.has(currentUser.id)) add(currentUser, currentUser);

  const selfEmail = String(currentUser?.email || '').trim().toLowerCase();
  return [...members.values()]
    .filter((candidate) => candidate.id !== currentUser?.id && (!selfEmail || candidate.email !== selfEmail))
    .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a.name.localeCompare(b.name, 'vi'));
};

export const searchChatMentionCandidates = (
  members: ChatMentionCandidate[],
  query: string,
  limit = 6,
): ChatMentionCandidate[] => {
  const needle = normalizedSearch(query.trim());
  const matching = needle
    ? members.filter((member) => normalizedSearch(member.name).includes(needle))
    : members;
  return matching.slice(0, Math.max(1, limit));
};

interface UseChatMentionComposerOptions {
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  users: Record<string, User>;
  onlineUsers?: OnlinePresenceUser[];
  currentUser: User | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  maxLength?: number;
}

/** Shared keyboard/caret logic for the full chat composer and the quick dock. */
export const useChatMentionComposer = ({
  inputText,
  setInputText,
  users,
  onlineUsers,
  currentUser,
  inputRef,
  maxLength = 300,
}: UseChatMentionComposerOptions) => {
  const [activeMention, setActiveMention] = useState<ActiveChatMention | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedMentions, setSelectedMentions] = useState<SelectedChatMention[]>([]);

  const candidates = useMemo(
    () => buildChatMentionCandidates(users, onlineUsers, currentUser),
    [users, onlineUsers, currentUser],
  );
  const suggestions = useMemo(
    () => activeMention ? searchChatMentionCandidates(candidates, activeMention.query) : [],
    [activeMention, candidates],
  );
  const isOpen = Boolean(activeMention && suggestions.length > 0);
  const mentionedUserIds = useMemo(() => selectedMentions.map((mention) => mention.id), [selectedMentions]);

  const updateCaret = useCallback((value: string, caret: number) => {
    const next = findActiveChatMention(value, caret);
    setActiveMention(next);
    setActiveIndex(0);
  }, []);

  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.currentTarget.value.slice(0, maxLength);
    setInputText(value);
    updateCaret(value, event.currentTarget.selectionStart ?? value.length);
    setSelectedMentions((previous) => previous.filter((mention) =>
      value.toLocaleLowerCase('vi-VN').includes(`@${mention.name}`.toLocaleLowerCase('vi-VN')),
    ));
  }, [maxLength, setInputText, updateCaret]);

  const handleCaretChange = useCallback((event: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    updateCaret(target.value, target.selectionStart ?? target.value.length);
  }, [updateCaret]);

  const selectMention = useCallback((candidate: ChatMentionCandidate) => {
    if (!activeMention) return;
    const label = `@${candidate.name} `;
    const nextValue = `${inputText.slice(0, activeMention.start)}${label}${inputText.slice(activeMention.end)}`.slice(0, maxLength);
    const caret = Math.min(nextValue.length, activeMention.start + label.length);
    setInputText(nextValue);
    setSelectedMentions((previous) => {
      const stillPresent = previous.filter((mention) =>
        nextValue.toLocaleLowerCase('vi-VN').includes(`@${mention.name}`.toLocaleLowerCase('vi-VN')),
      );
      return stillPresent.some((mention) => mention.id === candidate.id)
        ? stillPresent
        : [...stillPresent, { id: candidate.id, name: candidate.name }];
    });
    setActiveMention(null);
    setActiveIndex(0);
    window.requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(caret, caret);
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    });
  }, [activeMention, inputText, inputRef, maxLength, setInputText]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (activeMention && event.key === 'Escape') {
      event.preventDefault();
      setActiveMention(null);
      return true;
    }
    if (!isOpen) return false;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selectMention(suggestions[activeIndex] || suggestions[0]);
      return true;
    }
    return false;
  }, [activeIndex, activeMention, isOpen, selectMention, suggestions]);

  const reset = useCallback(() => {
    setActiveMention(null);
    setActiveIndex(0);
    setSelectedMentions([]);
  }, []);

  return {
    activeIndex,
    isOpen,
    mentionedUserIds,
    setActiveIndex,
    suggestions,
    handleChange,
    handleCaretChange,
    handleKeyDown,
    reset,
    selectMention,
  };
};
