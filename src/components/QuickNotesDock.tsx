/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NotebookPen, Copy, Check, Trash2, X, Timer, Flame, Lightbulb, BookMarked } from 'lucide-react';
import { safeStorage } from '../utils/storage';
import { OrbButton } from './ui/OrbButton';

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

  const savedLabel = savedAt ? 'Đã lưu' : 'Tự lưu';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(64px+var(--safe-bottom))] z-[92] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]">
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Sổ tay nhanh"
        className="ff-notes-panel modal-container liquid-glass relative overflow-hidden text-[#f4f1de]"
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-[#81b29a] via-[#f2cc8f] to-[#e07a5f]" aria-hidden="true" />

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-dashed border-[#f4f1de]/15">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-[#81b29a]/20 border-[1.5px] border-[#81b29a]/50 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_rgba(4,6,11,0.9)]">
              <NotebookPen className="w-4 h-4 text-[#81b29a]" />
            </span>
            <div className="min-w-0 flex items-center gap-2">
              <p className="text-[13px] font-extrabold leading-tight text-[#f4f1de]">Sổ tay nhanh</p>
              <span className="text-[10px] font-mono text-[#9a978e]">{savedLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ff-tactile-btn p-1.5 rounded-lg bg-[#0b0d12] border border-[#f4f1de]/18 text-[#d8d5ce] hover:text-[#f4f1de] transition-colors cursor-pointer shrink-0"
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
                className="ff-tactile-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#0b0d12] hover:bg-[#e07a5f]/20 border border-[#f4f1de]/18 hover:border-[#f2cc8f]/50 text-[#d8d5ce] hover:text-[#f4f1de] transition-all cursor-pointer"
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
            placeholder="Ghi nhanh công thức, ý tưởng..."
            className="ff-scroll w-full h-[150px] sm:h-[190px] resize-none rounded-xl bg-[#0b0d12] border-[1.5px] border-[#f4f1de]/18 focus:border-[#f2cc8f] p-3 text-xs leading-relaxed text-[#f4f1de] placeholder-[#84817a] focus:outline-none transition-colors font-mono"
          />

          <div className="flex items-center justify-between gap-2 text-[10px] text-white/45">
            <span className="font-mono">
              {stats.words} từ · {notes.length}/5000 ký tự
              {stats.pending > 0 && <span className="text-amber-300"> · {stats.pending} hạn chót</span>}
            </span>
            <div className="flex items-center gap-2.5 pr-0.5">
              {/* Nhiemvu_6 · nút orb: teal (vào Focus) · silver (chép) → mauve ✓ khi đã chép · rose (xoá) */}
              {onOpenFocusMode && (
                <OrbButton
                  size="sm"
                  tone="teal"
                  motion="spin"
                  labelSide="top"
                  index={0}
                  label="Vào Focus"
                  icon={<Timer className="w-4 h-4" />}
                  onClick={() => {
                    onClose();
                    onOpenFocusMode();
                  }}
                />
              )}
              <OrbButton
                size="sm"
                tone={copied ? 'mauve' : 'silver'}
                motion={copied ? 'check' : 'fly'}
                labelSide="top"
                index={1}
                label={copied ? 'Đã chép' : 'Sao chép'}
                icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                onClick={handleCopy}
              />
              <OrbButton
                size="sm"
                tone="rose"
                labelSide="top"
                index={2}
                label="Xóa"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setNotes('')}
                disabled={!notes}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickNotesDock;
