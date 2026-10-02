import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Hash,
  Users,
  HelpCircle,
  Heart,
  Shield,
  Clock,
  Sparkles,
  Radio,
  Flame,
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
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { TriVideoCrossfadeBg } from '../TriVideoCrossfadeBg';
import { TRI_CHAT_VIDEOS } from '../../utils/chatVideos';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../../config/admin';
import { getTierForLevel } from '../../utils/tier';
import { pushNotification } from '../../utils/notifications';

interface ChatViewProps {
  currentUser: User | null;
  messages: ChatMessage[];
  onSendMessage: (channelId: ChatChannelId, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onlineUsers?: OnlinePresenceUser[];
  onlineCount?: number;
  onOpenLoginModal?: () => void;
  onOpenProfile?: (user?: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
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
    desc: 'Đại sảnh giao lưu kết bạn toàn trường',
    topic: 'Chào đón tân sinh viên, kết nối bạn học đa cơ sở FPT',
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
  messages,
  onSendMessage,
  onDeleteMessage,
  onlineUsers,
  onlineCount = 1,
  onOpenLoginModal,
  onOpenProfile,
}) => {
  const [activeChannel, setActiveChannel] = useState<ChatChannelId>('hallway');
  const [isChannelDrawerOpen, setIsChannelDrawerOpen] = useState(false);
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Author mini-profile popup state
  const [activeAuthorCard, setActiveAuthorCard] = useState<{
    id: string;
    name: string;
    avatar: string;
    email?: string;
    level: number;
    coin?: number;
  } | null>(null);

  // Report Account Modal state
  const [reportUser, setReportUser] = useState<{ id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>('Toxic / Gây war / Xúc phạm bạn học');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportUser || isSubmittingReport) return;
    setIsSubmittingReport(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUser?.id || 'guest',
          reporterName: currentUser?.name || 'Ẩn danh',
          reporterEmail: currentUser?.email || '',
          reportedUserId: reportUser.id,
          reportedUserName: reportUser.name,
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });
      const data = await res.json();
      setReportSuccessMsg(data.message || 'Đã gửi tố cáo tài khoản tới Ban Quản Trị (anhtuantran0512@gmail.com).');
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Đã Tiếp Nhận Báo Cáo',
        body: `Tố cáo đối với "${reportUser.name}" đã được chuyển tới Ban Giám Hiệu và Super Admin.`,
        targetView: 'chat',
      });
    } catch {
      setReportSuccessMsg('Đã ghi nhận tố cáo của bạn và chuyển tới anhtuantran0512@gmail.com.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Dynamic user presence calculations
  const dynamicOnlineCount =
    onlineUsers && onlineUsers.length > 0 ? onlineUsers.length : Math.max(1, onlineCount);
  const isMasterAdminOnline =
    (onlineUsers || []).some(u => isMasterAdmin(u.email)) ||
    (currentUser ? isMasterAdmin(currentUser.email) : false);
  const activeStudents = (onlineUsers || []).filter(u => !isMasterAdmin(u.email));

  // Auto-cycle through the 3 atmospheric Q&A video loops every 14 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveVideoIdx(prev => (prev + 1) % TRI_CHAT_VIDEOS.length);
    }, 14000);
    return () => clearInterval(timer);
  }, []);

  // Filter messages for active channel
  const currentMessages = messages.filter(m => m.channelId === activeChannel);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  // Cooldown countdown timer (2.0s anti-spam)
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const interval = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 100));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [cooldownRemaining]);

  const handleSend = () => {
    if (!inputText.trim() || cooldownRemaining > 0 || !currentUser) return;
    onSendMessage(activeChannel, inputText.trim());
    setInputText('');
    setCooldownRemaining(2000); // 2.0s cooldown
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
    <section className="relative w-full h-[100dvh] md:h-screen overflow-hidden flex flex-col pt-[calc(54px+var(--safe-top))] pb-[calc(56px+var(--safe-bottom))] md:pt-24 md:pb-6 px-2 sm:px-6">
      {/* Background Video Engine: TriVideoCrossfadeBg running at z-0 absolute inset-0 */}
      <TriVideoCrossfadeBg activeIdx={activeVideoIdx} onIdxChange={setActiveVideoIdx} />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col overflow-hidden">
        {/* Top Channel Bar (Desktop >= 768px) */}
        <div className="hidden md:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-orange-400 animate-pulse" />
              <span>Phòng Chat Đàm Thoại Thời Gian Thực</span>
              <span className="text-xs font-mono font-normal text-orange-400 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
                LIVE DOCK
              </span>
            </h1>
            <p className="text-xs text-neutral-300 mt-0.5">
              Các hành vi toxic, kháy, khiêu khích, cô lập, cố ý gây war sẽ bị vô hiệu hóa tài khoản vĩnh viễn, thông tin sẽ được đưa thẳng về ban giám hiệu nhà trường.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Ambient Video Switcher Pills: Clean Icons (Waves, Grid, Sparkles) */}
            <div className="hidden sm:flex items-center gap-1 bg-black/50 p-1 rounded-full border border-white/10">
              {TRI_CHAT_VIDEOS.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVideoIdx(v.id)}
                  className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                    activeVideoIdx === v.id
                      ? 'bg-orange-500 text-black shadow-[0_0_10px_rgba(249,115,22,0.8)]'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title={`Chuyển phông nền: ${v.label}`}
                >
                  {i === 0 ? <Waves className="w-3.5 h-3.5" /> : i === 1 ? <Grid className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
              <span>{dynamicOnlineCount} bạn đang trực tuyến</span>
            </div>
          </div>
        </div>

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

        {/* 3-Column Discord Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 overflow-hidden pb-2">
          
          {/* Left Column: 4 Channels Selector (md:col-span-3) */}
          <div className="hidden md:flex md:col-span-3 flex-col rounded-3xl liquid-glass bg-black/35 backdrop-blur-xl border border-white/10 p-3.5 shadow-2xl overflow-y-auto space-y-3">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Hash className="w-3.5 h-3.5 text-orange-400" />
                CHUYÊN KÊNH ĐÀM THOẠI
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">4 KÊNH</span>
            </div>

            <div className="space-y-1.5">
              {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                const count = messages.filter(m => m.channelId === ch.id).length;

                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500/25 to-amber-500/20 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                        : 'hover:bg-white/5 border border-transparent text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isActive
                          ? 'bg-orange-500 text-black shadow-md'
                          : 'bg-white/5 text-neutral-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold truncate ${
                            isActive ? 'text-white' : 'text-neutral-300'
                          }`}
                        >
                          #{ch.name}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 ml-1">
                          {count}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                        {ch.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Community Guidelines */}
            <div className="mt-auto pt-3 border-t border-white/10 p-3 rounded-2xl bg-white/5 text-[11px] text-neutral-400 space-y-1">
              <span className="font-bold text-white flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                VĂN HOÁ NÓI CHUYỆN FPT
              </span>
              <p className="text-[10px] leading-relaxed text-neutral-400">
                Tuyệt đối không toxic, kháy đểu, khiêu khích hay gây war. Mọi vi phạm bị khóa tài khoản vĩnh viễn và báo cáo thẳng Ban Giám Hiệu.
              </p>
            </div>
          </div>

          {/* Center Column: Active Channel Messages & Input (md:col-span-6 lg:col-span-6) */}
          <div className="col-span-1 md:col-span-9 lg:col-span-6 flex flex-col rounded-3xl liquid-glass bg-black/35 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
            


            {/* Chat Room Subheader */}
            <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
                <span className="font-bold text-xs sm:text-sm text-white truncate">
                  #{currentChannelObj.name}
                </span>
                <span className="hidden sm:inline text-neutral-400 text-xs">—</span>
                <span className="hidden sm:inline text-xs text-neutral-400 truncate">
                  {currentChannelObj.topic}
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 shrink-0 ml-2">
                {currentMessages.length} tin nhắn
              </span>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite" aria-relevant="additions" aria-label="Tin nhắn cuộc trò chuyện">
              {currentMessages.length === 0 ? (
                /* Clean High-Design Empty State with MessageSquareDashed */
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3.5 text-neutral-400 my-auto">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                      <MessageSquareDashed className="w-8 h-8 text-amber-300 animate-pulse" />
                    </div>
                    <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1.5 -right-1.5 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-semibold text-white font-mono tracking-wide">
                    Chưa có tin nhắn nào trong kênh này
                  </h3>
                  <p className="text-xs text-neutral-300 max-w-sm leading-relaxed font-light">
                    Chưa có tin nhắn nào trong kênh này. Hãy là người mở đầu cuộc trò chuyện!
                  </p>
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
                          setActiveAuthorCard({
                            id: msg.authorId,
                            name: authorDisplayName,
                            avatar: authorDisplayAvatar,
                            email: isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
                            level: isSuperAdminMsg ? 150 : (msg.authorLevel || 1),
                          });
                        }}
                        className="relative shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-105"
                        title={`Xem thông tin ${authorDisplayName}`}
                      >
                        <img
                          src={authorDisplayAvatar}
                          alt={authorDisplayName}
                          onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                          loading="lazy"
                          decoding="async"
                          width={32}
                          height={32}
                          className={`w-8 h-8 rounded-full object-cover shadow-md ${
                            isSuperAdminMsg
                              ? 'border-2 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                              : 'border border-white/25'
                          }`}
                        />
                        <span className="absolute -bottom-1 -right-1">
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
                              setActiveAuthorCard({
                                id: msg.authorId,
                                name: authorDisplayName,
                                avatar: authorDisplayAvatar,
                                email: isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
                                level: isSuperAdminMsg ? 150 : (msg.authorLevel || 1),
                              });
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

                          {/* Super Admin Recall/Delete Button */}
                          {isSuperAdmin && (
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

            {/* Anti-Spam Cooldown Indicator */}
            {cooldownRemaining > 0 && (
              <div className="px-4 py-1.5 bg-amber-950/50 border-t border-amber-500/20 text-[10px] text-amber-300 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  Cơ chế chống spam (2.0s): Vui lòng chờ...
                </span>
                <span className="font-mono font-bold">
                  {(cooldownRemaining / 1000).toFixed(1)}s
                </span>
              </div>
            )}

            {/* Cooldown progress bar */}
            {cooldownRemaining > 0 && (
              <div className="w-full bg-neutral-800 h-1 overflow-hidden shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-300"
                  style={{ width: `${(cooldownRemaining / 2000) * 100}%` }}
                />
              </div>
            )}

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
                  disabled={cooldownRemaining > 0}
                  placeholder={
                    cooldownRemaining > 0
                      ? 'Đang kích hoạt bộ đếm chống spam 2.0s...'
                      : `Nhắn tin vào #${currentChannelObj.name}...`
                  }
                  className="flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                />

                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || cooldownRemaining > 0}
                  className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-xs sm:text-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(249,115,22,0.4)] flex items-center gap-1.5 cursor-pointer"
                  title={
                    cooldownRemaining > 0
                      ? 'Vui lòng chờ hết thời gian đếm ngược'
                      : 'Gửi tin nhắn'
                  }
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
                THÀNH VIÊN TRỰC TUYẾN
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
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-cyan-500/10 border border-amber-400/35 shadow-[0_0_20px_rgba(245,158,11,0.18)] relative overflow-hidden group">
                <div className="relative flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <img
                      src={MASTER_ADMIN_CONFIG.avatar}
                      alt={MASTER_ADMIN_CONFIG.name}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      loading="lazy"
                      decoding="async"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0c1218] ${
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
              </div>
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
                          <img
                            src={user.avatar || DEFAULT_AVATAR}
                            alt={user.name}
                            onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                            loading="lazy"
                            decoding="async"
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover border border-white/15"
                          />
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-black shadow-[0_0_6px_#34d399] animate-pulse" />
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

            {/* Guest Login Banner or Audio Visualizer Notice */}
            {!currentUser ? (
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
            ) : (
              <div className="mt-auto p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200">
                <span className="font-bold flex items-center gap-1.5 text-orange-300 mb-1">
                  <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  KÊNH PHÁT THANH NỘI BỘ
                </span>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  Nhấn vào biểu tượng 5 cột sóng âm trên thanh điều hướng để kích hoạt âm hưởng thiền định 432Hz binaural.
                </p>
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
                      <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">{ch.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-3 border-t border-white/10 p-3 rounded-2xl bg-white/5 text-[11px] text-neutral-400 space-y-1">
              <span className="font-bold text-white flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                VĂN HOÁ NÓI CHUYỆN FPT
              </span>
              <p className="text-[10px] leading-relaxed text-neutral-400">
                Tuyệt đối không toxic, kháy đểu, khiêu khích hay gây war. Mọi vi phạm bị khóa tài khoản vĩnh viễn và báo cáo thẳng Ban Giám Hiệu.
              </p>
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
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-cyan-500/10 border border-amber-400/35 relative overflow-hidden">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <img
                      src={MASTER_ADMIN_CONFIG.avatar}
                      alt={MASTER_ADMIN_CONFIG.name}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      loading="lazy"
                      decoding="async"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0c1218] ${
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
              </div>
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
                          <img
                            src={user.avatar || DEFAULT_AVATAR}
                            alt={user.name}
                            onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                            loading="lazy"
                            decoding="async"
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover border border-white/15"
                          />
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-black shadow-[0_0_6px_#34d399]" />
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

      {/* Author Mini-Profile Popover */}
      {activeAuthorCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Thông tin người dùng"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
        >
          <div className="liquid-glass w-full max-w-sm rounded-3xl bg-[#0c1218]/95 border border-white/20 shadow-2xl p-5 relative">
            <button
              type="button"
              onClick={() => setActiveAuthorCard(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <img
                  src={activeAuthorCard.avatar}
                  alt={activeAuthorCard.name}
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-400/60 shadow-lg"
                />
                <span className="absolute -bottom-1 -right-1">
                  <TierBadge level={activeAuthorCard.level} size={22} showTooltip={false} />
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                  <span>{activeAuthorCard.name}</span>
                  {activeAuthorCard.email === 'anhtuantran0512@gmail.com' && <AdminVerifiedBadge size={14} />}
                </h4>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                    Danh hiệu: {getTierForLevel(activeAuthorCard.level).name}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    Lv.{activeAuthorCard.level}
                  </span>
                </div>
              </div>

              <div className="w-full pt-3 border-t border-white/10 flex flex-col gap-2">
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      const user = activeAuthorCard;
                      setActiveAuthorCard(null);
                      onOpenProfile(user);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Xem Hồ Sơ Chi Tiết</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const user = activeAuthorCard;
                    setActiveAuthorCard(null);
                    setReportUser({ id: user.id, name: user.name });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 text-red-400" />
                  <span>Tố Cáo Tài Khoản Này</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tố cáo tài khoản */}
      {reportUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tố cáo tài khoản vi phạm"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up"
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
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea
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
                    Báo cáo vi phạm sẽ được gửi trực tiếp tới Ban Quản Trị (anhtuantran0512@gmail.com) và Ban Giám Hiệu nhà trường.
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
        </div>
      )}
    </section>
  );
};

export default ChatView;
