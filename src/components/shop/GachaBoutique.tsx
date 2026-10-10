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
import { Check, Clock3, Coins, Flame, Sparkles, Tag, X } from 'lucide-react';
import type { ShopItem } from '../../types';
import {
  RARITY_META,
  effectivePrice,
  getWeeklyDeal,
  isNewItem,
  rarityOf,
  type ShopRarity,
} from '../../utils/shopData';
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
  /** Xem hồ sơ người khác: chỉ trưng bày, không mua/đeo (máy chủ mua theo token người xem). */
  readOnly?: boolean;
  onBuy: (item: ShopItem) => Promise<boolean>;
  onEquip: (itemId: string) => Promise<void> | void;
}

type Filter = 'all' | ShopRarity | 'owned' | 'Khung avatar' | 'Hiệu ứng' | 'Theme Focus' | 'Góc hồ sơ';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'legendary', label: 'Huyền thoại' },
  { id: 'epic', label: 'Sử thi' },
  { id: 'rare', label: 'Hiếm' },
  { id: 'common', label: 'Thường' },
  { id: 'owned', label: 'Đã sở hữu' },
  { id: 'Khung avatar', label: 'Khung avatar' },
  { id: 'Hiệu ứng', label: 'Hiệu ứng' },
  { id: 'Theme Focus', label: 'Theme Focus' },
  { id: 'Góc hồ sơ', label: 'Góc hồ sơ' },
];

const ICON_SIZE: Record<ShopRarity, number> = { legendary: 92, epic: 74, rare: 62, common: 54 };
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

export const GachaBoutique: FC<GachaBoutiqueProps> = ({
  items,
  inventory,
  equippedId,
  coin,
  ownership = {},
  userName,
  readOnly = false,
  onBuy,
  onEquip,
}) => {
  const uid = useId().replace(/:/g, '');
  const [filter, setFilter] = useState<Filter>('all');
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [unboxed, setUnboxed] = useState<ShopItem | null>(null);
  const [burstTick, setBurstTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const unboxCtaRef = useRef<HTMLButtonElement>(null);

  /* Đồng hồ đếm ngược ưu đãi tuần — cập nhật mỗi phút là đủ. */
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const deal = useMemo(() => getWeeklyDeal(now), [now]);
  const dealItem = items.find((item) => item.id === deal.itemId) || null;

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
        {readOnly ? (
          <span className="gb-viewonly">Chế độ trưng bày</span>
        ) : (
          <div className="gb-wallet" aria-label={`Số dư ${coin} Coin`}>
            <Coins size={15} aria-hidden="true" />
            <b>{coin.toLocaleString('vi-VN')}</b>
            <span>Coin</span>
          </div>
        )}
      </header>

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
        <div className="gb-masonry" role="list" aria-label="Vật phẩm trong Gacha Boutique">
          {visible.map((item, index) => {
            const rarity = rarityOf(item);
            const owned = inventory.includes(item.id);
            const equipped = equippedId === item.id;
            const price = effectivePrice(item, now);
            const onDeal = price !== item.price;
            const tipId = `gb-tip-${uid}-${item.id}`;
            return (
              <div role="listitem" key={item.id} className="gb-cell" style={{ '--i': Math.min(index, 14) } as CSSProperties}>
                <button
                  type="button"
                  className={`gb-card gb-card--${rarity} ${owned ? 'is-owned' : ''}`}
                  aria-describedby={tipId}
                  aria-label={`${item.name}, ${RARITY_META[rarity].label}, ${owned ? (equipped ? 'đang đeo' : 'đã sở hữu') : `${price} Coin`}. Mở xem trước`}
                  onClick={() => setInspectId(item.id)}
                >
                  <span className="gb-card__frame" aria-hidden="true" />
                  <span className="gb-card__shine" aria-hidden="true" />
                  <span className="gb-card__tags" aria-hidden="true">
                    {isNewItem(item, now) && <em className="gb-tag gb-tag--new">Mới</em>}
                    {hotIds.has(item.id) && <em className="gb-tag gb-tag--hot"><Flame size={10} />Hot</em>}
                    {onDeal && !owned && <em className="gb-tag gb-tag--deal">−{deal.percent}%</em>}
                  </span>
                  <span className="gb-card__stage" aria-hidden="true">
                    <span className="gb-card__aura" />
                    {rarity === 'legendary' && (
                      <span className="gb-card__sparks">
                        {Array.from({ length: 6 }, (_, spark) => <i key={spark} style={{ '--s': spark } as CSSProperties} />)}
                      </span>
                    )}
                    <ShopItemSvg type={item.iconType} size={ICON_SIZE[rarity]} className="gb-card__icon" />
                  </span>
                  <span className="gb-card__meta">
                    <span className="gb-card__rarity">{item.category || RARITY_META[rarity].label}</span>
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
                className="gb-inspect__stage"
                onPointerMove={tilt}
                onPointerLeave={resetTilt}
                aria-hidden="true"
              >
                <span className="gb-inspect__halo" />
                {(rarity === 'legendary' || rarity === 'epic') && (
                  <span className="gb-inspect__orbit">
                    {Array.from({ length: rarity === 'legendary' ? 10 : 5 }, (_, spark) => <i key={spark} style={{ '--s': spark } as CSSProperties} />)}
                  </span>
                )}
                <span className="gb-inspect__object">
                  <ShopItemSvg type={inspected.iconType} size={136} className="gb-inspect__icon" />
                </span>
                <span className="gb-inspect__pedestal" />
              </div>
              <div className="gb-inspect__info">
                <span className={`gb-rarity gb-rarity--${rarity}`}>{RARITY_META[rarity].label} · {RARITY_META[rarity].en}</span>
                <h3 id={`gb-inspect-title-${uid}`}>{inspected.name}</h3>
                <p>{inspected.description}</p>

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
                  ) : owned ? (
                    <button type="button" className={`gb-buy gb-buy--equip ${equipped ? 'is-on' : ''}`} onClick={() => void onEquip(inspected.id)}>
                      {equipped ? 'Gỡ trang bị' : 'Đeo ngay'}
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
            className={`gb-unbox gb-unbox--${rarity}`}
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
