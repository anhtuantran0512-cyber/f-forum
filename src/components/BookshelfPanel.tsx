/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Trash2, X, Check, Bookmark, PenLine } from 'lucide-react';
import { safeStorage } from '../utils/storage';

/* ==========================================================================
   KỆ SÁCH CÁ NHÂN (thật)
   --------------------------------------------------------------------------
   Trước đây khối "KỆ SÁCH" chỉ là một card trang trí: bấm nút thì bắn thông
   báo, không lưu được gì. Nay là kệ sách thật:
     • Thêm / xoá sách, gắn nhãn (Học tập · Kỹ năng · Văn học · Khác)
     • Ghi chú ngắn cho từng cuốn
     • Lưu bằng safeStorage theo từng tài khoản, xem được cả khi ghé hồ sơ bạn
   ========================================================================== */

export interface ShelfBook {
  id: string;
  title: string;
  author: string;
  tag: ShelfTagId;
  note?: string;
  at: number;
}

type ShelfTagId = 'study' | 'skill' | 'literature' | 'other';

const SHELF_KEY = 'fforum_bookshelf_v1';
const SHELF_SYNC = 'fforum_bookshelf_sync';
const MAX_BOOKS = 60;

const TAGS: {
  id: ShelfTagId;
  label: string;
  /** Lớp gradient cho gáy sách */
  spine: string;
  chip: string;
}[] = [
  {
    id: 'study',
    label: 'Học tập',
    spine: 'from-sky-400/80 to-cyan-300/40',
    chip: 'text-sky-300 bg-sky-500/10 border-sky-400/30',
  },
  {
    id: 'skill',
    label: 'Kỹ năng',
    spine: 'from-emerald-400/80 to-teal-300/40',
    chip: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
  },
  {
    id: 'literature',
    label: 'Văn học',
    spine: 'from-amber-400/80 to-orange-300/40',
    chip: 'text-amber-300 bg-amber-500/10 border-amber-400/30',
  },
  {
    id: 'other',
    label: 'Khác',
    spine: 'from-fuchsia-400/80 to-purple-300/40',
    chip: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-400/30',
  },
];

const tagOf = (id: ShelfTagId) => TAGS.find((t) => t.id === id) || TAGS[0];

const readShelf = (ownerKey: string): ShelfBook[] => {
  try {
    const raw = safeStorage.getItem(SHELF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, ShelfBook[]>;
    const list = parsed?.[ownerKey];
    if (!Array.isArray(list)) return [];
    return list.filter((b) => b && typeof b.title === 'string');
  } catch {
    return [];
  }
};

const writeShelf = (ownerKey: string, books: ShelfBook[]): void => {
  try {
    const raw = safeStorage.getItem(SHELF_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ShelfBook[]>) : {};
    parsed[ownerKey] = books;
    safeStorage.setItem(SHELF_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SHELF_SYNC, { detail: { ownerKey } }));
  }
};

interface BookshelfPanelProps {
  /** Khoá chủ kệ (email hồ sơ đang xem). */
  ownerKey: string;
  ownerName?: string;
  /** Chỉ chủ hồ sơ mới được sửa kệ. */
  canEdit: boolean;
}

export const BookshelfPanel: React.FC<BookshelfPanelProps> = ({ ownerKey, ownerName, canEdit }) => {
  const [books, setBooks] = useState<ShelfBook[]>(() => readShelf(ownerKey));
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tag, setTag] = useState<ShelfTagId>('study');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  /* Đổi hồ sơ thì component được remount bằng `key={ownerKey}` ở nơi gọi, nên
     không cần đồng bộ bằng effect (tránh setState trong effect gây render dây
     chuyền — xem cảnh báo lint). */

  useEffect(() => {
    const sync = (e: Event) => {
      const detail = (e as CustomEvent<{ ownerKey?: string }>).detail;
      if (!detail?.ownerKey || detail.ownerKey === ownerKey) setBooks(readShelf(ownerKey));
    };
    window.addEventListener(SHELF_SYNC, sync);
    return () => window.removeEventListener(SHELF_SYNC, sync);
  }, [ownerKey]);

  const stats = useMemo(() => {
    const byTag = new Map<ShelfTagId, number>();
    books.forEach((b) => byTag.set(b.tag, (byTag.get(b.tag) || 0) + 1));
    return { total: books.length, byTag };
  }, [books]);

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setTag('study');
    setNote('');
    setError('');
  };

  const handleAdd = () => {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) {
      setError('Tên sách cần ít nhất 2 ký tự.');
      return;
    }
    if (books.length >= MAX_BOOKS) {
      setError(`Kệ đã đủ ${MAX_BOOKS} cuốn — hãy xoá bớt trước khi thêm.`);
      return;
    }
    const cleanAuthor = author.trim();
    const duplicated = books.some(
      (b) =>
        b.title.toLowerCase() === cleanTitle.toLowerCase() &&
        b.author.toLowerCase() === cleanAuthor.toLowerCase(),
    );
    if (duplicated) {
      setError('Cuốn này đã có trên kệ rồi.');
      return;
    }
    const next: ShelfBook[] = [
      {
        id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle,
        author: cleanAuthor || 'Chưa rõ tác giả',
        tag,
        note: note.trim() || undefined,
        at: Date.now(),
      },
      ...books,
    ];
    setBooks(next);
    writeShelf(ownerKey, next);
    resetForm();
    setIsAdding(false);
  };

  const handleRemove = (id: string) => {
    const next = books.filter((b) => b.id !== id);
    setBooks(next);
    writeShelf(ownerKey, next);
  };

  return (
    <div className="pc-12-card p-3.5 space-y-3" aria-label="Kệ sách cá nhân">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white font-mono uppercase">Kệ sách</span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-full px-1.5 py-px">
                {stats.total} cuốn
              </span>
            </div>
            <p className="text-[10.5px] text-neutral-400 leading-tight truncate">
              {canEdit
                ? 'Ghi lại những cuốn bạn đang đọc để nhớ và quay lại.'
                : `Kệ sách của ${ownerName || 'thành viên này'}.`}
            </p>
          </div>
        </div>

        {canEdit && !isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setError('');
            }}
            className="pc-12-btn px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-amber-200 inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm sách
          </button>
        )}
        {canEdit && isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              resetForm();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng biểu mẫu thêm sách"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Biểu mẫu thêm sách */}
      {canEdit && isAdding && (
        <div className="pc-12-well p-3 space-y-2.5 animate-fade-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label htmlFor="field" className="block">
              <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wide">
                Tên sách *
              </span>
              <input id="field"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
                maxLength={90}
                placeholder="VD: Toán 12 — Giải tích"
                className="mt-1 w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </label>
            <label htmlFor="field-2" className="block">
              <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wide">
                Tác giả
              </span>
              <input id="field-2"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
                maxLength={60}
                placeholder="Không bắt buộc"
                className="mt-1 w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </label>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wide mr-1">
              Nhãn
            </span>
            {TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTag(t.id)}
                aria-pressed={tag === t.id}
                className={`text-[10.5px] font-semibold px-2 py-1 rounded-full border transition-all cursor-pointer ${
                  tag === t.id ? t.chip : 'text-neutral-400 bg-white/5 border-white/10 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label htmlFor="field-3" className="block">
            <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wide">
              Ghi chú
            </span>
            <input id="field-3"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              maxLength={120}
              placeholder="VD: Ôn chương 3 trước kiểm tra"
              className="mt-1 w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </label>

          {error && (
            <p className="text-[11px] text-rose-300 flex items-center gap-1">
              <X className="w-3 h-3" />
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleAdd}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-neutral-950 text-[11.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md hover:brightness-105 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Lưu vào kệ
            </button>
            <span className="text-[10px] text-neutral-500">
              {stats.total}/{MAX_BOOKS} cuốn
            </span>
          </div>
        </div>
      )}

      {/* Danh sách sách */}
      {books.length === 0 ? (
        <div className="pc-12-well py-5 px-3 text-center">
          <Bookmark className="w-5 h-5 text-white/25 mx-auto" />
          <p className="text-[11.5px] text-neutral-300 font-medium mt-1.5">Kệ còn trống</p>
          <p className="text-[10.5px] text-neutral-500 mt-0.5">
            {canEdit
              ? 'Thêm cuốn sách đầu tiên bạn đang đọc — chỉ mất vài giây.'
              : 'Thành viên này chưa thêm cuốn sách nào.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[248px] overflow-y-auto pr-1 no-scrollbar">
          {books.map((b) => {
            const t = tagOf(b.tag);
            return (
              <li
                key={b.id}
                className="group relative flex items-stretch gap-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-colors overflow-hidden"
              >
                <span
                  aria-hidden="true"
                  className={`w-1.5 shrink-0 bg-gradient-to-b ${t.spine}`}
                />
                <div className="min-w-0 flex-1 py-2 pr-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] font-bold text-white truncate">{b.title}</span>
                    <span
                      className={`text-[9.5px] font-semibold px-1.5 py-px rounded-full border shrink-0 ${t.chip}`}
                    >
                      {t.label}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-neutral-400 truncate flex items-center gap-1">
                    <PenLine className="w-3 h-3 text-neutral-500 shrink-0" />
                    {b.author}
                  </p>
                  {b.note && (
                    <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-2 leading-snug">
                      {b.note}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemove(b.id)}
                    title={`Xoá "${b.title}" khỏi kệ`}
                    aria-label={`Xoá ${b.title} khỏi kệ`}
                    className="self-start m-1.5 p-1.5 rounded-lg text-neutral-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Thống kê nhãn */}
      {books.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {TAGS.filter((t) => (stats.byTag.get(t.id) || 0) > 0).map((t) => (
            <span
              key={t.id}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${t.chip}`}
            >
              {t.label} · {stats.byTag.get(t.id)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookshelfPanel;
