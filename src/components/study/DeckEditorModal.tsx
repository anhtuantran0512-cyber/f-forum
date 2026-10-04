/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useMemo, useState } from 'react';
import { X, Plus, Trash2, Wand2, Save, BookOpen, Layers } from 'lucide-react';
import type { StudyDeck, SubjectTag } from '../../types';
import { MAX_DECK_CARDS, SUBJECT_LABELS } from '../../store/studyLogic';

export interface DeckEditorCardDraft {
  id?: string;
  front: string;
  back: string;
  hint?: string;
}

interface DeckEditorModalProps {
  onClose: () => void;
  deck: StudyDeck | null;
  onSubmit: (payload: {
    title: string;
    description: string;
    subject: SubjectTag;
    isPublic: boolean;
    cards: DeckEditorCardDraft[];
  }) => void;
  onBulkImport?: (deckId: string, rawText: string) => number;
  onDelete?: (deckId: string) => void;
  /** Bộ thẻ chỉ đọc (không phải chủ sở hữu) thì ẩn nút lưu. */
  readOnly?: boolean;
}

const SUBJECT_OPTIONS = Object.entries(SUBJECT_LABELS) as [SubjectTag, string][];

const EMPTY_ROW: DeckEditorCardDraft = { front: '', back: '', hint: '' };

export const DeckEditorModal: React.FC<DeckEditorModalProps> = ({
  onClose,
  deck,
  onSubmit,
  onBulkImport,
  onDelete,
  readOnly = false,
}) => {
  /* Modal được mount mới cho mỗi lần mở (key theo bộ thẻ) nên state khởi tạo
     trực tiếp từ props là đủ, không cần đồng bộ trong useEffect. */
  const [title, setTitle] = useState(deck?.title ?? '');
  const [description, setDescription] = useState(deck?.description ?? '');
  const [subject, setSubject] = useState<SubjectTag>(deck?.subject ?? 'toan');
  const [isPublic, setIsPublic] = useState(deck?.isPublic ?? true);
  const [rows, setRows] = useState<DeckEditorCardDraft[]>(() =>
    deck && deck.cards.length > 0
      ? deck.cards.map(card => ({ id: card.id, front: card.front, back: card.back, hint: card.hint || '' }))
      : [{ ...EMPTY_ROW }],
  );
  const [bulkText, setBulkText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  const filledCount = useMemo(
    () => rows.filter(row => row.front.trim() && row.back.trim()).length,
    [rows],
  );

  const updateRow = (index: number, patch: Partial<DeckEditorCardDraft>) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSubmit = () => {
    if (readOnly) return;
    if (!title.trim()) {
      setError('Hãy đặt tên cho bộ thẻ (ví dụ: Công thức lượng giác 11).');
      return;
    }

    const cards = rows
      .map(row => ({ ...row, front: row.front.trim(), back: row.back.trim(), hint: row.hint?.trim() }))
      .filter(row => row.front && row.back);

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      subject,
      isPublic,
      cards,
    });
    onClose();
  };

  const handleBulkImport = () => {
    if (!deck || !onBulkImport) return;
    const count = onBulkImport(deck.id, bulkText);
    if (count === 0) {
      setError('Không đọc được thẻ nào. Mỗi dòng cần theo dạng: mặt trước | mặt sau.');
      return;
    }
    setBulkText('');
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={deck ? `Chỉnh sửa bộ thẻ ${deck.title}` : 'Tạo bộ thẻ ôn tập mới'}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng trình soạn bộ thẻ"
        className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
        onClick={onClose}
      />

      <div className="liquid-glass animate-modal-pop w-full max-w-3xl rounded-3xl bg-[#0c1218]/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative z-10 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {deck ? 'Chỉnh sửa bộ thẻ' : 'Tạo bộ thẻ ôn tập'}
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5">
                {readOnly
                  ? 'Bạn đang xem bộ thẻ của học sinh khác ở chế độ chỉ đọc.'
                  : 'Mỗi thẻ gồm mặt trước (câu hỏi) và mặt sau (đáp án). Dùng dấu | để nhập nhanh nhiều thẻ.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Meta */}
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">Tên bộ thẻ</span>
              <input
                type="text"
                value={title}
                maxLength={80}
                disabled={readOnly}
                onChange={e => setTitle(e.target.value)}
                placeholder="Công thức lượng giác 11"
                className="mt-1.5 w-full rounded-2xl bg-white/5 border border-white/15 focus:border-amber-400/50 outline-none px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">Môn học</span>
              <select
                value={subject}
                disabled={readOnly}
                onChange={e => setSubject(e.target.value as SubjectTag)}
                className="mt-1.5 w-full rounded-2xl bg-white/5 border border-white/15 focus:border-amber-400/50 outline-none px-3.5 py-2.5 text-sm text-white disabled:opacity-60 [&>option]:bg-[#0c1218]"
              >
                {SUBJECT_OPTIONS.map(([tag, label]) => (
                  <option key={tag} value={tag}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">Mô tả ngắn</span>
            <input
              type="text"
              value={description}
              maxLength={200}
              disabled={readOnly}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tóm tắt nội dung, ví dụ: 24 công thức cần nhớ trước kiểm tra 1 tiết"
              className="mt-1.5 w-full rounded-2xl bg-white/5 border border-white/15 focus:border-amber-400/50 outline-none px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-500 disabled:opacity-60"
            />
          </label>

          {/* Card rows */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-300" />
                Danh sách thẻ ({filledCount}/{Math.min(MAX_DECK_CARDS, rows.length)})
              </h3>
              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulk(prev => !prev)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-white/15 text-neutral-200 hover:border-amber-400/40 hover:text-amber-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    Nhập nhanh
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows(prev => [...prev, { ...EMPTY_ROW }])}
                    disabled={rows.length >= MAX_DECK_CARDS}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white text-neutral-900 font-semibold hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" />
                    Thêm thẻ
                  </button>
                </div>
              )}
            </div>

            {showBulk && !readOnly && (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-500/5 p-3 space-y-2">
                <p className="text-[11px] text-amber-100/90 leading-relaxed">
                  Mỗi dòng một thẻ theo cú pháp <code className="font-mono text-amber-200">mặt trước | mặt sau | gợi ý</code>.
                  Gợi ý có thể bỏ trống. Tối đa 200 dòng mỗi lần nhập.
                </p>
                <textarea
                  value={bulkText}
                  maxLength={20000}
                  onChange={e => setBulkText(e.target.value)}
                  rows={4}
                  placeholder={'sin²x + cos²x | 1\nĐịnh lý Pytago | a² + b² = c² | Áp dụng cho tam giác vuông'}
                  className="w-full rounded-xl bg-black/40 border border-white/15 focus:border-amber-400/50 outline-none px-3 py-2 text-xs text-white font-mono placeholder:text-neutral-600 resize-y"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    disabled={!deck || !bulkText.trim()}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-amber-400 text-neutral-950 font-bold hover:bg-amber-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Nhập vào bộ thẻ
                  </button>
                </div>
                {!deck && (
                  <p className="text-[10px] text-neutral-400">
                    Lưu bộ thẻ trước, sau đó mở lại để dán danh sách thẻ hàng loạt.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1 no-scrollbar">
              {rows.map((row, index) => (
                <div
                  key={row.id || index}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-start"
                >
                  <input
                    type="text"
                    value={row.front}
                    maxLength={300}
                    disabled={readOnly}
                    onChange={e => updateRow(index, { front: e.target.value })}
                    placeholder={`Mặt trước #${index + 1}`}
                    aria-label={`Mặt trước của thẻ ${index + 1}`}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-amber-400/50 outline-none px-3 py-2 text-xs text-white placeholder:text-neutral-600 disabled:opacity-60"
                  />
                  <input
                    type="text"
                    value={row.back}
                    maxLength={600}
                    disabled={readOnly}
                    onChange={e => updateRow(index, { back: e.target.value })}
                    placeholder="Mặt sau (đáp án)"
                    aria-label={`Mặt sau của thẻ ${index + 1}`}
                    className="w-full rounded-xl bg-black/30 border border-white/10 focus:border-amber-400/50 outline-none px-3 py-2 text-xs text-white placeholder:text-neutral-600 disabled:opacity-60"
                  />
                  <div className="flex items-center gap-1.5 sm:pt-0.5">
                    <input
                      type="text"
                      value={row.hint || ''}
                      maxLength={120}
                      disabled={readOnly}
                      onChange={e => updateRow(index, { hint: e.target.value })}
                      placeholder="Gợi ý"
                      aria-label={`Gợi ý của thẻ ${index + 1}`}
                      className="w-24 rounded-xl bg-black/30 border border-white/10 focus:border-amber-400/50 outline-none px-2.5 py-2 text-xs text-white placeholder:text-neutral-600 disabled:opacity-60"
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          setRows(prev => (prev.length === 1 ? [{ ...EMPTY_ROW }] : prev.filter((_, i) => i !== index)))
                        }
                        aria-label={`Xoá thẻ ${index + 1}`}
                        className="w-7 h-7 shrink-0 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-neutral-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Visibility */}
          {!readOnly && (
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-amber-400"
              />
              <span className="text-xs text-neutral-200">
                <strong className="text-white">Chia sẻ cho cộng đồng</strong>
                <span className="block text-[11px] text-neutral-400 mt-0.5">
                  Học sinh khác có thể xem, sao chép bộ thẻ về thư viện của mình và cùng luyện tập.
                </span>
              </span>
            </label>
          )}

          {error && (
            <p role="alert" className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 sm:p-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {deck && onDelete && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  onDelete(deck.id);
                  onClose();
                }}
                className="text-xs px-3 py-2 rounded-full border border-rose-400/30 text-rose-300 hover:bg-rose-500/15 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xoá bộ thẻ
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-full border border-white/15 text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              {readOnly ? 'Đóng' : 'Huỷ'}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSubmit}
                className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-semibold hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {deck ? 'Lưu thay đổi' : 'Tạo bộ thẻ'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DeckEditorModal;
