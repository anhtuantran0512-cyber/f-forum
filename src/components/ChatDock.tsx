/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Hash,
  Users,
  HelpCircle,
  Heart,
  Shield,
  LogIn,
  Trash2,
  MessageSquareDashed,
  Flag,
  User as UserIcon,
  CheckCircle2,
  CornerUpLeft,
  LoaderCircle,
} from 'lucide-react';
import type { ChatChannelId, ChatMessage, User, OnlinePresenceUser } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { useEscapeKey } from '../utils/useEscapeKey';
import { DEFAULT_AVATAR } from '../utils/mediaFallback';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../config/admin';
import { capsHas, useAdminCaps } from '../utils/adminCapabilities';
import { getTierForLevel } from '../utils/tier';
import { pushNotification } from '../utils/notifications';
import { useChatCooldown } from '../utils/chatCooldown';
import { useChatMentionComposer } from '../utils/chatMentions';
import { ChatMentionPicker } from './chat/ChatMentionPicker';
import { ChatMessageContent } from './chat/ChatMessageContent';
import { ChatRoleIcon } from './chat/ChatRoleIcon';
import { ThinkingBubble } from './ViewTransitionLoader';
import { postJson } from '../utils/session';
import { describeReportResult, settleReportRequest } from '../utils/reports';
import { DecoratedAvatar, DecoratedName, UserNameplateBg } from './decorations/DecoratedAvatar';

export interface ChatDockProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users?: Record<string, User>;
  messages: ChatMessage[];
  onSendMessage: (channelId: ChatChannelId, content: string, mentionIds?: string[]) => void | boolean | Promise<void | boolean>;
  onDeleteMessage?: (messageId: string) => void;
  onOpenLoginModal?: () => void;
  onOpenProfile?: (user: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  onOpenFullChat?: () => void;
  onlineUsers?: OnlinePresenceUser[];
  onlineCount?: number;
  /** False khi máy chủ chưa đồng bộ xong → hiện bong bóng "đang tải". */
  isSynced?: boolean;
}

const CHANNELS: {
  id: ChatChannelId;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'hallway', name: 'Kết bạn', shortName: 'Kết bạn', icon: Users },
  { id: 'quick-qa', name: 'Hỏi bài', shortName: 'Hỏi bài', icon: HelpCircle },
  { id: 'confessions', name: 'Tâm sự', shortName: 'Tâm sự', icon: Heart },
  { id: 'club-hub', name: 'CLB', shortName: 'CLB', icon: Shield },
];

export const ChatDock: React.FC<ChatDockProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = {},
  messages,
  onSendMessage,
  onDeleteMessage,
  onOpenLoginModal,
  onOpenProfile,
  onOpenFullChat,
  onlineUsers,
  onlineCount = 1,
  isSynced = true,
}) => {
  const dynamicOnlineCount =
    onlineUsers && onlineUsers.length > 0 ? onlineUsers.length : Math.max(1, onlineCount);
  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const k in users) {
      const u = users[k];
      if (u?.id) map.set(u.id, u);
    }
    return map;
  }, [users]);

  const resolveChatUser = useCallback(
    (email?: string | null, id?: string | null): User | null => {
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      if (cleanEmail && users[cleanEmail]) return users[cleanEmail];
      if (isMasterAdmin(cleanEmail) && users['broamstuck@gmail.com']) {
        return users['broamstuck@gmail.com'];
      }
      if (
        currentUser &&
        ((cleanEmail && currentUser.email.toLowerCase() === cleanEmail) ||
          (id && currentUser.id === id) ||
          ((id === 'admin-master' || id === 'user-admin') && isMasterAdmin(currentUser.email)))
      ) {
        return currentUser;
      }
      if ((id === 'admin-master' || id === 'user-admin') && users['broamstuck@gmail.com']) {
        return users['broamstuck@gmail.com'];
      }
      if (id) {
        return usersById.get(id) || null;
      }
      return null;
    },
    [users, usersById, currentUser],
  );

  /* Epic 3 — thu hồi tin nhắn: Super Admin hoặc vai trò tùy chỉnh có quyền edit_content. */
  const adminCaps = useAdminCaps();
  const canRecallMessages = capsHas(adminCaps, 'edit_content');
  const [activeChannel, setActiveChannel] = useState<ChatChannelId>('hallway');
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorId: string; authorName: string; excerpt: string } | null>(null);
  const cooldown = useChatCooldown();
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');
  const sendStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionComposer = useChatMentionComposer({
    inputText,
    setInputText,
    users,
    onlineUsers,
    currentUser,
    inputRef,
  });
  const announceSendStatus = useCallback((status: string, durationMs = 1300) => {
    setSendStatus(status);
    if (sendStatusTimerRef.current) window.clearTimeout(sendStatusTimerRef.current);
    sendStatusTimerRef.current = window.setTimeout(() => setSendStatus(''), durationMs);
  }, []);
  useEffect(() => () => {
    if (sendStatusTimerRef.current) window.clearTimeout(sendStatusTimerRef.current);
  }, []);
  useEscapeKey(onClose, isOpen);

  const [activeAuthorCard, setActiveAuthorCard] = useState<{
    id: string;
    name: string;
    avatar: string;
    email?: string;
    level: number;
  } | null>(null);
  const [authorAnchorPos, setAuthorAnchorPos] = useState<{ x: number; y: number }>({ x: 240, y: 180 });
  const [reportUser, setReportUser] = useState<{ id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>('Toxic / Gây war / Xúc phạm bạn học');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);
  const [reportErrorMsg, setReportErrorMsg] = useState<string | null>(null);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportUser || isSubmittingReport) return;
    setIsSubmittingReport(true);
    setReportErrorMsg(null);
    try {
      const outcome = describeReportResult(
        await settleReportRequest(
          postJson('/api/reports', {
            reportedUserId: reportUser.id,
            reportedUserName: reportUser.name,
            reason: reportReason,
            details: reportDetails.trim(),
          }),
        ),
      );
      if (!outcome.ok) {
        setReportErrorMsg(outcome.message);
        return;
      }
      setReportSuccessMsg(outcome.message || 'Đã gửi tố cáo tài khoản tới Ban Quản Trị.');
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Đã Tiếp Nhận Báo Cáo',
        body: `Tố cáo đối với "${reportUser.name}" đã được chuyển tới Ban Giám Hiệu và Super Admin.`,
        targetView: 'chat',
      });
    } catch {
      setReportErrorMsg('Mất kết nối máy chủ — tố cáo CHƯA được gửi. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const currentMessages = useMemo(
    () => messages.filter(m => m.channelId === activeChannel),
    [messages, activeChannel],
  );

  const openAuthorCardFromEvent = useCallback(
    (
      e: React.MouseEvent,
      payload: { id: string; name: string; avatar: string; email?: string; level: number },
    ) => {
      setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
      setActiveAuthorCard(payload);
    },
    [],
  );

  const renderedDockMessages = useMemo(
    () =>
      currentMessages.map((msg, idx) => {
        const isMe = currentUser ? msg.authorId === currentUser.id : false;
        const isSuperAdminMsg = isMasterAdmin(msg.authorEmail);
        const isSuperAdmin = currentUser ? isMasterAdmin(currentUser.email) : false;
        const authorDisplayName = (isSuperAdminMsg ? MASTER_ADMIN_CONFIG.name : msg.authorName).replace(/ \(.*\)/, '');
        const authorDisplayAvatar = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.avatar : msg.authorAvatar;
        const resolvedDockUser = resolveChatUser(
          isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
          msg.authorId,
        );
        const prevMsg = idx > 0 ? currentMessages[idx - 1] : null;
        const isContinuation = Boolean(prevMsg && prevMsg.authorId === msg.authorId);

        const authorPayload =
          isMe && currentUser
            ? {
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                email: currentUser.email,
                level: currentUser.level || 1,
              }
            : {
                id: msg.authorId,
                name: authorDisplayName,
                avatar: authorDisplayAvatar,
                email: isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
                level: isSuperAdminMsg ? 150 : msg.authorLevel || 1,
              };

        return (
          <div
            key={msg.id}
            className={`group/msg flex items-start gap-2.5 px-1.5 py-0.5 rounded-lg hover:bg-[#f8f7f4]/[0.02] transition-colors ${
              isMe ? 'flex-row-reverse' : ''
            } ${isContinuation ? 'mt-0.5' : 'mt-2.5'}`}
          >
            {!isContinuation ? (
              <button
                type="button"
                onClick={e => openAuthorCardFromEvent(e, authorPayload)}
                className="relative shrink-0 mt-0.5 cursor-pointer focus:outline-none"
                title={`Xem hồ sơ ${authorDisplayName}`}
              >
                <DecoratedAvatar
                  user={resolvedDockUser}
                  fallbackSrc={authorDisplayAvatar}
                  size={32}
                  animate={isOpen}
                  alt={authorDisplayName}
                  className={`rounded-full ${
                    isSuperAdminMsg
                      ? 'ring-1 ring-[#e9c46a]/70'
                      : 'ring-1 ring-[#f8f7f4]/15'
                  }`}
                />
                <span className="absolute -bottom-1 -right-1 z-[4]">
                  <TierBadge
                    level={isSuperAdminMsg ? 150 : msg.authorLevel}
                    size={13}
                    showTooltip={false}
                  />
                </span>
              </button>
            ) : (
              <div className="w-8 shrink-0 select-none text-[9px] font-mono text-[#a39f96]/0 group-hover/msg:text-[#a39f96]/70 text-center pt-1.5 transition-colors">
                {msg.timestamp.slice(0, 5)}
              </div>
            )}

            <div
              className={`max-w-[80%] flex flex-col ${
                isMe ? 'items-end' : 'items-start'
              }`}
            >
              {!isContinuation && (
                <div
                  className={`flex items-center gap-1.5 mb-0.5 flex-wrap ${
                    isMe ? 'justify-end flex-row-reverse' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={e => openAuthorCardFromEvent(e, authorPayload)}
                    className="inline-flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <DecoratedName
                      user={resolvedDockUser}
                      name={authorDisplayName}
                      width={124}
                      height={22}
                      animate={isOpen}
                      className={`text-xs font-semibold ${
                        isSuperAdminMsg
                          ? 'text-[#e9c46a]'
                          : isMe
                          ? 'text-[#81b29a]'
                          : 'text-[#f8f7f4]'
                      }`}
                    />
                  </button>
                  <ChatRoleIcon user={resolvedDockUser} isSuperAdmin={isSuperAdminMsg} size={12} />
                  {!isSuperAdminMsg && (
                    <span className="text-[9.5px] font-mono text-[#a39f96]">
                      Lv.{msg.authorLevel || 1}
                    </span>
                  )}
                  <span className="text-[9.5px] text-[#a39f96] font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              )}

              <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-fit px-3.5 py-2 text-xs leading-relaxed break-words ${
                    isMe
                      ? 'ff-chat-bubble-me'
                      : isSuperAdminMsg
                      ? 'ff-chat-bubble-peer ff-chat-bubble-admin'
                      : 'ff-chat-bubble-peer'
                  }`}
                >
                  <ChatMessageContent message={msg} users={users} currentUser={currentUser} />
                </div>

                <div className="opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo({
                          id: msg.id,
                          authorId: msg.authorId,
                          authorName: authorDisplayName,
                          excerpt: msg.content.slice(0, 48),
                        });
                        inputRef.current?.focus();
                      }}
                      className="p-1 rounded-md bg-[#161d2b] hover:bg-[#1f293d] border border-[#f8f7f4]/12 text-[#a39f96] hover:text-[#f8f7f4] cursor-pointer"
                      title="Trả lời tin nhắn"
                    >
                      <CornerUpLeft className="w-3 h-3" />
                    </button>
                  )}

                  {(isSuperAdmin || canRecallMessages) && (
                    <button
                      type="button"
                      onClick={() => onDeleteMessage?.(msg.id)}
                      className="px-1.5 py-0.5 text-rose-300 hover:text-rose-200 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 cursor-pointer inline-flex items-center gap-1"
                      title="Thu hồi tin nhắn vi phạm"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      <span className="text-[9px]">Thu hồi tin nhắn</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }),
    [currentMessages, currentUser, users, canRecallMessages, resolveChatUser, onDeleteMessage, isOpen, openAuthorCardFromEvent],
  );

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChannel, isOpen]);

  const handleSend = async () => {
    if (!currentUser || isSending) return;
    if (cooldown.isCooling) {
      cooldown.nudge();
      announceSendStatus('Chờ một nhịp ngắn nhé');
      return;
    }
    const raw = inputText.trim();
    if (!raw) return;
    const prefix = replyingTo ? `@${replyingTo.authorName}: ` : '';
    const finalContent = `${prefix}${raw}`.slice(0, 300);
    setIsSending(true);
    setSendStatus('Đang gửi…');
    cooldown.startCooldown();
    try {
      const mentionIds = [...new Set([
        ...mentionComposer.mentionedUserIds,
        ...(replyingTo?.authorId ? [replyingTo.authorId] : []),
      ])];
      const outcome = await onSendMessage(activeChannel, finalContent, mentionIds);
      if (outcome === false) {
        announceSendStatus('Chưa gửi được · bản nháp đã giữ lại', 2200);
        return;
      }
      setInputText('');
      setReplyingTo(null);
      mentionComposer.reset();
      if (inputRef.current) inputRef.current.style.height = 'auto';
      announceSendStatus('Đã gửi');
    } catch {
      announceSendStatus('Chưa gửi được · bản nháp đã giữ lại', 2200);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionComposer.handleKeyDown(event)) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    } else if (event.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  const currentChannelObj = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

  return (
    <>
      <div
        className={`fixed top-20 bottom-4 right-0 sm:right-4 z-40 w-full sm:w-[430px] md:w-[460px] p-2 sm:p-0 flex flex-col chat-dock-panel ${
          isOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex-1 bg-[#0e131d] border border-[#f8f7f4]/14 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.68)] flex flex-col overflow-hidden">
          
          {/* Thanh tiêu đề & bộ chọn kênh */}
          <div className="p-3.5 border-b border-[#f8f7f4]/10 bg-[#0b0f17] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#81b29a]/15 border border-[#81b29a]/35 flex items-center justify-center">
                  <Hash className="w-4 h-4 text-[#81b29a]" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#f8f7f4] flex items-center gap-1.5">
                    <span>
                      <span className="ff-swash-cap text-xs mr-0.5">F</span>·Chat
                    </span>
                    <span className="ff-atelier-ribbon !py-0.2 !px-1.5 !text-[8px]">Chút chuyện, thêm thân tình.</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-[#81b29a]/15 text-[#81b29a] text-[9px] font-mono font-semibold border border-[#81b29a]/35">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#81b29a]" />
                      {dynamicOnlineCount}
                    </span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {onOpenFullChat && (
                  <button
                    type="button"
                    onClick={onOpenFullChat}
                    className="px-2.5 py-1.5 rounded-lg bg-[#81b29a]/15 hover:bg-[#81b29a]/25 border border-[#81b29a]/35 text-[#81b29a] text-[11px] font-semibold transition-colors cursor-pointer"
                    title="Mở phòng đàm thoại toàn màn hình"
                  >
                    Mở rộng
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng khung chat"
                  className="p-1.5 rounded-lg bg-[#151b28] border border-[#f8f7f4]/10 text-[#a39f96] hover:text-[#f8f7f4] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Các tab chọn kênh */}
            <div className="grid grid-cols-2 gap-1.5">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveChannel(ch.id);
                      setReplyingTo(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left truncate cursor-pointer border ${
                      isActive
                        ? 'bg-[#81b29a]/16 text-[#f8f7f4] font-semibold border-[#81b29a]/40'
                        : 'bg-[#131926] border-[#f8f7f4]/08 text-[#a39f96] hover:text-[#f8f7f4] hover:bg-[#171f2f]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#81b29a]' : 'text-[#a39f96]'}`} />
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danh sách tin nhắn */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 bg-[#101520] no-scrollbar"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Tin nhắn phòng chat nhanh"
          >
            {!isSynced && currentMessages.length === 0 ? (
              <div className="space-y-2.5 py-3" aria-busy="true">
                <ThinkingBubble compact phase="Đang kết nối máy chủ F-Forum…" />
                <ThinkingBubble compact phase="Đang tải hội thoại kênh này…" />
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-1.5">
                <MessageSquareDashed className="w-8 h-8 text-[#81b29a]/60" />
                <p className="text-xs font-semibold text-[#f4f1de]">
                  <span className="ff-swash-cap text-sm mr-0.5">G</span>óc học chung đang đợi bạn
                </p>
                <p className="text-[11px] text-[#a39f96]">
                  Gửi lời chào hoặc câu hỏi để cùng bạn bè trao đổi nhé!
                </p>
              </div>
            ) : (
              renderedDockMessages
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Khung nhập tin nhắn */}
          <div className="p-3 border-t border-[#f8f7f4]/10 bg-[#0b0f17]">
            {replyingTo && (
              <div className="mb-2 px-2.5 py-1 rounded-lg bg-[#151b28] border border-[#81b29a]/35 flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CornerUpLeft className="w-3 h-3 text-[#81b29a] shrink-0" />
                  <strong className="text-[#f8f7f4] shrink-0">@{replyingTo.authorName}</strong>
                  <span className="text-[#a39f96] truncate">{replyingTo.excerpt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-[#a39f96] hover:text-[#f8f7f4] cursor-pointer shrink-0"
                  aria-label="Hủy trả lời"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {currentUser ? (
              <div className="ff-chat-composer-wrap ff-chat-composer-wrap--dock">
                <ChatMentionPicker
                  id="ff-chat-mention-options-dock"
                  open={mentionComposer.isOpen}
                  suggestions={mentionComposer.suggestions}
                  activeIndex={mentionComposer.activeIndex}
                  onSelect={mentionComposer.selectMention}
                  onHighlight={mentionComposer.setActiveIndex}
                />
                <div className="ff-chat-composer-shell" data-cooling={cooldown.isCooling ? 'true' : undefined}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputText}
                    maxLength={300}
                    onChange={(event) => {
                      mentionComposer.handleChange(event);
                      event.currentTarget.style.height = 'auto';
                      event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 96)}px`;
                    }}
                    onSelect={mentionComposer.handleCaretChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Nhắn vào #${currentChannelObj.name}...`}
                    aria-label={`Tin nhắn trong kênh ${currentChannelObj.name}`}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={mentionComposer.isOpen}
                    aria-controls={mentionComposer.isOpen ? 'ff-chat-mention-options-dock' : undefined}
                    aria-activedescendant={mentionComposer.isOpen ? `ff-chat-mention-options-dock-option-${mentionComposer.activeIndex}` : undefined}
                    className="ff-chat-message-input flex-1 bg-transparent border-none text-xs text-[#f8f7f4] placeholder-[#a39f96] focus:outline-none"
                  />
                  <span className="ff-chat-send-status" role="status" aria-live="polite">{sendStatus}</span>
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!inputText.trim() || isSending}
                    aria-busy={isSending}
                    className={`ff-tactile-btn ff-chat-send-button p-2 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] disabled:opacity-40 transition-colors cursor-pointer ${cooldown.isCooling ? 'is-cooling' : ''}`}
                    title={cooldown.isCooling ? 'Đã gửi gần đây · chờ một nhịp ngắn' : 'Gửi tin nhắn'}
                    aria-label="Gửi tin nhắn"
                  >
                    {isSending ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#e07a5f]" />}
                  </button>
                </div>
                <div className="ff-chat-composer-hint ff-chat-composer-hint--dock">
                  <span><b>@</b> để nhắc</span>
                  <span>Enter gửi · Shift + Enter xuống dòng</span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[#151b28] border border-[#f8f7f4]/12 flex items-center justify-between gap-2">
                <span className="text-xs text-[#dad7d0]">Đăng nhập để trò chuyện</span>
                {onOpenLoginModal && (
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="ff-tactile-btn px-3 py-1.5 rounded-xl bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#e07a5f]" /> Đăng nhập
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thẻ thông tin người dùng (Popover) */}
      {activeAuthorCard && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Thông tin người dùng"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveAuthorCard(null);
          }}
          className="fixed inset-0 z-[100] bg-transparent"
        >
          <div
            style={{
              position: 'fixed',
              left:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.x - 160, window.innerWidth - 320))
                  : 24,
              top:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.y - 200, window.innerHeight - 230))
                  : 120,
            }}
            className="pc-12-shell w-[300px] max-w-[calc(100vw-24px)] rounded-2xl p-4 shadow-2xl popover-morph-enter"
          >
            <button
              type="button"
              onClick={() => setActiveAuthorCard(null)}
              className="absolute top-2.5 right-2.5 z-[5] p-1 rounded-full text-[#a39f96] hover:text-[#f8f7f4] cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="ff-discord-userbar flex items-center gap-3 p-3 rounded-xl bg-[#141a26] border border-[#f8f7f4]/12 pr-6">
              <UserNameplateBg
                user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                width={250}
                eager
                animate
                priority="high"
              />
              <div className="relative z-[2] shrink-0">
                <DecoratedAvatar
                  user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                  fallbackSrc={activeAuthorCard.avatar || DEFAULT_AVATAR}
                  size={40}
                  eager
                  animate
                  alt={activeAuthorCard.name}
                  className="rounded-full ring-1 ring-[#e9c46a]/50"
                />
                <span className="absolute -bottom-1 -right-1 z-[4]">
                  <TierBadge level={activeAuthorCard.level} size={14} showTooltip={false} />
                </span>
              </div>

              <div className="relative z-[2] min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <DecoratedName
                    user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                    name={activeAuthorCard.name.replace(/ \(.*\)/, '')}
                    width={150}
                    height={24}
                    eager
                    animate
                    priority="high"
                    className="text-sm font-bold text-[#f8f7f4] truncate"
                  />
                  {isMasterAdmin(activeAuthorCard.email) && <AdminVerifiedBadge size={12} />}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-md bg-[#e9c46a]/15 text-[#e9c46a] border border-[#e9c46a]/35 text-[10px] font-mono font-semibold">
                    {getTierForLevel(activeAuthorCard.level).titleVi}
                  </span>
                  <span className="text-[10.5px] text-[#dad7d0] font-mono">
                    Lv.{activeAuthorCard.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 flex flex-col gap-1.5">
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => {
                    const user = activeAuthorCard;
                    setActiveAuthorCard(null);
                    onClose();
                    onOpenProfile(user);
                  }}
                  className="pc-12-btn w-full py-2 px-3 rounded-xl text-[#f8f7f4] hover:text-[#e9c46a] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#81b29a]" />
                  <span>Trang cá nhân</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const user = activeAuthorCard;
                  setActiveAuthorCard(null);
                  setReportUser({ id: user.id, name: user.name });
                }}
                className="pc-12-btn w-full py-2 px-3 rounded-xl text-rose-200 hover:text-rose-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-rose-400" />
                <span>Tố cáo</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hộp thoại Tố cáo tài khoản */}
      {reportUser && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tố cáo tài khoản vi phạm"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setReportUser(null);
              setReportSuccessMsg(null);
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up"
        >
          <div className="modal-container w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#f8f7f4]/12 mb-4">
              <div className="flex items-center gap-2 text-[#d97757]">
                <Flag className="w-5 h-5 text-[#d97757]" />
                <h3 className="font-bold text-sm sm:text-base text-[#f8f7f4]">Tố Cáo Tài Khoản Vi Phạm</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportUser(null);
                  setReportSuccessMsg(null);
                }}
                className="p-1.5 rounded-lg bg-[#141a26] border border-[#f8f7f4]/12 text-[#dad7d0] hover:text-[#f8f7f4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-200">{reportSuccessMsg}</p>
                <button
                  type="button"
                  onClick={() => {
                    setReportUser(null);
                    setReportSuccessMsg(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3.5">
                {reportErrorMsg && (
                  <p role="alert" className="ff-report-error">{reportErrorMsg}</p>
                )}
                <div className="p-2.5 rounded-xl bg-[#141a26] border border-[#f8f7f4]/10 text-xs text-[#dad7d0]">
                  Đối tượng tố cáo: <strong className="text-[#f8f7f4]">{reportUser.name}</strong>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#dad7d0] mb-1">
                    Lý do vi phạm (*):
                  </label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full bg-[#141a26] border border-[#f8f7f4]/15 rounded-xl px-3 py-2 text-xs text-[#f8f7f4] focus:outline-none focus:border-[#d97757] cursor-pointer"
                  >
                    <option value="Toxic / Gây war / Xúc phạm bạn học">Toxic / Gây war / Xúc phạm bạn học</option>
                    <option value="Spam / Quảng cáo / Lừa đảo">Spam / Quảng cáo / Lừa đảo</option>
                    <option value="Nội dung phản cảm / Đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Gian lận điểm / Hack Coin">Gian lận điểm / Hack Coin</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="dock-chi-tiet-vi-pham" className="block text-xs font-semibold text-[#dad7d0] mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea
                    id="dock-chi-tiet-vi-pham"
                    maxLength={500}
                    rows={3}
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    placeholder="Mô tả cụ thể hành vi hoặc bằng chứng vi phạm..."
                    className="w-full bg-[#141a26] border border-[#f8f7f4]/15 rounded-xl px-3 py-2 text-xs text-[#f8f7f4] focus:outline-none focus:border-[#d97757] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f8f7f4]/10">
                  <button
                    type="button"
                    onClick={() => setReportUser(null)}
                    className="px-4 py-2 rounded-xl text-xs text-[#a39f96] hover:text-[#f8f7f4] cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReport ? 'Đang gửi...' : 'Gửi Tố Cáo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ChatDock;
