import React from 'react';
import { X, Command as CommandIcon, Search, NotebookPen, Contrast, Timer, ArrowUp, CornerDownLeft } from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Mở bảng lệnh — để người dùng nhảy thẳng sang đó từ bảng trợ giúp. */
  onOpenPalette?: () => void;
}

/** Phím điều khiển hiển thị theo hệ điều hành: ⌘ trên macOS, Ctrl nơi khác. */
const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

interface ShortcutRow {
  keys: string[];
  label: string;
  icon: React.ReactNode;
  note?: string;
}

const GROUPS: { title: string; rows: ShortcutRow[] }[] = [
  {
    title: 'Điều hướng & tìm kiếm',
    rows: [
      {
        keys: [MOD, 'K'],
        label: 'Mở bảng lệnh & tìm kiếm toàn cục',
        icon: <Search className="w-4 h-4" />,
        note: 'Tìm câu hỏi, câu lạc bộ, thành viên',
      },
      {
        keys: [MOD, '/'],
        label: 'Mở bảng phím tắt này',
        icon: <CommandIcon className="w-4 h-4" />,
      },
      { keys: ['Esc'], label: 'Đóng hộp thoại đang mở', icon: <X className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Công cụ học tập',
    rows: [
      {
        keys: [MOD, 'I'],
        label: 'Bật / tắt sổ tay nhanh',
        icon: <NotebookPen className="w-4 h-4" />,
        note: 'Không hoạt động khi đang gõ trong ô nhập',
      },
      {
        keys: [MOD, 'Shift', 'F'],
        label: 'Vào không gian tập trung',
        icon: <Timer className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'Giao diện',
    rows: [
      {
        keys: [MOD, 'Shift', 'L'],
        label: 'Đổi chế độ Sáng / Tối',
        icon: <Contrast className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'Trong bảng lệnh',
    rows: [
      { keys: ['↑', '↓'], label: 'Di chuyển giữa các kết quả', icon: <ArrowUp className="w-4 h-4" /> },
      { keys: ['Enter'], label: 'Chạy lệnh / mở kết quả đang chọn', icon: <CornerDownLeft className="w-4 h-4" /> },
      { keys: ['Esc'], label: 'Đóng bảng lệnh', icon: <X className="w-4 h-4" /> },
    ],
  },
];

/**
 * Bảng liệt kê phím tắt.
 *
 * App có bốn tổ hợp phím nhưng không nơi nào cho người dùng biết chúng tồn tại —
 * tính năng ẩn thì coi như không có. Bảng này cũng nói rõ phím nào KHÔNG chạy khi
 * đang gõ trong ô nhập, để khỏi tưởng là bị lỗi.
 */
export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onOpenPalette,
}) => {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="Bảng phím tắt"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng bảng phím tắt"
        className="absolute inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={onClose}
      />

      <div className="ff-shortcuts relative w-full max-w-[560px] max-h-[86vh] overflow-y-auto rounded-[26px] border border-white/15 bg-[#0b1017]/96 shadow-[0_50px_140px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b1017]/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-white">Phím tắt</h2>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              {isMac ? 'Dùng phím ⌘ trên macOS' : 'Dùng phím Ctrl trên Windows/Linux'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 rounded-xl border border-white/15 p-2 text-neutral-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-4">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-amber-300/90">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.rows.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
                  >
                    <span className="shrink-0 text-amber-300/80">{row.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-white/90">
                        {row.label}
                      </span>
                      {row.note && (
                        <span className="mt-0.5 block text-[10.5px] text-neutral-400">{row.note}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {row.keys.map((key) => (
                        <kbd
                          key={key}
                          className="ff-shortcuts__key min-w-[24px] rounded-lg border border-white/20 bg-white/[0.07] px-1.5 py-1 text-center text-[10.5px] font-bold text-white/85 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {onOpenPalette && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPalette();
              }}
              className="w-full rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-400/15 to-yellow-200/5 px-4 py-3 text-[12.5px] font-bold text-amber-200 transition hover:from-amber-400/25 hover:to-yellow-200/10 cursor-pointer"
            >
              Mở bảng lệnh &amp; tìm kiếm ngay
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
