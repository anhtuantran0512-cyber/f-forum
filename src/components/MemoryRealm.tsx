/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import './MemoryRealm.css';

const SKY_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/16b5007d9c93971e26ffe4e0e3e37946f6bd538c.png";
const BACK_FOUR_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/8a7f8af50e0ce92ec2e228e7b0b4112178c51cf1.png";
const BAZAAR_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/864afe00e41e2fa20a5aa546e15cb807e0f81384.png";
const SPLIT_LEFT_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/7536d7b60a1fce482cf6edf3f0bffd3bad5d0f8a.png";
const SPLIT_RIGHT_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/392db6a6a6b98e868bd7f8d3f55bb719d51e5028.png";
const BRIDGE_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/c6a6d8ef49bca43f708aa852692942c45ec950d4.png";
const FRAME_TWO_IMG = "https://raft-blast-61784561.figma.site/_assets/v11/ba75252bab2b1c510987b74837770f7bc8a6b2d4.png";

const ICON1 = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png";
const ICON2 = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png";
const ICON3 = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230448_825949c9-ccdb-4857-b4a6-e349eccc9010.png";

interface LocalizedSightCard {
  kicker: { vie: string; eng: string };
  h3: { vie: string; eng: string };
  p: { vie: string; eng: string };
  pin: string;
}

const ORIGINAL_SIGHTS_DATA: LocalizedSightCard[] = [
  {
    kicker: { vie: "Cột Mốc 01", eng: "Milestone 01" },
    h3: { vie: "Cây Cầu Tri Thức", eng: "Bridge of Knowledge" },
    p: {
      vie: "Cổng vòm đá sừng sững bắc qua dòng sông tuổi trẻ, biểu tượng kết nối muôn phương.",
      eng: "A monumental stone arch spanning the river of youth, symbol of boundless connection.",
    },
    pin: ICON1,
  },
  {
    kicker: { vie: "Góc Hội Quán", eng: "Guild Corner" },
    h3: { vie: "Phố Cũ Rêu Phong", eng: "Cobblestone Alleys" },
    p: {
      vie: "Những con ngõ lát đá, nơi các câu lạc bộ tụ họp và thắp lên ngọn lửa đam mê.",
      eng: "Stone-paved alleys where student clubs gather and kindle the flames of passion.",
    },
    pin: ICON2,
  },
  {
    kicker: { vie: "Điểm Nhìn Cao", eng: "High Vantage" },
    h3: { vie: "Tháp Chuông Kỷ Niệm", eng: "Memory Belltower" },
    p: {
      vie: "Điểm ngắm nhìn trọn vẹn toàn cảnh miền ký ức và dòng chảy nhiệt huyết học đường.",
      eng: "A panoramic vantage point overlooking the memory realm and the vibrant stream of campus life.",
    },
    pin: ICON3,
  },
  {
    kicker: { vie: "Di Sản Trường", eng: "Campus Heritage" },
    h3: { vie: "Nhà Truyền Thống", eng: "Heritage Hall" },
    p: {
      vie: "Không gian lưu giữ những bảng thành tích, đồ án và kỷ vật của nhiều thế hệ học sinh.",
      eng: "A sanctuary preserving accolades, graduation projects, and memorabilia across generations.",
    },
    pin: ICON1,
  },
  {
    kicker: { vie: "Triển Lãm", eng: "Exhibition" },
    h3: { vie: "Biên Niên Sử F-Forum", eng: "F-Forum Chronicles" },
    p: {
      vie: "Kho lưu trữ hình ảnh và những câu chuyện kiến tạo diễn đàn đầy xúc cảm.",
      eng: "An evocative archive of photographs and the founding stories that created the forum.",
    },
    pin: ICON2,
  },
];

const ALL_SIGHT_CARDS: LocalizedSightCard[] = [
  ...ORIGINAL_SIGHTS_DATA,
  ...ORIGINAL_SIGHTS_DATA,
  ...ORIGINAL_SIGHTS_DATA,
];

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smoothstep = (e0: number, e1: number, v: number) => {
  const x = clamp((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};
const segmentInOut = (s: number, a: number, b: number, c: number, d: number) => {
  const enter = smoothstep(a, b, s);
  const exit = smoothstep(c, d, s);
  return { enter, exit, active: enter * (1 - exit) };
};

export interface MemoryRealmProps {
  onNavigateSection?: (sectionId: string) => void;
}

export const MemoryRealm: React.FC<MemoryRealmProps> = ({ onNavigateSection }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [activeSight, setActiveSight] = useState(5);
  const [isJumping, setIsJumping] = useState(false);
  const [language, setLanguage] = useState<'VIE' | 'ENG'>('VIE');
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    let currentSmoothScroll = 0;
    let targetScroll = 0;
    let rafId: number;
    let isInitialized = false;

    const getScrollDistance = () => {
      if (!sectionRef.current) return 0;
      return clamp(
        -sectionRef.current.getBoundingClientRect().top,
        0,
        sectionRef.current.offsetHeight - window.innerHeight
      );
    };

    const update = () => {
      targetScroll = getScrollDistance();
      if (!isInitialized) {
        currentSmoothScroll = targetScroll;
        isInitialized = true;
      } else {
        currentSmoothScroll += (targetScroll - currentSmoothScroll) * 0.14;
        if (Math.abs(targetScroll - currentSmoothScroll) < 0.05) {
          currentSmoothScroll = targetScroll;
        }
      }
      const smoothScroll = currentSmoothScroll;

      const frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
      const frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
      const progress = clamp(smoothScroll / 2700);
      const introExit = smoothstep(90, 650, smoothScroll);
      const sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
      const sightsEnter = Math.pow(sightsEnterRaw, 1.55);
      const sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
      const blurActive = clamp(frame2.active + frame3.active);
      const frame2Opacity = frame2.active * (1 - frame3.enter);
      const splitDrift = Math.pow(frame2.enter, 1.5);
      const panel2Opacity = frame2.active * (1 - frame2.exit);
      const panel3Opacity = frame3.active * (1 - frame3.exit);
      const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
      const sharedHeroY = progress * -74;
      const sharedHeroScale = progress * 0.23;
      const sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
      const sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;

      const el = sectionRef.current;
      if (el) {
        el.style.setProperty('--back-scale', backScale.toFixed(4));
        el.style.setProperty('--back-y', `${(progress * -40).toFixed(2)}px`);
        el.style.setProperty('--four-y', `${(10 - progress * 8).toFixed(2)}vh`);
        el.style.setProperty('--four-scale', `${(0.78 + progress * 0.12).toFixed(4)}`);
        el.style.setProperty('--bazaar-y', `${(20 - progress * 16).toFixed(2)}vh`);
        el.style.setProperty('--blur-px', `${(blurActive * 4).toFixed(2)}px`);
        el.style.setProperty('--back-brightness', (1 - blurActive * 0.15).toFixed(3));
        el.style.setProperty('--bazaar-blur-px', `${((1 - frame3.active) * 2).toFixed(2)}px`);
        el.style.setProperty('--bazaar-brightness', (1 + frame3.active * 0.1).toFixed(3));
        el.style.setProperty('--bazaar-saturation', (1 + blurActive * 0.2).toFixed(3));

        el.style.setProperty('--shade-top-alpha', (blurActive * 0.25).toFixed(3));
        el.style.setProperty('--shade-mid-alpha', (blurActive * 0.45).toFixed(3));
        el.style.setProperty('--shade-bottom-alpha', (blurActive * 0.65).toFixed(3));

        el.style.setProperty('--title-y', `${sharedHeroY.toFixed(2)}px`);
        el.style.setProperty('--title-scale', (1 + sharedHeroScale).toFixed(4));
        el.style.setProperty('--title-opacity', (1 - introExit).toFixed(3));

        el.style.setProperty('--bridge-y', `${(frame2.enter * 180).toFixed(2)}px`);
        el.style.setProperty('--bridge-scale', (1.02 + frame2.enter * 0.35).toFixed(4));

        el.style.setProperty('--split-left-x', `calc(-50% - ${(splitDrift * 35).toFixed(2)}vw)`);
        el.style.setProperty('--split-left-y', `${(splitDrift * 40).toFixed(2)}px`);
        el.style.setProperty('--split-left-scale', (1 + splitDrift * 0.1).toFixed(4));

        el.style.setProperty('--split-right-x', `calc(-50% + ${(splitDrift * 35).toFixed(2)}vw)`);
        el.style.setProperty('--split-right-y', `${(splitDrift * 40).toFixed(2)}px`);
        el.style.setProperty('--split-right-scale', (1 + splitDrift * 0.1).toFixed(4));

        el.style.setProperty('--frame2-opacity', frame2Opacity.toFixed(3));
        el.style.setProperty('--frame2-scale', (1.06 + frame2.exit * 0.1).toFixed(4));

        el.style.setProperty('--intro-copy-y', `${(introExit * -50).toFixed(2)}px`);
        el.style.setProperty('--intro-copy-opacity', (1 - introExit).toFixed(3));

        el.style.setProperty('--panel2-opacity', panel2Opacity.toFixed(3));
        el.style.setProperty('--panel2-y', `calc(-50% + ${((1 - frame2.enter) * 58 - frame2.exit * 40).toFixed(2)}px)`);

        el.style.setProperty('--panel3-opacity', panel3Opacity.toFixed(3));
        el.style.setProperty('--panel3-y', `calc(-50% + ${((1 - frame3.enter) * 58 - frame3.exit * 40).toFixed(2)}px)`);
        el.style.setProperty('--panel3-pointer-events', panel3Opacity > 0.15 ? 'auto' : 'none');

        el.style.setProperty('--sights-opacity', sightsEnter.toFixed(3));
        el.style.setProperty('--sights-controls-opacity', sightsControlsEnter.toFixed(3));
        el.style.setProperty('--sights-enter-x', `${((1 - sightsEnter) * 120).toFixed(2)}vw`);
        el.style.setProperty('--sights-visibility', sightsEnterRaw > 0.001 ? 'visible' : 'hidden');
        el.style.setProperty('--sights-top', `${sightsParentTop.toFixed(2)}px`);
        el.style.setProperty('--sights-screen-top', `${sightsScreenTop.toFixed(2)}px`);
      }

      if (controlsRef.current) {
        if (sightsControlsEnter > 0.7) {
          controlsRef.current.classList.add('is-ready');
        } else {
          controlsRef.current.classList.remove('is-ready');
        }
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sectionRef.current) return;
      const mx = (e.clientX / window.innerWidth - 0.5) * 2;
      const my = (e.clientY / window.innerHeight - 0.5) * 2;
      sectionRef.current.style.setProperty('--mx', mx.toFixed(3));
      sectionRef.current.style.setProperty('--my', my.toFixed(3));
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getCardStep = useCallback(() => {
    if (!trackRef.current) return 400;
    const cards = trackRef.current.querySelectorAll('.sight-card');
    if (cards.length >= 2) {
      const el0 = cards[0] as HTMLElement;
      const el1 = cards[1] as HTMLElement;
      const delta = el1.offsetLeft - el0.offsetLeft;
      if (delta > 50) return delta;
    }
    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 640) {
        return Math.min(window.innerWidth * 0.82, 330) + 16;
      }
      const cardWidth = Math.min(430, Math.max(360, window.innerWidth * 0.194));
      const gap = Math.min(24, Math.max(16, window.innerWidth * 0.0115));
      return cardWidth + gap;
    }
    return 400;
  }, []);

  const updateSliderShift = useCallback((index: number) => {
    if (!sectionRef.current) return;
    const step = getCardStep();
    const shift = -index * step;
    sectionRef.current.style.setProperty('--sights-shift', `${shift}px`);
  }, [getCardStep]);

  useEffect(() => {
    updateSliderShift(activeSight);
  }, [activeSight, updateSliderShift]);

  useEffect(() => {
    const handleResize = () => {
      const track = trackRef.current;
      if (track && sectionRef.current) {
        track.classList.add('is-jumping');
        void track.offsetHeight;
        updateSliderShift(activeSight);
        void track.offsetHeight;
        requestAnimationFrame(() => {
          if (trackRef.current && !isJumping) {
            trackRef.current.classList.remove('is-jumping');
          }
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeSight, isJumping, updateSliderShift]);

  const moveSightSlider = (delta: number) => {
    if (isJumping || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setActiveSight(prev => {
      const next = prev + delta;
      return Math.max(1, Math.min(13, next));
    });
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 700);
  };

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current || (e.propertyName && e.propertyName !== 'transform')) return;
    isTransitioningRef.current = false;

    const track = trackRef.current;
    if (!track || !sectionRef.current) return;

    if (activeSight >= 10 || activeSight < 5) {
      const reset = activeSight >= 10 ? activeSight - 5 : activeSight + 5;

      track.classList.add('is-jumping');
      setIsJumping(true);

      void track.offsetHeight;

      const step = getCardStep();
      sectionRef.current.style.setProperty('--sights-shift', `${-reset * step}px`);
      void track.offsetHeight;

      setActiveSight(reset);

      requestAnimationFrame(() => {
        track.classList.remove('is-jumping');
        setIsJumping(false);
      });
    }
  };

  const scrollToScrubPoint = (e: React.MouseEvent, scrubPx: number) => {
    e.preventDefault();
    if (!sectionRef.current) return;
    const sectionTop = window.scrollY + sectionRef.current.getBoundingClientRect().top;
    window.scrollTo({ top: sectionTop + scrubPx, behavior: 'smooth' });
  };

  const scrollToChronicles = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateSection) {
      onNavigateSection('chronicles-section');
      return;
    }
    const el = document.getElementById('chronicles-section') || document.getElementById('routes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (sectionRef.current) {
      const sectionBottom = window.scrollY + sectionRef.current.getBoundingClientRect().top + sectionRef.current.offsetHeight;
      window.scrollTo({ top: sectionBottom, behavior: 'smooth' });
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'VIE' ? 'ENG' : 'VIE'));
  };

  return (
    <section className="cinema-scroll" id="cinema" aria-label="Mostar cinematic scroll story" ref={sectionRef}>
      <div className="stage">
        <div className="world">
          <img
            className="scene-img sky-img"
            src={SKY_IMG}
            alt="Sky layer"
            loading="lazy"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />

          <header className="site-header" aria-label="Primary navigation">
            <a
              className="site-logo"
              href="#cinema"
              onClick={(e) => scrollToScrubPoint(e, 0)}
            >
              F-Forum • Miền ký ức
            </a>
            <nav className="site-nav" aria-label="Main menu">
              <a href="#cinema" onClick={(e) => scrollToScrubPoint(e, 0)}>
                {language === 'VIE' ? 'Khởi nguyên' : 'Origin'}
              </a>
              <a href="#bridge" onClick={(e) => scrollToScrubPoint(e, 950)}>
                {language === 'VIE' ? 'Nhịp cầu' : 'The Bridge'}
              </a>
              <a href="#bazaar" onClick={(e) => scrollToScrubPoint(e, 2150)}>
                {language === 'VIE' ? 'Góc quán' : 'The Bazaar'}
              </a>
              <a href="#routes" onClick={scrollToChronicles}>
                {language === 'VIE' ? 'Biên niên sử' : 'Chronicles'}
              </a>
            </nav>
            <button
              className="language-switcher"
              aria-label="Change language"
              onClick={toggleLanguage}
            >
              <span>{language}</span>
              <span aria-hidden="true">⌄</span>
            </button>
          </header>

          <div className="back-stack">
            <img
              className="scene-img back-img back-four"
              src={BACK_FOUR_IMG}
              alt="Back layer four"
              loading="lazy"
              decoding="async"
              width={1920}
              height={1080}
              onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            />
            <section className="sights-slider" aria-label="Mostar sights slider">
              <div
                className={`sights-track ${isJumping ? 'is-jumping' : ''}`}
                ref={trackRef}
                onTransitionEnd={handleTransitionEnd}
              >
                {ALL_SIGHT_CARDS.map((card, idx) => (
                  <div className="sight-card" key={idx}>
                    <span className="sight-kicker">
                      {language === 'VIE' ? card.kicker.vie : card.kicker.eng}
                    </span>
                    <img
                      className="sight-pin"
                      src={card.pin}
                      alt={language === 'VIE' ? card.h3.vie : card.h3.eng}
                      loading="lazy"
                      decoding="async"
                      width={320}
                      height={420}
                      onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                    />
                    <h3>{language === 'VIE' ? card.h3.vie : card.h3.eng}</h3>
                    <p>{language === 'VIE' ? card.p.vie : card.p.eng}</p>
                  </div>
                ))}
              </div>
            </section>
            <img
              className="scene-img back-img back-bazaar"
              src={BAZAAR_IMG}
              alt="Bazaar layer"
              loading="lazy"
              decoding="async"
              width={1920}
              height={1080}
              onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            />
          </div>

          <div className="sights-controls" ref={controlsRef} aria-label="Slider controls">
            <button
              className="sight-nav sight-prev"
              onClick={() => moveSightSlider(-1)}
              aria-label="Previous sight card"
            >
              ←
            </button>
            <button
              className="sight-nav sight-next"
              onClick={() => moveSightSlider(1)}
              aria-label="Next sight card"
            >
              →
            </button>
          </div>

          <h1 className="hero-title">{language === 'VIE' ? 'KÝ ỨC' : 'MEMORY'}</h1>

          <img
            className="scene-img splitframe-img splitframe-left"
            src={SPLIT_LEFT_IMG}
            alt="Split frame left"
            loading="lazy"
            decoding="async"
            width={960}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />
          <img
            className="scene-img splitframe-img splitframe-right"
            src={SPLIT_RIGHT_IMG}
            alt="Split frame right"
            loading="lazy"
            decoding="async"
            width={960}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />
          <img
            className="scene-img bridge-img"
            src={BRIDGE_IMG}
            alt="Bridge layer"
            loading="lazy"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />
          <img
            className="scene-img frame-two-img"
            src={FRAME_TWO_IMG}
            alt="Frame two layer"
            loading="lazy"
            decoding="async"
            width={1920}
            height={1080}
            onError={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
          />

          <div className="shade"></div>
        </div>

        <section className="intro-copy" aria-label="Mostar overview">
          <p>
            {language === 'VIE'
              ? 'Một nhịp cầu đá, dòng nước xanh ngọc và miền ký ức trường xưa đọng lại qua từng khoảnh khắc không thể nào quên.'
              : 'A stone bridge, emerald waters, and memories of campus life etched into every unforgettable moment.'}
          </p>
          <div className="hero-tags" aria-label="Mostar highlights">
            <span>{language === 'VIE' ? 'Cây Cầu Tri Thức' : 'Bridge of Knowledge'}</span>
            <span>{language === 'VIE' ? 'Dòng Sông Tuổi Trẻ' : 'River of Youth'}</span>
            <span>{language === 'VIE' ? 'Di Sản F-Forum' : 'F-Forum Heritage'}</span>
          </div>
        </section>

        <section className="story-panel story-panel-bridge" id="bridge" aria-label="Old Bridge details">
          <h2>
            {language === 'VIE'
              ? 'Cây cầu kết nối ngàn thế hệ.'
              : 'The bridge connecting generations.'}
          </h2>
          <p>
            {language === 'VIE'
              ? 'Nhịp cầu nối đôi bờ sông quá khứ và tương lai, nâng đỡ những ước mơ học trò vươn ra biển lớn.'
              : 'A span bridging the rivers of past and future, carrying student dreams out into the wider world.'}
          </p>
          <dl className="facts">
            <div>
              <dt>2026</dt>
              <dd>
                {language === 'VIE'
                  ? 'Dấu ấn F-Forum khởi sinh kỷ nguyên tri thức'
                  : 'F-Forum milestone marks the dawn of a knowledge era'}
              </dd>
            </div>
            <div>
              <dt>{language === 'VIE' ? 'VÔ HẠN' : 'INFINITE'}</dt>
              <dd>
                {language === 'VIE'
                  ? 'Những tình bạn và kỷ niệm lưu dấu ngàn sau'
                  : 'Friendships and memories preserved forever'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="story-panel story-panel-bazaar" id="bazaar" aria-label="Old town details">
          <h2>
            {language === 'VIE'
              ? 'Góc phố lưu giữ bước chân xưa.'
              : 'Streets echoing past footsteps.'}
          </h2>
          <p>
            {language === 'VIE'
              ? 'Những góc hành lang, quán nước thân thương và tiếng cười bạn bè vẫn vẹn nguyên trong từng nhịp thở của thời gian.'
              : 'Familiar corridors, cozy hangout corners, and laughter of friends remain vivid in every breath of time.'}
          </p>
          <button className="note-button" onClick={scrollToChronicles}>
            <span aria-hidden="true">↗</span>
            <span>
              {language === 'VIE' ? 'Khám phá biên niên sử' : 'Explore Chronicles'}
            </span>
          </button>
        </section>
      </div>
    </section>
  );
};

export default MemoryRealm;
