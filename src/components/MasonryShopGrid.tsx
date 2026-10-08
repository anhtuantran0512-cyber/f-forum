/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useCallback } from 'react';
import type { ShopItem } from '../types';


interface MasonryShopGridProps {
  items: ShopItem[];
  onBuy?: (item: ShopItem) => void;
  onEquip?: (itemId: string) => void;
  equippedBadge?: string;
  userCoin?: number;
  filter?: 'all' | 'green' | 'blue' | 'red' | 'purple';
  className?: string;
}

const TIER_ICONS: Record<string, string> = {
  green: '🌱',
  blue: '💎',
  red: '🔥',
  purple: '✨',
};

export const MasonryShopGrid: React.FC<MasonryShopGridProps> = ({
  items,
  onBuy,
  onEquip,
  equippedBadge,
  userCoin = 0,
  filter = 'all',
  className = '',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter((item) => item.tierColor === filter);

  const handleBuy = useCallback((item: ShopItem) => {
    if (userCoin < item.price) {
      // Haptic feedback for insufficient coins
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      return;
    }
    onBuy?.(item);
  }, [onBuy, userCoin]);

  const handleEquip = useCallback((itemId: string) => {
    onEquip?.(itemId);
  }, [onEquip]);

  return (
    <div
      className={`masonry-shop ${className}`}
      role="list"
      aria-label="Kho đồ Chill Box"
      style={{
        columns: filter === 'all' ? '3 180px' : '2 140px',
        columnGap: '1rem',
        padding: '1.5rem',
      }}
    >
      {filteredItems.map((item) => {
        const isEquipped = equippedBadge === item.id;

        const canAfford = userCoin >= item.price;
        const isHovered = hoveredId === item.id;

        return (
          <div
            key={item.id}
            role="listitem"
            className="masonry-shop__item"
            style={{
              breakInside: 'avoid',
              marginBottom: '1rem',
              background: 'rgba(15,22,32,0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '1rem',
              padding: '1rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
              boxShadow: isHovered
                ? '0 15px 30px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.15)'
                : '0 4px 12px rgba(0,0,0,0.2)',
              borderColor: isEquipped 
                ? 'rgba(245,158,11,0.4)' 
                : isHovered 
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.08)',
              position: 'relative',
            }}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => {
              if (isEquipped) {
                handleEquip(item.id);
              } else if (canAfford) {
                handleBuy(item);
              }
            }}
            aria-label={`${item.name} - ${item.price} Coin${isEquipped ? ', đã trang bị' : canAfford ? ', có thể mua' : ', không đủ Coin'}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isEquipped) {
                  handleEquip(item.id);
                } else if (canAfford) {
                  handleBuy(item);
                }
              }
            }}
          >
            {/* Equipped badge */}
            {isEquipped && (
              <div
                className="absolute -top-2 -right-2 z-10"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #f472b6)',
                  color: '#000',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Đang đội
              </div>
            )}

            {/* Tier color dot */}
            <div
              className="absolute top-2 left-2 z-10"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: item.tierColor === 'green' ? '#34d399' 
                  : item.tierColor === 'blue' ? '#38bdf8'
                  : item.tierColor === 'red' ? '#fb7185'
                  : '#c084fc',
                boxShadow: `0 0 8px ${item.tierColor === 'green' ? 'rgba(52,211,153,0.5)' : 
                  item.tierColor === 'blue' ? 'rgba(56,189,248,0.5)' :
                  item.tierColor === 'red' ? 'rgba(251,113,133,0.5)' : 'rgba(192,132,252,0.5)'}`,
              }}
              aria-hidden="true"
            />

            {/* Icon container */}
            <div
              className="w-16 h-16 flex items-center justify-center mb-3 rounded-xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.2))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span
                className="text-3xl"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
              >
                {TIER_ICONS[item.tierColor] || '✨'}
              </span>

              {/* Hover glow overlay */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 50% 50%, ${item.tierColor === 'green' ? 'rgba(52,211,153,0.2)' : 
                      item.tierColor === 'blue' ? 'rgba(56,189,248,0.2)' :
                      item.tierColor === 'red' ? 'rgba(251,113,133,0.2)' : 'rgba(192,132,252,0.2)'}, transparent 70%)`,
                    opacity: 0.5,
                    pointerEvents: 'none',
                    transition: 'opacity 0.3s ease',
                  }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Name */}
            <div
              className="text-sm font-semibold mb-1"
              style={{
                color: '#f1f5f9',
                fontSize: '0.85rem',
              }}
            >
              {item.name}
            </div>

            {/* Price */}
            <div
              className="font-bold font-mono"
              style={{
                color: canAfford ? '#f59e0b' : '#64748b',
                fontSize: '0.9rem',
                fontWeight: 800,
                transition: 'color 0.3s ease',
              }}
            >
              {item.price} Coin
              {!canAfford && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: '#ef4444',
                    marginLeft: '4px',
                    fontWeight: 600,
                  }}
                >
                  (thiếu)
                </span>
              )}
            </div>

            {/* Tier badge */}
            <div
              className="mt-2 text-[10px] font-medium uppercase tracking-wider"
              style={{
                color: item.tierColor === 'green' ? '#34d399' 
                  : item.tierColor === 'blue' ? '#38bdf8'
                  : item.tierColor === 'red' ? '#fb7185'
                  : '#c084fc',
                opacity: 0.7,
              }}
            >
              {item.tierColor === 'green' && 'Cơ Bản'}
              {item.tierColor === 'blue' && 'Nâng Cao'}
              {item.tierColor === 'red' && 'T 고급'}
              {item.tierColor === 'purple' && 'Đẳng Cấp'}
            </div>
          </div>
        );
      })}

      {filteredItems.length === 0 && (
        <div
          style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#64748b',
            fontSize: '0.875rem',
          }}
        >
          Không có sản phẩm nào thuộc danh mục này.
        </div>
      )}
    </div>
  );
};

export default MasonryShopGrid;
