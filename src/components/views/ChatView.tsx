/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  Hash,
  Users,
  HelpCircle,
  Heart,
  Shield,
  Trash2,
  MessageSquareDashed,
  X,
  ChevronDown,
  Flag,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import type { ChatChannelId, ChatMessage, User, OnlinePresenceUser } from '../../types';
import { TierBadge, AdminVerifiedBadge } from '../Badges10Tier';
import { DEFAULT_AVATAR } from '../../utils/mediaFallback';
import { useChatCooldown } from '../../utils/chatCooldown';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../../config/admin';
import { capsHas, useAdminCaps } from '../../utils/adminCapabilities';
import { InfoTip } from '../ui/InfoTip';
import { getTierForLevel } from '../../utils/tier';
import { pushNotification } from '../../utils/notifications';
import { ChatCooldownBar } from '../ChatCooldownBar';
import { ThinkingBubble } from '../ViewTransitionLoader';
import { postJson } from '../../utils/session';
import { describeReportResult, settleReportRequest } from '../../utils/reports';
import { DecoratedAvatar, DecoratedName, UserNameplateBg } from '../decorations/DecoratedAvatar';

interface ChatViewProps {
  currentUser: User | null;
  users?: Record<string, User>;
  messages: ChatMessage[];
  onSendMessage: (channelId: ChatChannelId, content: string) => void;
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
  desc: string;
  topic: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'hallway',
    name: 'Kết bạn bốn phương',
    desc: 'Làm quen và kết nối bạn học toàn trường',
    topic: 'Làm quen, kết nối và giao lưu cùng bạn học toàn trường',
    icon: Users,
  },
  {
    id: 'quick-qa',
    name: 'Hỏi bài nhanh',
    desc: 'Hỏi đáp khẩn cấp, giải bài trong 5 phút',
    topic: 'Cứu cánh bài tập gấp, gỡ lỗi code và công thức toán lý',
    icon: HelpCircle,
  },
  {
    id: 'confessions',
    name: 'Góc tâm sự',
    desc: 'Áp lực học tập & suy tư tuổi học trò',
    topic: 'Không gian lắng nghe, chia sẻ áp lực thi cử và chuyện trường lớp',
    icon: Heart,
  },
  {
    id: 'club-hub',
    name: 'Hội quán CLB',
    desc: 'Giao lưu điều phối giữa các Ban Chủ nhiệm',
    topic: 'Phối hợp sự kiện liên CLB, mượn hội trường và tài trợ dự án',
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
  const [inputText, setInputText] = useState('');
  const cooldown = useChatCooldown();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      /* EPIC 5: máy chủ bắt buộc đăng nhập và tự lấy danh tính người tố cáo từ phiên. */
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

  const currentMessages = useMemo(
    () => messages.filter(m => m.channelId === activeChannel),
    [messages, activeChannel],
  );

  const renderedMessageItems = useMemo(
    () =>
      currentMessages.map(msg => {
        const isMe = currentUser ? msg.authorId === currentUser.id : false;
        const isSuperAdminMsg = isMasterAdmin(msg.authorEmail);
        const isSuperAdmin = currentUser ? isMasterAdmin(currentUser.email) : false;
        const authorDisplayName = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.name : msg.authorName;
        const authorDisplayAvatar = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.avatar : msg.authorAvatar;
        const resolvedMsgUser = resolveChatUser(
          isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
          msg.authorId,
        );

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 group/msg ${
              isMe ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar & Rank badge */}
            <button
              type="button"
              onClick={(e) => {
                setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                if (isMe && currentUser) {
                  setActiveAuthorCard({
                    id: currentUser.id,
                    name: currentUser.name,
                    avatar: currentUser.avatar,
                    email: currentUser.email,
                    level: currentUser.level || 1,
                  });
                } else {
                  setActiveAuthorCard({
                    id: msg.authorId,
                    name: authorDisplayName,
                    avatar: authorDisplayAvatar,
                    email: isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
                    level: isSuperAdminMsg ? 150 : (msg.authorLevel || 1),
                  });
                }
              }}
              className="relative shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105"
              title={`Xem thông tin ${authorDisplayName}`}
            >
              <DecoratedAvatar
                user={resolvedMsgUser}
                fallbackSrc={authorDisplayAvatar}
                size={36}
                animate
                alt={authorDisplayName}
                className={`rounded-full shadow-md ${
                  isSuperAdminMsg
                    ? 'ring-2 ring-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'ring-1 ring-white/25'
                }`}
              />
              <span className="absolute -bottom-1 -right-1 z-[4]">
                <TierBadge
                  level={isSuperAdminMsg ? 150 : msg.authorLevel}
                  size={15}
                  showTooltip={false}
                />
              </span>
            </button>

            {/* Message Content */}
            <div
              className={`max-w-[82%] sm:max-w-[76%] flex flex-col ${
                isMe ? 'items-end' : 'items-start'
              }`}
            >
              <div className={`flex items-center gap-1.5 mb-1.5 text-[11px] text-neutral-400 flex-wrap ${isMe ? 'justify-end flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={(e) => {
                    setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                    if (isMe && currentUser) {
                      setActiveAuthorCard({
                        id: currentUser.id,
                        name: currentUser.name,
                        avatar: currentUser.avatar,
                        email: currentUser.email,
                        level: currentUser.level || 1,
                      });
                    } else {
                      setActiveAuthorCard({
                        id: msg.authorId,
                        name: authorDisplayName,
                        avatar: authorDisplayAvatar,
                        email: isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
                        level: isSuperAdminMsg ? 150 : (msg.authorLevel || 1),
                      });
                    }
                  }}
                  className="inline-flex items-center cursor-pointer hover:opacity-95 transition-opacity"
                >
                  <DecoratedName
                    user={resolvedMsgUser}
                    name={authorDisplayName.replace(/ \(.*\)/, '')}
                    width={142}
                    height={27}
                    animate
                    showFallbackTag
                  />
                </button>
                {isSuperAdminMsg && <AdminVerifiedBadge size={12} />}
                <span className="text-[10px] text-neutral-500 font-mono">
                  • {msg.timestamp}
                </span>

                {/* Thu hồi tin nhắn (Super Admin / quyền edit_content) */}
                {(isSuperAdmin || canRecallMessages) && (
                  <button
                    type="button"
                    onClick={() => onDeleteMessage?.(msg.id)}
                    className="opacity-0 group-hover/msg:opacity-100 transition-opacity ml-1.5 px-1.5 py-0.5 text-red-400 hover:text-red-300 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 cursor-pointer inline-flex items-center gap-1"
                    title="Thu hồi tin nhắn vi phạm"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span className="text-[9px]">Thu hồi tin nhắn</span>
                  </button>
                )}
              </div>

              <div
                className={`w-fit px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-md ${
                  isMe
                    ? 'ff-chat-bubble-me'
                    : isSuperAdminMsg
                    ? 'ff-chat-bubble-peer ff-chat-bubble-admin'
                    : 'ff-chat-bubble-peer'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        );
      }),
    [currentMessages, currentUser, canRecallMessages, resolveChatUser, onDeleteMessage],
  );

  const prevChannelRef = useRef<ChatChannelId>(activeChannel);
  useEffect(() => {
    const channelChanged = prevChannelRef.current !== activeChannel;
    prevChannelRef.current = activeChannel;
    messagesEndRef.current?.scrollIntoView({ behavior: channelChanged ? 'auto' : 'smooth' });
  }, [currentMessages.length, activeChannel]);

  const handleSend = () => {
    if (!currentUser) return;
    /* Đang trong nhịp chờ → rung nhẹ thanh nhịp thay vì im lặng bỏ qua */
    if (cooldown.isCooling) {
      cooldown.nudge();
      return;
    }
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(activeChannel, text);
    setInputText('');
    cooldown.startCooldown();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentChannelObj =
    CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

  return (
    <section className="relative w-full h-[100dvh] md:h-screen overflow-hidden flex flex-col pt-[calc(54px+var(--safe-top))] pb-[calc(56px+var(--safe-bottom))] md:pt-[var(--navbar-height)] md:pb-0">
      {/* Nền phong cách Warm Editorial Obsidian: Tối ưu triệt để dung lượng và GPU */}
      <div className="ff-chat-bg ff-raw-grid-surface absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0d12] via-[#10141d] to-[#090b10]" />
        <div className="absolute top-[-20%] left-[15%] w-[600px] h-[600px] rounded-full bg-[#e07a5f]/[0.045] blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[10%] w-[650px] h-[650px] rounded-full bg-[#81b29a]/[0.04] blur-[150px]" />
      </div>

      {/* Sub-Layout Content Wrapper */}
      <div
        className="page-content-wrapper relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col overflow-hidden px-2 sm:px-6 py-2 md:py-4"
        style={{ height: 'calc(100vh - var(--navbar-height))' }}
      >
        {/* Mobile Subheader Bar with 2 Slide-in Drawer Buttons (< 768px) */}
        <div className="md:hidden flex items-center justify-between p-2.5 mb-2 rounded-xl bg-[#151a26]/95 border-[1.5px] border-[#f4f1de]/15 shadow-[3px_3px_0px_rgba(4,6,11,0.9)] shrink-0">
          <button
            type="button"
            onClick={() => setIsChannelDrawerOpen(true)}
            className="ff-tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e07a5f]/20 border-[1.5px] border-[#e07a5f]/45 text-[#f4f1de] text-xs font-bold cursor-pointer max-w-[48%]"
            aria-label="Chọn chuyên kênh đàm thoại"
          >
            <Hash className="w-3.5 h-3.5 text-[#f2cc8f] shrink-0" />
            <span className="truncate">{currentChannelObj.name}</span>
            <ChevronDown className="w-3 h-3 text-[#d8d5ce] shrink-0" />
          </button>

          <span className="ff-brutal-index">
            {currentMessages.length} tin
          </span>

          <button
            type="button"
            onClick={() => setIsMembersDrawerOpen(true)}
            className="ff-tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#81b29a]/18 border-[1.5px] border-[#81b29a]/45 text-[#d8f3dc] text-xs font-mono font-bold cursor-pointer"
            aria-label="Xem thành viên trực tuyến"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#81b29a] shrink-0" />
            <span>{dynamicOnlineCount} Online</span>
            <Users className="w-3.5 h-3.5 text-[#81b29a] shrink-0" />
          </button>
        </div>

        {/* 3-Column Glassmorphic Depth-Layered Chat Layout (Style 4 + Style 6 + Style 7 + Style 8) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden min-h-0">
          
          {/* Left Column: 4 Channels Selector + Current User Card (md:col-span-3) */}
          <div className="hidden md:flex md:col-span-3 flex-col ff-chat-glass-sidebar p-3.5 overflow-hidden space-y-3">
            <div className="px-1.5 pb-2.5 border-b border-dashed border-[#f4f1de]/14 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#f4f1de] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Hash className="w-3.5 h-3.5 text-[#e07a5f]" />
                  PHÒNG CHAT
                </span>
                <span className="ff-brutal-index">4 KÊNH</span>
              </div>
              <svg className="w-20 h-1.5 mt-1 ff-organic-squiggle" viewBox="0 0 100 8" aria-hidden="true">
                <path d="M2 5 C22 1, 44 8, 66 4 S86 1, 98 5" />
              </svg>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar pr-0.5">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                const count = channelMessageCounts[ch.id] || 0;

                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`channel-item w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer border-[1.5px] ${
                      isActive
                        ? 'active bg-[#e07a5f]/20 border-[#e07a5f]/60 shadow-[3px_3px_0px_rgba(4,6,11,0.92)] translate-x-[-1px] translate-y-[-1px]'
                        : 'bg-[#0b0d12]/45 hover:bg-[#f4f1de]/[0.05] border-[#f4f1de]/10 text-[#b5b2a9] hover:text-[#f4f1de]'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 border ${
                        isActive
                          ? 'bg-[#e07a5f] text-[#0b0d12] border-[#f4f1de]/60'
                          : 'bg-[#f4f1de]/[0.05] text-[#9a978e] border-[#f4f1de]/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-xs font-extrabold truncate ${
                            isActive ? 'text-[#f4f1de]' : 'text-[#d8d5ce]'
                          }`}
                        >
                          {ch.name}
                        </span>
                        {count > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-[#0b0d12]/80 border border-[#f4f1de]/15 text-[10px] font-mono font-bold text-[#f2cc8f] shrink-0">
                            {count}
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-[#9a978e] line-clamp-1 mt-0.5 leading-snug">
                        {ch.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Current User / Guest Mini Dock */}
            {currentUser ? (
              <button
                type="button"
                onClick={(e) => {
                  setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                  setActiveAuthorCard({
                    id: currentUser.id,
                    name: currentUser.name,
                    avatar: currentUser.avatar,
                    email: currentUser.email,
                    level: currentUser.level || 1,
                  });
                }}
                className="ff-discord-userbar mt-2 p-2.5 rounded-xl bg-[#0b0d12]/85 hover:bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 hover:border-[#f2cc8f]/50 flex items-center gap-2.5 shrink-0 w-full text-left transition-colors cursor-pointer shadow-[2px_2px_0px_rgba(4,6,11,0.9)]"
                title="Xem trang cá nhân"
              >
                <UserNameplateBg
                  user={currentUser}
                  width={230}
                  eager
                  animate
                  priority="high"
                />
                <div className="relative z-[2] shrink-0">
                  <DecoratedAvatar
                    user={currentUser}
                    fallbackSrc={currentUser.avatar || DEFAULT_AVATAR}
                    size={36}
                    eager
                    animate
                    alt={currentUser.name}
                    className="rounded-full ring-1 ring-[#f4f1de]/25"
                  />
                  <span className="absolute bottom-0 right-0 z-[4] w-2.5 h-2.5 rounded-full bg-[#81b29a] border border-[#0b0d12]" />
                </div>
                <div className="relative z-[2] min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <DecoratedName
                      user={currentUser}
                      name={currentUser.name.replace(/ \(.*\)/, '')}
                      width={148}
                      height={28}
                      eager
                      animate
                      priority="high"
                      showFallbackTag
                    />
                  </div>
                  <div className="text-[10px] text-[#81b29a] font-mono truncate mt-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">Trực tuyến • Lv.{currentUser.level || 1}</div>
                </div>
              </button>
            ) : (
              <div className="pt-2.5 border-t border-dashed border-[#f4f1de]/15 flex items-center justify-between gap-2 px-1 shrink-0">
                <span className="text-[11px] text-[#9a978e] truncate">Chế độ Khách</span>
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="ff-tactile-btn px-3 py-1 rounded-lg bg-[#e07a5f] text-[#0b0d12] border border-[#f4f1de] text-[11px] font-bold cursor-pointer"
                >
                  Đăng nhập
                </button>
              </div>
            )}
          </div>

          {/* Center Column: Active Channel Messages & Input (md:col-span-9 lg:col-span-6) */}
          <div className="col-span-1 md:col-span-9 lg:col-span-6 flex flex-col ff-chat-glass-stage overflow-hidden min-h-0">
            
            {/* Style 7: Raw Monospace Telemetry Strip */}
            <div className="ff-chat-telemetry-bar shrink-0">
              <span>CHANNEL // #{currentChannelObj.id.toUpperCase()}</span>
              <span className="text-[#81b29a] font-bold">● SYNC: LIVE</span>
              <span className="hidden sm:inline">NODES: {dynamicOnlineCount} ONLINE</span>
            </div>

            {/* Chat Room Subheader — Editorial Channel Header */}
            <div className="px-4 py-3 bg-[#0b0d12]/65 border-b border-dashed border-[#f4f1de]/14 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e07a5f] shadow-[0_0_8px_rgba(224,122,95,0.8)] shrink-0" />
                  <span className="ff-typo-thread-title font-extrabold text-sm sm:text-base text-[#f4f1de] truncate">
                    #{currentChannelObj.name}
                  </span>
                  <InfoTip label="Nội quy phòng chat" align="start">
                    Tôn trọng nhau — các hành vi toxic, khiêu khích hoặc gây war sẽ bị khoá tài khoản.
                  </InfoTip>
                </div>
                <p className="text-[11px] text-[#9a978e] truncate mt-0.5">
                  {currentChannelObj.topic}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="ff-brutal-index">
                  {currentMessages.length} tin
                </span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" role="log" aria-live="polite" aria-relevant="additions" aria-label="Tin nhắn cuộc trò chuyện">
              {!isSynced && currentMessages.length === 0 ? (
                <div className="max-w-xl mx-auto space-y-3" aria-busy="true">
                  <ThinkingBubble phase="Đang kết nối máy chủ F-Forum…" />
                  <ThinkingBubble phase="Đang tải tin nhắn kênh này…" />
                  <ThinkingBubble phase="Đang sắp xếp hội thoại…" />
                </div>
              ) : currentMessages.length === 0 ? (
                /* Style 10: Organic Hand-Drawn Illustration Empty State */
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-[#b5b2a9] my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-[#e07a5f]/12 border-[1.5px] border-[#e07a5f]/40 flex items-center justify-center shadow-[3px_3px_0px_rgba(4,6,11,0.9)]">
                    <MessageSquareDashed className="w-7 h-7 text-[#f2cc8f]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#f4f1de] tracking-wide">
                    Chưa có tin nhắn nào trong #{currentChannelObj.name}
                  </h3>
                  <p className="text-xs text-[#9a978e] max-w-xs">
                    Gửi lời chào mở đầu để bắt chuyện cùng mọi người nhé.
                  </p>
                </div>
              ) : (
                renderedMessageItems
              )}
              <div ref={messagesEndRef} />
            </div>

            <ChatCooldownBar
              isCooling={cooldown.isCooling}
              remainingMs={cooldown.remainingMs}
              nudgeKey={cooldown.nudgeKey}
              variant="view"
            />

            {/* Floating Glass Composer Dock or Login Prompt */}
            {!currentUser ? (
              <div className="ff-chat-floating-composer flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-[#d8d5ce]">Đăng nhập để trò chuyện cùng mọi người</span>
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="ff-tactile-btn px-4 py-2 rounded-lg bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] font-extrabold text-xs border-[1.5px] border-[#f4f1de] transition-colors cursor-pointer shrink-0"
                >
                  Đăng nhập
                </button>
              </div>
            ) : (
              <div className="ff-chat-floating-composer flex items-center gap-2.5 shrink-0">
                <input
                  type="text"
                  value={inputText}
                  maxLength={300}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Nhắn tin vào #${currentChannelObj.name}...`}
                  className="message-input-bar flex-1 bg-[#151a26] border-[1.5px] border-[#f4f1de]/18 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f] transition-colors disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                />

                {cooldown.isCooling && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-[#f2cc8f]/15 border border-[#f2cc8f]/35 text-[11px] font-mono text-[#f2cc8f] shrink-0">
                    Chờ {cooldown.secondsLeft}s
                  </span>
                )}

                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className={`ff-tactile-btn relative p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] font-extrabold text-xs sm:text-sm border-[1.5px] border-[#f4f1de] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer ${
                    cooldown.isCooling ? 'ff-cd-btn is-cooling' : ''
                  }`}
                  title={cooldown.isCooling ? `Còn ${cooldown.secondsLeft}s trước tin tiếp theo` : 'Gửi tin nhắn'}
                >
                  <Send className="w-4 h-4 text-[#0b0d12]" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Active Members Roster (hidden on mobile, lg:col-span-3) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col ff-chat-glass-sidebar p-3.5 overflow-y-auto space-y-4">
            <div className="px-1.5 pb-2.5 border-b border-dashed border-[#f4f1de]/14 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#f4f1de] uppercase tracking-wider font-mono">
                THÀNH VIÊN
              </span>
              <span className="text-[10px] text-[#81b29a] font-mono font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#81b29a]" />
                {dynamicOnlineCount} ONLINE
              </span>
            </div>

            {/* SECTION 1: BAN QUẢN TRỊ (ADMIN) */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#f2cc8f] font-bold px-1 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#f2cc8f]" />
                <span>BAN QUẢN TRỊ (ADMIN)</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                  setActiveAuthorCard({
                    id: 'admin-master',
                    name: MASTER_ADMIN_CONFIG.name,
                    avatar: MASTER_ADMIN_CONFIG.avatar,
                    email: MASTER_ADMIN_CONFIG.email,
                    level: 150,
                    coin: 99999,
                  });
                }}
                className="ff-holo-card w-full text-left p-3 rounded-xl relative overflow-hidden group cursor-pointer transition-all active:scale-98"
                title={`Xem hồ sơ hoặc tương tác với ${MASTER_ADMIN_CONFIG.name}`}
              >
                <div className="relative flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <DecoratedAvatar
                      user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                      fallbackSrc={MASTER_ADMIN_CONFIG.avatar}
                      size={40}
                      animate
                      alt={MASTER_ADMIN_CONFIG.name}
                      className="rounded-full ring-1 ring-[#e9c46a]/60"
                    />
                    <span
                      className={`absolute bottom-0 right-0 z-[4] w-3 h-3 rounded-full border-2 border-[#0b0d12] ${
                        isMasterAdminOnline ? 'bg-emerald-400' : 'bg-[#81b29a]'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <DecoratedName
                        user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                        name={MASTER_ADMIN_CONFIG.name}
                        width={136}
                        height={26}
                        animate
                        showFallbackTag
                      />
                      <AdminVerifiedBadge size={13} />
                    </div>
                    <span className="text-[10px] text-[#f2cc8f] font-mono block truncate mt-0.5">
                      {MASTER_ADMIN_CONFIG.role}
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* SECTION 2: HỌC SINH & HỘI VIÊN */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9a978e] font-bold px-1 flex items-center justify-between">
                <span>HỌC SINH & HỘI VIÊN</span>
                <span className="text-[9px] text-[#f2cc8f] font-mono">{activeStudents.length}</span>
              </div>

              <div className="space-y-1.5 overflow-y-auto pr-0.5 flex-1 max-h-[300px] no-scrollbar">
                {activeStudents.length === 0 ? (
                  <div className="py-3 px-2 text-center text-xs text-[#9a978e] italic">
                    Chưa có hội viên khác trực tuyến
                  </div>
                ) : (
                  activeStudents.map(user => {
                    const tier = getTierForLevel(user.level || 1);
                    const resolvedStudent = resolveChatUser(user.email, user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={(e) => {
                          setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                          setActiveAuthorCard({
                            id: user.id,
                            name: user.name,
                            avatar: user.avatar,
                            email: user.email,
                            level: user.level || 1,
                          });
                        }}
                        className="p-2 rounded-xl bg-[#0b0d12]/70 hover:bg-[#f4f1de]/[0.06] border border-[#f4f1de]/10 hover:border-[#f2cc8f]/45 transition-all flex items-center gap-2.5 w-full text-left cursor-pointer"
                      >
                        <div className="relative shrink-0">
                          <DecoratedAvatar
                            user={resolvedStudent}
                            fallbackSrc={user.avatar || DEFAULT_AVATAR}
                            size={34}
                            animate
                            alt={user.name}
                            className="rounded-full ring-1 ring-[#f4f1de]/15"
                          />
                          <span className="absolute bottom-0 right-0 z-[4] w-2 h-2 rounded-full bg-[#81b29a] border border-black" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center">
                            <DecoratedName
                              user={resolvedStudent}
                              name={user.name.replace(/ \(.*\)/, '')}
                              width={136}
                              height={26}
                              animate
                              showFallbackTag
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#9a978e] font-mono mt-0.5">
                            <span className="text-[#f2cc8f] font-semibold">{tier.name}</span>
                            <span>• Lv.{user.level || 1}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {!currentUser && (
              <div className="p-3 rounded-xl bg-[#0b0d12]/80 border border-dashed border-[#f4f1de]/15 text-center space-y-2 mt-auto">
                <p className="text-xs text-[#9a978e] leading-snug">
                  Bạn đang xem với tư cách Khách.
                </p>
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="ff-tactile-btn w-full py-1.5 rounded-lg bg-[#e07a5f] hover:bg-[#f2cc8f] text-[#0b0d12] border border-[#f4f1de] text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Channel Selector Drawer (< 768px) */}
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
            className="fixed top-0 bottom-0 left-0 z-50 w-[300px] max-w-[85vw] bg-[#151a26]/98 backdrop-blur-2xl border-r-[1.5px] border-[#f4f1de]/18 p-4 flex flex-col shadow-2xl animate-fade-up md:hidden overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-dashed border-[#f4f1de]/15">
              <span className="text-xs font-extrabold text-[#f4f1de] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Hash className="w-4 h-4 text-[#e07a5f]" />
                PHÒNG CHAT
              </span>
              <button
                type="button"
                onClick={() => setIsChannelDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/15 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                aria-label="Đóng bảng chọn kênh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 flex-1">
              {CHANNELS.map((ch) => {
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
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer border-[1.5px] ${
                      isActive
                        ? 'bg-[#e07a5f]/20 border-[#e07a5f]/60 text-[#f4f1de] shadow-[3px_3px_0px_rgba(4,6,11,0.9)]'
                        : 'bg-[#0b0d12]/60 hover:bg-[#f4f1de]/[0.05] border-[#f4f1de]/10 text-[#b5b2a9] hover:text-[#f4f1de]'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                        isActive ? 'bg-[#e07a5f] text-[#0b0d12] border-[#f4f1de]/60' : 'bg-[#f4f1de]/[0.05] text-[#9a978e] border-[#f4f1de]/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-extrabold truncate ${isActive ? 'text-[#f4f1de]' : 'text-[#d8d5ce]'}`}>
                          #{ch.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#f2cc8f] ml-1">{count}</span>
                      </div>
                      <p className="text-[10.5px] text-[#9a978e] line-clamp-1 mt-0.5">{ch.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
        </>
      )}

      {/* Mobile Active Members Drawer (< 768px) */}
      {isMembersDrawerOpen && (
        <>
          <button
            type="button"
            aria-label="Đóng danh sách thành viên"
            tabIndex={-1}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden border-none p-0 cursor-default"
            onClick={() => setIsMembersDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Thành viên trực tuyến"
            className="fixed top-0 bottom-0 right-0 z-50 w-[300px] max-w-[85vw] bg-[#151a26]/98 backdrop-blur-2xl border-l-[1.5px] border-[#f4f1de]/18 p-4 flex flex-col shadow-2xl animate-fade-up md:hidden overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-dashed border-[#f4f1de]/15">
              <span className="text-xs font-extrabold text-[#f4f1de] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#81b29a]" />
                THÀNH VIÊN ONLINE
              </span>
              <button
                type="button"
                onClick={() => setIsMembersDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/15 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
                aria-label="Đóng danh sách thành viên"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Card */}
            <div className="space-y-2 mb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#f2cc8f] font-bold px-1 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#f2cc8f]" />
                <span>BAN QUẢN TRỊ (ADMIN)</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                  setIsMembersDrawerOpen(false);
                  setActiveAuthorCard({
                    id: 'admin-master',
                    name: MASTER_ADMIN_CONFIG.name,
                    avatar: MASTER_ADMIN_CONFIG.avatar,
                    email: MASTER_ADMIN_CONFIG.email,
                    level: 150,
                    coin: 99999,
                  });
                }}
                className="ff-holo-card w-full text-left p-3 rounded-xl relative overflow-hidden cursor-pointer active:scale-98"
                title={`Xem hồ sơ ${MASTER_ADMIN_CONFIG.name}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <DecoratedAvatar
                      user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                      fallbackSrc={MASTER_ADMIN_CONFIG.avatar}
                      size={40}
                      animate
                      alt={MASTER_ADMIN_CONFIG.name}
                      className="rounded-full ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    />
                    <span
                      className={`absolute bottom-0 right-0 z-[4] w-3 h-3 rounded-full border-2 border-[#0b0d12] ${
                        isMasterAdminOnline ? 'bg-emerald-400' : 'bg-[#81b29a]'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <DecoratedName
                        user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                        name={MASTER_ADMIN_CONFIG.name}
                        width={136}
                        height={26}
                        animate
                        showFallbackTag
                      />
                      <AdminVerifiedBadge size={13} />
                    </div>
                    <span className="text-[10px] text-[#f2cc8f] font-mono block truncate mt-0.5">
                      {MASTER_ADMIN_CONFIG.role}
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* Active Students */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9a978e] font-semibold px-1 flex items-center justify-between">
                <span>HỌC SINH & HỘI VIÊN</span>
                <span className="text-[9px] text-[#f2cc8f] font-mono">{activeStudents.length}</span>
              </div>
              <div className="space-y-1.5 overflow-y-auto pr-0.5 flex-1">
                {activeStudents.length === 0 ? (
                  <div className="py-3 px-2 text-center text-xs text-[#9a978e] italic">
                    Chưa có hội viên khác trực tuyến
                  </div>
                ) : (
                  activeStudents.map((user) => {
                    const tier = getTierForLevel(user.level || 1);
                    const resolvedStudent = resolveChatUser(user.email, user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={(e) => {
                          setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                          setIsMembersDrawerOpen(false);
                          setActiveAuthorCard({
                            id: user.id,
                            name: user.name,
                            avatar: user.avatar,
                            email: user.email,
                            level: user.level || 1,
                          });
                        }}
                        className="p-2 rounded-xl bg-[#0b0d12]/70 border border-[#f4f1de]/10 hover:border-[#f2cc8f]/45 flex items-center gap-2.5 w-full text-left cursor-pointer"
                      >
                        <div className="relative shrink-0">
                          <DecoratedAvatar
                            user={resolvedStudent}
                            fallbackSrc={user.avatar || DEFAULT_AVATAR}
                            size={34}
                            animate
                            alt={user.name}
                            className="rounded-full ring-1 ring-[#f4f1de]/15"
                          />
                          <span className="absolute bottom-0 right-0 z-[4] w-2 h-2 rounded-full bg-[#81b29a] border border-black shadow-[0_0_6px_#81b29a]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center">
                            <DecoratedName
                              user={resolvedStudent}
                              name={user.name.replace(/ \(.*\)/, '')}
                              width={136}
                              height={26}
                              animate
                              showFallbackTag
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#9a978e] font-mono mt-0.5">
                            <span className="text-[#f2cc8f] font-semibold">{tier.name}</span>
                            <span>• Lv.{user.level || 1}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Compact Floating Author Context Popover — portaled to document.body */}
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
            className="pc-12-shell w-[320px] max-w-[calc(100vw-24px)] rounded-2xl p-4 shadow-[0_18px_48px_rgba(0,0,0,0.85)] popover-morph-enter"
          >
            <button
              type="button"
              onClick={() => setActiveAuthorCard(null)}
              className="absolute top-2.5 right-2.5 z-[5] p-1 rounded-full text-neutral-300 hover:text-white cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="ff-discord-userbar flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.04] border border-white/15 pr-6">
              <UserNameplateBg
                user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                width={268}
                eager
                animate
                priority="high"
              />
              <div className="relative z-[2] shrink-0">
                <DecoratedAvatar
                  user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                  fallbackSrc={activeAuthorCard.avatar || DEFAULT_AVATAR}
                  size={44}
                  eager
                  animate
                  alt={activeAuthorCard.name}
                  className="rounded-full ring-1 ring-amber-400/60 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 z-[4]">
                  <TierBadge level={activeAuthorCard.level} size={16} showTooltip={false} />
                </span>
              </div>

              <div className="relative z-[2] min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <DecoratedName
                    user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                    name={activeAuthorCard.name.replace(/ \(.*\)/, '')}
                    width={176}
                    height={33}
                    eager
                    animate
                    priority="high"
                    showFallbackTag
                  />
                  {isMasterAdmin(activeAuthorCard.email) && <AdminVerifiedBadge size={12} />}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/40 text-[9.5px] font-mono font-bold shadow-sm">
                    {getTierForLevel(activeAuthorCard.level).titleVi}
                  </span>
                  <span className="text-[10px] text-white/85 font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
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
                  className="pc-12-btn ff-tactile-btn w-full py-2 px-3 rounded-xl text-[#f4f1de] hover:text-[#f2cc8f] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#f2cc8f]" />
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
                className="pc-12-btn w-full py-2 px-3 rounded-xl text-red-200 hover:text-red-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-red-400" />
                <span>Tố cáo</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Tố cáo tài khoản — portaled to document.body */}
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up"
        >
          <div className="modal-container w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#f4f1de]/15 mb-4">
              <div className="flex items-center gap-2 text-[#e07a5f]">
                <Flag className="w-5 h-5 text-[#e07a5f]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#f4f1de]">Tố Cáo Tài Khoản Vi Phạm</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportUser(null);
                  setReportSuccessMsg(null);
                }}
                className="p-1.5 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/15 text-[#d8d5ce] hover:text-[#f4f1de] cursor-pointer"
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
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
                  Đối tượng tố cáo: <strong className="text-white">{reportUser.name}</strong>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Lý do vi phạm (*):
                  </label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 cursor-pointer"
                  >
                    <option value="Toxic / Gây war / Xúc phạm bạn học">Toxic / Gây war / Xúc phạm bạn học</option>
                    <option value="Spam / Quảng cáo / Lừa đảo">Spam / Quảng cáo / Lừa đảo</option>
                    <option value="Nội dung phản cảm / Đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Gian lận điểm / Hack Coin">Gian lận điểm / Hack Coin</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="chi-tiet-vi-pham" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea id="chi-tiet-vi-pham"
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Mô tả cụ thể hành vi hoặc bằng chứng vi phạm..."
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-[10px] text-red-300 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    Kỷ luật trường học nghiêm ngặt:
                  </span>
                  <p>
                    Báo cáo vi phạm sẽ được chuyển tới Ban Quản Trị để xử lý theo nội quy.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setReportUser(null)}
                    className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
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
