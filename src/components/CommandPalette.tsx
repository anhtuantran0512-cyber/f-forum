/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Command as CommandIcon,
  Sparkles,
  X,
} from 'lucide-react';

/**
 * F-ID Palette — Bảng lệnh nhanh (⌘/Ctrl + K)
 * ------------------------------------------------------------------
 * Tính năng ẩn dành cho người dùng thành thạo: gõ để tìm & nhảy tới
 * bất kỳ phân khu nào, hoặc chạy một tác vụ hệ thống chỉ bằng bàn phím.
 * Không tốn thêm request — toàn bộ danh mục lệnh được dựng tại client.
 */
export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string;
  shortcut?: string;
  run: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  /**
   * Hàm tìm kiếm NỘI DUNG (câu hỏi, CLB, thành viên…), nhận đúng từ khoá người
   * dùng đang gõ và trả về kết quả ĐÃ xếp hạng.
   *
   * Để ở dạng callback chứ không phải mảng dựng sẵn: từ khoá nằm trong state của
   * bảng lệnh, component cha không nhìn thấy. Kết quả trả về không bị bộ khớp từ
   * khoá bên dưới lọc lại, vì chúng đã xếp hạng theo điểm trọng số rồi.
   */
  search?: (query: string) => PaletteCommand[];
}

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu (gõ "hoi dap" vẫn ra "Hỏi Đáp"). */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands, search }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Kết quả nội dung, tính lại mỗi khi từ khoá đổi. */
  const contentResults = useMemo(
    () => (search ? search(query) : []),
    [search, query],
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return commands;
    return commands.filter((cmd) => {
      const haystack = normalize(`${cmd.label} ${cmd.hint ?? ''} ${cmd.keywords ?? ''} ${cmd.shortcut ?? ''}`);
      return haystack.includes(q);
    });
  }, [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>();
    /* Kết quả nội dung lên trước: người dùng gõ từ khoá là đang tìm bài, không
       phải đang tìm lệnh hệ thống. */
    contentResults.forEach((cmd) => {
      const bucket = map.get(cmd.group) || [];
      bucket.push(cmd);
      map.set(cmd.group, bucket);
    });
    filtered.forEach((cmd) => {
      const bucket = map.get(cmd.group) || [];
      bucket.push(cmd);
      map.set(cmd.group, bucket);
    });
    return Array.from(map.entries());
  }, [filtered, contentResults]);

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  /*
    Reset từ khoá và con trỏ mỗi lần mở lại. Dùng mẫu "điều chỉnh state khi prop
    đổi" của React thay vì useEffect: gọi setState ngay trong lúc render là hợp lệ
    và tránh được một lượt render thừa so với đặt trong effect.
  */
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }

  /* Đưa con trỏ vào ô nhập — thao tác DOM thật nên vẫn phải nằm trong effect. */
  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (flat.length === 0 ? 0 : (prev + 1) % flat.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (flat.length === 0 ? 0 : (prev - 1 + flat.length) % flat.length));
      } else if (e.key === 'Enter') {
        const target = flat[activeIndex];
        if (target) {
          e.preventDefault();
          target.run();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, flat, activeIndex, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-palette-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const runCommand = useCallback(
    (cmd: PaletteCommand) => {
      cmd.run();
      onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center px-3 pt-[10vh] sm:pt-[13vh]">
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng bảng lệnh"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md border-none outline-none"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bảng lệnh nhanh F-Forum"
        className="ff-palette modal-container relative w-full max-w-[620px] overflow-hidden text-[#f4f1de]"
      >
        {/* Warm Editorial header strip */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#e07a5f] via-[#f2cc8f] to-[#81b29a]" aria-hidden="true" />

        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-dashed border-[#f4f1de]/15">
          <span className="w-9 h-9 rounded-xl bg-[#e07a5f]/20 border-[1.5px] border-[#e07a5f]/50 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_rgba(4,6,11,0.9)]">
            <Sparkles className="w-4 h-4 text-[#f2cc8f]" />
          </span>
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#9a978e] absolute left-0 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              value={query}
              maxLength={64}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Tìm phân khu, tác vụ… (ví dụ: hỏi đáp, theme, điểm danh)"
              aria-label="Tìm lệnh"
              className="w-full bg-transparent pl-6 pr-2 py-1.5 text-sm text-[#f4f1de] placeholder-[#84817a] focus:outline-none"
            />
          </div>
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-[#9a978e] hover:text-[#f4f1de] hover:bg-[#f4f1de]/10 transition-colors cursor-pointer"
              aria-label="Xóa từ khóa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-[#d8d5ce] border border-[#f4f1de]/20 bg-[#0b0d12] rounded-md px-2 py-1">
              <CommandIcon className="w-3 h-3" /> K
            </span>
          )}
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto ff-scroll px-2.5 py-2.5">
          {grouped.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-[#f4f1de] font-bold">Không tìm thấy lệnh phù hợp</p>
              <p className="text-[11px] text-[#9a978e] mt-1">Thử gõ “trang chủ”, “câu lạc bộ”, “sổ tay”…</p>
            </div>
          )}

          {grouped.map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#f2cc8f]">
                {group}
              </div>
              {items.map((cmd) => {
                const index = flat.indexOf(cmd);
                const isActive = index === activeIndex;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    data-palette-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runCommand(cmd)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border-[1.5px] ${
                      isActive
                        ? 'bg-[#e07a5f]/20 border-[#e07a5f]/55 shadow-[3px_3px_0px_rgba(4,6,11,0.9)]'
                        : 'border-transparent hover:bg-[#f4f1de]/5'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        isActive
                          ? 'bg-[#e07a5f] border-[#f4f1de]/60 text-[#0b0d12]'
                          : 'bg-[#0b0d12] border-[#f4f1de]/15 text-[#d8d5ce]'
                      }`}
                    >
                      {cmd.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-[#f4f1de] truncate">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="block text-[11px] text-[#9a978e] truncate">{cmd.hint}</span>
                      )}
                    </span>
                    {cmd.shortcut && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-[#d8d5ce] bg-[#0b0d12] border border-[#f4f1de]/18 rounded-md px-1.5 py-0.5 shrink-0">
                        {cmd.shortcut}
                      </span>
                    )}
                    {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-[#f2cc8f] shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-dashed border-[#f4f1de]/15 bg-[#0b0d12]/80 text-[10px] text-[#9a978e]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" /> di chuyển
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> chọn
            </span>
            <span className="hidden sm:inline">Esc để đóng</span>
          </div>
          <span className="font-mono text-[#f2cc8f]">{flat.length} lệnh</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
