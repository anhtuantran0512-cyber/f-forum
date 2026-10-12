/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Gacha Boutique — Nhiệm vụ 10: cửa hàng trang trí Discord import.
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
import {
  Check,
  Clock3,
  Coins,
  Flame,
  Frame,
  Search,
  Sparkles,
  Tag,
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
  priceRange,
  resolveAssetUrl,
} from '../../utils/decorations';
import { useDecorationCatalog } from '../../utils/decorationStore';
import { safeStorage } from '../../utils/storage';
import { playChime } from '../../utils/audio';
import { AvatarWithDecoration, type DecorationAssetRef } from '../decorations/AvatarWithDecoration';
import { DecorationMedia } from '../decorations/DecorationMedia';
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
  onBuy: (item: ShopItem) => Promise<boolean>;
  /** Trang bị item vào slot của nó; nextItemId = null để Gỡ slot của item. */
  onEquip: (item: ShopItem, nextItemId: string | null) => Promise<void> | void;
}

type TypeFilter = 'all' | 'Avatar Frame' | 'Avatar Aura' | 'Nameplate';
type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'mythic';
type MotionFilter = 'all' | 'animated' | 'static';
type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'newest';

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

const initialsOf = (name: string): string =>
  name.trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'FF';

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
}) => {
  const uid = useId().replace(/:/g, '');
  /* Catalog Discord import (fetch + cache) — nguồn item duy nhất của Boutique mới. */
  const { items, loading: catalogLoading } = useDecorationCatalog();
  const activeItems = useMemo(() => items.filter((item) => item.isActive !== false), [items]);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>(() =>
    initialCategoryFilter === 'Avatar Frame' || initialCategoryFilter === 'Avatar Aura' || initialCategoryFilter === 'Nameplate'
      ? (initialCategoryFilter as TypeFilter)
      : 'all',
  );
  const [prevInitialFilter, setPrevInitialFilter] = useState<string | null>(initialCategoryFilter);
  if (initialCategoryFilter !== prevInitialFilter) {
    setPrevInitialFilter(initialCategoryFilter);
    if (initialCategoryFilter === 'Avatar Frame' || initialCategoryFilter === 'Avatar Aura' || initialCategoryFilter === 'Nameplate') {
      setTypeFilter(initialCategoryFilter as TypeFilter);
    }
  }
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [motionFilter, setMotionFilter] = useState<MotionFilter>('all');
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('featured');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [unboxed, setUnboxed] = useState<ShopItem | null>(null);
  const [burstTick, setBurstTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
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
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const deal = useMemo(() => getWeeklyDeal(now, activeItems), [now, activeItems]);
  const dealItem = activeItems.find((item) => item.id === deal.itemId) || null;
  const dynamicDiscounts = useMemo(() => getDynamicDiscounts(now, activeItems), [now, activeItems]);

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
      if (q && !`${item.name} ${item.nameEn || ''} ${item.tags?.join(' ') || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const order = (item: ShopItem) => DECORATION_RARITY_META[decoRarity(item)].order;
    switch (sortMode) {
      case 'price-asc':
        return [...list].sort((a, b) => a.price - b.price || order(b) - order(a));
      case 'price-desc':
        return [...list].sort((a, b) => b.price - a.price || order(b) - order(a));
      case 'newest':
        return [...list].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') || order(b) - order(a));
      default:
        /* Featured: nhóm theo rarity (mythic trên cùng), trong cùng rarity
           item chất lượng cao hơn (qualityScore) lên trước. */
        return [...list].sort(
          (a, b) => order(b) - order(a) || (b.qualityScore ?? 0) - (a.qualityScore ?? 0) || b.price - a.price,
        );
    }
  }, [activeItems, typeFilter, rarityFilter, motionFilter, query, sortMode]);

  /* Infinite scroll: chỉ render 24 item mỗi nhịp; đổi bộ lọc → reset ở handler (không setState trong effect). */
  const resetPagination = () => setVisibleCount(PAGE_SIZE);

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

  /* Esc chỉ đóng lớp trên cùng của shop, không đóng luôn hồ sơ phía sau. */
  const swallowEscape = (event: KeyboardEvent<HTMLElement>, close: () => void) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    close();
  };

  const buy = async (item: ShopItem) => {
    if (busy) return;
    setBusy(true);
    const ok = await onBuy(item);
    setBusy(false);
    if (!ok) return;
    setInspectId(null);
    setUnboxed(item);
    setBurstTick((tick) => tick + 1);
    /* Huyền thoại: thêm một tiếng "mở khoá" đúng lúc vật phẩm bay ra khỏi hộp. */
    if (decoRarity(item) === 'mythic') window.setTimeout(() => playChime('level-up'), 850);
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
            <p>{activeItems.length} trang trí Discord import · F-Coin</p>
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
            <div className="gb-wallet" aria-label={`Số dư ${coin} Coin`}>
              <Coins size={15} aria-hidden="true" />
              <b>{coin.toLocaleString('vi-VN')}</b>
              <span>Coin</span>
            </div>
          )}
        </div>
      </header>

      {catalogLoading && activeItems.length === 0 && (
        <div className="gb-empty" role="status">
          <p>Đang tải kho trang trí…</p>
        </div>
      )}

      {/* TOP HERO BANNER — 6 MYTHIC TIÊU ĐIỂM */}
      {currentHeroItem && (
        <section className="gb-hero-carousel" aria-label="Trang trí Mythic tiêu điểm">
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
              <p className="text-xs sm:text-sm text-white/75 max-w-xl truncate">
                {currentHeroItem.description}
              </p>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewItemId(currentHeroItem.id);
                    setInspectId(currentHeroItem.id);
                  }}
                  className="gb-hero-cta"
                >
                  <Sparkles size={14} />
                  <span>Xem thử trên Avatar</span>
                </button>
                {mythicShowcaseItems.length > 1 && (
                  <div className="flex items-center gap-1.5" role="tablist" aria-label="Chuyển trang trí Mythic">
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
                setInspectId(currentHeroItem.id);
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
                  <AvatarWithDecoration
                    avatarUrl={userAvatar || DEFAULT_AVATAR}
                    decorationAsset={pAsset.type === 'nameplate' ? null : pAsset}
                    size={84}
                    eager
                    nameplateAsset={pAsset.type === 'nameplate' ? pAsset : null}
                    name={userName}
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
                  <strong className="text-sm sm:text-base font-extrabold text-white truncate block">
                    {userName}
                  </strong>
                  <p className="text-xs text-white/75 truncate max-w-md">
                    Đang thử: <b className="text-white">{activePreviewItem.name}</b> — {activePreviewItem.description}
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
        <button type="button" className="gb-deal" onClick={() => setInspectId(dealItem.id)}>
          <span className="gb-deal__icon" aria-hidden="true"><Tag size={14} /></span>
          <span className="gb-deal__text">
            Ưu đãi tuần <b>−{deal.percent}%</b> · {dealItem.name}
          </span>
          <span className="gb-deal__timer"><Clock3 size={12} aria-hidden="true" /> còn {formatCountdown(deal.endsAt - now)}</span>
        </button>
      )}

      {/* Bộ lọc: loại trang trí + độ hiếm + animation */}
      <div className="gb-filters" role="group" aria-label="Lọc trang trí theo loại">
        {TYPE_FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            data-rarity={option.id}
            aria-pressed={typeFilter === option.id}
            className={typeFilter === option.id ? 'is-active' : ''}
            onClick={() => { setTypeFilter(option.id); resetPagination(); }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="gb-filters gb-filters--sub" role="group" aria-label="Lọc theo độ hiếm và chuyển động">
        <button
          type="button"
          aria-pressed={rarityFilter === 'all'}
          className={rarityFilter === 'all' ? 'is-active' : ''}
          onClick={() => { setRarityFilter('all'); resetPagination(); }}
        >
          Mọi hiếm
        </button>
        {DECORATION_RARITIES.map((rarity) => (
          <button
            key={rarity}
            type="button"
            data-rarity={rarity}
            aria-pressed={rarityFilter === rarity}
            className={rarityFilter === rarity ? 'is-active' : ''}
            style={{ '--gb-rarity-color': DECORATION_RARITY_META[rarity].color } as CSSProperties}
            onClick={() => { setRarityFilter(rarity); resetPagination(); }}
          >
            <i aria-hidden="true" />
            {DECORATION_RARITY_META[rarity].label}
          </button>
        ))}
        <span className="gb-filters__divider" aria-hidden="true" />
        <button type="button" aria-pressed={motionFilter === 'all'} className={motionFilter === 'all' ? 'is-active' : ''} onClick={() => { setMotionFilter('all'); resetPagination(); }}>
          Mọi loại
        </button>
        <button type="button" aria-pressed={motionFilter === 'animated'} className={motionFilter === 'animated' ? 'is-active' : ''} onClick={() => { setMotionFilter('animated'); resetPagination(); }}>
          Có animation
        </button>
        <button type="button" aria-pressed={motionFilter === 'static'} className={motionFilter === 'static' ? 'is-active' : ''} onClick={() => { setMotionFilter('static'); resetPagination(); }}>
          Tĩnh
        </button>
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
          value={sortMode}
          onChange={(event) => { setSortMode(event.target.value as SortMode); resetPagination(); }}
          aria-label="Sắp xếp"
          className="gb-searchbar__sort"
        >
          <option value="featured">Nổi bật</option>
          <option value="price-asc">Giá: thấp → cao</option>
          <option value="price-desc">Giá: cao → thấp</option>
          <option value="newest">Mới nhất</option>
        </select>
        <span className="gb-searchbar__count">{filtered.length} trang trí</span>
      </div>

      {filtered.length === 0 ? (
        <div className="gb-empty">
          <CuBong mood="sleepy" size={96} decorative />
          <p>Kệ này còn trống… Cú Bông ngủ gật luôn rồi. Thử bộ lọc khác nhé!</p>
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
                <button
                  type="button"
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
                    setInspectId(item.id);
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
                    <span className="gb-card__desc-one-line">{item.description}</span>
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
                  <span className="gb-card__tip" id={tipId} role="tooltip">
                    <b>{item.name}</b>
                    <span><Coins size={11} aria-hidden="true" /> {price.toLocaleString('vi-VN')} Coin</span>
                    <em>{item.description}</em>
                  </span>
                </button>
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
        return (
          <div
            className="gb-inspect"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`gb-inspect-title-${uid}`}
            onKeyDown={(event) => swallowEscape(event, () => setInspectId(null))}
          >
            <button type="button" className="gb-inspect__backdrop" aria-label="Đóng xem trước" tabIndex={-1} onClick={() => setInspectId(null)} />
            <section className={`gb-inspect__panel gb-inspect__panel--${legacyRarityClass(rarity)}`} style={{ '--gb-rarity-color': rarityMeta.color } as CSSProperties}>
              <button ref={closeRef} type="button" className="gb-inspect__close" aria-label="Đóng" onClick={() => setInspectId(null)}>
                <X size={16} />
              </button>
              <div className="gb-inspect__stage flex flex-col items-center justify-center p-4">
                <span className="gb-inspect__halo" aria-hidden="true" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 mb-3 z-10">
                  [AVATAR PREVIEW · 200PX]
                </span>
                {/* Xem trên avatar THẬT của user, 200px (quy chuẩn 180–256px) */}
                <div className="relative flex flex-col items-center justify-center my-2 z-10">
                  <AvatarWithDecoration
                    avatarUrl={userAvatar || DEFAULT_AVATAR}
                    decorationAsset={asset.type === 'nameplate' ? null : asset}
                    size={200}
                    eager
                    nameplateAsset={asset.type === 'nameplate' ? asset : null}
                    name={userName}
                  />
                </div>
                <div className="mt-3 text-center z-10 space-y-1">
                  <div className="text-sm font-extrabold text-white">{userName}</div>
                </div>
                <span className="gb-inspect__pedestal" aria-hidden="true" />
              </div>
              <div className="gb-inspect__info">
                <span className={`gb-rarity gb-rarity--${legacyRarityClass(rarity)}`}>
                  <span className="rarity-dot" style={{ background: rarityMeta.color }} aria-hidden="true" />
                  {rarityMeta.en.toUpperCase()} · {rarityMeta.label}
                </span>
                <h3 id={`gb-inspect-title-${uid}`}>{inspected.name}</h3>
                <p className="truncate">{inspected.description}</p>

                <div className="gb-inspect__preview">
                  <span>Xem khi đeo</span>
                  <div className="gb-inspect__chip">
                    <span className="gb-inspect__avatar" aria-hidden="true">{initialsOf(userName)}</span>
                    <b>{userName}</b>
                    <span className="gb-inspect__worn" aria-hidden="true">
                      <DecorationMedia asset={asset} enabled className="gb-inspect__worn-media" animate={false} />
                    </span>
                  </div>
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
                          disabled={!canAfford || busy}
                          onClick={() => void buy(inspected)}
                        >
                          <span className="gb-buy__rays" aria-hidden="true" />
                          {canAfford ? (busy ? 'Đang mở khoá…' : 'Mua ngay') : `Thiếu ${(price - coin).toLocaleString('vi-VN')} Coin`}
                        </button>
                      )}
                      <button
                        type="button"
                        className="gb-ghost"
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
      })()}

      {unboxed && (() => {
        const rarity = decoRarity(unboxed);
        const unboxRarity = legacyRarityClass(rarity);
        return (
          <div
            className={`gb-unbox gb-unbox--${unboxRarity} ${rarity === 'mythic' ? 'gb-unbox--mythic-shake' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={`Đã mở khoá ${unboxed.name}`}
            onKeyDown={(event) => swallowEscape(event, () => setUnboxed(null))}
          >
            <div className="gb-unbox__scene" aria-hidden="true">
              <span className="gb-unbox__rays" />
              <span className="gb-unbox__box">
                <span className="gb-unbox__lid" />
                <span className="gb-unbox__body" />
                <span className="gb-unbox__ribbon" />
              </span>
              <span className="gb-unbox__item">
                {unboxed.category === 'Nameplate' ? (
                  <NameplateDisplay asset={itemToAsset(unboxed)} size={180} animate={false} />
                ) : (
                  <img
                    src={resolveAssetUrl(unboxed.previewUrl) || undefined}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ width: 150, height: 150, objectFit: 'contain' }}
                  />
                )}
              </span>
            </div>
            <p className="gb-unbox__title" role="status">Đã mở khoá!</p>
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
        );
      })()}

      <CelebrationBurst trigger={burstTick} tone={unboxed ? BURST_TONE[legacyRarityClass(decoRarity(unboxed))] : 'gold'} count={unboxed && decoRarity(unboxed) === 'mythic' ? 70 : 44} />
    </div>
  );
};
