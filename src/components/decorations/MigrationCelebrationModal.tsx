/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Nhiệm vụ 10 — màn hình ăn mừng sau khi migration A/B chạy:
 * thông báo `server-migration-*` (payload gifts/showcase) → modal lễ hội với
 * confetti (CelebrationBurst), preview TRẬT của item được tặng (asset thật từ
 * catalog) và CTA vào Boutique. Chỉ hiện 1 lần (notices được đánh dấu đọc khi
 * lấy về — xem forumStore).
 *
 * Overlay tự chứa màu tối (đúng chuẩn overlay — light mode giữ nguyên, có class
 * .ff-keep-dark để adapter light không can thiệp).
 */
import React, { useEffect, useMemo } from 'react';
import { CelebrationBurst } from '../CelebrationBurst';
import { DECORATION_RARITY_META, resolveAssetUrl } from '../../utils/decorations';
import type { MigrationCelebrationGift, MigrationCelebrationPayload } from '../../types';
import './MigrationCelebrationModal.css';

export interface MigrationCelebrationNotice {
  id: string;
  title: string;
  body: string;
  payload?: MigrationCelebrationPayload | null;
}

interface MigrationCelebrationModalProps {
  notice: MigrationCelebrationNotice;
  onClose: () => void;
  onExploreBoutique: () => void;
}

const KICKER_BY_KIND: Record<string, { kicker: string; tone: 'gold' | 'emerald' | 'violet' | 'rose' }> = {
  'migration-gift': { kicker: 'NÂNG CẤP MIỄN PHÍ', tone: 'gold' },
  'migration-refund': { kicker: 'COIN ĐÃ ĐƯỢC HOÀN', tone: 'emerald' },
  'migration-global': { kicker: 'KHAI TRƯƠNG BOUTIQUE', tone: 'violet' },
};

/** Icon quà SVG (chuẩn: icon, không emoji). */
const GiftIcon: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 12 8 12 8s2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" />
  </svg>
);

const SparkIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4L12 2z" />
  </svg>
);

/** 1 card item (item được tặng hoặc item trưng bày). */
const GiftCard: React.FC<{ gift: MigrationCelebrationGift; highlight?: boolean }> = ({ gift, highlight }) => {
  const rarity = DECORATION_RARITY_META[gift.rarity] || DECORATION_RARITY_META.common;
  return (
    <div
      className={`mcm__card${highlight ? ' mcm__card--highlight' : ''}`}
      style={{ '--mcm-rarity': rarity.color, '--mcm-glow': rarity.glow } as React.CSSProperties}
    >
      <div className="mcm__media">
        <img
          src={resolveAssetUrl(gift.previewUrl)}
          alt={`Trang trí ${gift.name}`}
          width={96}
          height={96}
          loading="eager"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
        {gift.isAnimated && (
          <span className="mcm__badge mcm__badge--animated">
            <SparkIcon size={10} />
            Động
          </span>
        )}
        {gift.equipped && <span className="mcm__badge mcm__badge--equipped">ĐÃ TRANG BỊ</span>}
      </div>
      <div className="mcm__name" title={gift.name}>{gift.name}</div>
      <div className="mcm__rarity" style={{ color: rarity.color }}>{rarity.en}</div>
    </div>
  );
};

export const MigrationCelebrationModal: React.FC<MigrationCelebrationModalProps> = ({
  notice,
  onClose,
  onExploreBoutique,
}) => {
  const kind = notice.payload?.kind || 'migration-global';
  const { kicker, tone } = KICKER_BY_KIND[kind] || KICKER_BY_KIND['migration-global'];

  /* Item chính: item được tặng (B) hoặc bộ trưng bày (toàn hệ thống / hoàn Coin). */
  const gifts = useMemo(
    () => notice.payload?.gifts?.filter((g) => g && g.id && g.previewUrl) || [],
    [notice.payload],
  );
  const showcase = useMemo(
    () => notice.payload?.showcase?.filter((g) => g && g.id && g.previewUrl) || [],
    [notice.payload],
  );
  const cards = gifts.length > 0 ? gifts : showcase;
  const heroCard = cards[0] || null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="mcm ff-keep-dark"
      role="dialog"
      aria-modal="true"
      aria-label={notice.title || 'Thông báo từ F-Forum'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <CelebrationBurst trigger={1} tone={tone} />
      <div className="mcm__panel">
        <button type="button" className="mcm__close" onClick={onClose} aria-label="Đóng thông báo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="mcm__head">
          <div className="mcm__gift-ring">
            <GiftIcon />
          </div>
          <div className="mcm__head-text">
            <div className="mcm__kicker">{kicker}</div>
            <h2 className="mcm__title">{notice.title || 'Boutique đã làm mới'}</h2>
          </div>
        </div>

        {notice.body && <p className="mcm__body">{notice.body}</p>}

        {cards.length > 0 && (
          <div className="mcm__cards">
            {heroCard && (
              <div className="mcm__hero">
                <GiftCard gift={heroCard} highlight />
              </div>
            )}
            {cards.slice(1).map((gift) => (
              <GiftCard key={gift.id} gift={gift} />
            ))}
          </div>
        )}

        <div className="mcm__actions">
          <button type="button" className="mcm__cta" onClick={onExploreBoutique}>
            <SparkIcon size={14} />
            Khám phá Boutique
          </button>
          <button type="button" className="mcm__later" onClick={onClose}>
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
};
