/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Kệ huy hiệu trong Hồ sơ (Epic 4): thứ bậc thị giác rõ theo độ hiếm —
 * Huyền thoại/Sử thi là ô lớn có khung động, Hiếm/Thường gọn; hover nghiêng + phát sáng.
 * Trạng thái trống theo "Zero-Clutter" (Nhiemvu_4): rương hoạt hình ngủ gật + 1 câu ngắn.
 */
import { useMemo, type CSSProperties, type FC } from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { ShopItem } from '../../types';
import { RARITY_META, rarityOf, type ShopRarity } from '../../utils/shopData';
import { ShopItemSvg } from '../ShopItemSvg';
import './Boutique.css';

interface TrophyShelfProps {
  inventory: string[];
  items: ShopItem[];
  equippedId?: string;
  /** Có nút "Ghé Gacha Boutique" (chỉ trên hồ sơ của chính mình). */
  onOpenShop?: () => void;
}

const RARITY_ORDER: ShopRarity[] = ['legendary', 'epic', 'rare', 'common'];

export const TrophyShelf: FC<TrophyShelfProps> = ({ inventory, items, equippedId, onOpenShop }) => {
  const owned = useMemo(() => inventory
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ShopItem => Boolean(item))
    .sort((a, b) => RARITY_META[rarityOf(b)].order - RARITY_META[rarityOf(a)].order || b.price - a.price), [inventory, items]);

  const counts = useMemo(() => {
    const out: Record<ShopRarity, number> = { legendary: 0, epic: 0, rare: 0, common: 0 };
    owned.forEach((item) => { out[rarityOf(item)] += 1; });
    return out;
  }, [owned]);

  return (
    <section className="tsh-root pc-12-card" aria-label="Kệ huy hiệu">
      <header className="tsh-head">
        <span className="tsh-head__title"><Sparkles size={14} aria-hidden="true" /> Kệ huy hiệu</span>
        {owned.length > 0 && (
          <span className="tsh-head__summary" aria-label="Thống kê theo độ hiếm">
            {RARITY_ORDER.filter((rarity) => counts[rarity] > 0).map((rarity) => (
              <span key={rarity} className={`tsh-dot tsh-dot--${rarity}`} title={RARITY_META[rarity].label}>
                <i aria-hidden="true" />{counts[rarity]}
              </span>
            ))}
          </span>
        )}
      </header>

      {owned.length === 0 ? (
        <div className="tsh-empty">
          <svg className="tsh-chest" viewBox="0 0 120 100" role="img" aria-label="Chiếc rương đang ngủ">
            <ellipse className="tsh-chest__shadow" cx="60" cy="92" rx="36" ry="5" />
            <g className="tsh-chest__body">
              <rect x="22" y="46" width="76" height="40" rx="10" fill="#8b5a2b" stroke="#4a2c12" strokeWidth="3" />
              <rect x="22" y="60" width="76" height="6" fill="#e0b25c" />
              <g className="tsh-chest__lid">
                <path d="M19 49 Q19 25 60 25 Q101 25 101 49 Z" fill="#a8702f" stroke="#4a2c12" strokeWidth="3" strokeLinejoin="round" />
                <path d="M30 40 Q60 31 90 40" stroke="#d9a55a" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
              </g>
              <rect x="53" y="54" width="14" height="17" rx="3.5" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
              <circle cx="60" cy="61" r="2" fill="#92400e" />
              <path d="M60 62.5 V66" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
              <path d="M33 76 Q38.5 80.5 44 76" stroke="#3b2310" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <path d="M76 76 Q81.5 80.5 87 76" stroke="#3b2310" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <ellipse cx="33" cy="81" rx="4" ry="2.3" fill="#f9a8d4" opacity="0.55" />
              <ellipse cx="87" cy="81" rx="4" ry="2.3" fill="#f9a8d4" opacity="0.55" />
            </g>
            <g className="tsh-chest__zzz" fill="#c7d2fe">
              <text x="96" y="30" fontSize="11" fontWeight="800">z</text>
              <text x="104" y="19" fontSize="14" fontWeight="800">z</text>
              <text x="111" y="7" fontSize="17" fontWeight="900">Z</text>
            </g>
          </svg>
          <p>Rương đang ngủ… Hãy đi học để đánh thức nó!</p>
          {onOpenShop && (
            <button type="button" className="tsh-cta pc-12-btn" onClick={onOpenShop}>
              Ghé Gacha Boutique
            </button>
          )}
        </div>
      ) : (
        <div className="tsh-grid">
          {owned.map((item, index) => {
            const rarity = rarityOf(item);
            const equipped = equippedId === item.id;
            const hero = rarity === 'legendary' || rarity === 'epic';
            return (
              <div
                key={item.id}
                className={`tsh-tile tsh-tile--${rarity} ${hero ? 'is-hero' : ''}`}
                style={{ '--i': Math.min(index, 12) } as CSSProperties}
                tabIndex={0}
                aria-label={`${item.name} — ${RARITY_META[rarity].label}${equipped ? ', đang đeo' : ''}`}
                title={`${item.name} · ${RARITY_META[rarity].label}`}
              >
                <span className="tsh-tile__frame" aria-hidden="true" />
                <span className="tsh-tile__icon" aria-hidden="true">
                  <ShopItemSvg type={item.iconType} size={hero ? 54 : 34} />
                </span>
                <span className="tsh-tile__name">{item.name}</span>
                <span className="tsh-tile__rarity">{RARITY_META[rarity].label}</span>
                {equipped && <span className="tsh-tile__worn"><Check size={9} aria-hidden="true" /> Đeo</span>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
