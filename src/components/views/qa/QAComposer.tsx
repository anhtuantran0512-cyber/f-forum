/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Image as ImageIcon, Sigma, Sparkles, X } from 'lucide-react';
import type { User } from '../../../types';
import { useDraftAutosave } from '../../../utils/useDraftAutosave';
import { useMediaQuery } from '../../../utils/useMediaQuery';
import { insertAtSelection } from '../../../utils/qaDetail';
import { handleImageUpload } from '../../../utils/qaImage';
import { MathSymbolsBar, MathSymbolsSheet } from './MathSymbols';
import './QADetail.css';

/* Giới hạn nội dung lời giải — cùng giá trị máy chủ và bản modal cũ dùng. */
const SOLUTION_MAX_LENGTH = 1500;
/* Chờ giữa hai lần gửi (giây) — giữ nguyên bản cũ. */
const SOLUTION_COOLDOWN_SECONDS = 3;

interface QAComposerProps {
  questionId: string;
  currentUser: User | null;
  onSubmit: (questionId: string, content: string, imageUrl?: string) => void;
  onOpenLoginModal?: () => void;
}

/**
 * Ô "Đóng góp lời giải (+25 XP)". Chỉ đổi KHUNG so với modal cũ — nghiệp vụ giữ nguyên:
 * phải đăng nhập mới gửi được, chờ 3 giây giữa hai lần gửi, tối đa 1500 ký tự, ảnh ≤ 20MB.
 * Thêm hai thứ vì giờ đây rời trang rất dễ (nút Back): bản nháp tự lưu theo từng câu hỏi,
 * và ký hiệu chèn đúng chỗ con trỏ thay vì luôn nối vào cuối.
 */
export const QAComposer: React.FC<QAComposerProps> = ({ questionId, currentUser, onSubmit, onOpenLoginModal }) => {
  const draftInitial = useMemo(() => ({ text: '' }), []);
  const {
    fields,
    setField,
    restoredAt,
    hasRestoredDraft,
    clearDraft,
    discardDraft,
  } = useDraftAutosave(`fforum_draft_solution_${questionId}`, draftInitial);
  const text = fields.text;

  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [symbolsOpen, setSymbolsOpen] = useState(false);
  const isPhone = useMediaQuery('(max-width: 767px)');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submit = () => {
    if (cooldown > 0 || isSubmitting) return;
    if (!text.trim()) return;
    if (!currentUser) {
      alert('Vui lòng đăng nhập để gửi câu trả lời!');
      onOpenLoginModal?.();
      return;
    }
    setIsSubmitting(true);
    onSubmit(questionId, text.trim().slice(0, SOLUTION_MAX_LENGTH), image || undefined);
    setField('text', '');
    clearDraft();
    setImage(null);
    setImageError(null);
    setIsSubmitting(false);
    setSymbolsOpen(false);
    setCooldown(SOLUTION_COOLDOWN_SECONDS);
  };

  const insertSymbol = (symbol: string) => {
    const editor = editorRef.current;
    const { text: next, caret } = insertAtSelection(
      text,
      editor?.selectionStart,
      editor?.selectionEnd,
      symbol,
      SOLUTION_MAX_LENGTH,
    );
    setField('text', next);
    /* Đặt lại con trỏ sau khi React ghi giá trị mới vào ô (không ép focus: trên điện thoại sẽ bật bàn phím che mất bảng). */
    requestAnimationFrame(() => editor?.setSelectionRange(caret, caret));
  };

  const toggleSymbols = () => {
    const next = !symbolsOpen;
    setSymbolsOpen(next);
    /* Bottom sheet che nửa dưới màn hình → đưa ô soạn lên phần nhìn thấy được. */
    if (next && isPhone) fieldRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const submitLabel = cooldown > 0 ? `Chờ ${cooldown}s...` : isSubmitting ? 'Đang gửi...' : 'Gửi lời giải';

  return (
    <section
      aria-labelledby="qa-composer-title"
      className="liquid-glass rounded-3xl border border-white/15 bg-neutral-950/70 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 id="qa-composer-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <span aria-hidden="true">✍️</span> Đóng góp lời giải
        </h2>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs font-mono font-bold text-cyan-300">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> +25 XP
        </span>
      </div>

      {hasRestoredDraft && text && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-2">
          <span className="min-w-0 flex-1 text-xs leading-snug text-amber-100">
            Đã khôi phục bản nháp
            {restoredAt
              ? ` lưu lúc ${new Date(restoredAt).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                })}`
              : ''}
            .
          </span>
          <button
            type="button"
            onClick={discardDraft}
            className="shrink-0 rounded-lg border border-amber-300/30 px-2 py-1 text-[11px] font-bold text-amber-200 transition hover:bg-amber-400/20 cursor-pointer"
          >
            Bỏ nháp
          </button>
        </div>
      )}

      <div ref={fieldRef} className="scroll-mt-28">
        <label htmlFor="qa-composer-text" className="sr-only">
          Nội dung lời giải
        </label>
        <textarea
          id="qa-composer-text"
          ref={editorRef}
          rows={6}
          maxLength={SOLUTION_MAX_LENGTH}
          value={text}
          onChange={(e) => setField('text', e.target.value)}
          placeholder="Nhập chi tiết từng bước giải bài, định lý hoặc lời khuyên học tập..."
          className="w-full min-h-36 bg-neutral-900 border border-white/15 rounded-2xl px-4 py-3 text-sm sm:text-[15px] leading-relaxed text-white placeholder-neutral-400 focus:outline-none focus:border-cyan-400 resize-y"
        />
        <div className="mt-1 text-right text-[11px] font-mono text-neutral-400" aria-hidden="true">
          {text.length}/{SOLUTION_MAX_LENGTH}
        </div>
      </div>

      {symbolsOpen && !isPhone && <MathSymbolsBar onInsert={insertSymbol} />}

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSymbols}
            aria-expanded={symbolsOpen}
            className={`inline-flex items-center gap-1.5 px-3 min-h-10 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              symbolsOpen
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-white/5 border-white/15 text-neutral-200 hover:bg-white/10'
            }`}
          >
            <Sigma className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span>Bảng ký hiệu</span>
          </button>

          {image ? (
            <div className="inline-flex items-center gap-2 px-3 min-h-10 rounded-xl bg-white/10 border border-white/20 text-xs text-cyan-300">
              <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đã đính kèm ảnh</span>
              <button
                type="button"
                onClick={() => setImage(null)}
                className="p-0.5 rounded-full hover:bg-red-500/30 text-red-400 cursor-pointer"
                title="Gỡ ảnh"
                aria-label="Gỡ ảnh đính kèm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="qa-composer-image"
              className="inline-flex items-center gap-1.5 px-3 min-h-10 rounded-xl border border-dashed border-white/20 hover:border-cyan-400/50 bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-200 cursor-pointer transition-all focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cyan-300"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span>Đính kèm ảnh</span>
              <input
                id="qa-composer-image"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setImage, setImageError)}
                className="sr-only"
              />
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || cooldown > 0 || isSubmitting}
          className="inline-flex items-center justify-center gap-2 px-5 min-h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-sm shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>{submitLabel}</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {imageError && (
        <p role="alert" className="text-[11px] text-red-400 mt-2">
          {imageError}
        </p>
      )}

      {isPhone && <MathSymbolsSheet open={symbolsOpen} onClose={() => setSymbolsOpen(false)} onInsert={insertSymbol} />}
    </section>
  );
};
