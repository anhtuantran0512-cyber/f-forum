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
    title: 'Điều hướng',
    rows: [
      {
        keys: [MOD, 'K'],
        label: 'Bảng lệnh & tìm kiếm',
        icon: <Search className="w-4 h-4" />,
      },
      {
        keys: [MOD, '/'],
        label: 'Phím tắt',
        icon: <CommandIcon className="w-4 h-4" />,
      },
      { keys: ['Esc'], label: 'Đóng hộp thoại', icon: <X className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Học tập',
    rows: [
      {
        keys: [MOD, 'I'],
        label: 'Sổ tay nhanh',
        icon: <NotebookPen className="w-4 h-4" />,
      },
      {
        keys: [MOD, 'Shift', 'F'],
        label: 'Phòng tập trung',
        icon: <Timer className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'Giao diện',
    rows: [
      {
        keys: [MOD, 'Shift', 'L'],
        label: 'Đổi Sáng / Tối',
        icon: <Contrast className="w-4 h-4" />,
      },
    ],
  },
  {
    title: 'Bảng lệnh',
    rows: [
      { keys: ['↑', '↓'], label: 'Di chuyển', icon: <ArrowUp className="w-4 h-4" /> },
      { keys: ['Enter'], label: 'Chọn', icon: <CornerDownLeft className="w-4 h-4" /> },
      { keys: ['Esc'], label: 'Đóng', icon: <X className="w-4 h-4" /> },
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

      <div className="ff-shortcuts modal-container relative w-full max-w-[520px] max-h-[86vh] overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d111a]/95 px-5 py-3.5 backdrop-blur-xl">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-[#f4f1de]">Phím tắt</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="ff-tactile-btn shrink-0 rounded-xl border border-white/15 p-2 text-neutral-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#f2cc8f]">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.rows.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2"
                  >
                    <span className="shrink-0 text-[#f2cc8f]">{row.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-[#f4f1de]">
                        {row.label}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {row.keys.map((key) => (
                        <kbd
                          key={key}
                          className="ff-shortcuts__key min-w-[24px] rounded-lg border border-white/20 bg-[#0b0d12] px-1.5 py-1 text-center text-[10.5px] font-bold text-[#f4f1de] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]"
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
              className="ff-tactile-btn w-full rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] hover:bg-[#f2cc8f] px-4 py-2.5 text-xs font-extrabold text-[#0b0d12] transition cursor-pointer"
            >
              Mở Bảng lệnh
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
