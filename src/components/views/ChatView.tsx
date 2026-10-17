/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  MessageSquareDashed,
  X,
  ChevronDown,
  Flag,
  User as UserIcon,
  CheckCircle2,
  Search,
  CornerUpLeft,
  PanelRight,
  LoaderCircle,
} from 'lucide-react';
import {
  Send,
  Hash,
  Users,
  HelpCircle,
  Heart,
  Shield,
} from '../ui/CozyGhibliIcons';
import type { ChatChannelId, ChatMessage, User, OnlinePresenceUser } from '../../types';
import { TierBadge } from '../Badges10Tier';
import { ChatMentionPicker } from '../chat/ChatMentionPicker';
import { ChatMessageContent } from '../chat/ChatMessageContent';
import { ChatRoleIcon } from '../chat/ChatRoleIcon';
import { DEFAULT_AVATAR } from '../../utils/mediaFallback';
import { useChatCooldown } from '../../utils/chatCooldown';
import { useChatMentionComposer } from '../../utils/chatMentions';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../../config/admin';
import { capsHas, useAdminCaps } from '../../utils/adminCapabilities';
import { InfoTip } from '../ui/InfoTip';
import { getTierForLevel } from '../../utils/tier';
import { pushNotification } from '../../utils/notifications';
import { ThinkingBubble } from '../ViewTransitionLoader';
import { postJson } from '../../utils/session';
import { describeReportResult, settleReportRequest } from '../../utils/reports';
import { DecoratedAvatar, DecoratedName } from '../decorations/DecoratedAvatar';

interface ChatViewProps {
  currentUser: User | null;
  users?: Record<string, User>;
  messages: ChatMessage[];
  onSendMessage: (channelId: ChatChannelId, content: string, mentionIds?: string[]) => void | boolean | Promise<void | boolean>;
  onDeleteMessage?: (messageId: string) => void;
  onlineUsers?: OnlinePresenceUser[];
  onlineCount?: number;
  onOpenLoginModal?: () => void;
  onOpenProfile?: (user?: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  /** False while the first server sync is in flight → show shimmer skeletons. */
  isSynced?: boolean;
}

const CHANNELS: {
  id: ChatChannelId;
  name: string;
  subtitle: string;
  prompts: string[];
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'hallway',
    name: 'Kết bạn',
    subtitle: 'Giao lưu & học nhóm',
    prompts: [
      'Chào mọi người, mình đang tìm bạn cùng ôn thi học kỳ!',
      'Có bạn nào đang học nhóm môn Toán tối nay không?',
    ],
    icon: Users,
  },
  {
    id: 'quick-qa',
    name: 'Hỏi bài',
    subtitle: 'Hỏi đáp bài tập nhanh',
    prompts: [
      'Nhờ mọi người gợi ý hướng biến đổi bài toán này với ạ:',
      'Cho mình hỏi công thức tính nhanh phần này:',
    ],
    icon: HelpCircle,
  },
  {
    id: 'confessions',
    name: 'Tâm sự',
    subtitle: 'Góc chia sẻ & động lực',
    prompts: [
      'Hôm nay hoàn thành xong đề cương ôn tập, cảm thấy nhẹ nhõm hẳn!',
      'Chúc cả trường một tuần học tập thật tập trung và hiệu quả nhé.',
    ],
    icon: Heart,
  },
  {
    id: 'club-hub',
    name: 'CLB',
    subtitle: 'Hoạt động phong trào',
    prompts: [
      'CLB mình tuần này có buổi sinh hoạt chuyên đề, mời các bạn tham gia!',
      'Mình muốn tìm hiểu thông tin đăng ký tham gia CLB học thuật.',
    ],
    icon: Shield,
  },
];

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  users = {},
  messages,
  onSendMessage,
  onDeleteMessage,
  onlineUsers,
  onlineCount = 1,
  onOpenLoginModal,
  onOpenProfile,
  isSynced = true,
}) => {
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
  const [isChannelDrawerOpen, setIsChannelDrawerOpen] = useState(false);
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [isDesktopRosterVisible, setIsDesktopRosterVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorId: string; authorName: string; excerpt: string } | null>(null);
  const [inputText, setInputText] = useState('');
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

  const [activeAuthorCard, setActiveAuthorCard] = useState<{
    id: string;
    name: string;
    avatar: string;
    email?: string;
    level: number;
    coin?: number;
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

  const dynamicOnlineCount =
    onlineUsers && onlineUsers.length > 0 ? onlineUsers.length : Math.max(1, onlineCount);
  const isMasterAdminOnline = useMemo(
    () =>
      (onlineUsers || []).some(u => isMasterAdmin(u.email)) ||
      (currentUser ? isMasterAdmin(currentUser.email) : false),
    [onlineUsers, currentUser],
  );
  const activeStudents = useMemo(
    () => (onlineUsers || []).filter(u => !isMasterAdmin(u.email)),
    [onlineUsers],
  );

  const channelMessageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of messages) {
      counts[m.channelId] = (counts[m.channelId] || 0) + 1;
    }
    return counts;
  }, [messages]);

  const currentMessages = useMemo(() => {
    const list = messages.filter(m => m.channelId === activeChannel);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      m =>
        m.content.toLowerCase().includes(q) ||
        m.authorName.toLowerCase().includes(q),
    );
  }, [messages, activeChannel, searchQuery]);

  const openAuthorCardFromEvent = useCallback(
    (
      e: React.MouseEvent,
      payload: { id: string; name: string; avatar: string; email?: string; level: number; coin?: number },
    ) => {
      setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
      setActiveAuthorCard(payload);
    },
    [],
  );

  const renderedMessageItems = useMemo(
    () =>
      currentMessages.map((msg, idx) => {
        const isMe = currentUser ? msg.authorId === currentUser.id : false;
        const isSuperAdminMsg = isMasterAdmin(msg.authorEmail);
        const isSuperAdmin = currentUser ? isMasterAdmin(currentUser.email) : false;
        const authorDisplayName = (isSuperAdminMsg ? MASTER_ADMIN_CONFIG.name : msg.authorName).replace(/ \(.*\)/, '');
        const authorDisplayAvatar = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.avatar : msg.authorAvatar;
        const resolvedMsgUser = resolveChatUser(
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
            className={`ff-chat-message-row group/msg flex items-start gap-3 px-3 sm:px-4 py-1.5 rounded-2xl hover:bg-white/[0.025] transition-all duration-150 ${
              isMe ? 'ff-chat-message-row--mine flex-row-reverse' : ''
            } ${isContinuation ? 'mt-0.5' : 'mt-3.5'}`}
          >
            {/* Cột Avatar hoặc khoảng đệm căn lề khi gộp tin nhắn liên tiếp */}
            {!isContinuation ? (
              <button
                type="button"
                onClick={(e) => openAuthorCardFromEvent(e, authorPayload)}
                className="ff-chat-message-avatar relative shrink-0 mt-0.5 cursor-pointer focus:outline-none transition-transform hover:scale-105"
                title={`Xem thông tin ${authorDisplayName}`}
              >
                <DecoratedAvatar
                  user={resolvedMsgUser}
                  fallbackSrc={authorDisplayAvatar}
                  size={38}
                  animate
                  alt={authorDisplayName}
                  className={`rounded-full ${
                    isSuperAdminMsg
                      ? 'ring-2 ring-[#e9c46a] shadow-[0_0_14px_rgba(233,196,106,0.35)]'
                      : 'ring-1 ring-[#f8f7f4]/18 shadow-sm'
                  }`}
                />
                <span className="absolute -bottom-1 -right-1 z-[4]">
                  <TierBadge
                    level={isSuperAdminMsg ? 150 : msg.authorLevel}
                    size={14}
                    showTooltip={false}
                  />
                </span>
              </button>
            ) : (
              <div className="ff-chat-message-avatar ff-chat-message-avatar--continuation w-9 shrink-0 select-none text-[9.5px] font-mono text-[#a39f96]/0 group-hover/msg:text-[#a39f96]/70 text-center pt-2 transition-colors">
                {msg.timestamp.slice(0, 5)}
              </div>
            )}

            {/* Nội dung tin nhắn */}
            <div
              className={`ff-chat-message-body max-w-[82%] sm:max-w-[74%] flex flex-col ${
                isMe ? 'items-end' : 'items-start'
              }`}
            >
              {!isContinuation && (
                <div
                  className={`ff-chat-message-meta flex items-center gap-2 mb-1.5 text-xs flex-wrap ${
                    isMe ? 'ff-chat-message-meta--mine justify-end flex-row-reverse' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => openAuthorCardFromEvent(e, authorPayload)}
                    className="ff-chat-message-author inline-flex items-center gap-1.5 cursor-pointer hover:underline text-left"
                  >
                    <DecoratedName
                      user={resolvedMsgUser}
                      name={authorDisplayName}
                      width={132}
                      height={24}
                      animate
                      showFallbackTag
                      className={`text-[13px] font-bold ${
                        isSuperAdminMsg
                          ? 'text-[#e9c46a]'
                          : isMe
                          ? 'text-[#81b29a]'
                          : 'text-[#f8f7f4]'
                      }`}
                    />
                  </button>

                  <span className={`${isMe ? 'hidden sm:inline-flex' : 'inline-flex'} items-center gap-2`}>
                    <ChatRoleIcon user={resolvedMsgUser} isSuperAdmin={isSuperAdminMsg} />
                    {isSuperAdminMsg ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#e9c46a]/15 text-[#e9c46a] border border-[#e9c46a]/35 text-[10px] font-mono font-bold tracking-wide">
                        Ban Giám Hiệu
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#a39f96] px-1.5 py-0.2 rounded-md bg-[#f8f7f4]/[0.05] border border-[#f8f7f4]/[0.08]">
                        Lv.{msg.authorLevel || 1}
                      </span>
                    )}
                  </span>

                  <span className="text-[10.5px] text-[#8e8a82] font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              )}

              <div className={`ff-chat-message-content flex items-center gap-2.5 ${isMe ? 'ff-chat-message-content--mine flex-row-reverse' : ''}`}>
                <div
                  className={`ff-chat-message-bubble w-fit px-4 py-2.5 text-[13.5px] leading-relaxed break-words transition-all duration-150 ${
                    isMe
                      ? 'ff-chat-bubble-me'
                      : isSuperAdminMsg
                      ? 'ff-chat-bubble-peer ff-chat-bubble-admin'
                      : 'ff-chat-bubble-peer'
                  }`}
                >
                  <ChatMessageContent message={msg} users={users} currentUser={currentUser} />
                </div>

                {/* Cụm nút tương tác nhanh khi rê chuột: Trả lời & Thu hồi */}
                <div className="ff-chat-message-actions opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-all duration-150 flex items-center gap-1 shrink-0 bg-[#151c2a]/90 backdrop-blur-md px-1.5 py-1 rounded-xl border border-[#f8f7f4]/12 shadow-md">
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo({
                          id: msg.id,
                          authorId: msg.authorId,
                          authorName: authorDisplayName,
                          excerpt: msg.content.slice(0, 64),
                        });
                        inputRef.current?.focus();
                      }}
                      className="ff-icon-button ff-chat-action-button rounded-lg hover:bg-white/10 text-[#a39f96] hover:text-[#f8f7f4] transition-colors cursor-pointer"
                      title="Trả lời tin nhắn này"
                      aria-label="Trả lời tin nhắn"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(isSuperAdmin || canRecallMessages) && (
                    <button
                      type="button"
                      onClick={() => onDeleteMessage?.(msg.id)}
                      className="ff-icon-button ff-chat-action-button rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="Thu hồi tin nhắn vi phạm"
                      aria-label="Thu hồi tin nhắn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sr-only">Thu hồi tin nhắn</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }),
    [currentMessages, currentUser, users, canRecallMessages, resolveChatUser, onDeleteMessage, openAuthorCardFromEvent],
  );

  const prevChannelRef = useRef<ChatChannelId>(activeChannel);
  useEffect(() => {
    const channelChanged = prevChannelRef.current !== activeChannel;
    prevChannelRef.current = activeChannel;
    messagesEndRef.current?.scrollIntoView({ behavior: channelChanged ? 'auto' : 'smooth' });
  }, [currentMessages.length, activeChannel]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionComposer.handleKeyDown(e)) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    } else if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  const currentChannelObj =
    CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];
  const CurrentChannelIcon = currentChannelObj.icon;

  return (
    <section className="ff-chat-view relative w-full h-[100dvh] md:h-screen overflow-hidden flex flex-col pt-[calc(54px+var(--safe-top))] pb-[calc(56px+var(--safe-bottom))] md:pt-[var(--navbar-height)] md:pb-0">
      {/* Nền Học Thuật Đa Tầng: Tĩnh, thanh lịch, êm dịu thị giác */}
      <div className="ff-chat-bg absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[#090d14]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 65% 45% at 50% -10%, rgba(129, 178, 154, 0.14), transparent 60%), radial-gradient(circle at 100% 100%, rgba(224, 122, 95, 0.08), transparent 45%)',
          }}
        />
      </div>

      {/* Khung chính */}
      <div
        className="page-content-wrapper relative z-10 w-full max-w-7xl mx-auto flex-1 min-h-0 flex flex-col overflow-hidden px-2 sm:px-6 py-2 md:py-4"
      >
        {/* Thanh điều hướng rút gọn trên Mobile (< 768px) */}
        <div className="md:hidden flex items-center justify-between p-2 mb-2 rounded-2xl bg-[#0e131d]/90 backdrop-blur-md border border-[#f8f7f4]/12 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setIsChannelDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#81b29a]/18 border border-[#81b29a]/35 text-[#f8f7f4] text-xs font-semibold cursor-pointer max-w-[54%] shadow-sm"
            aria-label="Chọn chuyên kênh đàm thoại"
          >
            <Hash className="w-3.5 h-3.5 text-[#81b29a] shrink-0" />
            <span className="truncate">{currentChannelObj.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#a39f96] shrink-0" />
          </button>

          <span className="text-[11px] font-mono text-[#a39f96]">
            {currentMessages.length} tin
          </span>

          <InfoTip label="Nội quy phòng chat" align="start">
            Trao đổi văn minh, tôn trọng bạn học và thầy cô.
          </InfoTip>

          <button
            type="button"
            onClick={() => setIsMembersDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141b28] border border-[#f8f7f4]/12 text-[#dad7d0] text-xs font-mono font-semibold cursor-pointer shadow-sm"
            aria-label="Xem thành viên trực tuyến"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
            <span>{dynamicOnlineCount}</span>
            <Users className="w-3.5 h-3.5 text-[#81b29a] shrink-0" />
          </button>
        </div>

        {/* Khung Không Gian Làm Việc Hợp Nhất 3 Cột (Unified Split-Pane Academic Workspace) */}
        <div className="ff-chat-workspace flex-1 min-h-0 flex border border-[#f8f7f4]/15 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          
          {/* CỘT TRÁI: Danh mục kênh thảo luận & Hồ sơ cá nhân */}
          <aside className="hidden md:flex w-[260px] lg:w-[280px] shrink-0 ff-chat-sidebar-pane flex-col border-r border-[#f8f7f4]/10 bg-[#0c111a]/95">
            <div className="h-14 px-4 border-b border-[#f8f7f4]/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#81b29a]/25 to-[#81b29a]/10 border border-[#81b29a]/35 flex items-center justify-center shadow-sm">
                  <Hash className="w-4 h-4 text-[#81b29a]" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#f8f7f4] tracking-wide flex items-center gap-1.5">
                    <span className="ff-swash-cap text-sm">K</span>ênh đàm thoại
                  </h2>
                  <span className="text-[10px] text-[#a39f96] font-mono block">Phòng học F-Forum</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-semibold bg-[#81b29a]/15 text-[#81b29a] border border-[#81b29a]/30">
                4 kênh
              </span>
            </div>

            <div className="p-3 space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                const count = channelMessageCounts[ch.id] || 0;

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveChannel(ch.id);
                      setSearchQuery('');
                      setReplyingTo(null);
                    }}
                    className={`channel-item ff-chat-channel-btn relative w-full p-2.5 rounded-xl transition-all duration-150 flex items-center gap-3 text-left cursor-pointer group ${
                      isActive
                        ? 'active is-active bg-gradient-to-r from-[#81b29a]/22 via-[#81b29a]/12 to-transparent border border-[#81b29a]/40 shadow-sm'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[#81b29a] shadow-[0_0_8px_rgba(129,178,154,0.6)]" />
                    )}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                        isActive
                          ? 'bg-[#81b29a]/25 text-[#81b29a] border-[#81b29a]/50 shadow-[0_0_12px_rgba(129,178,154,0.25)]'
                          : 'bg-[#131924] text-[#a39f96] border-[#f8f7f4]/08 group-hover:text-[#f8f7f4] group-hover:border-[#f8f7f4]/15'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-[13px] truncate ${
                            isActive ? 'font-bold text-[#f8f7f4]' : 'font-medium text-[#dad7d0] group-hover:text-[#f8f7f4]'
                          }`}
                        >
                          {ch.name}
                        </span>
                        {count > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 transition-colors ${
                              isActive
                                ? 'bg-[#81b29a] text-[#0b0f16] shadow-sm'
                                : 'bg-[#151c28] text-[#a39f96] border border-[#f8f7f4]/10 group-hover:text-[#f8f7f4]'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-[#8e8a82] truncate block mt-0.5">
                        {ch.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Thanh thông tin tài khoản đang đăng nhập */}
            <div className="p-3 border-t border-[#f8f7f4]/10 bg-[#090d14]/90">
              {currentUser ? (
                <button
                  type="button"
                  onClick={(e) =>
                    openAuthorCardFromEvent(e, {
                      id: currentUser.id,
                      name: currentUser.name,
                      avatar: currentUser.avatar,
                      email: currentUser.email,
                      level: currentUser.level || 1,
                    })
                  }
                  className="ff-discord-userbar w-full p-2.5 rounded-2xl bg-gradient-to-r from-[#131924] to-[#101520] hover:from-[#172030] hover:to-[#131a28] border border-[#f8f7f4]/12 flex items-center gap-3 text-left transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md"
                  title="Xem trang cá nhân"
                >
                  <div className="relative z-[2] shrink-0">
                    <DecoratedAvatar
                      user={currentUser}
                      fallbackSrc={currentUser.avatar || DEFAULT_AVATAR}
                      size={36}
                      eager
                      animate
                      alt={currentUser.name}
                      className="rounded-full ring-2 ring-[#81b29a]/40"
                    />
                    <span className="absolute bottom-0 right-0 z-[4] w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#090d14] shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  </div>
                  <div className="relative z-[2] min-w-0 flex-1">
                    <div className="ff-chat-userbar-name-row flex items-center gap-1.5 min-w-0">
                    <DecoratedName
                      user={currentUser}
                      name={currentUser.name.replace(/ \(.*\)/, '')}
                      width={140}
                      height={22}
                      eager
                      animate
                      priority="high"
                      className="text-xs font-bold text-[#f8f7f4] truncate min-w-0 flex-1"
                    />
                    <ChatRoleIcon user={currentUser} size={11} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-[#81b29a] font-mono font-semibold truncate">
                        Trực tuyến · Lv.{currentUser.level || 1}
                      </span>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-[#121824] border border-[#f8f7f4]/10 flex items-center justify-between gap-2.5">
                  <div>
                    <span className="text-xs font-semibold text-[#f8f7f4] block">Khách tham quan</span>
                    <span className="text-[10.5px] text-[#a39f96]">Đăng nhập để đàm thoại</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#81b29a] to-[#6fa38b] hover:from-[#95c4ad] hover:to-[#81b29a] text-[#090d14] text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    Đăng nhập
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* CỘT GIỮA: Luồng hội thoại & khung soạn tin nhắn */}
          <div className="ff-chat-main-pane flex-1 min-h-0 flex flex-col bg-[#0f1520]">
            
            <header className="hidden md:flex h-14 px-4 sm:px-6 border-b border-[#f8f7f4]/10 bg-[#0d121c]/90 backdrop-blur-xl items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#81b29a]/25 to-[#81b29a]/10 border border-[#81b29a]/40 flex items-center justify-center shrink-0 shadow-sm">
                  <CurrentChannelIcon className="w-4 h-4 text-[#81b29a]" />
                </div>
                <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-extrabold text-sm sm:text-base text-[#f8f7f4] tracking-tight truncate flex items-center gap-1">
                    <span className="text-[#81b29a] font-mono">#</span>
                    <span>{currentChannelObj.name}</span>
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono text-[#a39f96] bg-[#141b28] border border-[#f8f7f4]/08">
                    {currentChannelObj.subtitle}
                  </span>
                  <InfoTip label="Nội quy phòng chat" align="start">
                    Trao đổi văn minh, tôn trọng bạn học và thầy cô.
                  </InfoTip>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="relative hidden sm:flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#a39f96] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={80}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tìm trong kênh..."
                    aria-label="Tìm tin nhắn trong kênh"
                    className="w-40 lg:w-52 pl-8 pr-7 py-1.5 rounded-xl bg-[#131924]/80 border border-[#f8f7f4]/12 text-xs text-[#f8f7f4] placeholder-[#8e8a82] focus:outline-none focus:border-[#81b29a]/70 focus:w-56 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="ff-icon-button ff-chat-search-clear absolute right-1.5 text-[#a39f96] hover:text-[#f8f7f4] cursor-pointer"
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsDesktopRosterVisible(v => !v)}
                  className={`hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isDesktopRosterVisible
                      ? 'bg-[#81b29a]/18 border-[#81b29a]/45 text-[#f8f7f4] shadow-sm'
                      : 'bg-[#131924] border-[#f8f7f4]/12 text-[#a39f96] hover:text-[#f8f7f4]'
                  }`}
                  title="Ẩn/hiện danh sách thành viên trực tuyến"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <PanelRight className="w-3.5 h-3.5 text-[#81b29a]" />
                  <span className="font-mono text-xs">{dynamicOnlineCount}</span>
                </button>
              </div>
            </header>

            {/* Khu vực hiển thị tin nhắn */}
            <div
              className="ff-chat-message-stream flex-1 overflow-y-auto px-3 sm:px-6 py-4 min-h-0"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Tin nhắn cuộc trò chuyện"
            >
              {!isSynced && currentMessages.length === 0 ? (
                <div className="max-w-xl mx-auto space-y-3 py-6" aria-busy="true">
                  <ThinkingBubble phase="Đang kết nối máy chủ F-Forum…" />
                  <ThinkingBubble phase="Đang tải tin nhắn kênh này…" />
                  <ThinkingBubble phase="Đang sắp xếp hội thoại…" />
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#81b29a]/20 to-[#81b29a]/05 border border-[#81b29a]/35 flex items-center justify-center shadow-md">
                    <MessageSquareDashed className="w-7 h-7 text-[#81b29a]" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-[#f8f7f4]">
                      {searchQuery ? (
                        'Không có kết quả tìm kiếm'
                      ) : (
                        <span>
                          <span className="ff-swash-cap text-base mr-0.5">G</span>óc học chung luôn rộng mở
                        </span>
                      )}
                    </h3>
                    {!searchQuery && (
                      <p className="text-xs text-[#a39f96] leading-relaxed">
                        Hãy gửi một lời chào hoặc mở đầu câu hỏi để cùng bạn bè trao đổi bài học nhé!
                      </p>
                    )}
                  </div>

                  {!searchQuery && currentUser && (
                    <div className="w-full space-y-2 pt-2">
                      <div className="flex flex-col gap-2">
                        {currentChannelObj.prompts.map((promptText, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              setInputText(promptText);
                              inputRef.current?.focus();
                            }}
                            className="px-3.5 py-2.5 rounded-xl bg-[#141b28] hover:bg-[#182232] border border-[#f8f7f4]/10 hover:border-[#81b29a]/40 text-xs text-[#dad7d0] hover:text-[#f8f7f4] text-left transition-all duration-150 cursor-pointer shadow-sm hover:shadow"
                          >
                            “{promptText}”
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {renderedMessageItems}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Khung nhập tin nhắn ở đáy */}
            <div className="ff-chat-composer-area px-3 sm:px-6 py-3.5 bg-gradient-to-t from-[#090d14] via-[#0c111a] to-transparent border-t border-[#f8f7f4]/10 shrink-0">
              {replyingTo && (
                <div className="ff-chat-reply-preview mb-2.5 px-3.5 py-2 rounded-xl bg-[#141b28]/95 backdrop-blur-md border border-[#81b29a]/40 shadow-sm flex items-center justify-between gap-2.5 text-xs">
                  <div className="ff-chat-reply-preview__copy flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-[#81b29a]/20 flex items-center justify-center shrink-0">
                      <CornerUpLeft className="w-3.5 h-3.5 text-[#81b29a]" />
                    </div>
                    <span className="ff-chat-reply-preview__label text-[#a39f96] shrink-0 font-medium">Đang trả lời</span>
                    <strong className="ff-chat-reply-preview__author text-[#f8f7f4] shrink-0 font-bold">@{replyingTo.authorName}</strong>
                    <span className="ff-chat-reply-preview__excerpt text-[#a39f96] truncate">“{replyingTo.excerpt}”</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="ff-icon-button ff-chat-reply-preview__close rounded-lg text-[#a39f96] hover:text-[#f8f7f4] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    aria-label="Hủy trả lời"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {!currentUser ? (
                <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#141b28] to-[#101622] border border-[#f8f7f4]/15 shadow-sm flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-[13px] text-[#dad7d0] font-medium">
                    Đăng nhập để tham gia thảo luận trong #{currentChannelObj.name}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenLoginModal}
                    className="ff-tactile-btn px-5 py-2 rounded-xl bg-gradient-to-r from-[#f4f1de] to-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold text-xs transition-all shadow-sm hover:shadow cursor-pointer shrink-0"
                  >
                    Đăng nhập
                  </button>
                </div>
              ) : (
                <div className="ff-chat-composer-wrap">
                  <div className="ff-chat-composer-input-row">
                  <ChatMentionPicker
                    id="ff-chat-mention-options-view"
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
                        event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`;
                      }}
                      onSelect={mentionComposer.handleCaretChange}
                      onKeyDown={handleKeyDown}
                      placeholder={`Nhắn tin vào #${currentChannelObj.name}...`}
                      aria-label={`Tin nhắn trong kênh ${currentChannelObj.name}`}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={mentionComposer.isOpen}
                      aria-controls={mentionComposer.isOpen ? 'ff-chat-mention-options-view' : undefined}
                      aria-activedescendant={mentionComposer.isOpen ? `ff-chat-mention-options-view-option-${mentionComposer.activeIndex}` : undefined}
                      className="ff-chat-message-input message-input-bar flex-1 bg-transparent border-none text-xs sm:text-sm text-[#f8f7f4] placeholder-[#8e8a82] focus:outline-none"
                    />

                    <div className="ff-chat-composer-meta">
                      <span className="ff-chat-character-count">{inputText.length}/300</span>
                      <span className="ff-chat-send-status" role="status" aria-live="polite">{sendStatus}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={!inputText.trim() || isSending}
                      aria-busy={isSending}
                      aria-label="Gửi tin nhắn"
                      className={`ff-tactile-btn ff-chat-send-button px-4 py-2 rounded-xl bg-gradient-to-r from-[#f4f1de] to-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold text-xs sm:text-sm transition-all shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        cooldown.isCooling ? 'is-cooling' : ''
                      }`}
                      title={cooldown.isCooling ? 'Đã gửi gần đây · chờ một nhịp ngắn' : 'Gửi tin nhắn'}
                    >
                      {isSending ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#e07a5f]" />}
                      <span className="hidden sm:inline">Gửi</span>
                    </button>
                  </div>
                  </div>
                  <div className="ff-chat-composer-hint flex items-center justify-between text-[11px] text-[#8e8a82] mt-1.5 px-1 font-mono">
                    <span><b>@</b> để nhắc thành viên</span>
                    <span>Enter gửi · Shift + Enter xuống dòng</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Danh bạ thành viên trực tuyến */}
          {isDesktopRosterVisible && (
            <aside className="hidden lg:flex w-[250px] xl:w-[270px] shrink-0 ff-chat-roster-pane flex-col border-l border-[#f8f7f4]/10 bg-[#0c111a]/95">
              <div className="h-14 px-4 border-b border-[#f8f7f4]/10 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-[#f8f7f4] tracking-wide flex items-center gap-1.5">
                  <span className="ff-swash-cap text-sm">T</span>hành viên
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#81b29a]/15 border border-[#81b29a]/35 text-[10.5px] font-mono font-semibold text-[#81b29a]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  {dynamicOnlineCount} trực tuyến
                </span>
              </div>

              <div className="p-3 space-y-4 flex-1 overflow-y-auto no-scrollbar">
                {/* Ban Quản Trị */}
                <div className="space-y-1.5">
                  <div className="px-1.5 text-[10px] font-mono uppercase tracking-wider text-[#e9c46a] font-semibold flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-[#e9c46a]" />
                    <span>Ban Quản Trị</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) =>
                      openAuthorCardFromEvent(e, {
                        id: 'admin-master',
                        name: MASTER_ADMIN_CONFIG.name,
                        avatar: MASTER_ADMIN_CONFIG.avatar,
                        email: MASTER_ADMIN_CONFIG.email,
                        level: 150,
                        coin: 99999,
                      })
                    }
                    className="w-full text-left p-2.5 rounded-2xl bg-gradient-to-br from-[#182130] to-[#131a28] hover:from-[#1d293d] hover:to-[#172032] border border-[#e9c46a]/35 transition-all duration-150 cursor-pointer flex items-center gap-3 shadow-sm hover:shadow-md"
                    title={`Xem hồ sơ ${MASTER_ADMIN_CONFIG.name}`}
                  >
                    <div className="relative shrink-0">
                      <DecoratedAvatar
                        user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                        fallbackSrc={MASTER_ADMIN_CONFIG.avatar}
                        size={38}
                        animate
                        alt={MASTER_ADMIN_CONFIG.name}
                        className="rounded-full ring-2 ring-[#e9c46a]/80 shadow-[0_0_12px_rgba(233,196,106,0.3)]"
                      />
                      <span
                        className={`absolute bottom-0 right-0 z-[4] w-2.5 h-2.5 rounded-full border-2 border-[#141a26] shadow-sm ${
                          isMasterAdminOnline ? 'bg-emerald-400' : 'bg-[#81b29a]'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <DecoratedName
                          user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                          name={MASTER_ADMIN_CONFIG.name}
                          width={132}
                          height={22}
                          animate
                          className="text-xs font-bold text-[#f8f7f4] truncate"
                        />
                        <ChatRoleIcon user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')} isSuperAdmin={true} size={12} />
                      </div>
                      <span className="text-[10px] text-[#e9c46a] font-mono block truncate mt-0.5">Trực tuyến · Lv.150</span>
                    </div>
                  </button>
                </div>

                {/* Học Sinh & Hội Viên */}
                <div className="space-y-1.5">
                  <div className="px-1.5 text-[10px] font-mono uppercase tracking-wider text-[#a39f96] font-semibold flex items-center justify-between">
                    <span>Học Sinh &amp; Hội Viên</span>
                    <span>{activeStudents.length}</span>
                  </div>

                  {activeStudents.length === 0 ? (
                    <div className="py-4 px-2 text-center text-xs text-[#a39f96]">
                      Chưa có hội viên khác trực tuyến
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activeStudents.map(user => {
                        const tier = getTierForLevel(user.level || 1);
                        const resolvedStudent = resolveChatUser(user.email, user.id);
                        const cleanName = user.name.replace(/ \(.*\)/, '');
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={(e) =>
                              openAuthorCardFromEvent(e, {
                                id: user.id,
                                name: user.name,
                                avatar: user.avatar,
                                email: user.email,
                                level: user.level || 1,
                              })
                            }
                            className="w-full p-2.5 rounded-xl hover:bg-white/[0.04] transition-all duration-150 flex items-center gap-3 text-left cursor-pointer group"
                          >
                            <div className="relative shrink-0">
                              <DecoratedAvatar
                                user={resolvedStudent}
                                fallbackSrc={user.avatar || DEFAULT_AVATAR}
                                size={34}
                                animate
                                alt={cleanName}
                                className="rounded-full ring-1 ring-[#f8f7f4]/15 group-hover:ring-[#81b29a]/40 transition-colors"
                              />
                              <span className="absolute bottom-0 right-0 z-[4] w-2 h-2 rounded-full bg-emerald-400 border border-[#0b0f17] shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <DecoratedName
                                  user={resolvedStudent}
                                  name={cleanName}
                                  width={128}
                                  height={22}
                                  animate
                                  className="text-xs font-semibold text-[#f8f7f4] group-hover:text-[#81b29a] transition-colors truncate block"
                                />
                                <ChatRoleIcon user={resolvedStudent} />
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#a39f96] font-mono mt-0.5">
                                <span className="text-[#dad7d0] truncate">{tier.name}</span>
                                <span>· Lv.{user.level || 1}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Ngăn kéo chọn Kênh trên Mobile (< 768px) */}
      {isChannelDrawerOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Đóng danh sách kênh"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden border-none outline-none cursor-default"
            onClick={() => setIsChannelDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kênh đàm thoại"
            className="fixed top-0 bottom-0 left-0 z-50 w-[290px] max-w-[85vw] bg-[#0e131d] border-r border-[#f8f7f4]/15 p-4 flex flex-col shadow-2xl animate-fade-up md:hidden overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#f8f7f4]/10">
              <span className="text-xs font-bold text-[#f8f7f4] uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-[#81b29a]" />
                Chọn Kênh Thảo Luận
              </span>
              <button
                type="button"
                onClick={() => setIsChannelDrawerOpen(false)}
                className="ff-icon-button ff-chat-close-button p-1.5 rounded-lg bg-[#151b28] border border-[#f8f7f4]/12 text-[#dad7d0] hover:text-[#f8f7f4] cursor-pointer"
                aria-label="Đóng bảng chọn kênh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                const count = channelMessageCounts[ch.id] || 0;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveChannel(ch.id);
                      setIsChannelDrawerOpen(false);
                    }}
                    className={`ff-chat-channel-btn cursor-pointer ${isActive ? 'is-active' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isActive
                          ? 'bg-[#81b29a]/20 text-[#81b29a] border-[#81b29a]/40'
                          : 'bg-[#141a26] text-[#a39f96] border-[#f8f7f4]/08'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-[#f8f7f4] truncate">{ch.name}</span>
                        {count > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-[#141a26] text-[10px] font-mono text-[#a39f96]">
                            {count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Ngăn kéo Thành viên trên Mobile (< 768px) */}
      {isMembersDrawerOpen && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Đóng danh sách thành viên"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden border-none outline-none cursor-default"
            onClick={() => setIsMembersDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Thành viên trực tuyến"
            className="fixed top-0 bottom-0 right-0 z-50 w-[290px] max-w-[85vw] bg-[#0e131d] border-l border-[#f8f7f4]/15 p-4 flex flex-col shadow-2xl animate-fade-up md:hidden overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f8f7f4]/10">
              <span className="text-xs font-bold text-[#f8f7f4] uppercase tracking-wider">
                Thành Viên ({dynamicOnlineCount})
              </span>
              <button
                type="button"
                onClick={() => setIsMembersDrawerOpen(false)}
                className="ff-icon-button ff-chat-close-button p-1.5 rounded-lg bg-[#151b28] border border-[#f8f7f4]/12 text-[#dad7d0] hover:text-[#f8f7f4] cursor-pointer"
                aria-label="Đóng bảng thành viên"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#e9c46a] font-semibold px-1">
                Ban Quản Trị
              </div>
              <button
                type="button"
                onClick={(e) => {
                  setIsMembersDrawerOpen(false);
                  openAuthorCardFromEvent(e, {
                    id: 'admin-master',
                    name: MASTER_ADMIN_CONFIG.name,
                    avatar: MASTER_ADMIN_CONFIG.avatar,
                    email: MASTER_ADMIN_CONFIG.email,
                    level: 150,
                    coin: 99999,
                  });
                }}
                className="w-full text-left p-2.5 rounded-xl bg-[#141a26] border border-[#e9c46a]/30 flex items-center gap-2.5 cursor-pointer"
              >
                <DecoratedAvatar
                  user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                  fallbackSrc={MASTER_ADMIN_CONFIG.avatar}
                  size={36}
                  animate
                  alt={MASTER_ADMIN_CONFIG.name}
                  className="rounded-full ring-1 ring-[#e9c46a]/60"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <DecoratedName
                      user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                      name={MASTER_ADMIN_CONFIG.name}
                      width={132}
                      height={22}
                      animate
                      className="text-xs font-bold text-[#f8f7f4] truncate"
                    />
                    <ChatRoleIcon user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')} isSuperAdmin={true} size={12} />
                  </div>
                  <span className="text-[10px] text-[#a39f96] font-mono block truncate">Trực tuyến · Lv.150</span>
                </div>
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#a39f96] font-semibold px-1 flex items-center justify-between">
                <span>Học Sinh &amp; Hội Viên</span>
                <span>{activeStudents.length}</span>
              </div>
              {activeStudents.length === 0 ? (
                <div className="py-3 px-2 text-center text-xs text-[#a39f96]">
                  Chưa có hội viên khác trực tuyến
                </div>
              ) : (
                activeStudents.map((user) => {
                  const tier = getTierForLevel(user.level || 1);
                  const resolvedStudent = resolveChatUser(user.email, user.id);
                  const cleanName = user.name.replace(/ \(.*\)/, '');
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={(e) => {
                        setIsMembersDrawerOpen(false);
                        openAuthorCardFromEvent(e, {
                          id: user.id,
                          name: user.name,
                          avatar: user.avatar,
                          email: user.email,
                          level: user.level || 1,
                        });
                      }}
                      className="p-2 rounded-lg hover:bg-[#f8f7f4]/[0.04] flex items-center gap-2.5 w-full text-left cursor-pointer"
                    >
                      <DecoratedAvatar
                        user={resolvedStudent}
                        fallbackSrc={user.avatar || DEFAULT_AVATAR}
                        size={32}
                        animate
                        alt={cleanName}
                        className="rounded-full ring-1 ring-[#f8f7f4]/15"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <DecoratedName
                            user={resolvedStudent}
                            name={cleanName}
                            width={128}
                            height={22}
                            animate
                            className="text-xs font-medium text-[#f8f7f4] truncate block"
                          />
                          <ChatRoleIcon user={resolvedStudent} />
                        </div>
                        <div className="text-[10px] text-[#a39f96] font-mono">
                          {tier.name} · Lv.{user.level || 1}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Thẻ thông tin nhanh người dùng (Popover) */}
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
                  ? Math.max(12, Math.min(authorAnchorPos.x + 12, window.innerWidth - 332))
                  : 24,
              top:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.y - 20, window.innerHeight - 245))
                  : 120,
            }}
            className="pc-12-shell w-[310px] max-w-[calc(100vw-24px)] rounded-2xl p-4 shadow-2xl popover-morph-enter"
          >
            <button
              type="button"
              onClick={() => setActiveAuthorCard(null)}
              className="ff-icon-button ff-chat-close-button absolute top-2.5 right-2.5 z-[5] rounded-full text-[#a39f96] hover:text-[#f8f7f4] cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="ff-discord-userbar flex items-center gap-3 p-3 rounded-xl bg-[#141a26] border border-[#f8f7f4]/12 pr-6">
              <div className="relative z-[2] shrink-0">
                <DecoratedAvatar
                  user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                  fallbackSrc={activeAuthorCard.avatar || DEFAULT_AVATAR}
                  size={42}
                  eager
                  animate
                  alt={activeAuthorCard.name}
                  className="rounded-full ring-1 ring-[#e9c46a]/50"
                />
                <span className="absolute -bottom-1 -right-1 z-[4]">
                  <TierBadge level={activeAuthorCard.level} size={15} showTooltip={false} />
                </span>
              </div>

              <div className="relative z-[2] min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <DecoratedName
                    user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                    name={activeAuthorCard.name.replace(/ \(.*\)/, '')}
                    width={160}
                    height={22}
                    eager
                    animate
                    priority="high"
                    className="text-sm font-bold text-[#f8f7f4] truncate"
                  />
                  <ChatRoleIcon user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)} isSuperAdmin={isMasterAdmin(activeAuthorCard.email)} size={12} />
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
                className="ff-icon-button ff-chat-close-button p-1.5 rounded-lg bg-[#141a26] border border-[#f8f7f4]/12 text-[#dad7d0] hover:text-[#f8f7f4] cursor-pointer"
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
                  <label htmlFor="chi-tiet-vi-pham" className="block text-xs font-semibold text-[#dad7d0] mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea
                    id="chi-tiet-vi-pham"
                    maxLength={500}
                    rows={3}
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    placeholder="Mô tả cụ thể hành vi hoặc bằng chứng vi phạm..."
                    className="w-full bg-[#141a26] border border-[#f8f7f4]/15 rounded-xl px-3 py-2 text-xs text-[#f8f7f4] focus:outline-none focus:border-[#d97757] resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/20 text-[10px] text-rose-300 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-rose-400" />
                    Kỷ luật học đường:
                  </span>
                  <p>
                    Báo cáo vi phạm sẽ được chuyển tới Ban Quản Trị để xử lý theo nội quy.
                  </p>
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
    </section>
  );
};

export default ChatView;
