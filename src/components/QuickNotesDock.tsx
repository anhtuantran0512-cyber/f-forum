/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NotebookPen, Copy, Check, Trash2, X, Timer, Flame, Lightbulb, BookMarked } from 'lucide-react';
import { safeStorage } from '../utils/storage';

export const QUICK_NOTES_KEY = 'fforum_focus_scratchpad';

/**
 * Sổ tay nhanh toàn cục (⌘/Ctrl + I)
 * ------------------------------------------------------------------
 * Tính năng ẩn nhưng tiện: mở nhanh ở bất kỳ phân khu nào, tự động lưu
 * và dùng CHUNG một cuốn sổ với Focus Sanctuary nên ghi chú luôn ở bên bạn.
 */
export interface QuickNotesDockProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFocusMode?: () => void;
}

const TEMPLATES: { id: string; label: string; icon: React.ReactNode; text: string }[] = [
  {
    id: 'deadline',
    label: 'Hạn chót',
    icon: <BookMarked className="w-3 h-3" />,
    text: '\n[HẠN CHÓT] Môn:  · Hạn nộp:  · Ghi chú: ',
  },
  {
    id: 'idea',
    label: 'Ý tưởng',
    icon: <Lightbulb className="w-3 h-3" />,
    text: '\n[Ý TƯỞNG] ',
  },
  {
    id: 'formula',
    label: 'Công thức',
    icon: <Flame className="w-3 h-3" />,
    text: '\n[CÔNG THỨC] ',
  },
];

export const QuickNotesDock: React.FC<QuickNotesDockProps> = ({ isOpen, onClose, onOpenFocusMode }) => {
  const [notes, setNotes] = useState(() => safeStorage.getItem(QUICK_NOTES_KEY) || '');
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);

  /* Nạp lại ghi chú từ localStorage mỗi lần mở — dùng mẫu "điều chỉnh state khi
     prop đổi" để tránh setState trong effect (gây một lượt render thừa). */
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setNotes(safeStorage.getItem(QUICK_NOTES_KEY) || '');
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    const t = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      safeStorage.setItem(QUICK_NOTES_KEY, notes);
      window.dispatchEvent(new CustomEvent('fforum_notes_sync'));
      setSavedAt(Date.now());
    }, 450);
  }, [notes, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    textareaRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    const trimmed = notes.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const pending = (notes.match(/\[HẠN CHÓT\]/gi) || []).length;
    return { words, pending };
  }, [notes]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard không khả dụng */
    }
  };

  const insertTemplate = (text: string) => {
    setNotes((prev) => `${prev}${text}`);
    textareaRef.current?.focus();
  };

  const savedLabel = savedAt ? 'Đã lưu' : 'Tự động lưu khi bạn gõ';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(64px+var(--safe-bottom))] z-[92] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]">
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Sổ tay nhanh"
        className="ff-notes-panel relative overflow-hidden rounded-[24px] border border-white/15 bg-[#0b1017]/95 text-white shadow-[0_40px_110px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
      >
        <div className="h-[3px] w-full ff-aurora-bar" aria-hidden="true" />

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/25 to-emerald-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <NotebookPen className="w-4 h-4 text-cyan-300" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight">Sổ tay nhanh</p>
              <p className="text-[10px] text-white/45 truncate">{savedLabel} · dùng chung với Focus Sanctuary</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Đóng sổ tay nhanh"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => insertTemplate(tpl.text)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 text-white/75 hover:text-white transition-all cursor-pointer"
              >
                {tpl.icon}
                {tpl.label}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={notes}
            maxLength={5000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi nhanh công thức, deadline, ý tưởng bài tập… Nội dung được lưu ngay trên trình duyệt này."
            className="ff-scroll w-full h-[150px] sm:h-[190px] resize-none rounded-2xl bg-black/45 border border-white/10 focus:border-cyan-400/50 p-3 text-xs leading-relaxed text-neutral-100 placeholder-neutral-500 focus:outline-none transition-colors font-mono"
          />

          <div className="flex items-center justify-between gap-2 text-[10px] text-white/45">
            <span className="font-mono">
              {stats.words} từ · {notes.length}/5000 ký tự
              {stats.pending > 0 && <span className="text-amber-300"> · {stats.pending} hạn chót</span>}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Đã chép' : 'Sao chép'}
              </button>
              <button
                type="button"
                onClick={() => setNotes('')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Xóa
              </button>
              {onOpenFocusMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFocusMode();
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 transition-colors cursor-pointer"
                >
                  <Timer className="w-3 h-3" />
                  Vào Focus
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickNotesDock;
