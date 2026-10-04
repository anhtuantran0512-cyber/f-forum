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
}

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu (gõ "hoi dap" vẫn ra "Hỏi Đáp"). */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    filtered.forEach((cmd) => {
      const bucket = map.get(cmd.group) || [];
      bucket.push(cmd);
      map.set(cmd.group, bucket);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
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
        className="ff-palette relative w-full max-w-[620px] overflow-hidden rounded-[26px] border border-white/15 bg-[#0b1017]/95 text-white shadow-[0_50px_140px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
      >
        {/* Aurora header strip */}
        <div className="h-[3px] w-full ff-aurora-bar" aria-hidden="true" />

        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500/25 to-fuchsia-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </span>
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-white/40 absolute left-0 top-1/2 -translate-y-1/2" />
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
              className="w-full bg-transparent pl-6 pr-2 py-1.5 text-sm text-white placeholder-white/35 focus:outline-none"
            />
          </div>
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Xóa từ khóa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-white/45 border border-white/15 rounded-lg px-2 py-1">
              <CommandIcon className="w-3 h-3" /> K
            </span>
          )}
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto ff-scroll px-2 py-2">
          {grouped.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-white/70 font-semibold">Không tìm thấy lệnh phù hợp</p>
              <p className="text-[11px] text-white/40 mt-1">Thử gõ “trang chủ”, “câu lạc bộ”, “sổ tay”…</p>
            </div>
          )}

          {grouped.map(([group, items]) => (
            <div key={group} className="mb-1.5">
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-amber-400/35 shadow-[0_10px_30px_rgba(245,158,11,0.16)]'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                          : 'bg-white/5 border-white/10 text-white/70'
                      }`}
                    >
                      {cmd.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-white truncate">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="block text-[11px] text-white/45 truncate">{cmd.hint}</span>
                      )}
                    </span>
                    {cmd.shortcut && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-white/55 border border-white/15 rounded-md px-1.5 py-0.5 shrink-0">
                        {cmd.shortcut}
                      </span>
                    )}
                    {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-white/10 bg-black/40 text-[10px] text-white/45">
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
          <span className="font-mono text-white/35">{flat.length} lệnh</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
