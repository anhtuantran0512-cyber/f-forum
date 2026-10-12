/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  Hash,
  Users,
  HelpCircle,
  Heart,
  Shield,
  Sparkles,
  Trash2,
  MessageSquareDashed,
  X,
  ChevronDown,
  Waves,
  Grid,
  Flag,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import type { ChatChannelId, ChatMessage, User, OnlinePresenceUser } from '../../types';
import { TierBadge, AdminVerifiedBadge } from '../Badges10Tier';
import { DEFAULT_AVATAR } from '../../utils/mediaFallback';
import { useChatCooldown } from '../../utils/chatCooldown';
import { TriVideoCrossfadeBg } from '../TriVideoCrossfadeBg';
import { TRI_CHAT_VIDEOS } from '../../utils/chatVideos';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../../config/admin';
import { capsHas, useAdminCaps } from '../../utils/adminCapabilities';
import { InfoTip } from '../ui/InfoTip';
import { getTierForLevel } from '../../utils/tier';
import { pushNotification } from '../../utils/notifications';
import { ChatCooldownBar } from '../ChatCooldownBar';
import { ThinkingBubble } from '../ViewTransitionLoader';
import { postJson } from '../../utils/session';
import { describeReportResult, settleReportRequest } from '../../utils/reports';
import { DecoratedAvatar, UserNameplateBg } from '../decorations/DecoratedAvatar';

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
  const resolveChatUser = (email?: string | null, id?: string | null): User | null => {
    if (email && users[email.toLowerCase()]) return users[email.toLowerCase()];
    if (
      currentUser &&
      ((email && currentUser.email.toLowerCase() === email.toLowerCase()) ||
        (id && currentUser.id === id))
    ) {
      return currentUser;
    }
    if (id) {
      for (const u of Object.values(users)) {
        if (u.id === id) return u;
      }
    }
    return null;
  };
  /* Epic 3 — thu hồi tin nhắn: Super Admin hoặc vai trò tùy chỉnh có quyền edit_content. */
  const adminCaps = useAdminCaps();
  const canRecallMessages = capsHas(adminCaps, 'edit_content');
  const [activeChannel, setActiveChannel] = useState<ChatChannelId>('hallway');
  const [isChannelDrawerOpen, setIsChannelDrawerOpen] = useState(false);
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const cooldown = useChatCooldown();
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
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

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      setAuthorAnchorPos(prev => activeAuthorCard ? prev : { x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [activeAuthorCard]);

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
  const isMasterAdminOnline =
    (onlineUsers || []).some(u => isMasterAdmin(u.email)) ||
    (currentUser ? isMasterAdmin(currentUser.email) : false);
  const activeStudents = (onlineUsers || []).filter(u => !isMasterAdmin(u.email));

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveVideoIdx(prev => (prev + 1) % TRI_CHAT_VIDEOS.length);
    }, 14000);
    return () => clearInterval(timer);
  }, []);

  const currentMessages = messages.filter(m => m.channelId === activeChannel);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

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
      {/* Background Video Engine: TriVideoCrossfadeBg running at z-0 absolute inset-0 */}
      <TriVideoCrossfadeBg activeIdx={activeVideoIdx} onIdxChange={setActiveVideoIdx} />

      {/* Phase 2: Sub-Layout Content Wrapper — height: calc(100vh - var(--navbar-height)), overflow: hidden, display: flex */}
      <div
        className="page-content-wrapper relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col overflow-hidden px-2 sm:px-6 py-2 md:py-4"
        style={{ height: 'calc(100vh - var(--navbar-height))' }}
      >
        {/* Mobile Subheader Bar with 2 Slide-in Drawer Buttons (< 768px) */}
        <div className="md:hidden flex items-center justify-between p-2 mb-2 rounded-2xl bg-black/40 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setIsChannelDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold cursor-pointer max-w-[45%]"
            aria-label="Chọn chuyên kênh đàm thoại"
          >
            <Hash className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">#{currentChannelObj.name}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
          </button>

          <span className="text-[11px] font-mono text-neutral-400">
            {currentMessages.length} tin
          </span>

          <button
            type="button"
            onClick={() => setIsMembersDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-mono cursor-pointer"
            aria-label="Xem thành viên trực tuyến"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>{dynamicOnlineCount} Online</span>
            <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </button>
        </div>

        {/* 3-Column Discord Layout (Channel Sidebar + Main Chat + Member List) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden min-h-0">
          
          {/* Left Column: 4 Channels Selector + Current User Card (md:col-span-3) */}
          <div className="hidden md:flex md:col-span-3 flex-col rounded-3xl liquid-glass bg-black/35 backdrop-blur-xl border border-white/10 p-3.5 shadow-2xl overflow-hidden space-y-3">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10 shrink-0">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Hash className="w-3.5 h-3.5 text-orange-400" />
                KÊNH
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">4 KÊNH</span>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                const count = messages.filter(m => m.channelId === ch.id).length;

                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`channel-item w-full text-left rounded-xl transition-all flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'active bg-gradient-to-r from-orange-500/25 to-amber-500/20 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                        : 'hover:bg-white/5 border border-transparent text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isActive
                          ? 'bg-orange-500 text-black shadow-md'
                          : 'bg-white/5 text-neutral-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <span
                      className={`text-xs font-bold truncate flex-1 ${
                        isActive ? 'text-white' : 'text-neutral-300'
                      }`}
                    >
                      #{ch.name}
                    </span>

                    {count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-neutral-300 shrink-0">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Current User / Guest Mini Dock (Discord User Bar) */}
            {currentUser ? (
              <div className="ff-discord-userbar mt-2 p-2.5 rounded-2xl bg-white/[0.04] border border-white/15 flex items-center gap-2.5 shrink-0">
                <UserNameplateBg
                  user={currentUser}
                  width={220}
                  eager
                  animate
                  priority="high"
                />
                <div className="relative z-[2] shrink-0">
                  <DecoratedAvatar
                    user={currentUser}
                    fallbackSrc={currentUser.avatar || DEFAULT_AVATAR}
                    size={34}
                    eager
                    alt={currentUser.name}
                    className="rounded-full ring-1 ring-white/20"
                  />
                  <span className="absolute bottom-0 right-0 z-[4] w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#0c1218]" />
                </div>
                <div className="relative z-[2] min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-white truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">{currentUser.name}</div>
                  <div className="text-[10px] text-emerald-300 font-mono truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">Trực tuyến • Lv.{currentUser.level || 1}</div>
                </div>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 px-1 shrink-0">
                <span className="text-[11px] text-neutral-400 truncate">Chế độ Khách</span>
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Đăng nhập
                </button>
              </div>
            )}
          </div>

          {/* Center Column: Active Channel Messages & Input (md:col-span-9 lg:col-span-6) */}
          <div className="col-span-1 md:col-span-9 lg:col-span-6 flex flex-col rounded-3xl liquid-glass bg-black/35 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden min-h-0">
            
            {/* Chat Room Subheader — Compact with Rules Tooltip & Ambient Controls */}
            <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-white truncate">
                  #{currentChannelObj.name}
                </span>
                <InfoTip label="Nội quy phòng chat" align="start">
                  Tôn trọng nhau — các hành vi toxic, khiêu khích hoặc gây war sẽ bị khoá tài khoản.
                </InfoTip>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1 bg-black/50 p-1 rounded-full border border-white/10">
                  {TRI_CHAT_VIDEOS.map((v, i) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setActiveVideoIdx(v.id)}
                      className={`p-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                        activeVideoIdx === v.id
                          ? 'bg-orange-500 text-black shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title={`Chuyển phông nền: ${v.label}`}
                    >
                      {i === 0 ? <Waves className="w-3 h-3" /> : i === 1 ? <Grid className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
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
                /* Clean 1-line Empty State */
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-neutral-400 my-auto">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                      <MessageSquareDashed className="w-7 h-7 text-amber-300" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-white font-mono tracking-wide">
                    Hãy là người mở đầu 👋
                  </h3>
                </div>
              ) : (
                currentMessages.map(msg => {
                  const isMe = currentUser ? msg.authorId === currentUser.id : false;
                  const isSuperAdminMsg = isMasterAdmin(msg.authorEmail);
                  const isSuperAdmin = currentUser ? isMasterAdmin(currentUser.email) : false;
                  const authorDisplayName = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.name : msg.authorName;
                  const authorDisplayAvatar = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.avatar : msg.authorAvatar;

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
                        onClick={() => {
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
                          user={resolveChatUser(isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail, msg.authorId)}
                          fallbackSrc={authorDisplayAvatar}
                          size={34}
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
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-neutral-400">
                          <button
                            type="button"
                            onClick={() => {
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
                            className={
                              isSuperAdminMsg
                                ? 'discord-admin-name text-xs hover:underline cursor-pointer'
                                : 'font-semibold text-neutral-200 hover:text-white hover:underline cursor-pointer'
                            }
                          >
                            {authorDisplayName}
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
                          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-md ${
                            isMe
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-medium rounded-tr-none shadow-[0_2px_12px_rgba(249,115,22,0.3)]'
                              : 'liquid-glass bg-white/10 text-neutral-100 rounded-tl-none border border-white/15'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <ChatCooldownBar
              isCooling={cooldown.isCooling}
              remainingMs={cooldown.remainingMs}
              nudgeKey={cooldown.nudgeKey}
              variant="view"
            />

            {/* Input Bar or Login Prompt */}
            {!currentUser ? (
              <div className="p-3 bg-black/60 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-neutral-400">Vui lòng đăng nhập để gửi tin nhắn trong kênh</span>
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="px-4 py-2 rounded-xl bg-white text-neutral-900 font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer shrink-0"
                >
                  Đăng nhập
                </button>
              </div>
            ) : (
              <div className="p-3 bg-black/60 border-t border-white/10 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={inputText}
                  maxLength={300}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Nhắn tin vào #${currentChannelObj.name}...`}
                  className="message-input-bar flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                />

                {cooldown.isCooling && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-mono text-amber-300 shrink-0">
                    Chờ {cooldown.secondsLeft}s
                  </span>
                )}

                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || cooldown.isCooling}
                  className={`relative p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-xs sm:text-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(249,115,22,0.4)] flex items-center gap-1.5 cursor-pointer ${
                    cooldown.isCooling ? 'ff-cd-btn is-cooling' : ''
                  }`}
                  title={cooldown.isCooling ? `Còn ${cooldown.secondsLeft}s trước tin tiếp theo` : 'Gửi tin nhắn'}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Active Members Roster (hidden on mobile, lg:col-span-3) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col rounded-3xl liquid-glass bg-black/35 backdrop-blur-xl border border-white/10 p-3.5 shadow-2xl overflow-y-auto space-y-4">
            <div className="px-2 pb-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                THÀNH VIÊN
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {dynamicOnlineCount} TRỰC TUYẾN
              </span>
            </div>

            {/* SECTION 1: BAN QUẢN TRỊ (ADMIN) */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-bold px-1 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>BAN QUẢN TRỊ (ADMIN)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveAuthorCard({
                    id: 'admin-master',
                    name: MASTER_ADMIN_CONFIG.name,
                    avatar: MASTER_ADMIN_CONFIG.avatar,
                    email: MASTER_ADMIN_CONFIG.email,
                    level: 150,
                    coin: 99999,
                  });
                }}
                className="w-full text-left p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-cyan-500/10 hover:from-amber-500/20 hover:to-cyan-500/20 border border-amber-400/35 hover:border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.18)] relative overflow-hidden group cursor-pointer transition-all active:scale-98"
                title={`Xem hồ sơ hoặc tương tác với ${MASTER_ADMIN_CONFIG.name}`}
              >
                <div className="relative flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <DecoratedAvatar
                      user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                      fallbackSrc={MASTER_ADMIN_CONFIG.avatar}
                      size={40}
                      alt={MASTER_ADMIN_CONFIG.name}
                      className="rounded-full ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    />
                    <span
                      className={`absolute bottom-0 right-0 z-[4] w-3 h-3 rounded-full border-2 border-[#0c1218] ${
                        isMasterAdminOnline
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                          : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 truncate">
                        {MASTER_ADMIN_CONFIG.name}
                      </span>
                      <AdminVerifiedBadge size={13} />
                    </div>
                    <span className="text-[10px] text-cyan-300 font-mono block truncate mt-0.5">
                      {MASTER_ADMIN_CONFIG.role}
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* SECTION 2: HỌC SINH & HỘI VIÊN */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold px-1 flex items-center justify-between">
                <span>HỌC SINH & HỘI VIÊN</span>
                <span className="text-[9px] text-neutral-500 font-mono">{activeStudents.length}</span>
              </div>

              <div className="space-y-1.5 overflow-y-auto pr-0.5 flex-1 max-h-[300px] no-scrollbar">
                {activeStudents.length === 0 ? (
                  <div className="py-3 px-2 text-center text-xs text-neutral-400 italic">
                    Chưa có hội viên khác trực tuyến
                  </div>
                ) : (
                  activeStudents.map(user => {
                    const tier = getTierForLevel(user.level || 1);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setActiveAuthorCard({
                            id: user.id,
                            name: user.name,
                            avatar: user.avatar,
                            email: user.email,
                            level: user.level || 1,
                          });
                        }}
                        className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all flex items-center gap-2.5 w-full text-left cursor-pointer"
                      >
                        <div className="relative shrink-0">
                          <DecoratedAvatar
                            user={resolveChatUser(user.email, user.id)}
                            fallbackSrc={user.avatar || DEFAULT_AVATAR}
                            size={32}
                            alt={user.name}
                            className="rounded-full ring-1 ring-white/15"
                          />
                          <span className="absolute bottom-0 right-0 z-[4] w-2 h-2 rounded-full bg-emerald-400 border border-black shadow-[0_0_6px_#34d399] animate-pulse" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-neutral-200 truncate">
                            {user.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                            <span className="text-amber-400 font-semibold">{tier.name}</span>
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
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2 mt-auto">
                <p className="text-xs text-neutral-400 leading-snug">
                  Bạn đang xem với tư cách Khách.
                </p>
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="w-full py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
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
            className="fixed top-0 bottom-0 left-0 z-50 w-[300px] max-w-[85vw] bg-[#0c1218]/95 backdrop-blur-2xl border-r border-white/15 p-4 flex flex-col shadow-2xl animate-fade-up md:hidden overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Hash className="w-4 h-4 text-orange-400" />
                CHUYÊN KÊNH ĐÀM THOẠI
              </span>
              <button
                type="button"
                onClick={() => setIsChannelDrawerOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                aria-label="Đóng bảng chọn kênh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 flex-1">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                const count = messages.filter((m) => m.channelId === ch.id).length;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveChannel(ch.id);
                      setIsChannelDrawerOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-2.5 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500/25 to-amber-500/20 border border-orange-500/50 text-white'
                        : 'hover:bg-white/5 border border-transparent text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isActive ? 'bg-orange-500 text-black' : 'bg-white/5 text-neutral-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                          #{ch.name}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 ml-1">{count}</span>
                      </div>

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
            className="fixed top-0 bottom-0 right-0 z-50 w-[300px] max-w-[85vw] bg-[#0c1218]/95 backdrop-blur-2xl border-l border-white/15 p-4 flex flex-col shadow-2xl animate-fade-up md:hidden overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                THÀNH VIÊN TRỰC TUYẾN
              </span>
              <button
                type="button"
                onClick={() => setIsMembersDrawerOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                aria-label="Đóng danh sách thành viên"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Card */}
            <div className="space-y-2 mb-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold px-1 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>BAN QUẢN TRỊ (ADMIN)</span>
              </div>
              <button
                type="button"
                onClick={() => {
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
                className="w-full text-left p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-cyan-500/10 border border-amber-400/35 relative overflow-hidden cursor-pointer active:scale-98"
                title={`Xem hồ sơ ${MASTER_ADMIN_CONFIG.name}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <DecoratedAvatar
                      user={resolveChatUser(MASTER_ADMIN_CONFIG.email, 'user-admin')}
                      fallbackSrc={MASTER_ADMIN_CONFIG.avatar}
                      size={40}
                      alt={MASTER_ADMIN_CONFIG.name}
                      className="rounded-full ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    />
                    <span
                      className={`absolute bottom-0 right-0 z-[4] w-3 h-3 rounded-full border-2 border-[#0c1218] ${
                        isMasterAdminOnline
                          ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                          : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 truncate">
                        {MASTER_ADMIN_CONFIG.name}
                      </span>
                      <AdminVerifiedBadge size={13} />
                    </div>
                    <span className="text-[10px] text-cyan-300 font-mono block truncate mt-0.5">
                      {MASTER_ADMIN_CONFIG.role}
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {/* Active Students */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold px-1 flex items-center justify-between">
                <span>HỌC SINH & HỘI VIÊN</span>
                <span className="text-[9px] text-neutral-500 font-mono">{activeStudents.length}</span>
              </div>
              <div className="space-y-1.5 overflow-y-auto pr-0.5 flex-1">
                {activeStudents.length === 0 ? (
                  <div className="py-3 px-2 text-center text-xs text-neutral-400 italic">
                    Chưa có hội viên khác trực tuyến
                  </div>
                ) : (
                  activeStudents.map((user) => {
                    const tier = getTierForLevel(user.level || 1);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setIsMembersDrawerOpen(false);
                          setActiveAuthorCard({
                            id: user.id,
                            name: user.name,
                            avatar: user.avatar,
                            email: user.email,
                            level: user.level || 1,
                          });
                        }}
                        className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 w-full text-left cursor-pointer"
                      >
                        <div className="relative shrink-0">
                          <DecoratedAvatar
                            user={resolveChatUser(user.email, user.id)}
                            fallbackSrc={user.avatar || DEFAULT_AVATAR}
                            size={32}
                            alt={user.name}
                            className="rounded-full ring-1 ring-white/15"
                          />
                          <span className="absolute bottom-0 right-0 z-[4] w-2 h-2 rounded-full bg-emerald-400 border border-black shadow-[0_0_6px_#34d399]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-neutral-200 truncate">{user.name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                            <span className="text-amber-400 font-semibold">{tier.name}</span>
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
                  ? Math.max(12, Math.min(authorAnchorPos.x + 12, window.innerWidth - 280))
                  : 24,
              top:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.y - 20, window.innerHeight - 230))
                  : 120,
            }}
            className="pc-12-shell w-[268px] rounded-2xl p-3.5 shadow-[0_18px_48px_rgba(0,0,0,0.85)] popover-morph-enter"
          >
            <button
              type="button"
              onClick={() => setActiveAuthorCard(null)}
              className="absolute top-2.5 right-2.5 z-[5] p-1 rounded-full text-neutral-300 hover:text-white cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="ff-discord-userbar flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/15 pr-6">
              <UserNameplateBg
                user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                width={256}
                eager
                animate
                priority="high"
              />
              <div className="relative z-[2] shrink-0">
                <DecoratedAvatar
                  user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                  fallbackSrc={activeAuthorCard.avatar || DEFAULT_AVATAR}
                  size={42}
                  eager
                  alt={activeAuthorCard.name}
                  className="rounded-full ring-1 ring-amber-400/60 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 z-[4]">
                  <TierBadge level={activeAuthorCard.level} size={16} showTooltip={false} />
                </span>
              </div>

              <div className="relative z-[2] min-w-0 flex-1">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-1 truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                  <span className="truncate">{activeAuthorCard.name}</span>
                  {isMasterAdmin(activeAuthorCard.email) && <AdminVerifiedBadge size={12} />}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
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
                  className="pc-12-btn w-full py-2 px-3 rounded-xl text-cyan-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
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
          <div className="liquid-glass w-full max-w-md rounded-3xl bg-neutral-950/95 border border-red-500/40 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <Flag className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Tố Cáo Tài Khoản Vi Phạm</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportUser(null);
                  setReportSuccessMsg(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
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
