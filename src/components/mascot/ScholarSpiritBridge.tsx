/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';
import { loadSpiritSettings, type SpiritSettings } from '../../utils/spiritStorage';
import './ScholarSpiritBridge.css';

declare global {
  interface Window {
    __astralDragon?: boolean;
    __astralDragonMode?: string;
    __astralDragonState?: string;
    __astralDragonCfg?: {
      paused: boolean;
      species: string;
      skin: string;
      scale: number;
      showLotus: boolean;
      showGlyphs: boolean;
      rebuildSkin?: (skinKey: string) => void;
      setSpecies?: (speciesKey: string) => void;
      setEventMode?: (eventKey: string) => void;
      triggerPulse?: (x?: number, y?: number) => void;
      spawnKnowledgeFood?: (x?: number, y?: number) => void;
      ascendDragon?: () => void;
      announceWish?: (msg: string) => void;
      presets?: Record<string, { poems?: string[]; stamp?: string; crest?: string }>;
      crests?: Record<string, string>;
      eventMode?: string;
      poemIdx?: number;
      customWish?: string;
    };
    __astralDragonCleanup?: () => void;
    FORUM_SPIRIT_CONFIG?: Record<string, any>;
  }
}

export const ScholarSpiritBridge: React.FC = () => {
  const [settings, setSettings] = useState<SpiritSettings>(loadSpiritSettings);
  const [poemIdx, setPoemIdx] = useState(0);
  const [celebrationPoem, setCelebrationPoem] = useState<string | null>(null);

  useEffect(() => {
    const handleDuelistVictory = () => {
      setCelebrationPoem('Bút nghiên sáng rực bảng vàng son,<br>Đấu Sĩ Tri Thức khải hoàn rạng danh!');
      window.__astralDragonCfg?.triggerPulse?.();
      window.__astralDragonCfg?.ascendDragon?.();
    };
    const handleStreak = () => {
      setCelebrationPoem('Bảy ngày bền bỉ vượt trùng khơi,<br>Trúc xanh vươn thẳng ngút trời Sao Khuê!');
      window.__astralDragonCfg?.triggerPulse?.();
    };

    window.addEventListener('fforum_duelist_updated', handleDuelistVictory);
    window.addEventListener('fforum_streak_completed', handleStreak);

    return () => {
      window.removeEventListener('fforum_duelist_updated', handleDuelistVictory);
      window.removeEventListener('fforum_streak_completed', handleStreak);
    };
  }, []);

  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<SpiritSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };
    window.addEventListener('ff_spirit_settings_changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('ff_spirit_settings_changed', handleSettingsChanged);
    };
  }, []);

  useEffect(() => {
    window.FORUM_SPIRIT_CONFIG = {
      species: settings.species,
      skin: settings.skin,
      paused: !settings.enabled,
      scale: settings.scale,
      showLotus: settings.showLotus,
    };

    if (!document.getElementById('fforum-spirit-script')) {
      const script = document.createElement('script');
      script.id = 'fforum-spirit-script';
      script.src = '/assets/mascot/fforum-scholar-spirit-v5.js';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.__astralDragonCfg) {
      const cfg = window.__astralDragonCfg;
      cfg.paused = !settings.enabled;
      if (cfg.setSpecies) cfg.setSpecies(settings.species);
      if (cfg.rebuildSkin) cfg.rebuildSkin(settings.skin);
      cfg.scale = settings.scale;
      cfg.showLotus = settings.showLotus;
    }
  }, [settings]);

  if (!settings.enabled || !settings.showCard) {
    return null;
  }

  const cfg = window.__astralDragonCfg;
  const presets = cfg?.presets;
  const crests = cfg?.crests;
  const currentEvent = cfg?.eventMode || 'vn_2010';
  const preset = presets?.[currentEvent] || presets?.vn_2010;
  const poems = preset?.poems || [
    'Biển học mênh mông rèn chí lớn,<br>Đèn khuya sáng tỏ bậc kỳ tài.',
  ];
  const safeIdx = poemIdx % poems.length;
  const currentPoem = celebrationPoem || poems[safeIdx];
  const crestSvg = (preset?.crest && crests?.[preset.crest]) || crests?.seal || '';
  const stampText = celebrationPoem ? 'Bảo Hộ Sĩ Tử' : (preset?.stamp || 'Kỷ niệm F-Forum');

  return (
    <aside id="fForumPoeticCard" className="fforum-poetic-card">
      <div className="flex items-start gap-3">
        <div
          id="ffCardCrest"
          className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/45 flex items-center justify-center text-amber-300 shrink-0 mt-0.5 shadow-inner"
          title="Ấn chương F-Forum Sao Khuê"
          dangerouslySetInnerHTML={{ __html: crestSvg }}
        />
        <blockquote
          id="ffCardPoem"
          className="serif-poem italic text-sm sm:text-[15px] leading-relaxed flex-1 text-slate-100"
          dangerouslySetInnerHTML={{ __html: currentPoem }}
        />
      </div>
      <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between gap-2 text-[11px]">
        <span id="ffCardStamp" className="font-semibold text-amber-300 tracking-wide">
          {stampText}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="btnNextPoem"
            onClick={() => {
              setPoemIdx((prev) => (prev + 1) % poems.length);
              cfg?.triggerPulse?.();
            }}
            className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/35 text-amber-200 font-mono text-[10px] hover:bg-amber-500/30 transition cursor-pointer"
            title="Đổi bài thơ khác"
          >
            Thơ {safeIdx + 1}/{poems.length}
          </button>
          <span className="font-mono text-[10px] opacity-65 text-slate-400">F-Forum</span>
        </div>
      </div>
    </aside>
  );
};
