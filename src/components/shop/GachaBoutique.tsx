/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Gacha Boutique — cửa hàng vật phẩm sưu tầm (Epic 4 · Nhiemvu_4 · Nhiemvu_5).
 *  - Masonry so le theo độ hiếm: Huyền thoại cao nhất → Thường gọn nhất.
 *  - Zero-clutter: thẻ chỉ có icon · tên · giá; mô tả nằm trong tooltip kính mờ trượt lên.
 *  - Nhãn THẬT: "Mới" (phát hành < 30 ngày), "Hot" (nhiều người sở hữu nhất),
 *    "−20%" (ưu đãi tuần — máy chủ trừ đúng giá này).
 *  - Xem trước trước khi mua (bệ xoay 3D theo con trỏ + "xem khi đeo"),
 *    nút Mua nhấn-nảy-bắn tia, hiệu ứng MỞ HỘP sau khi mua (Huyền thoại có âm thanh).
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  Bookmark,
  Check,
  Clock3,
  Coins,
  Flame,
  Frame,
  Palette,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import type { ShopItem } from '../../types';
import {
  GACHA_EPIC_PITY_LIMIT,
  GACHA_MYTHIC_PITY_LIMIT,
  GACHA_POOLS,
  RARITY_META,
  RARITY_PREMIUM_META,
  effectivePrice,
  formatCountdownHMS,
  getDynamicDiscounts,
  getWeeklyDeal,
  isNewItem,
  rarityDotClass,
  rarityFrameClass,
  rarityOf,
  rollGachaPull,
  saveEquippedComboSlot,
  type GachaPityState,
  type GachaPoolId,
  type ShopRarity,
} from '../../utils/shopData';
import { DEFAULT_AVATAR } from '../../utils/mediaFallback';
import { safeStorage } from '../../utils/storage';
import { playChime } from '../../utils/audio';
import { ShopItemSvg } from '../ShopItemSvg';
import { CelebrationBurst } from '../CelebrationBurst';
import { CuBong } from '../mascot/CuBong';
import './Boutique.css';

interface GachaBoutiqueProps {
  items: ShopItem[];
  inventory: string[];
  equippedId?: string;
  coin: number;
  /** Số tài khoản đang sở hữu từng vật phẩm (dữ liệu thật) — dùng cho nhãn "Hot". */
  ownership?: Record<string, number>;
  userName: string;
  userAvatar?: string;
  userKey?: string;
  initialCategoryFilter?: string | null;
  onComboUpdated?: () => void;
  /** Xem hồ sơ người khác: chỉ trưng bày, không mua/đeo (máy chủ mua theo token người xem). */
  readOnly?: boolean;
  onBuy: (item: ShopItem) => Promise<boolean>;
  onEquip: (itemId: string) => Promise<void> | void;
}

type Filter =
  | 'all'
  | ShopRarity
  | 'discount'
  | 'owned'
  | 'Khung avatar'
  | 'Hiệu ứng'
  | 'Theme Focus'
  | 'Góc hồ sơ';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'common', label: 'Common' },
  { id: 'rare', label: 'Rare' },
  { id: 'epic', label: 'Epic' },
  { id: 'legendary', label: 'Mythic' },
  { id: 'discount', label: 'Đang giảm giá' },
  { id: 'owned', label: 'Đã sở hữu' },
  { id: 'Khung avatar', label: 'Khung avatar' },
  { id: 'Hiệu ứng', label: 'Hiệu ứng' },
  { id: 'Theme Focus', label: 'Theme Focus' },
  { id: 'Góc hồ sơ', label: 'Góc hồ sơ' },
];

interface GachaHistoryItem {
  id: string;
  itemId: string;
  itemName: string;
  rarity: ShopRarity;
  poolName: string;
  pityTriggered: 'mythic_100' | 'epic_50' | null;
  pulledAt: string;
}

const ICON_SIZE: Record<ShopRarity, number> = { legendary: 51, epic: 51, rare: 51, common: 51 };

const renderCategoryIcon = (category?: string) => {
  switch (category) {
    case 'Khung avatar':
      return <Frame size={12} />;
    case 'Hiệu ứng':
      return <Sparkles size={12} />;
    case 'Theme Focus':
      return <Palette size={12} />;
    default:
      return <Bookmark size={12} />;
  }
};
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
  items,
  inventory,
  equippedId,
  coin,
  ownership = {},
  userName,
  userAvatar,
  userKey,
  initialCategoryFilter = null,
  onComboUpdated,
  readOnly = false,
  onBuy,
  onEquip,
}) => {
  const uid = useId().replace(/:/g, '');
  const [filter, setFilter] = useState<Filter>(() =>
    initialCategoryFilter ? (initialCategoryFilter as Filter) : 'all',
  );
  const [prevInitialFilter, setPrevInitialFilter] = useState<string | null>(initialCategoryFilter);
  if (initialCategoryFilter !== prevInitialFilter) {
    setPrevInitialFilter(initialCategoryFilter);
    if (initialCategoryFilter) {
      setFilter(initialCategoryFilter as Filter);
    }
  }
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [previewItemId, setPreviewItemId] = useState<string | null>(() => equippedId || items[0]?.id || null);
  const [unboxed, setUnboxed] = useState<ShopItem | null>(null);
  const [burstTick, setBurstTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [heroIdx, setHeroIdx] = useState(0);
  const [isGachaOpen, setIsGachaOpen] = useState(false);
  const [showOddsModal, setShowOddsModal] = useState(false);

  const equipWithCombo = async (item: ShopItem) => {
    const key = userKey || userName || 'default';
    const isCurrentlyEquipped = equippedId === item.id;
    saveEquippedComboSlot(item.category || 'Khung avatar', isCurrentlyEquipped ? '__none__' : item.id, key);
    onComboUpdated?.();
    await onEquip(item.id);
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
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const unboxCtaRef = useRef<HTMLButtonElement>(null);

  /* Đồng hồ đếm ngược 1 giây cho đợt xoay vòng giảm giá 6h (00h, 06h, 12h, 18h). */
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const deal = useMemo(() => getWeeklyDeal(now), [now]);
  const dealItem = items.find((item) => item.id === deal.itemId) || null;
  const dynamicDiscounts = useMemo(() => getDynamicDiscounts(now), [now]);

  /* Danh sách vật phẩm Mythic (legendary) cho Hero Banner Carousel xoay vòng */
  const mythicShowcaseItems = useMemo(
    () => items.filter((item) => rarityOf(item) === 'legendary'),
    [items],
  );

  useEffect(() => {
    if (mythicShowcaseItems.length <= 1) return undefined;
    const rot = window.setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % mythicShowcaseItems.length);
    }, 5_500);
    return () => window.clearInterval(rot);
  }, [mythicShowcaseItems.length]);

  const currentHeroItem =
    mythicShowcaseItems[heroIdx % Math.max(1, mythicShowcaseItems.length)] || items[0] || null;

  /* "Hot" = 2 vật phẩm được nhiều tài khoản sở hữu nhất (ít nhất 2 người) — không bịa số. */
  const hotIds = useMemo(() => new Set(
    Object.entries(ownership)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => id),
  ), [ownership]);

  const sorted = useMemo(() => [...items].sort((a, b) =>
    RARITY_META[rarityOf(b)].order - RARITY_META[rarityOf(a)].order || b.price - a.price), [items]);

  const visible = sorted.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'owned') return inventory.includes(item.id);
    if (filter === 'discount') {
      return Boolean(dynamicDiscounts.deals[item.id]) || item.id === deal.itemId;
    }
    return item.category === filter || rarityOf(item) === filter;
  });

  const inspected = inspectId ? items.find((item) => item.id === inspectId) || null : null;

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

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    stage.style.setProperty('--gb-rx', `${(-y * 18).toFixed(2)}deg`);
    stage.style.setProperty('--gb-ry', `${(x * 22).toFixed(2)}deg`);
  };
  const resetTilt = () => {
    stageRef.current?.style.setProperty('--gb-rx', '0deg');
    stageRef.current?.style.setProperty('--gb-ry', '0deg');
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
    if (rarityOf(item) === 'legendary') window.setTimeout(() => playChime('level-up'), 850);
  };

  /* Phần 3.D — Quay Gacha với hệ thống bảo hiểm Pity 50 (Epic+) / 100 (Mythic) */
  const handleGachaPull = async (poolId: GachaPoolId) => {
    if (busy || readOnly) return;
    const pool = GACHA_POOLS[poolId];
    if (!pool || coin < pool.cost) return;

    setBusy(true);
    const roll = rollGachaPull(poolId, pity);
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

  return (
    <div className="gb-root">
      <header className="gb-head">
        <div className="gb-head__title">
          <span className="gb-head__mark" aria-hidden="true"><Sparkles size={16} /></span>
          <div>
            <h3>Gacha Boutique</h3>
            <p>35 dấu ấn góc học tập · F-Coin</p>
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

      {/* PHẦN 3.C.1 — TOP HERO BANNER CAROUSEL SHOWCASING MYTHIC ITEMS */}
      {currentHeroItem && (
        <section className="gb-hero-carousel" aria-label="Vật phẩm Mythic tiêu điểm">
          <div className="gb-hero-carousel__stars" aria-hidden="true" />
          <div className="gb-hero-carousel__grid">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="gb-mythic-pill">
                  <span className="rarity-dot mythic" aria-hidden="true" />
                  MYTHIC
                </span>
                <span className="text-[11px] font-mono text-amber-200/90 px-2.5 py-0.5 rounded-full bg-white/8 border border-white/15">
                  Danh hiệu: {RARITY_PREMIUM_META.legendary.flairTitle}
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
                  <div className="flex items-center gap-1.5" role="tablist" aria-label="Chuyển vật phẩm Mythic">
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
              <div className="shop-item-icon">
                <ShopItemSvg type={currentHeroItem.iconType} size={38} />
              </div>
              <span className="mt-1.5 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                <Coins size={12} /> {effectivePrice(currentHeroItem, now).toLocaleString('vi-VN')} Coin
              </span>
            </div>
          </div>
        </section>
      )}

      {/* DISCORD NITRO-STYLE LIVE AVATAR PREVIEW DOCK */}
      {(() => {
        const activePreviewItem =
          items.find((i) => i.id === previewItemId) ||
          items.find((i) => i.id === equippedId) ||
          currentHeroItem ||
          items[0];
        if (!activePreviewItem) return null;
        const pRarity = rarityOf(activePreviewItem);
        const pMeta = RARITY_PREMIUM_META[pRarity];
        const pOwned = inventory.includes(activePreviewItem.id);
        const pEquipped = equippedId === activePreviewItem.id;
        const pWeeklyPrice = effectivePrice(activePreviewItem, now);
        const pDynDeal = dynamicDiscounts.deals[activePreviewItem.id];
        const pPrice = pDynDeal ? Math.min(pWeeklyPrice, pDynDeal.discountedPrice) : pWeeklyPrice;
        const pCanAfford = coin >= pPrice;
        const frameClass = rarityFrameClass(pRarity);
        const dotClass = rarityDotClass(pRarity);

        return (
          <section
            className={`gb-discord-preview gb-discord-preview--${pRarity === 'legendary' ? 'mythic' : pRarity}`}
            aria-label="Live Avatar Preview kiểu Discord Nitro"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                {/* Real CSS Frame + Aura + Mythic Orbiting Particles */}
                <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${frameClass}`}>
                    {pRarity === 'legendary' &&
                      Array.from({ length: 6 }, (_, idx) => (
                        <span
                          key={idx}
                          className="mythic-particle"
                          style={{ animationDelay: `${(-idx * 4) / 6}s` }}
                          aria-hidden="true"
                        />
                      ))}
                    <img
                      src={userAvatar || DEFAULT_AVATAR}
                      alt={userName}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full rounded-full object-cover"
                    />
                    <span
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0B0F1A] border border-white/20 flex items-center justify-center shadow-md"
                      title={activePreviewItem.name}
                    >
                      <ShopItemSvg type={activePreviewItem.iconType} size={15} />
                    </span>
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">
                      AVATAR PREVIEW
                    </span>
                    <span className="gb-rarity-badge-clean">
                      <span className={`rarity-dot ${dotClass}`} aria-hidden="true" />
                      {pMeta.tierCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm sm:text-base font-extrabold text-white truncate">
                      {userName}
                    </strong>
                    {pMeta.flairTitle && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500/25 via-pink-500/25 to-purple-500/25 text-amber-200 border border-amber-400/35">
                        {pMeta.flairTitle}
                      </span>
                    )}
                  </div>
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
                      onClick={() => void equipWithCombo(activePreviewItem)}
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
                        {pCanAfford ? `Trang bị ngay (${pPrice.toLocaleString('vi-VN')}C)` : `Thiếu ${(pPrice - coin).toLocaleString('vi-VN')}C`}
                      </span>
                    </button>
                  )}
                  {previewItemId && previewItemId !== equippedId && (
                    <button
                      type="button"
                      onClick={() => setPreviewItemId(equippedId || null)}
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

      {/* PHẦN 3.D — GACHA SUMMON SANCTUARY & PITY SYSTEM (50 EPIC+ / 100 MYTHIC) */}
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
                Tích lũy lượt quay tự động: Đảm bảo từ <strong>Epic+ ở lượt 50</strong> và <strong>Mythic 👑 ở lượt 100</strong>.
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

      {/* PHẦN 3.E — THANH ĐẾM NGƯỢC XOAY VÒNG GIẢM GIÁ 6H (00h, 06h, 12h, 18h) */}
      <div className="gb-rarity-bar" aria-label="Thông tin đợt giảm giá 6 giờ">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="gb-sale-tag gb-sale-tag--super">🔥 FLASH SALE 6H</span>
          <span className="text-xs text-white/80">
            Đang giảm giá <b>{dynamicDiscounts.list.length} vật phẩm</b> (10% → 90% OFF)
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

      <div className="gb-filters" role="group" aria-label="Lọc vật phẩm theo độ hiếm">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            data-rarity={option.id}
            aria-pressed={filter === option.id}
            className={filter === option.id ? 'is-active' : ''}
            onClick={() => setFilter(option.id)}
          >
            {option.id !== 'all' && option.id !== 'owned' && <i aria-hidden="true" />}
            {option.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="gb-empty">
          <CuBong mood="sleepy" size={96} decorative />
          <p>Kệ này còn trống… Cú Bông ngủ gật luôn rồi. Thử bộ lọc khác nhé!</p>
        </div>
      ) : (
        <div className="gb-masonry shop-grid" role="list" aria-label="Vật phẩm trong Gacha Boutique">
          {visible.map((item, index) => {
            const rarity = rarityOf(item);
            const rarityPremium = RARITY_PREMIUM_META[rarity];
            const dotClass = rarityDotClass(rarity);
            const owned = inventory.includes(item.id);
            const equipped = equippedId === item.id;
            const weeklyPrice = effectivePrice(item, now);
            const dynDeal = dynamicDiscounts.deals[item.id];
            const price = dynDeal ? Math.min(weeklyPrice, dynDeal.discountedPrice) : weeklyPrice;
            const discountPercent = dynDeal ? dynDeal.percent : (weeklyPrice !== item.price ? deal.percent : 0);
            const onDeal = price !== item.price;
            const tipId = `gb-tip-${uid}-${item.id}`;
            return (
              <div role="listitem" key={item.id} className="gb-cell" style={{ '--i': Math.min(index, 14) } as CSSProperties}>
                <button
                  type="button"
                  className={`gb-card shop-card gb-card--${rarity} ${owned ? 'is-owned' : ''}`}
                  aria-describedby={tipId}
                  aria-label={`${item.name}, ${RARITY_META[rarity].label}, ${owned ? (equipped ? 'đang đeo' : 'đã sở hữu') : `${price} Coin`}. Mở xem trước`}
                  onMouseEnter={() => setPreviewItemId(item.id)}
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
                  {/* Góc phải: 1 icon nhỏ category, hover mới hiện tooltip tên loại */}
                  <span className="gb-card__cat-corner" aria-hidden="true">
                    {renderCategoryIcon(item.category)}
                    <span className="gb-card__cat-tooltip">{item.category}</span>
                  </span>

                  <span className="gb-card__stage" aria-hidden="true">
                    <span className="gb-card__aura" />
                    {rarity === 'legendary' && (
                      <span className="gb-card__sparks">
                        {Array.from({ length: 6 }, (_, spark) => <i key={spark} style={{ '--s': spark } as CSSProperties} />)}
                      </span>
                    )}
                    <span className="shop-item-icon">
                      <ShopItemSvg type={item.iconType} size={ICON_SIZE[rarity]} className="gb-card__icon" />
                    </span>
                  </span>
                  <span className="gb-card__meta">
                    <span className="gb-card__rarity">
                      <span className={`rarity-dot ${dotClass}`} aria-hidden="true" />
                      {rarityPremium.tierCode}
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

      {inspected && (() => {
        const rarity = rarityOf(inspected);
        const rarityPremium = RARITY_PREMIUM_META[rarity];
        const dotClass = rarityDotClass(rarity);
        const frameClass = rarityFrameClass(rarity);
        const owned = inventory.includes(inspected.id);
        const equipped = equippedId === inspected.id;
        const price = effectivePrice(inspected, now);
        const onDeal = price !== inspected.price;
        const canAfford = coin >= price;
        return (
          <div
            className="gb-inspect"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`gb-inspect-title-${uid}`}
            onKeyDown={(event) => swallowEscape(event, () => setInspectId(null))}
          >
            <button type="button" className="gb-inspect__backdrop" aria-label="Đóng xem trước" tabIndex={-1} onClick={() => setInspectId(null)} />
            <section className={`gb-inspect__panel gb-inspect__panel--${rarity}`}>
              <button ref={closeRef} type="button" className="gb-inspect__close" aria-label="Đóng" onClick={() => setInspectId(null)}>
                <X size={16} />
              </button>
              <div
                ref={stageRef}
                className="gb-inspect__stage flex flex-col items-center justify-center p-4"
                onPointerMove={tilt}
                onPointerLeave={resetTilt}
              >
                <span className="gb-inspect__halo" aria-hidden="true" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 mb-3 z-10">
                  [AVATAR PREVIEW]
                </span>
                {/* Live Avatar Preview với Frame + Aura + Mythic Orbiting Particles thật */}
                <div className="relative flex items-center justify-center my-2 z-10">
                  <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${frameClass}`}>
                    {rarity === 'legendary' &&
                      Array.from({ length: 6 }, (_, spark) => (
                        <span
                          key={spark}
                          className="mythic-particle"
                          style={{ animationDelay: `${(-spark * 4) / 6}s` }}
                          aria-hidden="true"
                        />
                      ))}
                    <img
                      src={userAvatar || DEFAULT_AVATAR}
                      alt={userName}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full rounded-full object-cover"
                    />
                    <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#090D16] border border-white/25 flex items-center justify-center shadow-lg">
                      <ShopItemSvg type={inspected.iconType} size={20} className="gb-inspect__icon" />
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-center z-10 space-y-1">
                  <div className="text-sm font-extrabold text-white">{userName}</div>
                  {rarityPremium.flairTitle && (
                    <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500/25 via-pink-500/25 to-purple-500/25 text-amber-200 border border-amber-400/35">
                      {rarityPremium.flairTitle}
                    </div>
                  )}
                </div>
                <span className="gb-inspect__pedestal" aria-hidden="true" />
              </div>
              <div className="gb-inspect__info">
                <span className={`gb-rarity gb-rarity--${rarity}`}>
                  <span className={`rarity-dot ${dotClass}`} aria-hidden="true" />
                  {rarityPremium.tierCode} · {RARITY_META[rarity].label}
                </span>
                <h3 id={`gb-inspect-title-${uid}`}>{inspected.name}</h3>
                <p className="truncate">{inspected.description}</p>

                <div className="gb-inspect__preview">
                  <span>Xem khi đeo</span>
                  <div className="gb-inspect__chip">
                    <span className="gb-inspect__avatar" aria-hidden="true">{initialsOf(userName)}</span>
                    <b>{userName}</b>
                    <span className="gb-inspect__worn"><ShopItemSvg type={inspected.iconType} size={20} /></span>
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
                    <p className="gb-inspect__readonly">Chỉ chủ hồ sơ mới mua hoặc đeo được vật phẩm này.</p>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {owned ? (
                        <button
                          type="button"
                          className={`gb-buy gb-buy--equip ${equipped ? 'is-on' : ''}`}
                          onClick={() => void equipWithCombo(inspected)}
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
        const rarity = rarityOf(unboxed);
        return (
          <div
            className={`gb-unbox gb-unbox--${rarity} ${rarity === 'legendary' ? 'gb-unbox--mythic-shake' : ''}`}
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
              <span className="gb-unbox__item"><ShopItemSvg type={unboxed.iconType} size={118} /></span>
            </div>
            <p className="gb-unbox__title" role="status">Đã mở khoá!</p>
            <b className="gb-unbox__name">{unboxed.name}</b>
            <span className={`gb-rarity gb-rarity--${rarity}`}>{RARITY_META[rarity].label}</span>
            <div className="gb-unbox__actions">
              <button
                ref={unboxCtaRef}
                type="button"
                className="gb-buy gb-buy--equip"
                onClick={() => { void onEquip(unboxed.id); setUnboxed(null); }}
              >
                Đeo ngay
              </button>
              <button type="button" className="gb-ghost" onClick={() => setUnboxed(null)}>Để sau</button>
            </div>
          </div>
        );
      })()}

      <CelebrationBurst trigger={burstTick} tone={unboxed ? BURST_TONE[rarityOf(unboxed)] : 'gold'} count={unboxed && rarityOf(unboxed) === 'legendary' ? 70 : 44} />
    </div>
  );
};
