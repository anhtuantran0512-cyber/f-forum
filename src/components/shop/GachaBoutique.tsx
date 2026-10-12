/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Gacha Boutique — Nhiệm vụ 10: cửa hàng trang trí + gacha F-Coin.
 *  - 873 asset thật (khung/hào quang/bảng tên) từ decorations-catalog.json.
 *  - Thẻ có preview ảnh + VIDEO phát khi hover (rarity: xám/xanh/tím/vàng).
 *  - Lọc: loại (Avatar Frame | Avatar Aura | Nameplate) + độ hiếm + Có animation/Tĩnh,
 *    tìm kiếm, sắp xếp; infinite scroll 24 item/lần (KHÔNG tải hết một lúc).
 *  - Modal xem trước trên avatar THẬT của user (200px) + "Trang bị ngay".
 *  - Gacha 3 gói, Pity 50/100, giá hiển thị trung thực theo khoảng giá pool.
 *  - Giữ nguyên hiệu ứng mở hộp, confetti, âm thanh của Epic 4.
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Clock3,
  Coins,
  Flame,
  Frame,
  Heart,
  Lock,
  Search,
  TrendingUp,
  Sparkles,
  Tag,
  Info,
  X,
} from 'lucide-react';
import type { EquippedDecorations, ShopItem } from '../../types';
import {
  GACHA_EPIC_PITY_LIMIT,
  GACHA_MYTHIC_PITY_LIMIT,
  GACHA_POOLS,
  RARITY_PREMIUM_META,
  effectivePrice,
  formatCountdownHMS,
  getDynamicDiscounts,
  getWeeklyDeal,
  isNewItem,
  rollGachaPull,
  type GachaPityState,
  type GachaPoolId,
  type ShopRarity,
} from '../../utils/shopData';
import {
  DECORATION_RARITIES,
  DECORATION_RARITY_META,
  DECORATION_TYPE_META,
  getCollectionStats,
  getDailyDeal,
  priceRange,
  resolveAssetUrl,
} from '../../utils/decorations';
import { useDecorationCatalog } from '../../utils/decorationStore';
import { safeStorage } from '../../utils/storage';
import { formatCoinBalance } from '../../utils/coinDisplay';
import { playChime } from '../../utils/audio';
import { AvatarWithDecoration, type DecorationAssetRef } from '../decorations/AvatarWithDecoration';
import { NameplateDisplay } from '../decorations/NameplateDisplay';
import { DEFAULT_AVATAR } from '../../utils/mediaFallback';
import { CelebrationBurst } from '../CelebrationBurst';
import { CuBong } from '../mascot/CuBong';
import './Boutique.css';

interface GachaBoutiqueProps {
  inventory: string[];
  /** Slot đã trang bị của user (từ server) — đánh dấu "Đang đeo". */
  equippedDecorations?: EquippedDecorations;
  coin: number;
  /** Số tài khoản đang sở hữu từng vật phẩm (dữ liệu thật) — dùng cho nhãn "Hot". */
  ownership?: Record<string, number>;
  userName: string;
  userAvatar?: string;
  initialCategoryFilter?: string | null;
  /** Xem hồ sơ người khác: chỉ trưng bày, không mua/đeo. */
  readOnly?: boolean;
  /** Id trang trí user đã yêu thích (wishlist). */
  wishlist?: string[];
  onToggleWishlist?: (item: ShopItem) => void;
  onBuy: (item: ShopItem) => Promise<boolean>;
  /** Trang bị item vào slot của nó; nextItemId = null để Gỡ slot của item. */
  onEquip: (item: ShopItem, nextItemId: string | null) => Promise<void> | void;
}

type TypeFilter = 'all' | 'Avatar Frame' | 'Avatar Aura' | 'Nameplate';
type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'mythic';
type MotionFilter = 'all' | 'animated' | 'static';
type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'value';
/* Giá tối đa: lọc theo GIÁ THỰC TẾ đang hiển thị (đã trừ flash + ưu đãi tuần). */
type PriceMaxFilter = 'all' | '2500' | '3500' | '5000';

const PAGE_SIZE = 24;

const TYPE_FILTERS: Array<{ id: TypeFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Avatar Frame', label: 'Avatar Frame' },
  { id: 'Avatar Aura', label: 'Avatar Aura' },
  { id: 'Nameplate', label: 'Nameplate' },
];

const decoRarity = (item: ShopItem): 'common' | 'rare' | 'epic' | 'mythic' => item.rarity || 'common';
/* CSS Boutique.css dùng bộ class Epic 4 (common/rare/epic/legendary) — mythic map về legendary. */
const legacyRarityClass = (rarity: 'common' | 'rare' | 'epic' | 'mythic'): 'common' | 'rare' | 'epic' | 'legendary' =>
  rarity === 'mythic' ? 'legendary' : rarity;
const itemToAsset = (item: ShopItem): DecorationAssetRef => ({
  type: item.category === 'Nameplate' ? 'nameplate' : item.category === 'Avatar Aura' ? 'avatar_aura' : 'avatar_frame',
  id: item.id,
  fullAssetUrl: item.fullAssetUrl,
  animatedAssetUrl: item.animatedAssetUrl,
  isAnimated: !!item.isAnimated && !!item.animatedAssetUrl,
});

interface GachaHistoryItem {
  id: string;
  itemId: string;
  itemName: string;
  rarity: ShopRarity;
  poolName: string;
  pityTriggered: 'mythic_100' | 'epic_50' | null;
  pulledAt: string;
}

const BURST_TONE: Record<ShopRarity, 'gold' | 'emerald' | 'violet' | 'rose'> = {
  common: 'emerald',
  rare: 'violet',
  epic: 'rose',
  legendary: 'gold',
};

const formatCountdown = (ms: number): string => {
  const safe = Math.max(0, ms);
  const days = Math.floor(safe / 86_400_000);
  const hours = Math.floor((safe % 86_400_000) / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${Math.max(1, minutes)} phút`;
};

const renderCategoryIcon = (category?: string) => {
  switch (category) {
    case 'Avatar Aura':
      return <Sparkles size={12} />;
    case 'Nameplate':
      return <Tag size={12} />;
    default:
      return <Frame size={12} />;
  }
};

const makeGachaHistoryEntry = (
  itemId: string,
  itemName: string,
  rarity: ShopRarity,
  poolName: string,
  pityTriggered: 'mythic_100' | 'epic_50' | null,
): GachaHistoryItem => ({
  id: `pull-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  itemId,
  itemName,
  rarity,
  poolName,
  pityTriggered,
  pulledAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
});

export const GachaBoutique: FC<GachaBoutiqueProps> = ({
  inventory,
  equippedDecorations,
  coin,
  ownership = {},
  userName,
  userAvatar,
  initialCategoryFilter = null,
  readOnly = false,
  onBuy,
  onEquip,
  wishlist = [],
  onToggleWishlist,
}) => {
  const uid = useId().replace(/:/g, '');
  /* Catalog Discord import (fetch + cache) — nguồn item duy nhất của Boutique mới. */
  const { items, loading: catalogLoading } = useDecorationCatalog();
  const activeItems = useMemo(() => items.filter((item) => item.isActive !== false), [items]);

  /* Đồng hồ 1s — dùng chung cho giá sale, đếm ngược, ruy-băng sự kiện. */
  const [now, setNow] = useState(() => Date.now());

  /* Bộ lọc: nhớ lựa chọn giữa các lần mở Boutique (localStorage). */
  const FILTERS_STORAGE_KEY = 'fforum_boutique_filters_v1';
  const readSavedFilters = (): Partial<Record<'type' | 'rarity' | 'motion' | 'sort' | 'price' | 'afford', string>> => {
    try {
      const raw = safeStorage.getItem(FILTERS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  };
  const savedFilters = useMemo(() => readSavedFilters(), []);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>(() =>
    initialCategoryFilter === 'Avatar Frame' || initialCategoryFilter === 'Avatar Aura' || initialCategoryFilter === 'Nameplate'
      ? (initialCategoryFilter as TypeFilter)
      : (savedFilters.type === 'Avatar Frame' || savedFilters.type === 'Avatar Aura' || savedFilters.type === 'Nameplate'
        ? (savedFilters.type as TypeFilter)
        : 'all'),
  );
  const [prevInitialFilter, setPrevInitialFilter] = useState<string | null>(initialCategoryFilter);
  if (initialCategoryFilter !== prevInitialFilter) {
    setPrevInitialFilter(initialCategoryFilter);
    if (initialCategoryFilter === 'Avatar Frame' || initialCategoryFilter === 'Avatar Aura' || initialCategoryFilter === 'Nameplate') {
      setTypeFilter(initialCategoryFilter as TypeFilter);
    }
  }
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>(
    savedFilters.rarity === 'common' || savedFilters.rarity === 'rare' || savedFilters.rarity === 'epic' || savedFilters.rarity === 'mythic'
      ? (savedFilters.rarity as RarityFilter)
      : 'all',
  );
  const [motionFilter, setMotionFilter] = useState<MotionFilter>(
    savedFilters.motion === 'animated' || savedFilters.motion === 'static' ? (savedFilters.motion as MotionFilter) : 'all',
  );
  /* Sở hữu: mọi item | đã có | chưa có — 1 bộ lọc duy nhất trong hàng filter. */
  const [ownedFilter, setOwnedFilter] = useState<'all' | 'owned' | 'unowned'>('all');
  /* Giá tối đa (ngân sách Coin) — lưu cùng bộ lọc. */
  const [priceMax, setPriceMax] = useState<PriceMaxFilter>(
    savedFilters.price === '2500' || savedFilters.price === '3500' || savedFilters.price === '5000'
      ? (savedFilters.price as PriceMaxFilter)
      : 'all',
  );
  /* "Chỉ xem yêu thích": duyệt danh sách đã bookmark. */
  const [wishOnly, setWishOnly] = useState(false);
  /* "Trong ngân sách": chỉ hiện item giá thực tế ≤ số Coin hiện tại. */
  const [affordableOnly, setAffordableOnly] = useState(() => savedFilters.afford === '1');
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(
    savedFilters.sort === 'price-asc' || savedFilters.sort === 'price-desc' || savedFilters.sort === 'newest' || savedFilters.sort === 'value'
      ? (savedFilters.sort as SortMode)
      : 'featured',
  );
  /* Lưu bộ lọc khi đổi (event-driven, không thêm effect riêng). */
  const saveFilters = useCallback((next: Partial<Record<'type' | 'rarity' | 'motion' | 'sort' | 'price' | 'afford', string>>) => {
    try {
      const cur = readSavedFilters();
      safeStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ ...cur, ...next }));
    } catch {
      /* storage đầy/lỗi — bỏ qua */
    }
  }, []);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const inspectItem = useCallback((id: string) => {
    setInspectId(id);
  }, []);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [unboxed, setUnboxed] = useState<ShopItem | null>(null);
  const [burstTick, setBurstTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const [isGachaOpen, setIsGachaOpen] = useState(false);
  const [showOddsModal, setShowOddsModal] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const unboxCtaRef = useRef<HTMLButtonElement | null>(null);

  const equippedSlotOf = useCallback(
    (item: ShopItem): string | null => {
      const slot = item.category === 'Nameplate' ? 'nameplate' : item.category === 'Avatar Aura' ? 'avatar_aura' : 'avatar_frame';
      return equippedDecorations?.[slot] === item.id ? item.id : null;
    },
    [equippedDecorations],
  );

  /* Đồng hồ đếm ngược 1 giây cho đợt xoay vòng giảm giá 6h (00h, 06h, 12h, 18h). */
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setNow(Date.now());
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  /* Gom mốc thời gian theo từng phút cho các phép lọc/sắp xếp 873 vật phẩm để không
     chạy lại toàn bộ useMemo mỗi giây khi đồng hồ đếm ngược nhảy nhịp. */
  const dealWindowNow = Math.floor(now / 60_000) * 60_000;

  const deal = useMemo(() => getWeeklyDeal(dealWindowNow, activeItems), [dealWindowNow, activeItems]);
  const dealItem = activeItems.find((item) => item.id === deal.itemId) || null;
  const dynamicDiscounts = useMemo(() => getDynamicDiscounts(dealWindowNow, activeItems), [dealWindowNow, activeItems]);
  /* Item trong wishlist đang sale (giá thực tế < giá niêm yết). */
  const wishOnDealCount = useMemo(() => {
    if (!wishlist.length) return 0;
    return activeItems.reduce((acc, i) => {
      if (!wishlist.includes(i.id)) return acc;
      const flash = dynamicDiscounts.deals[i.id];
      const current = flash ? Math.min(effectivePrice(i, dealWindowNow), flash.discountedPrice) : effectivePrice(i, dealWindowNow);
      return current < i.price ? acc + 1 : acc;
    }, 0);
  }, [activeItems, wishlist, dynamicDiscounts, dealWindowNow]);
  /* Số item "mua được" ngay lúc này (giá thực tế ≤ số Coin hiện tại). */
  const affordableCount = useMemo(
    () =>
      activeItems.reduce((acc, i) => {
        const flash = dynamicDiscounts.deals[i.id];
        const current = flash ? Math.min(effectivePrice(i, dealWindowNow), flash.discountedPrice) : effectivePrice(i, dealWindowNow);
        return current <= coin ? acc + 1 : acc;
      }, 0),
    [activeItems, coin, dynamicDiscounts, dealWindowNow],
  );

  /* Đại cập nhật — "Deal hôm nay": item chất lượng cao đang sale, xoay theo ngày VN. */
  const dailyDeal = useMemo(
    () =>
      getDailyDeal(dealWindowNow, activeItems, {
        flashList: dynamicDiscounts.list.map((d) => ({ itemId: d.itemId, percent: d.percent, isSuperSale: d.isSuperSale })),
        flashEndsAt: dynamicDiscounts.endsAt,
        weekly: deal,
      }),
    [dealWindowNow, activeItems, dynamicDiscounts, deal],
  );
  /* Đại cập nhật — "Bộ sưu tập của bạn": tiến độ 873 item theo độ hiếm. */
  const collection = useMemo(() => getCollectionStats(activeItems, inventory), [activeItems, inventory]);

  /* Hero Carousel: 6 item Mythic tiêu điểm (xoay vòng hằng tuần theo pool). */
  const mythicShowcaseItems = useMemo(
    () =>
      activeItems
        .filter((item) => decoRarity(item) === 'mythic')
        .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
        .slice(0, 6),
    [activeItems],
  );

  useEffect(() => {
    if (mythicShowcaseItems.length <= 1) return undefined;
    const rot = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setHeroIdx((prev) => (prev + 1) % mythicShowcaseItems.length);
    }, 5_500);
    return () => window.clearInterval(rot);
  }, [mythicShowcaseItems.length]);

  const currentHeroItem =
    mythicShowcaseItems[heroIdx % Math.max(1, mythicShowcaseItems.length)] || activeItems[0] || null;

  /* "Hot" = 2 vật phẩm được nhiều tài khoản sở hữu nhất (ít nhất 2 người) — không bịa số. */
  const hotIds = useMemo(() => new Set(
    Object.entries(ownership)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => id),
  ), [ownership]);

  const priceRangeLabel = useMemo(() => priceRange(activeItems), [activeItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = activeItems.filter((item) => {
      if (typeFilter !== 'all' && item.category !== typeFilter) return false;
      if (rarityFilter !== 'all' && decoRarity(item) !== rarityFilter) return false;
      if (motionFilter === 'animated' && !item.isAnimated) return false;
      if (motionFilter === 'static' && item.isAnimated) return false;
      if (ownedFilter === 'owned' && !inventory.includes(item.id)) return false;
      if (ownedFilter === 'unowned' && inventory.includes(item.id)) return false;
      if (wishOnly && !wishlist.includes(item.id)) return false;
      if (priceMax !== 'all') {
        const weekly = effectivePrice(item, now);
        const flash = dynamicDiscounts.deals[item.id];
        const current = flash ? Math.min(weekly, flash.discountedPrice) : weekly;
        if (current > Number(priceMax)) return false;
      }
      if (affordableOnly) {
        const weekly = effectivePrice(item, now);
        const flash = dynamicDiscounts.deals[item.id];
        const current = flash ? Math.min(weekly, flash.discountedPrice) : weekly;
        if (current > coin) return false;
      }
      if (q && !`${item.name} ${item.nameEn || ''} ${item.tags?.join(' ') || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const order = (item: ShopItem) => DECORATION_RARITY_META[decoRarity(item)].order;
    switch (sortMode) {
      case 'price-asc':
        return [...list].sort((a, b) => a.price - b.price || order(b) - order(a));
      case 'price-desc':
        return [...list].sort((a, b) => b.price - a.price || order(b) - order(a));
      case 'value':
        /* "Giá trị tốt nhất": chất lượng cao nhất cho mỗi Coin (qualityScore/price). */
        return [...list].sort((a, b) => (b.qualityScore ?? 0) / b.price - (a.qualityScore ?? 0) / a.price || order(b) - order(a));
      case 'newest':
        return [...list].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') || order(b) - order(a));
      default:
        /* Featured: nhóm theo rarity (mythic trên cùng), trong cùng rarity
           item chất lượng cao hơn (qualityScore) lên trước. */
        return [...list].sort(
          (a, b) => order(b) - order(a) || (b.qualityScore ?? 0) - (a.qualityScore ?? 0) || b.price - a.price,
        );
    }
  }, [activeItems, typeFilter, rarityFilter, motionFilter, ownedFilter, inventory, wishOnly, wishlist, priceMax, affordableOnly, coin, dynamicDiscounts, now, query, sortMode]);

  /* Infinite scroll: chỉ render 24 item mỗi nhịp; đổi bộ lọc → reset ở handler (không setState trong effect). */
  const resetPagination = () => setVisibleCount(PAGE_SIZE);
  /* "Xoá bộ lọc": về mặc định (giữ nguyên sắp xếp), đồng bộ localStorage. */
  const hasActiveFilters =
    typeFilter !== 'all' || rarityFilter !== 'all' || motionFilter !== 'all' ||
    ownedFilter !== 'all' || wishOnly || priceMax !== 'all' || affordableOnly || query.trim() !== '';
  const resetAllFilters = () => {
    setTypeFilter('all');
    setRarityFilter('all');
    setMotionFilter('all');
    setOwnedFilter('all');
    setWishOnly(false);
    setPriceMax('all');
    setAffordableOnly(false);
    setQuery('');
    saveFilters({ type: 'all', rarity: 'all', motion: 'all', price: 'all', afford: '' });
    resetPagination();
  };

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= filtered.length) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  const paged = filtered.slice(0, visibleCount);

  const inspected = inspectId ? activeItems.find((item) => item.id === inspectId) || null : null;

  useEffect(() => {
    if (!inspected) return undefined;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [inspected]);

  useEffect(() => {
    if (!unboxed) return undefined;
    const timer = window.setTimeout(() => unboxCtaRef.current?.focus(), 1300);
    return () => window.clearTimeout(timer);
  }, [unboxed]);

  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);

  /* Khóa cuộn nền tuyệt đối (cả body lẫn khung cuộn của ProfileModal) khi đang mở Xem trước hoặc Mở hộp quà. */
  useEffect(() => {
    if (!inspected && !unboxed) return undefined;
    if (typeof document === 'undefined') return undefined;
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const scrollContainers = Array.from(
      document.querySelectorAll<HTMLElement>('[data-profile-scroll-container], .modal-body'),
    );
    const prevContainerOverflows = scrollContainers.map((el) => el.style.overflowY);
    for (const el of scrollContainers) {
      el.style.overflowY = 'hidden';
    }
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      scrollContainers.forEach((el, idx) => {
        el.style.overflowY = prevContainerOverflows[idx] || '';
      });
    };
  }, [inspected, unboxed]);

  /* Esc chỉ đóng lớp trên cùng của shop, không đóng luôn hồ sơ phía sau. */
  const swallowEscape = (event: KeyboardEvent<HTMLElement>, close: () => void) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    close();
  };

  const buy = async (item: ShopItem) => {
    if (busy || buyingItemId) return;
    setBusy(true);
    setBuyingItemId(item.id);
    try {
      const ok = await onBuy(item);
      if (!ok) return;
      setInspectId(null);
      setUnboxed(item);
      setBurstTick((tick) => tick + 1);
      /* Huyền thoại: thêm một tiếng "mở khoá" đúng lúc vật phẩm bay ra khỏi hộp. */
      if (decoRarity(item) === 'mythic') window.setTimeout(() => playChime('level-up'), 850);
    } finally {
      setBusy(false);
      setBuyingItemId(null);
    }
  };

  const [pity, setPity] = useState<GachaPityState>(() => {
    const raw = safeStorage.getItem('fforum_gacha_pity_v1');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.epicPity === 'number' && typeof parsed?.mythicPity === 'number') {
          return {
            epicPity: Math.max(0, Math.min(GACHA_EPIC_PITY_LIMIT, parsed.epicPity)),
            mythicPity: Math.max(0, Math.min(GACHA_MYTHIC_PITY_LIMIT, parsed.mythicPity)),
            totalPulls: Number(parsed.totalPulls) || 0,
          };
        }
      } catch {
        /* ignore */
      }
    }
    return { epicPity: 0, mythicPity: 0, totalPulls: 0 };
  });
  const [gachaHistory, setGachaHistory] = useState<GachaHistoryItem[]>(() => {
    const raw = safeStorage.getItem('fforum_gacha_history_v1');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.slice(0, 8);
      } catch {
        /* ignore */
      }
    }
    return [];
  });

  /* Phần 3.D — Quay Gacha với bảo hiểm Pity 50 (Epic+) / 100 (Mythic) — rút từ pool Discord import. */
  const handleGachaPull = async (poolId: GachaPoolId) => {
    if (busy || readOnly) return;
    const pool = GACHA_POOLS[poolId];
    if (!pool || coin < pool.cost) return;

    setBusy(true);
    // eslint-disable-next-line react/purity -- Math.random chỉ chạy khi người dùng bấm nút quay
    const roll = rollGachaPull(poolId, pity, Math.random(), Math.random(), activeItems);
    const ok = await onBuy(roll.item);
    setBusy(false);
    if (!ok) return;

    setPity(roll.nextPity);
    safeStorage.setItem('fforum_gacha_pity_v1', JSON.stringify(roll.nextPity));

    const entry = makeGachaHistoryEntry(
      roll.item.id,
      roll.item.name,
      roll.rarity,
      pool.name,
      roll.pityTriggered,
    );
    setGachaHistory((prev) => {
      const next = [entry, ...prev].slice(0, 8);
      safeStorage.setItem('fforum_gacha_history_v1', JSON.stringify(next));
      return next;
    });

    setUnboxed(roll.item);
    setBurstTick((tick) => tick + 1);
    if (roll.rarity === 'legendary') {
      window.setTimeout(() => playChime('level-up'), 850);
    } else {
      playChime('success');
    }
  };

  const remainingToEpic = Math.max(1, GACHA_EPIC_PITY_LIMIT - pity.epicPity);
  const remainingToMythic = Math.max(1, GACHA_MYTHIC_PITY_LIMIT - pity.mythicPity);

  const activePreviewItem =
    activeItems.find((item) => item.id === previewItemId) ||
    activeItems.find((item) => equippedSlotOf(item)) ||
    currentHeroItem ||
    activeItems[0] ||
    null;

  return (
    <div className="gb-root">
      <header className="gb-head">
        <div className="gb-head__title">
          <span className="gb-head__mark" aria-hidden="true"><Sparkles size={16} /></span>
          <div>
            <h3>Gacha Boutique</h3>
            <p>Frame · Aura · Nameplate — F-Coin</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsGachaOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white border border-purple-400/45 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 hover:brightness-110 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🎲 {isGachaOpen ? 'Đóng Triệu Hồi Gacha' : 'Triệu Hồi Gacha (Pity 50/100)'}</span>
            </button>
          )}
          {readOnly ? (
            <span className="gb-viewonly">Chế độ trưng bày</span>
          ) : (
            <div className="gb-wallet" aria-label={`Số dư ${formatCoinBalance(coin)} Coin`}>
              <Coins size={15} aria-hidden="true" />
              <b>{formatCoinBalance(coin)}</b>
              <span>Coin</span>
            </div>
          )}
        </div>
      </header>

      {/* Item yêu thích đang sale (flash + tuần) — 1 chạm vào danh sách yêu thích. */}
      {!readOnly && wishOnDealCount > 0 && (
        <button type="button" className="gb-wish-deal" onClick={() => setWishOnly(true)}>
          <Flame size={11} aria-hidden="true" /> {wishOnDealCount} item yêu thích đang sale — xem ngay
        </button>
      )}

      {catalogLoading && activeItems.length === 0 && (
        <div className="gb-empty" role="status">
          <p>Đang tải kho trang trí…</p>
        </div>
      )}

      {/* TOP HERO BANNER — 6 MYTHIC TIÊU ĐIỂM. Bấm BẤT KỲ ĐÂU trên banner
          → mở CÙNG 1 modal preview chuẩn (gb-inspect) — không có nút riêng. */}
      {currentHeroItem && (
        <section
          className="gb-hero-carousel"
          aria-label={`Trang trí Mythic tiêu điểm: ${currentHeroItem.name}. Bấm để xem trước`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setPreviewItemId(currentHeroItem.id);
            inspectItem(currentHeroItem.id);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setPreviewItemId(currentHeroItem.id);
              inspectItem(currentHeroItem.id);
            }
          }}
        >
          <div className="gb-hero-carousel__stars" aria-hidden="true" />
          <div className="gb-hero-carousel__grid">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="gb-mythic-pill">
                  <span className="rarity-dot mythic" aria-hidden="true" />
                  MYTHIC
                </span>
                <span className="text-[11px] font-mono text-amber-200/90 px-2.5 py-0.5 rounded-full bg-white/8 border border-white/15">
                  {DECORATION_TYPE_META[currentHeroItem.category === 'Nameplate' ? 'nameplate' : currentHeroItem.category === 'Avatar Aura' ? 'avatar_aura' : 'avatar_frame'].label}
                </span>
              </div>
              <h4 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {currentHeroItem.name}
              </h4>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <span className="gb-hero__hint" aria-hidden="true">
                  <Sparkles size={13} /> Bấm để xem trước trên avatar
                </span>
                {mythicShowcaseItems.length > 1 && (
                  <div
                    className="flex items-center gap-1.5"
                    role="tablist"
                    aria-label="Chuyển trang trí Mythic"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {mythicShowcaseItems.map((mItem, idx) => (
                      <button
                        key={mItem.id}
                        type="button"
                        onClick={() => setHeroIdx(idx)}
                        aria-label={`Xem ${mItem.name}`}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === heroIdx % mythicShowcaseItems.length
                            ? 'w-6 bg-gradient-to-r from-amber-400 to-pink-500'
                            : 'w-2 bg-white/25 hover:bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              onClick={() => {
                setPreviewItemId(currentHeroItem.id);
                inspectItem(currentHeroItem.id);
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.04] border border-white/15 cursor-pointer hover:scale-105 transition-transform"
              title="Bấm để xem trước trên Avatar"
            >
              <div className="gb-hero__avatar">
                <AvatarWithDecoration
                  avatarUrl={userAvatar || DEFAULT_AVATAR}
                  decorationAsset={itemToAsset(currentHeroItem)}
                  size={84}
                  eager
                />
              </div>
              <span className="mt-1.5 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                <Coins size={12} /> {effectivePrice(currentHeroItem, now).toLocaleString('vi-VN')} Coin
              </span>
            </div>
          </div>
        </section>
      )}

      {/* DIỆN MẠO HIỆN TẠI — TRY-ON DOCK kiểu Discord Nitro */}
      {activePreviewItem && (() => {
        const pAsset = itemToAsset(activePreviewItem);
        const pOwned = inventory.includes(activePreviewItem.id);
        const pEquipped = !!equippedSlotOf(activePreviewItem);
        const pWeeklyPrice = effectivePrice(activePreviewItem, now);
        const pDynDeal = dynamicDiscounts.deals[activePreviewItem.id];
        const pPrice = pDynDeal ? Math.min(pWeeklyPrice, pDynDeal.discountedPrice) : pWeeklyPrice;
        const pCanAfford = coin >= pPrice;
        return (
          <section
            className={`gb-discord-preview gb-discord-preview--${decoRarity(activePreviewItem)}`}
            aria-label="Diện mạo hiện tại (try-on)"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <div className="relative flex items-center justify-center shrink-0">
                  {/* CHUẨN DISCORD: preview shop KHÔNG render nameplate (chỉ có
                     ở Profile Card đầy đủ) — avatar nhỏ chỉ nhận frame/aura. */}
                  <AvatarWithDecoration
                    avatarUrl={userAvatar || DEFAULT_AVATAR}
                    decorationAsset={pAsset.type === 'nameplate' ? null : pAsset}
                    size={84}
                    eager
                    className="gb-discord-preview__avatar"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">
                      DIỆN MẠO HIỆN TẠI
                    </span>
                    <span className="gb-rarity-badge-clean">
                      <span className="rarity-dot" style={{ background: DECORATION_RARITY_META[decoRarity(activePreviewItem)].color }} aria-hidden="true" />
                      {DECORATION_RARITY_META[decoRarity(activePreviewItem)].en.toUpperCase()}
                    </span>
                    {activePreviewItem.isAnimated && <span className="gb-tag gb-tag--anim">Động</span>}
                  </div>
                  {pAsset.type === 'nameplate' ? (
                    <div className="py-0.5">
                      <span className="npd-np" style={{ width: 240, height: 45 }}>
                        <NameplateDisplay asset={pAsset} size={240} animate eager fill className="npd-np__bg" />
                        <span className="npd-np__text">{userName}</span>
                      </span>
                    </div>
                  ) : (
                    <strong className="text-sm sm:text-base font-extrabold text-white truncate block">
                      {userName}
                    </strong>
                  )}
                  <p className="text-xs text-white/75 truncate max-w-md">
                    Đang thử: <b className="text-white">{activePreviewItem.name}</b>
                  </p>
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2 shrink-0">
                  {pOwned ? (
                    <button
                      type="button"
                      onClick={() => void onEquip(activePreviewItem, pEquipped ? null : activePreviewItem.id)}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition cursor-pointer shadow-md"
                    >
                      {pEquipped ? 'Đang trang bị (Gỡ)' : 'Trang bị ngay'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!pCanAfford || busy}
                      onClick={() => void buy(activePreviewItem)}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:brightness-110 disabled:opacity-40 transition cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Coins size={13} />
                      <span>
                        {pCanAfford ? `Mua & thử (${pPrice.toLocaleString('vi-VN')}C)` : `Thiếu ${(pPrice - coin).toLocaleString('vi-VN')}C`}
                      </span>
                    </button>
                  )}
                  {previewItemId && previewItemId !== (equippedSlotOf(activePreviewItem) || '') && (
                    <button
                      type="button"
                      onClick={() => setPreviewItemId(null)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white/75 bg-white/6 hover:bg-white/12 border border-white/10 transition cursor-pointer"
                    >
                      Hủy
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* GACHA SUMMON SANCTUARY & PITY SYSTEM (50 EPIC+ / 100 MYTHIC) */}
      {isGachaOpen && !readOnly && (
        <section className="gb-gacha-deck animate-fade-up" aria-label="Hệ thống quay Gacha và bảo hiểm Pity">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>🔮 Điện Triệu Hồi Gacha &amp; Bảo Hiểm Pity</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-200 border border-purple-400/40">
                  Mythic tối đa ≤ 5%
                </span>
              </h4>
              <p className="text-xs text-white/65 mt-0.5">
                Mỗi lượt quay trừ Coin đúng giá danh sách của vật phẩm trúng (khoảng giá {priceRangeLabel} Coin).
                Đảm bảo từ <strong>Epic+ ở lượt 50</strong> và <strong>Mythic 👑 ở lượt 100</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOddsModal((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-xs font-semibold text-cyan-200 cursor-pointer shrink-0"
            >
              {showOddsModal ? 'Ẩn bảng tỷ lệ %' : '📊 Xem bảng tỷ lệ minh bạch'}
            </button>
          </div>

          {/* Thanh đếm ngược Pity (Còn X lần nữa đảm bảo ra Epic/Mythic) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-purple-400/25 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-200">⭐⭐ Bảo hiểm Epic+ (Mốc 50)</span>
                <span className="font-mono font-bold text-white">
                  Còn {remainingToEpic} lần nữa đảm bảo ra Epic+
                </span>
              </div>
              <div className="gb-pity-bar">
                <div
                  className="gb-pity-bar__fill"
                  style={{
                    width: `${Math.min(100, (pity.epicPity / GACHA_EPIC_PITY_LIMIT) * 100)}%`,
                    background: 'linear-gradient(90deg, #8B5CF6, #D946EF)',
                  }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-amber-400/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-200">👑✨ Bảo hiểm Mythic (Mốc 100)</span>
                <span className="font-mono font-bold text-amber-300">
                  Còn {remainingToMythic} lần nữa đảm bảo ra Mythic
                </span>
              </div>
              <div className="gb-pity-bar">
                <div
                  className="gb-pity-bar__fill"
                  style={{
                    width: `${Math.min(100, (pity.mythicPity / GACHA_MYTHIC_PITY_LIMIT) * 100)}%`,
                    background: 'linear-gradient(90deg, #F59E0B, #EC4899, #8B5CF6)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bảng tỷ lệ rơi vật phẩm minh bạch */}
          {showOddsModal && (
            <div className="mb-3 p-3.5 rounded-2xl bg-[#0A0E1A]/90 border border-cyan-400/30 text-xs space-y-2 animate-fade-up">
              <div className="font-bold text-cyan-200">
                📐 Bảng Tỷ Lệ Rơi Vật Phẩm Chính Thức (Cam kết Mythic không vượt quá 5%):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['standard', 'epic_focus', 'mythic_hunter'] as GachaPoolId[]).map((pid) => {
                  const p = GACHA_POOLS[pid];
                  return (
                    <div key={pid} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <div className="font-bold text-white">{p.name} ({p.cost}C)</div>
                      <div className="text-[11px] text-white/70 font-mono">
                        • Common: {p.rates.common}% | Rare: {p.rates.rare}%
                      </div>
                      <div className="text-[11px] text-purple-300 font-mono font-semibold">
                        • Epic: {p.rates.epic}% | 👑 Mythic: {p.rates.legendary}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3 Gói Quay Gacha */}
          <div className="gb-gacha-pools">
            {(['standard', 'epic_focus', 'mythic_hunter'] as GachaPoolId[]).map((pid) => {
              const pool = GACHA_POOLS[pid];
              const canAffordPool = coin >= pool.cost;
              return (
                <div
                  key={pid}
                  className={`gb-gacha-pool-card ${pid === 'mythic_hunter' ? 'gb-gacha-pool-card--mythic' : ''}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full text-white"
                        style={{ background: pool.accentGradient }}
                      >
                        {pool.badge}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
                        <Coins size={12} /> {pool.cost} Coin
                      </span>
                    </div>
                    <h5 className="text-sm font-extrabold text-white">{pool.name}</h5>
                    <p className="text-[11px] text-white/65 leading-snug">{pool.subtitle}</p>
                    <div className="text-[10.5px] font-mono text-white/75 pt-1">
                      Epic: <b className="text-purple-300">{pool.rates.epic}%</b> · Mythic:{' '}
                      <b className="text-amber-300">{pool.rates.legendary}%</b>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAffordPool || busy}
                    onClick={() => void handleGachaPull(pid)}
                    style={{ background: canAffordPool ? pool.accentGradient : undefined }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-extrabold text-white border border-white/20 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition hover:brightness-110"
                  >
                    {canAffordPool ? `Quay 1 Lần (${pool.cost} Coin)` : `Thiếu ${pool.cost - coin} Coin`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Lịch sử quay gần đây */}
          {gachaHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/55 block mb-1.5">
                Lịch sử triệu hồi gần đây ({pity.totalPulls} lượt):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {gachaHistory.map((h) => (
                  <span
                    key={h.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] whitespace-nowrap"
                  >
                    <span>{RARITY_PREMIUM_META[h.rarity].badgeIcon}</span>
                    <strong className="text-white">{h.itemName}</strong>
                    <span className="text-white/45 font-mono">({h.pulledAt})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* THANH ĐẾM NGƯỢC XOAY VÒNG GIẢM GIÁ 6H */}
      <div className="gb-rarity-bar" aria-label="Thông tin đợt giảm giá 6 giờ">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="gb-sale-tag gb-sale-tag--super">🔥 FLASH SALE 6H</span>
          <span className="text-xs text-white/80">
            Đang giảm giá <b>{dynamicDiscounts.list.length} trang trí</b> (10% → 90% OFF)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
          <Clock3 size={13} />
          <span>Reset sau: <b>{formatCountdownHMS(dynamicDiscounts.remainingMs)}</b></span>
        </div>
      </div>

      {dealItem && (
        <button type="button" className="gb-deal" onClick={() => inspectItem(dealItem.id)}>
          <span className="gb-deal__icon" aria-hidden="true"><Tag size={14} /></span>
          <span className="gb-deal__text">
            Ưu đãi tuần <b>−{deal.percent}%</b> · {dealItem.name}
          </span>
          <span className="gb-deal__timer"><Clock3 size={12} aria-hidden="true" /> còn {formatCountdown(deal.endsAt - now)}</span>
        </button>
      )}

      {/* ĐẠI CẬP NHẬT — DEAL HÔM NAY: item chất lượng cao đang sale, xoay theo ngày */}
      {dailyDeal && (
        <button type="button" className="gb-daily-deal" onClick={() => inspectItem(dailyDeal.item.id)}>
          <span className="gb-daily-deal__media">
            <img
              src={resolveAssetUrl(dailyDeal.item.previewUrl) ?? dailyDeal.item.previewUrl ?? undefined}
              alt={`Deal hôm nay: ${dailyDeal.item.name}`}
              width={72}
              height={72}
              loading="eager"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
          </span>
          <span className="gb-daily-deal__body">
            <span className="gb-daily-deal__kicker">
              <Tag size={11} aria-hidden="true" /> DEAL HÔM NAY{dailyDeal.isSuperSale ? ' · SIÊU SALE' : ''}
            </span>
            <span className="gb-daily-deal__name">
              {dailyDeal.item.name}
              <em className="gb-rarity-badge-clean">
                <span className="rarity-dot" style={{ background: DECORATION_RARITY_META[decoRarity(dailyDeal.item)].color }} aria-hidden="true" />
                {DECORATION_RARITY_META[decoRarity(dailyDeal.item)].en}
              </em>
            </span>
            <span className="gb-daily-deal__price">
              <s>{dailyDeal.item.price.toLocaleString('vi-VN')}</s>
              <b>{dailyDeal.price.toLocaleString('vi-VN')} Coin</b>
              <span className="gb-daily-deal__off">−{dailyDeal.percent}%</span>
            </span>
          </span>
          <span className="gb-daily-deal__timer">
            <Clock3 size={13} aria-hidden="true" />
            {formatCountdownHMS(dailyDeal.endsAt - now)}
          </span>
        </button>
      )}

      {/* ĐẠI CẬP NHẬT — BỘ SƯU TẬP CỦA BẠN: tiến độ 873 item theo độ hiếm */}
      <section className="gb-collection" aria-label="Bộ sưu tập của bạn">
        <div className="gb-collection__head">
          <b>Bộ sưu tập của bạn</b>
          <span className="gb-collection__count">
            {collection.owned}/{collection.total} · {collection.percent}%
          </span>
        </div>
        {/* 4.3: 1 stacked bar compact (màu = rarity, fill = phần đã sở hữu)
            + legend 1 dòng — thay cho 4 khối pill chiếm chỗ dọc. */}
        <div className="gb-collection__stack" aria-label="Phân bổ theo độ hiếm (bấm để lọc)">
          {collection.byRarity.map((row) => (
            <button
              key={row.rarity}
              type="button"
              className="gb-collection__seg"
              style={{
                width: collection.total ? `${(row.total / collection.total) * 100}%` : '25%',
                '--rar-color': DECORATION_RARITY_META[row.rarity].color,
              } as React.CSSProperties}
              aria-pressed={rarityFilter === row.rarity}
              aria-label={`${DECORATION_RARITY_META[row.rarity].label}: đã có ${row.owned}/${row.total} — bấm để lọc`}
              title={`${DECORATION_RARITY_META[row.rarity].label} ${row.owned}/${row.total} — bấm để lọc`}
              onClick={() => {
                setRarityFilter((cur) => (cur === row.rarity ? 'all' : row.rarity));
                saveFilters({ rarity: rarityFilter === row.rarity ? 'all' : row.rarity });
                resetPagination();
              }}
            >
              <i aria-hidden="true" style={{ width: row.total ? `${(row.owned / row.total) * 100}%` : '0%' }} />
            </button>
          ))}
        </div>
        <div className="gb-collection__legend" role="group" aria-label="Đếm theo độ hiếm">
          {collection.byRarity.map((row) => (
            <button
              key={row.rarity}
              type="button"
              className="gb-collection__lg"
              style={{ '--rar-color': DECORATION_RARITY_META[row.rarity].color } as React.CSSProperties}
              aria-pressed={rarityFilter === row.rarity}
              onClick={() => {
                setRarityFilter((cur) => (cur === row.rarity ? 'all' : row.rarity));
                saveFilters({ rarity: rarityFilter === row.rarity ? 'all' : row.rarity });
                resetPagination();
              }}
            >
              <i aria-hidden="true" />
              {DECORATION_RARITY_META[row.rarity].label} {row.owned}/{row.total}
            </button>
          ))}
        </div>
      </section>

      {/* Bộ lọc GỘP 1 HÀNG (fix lặp 2 hàng): Loại (dropdown) + Rarity + Sở hữu
          + Chuyển động + Giá — flex-wrap, không chồng chéo. */}
      <div className="gb-filters" role="group" aria-label="Bộ lọc trang trí">
        <select
          value={typeFilter}
          onChange={(event) => { setTypeFilter(event.target.value as TypeFilter); saveFilters({ type: event.target.value }); resetPagination(); }}
          aria-label="Loại trang trí"
          className="gb-filters__type"
        >
          {TYPE_FILTERS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <span className="gb-filters__divider" aria-hidden="true" />
        {DECORATION_RARITIES.map((rarity) => (
          <button
            key={rarity}
            type="button"
            data-rarity={legacyRarityClass(rarity)}
            aria-pressed={rarityFilter === rarity}
            className={rarityFilter === rarity ? 'is-active' : ''}
            style={{ '--gb-rarity-color': DECORATION_RARITY_META[rarity].color } as CSSProperties}
            onClick={() => {
              setRarityFilter((cur) => (cur === rarity ? 'all' : rarity));
              saveFilters({ rarity: rarityFilter === rarity ? 'all' : rarity });
              resetPagination();
            }}
          >
            <i aria-hidden="true" />
            {DECORATION_RARITY_META[rarity].label}
          </button>
        ))}
        <span className="gb-filters__divider" aria-hidden="true" />
        {/* Sở hữu: 1 bộ lọc duy nhất (gộp với toggle "Đã có/Chưa có" cũ). */}
        <button
          type="button"
          aria-pressed={ownedFilter === 'owned'}
          className={ownedFilter === 'owned' ? 'is-active' : ''}
          onClick={() => { setOwnedFilter((cur) => (cur === 'owned' ? 'all' : 'owned')); resetPagination(); }}
        >
          <Check size={11} aria-hidden="true" /> Đã có ({collection.owned})
        </button>
        <button
          type="button"
          aria-pressed={ownedFilter === 'unowned'}
          className={ownedFilter === 'unowned' ? 'is-active' : ''}
          onClick={() => { setOwnedFilter((cur) => (cur === 'unowned' ? 'all' : 'unowned')); resetPagination(); }}
        >
          Chưa có ({collection.total - collection.owned})
        </button>
        <span className="gb-filters__divider" aria-hidden="true" />
        <button type="button" aria-pressed={motionFilter === 'animated'} className={motionFilter === 'animated' ? 'is-active' : ''} onClick={() => { setMotionFilter((cur) => (cur === 'animated' ? 'all' : 'animated')); saveFilters({ motion: motionFilter === 'animated' ? 'all' : 'animated' }); resetPagination(); }}>
          Có animation
        </button>
        <button type="button" aria-pressed={motionFilter === 'static'} className={motionFilter === 'static' ? 'is-active' : ''} onClick={() => { setMotionFilter((cur) => (cur === 'static' ? 'all' : 'static')); saveFilters({ motion: motionFilter === 'static' ? 'all' : 'static' }); resetPagination(); }}>
          Tĩnh
        </button>
        <button
          type="button"
          aria-pressed={sortMode === 'price-asc'}
          className={sortMode === 'price-asc' ? 'is-active' : ''}
          title="Sắp xếp giá: thấp → cao (bấm lại về Nổi bật)"
          onClick={() => {
            const next = sortMode === 'price-asc' ? 'featured' : 'price-asc';
            setSortMode(next);
            saveFilters({ sort: next });
            resetPagination();
          }}
        >
          <TrendingUp size={12} aria-hidden="true" /> Giá thấp → cao
        </button>
        <button
          type="button"
          aria-pressed={affordableOnly}
          className={affordableOnly ? 'is-active is-affordable' : ''}
          title={`Chỉ hiện item giá thực tế ≤ ${formatCoinBalance(coin)} Coin hiện tại của bạn (bấm lại để tắt)`}
          onClick={() => { setAffordableOnly((cur) => !cur); saveFilters({ afford: affordableOnly ? '' : '1' }); resetPagination(); }}
        >
          <Coins size={12} aria-hidden="true" /> Tôi mua được ({affordableCount})
        </button>
        {!readOnly && onToggleWishlist && (
          <button
            type="button"
            aria-pressed={wishOnly}
            className={wishOnly ? 'is-active is-wished' : ''}
            onClick={() => { setWishOnly((cur) => !cur); resetPagination(); }}
            title="Chỉ hiện item đã yêu thích"
          >
            <Heart size={11} aria-hidden="true" /> Yêu thích ({wishlist.length})
          </button>
        )}
      </div>

      <div className="gb-searchbar" role="search">
        <div className="gb-searchbar__field">
          <Search size={13} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); resetPagination(); }}
            placeholder="Tìm trang trí (tên, chủ đề…)"
            aria-label="Tìm trang trí"
          />
        </div>
        <select
          value={priceMax}
          onChange={(event) => { setPriceMax(event.target.value as PriceMaxFilter); saveFilters({ price: event.target.value }); resetPagination(); }}
          aria-label="Giá tối đa"
          className="gb-searchbar__sort"
        >
          <option value="all">Mọi giá</option>
          <option value="2500">≤ 2.500 Coin</option>
          <option value="3500">≤ 3.500 Coin</option>
          <option value="5000">≤ 5.000 Coin</option>
        </select>
        <select
          value={sortMode}
          onChange={(event) => { setSortMode(event.target.value as SortMode); saveFilters({ sort: event.target.value }); resetPagination(); }}
          aria-label="Sắp xếp"
          className="gb-searchbar__sort"
        >
          <option value="featured">Nổi bật</option>
          <option value="price-asc">Giá: thấp → cao</option>
          <option value="price-desc">Giá: cao → thấp</option>
          <option value="value">Giá trị tốt nhất</option>
          <option value="newest">Mới nhất</option>
        </select>
        <span className="gb-searchbar__count">{filtered.length} trang trí</span>
        {hasActiveFilters && (
          <button
            type="button"
            className="gb-searchbar__reset"
            onClick={resetAllFilters}
            title="Xoá mọi bộ lọc (giữ nguyên sắp xếp)"
          >
            <X size={11} aria-hidden="true" /> Xoá bộ lọc
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="gb-empty">
          <CuBong mood="sleepy" size={96} decorative />
          {wishOnly && !readOnly && wishlist.length === 0 ? (
            <p>
              Chưa có item yêu thích nào. Bấm <Heart size={12} aria-hidden="true" /> trên bất kỳ card nào để lưu vào danh
              sách, sau đó trở lại đây để xem nhanh!
            </p>
          ) : (
            <p>Kệ này còn trống… Cú Bông ngủ gật luôn rồi. Thử bộ lọc khác nhé!</p>
          )}
        </div>
      ) : (
        <div className="gb-masonry shop-grid" role="list" aria-label="Trang trí trong Gacha Boutique">
          {paged.map((item, index) => {
            const rarity = decoRarity(item);
            const rarityMeta = DECORATION_RARITY_META[rarity];
            const owned = inventory.includes(item.id);
            const equipped = !!equippedSlotOf(item);
            const weeklyPrice = effectivePrice(item, now);
            const dynDeal = dynamicDiscounts.deals[item.id];
            const price = dynDeal ? Math.min(weeklyPrice, dynDeal.discountedPrice) : weeklyPrice;
            const discountPercent = dynDeal ? dynDeal.percent : (weeklyPrice !== item.price ? deal.percent : 0);
            const onDeal = price !== item.price;
            const tipId = `gb-tip-${uid}-${item.id}`;
            const showHoverVideo = hoveredId === item.id && item.isAnimated && !!item.animatedAssetUrl;
            return (
              <div role="listitem" key={item.id} className="gb-cell" style={{ '--i': Math.min(index, 14), '--gb-rarity-color': rarityMeta.color, '--gb-rarity-glow': rarityMeta.glow } as CSSProperties}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`gb-card gb-card--${legacyRarityClass(rarity)} ${owned ? 'is-owned' : ''}`}
                  aria-describedby={tipId}
                  aria-label={`${item.name}, ${rarityMeta.label}, ${owned ? (equipped ? 'đang đeo' : 'đã sở hữu') : `${price} Coin`}. Mở xem trước`}
                  onMouseEnter={() => {
                    setPreviewItemId(item.id);
                    setHoveredId(item.id);
                  }}
                  onMouseLeave={() => setHoveredId((cur) => (cur === item.id ? null : cur))}
                  onFocus={() => {
                    setPreviewItemId(item.id);
                    setHoveredId(item.id);
                  }}
                  onBlur={() => setHoveredId((cur) => (cur === item.id ? null : cur))}
                  onClick={() => {
                    setPreviewItemId(item.id);
                    inspectItem(item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setPreviewItemId(item.id);
                      inspectItem(item.id);
                    }
                  }}
                >
                  <span className="gb-card__frame" aria-hidden="true" />
                  <span className="gb-card__shine" aria-hidden="true" />
                  <span className="gb-card__tags" aria-hidden="true">
                    {isNewItem(item, now) && <em className="gb-tag gb-tag--new">Mới</em>}
                    {hotIds.has(item.id) && <em className="gb-tag gb-tag--hot"><Flame size={10} />Hot</em>}
                    {onDeal && !owned && (
                      <em className={`gb-tag gb-tag--deal ${dynDeal?.isSuperSale ? 'gb-sale-tag--super' : ''}`}>
                        {dynDeal?.isSuperSale ? `SIÊU SALE −${discountPercent}%` : `−${discountPercent}%`}
                      </em>
                    )}
                  </span>
                  {/* Góc phải: icon loại trang trí, hover mới hiện tooltip tên loại */}
                  <span className="gb-card__cat-corner" aria-hidden="true">
                    {renderCategoryIcon(item.category)}
                    <span className="gb-card__cat-tooltip">{item.category}</span>
                  </span>

                  <span className="gb-card__stage" aria-hidden="true">
                    <span className="gb-card__aura" />
                    {rarity === 'mythic' && (
                      <span className="gb-card__sparks">
                        {Array.from({ length: 6 }, (_, spark) => <i key={spark} style={{ '--s': spark } as CSSProperties} />)}
                      </span>
                    )}
                    {showHoverVideo && item.animatedAssetUrl ? (
                      <video
                        className="gb-card__media"
                        src={resolveAssetUrl(item.animatedAssetUrl) || undefined}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onError={(event) => {
                          (event.currentTarget as HTMLVideoElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <img
                        className="gb-card__media"
                        src={resolveAssetUrl(item.previewUrl) || undefined}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </span>
                  <span className="gb-card__meta">
                    <span className="gb-card__rarity">
                      <span className="rarity-dot" style={{ background: rarityMeta.color }} aria-hidden="true" />
                      {rarityMeta.en.toUpperCase()}
                    </span>
                    <span className="gb-card__name">{item.name}</span>
                    <span className="gb-card__price">
                      {owned ? (
                        <span className="gb-owned">{equipped ? <><Check size={11} aria-hidden="true" /> Đang đeo</> : 'Đã sở hữu'}</span>
                      ) : (
                        <>
                          <Coins size={12} aria-hidden="true" />
                          <b>{price.toLocaleString('vi-VN')}</b>
                          {onDeal && <s>{item.price.toLocaleString('vi-VN')}</s>}
                        </>
                      )}
                    </span>
                  </span>
                  {!readOnly && onToggleWishlist && (
                    <button
                      type="button"
                      className={`gb-card__wish${wishlist.includes(item.id) ? ' is-wished' : ''}`}
                      aria-pressed={wishlist.includes(item.id)}
                      aria-label={wishlist.includes(item.id) ? `Bỏ yêu thích ${item.name}` : `Yêu thích ${item.name}`}
                      title={wishlist.includes(item.id) ? 'Bỏ yêu thích' : 'Yêu thích'}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleWishlist(item);
                      }}
                    >
                      <Heart size={13} fill={wishlist.includes(item.id) ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                  )}
                  <span className="gb-card__tip" id={tipId} role="tooltip">
                    <b>{item.name}</b>
                    <span><Coins size={11} aria-hidden="true" /> {price.toLocaleString('vi-VN')} Coin</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visibleCount < filtered.length && (
        <div ref={sentinelRef} className="gb-sentinel" aria-hidden="true" />
      )}

      {inspected && (() => {
        const rarity = decoRarity(inspected);
        const rarityMeta = DECORATION_RARITY_META[rarity];
        const owned = inventory.includes(inspected.id);
        const equipped = !!equippedSlotOf(inspected);
        const price = effectivePrice(inspected, now);
        const onDeal = price !== inspected.price;
        const canAfford = coin >= price;
        const asset = itemToAsset(inspected);
        const isBuyingThis = busy || buyingItemId === inspected.id;
        const inspectNode = (
          <div
            className="gb-inspect"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`gb-inspect-title-${uid}`}
            onKeyDown={(event) => swallowEscape(event, () => { if (!isBuyingThis) setInspectId(null); })}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="gb-inspect__backdrop"
              aria-label="Đóng xem trước"
              tabIndex={-1}
              disabled={isBuyingThis}
              onClick={() => { if (!isBuyingThis) setInspectId(null); }}
            />
            <section className={`gb-inspect__panel gb-inspect__panel--${legacyRarityClass(rarity)}`} style={{ '--gb-rarity-color': rarityMeta.color } as CSSProperties}>
              <button
                ref={closeRef}
                type="button"
                className="gb-inspect__close"
                aria-label="Đóng"
                disabled={isBuyingThis}
                onClick={() => { if (!isBuyingThis) setInspectId(null); }}
              >
                <X size={16} />
              </button>
              <div className="gb-inspect__stage flex flex-col items-center justify-center p-4">
                <span className="gb-inspect__halo" aria-hidden="true" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 mb-3 z-10">
                  [AVATAR PREVIEW · 200PX]
                </span>
                {/* Xem trên avatar THẬT của user, 200px (quy chuẩn 180–256px — context lớn) */}
                {asset.type === 'nameplate' ? (
                  <div className="relative flex flex-col items-center justify-center my-2 z-10 gap-3">
                    <AvatarWithDecoration
                      avatarUrl={userAvatar || DEFAULT_AVATAR}
                      size={92}
                      eager
                    />
                    <span className="npd-np gb-inspect__np" style={{ width: 268, height: 50 }}>
                      <NameplateDisplay asset={asset} size={268} animate eager fill className="npd-np__bg" />
                      <span className="npd-np__text">{userName}</span>
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="relative flex flex-col items-center justify-center my-2 z-10">
                      <AvatarWithDecoration
                        avatarUrl={userAvatar || DEFAULT_AVATAR}
                        decorationAsset={asset}
                        size={200}
                        eager
                      />
                    </div>
                    <div className="mt-3 text-center z-10 space-y-1">
                      <div className="text-sm font-extrabold text-white">{userName}</div>
                    </div>
                  </>
                )}
                <span className="gb-inspect__pedestal" aria-hidden="true" />
              </div>
              <div className="gb-inspect__info">
                <span className={`gb-rarity gb-rarity--${legacyRarityClass(rarity)}`}>
                  <span className="rarity-dot" style={{ background: rarityMeta.color }} aria-hidden="true" />
                  {rarityMeta.en.toUpperCase()} · {rarityMeta.label}
                </span>
                <h3 id={`gb-inspect-title-${uid}`}>{inspected.name}</h3>

                <div className="gb-inspect__preview">
                  <span>Xem khi đeo</span>
                  {asset.type === 'nameplate' ? (
                    <div className="gb-inspect__np-ctx">
                      <Info size={13} aria-hidden="true" />
                      <span>
                        Hiển thị trên <b>Hồ Sơ đầy đủ</b>.
                      </span>
                    </div>
                  ) : (
                    <div className="gb-inspect__chip">
                      <span className="gb-inspect__avatar" aria-hidden="true">
                        <AvatarWithDecoration
                          avatarUrl={userAvatar || DEFAULT_AVATAR}
                          decorationAsset={asset}
                          size={40}
                          eager
                          alt={userName}
                        />
                      </span>
                      <b>{userName}</b>
                    </div>
                  )}
                </div>

                <div className="gb-inspect__buy">
                  {!owned && (
                    <div className="gb-inspect__price">
                      <Coins size={16} aria-hidden="true" />
                      <b>{price.toLocaleString('vi-VN')}</b>
                      {onDeal && <s>{inspected.price.toLocaleString('vi-VN')}</s>}
                      {onDeal && <em>còn {formatCountdown(deal.endsAt - now)}</em>}
                    </div>
                  )}
                  {readOnly ? (
                    <p className="gb-inspect__readonly">Chỉ chủ hồ sơ mới mua hoặc đeo được trang trí này.</p>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {owned ? (
                        <button
                          type="button"
                          className={`gb-buy gb-buy--equip ${equipped ? 'is-on' : ''}`}
                          onClick={() => void onEquip(inspected, equipped ? null : inspected.id)}
                        >
                          {equipped ? 'Gỡ trang bị' : 'Trang bị ngay'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`gb-buy gb-buy--${rarity}`}
                          disabled={!canAfford || isBuyingThis}
                          onClick={() => void buy(inspected)}
                        >
                          <span className="gb-buy__rays" aria-hidden="true" />
                          {canAfford ? (
                            isBuyingThis ? (
                              <>
                                <Lock size={14} aria-hidden="true" />
                                <span>Đang khóa &amp; mở hộp…</span>
                              </>
                            ) : (
                              'Mua ngay'
                            )
                          ) : (
                            `Thiếu ${(price - coin).toLocaleString('vi-VN')} Coin`
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className="gb-ghost"
                        disabled={isBuyingThis}
                        onClick={() => setInspectId(null)}
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        );
        return typeof document !== 'undefined' ? createPortal(inspectNode, document.body) : inspectNode;
      })()}

      {unboxed && (() => {
        const rarity = decoRarity(unboxed);
        const unboxRarity = legacyRarityClass(rarity);
        const unboxedAsset = itemToAsset(unboxed);
        const unboxNode = (
          <div
            className={`gb-unbox gb-unbox--${unboxRarity} ${rarity === 'mythic' ? 'gb-unbox--mythic-shake' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={`Đã mở khoá ${unboxed.name}`}
            onKeyDown={(event) => swallowEscape(event, () => setUnboxed(null))}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            onClick={(event) => {
              if (event.target === event.currentTarget) setUnboxed(null);
            }}
          >
            <div className="gb-unbox__card">
              <button
                type="button"
                className="gb-unbox__close"
                aria-label="Đóng hộp mở khóa"
                onClick={() => setUnboxed(null)}
              >
                <X size={16} />
              </button>
              <span className="gb-unbox__vault-pill">
                <Lock size={11} aria-hidden="true" />
                <span>VẬT PHẨM ĐÃ KHÓA VÀO TỦ ĐỒ CÁ NHÂN</span>
              </span>
              <div className="gb-unbox__scene" aria-hidden="true">
                <span className="gb-unbox__rays" />
                <span className="gb-unbox__box">
                  <span className="gb-unbox__lid" />
                  <span className="gb-unbox__body" />
                  <span className="gb-unbox__ribbon" />
                </span>
                <span className="gb-unbox__item">
                  {unboxed.category === 'Nameplate' ? (
                    <span className="npd-np" style={{ width: 236, height: 44 }}>
                      <NameplateDisplay asset={unboxedAsset} size={236} animate eager fill className="npd-np__bg" />
                      <span className="npd-np__text">{userName}</span>
                    </span>
                  ) : (
                    <AvatarWithDecoration
                      avatarUrl={userAvatar || DEFAULT_AVATAR}
                      decorationAsset={unboxedAsset}
                      size={148}
                      eager
                      animate
                      priority="high"
                    />
                  )}
                </span>
              </div>
              <p className="gb-unbox__title" role="status">Đã mở khoá thành công!</p>
              <b className="gb-unbox__name">{unboxed.name}</b>
              <span className={`gb-rarity gb-rarity--${unboxRarity}`}>{DECORATION_RARITY_META[rarity].label}</span>
              <div className="gb-unbox__actions">
                <button
                  ref={unboxCtaRef}
                  type="button"
                  className="gb-buy gb-buy--equip"
                  onClick={() => { void onEquip(unboxed, unboxed.id); setUnboxed(null); }}
                >
                  Đeo ngay
                </button>
                <button type="button" className="gb-ghost" onClick={() => setUnboxed(null)}>Để sau</button>
              </div>
            </div>
          </div>
        );
        return typeof document !== 'undefined' ? createPortal(unboxNode, document.body) : unboxNode;
      })()}

      <CelebrationBurst trigger={burstTick} tone={unboxed ? BURST_TONE[legacyRarityClass(decoRarity(unboxed))] : 'gold'} count={unboxed && decoRarity(unboxed) === 'mythic' ? 70 : 44} />
    </div>
  );
};
