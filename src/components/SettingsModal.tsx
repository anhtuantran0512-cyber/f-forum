/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Settings,
  X,
  Volume2,

  Timer,
  Sparkles,
  Zap,
  Move,
  Trash2,
  MousePointer2,
  Palette,
  Sliders,
  Database,
  Eye,
  Keyboard,
  Download,
  Upload,
  ShieldCheck,
  Command,
  NotebookPen,
  Check,
  Info,
} from 'lucide-react';
import { GODRAY_PRESETS } from '../utils/godrays';
import { safeStorage } from '../utils/storage';
import { AUTH_TOKEN_KEY, clearAuthToken } from '../utils/session';
import { usePopoverPosition, type DockPosition } from '../utils/popover';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;

  onOpenFocusMode: () => void;
  soundEffects: boolean;
  onToggleSoundEffects: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  potatoMode?: boolean;
  onTogglePotatoMode?: () => void;
  godrayPreset?: string;
  onSelectGodray?: (preset: string) => void;
  godrayIntensity?: number;
  onChangeGodrayIntensity?: (val: number) => void;
  glassBlur?: number;
  onChangeGlassBlur?: (val: number) => void;
  fontSize?: 'sm' | 'md' | 'lg';
  onChangeFontSize?: (size: 'sm' | 'md' | 'lg') => void;
  navbarAutoHide?: boolean;
  onToggleNavbarAutoHide?: () => void;
  navbarPosition?: 'top' | 'bottom' | 'left' | 'right';
  onSwapNavbarPosition?: () => void;
  onSelectNavbarPosition?: (pos: 'top' | 'bottom' | 'left' | 'right') => void;
  alwaysCompact?: boolean;
  onToggleAlwaysCompact?: () => void;
  eyeRestEnabled?: boolean;
  onToggleEyeRest?: () => void;
  dockPosition?: DockPosition;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

type SettingsTab = 'appearance' | 'experience' | 'system';

const DOCK_LABEL: Record<'top' | 'bottom' | 'left' | 'right', string> = {
  top: 'TRÊN',
  bottom: 'DƯỚI',
  left: 'TRÁI',
  right: 'PHẢI',
};

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'K'], label: 'Mở Bảng lệnh nhanh' },
  { keys: ['Ctrl', 'I'], label: 'Bật/tắt Sổ tay nhanh' },
  { keys: ['Ctrl', 'Shift', 'L'], label: 'Đổi chế độ Sáng / Tối' },
  { keys: ['Ctrl', 'Shift', 'F'], label: 'Vào không gian tập trung' },
  { keys: ['Alt', '1…8'], label: 'Nhảy nhanh giữa các phân khu' },
  { keys: ['Esc'], label: 'Đóng lớp phủ đang mở' },
];

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-center gap-2 mb-2">
    <span className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500/25 to-fuchsia-500/25 border border-amber-400/30 flex items-center justify-center">
      {icon}
    </span>
    <span className="text-[11px] font-bold uppercase tracking-widest ff-aurora-text">{children}</span>
    <span className="flex-1 h-px ff-aurora-bar opacity-40 rounded-full" />
  </div>
);

const MiniSwitch: React.FC<{ on: boolean; onToggle: () => void; color?: string; label: string }> = ({
  on,
  onToggle,
  color = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onToggle}
    className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${on ? color : 'bg-white/20'}`}
  >
    <div
      className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
        on ? 'translate-x-3.5' : 'translate-x-0'
      }`}
    />
  </button>
);

/** Thẻ cao cấp dùng chung cho các mục cài đặt */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl p-3 bg-black/30 border border-white/10 transition-colors hover:border-amber-400/25 ${className}`}
  >
    {children}
  </div>
);

const SwitchRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc?: string;
  on: boolean;
  onToggle: () => void;
  color?: string;
}> = ({ icon, title, desc, on, onToggle, color }) => (
  <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold text-white truncate">{title}</div>
        {desc && <div className="text-[10px] text-white/55 truncate">{desc}</div>}
      </div>
    </div>
    <MiniSwitch on={on} onToggle={onToggle} color={color} label={title} />
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,

  onOpenFocusMode,
  soundEffects,
  onToggleSoundEffects,
  reducedMotion,
  onToggleReducedMotion,
  potatoMode,
  onTogglePotatoMode,
  godrayPreset = 'godray-gold',
  onSelectGodray,
  godrayIntensity = 70,
  onChangeGodrayIntensity,
  glassBlur = 14,
  onChangeGlassBlur,
  fontSize = 'md',
  onChangeFontSize,
  navbarAutoHide = false,
  onToggleNavbarAutoHide,
  navbarPosition = 'top',
  onSwapNavbarPosition,
  onSelectNavbarPosition,
  alwaysCompact = false,
  onToggleAlwaysCompact,
  eyeRestEnabled = false,
  onToggleEyeRest,
  dockPosition,
  anchorRef,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const activeDockPos: DockPosition = dockPosition || navbarPosition;
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const settledRafRef = useRef<number | null>(null);
  const [confirmReset, setConfirmReset] = useState<null | 'cache' | 'full'>(null);
  const [resetDone, setResetDone] = useState<string | null>(null);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = useMemo(
    () => GODRAY_PRESETS.find((p) => p.id === godrayPreset) || GODRAY_PRESETS[0],
    [godrayPreset],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmReset) {
          setConfirmReset(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, confirmReset]);

  /* Xoá các hộp xác nhận khi đóng. Dùng mẫu "điều chỉnh state khi prop đổi" của
     React thay vì useEffect để tránh một lượt render thừa. */
  const [wasOpenForReset, setWasOpenForReset] = useState(isOpen);
  if (isOpen !== wasOpenForReset) {
    setWasOpenForReset(isOpen);
    if (!isOpen) {
      setConfirmReset(null);
      setResetDone(null);
      setDataNotice(null);
    }
  }

  /* ============================================================
     Hiệu ứng hiện ra: giữ panel thêm ~230ms để chạy hoạt ảnh đóng,
     nhờ vậy panel không còn "bụp" tắt mà tan ra mượt mà.
     ============================================================ */
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  /* Phần chuyển trạng thái đồng bộ (mở -> hiện, đóng -> đang đóng) được suy ra
     lúc render; effect chỉ còn giữ đúng phần hẹn giờ 230ms. */
  const [openDeps, setOpenDeps] = useState({ isOpen, isRendered });
  if (openDeps.isOpen !== isOpen || openDeps.isRendered !== isRendered) {
    setOpenDeps({ isOpen, isRendered });
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      setIsClosing(true);
    }
  }

  useEffect(() => {
    if (isOpen || !isRendered) return undefined;
    const t = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, 230);
    return () => window.clearTimeout(t);
  }, [isOpen, isRendered]);

  /* Lưới an toàn: nếu vì lý do nào đó hoạt ảnh đóng bị kẹt, sau 900ms khoá
     lại trạng thái đóng — không bao giờ để tấm phủ vô hình chặn cả trang. */
  useEffect(() => {
    if (isOpen) return;
    const guard = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, 900);
    return () => window.clearTimeout(guard);
  }, [isOpen]);

  const pop = usePopoverPosition(isRendered, anchorRef, activeDockPos, 392, 640);

  /* Neo có đo được không? Nút Cài đặt có thể đang bị ẩn (ví dụ bảng mở từ thanh
     dưới của điện thoại) → khi đó panel PHẢI chuyển sang dạng giữa màn hình.
     Tuyệt đối không được để panel vô hình (top:-9999, opacity:0) mà tấm phủ
     toàn màn hình vẫn bắt chuột — đó chính là lỗi "bấm gì cũng không mở". */
  const hasAnchor = Boolean(anchorRef);
  const isAnchored = hasAnchor && pop.ready;

  const [isFloating, setIsFloating] = useState(false);

  /* Phần "tắt ngay" được suy ra lúc render (mẫu điều chỉnh state khi prop đổi);
     chỉ phần hẹn giờ mới thật sự cần effect. */
  const [floatDeps, setFloatDeps] = useState({ isRendered, isAnchored });
  if (floatDeps.isRendered !== isRendered || floatDeps.isAnchored !== isAnchored) {
    setFloatDeps({ isRendered, isAnchored });
    if (!isRendered || isAnchored) setIsFloating(false);
  }

  useEffect(() => {
    if (!isRendered || isAnchored) return undefined;
    /* Chờ 220ms cho khung hình đầu đo xong neo; quá hạn thì nổi giữa màn hình. */
    const timer = window.setTimeout(() => setIsFloating(true), 220);
    return () => window.clearTimeout(timer);
  }, [isRendered, isAnchored]);

  /* isOnScreen = panel thực sự đang nhìn thấy được. Chỉ khi đó tấm phủ mới
     được phép tồn tại. */
  const isOnScreen = isAnchored || isFloating;

  /* Bật transition top/left SAU khung hình đầu tiên: panel lướt theo khi nút
     Cài đặt di chuyển lúc thanh navbar co giãn, thay vì nhảy từng nấc. */
  const [isSettled, setIsSettled] = useState(false);

  const [settledDeps, setSettledDeps] = useState({ isRendered, isAnchored });
  if (settledDeps.isRendered !== isRendered || settledDeps.isAnchored !== isAnchored) {
    setSettledDeps({ isRendered, isAnchored });
    if (!isRendered || !isAnchored) setIsSettled(false);
  }

  useEffect(() => {
    if (!isRendered || !isAnchored) return undefined;
    settledRafRef.current = window.requestAnimationFrame(() => setIsSettled(true));
    return () => {
      if (settledRafRef.current) window.cancelAnimationFrame(settledRafRef.current);
    };
  }, [isRendered, isAnchored]);

  if (!isRendered) return null;

  const handleResetCache = () => {
    const keep = [
      'fforum_current_user_email',
      AUTH_TOKEN_KEY,
      'fforum_users_registry',
      'fforum_questions',
      'fforum_solutions',
      'fforum_chat_messages',
      'fforum_clubs',
      'fforum_club_posts',
      'fforum_guest_id',
    ];
    safeStorage.removeWithPrefix('fforum_', keep);
    setResetDone('Đã xóa cache & tùy chỉnh giao diện.');
    setConfirmReset(null);
    setTimeout(() => window.location.reload(), 700);
  };

  const handleResetFull = () => {
    safeStorage.removeWithPrefix('fforum_');
    clearAuthToken();
    setResetDone('Đã đặt lại toàn bộ dữ liệu cục bộ.');
    setConfirmReset(null);
    setTimeout(() => window.location.reload(), 700);
  };

  /** Sao lưu toàn bộ dữ liệu F-Forum trên trình duyệt này ra một tệp JSON. */
  const handleExportData = () => {
    try {
      const payload = safeStorage.entriesWithPrefix('fforum_');
      const blob = new Blob(
        [JSON.stringify({ app: 'F-Forum', version: 2, exportedAt: new Date().toISOString(), data: payload }, null, 2)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `f-forum-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataNotice(`Đã xuất ${Object.keys(payload).length} nhóm dữ liệu ra tệp sao lưu.`);
    } catch {
      setDataNotice('Không thể xuất dữ liệu trên trình duyệt này.');
    }
  };

  /** Nhập lại tệp sao lưu — chỉ ghi các khóa fforum_ để tránh ô nhiễm localStorage. */
  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const data: Record<string, string> = parsed?.data ?? parsed;
        let imported = 0;
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith('fforum_') && typeof value === 'string') {
            safeStorage.setItem(key, value);
            imported += 1;
          }
        });
        setDataNotice(`Đã nhập ${imported} nhóm dữ liệu. Đang tải lại để áp dụng…`);
        setTimeout(() => window.location.reload(), 900);
      } catch {
        setDataNotice('Tệp không hợp lệ — hãy chọn đúng tệp sao lưu F-Forum (.json).');
      }
    };
    reader.readAsText(file);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: 'Giao diện', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'experience', label: 'Trải nghiệm', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'Hệ thống', icon: <Database className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Tấm phủ chỉ được tồn tại khi panel ĐANG NHÌN THẤY. Không bao giờ để một
          tấm phủ toàn màn hình sống một mình — đó là cách khoá cả trang. */}
      {isOnScreen ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Đóng cài đặt"
          onClick={onClose}
          className={`fixed inset-0 z-40 bg-transparent border-none outline-none cursor-default ${
            isClosing ? 'ff-backdrop-out' : 'ff-backdrop-in'
          }`}
        >
          <span aria-hidden="true" className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
        </button>
      ) : null}

      <div className={isAnchored ? 'contents' : 'ff-settings-layer'}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cài đặt F-Forum"
        className={`settings-modal liquid-glass fixed z-50 w-[calc(100vw-1.5rem)] max-w-[392px] max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-[26px] p-3.5 text-white shadow-[0_40px_120px_rgba(0,0,0,0.75)] ff-settings-panel ${
          isClosing ? 'ff-settings-panel--out' : 'ff-settings-panel--in'
        } ${
          isAnchored
            ? isSettled && !isClosing
              ? 'ff-settings-panel--settled'
              : ''
            : isFloating
            ? 'ff-settings-panel--floating'
            : 'ff-settings-panel--ghost'
        }`}
        style={
          {
            ...(isAnchored ? pop.style : { zIndex: 50 }),
            ['--ff-settings-origin' as string]: isAnchored
              ? (pop.style.transformOrigin as string) || 'top right'
              : 'center',
          } as React.CSSProperties
        }
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400/25 to-fuchsia-500/20 border border-amber-300/30 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 text-amber-300" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight">Trung tâm điều khiển</h3>
              <p className="text-[10px] text-white/55 leading-tight">
                Giao diện · Trải nghiệm · Dữ liệu học tập
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Đóng cài đặt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Premium segmented tabs */}
        <div className="relative grid grid-cols-3 gap-1 mt-2.5 p-1 rounded-2xl bg-black/40 border border-white/10">
          <span
            aria-hidden="true"
            className="absolute inset-y-1 w-[calc((100%-8px)/3)] rounded-xl bg-gradient-to-r from-amber-500/85 to-yellow-400/70 transition-transform duration-500"
            style={{
              transform: `translateX(${
                tabs.findIndex((t) => t.id === activeTab) * 100
              }%) translateX(${tabs.findIndex((t) => t.id === activeTab) * 4}px)`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.4, 0.5, 1)',
            }}
          />
          {tabs.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={on}
                className={`relative z-10 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                  on ? 'text-[#1b1204]' : 'text-white/60 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="mt-3 space-y-4 overflow-y-auto ff-scroll pr-0.5">
          {confirmReset && (
            <div className="p-3 rounded-2xl bg-red-500/15 border border-red-400/40">
              <p className="text-[11px] text-red-200 font-semibold mb-2">
                {confirmReset === 'cache'
                  ? 'Xóa cache & tùy chỉnh giao diện? Dữ liệu học tập vẫn được giữ.'
                  : 'Đặt lại toàn bộ dữ liệu cục bộ và đăng xuất khỏi thiết bị này?'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmReset === 'cache' ? handleResetCache : handleResetFull}
                  className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-[11px] font-bold cursor-pointer"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(null)}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
          {resetDone && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-[11px] text-emerald-200">
              {resetDone} Đang tải lại...
            </div>
          )}

          {/* ================= TAB 1: GIAO DIỆN ================= */}
          {activeTab === 'appearance' && (
            <>
              {/* 1. THEME */}
              <section>
                <SectionTitle icon={<Sparkles className="w-3 h-3 text-amber-300" />}>Theme</SectionTitle>
                <Card className="flex items-center justify-between gap-3 group">
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white tracking-wide">Chế độ hiển thị</span>
                      <span className="text-[10px] py-0.5 rounded-md font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-400/30 px-1.5">
                        {theme === 'light' ? 'Sáng' : 'Tối'}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1">
                      Chuyển giữa Obsidian tối và Pha lê sáng — toàn bộ app đổi theo tức thì.
                    </p>
                  </div>

                  {/* Cartoon Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme === 'light'}
                    aria-label="Chuyển chế độ Sáng / Tối"
                    onClick={onToggleTheme}
                    className={`relative w-[84px] h-[42px] rounded-full p-[3px] select-none cursor-pointer transition-all duration-500 shrink-0 group-hover:scale-105 active:scale-95 border ${
                      theme === 'light'
                        ? 'border-amber-400/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15),_0_0_18px_rgba(245,158,11,0.35)]'
                        : 'border-indigo-500/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),_0_0_15px_rgba(99,102,241,0.25)]'
                    }`}
                  >
                    <div className="rounded-full overflow-hidden pointer-events-none absolute inset-0">
                      <div
                        className={`absolute inset-0 transition-opacity duration-500 ${
                          theme === 'dark' ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1d] via-[#141b33] to-[#1e1b4b]" />
                        <svg
                          className="absolute top-2 right-3 w-3 h-3 text-amber-200 animate-pulse"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                        </svg>
                        <svg
                          className="absolute bottom-2 right-6 w-2 h-2 text-yellow-100 opacity-80"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                        </svg>
                        <div className="absolute top-3.5 right-8 w-1 h-1 rounded-full bg-white opacity-80 shadow-[0_0_4px_#fff]" />
                        <svg
                          className="absolute -bottom-1.5 right-0.5 w-8 h-5 text-indigo-400/35"
                          viewBox="0 0 32 20"
                          fill="currentColor"
                        >
                          <path d="M7 16 C4.5 16 2 14 2 11.5 C2 9 4 7 6.5 7 C7.5 4.5 10 3 13 3 C16.5 3 19.5 5 20 8.5 C21 8 22 8 23 8 C26 8 28.5 10.5 28.5 13.5 C28.5 16.5 26 19 23 19 L7 19 Z" />
                        </svg>
                      </div>

                      <div
                        className={`absolute inset-0 transition-opacity duration-500 ${
                          theme === 'light' ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#93c5fd]" />
                        <svg
                          className="absolute top-1 left-2 w-7 h-4 text-white/95 drop-shadow-sm"
                          viewBox="0 0 32 20"
                          fill="currentColor"
                        >
                          <path d="M6 16 C3.8 16 2 14.2 2 12 C2 9.8 3.8 8 6 8 C6.8 5.7 9 4 11.5 4 C14.5 4 17 6.1 17.5 9 C18.3 8.4 19.4 8 20.5 8 C23 8 25 10 25 12.5 C25 15 23 17 20.5 17 L6 17 Z" />
                        </svg>
                        <svg
                          className="absolute bottom-1 left-6 w-5 h-3 text-white/80"
                          viewBox="0 0 32 20"
                          fill="currentColor"
                        >
                          <path d="M6 16 C3.8 16 2 14.2 2 12 C2 9.8 3.8 8 6 8 C6.8 5.7 9 4 11.5 4 C14.5 4 17 6.1 17.5 9 C18.3 8.4 19.4 8 20.5 8 C23 8 25 10 25 12.5 C25 15 23 17 20.5 17 L6 17 Z" />
                        </svg>
                        <div className="absolute top-2 left-9 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                      </div>
                    </div>

                    <div
                      className={`relative w-[34px] h-[34px] rounded-full transition-transform duration-500 shadow-lg ${
                        theme === 'light' ? 'translate-x-[42px]' : 'translate-x-[1px]'
                      }`}
                      style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    >
                      {/* Moon */}
                      <div
                        className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#fef08a] via-[#fde047] to-[#fef9c3] border border-amber-200/90 shadow-[0_0_12px_rgba(250,204,21,0.65)] flex items-center justify-center transition-all duration-500 ${
                          theme === 'dark'
                            ? 'opacity-100 scale-100 rotate-0'
                            : 'opacity-0 scale-50 -rotate-90 pointer-events-none'
                        }`}
                      >
                        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-500/25" />
                        <span className="absolute bottom-2 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-500/20" />
                        <span className="absolute top-3 left-1.5 w-1 h-1 rounded-full bg-amber-500/20" />
                        <span className="absolute top-[18px] left-[5px] w-2 h-1 rounded-full bg-pink-400/60" />
                        <span className="absolute top-[18px] right-[5px] w-2 h-1 rounded-full bg-pink-400/60" />
                        <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                          <path d="M 8 14 Q 11 11 14 14" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M 18 14 Q 21 11 24 14" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M 13 19 Q 16 22 19 19" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>

                      {/* Sun */}
                      <div
                        className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#fde047] border border-yellow-200 shadow-[0_0_18px_rgba(245,158,11,0.85)] flex items-center justify-center transition-all duration-500 ${
                          theme === 'light'
                            ? 'opacity-100 scale-100 rotate-0'
                            : 'opacity-0 scale-50 rotate-90 pointer-events-none'
                        }`}
                      >
                        <svg
                          className="absolute -inset-1.5 w-[46px] h-[46px] text-amber-500/90 animate-[spin_10s_linear_infinite] pointer-events-none"
                          viewBox="0 0 46 46"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <line x1="23" y1="2" x2="23" y2="6" />
                          <line x1="23" y1="40" x2="23" y2="44" />
                          <line x1="2" y1="23" x2="6" y2="23" />
                          <line x1="40" y1="23" x2="44" y2="23" />
                          <line x1="8.1" y1="8.1" x2="11" y2="11" />
                          <line x1="35" y1="35" x2="37.9" y2="37.9" />
                          <line x1="8.1" y1="37.9" x2="11" y2="35" />
                          <line x1="35" y1="11" x2="37.9" y2="8.1" />
                        </svg>
                        <span className="absolute top-[18px] left-[5px] w-2 h-1 rounded-full bg-rose-400/80" />
                        <span className="absolute top-[18px] right-[5px] w-2 h-1 rounded-full bg-rose-400/80" />
                        <svg className="w-6 h-6 relative z-10" viewBox="0 0 32 32" fill="none">
                          <ellipse cx="10.5" cy="13" rx="1.6" ry="2.2" fill="#78350f" />
                          <circle cx="10" cy="12.2" r="0.6" fill="#ffffff" />
                          <ellipse cx="21.5" cy="13" rx="1.6" ry="2.2" fill="#78350f" />
                          <circle cx="21" cy="12.2" r="0.6" fill="#ffffff" />
                          <path d="M 11 18 Q 16 25 21 18" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M 13.5 21 Q 16 23.5 18.5 21" fill="#f43f5e" />
                        </svg>
                      </div>
                    </div>
                  </button>
                </Card>
              </section>

              {/* 2. GRADIENT — bảng chọn màu cao cấp (thay dải nút gradient cũ) */}
              <section>
                <SectionTitle icon={<Zap className="w-3 h-3 text-fuchsia-300" />}>Gradient không gian</SectionTitle>
                <Card className="space-y-3">
                  {/* Live preview */}
                  <div
                    className="relative h-[74px] rounded-2xl overflow-hidden border border-white/15"
                    style={{ background: activePreset.gradient }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <div className="absolute inset-0 px-3 py-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white drop-shadow">{activePreset.name}</span>
                        <span className="text-[10px] font-mono text-white/85 bg-black/40 border border-white/15 rounded-full px-2 py-0.5">
                          {godrayIntensity}% độ rực
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-5 h-5 rounded-full border-2 border-white/70 shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                          style={{ background: activePreset.accent }}
                        />
                        <span className="text-[10px] font-mono text-white/80">{activePreset.accent}</span>
                        <span className="ml-auto text-[10px] text-white/70">Xem trước trực tiếp</span>
                      </div>
                    </div>
                  </div>

                  {/* Swatch grid */}
                  <div role="radiogroup" aria-label="Bảng chọn Gradient" className="grid grid-cols-4 gap-2">
                    {GODRAY_PRESETS.map((p) => {
                      const on = godrayPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          title={p.name}
                          onClick={() => onSelectGodray?.(p.id)}
                          className="group/sw flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <span
                            className="ff-grad-tile w-full h-7 flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${p.accent}, ${p.accent}55)` }}
                          >
                            {on && (
                              <span className="relative z-10 w-4 h-4 rounded-full bg-black/45 border border-white/70 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-[9px] font-semibold leading-none ${
                              on ? 'text-amber-300' : 'text-white/55 group-hover/sw:text-white/85'
                            }`}
                          >
                            {p.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Intensity */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-semibold text-white/70 shrink-0">Độ rực</span>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={godrayIntensity}
                      onChange={(e) => onChangeGodrayIntensity?.(parseInt(e.target.value, 10))}
                      aria-label="Độ rực gradient"
                      className="ff-range w-full"
                      style={{
                        background: `linear-gradient(90deg, ${activePreset.accent} ${godrayIntensity}%, rgba(255,255,255,0.16) ${godrayIntensity}%)`,
                      }}
                    />
                    <span className="text-[10px] font-mono text-amber-300 shrink-0 w-8 text-right">
                      {godrayIntensity}%
                    </span>
                  </div>
                </Card>
              </section>

              {/* 3. HIỂN THỊ */}
              <section>
                <SectionTitle icon={<Sparkles className="w-3 h-3 text-cyan-300" />}>Hiển thị &amp; kính mờ</SectionTitle>
                <Card className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 justify-center">
                    <span className="text-[10px] font-semibold text-white/70">Cỡ chữ hệ thống</span>
                    <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-xl border border-white/10">
                      {(['sm', 'md', 'lg'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => onChangeFontSize?.(sz)}
                          aria-pressed={fontSize === sz}
                          className={`px-2 py-1 flex-1 rounded-lg text-[10px] font-mono cursor-pointer transition-colors ${
                            fontSize === sz
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {sz === 'sm' ? 'A−' : sz === 'md' ? 'A' : 'A+'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 justify-center">
                    <span className="text-[10px] font-semibold text-white/70">Độ mờ kính</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="range"
                        min={6}
                        max={28}
                        value={glassBlur}
                        onChange={(e) => onChangeGlassBlur?.(parseInt(e.target.value, 10))}
                        aria-label="Độ mờ kính"
                        className="ff-range w-full"
                        style={{
                          background: `linear-gradient(90deg, #22d3ee ${((glassBlur - 6) / 22) * 100}%, rgba(255,255,255,0.16) ${((glassBlur - 6) / 22) * 100}%)`,
                        }}
                      />
                      <span className="text-[10px] font-mono text-cyan-300 shrink-0 w-6 text-right">{glassBlur}px</span>
                    </div>
                  </div>
                </Card>
              </section>
            </>
          )}

          {/* ================= TAB 2: TRẢI NGHIỆM ================= */}
          {activeTab === 'experience' && (
            <>
              {/* 4. NAVBAR — mockup màn hình mini, không còn hàng nút thô */}
              <section>
                <SectionTitle icon={<Move className="w-3 h-3 text-amber-300" />}>Thanh điều hướng</SectionTitle>
                <Card className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-white">Neo thanh điều hướng</p>
                      <p className="text-[10px] text-white/50">Chạm vào một cạnh của khung để đặt vị trí</p>
                    </div>
                    <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono shrink-0">
                      {DOCK_LABEL[navbarPosition]}
                    </span>
                  </div>

                  <div className="ff-dock-mock h-[124px] w-full p-2">
                    <div className="relative h-full w-full rounded-[14px] border border-white/10 bg-black/35 overflow-hidden">
                      {/* mini nav preview */}
                      <div
                        className={`absolute flex items-center justify-center gap-1 transition-all duration-500 ${
                          navbarPosition === 'top'
                            ? 'top-1.5 inset-x-6 h-2.5'
                            : navbarPosition === 'bottom'
                            ? 'bottom-1.5 inset-x-6 h-2.5'
                            : navbarPosition === 'left'
                            ? 'left-1.5 inset-y-6 w-2.5 flex-col'
                            : 'right-1.5 inset-y-6 w-2.5 flex-col'
                        }`}
                        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.4, 0.5, 1)' }}
                        aria-hidden="true"
                      >
                        <span className="flex-1 w-full h-full rounded-full bg-gradient-to-r from-amber-400/70 to-yellow-300/40 shadow-[0_0_12px_rgba(245,158,11,0.45)]" />
                      </div>

                      {/* fake content blocks */}
                      <div className="absolute inset-4 rounded-xl border border-white/5 bg-white/[0.03]" />

                      {/* 4 vùng cạnh mini screen */}
                      {(
                        [
                          { id: 'top' as const, cls: 'top-1 left-1/2 -translate-x-1/2 w-[86px] h-3.5' },
                          { id: 'bottom' as const, cls: 'bottom-1 left-1/2 -translate-x-1/2 w-[86px] h-3.5' },
                          { id: 'left' as const, cls: 'left-1 top-1/2 -translate-y-1/2 h-[60px] w-3.5' },
                          { id: 'right' as const, cls: 'right-1 top-1/2 -translate-y-1/2 h-[60px] w-3.5' },
                        ]
                      ).map((zone) => (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => onSelectNavbarPosition?.(zone.id)}
                          data-active={navbarPosition === zone.id ? 'true' : 'false'}
                          aria-label={`Đặt thanh điều hướng ở cạnh ${zone.id}`}
                          title={DOCK_LABEL[zone.id]}
                          className={`ff-dock-zone ${zone.cls}`}
                        >
                          <span className="text-[8px] font-mono font-bold text-white/70 leading-none">
                            {DOCK_LABEL[zone.id]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SwitchRow
                      icon={<MousePointer2 className="w-3.5 h-3.5 text-cyan-400" />}
                      title="Chỉ hiện icon"
                      desc="Thu gọn thành dải icon"
                      on={alwaysCompact}
                      onToggle={() => onToggleAlwaysCompact?.()}
                      color="bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                    />
                    <SwitchRow
                      icon={<Eye className="w-3.5 h-3.5 text-amber-400" />}
                      title="Tự ẩn khi rời chuột"
                      desc="Hiện lại khi tới sát mép"
                      on={navbarAutoHide}
                      onToggle={() => onToggleNavbarAutoHide?.()}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => onSwapNavbarPosition?.()}
                    className="w-full px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/75 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/35 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Move className="w-3.5 h-3.5 text-amber-400" />
                    Xoay vòng vị trí (Trên → Dưới → Trái → Phải)
                  </button>
                </Card>
              </section>

              {/* 5. MOTION & PERFORMANCE */}
              <section>
                <SectionTitle icon={<Zap className="w-3 h-3 text-amber-300" />}>Chuyển động &amp; hiệu năng</SectionTitle>
                <Card className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-2">
                    <SwitchRow
                      icon={<Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                      title="Hiệu ứng âm thanh"
                      on={soundEffects}
                      onToggle={onToggleSoundEffects}
                    />
                    <SwitchRow
                      icon={<Zap className="w-3.5 h-3.5 text-cyan-400" />}
                      title="Giảm chuyển động"
                      on={reducedMotion}
                      onToggle={onToggleReducedMotion}
                      color="bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                    />
                  </div>
                  <SwitchRow
                    icon={<Zap className="w-3.5 h-3.5 text-orange-400" />}
                    title="Potator Mode"
                    desc="Nền tĩnh, giảm blur nặng, giữ chuyển động"
                    on={potatoMode ?? false}
                    onToggle={() => onTogglePotatoMode?.()}
                    color="bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                  />

                  {/* Potator Mode preview (khi bật) */}
                  {potatoMode && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
                      <div className="relative h-20 w-full">
                        {/* Potator Mesh Background inline */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <div
                            className="absolute rounded-full"
                            style={{
                              width: '60vmax',
                              height: '60vmax',
                              top: '-20%',
                              left: '-10%',
                              background: 'radial-gradient(circle at 30% 40%, rgba(245,158,11,0.4), transparent 60%), radial-gradient(circle at 70% 60%, rgba(244,114,182,0.3), transparent 55%)',
                              filter: 'blur(100px)',
                              opacity: 0.5,
                              animation: 'potatorMeshDrift 22s ease-in-out infinite',
                            }}
                          />
                          <div
                            className="absolute rounded-full"
                            style={{
                              width: '50vmax',
                              height: '50vmax',
                              bottom: '-15%',
                              right: '-5%',
                              background: 'radial-gradient(circle at 60% 30%, rgba(167,139,250,0.35), transparent 55%), radial-gradient(circle at 40% 70%, rgba(34,211,238,0.25), transparent 50%)',
                              filter: 'blur(90px)',
                              opacity: 0.4,
                              animation: 'potatorMeshDrift 24s ease-in-out infinite reverse',
                            }}
                          />
                        </div>
                        {/* Overlay text */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Potator Mode đang hoạt động</div>
                            <div className="text-[11px] text-neutral-400">CSS Aurora Mesh · Bento Grid · Liquid Glass</div>
                          </div>
                        </div>
                        {/* Vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      </div>
                    </div>
                  )}
                </Card>
              </section>

              {/* 6. KHÔNG GIAN TẬP TRUNG */}
              <section>
                <SectionTitle icon={<Volume2 className="w-3 h-3 text-emerald-300" />}>Không gian tập trung</SectionTitle>
                <Card className="space-y-2.5">

                  <SwitchRow
                    icon={<Eye className="w-3.5 h-3.5 text-emerald-400" />}
                    title="Nhắc nghỉ mắt 20-20-20"
                    desc="Cứ 20 phút, nghỉ mắt 20 giây"
                    on={eyeRestEnabled}
                    onToggle={() => onToggleEyeRest?.()}
                    color="bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onOpenFocusMode}
                      className="px-3 py-2 rounded-xl text-[11px] font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Mở Focus Mode</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('fforum_eye_rest_now'))}
                      className="px-3 py-2 rounded-xl text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Nghỉ mắt ngay</span>
                    </button>
                  </div>
                </Card>
              </section>

              {/* 7. PHÍM TẮT ẨN */}
              <section>
                <SectionTitle icon={<Keyboard className="w-3 h-3 text-violet-300" />}>Phím tắt ẩn</SectionTitle>
                <Card className="space-y-1.5">
                  {SHORTCUTS.map((sc) => (
                    <div key={sc.label} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-white/75 truncate">{sc.label}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        {sc.keys.map((k) => (
                          <kbd
                            key={k}
                            className="text-[9.5px] font-mono font-bold text-white/85 bg-white/10 border border-white/20 rounded-md px-1.5 py-0.5 shadow-[0_2px_0_rgba(0,0,0,0.4)]"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] text-white/45 pt-1 flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0 text-amber-300" />
                    Bảng lệnh (Ctrl + K) gom toàn bộ phân khu và tác vụ — gõ không dấu vẫn tìm được.
                  </p>
                </Card>
              </section>
            </>
          )}

          {/* ================= TAB 3: HỆ THỐNG ================= */}
          {activeTab === 'system' && (
            <>
              {/* 8. SAO LƯU & DỮ LIỆU */}
              <section>
                <SectionTitle icon={<ShieldCheck className="w-3 h-3 text-emerald-300" />}>Sao lưu &amp; dữ liệu</SectionTitle>
                <Card className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="px-2 py-2 rounded-xl text-[11px] font-semibold text-emerald-200 bg-emerald-500/12 hover:bg-emerald-500/22 border border-emerald-400/30 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Xuất bản sao lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-2 rounded-xl text-[11px] font-semibold text-sky-200 bg-sky-500/12 hover:bg-sky-500/22 border border-sky-400/30 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Nhập bản sao lưu
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportData(file);
                      e.target.value = '';
                    }}
                  />
                  {dataNotice && (
                    <p className="text-[10.5px] text-amber-200 bg-amber-500/12 border border-amber-400/30 rounded-xl px-2.5 py-2">
                      {dataNotice}
                    </p>
                  )}
                  <p className="text-[10px] text-white/45 leading-snug flex items-start gap-1.5">
                    <NotebookPen className="w-3 h-3 mt-0.5 shrink-0 text-amber-300" />
                    Bản sao lưu gồm ghi chú, điểm danh, cài đặt giao diện và hồ sơ tạm trên máy này.
                  </p>
                </Card>
              </section>

              {/* 9. XÓA DỮ LIỆU CỤC BỘ */}
              <section>
                <SectionTitle icon={<Trash2 className="w-3 h-3 text-red-300" />}>Dữ liệu cục bộ</SectionTitle>
                <Card className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset('cache')}
                      className="px-2 py-2 rounded-xl text-[11px] font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer"
                      title="Xóa cache và các tùy chỉnh giao diện đã lưu trên máy này"
                    >
                      Xóa cache &amp; tùy chỉnh
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset('full')}
                      className="px-2 py-2 rounded-xl text-[11px] font-semibold text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-400/50 transition-all cursor-pointer"
                      title="Đặt lại toàn bộ dữ liệu cục bộ và đăng xuất"
                    >
                      Đặt lại toàn bộ
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">
                    Dữ liệu được lưu trên trình duyệt này. Nội dung đã gửi lên máy chủ (câu hỏi, tin nhắn...) không
                    bị ảnh hưởng.
                  </p>
                </Card>
              </section>

              {/* 10. THÔNG TIN */}
              <section>
                <SectionTitle icon={<Info className="w-3 h-3 text-amber-300" />}>Về F-Forum</SectionTitle>
                <Card className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11.5px] font-semibold text-white">F-Forum Platform</p>
                    <p className="text-[10px] text-white/50">Bản nâng cấp 2.0 · 2026</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-500/12 border border-emerald-400/30 rounded-full px-2 py-0.5">
                    <Command className="w-3 h-3" />
                    Ctrl + K
                  </span>
                </Card>
              </section>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default SettingsModal;
