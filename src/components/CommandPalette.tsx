import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Sparkles,
  X,
  BookOpen,
  HelpCircle,
  MessageCircleMore,
  Headphones,
  Flame,
  Award,
  Swords,
} from 'lucide-react';

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string;
  shortcut?: string;
  badge?: string;
  run: () => void;
}

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  search?: (query: string) => PaletteCommand[];
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

type CategoryFilter = 'all' | 'exam' | 'thread' | 'bounty' | 'focus';

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  commands,
  search,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const academicShortcuts: PaletteCommand[] = useMemo(() => [
    {
      id: 'cmd-exam-vault',
      label: 'Kho Đề Thi Quốc Gia & Chuyên',
      hint: 'Đề thi THPTQG, HSG, Chuyên',
      group: 'Đề thi',
      icon: <BookOpen className="w-4 h-4 text-cyan-400" />,
      keywords: 'de thi thpt quoc gia hoc sinh gioi de chuyen toan ly hoa',
      shortcut: '⌘1',
      badge: 'Đề thi',
      run: () => window.dispatchEvent(new CustomEvent('fforum_nav_exam')),
    },
    {
      id: 'cmd-bounty-qa',
      label: 'Hỏi Bài Treo Thưởng Bounty',
      hint: 'Hỏi đáp bài tập có cược Coin',
      group: 'Câu hỏi Bounty',
      icon: <HelpCircle className="w-4 h-4 text-[#e07a5f]" />,
      keywords: 'hoi dap bounty cược coin treo thuong giai bai tap',
      shortcut: '⌘2',
      badge: 'Bounty',
      run: () => window.dispatchEvent(new CustomEvent('fforum_nav_qa')),
    },
    {
      id: 'cmd-threads',
      label: 'Sổ Chung & Chủ Đề Thảo Luận',
      hint: 'Mạch trao đổi học thuật',
      group: 'Thảo luận',
      icon: <MessageCircleMore className="w-4 h-4 text-amber-300" />,
      keywords: 'thread mach thao luan so chung bai viet',
      shortcut: '⌘3',
      badge: 'Thảo luận',
      run: () => window.dispatchEvent(new CustomEvent('fforum_nav_threads')),
    },
    {
      id: 'cmd-focus-room',
      label: 'Phòng Tập Trung Machi Mart',
      hint: 'Pomodoro mưa đêm & Lofi mixer',
      group: 'Phòng tập trung',
      icon: <Headphones className="w-4 h-4 text-emerald-400" />,
      keywords: 'phong tap trung pomodoro machi mart lofi mua dem',
      shortcut: 'P',
      badge: 'Tập trung',
      run: () => window.dispatchEvent(new CustomEvent('fforum_open_focus')),
    },
    {
      id: 'cmd-daily-checkin',
      label: 'Chuỗi Ngày & Điểm Danh 7 Ngày',
      hint: 'Đố vui học thuật & Khiên bảo hộ',
      group: 'Nhiệm vụ',
      icon: <Flame className="w-4 h-4 text-rose-400" />,
      keywords: 'diem danh streak chuoi ngay do vui',
      shortcut: 'D',
      badge: 'Điểm danh',
      run: () => window.dispatchEvent(new CustomEvent('fforum_open_daily_checkin')),
    },
    {
      id: 'cmd-memorial-wall',
      label: 'Bức Tường Lưu Bút Mùa Thi',
      hint: 'Lời chúc sĩ tử phong cách Origami',
      group: 'Kỷ niệm',
      icon: <Award className="w-4 h-4 text-purple-400" />,
      keywords: 'luu but mua thi loi chuc si tu origami',
      shortcut: 'M',
      badge: 'Lưu bút',
      run: () => window.dispatchEvent(new CustomEvent('fforum_open_memorial_wall')),
    },
    {
      id: 'cmd-peer-battle',
      label: 'Đấu Trường Tranh Tài 1vs1',
      hint: 'Đối kháng kiến thức 5 câu nhanh realtime',
      group: 'Đấu trường',
      icon: <Swords className="w-4 h-4 text-rose-400" />,
      keywords: 'dau truong 1vs1 tranh tai doi khang si tu quick match',
      shortcut: 'B',
      badge: 'Đấu trường',
      run: () => window.dispatchEvent(new CustomEvent('fforum_open_peer_battle')),
    },
  ], []);

  const mergedCommands = useMemo(() => {
    const existingIds = new Set(commands.map((c) => c.id));
    const uniqueShortcuts = academicShortcuts.filter((c) => !existingIds.has(c.id));
    return [...uniqueShortcuts, ...commands];
  }, [commands, academicShortcuts]);

  const contentResults = useMemo(
    () => (search ? search(query) : []),
    [search, query],
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    let list = mergedCommands;

    if (activeCategory === 'exam') {
      list = list.filter((c) => c.group === 'Đề thi' || normalize(c.label).includes('de thi'));
    } else if (activeCategory === 'thread') {
      list = list.filter((c) => c.group === 'Thảo luận' || normalize(c.label).includes('thao luan') || normalize(c.label).includes('thread'));
    } else if (activeCategory === 'bounty') {
      list = list.filter((c) => c.group === 'Câu hỏi Bounty' || c.group === 'Câu hỏi' || normalize(c.label).includes('bounty') || normalize(c.label).includes('hoi'));
    } else if (activeCategory === 'focus') {
      list = list.filter((c) => c.group === 'Phòng tập trung' || c.group === 'Không gian' || normalize(c.label).includes('tap trung') || normalize(c.label).includes('pomodoro'));
    }

    if (!q) return list;
    return list.filter((cmd) => {
      const haystack = normalize(`${cmd.label} ${cmd.hint ?? ''} ${cmd.keywords ?? ''} ${cmd.shortcut ?? ''} ${cmd.group}`);
      return haystack.includes(q);
    });
  }, [mergedCommands, query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>();
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

  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setActiveCategory('all');
    }
  }

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
    <div className="fixed inset-0 z-[115] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng bảng lệnh"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 border-none outline-none"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bảng lệnh học thuật F-Forum 2027"
        className="relative w-full max-w-[660px] overflow-hidden rounded-[var(--radius-soft)] bg-[var(--bg-paper)] text-[var(--ink-primary)] border-[1.5px] border-[var(--border-color)] shadow-[var(--shadow-brutal-hover)]"
      >
        <div className="h-[3px] w-full bg-[var(--accent-terracotta)]" aria-hidden="true" />

        <div className="flex items-center gap-3 px-4 py-3.5 border-b-[1.5px] border-[var(--border-color)] bg-[var(--bg-parchment)]">
          <span className="w-9 h-9 rounded-[var(--radius-soft)] bg-[var(--accent-mustard)]/20 border border-[var(--border-color)] flex items-center justify-center shrink-0 shadow-[var(--shadow-brutal-sm)]">
            <Sparkles className="w-4 h-4 text-[var(--accent-terracotta)]" />
          </span>
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-0 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              value={query}
              maxLength={64}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Tìm đề thi, bài thảo luận, câu hỏi bounty, phòng học..."
              aria-label="Tìm lệnh"
              className="w-full bg-transparent pl-6 pr-2 py-1.5 text-sm font-semibold text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none"
            />
          </div>
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="Xoá tìm kiếm"
              className="p-1 rounded text-xs font-bold bg-[var(--bg-elevated)] text-[var(--ink-primary)] border border-[var(--border-color)]/30 hover:bg-[var(--accent-terracotta)] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded border border-[var(--border-color)]/30 bg-[var(--bg-elevated)] text-[var(--ink-muted)]">
              ESC
            </kbd>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--border-color)]/30 bg-[var(--bg-parchment)] overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveCategory('all'); setActiveIndex(0); }}
            className={`px-2.5 py-1 rounded transition-all border cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-[var(--accent-terracotta)] text-white border-[var(--border-color)] shadow-[var(--shadow-brutal-sm)]'
                : 'bg-[var(--bg-paper)] text-[var(--ink-secondary)] border-[var(--border-color)]/30 hover:border-[var(--border-color)]'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => { setActiveCategory('exam'); setActiveIndex(0); }}
            className={`px-2.5 py-1 rounded transition-all border cursor-pointer ${
              activeCategory === 'exam'
                ? 'bg-[var(--accent-terracotta)] text-white border-[var(--border-color)] shadow-[var(--shadow-brutal-sm)]'
                : 'bg-[var(--bg-paper)] text-[var(--ink-secondary)] border-[var(--border-color)]/30 hover:border-[var(--border-color)]'
            }`}
          >
            Đề thi
          </button>
          <button
            type="button"
            onClick={() => { setActiveCategory('thread'); setActiveIndex(0); }}
            className={`px-2.5 py-1 rounded transition-all border cursor-pointer ${
              activeCategory === 'thread'
                ? 'bg-[var(--accent-terracotta)] text-white border-[var(--border-color)] shadow-[var(--shadow-brutal-sm)]'
                : 'bg-[var(--bg-paper)] text-[var(--ink-secondary)] border-[var(--border-color)]/30 hover:border-[var(--border-color)]'
            }`}
          >
            Thảo luận
          </button>
          <button
            type="button"
            onClick={() => { setActiveCategory('bounty'); setActiveIndex(0); }}
            className={`px-2.5 py-1 rounded transition-all border cursor-pointer ${
              activeCategory === 'bounty'
                ? 'bg-[var(--accent-terracotta)] text-white border-[var(--border-color)] shadow-[var(--shadow-brutal-sm)]'
                : 'bg-[var(--bg-paper)] text-[var(--ink-secondary)] border-[var(--border-color)]/30 hover:border-[var(--border-color)]'
            }`}
          >
            Câu hỏi Bounty
          </button>
          <button
            type="button"
            onClick={() => { setActiveCategory('focus'); setActiveIndex(0); }}
            className={`px-2.5 py-1 rounded transition-all border cursor-pointer ${
              activeCategory === 'focus'
                ? 'bg-[var(--accent-terracotta)] text-white border-[var(--border-color)] shadow-[var(--shadow-brutal-sm)]'
                : 'bg-[var(--bg-paper)] text-[var(--ink-secondary)] border-[var(--border-color)]/30 hover:border-[var(--border-color)]'
            }`}
          >
            Phòng tập trung
          </button>
        </div>

        <div ref={listRef} className="max-h-[52vh] sm:max-h-[60vh] overflow-y-auto p-2 space-y-3">
          {!query && activeCategory === 'all' && (
            <div className="mb-4 p-2.5 border-[1.5px] border-[var(--border-color)] bg-[var(--bg-parchment)] rounded-[var(--radius-soft)] shadow-[var(--shadow-brutal-sm)]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-color)]/20">
                <span className="font-mono text-[10px] font-bold text-[var(--accent-terracotta)] uppercase tracking-wider">MỤC LỤC CHUYÊN MỤC • 3x3 GRID</span>
                <span className="font-mono text-[9px] text-[var(--ink-muted)]">SWISS NUMERALS</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { num: '01', title: 'Kho Đề Thi', cat: 'exam', icon: <BookOpen className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" /> },
                  { num: '02', title: 'Hỏi Đáp', cat: 'bounty', icon: <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-forest)]" /> },
                  { num: '03', title: 'Thảo Luận', cat: 'thread', icon: <MessageCircleMore className="w-3.5 h-3.5 text-[var(--accent-terracotta)]" /> },
                  { num: '04', title: 'Tập Trung', cat: 'focus', icon: <Headphones className="w-3.5 h-3.5 text-[var(--accent-mustard)]" /> },
                  { num: '05', title: 'Bảng Vàng', cat: 'all', icon: <Award className="w-3.5 h-3.5 text-[var(--accent-terracotta)]" /> },
                  { num: '06', title: 'Đấu Trường', cat: 'all', icon: <Swords className="w-3.5 h-3.5 text-[var(--accent-forest)]" /> },
                  { num: '07', title: 'Câu Lạc Bộ', cat: 'all', icon: <Flame className="w-3.5 h-3.5 text-[var(--accent-mustard)]" /> },
                  { num: '08', title: 'Kỷ Niệm', cat: 'all', icon: <Sparkles className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" /> },
                  { num: '09', title: 'Tra Cứu', cat: 'all', icon: <Search className="w-3.5 h-3.5 text-[var(--ink-primary)]" /> },
                ].map((item) => (
                  <button
                    key={item.num}
                    type="button"
                    onClick={() => {
                      if (item.cat !== 'all') {
                        setActiveCategory(item.cat as CategoryFilter);
                      } else {
                        setQuery(item.title);
                      }
                    }}
                    className="group p-2 border border-[var(--border-color)] bg-[var(--bg-paper)] hover:bg-[var(--bg-elevated)] rounded-[4px] text-left transition-colors flex flex-col justify-between h-16 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="swiss-numeral text-xl font-bold text-[var(--ink-primary)]">{item.num}</span>
                      {item.icon}
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[var(--ink-primary)] truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {flat.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-[var(--ink-muted)]">
              Không tìm thấy lệnh hoặc nội dung nào khớp với từ khoá.
            </div>
          ) : (
            grouped.map(([groupName, items]) => {
              const startIndex = flat.findIndex((cmd) => cmd.id === items[0]?.id);
              return (
                <div key={groupName} className="space-y-1">
                  <div className="px-3 pt-2 pb-1 text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                    {groupName}
                  </div>
                  {items.map((cmd, idx) => {
                    const itemGlobalIndex = startIndex + idx;
                    const isSelected = itemGlobalIndex === activeIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        data-palette-index={itemGlobalIndex}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                        className={`w-full text-left px-3 py-2.5 rounded-[var(--radius-soft)] transition-all flex items-center justify-between gap-3 cursor-pointer border ${
                          isSelected
                            ? 'bg-[var(--bg-elevated)] text-[var(--ink-primary)] border-[var(--border-color)] shadow-[var(--shadow-brutal-sm)]'
                            : 'bg-transparent text-[var(--ink-secondary)] border-transparent hover:bg-[var(--bg-elevated)]/40 hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[var(--accent-mustard)]/25 border-[var(--border-color)]'
                              : 'bg-[var(--bg-parchment)] border-[var(--border-color)]/30'
                          }`}>
                            {cmd.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold truncate text-[var(--ink-primary)]">{cmd.label}</div>
                            {cmd.hint && (
                              <div className="text-xs font-normal text-[var(--ink-muted)] truncate">
                                {cmd.hint}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {cmd.shortcut && (
                            <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold rounded border border-[var(--border-color)]/30 bg-[var(--bg-parchment)] text-[var(--ink-muted)]">
                              {cmd.shortcut}
                            </kbd>
                          )}
                          <CornerDownLeft className={`w-3.5 h-3.5 text-[var(--accent-terracotta)] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 border-t-[1.5px] border-[var(--border-color)] bg-[var(--bg-parchment)] flex items-center justify-between text-[11px] font-bold text-[var(--ink-secondary)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" /> Di chuyển
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Chọn lệnh
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px]">⌘K / ⌘E học thuật</span>
        </div>
      </div>
    </div>
  );
};

export const CommandPalette = CommandPaletteModal;
export default CommandPaletteModal;
