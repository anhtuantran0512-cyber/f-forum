/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect } from 'react';

interface PageResourceLoaderProps {
  onLoaded: () => void;
  minDurationMs?: number;
}

export const PageResourceLoader: React.FC<PageResourceLoaderProps> = ({
  onLoaded,
  minDurationMs = 1200,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    const checkResourcesReady = async () => {
      if (document.readyState !== 'complete') {
        await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
      }
      if ('fonts' in document) {
        try {
          await (document as any).fonts.ready;
        } catch {
          /* ignore */
        }
      }
      const elapsed = Date.now() - startTime;
      const waitRemaining = Math.max(0, minDurationMs - elapsed);
      await new Promise((r) => setTimeout(r, waitRemaining));

      if (isMounted) {
        setIsReady(true);
        setTimeout(() => {
          if (isMounted) {
            setIsExiting(true);
            setTimeout(() => {
              if (isMounted) {
                onLoaded();
              }
            }, 450);
          }
        }, 900);
      }
    };

    checkResourcesReady();

    return () => {
      isMounted = false;
    };
  }, [onLoaded, minDurationMs]);

  const handleManualSkip = () => {
    setIsReady(true);
    setIsExiting(true);
    setTimeout(() => {
      onLoaded();
    }, 200);
  };

  return (
    <div
      className={`la-08 fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-500 ${
        isReady ? 'is-ready' : ''
      } ${isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      data-state={isReady ? 'ready' : 'loading'}
      data-theme={isDarkTheme ? 'dark' : 'light'}
      style={{
        background: 'radial-gradient(100% 70% at 50% -10%, rgba(13,148,136,0.22), transparent 65%), #0c1218',
      }}
    >
      {/* Top Chrome Controls */}
      <div className="la-08__chrome fixed top-4 right-4 flex items-center gap-2 z-50">
        <button
          type="button"
          onClick={() => setIsDarkTheme((prev) => !prev)}
          className="la-08__btn la-08__theme w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all cursor-pointer shadow-lg"
          aria-pressed={isDarkTheme}
          aria-label={isDarkTheme ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        >
          {isDarkTheme ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={handleManualSkip}
          className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/15 transition-all cursor-pointer shadow-lg"
        >
          {isReady ? 'Vào F-Forum ✓' : 'Bỏ qua ➔'}
        </button>
      </div>

      {/* Main Card */}
      <section
        className="la-08__card w-full max-w-[24rem] p-6 rounded-3xl bg-[#0f172a]/90 backdrop-blur-2xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)] text-center flex flex-col items-center gap-4 relative animate-fade-up"
        role="status"
        aria-live="polite"
        aria-label={
          isReady
            ? 'Tất cả tài nguyên F-Forum đã được tải đầy đủ'
            : 'Đang tải tài nguyên giao diện F-Forum...'
        }
      >
        {/* Calendar Tile */}
        <div className="la-08__cal relative w-28 p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-col gap-1.5 shadow-lg">
          <span className="la-08__cal-top flex justify-center gap-6">
            <i className="w-1.5 h-2.5 rounded-full bg-white/40 block" />
            <i className="w-1.5 h-2.5 rounded-full bg-white/40 block" />
          </span>

          <ol className="la-08__grid list-none m-0 p-0 grid grid-cols-5 gap-1">
            <li className="la-08__day" style={{ '--i': 0 } as any} />
            <li className="la-08__day" style={{ '--i': 1 } as any} />
            <li className="la-08__day" style={{ '--i': 2 } as any} />
            <li className="la-08__day" style={{ '--i': 3 } as any} />
            <li className="la-08__day" style={{ '--i': 4 } as any} />
            <li className="la-08__day" style={{ '--i': 5 } as any} />
            <li className="la-08__day" style={{ '--i': 6 } as any} />
            <li className="la-08__day" style={{ '--i': 7 } as any} />
            <li className="la-08__day la-08__day--sel font-bold text-[10px]" style={{ '--i': 8 } as any}>
              12
            </li>
            <li className="la-08__day" style={{ '--i': 9 } as any} />
            <li className="la-08__day" style={{ '--i': 10 } as any} />
            <li className="la-08__day" style={{ '--i': 11 } as any} />
            <li className="la-08__day" style={{ '--i': 12 } as any} />
            <li className="la-08__day" style={{ '--i': 13 } as any} />
            <li className="la-08__day" style={{ '--i': 14 } as any} />
          </ol>

          {/* Confirmation Seal */}
          <svg className="la-08__seal" viewBox="0 0 48 48" focusable="false">
            <circle className="la-08__ring" cx="24" cy="24" r="15" />
            <path className="la-08__check" d="M16.5 24.6 21.6 29.8 32 18.8" />
          </svg>
        </div>

        {/* Copy Text */}
        <div className="la-08__copy space-y-1">
          <p className="la-08__label text-base font-bold text-white tracking-wide">
            <span className="la-08__load inline-flex items-center gap-1.5 text-teal-300">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              Đang tải tài nguyên hệ thống
            </span>
            <span className="la-08__ready hidden text-emerald-300">
              Hệ thống F-Forum đã sẵn sàng ✓
            </span>
          </p>
          <p className="la-08__meta text-xs text-neutral-300 font-mono">
            F-Forum Campus Network <span aria-hidden="true">·</span> Real-Time WebSockets
          </p>
          <p className="la-08__clinic text-[11px] text-neutral-400">
            BroAmStuck Studio <span aria-hidden="true">·</span> Zero-Cost Cloud Edge
          </p>
        </div>

        {/* ECG Vitals Line */}
        <div className="la-08__vitals w-full flex items-center justify-between gap-3 p-2 px-3 rounded-2xl bg-teal-500/10 border border-teal-500/20">
          <svg className="la-08__ecg-wrap flex-1 h-7" viewBox="0 0 240 40" preserveAspectRatio="none" focusable="false">
            <path className="la-08__base" d="M0 24h240" />
            <path className="la-08__ecg" d="M0 24h44l6-3 5 10 6-22 6 15 5-3h40l6-3 5 10 6-22 6 15 5-3h95" />
          </svg>
          <span className="la-08__bpm text-xs font-mono font-bold text-teal-300 shrink-0">
            72 bpm
          </span>
        </div>
      </section>
    </div>
  );
};

export default PageResourceLoader;
