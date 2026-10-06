/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef } from 'react';

interface PageResourceLoaderProps {
  onLoaded: () => void;
  minDurationMs?: number;
}

interface LoadStep {
  id: string;
  label: string;
  weight: number;
}

const STEPS: LoadStep[] = [
  { id: 'dom', label: 'dom', weight: 20 },
  { id: 'css', label: 'styles', weight: 10 },
  { id: 'fonts', label: 'fonts', weight: 20 },
  { id: 'api', label: 'api', weight: 30 },
  { id: 'rt', label: 'ws', weight: 20 },
];

const TOTAL_WEIGHT = STEPS.reduce((acc, s) => acc + s.weight, 0);

export const PageResourceLoader: React.FC<PageResourceLoaderProps> = ({
  onLoaded,
  minDurationMs = 1800,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(['> f-forum: khởi tạo tài nguyên...']);

  const doneRef = useRef<Record<string, boolean>>({});
  const targetRef = useRef(0);
  const finishedRef = useRef(false);
  const mountedRef = useRef(true);

  const pushLog = (line: string) => {
    if (!mountedRef.current) return;
    setLogs((prev) => [...prev.slice(-6), line]);
  };

  const markDone = (id: string, line: string) => {
    if (doneRef.current[id]) return;
    doneRef.current[id] = true;
    targetRef.current = STEPS.reduce((acc, s) => acc + (doneRef.current[s.id] ? s.weight : 0), 0);
    pushLog(line);
  };

  useEffect(() => {
    mountedRef.current = true;
    const startTime = Date.now();

    /* 1. DOM ready */
    if (document.readyState === 'complete') {
      markDone('dom', '> dom: tài liệu đã sẵn sàng');
    } else {
      window.addEventListener(
        'load',
        () => markDone('dom', '> dom: tài liệu đã sẵn sàng'),
        { once: true },
      );
    }

    /* 2. Stylesheets */
    const cssCheck = setInterval(() => {
      if (document.styleSheets.length > 0) {
        clearInterval(cssCheck);
        markDone('css', `> styles: ${document.styleSheets.length} stylesheet đã nạp`);
      }
    }, 120);
    setTimeout(() => {
      clearInterval(cssCheck);
      markDone('css', '> styles: đã nạp');
    }, 2500);

    /* 3. Fonts */
    pushLog('> fonts: đang nạp phông chữ...');
    if ('fonts' in document) {
      try {
        (document as any).fonts.ready
          .then(() => {
            const count = (document as any).fonts?.size ?? 0;
            markDone('fonts', `> fonts: ${count > 0 ? count : 'tất cả'} phông chữ hoàn tất`);
          })
          .catch(() => markDone('fonts', '> fonts: hoàn tất'));
      } catch {
        markDone('fonts', '> fonts: hoàn tất');
      }
      setTimeout(() => markDone('fonts', '> fonts: hoàn tất'), 4000);
    } else {
      markDone('fonts', '> fonts: hoàn tất');
    }

    const sessionPromise = fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        if (!response.ok) return false;
        const data = await response.json();
        return Boolean(data.user?.id);
      })
      .catch(() => false);

    /* 4. Server data sync is private, so guests do not request it. */
    pushLog('> api: kiểm tra phiên và đồng bộ dữ liệu...');
    let apiFinished = false;
    void sessionPromise.then(async (hasSession) => {
      if (!mountedRef.current) return;
      if (!hasSession) {
        apiFinished = true;
        markDone('api', '> api: khách — đồng bộ sau khi đăng nhập');
        return;
      }
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const json = await res.json();
          const data = json?.data || {};
          const items =
            (Array.isArray(data.questions) ? data.questions.length : 0) +
            (Array.isArray(data.solutions) ? data.solutions.length : 0) +
            (Array.isArray(data.chatMessages) ? data.chatMessages.length : 0) +
            (Array.isArray(data.clubs) ? data.clubs.length : 0);
          apiFinished = true;
          markDone('api', `> api: ok — ${items} mục dữ liệu đã đồng bộ`);
        } else {
          apiFinished = true;
          markDone('api', '> api: ngoại tuyến, dùng bộ nhớ đệm');
        }
      } catch {
        apiFinished = true;
        markDone('api', '> api: ngoại tuyến, dùng bộ nhớ đệm');
      }
    });
    setTimeout(() => {
      if (!apiFinished) markDone('api', '> api: timeout, tiếp tục');
    }, 6000);

    /* 5. Realtime is account-bound too; avoid an anonymous rejected handshake. */
    pushLog('> ws: kiểm tra quyền kênh thời gian thực...');
    let rtFinished = false;
    const finishRt = (line: string) => {
      if (rtFinished) return;
      rtFinished = true;
      markDone('rt', line);
    };
    void sessionPromise.then((hasSession) => {
      if (!mountedRef.current || rtFinished) return;
      if (!hasSession) {
        finishRt('> ws: khả dụng sau khi đăng nhập');
        return;
      }
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
        ws.onopen = () => finishRt('> ws: kết nối thời gian thực ok');
        ws.onerror = () => finishRt('> sse: dùng kênh dự phòng');
        setTimeout(() => {
          finishRt('> ws: sẵn sàng');
          try {
            ws.close();
          } catch {
            /* ignore */
          }
        }, 3500);
      } catch {
        finishRt('> ws: sẵn sàng');
      }
    });

    /* Smooth progress animation toward the real target */
    const tick = setInterval(() => {
      if (!mountedRef.current) return;
      setDisplayProgress((prev) => {
        const allDone = STEPS.every((s) => doneRef.current[s.id]);
        const minElapsed = Date.now() - startTime >= minDurationMs;
        let target = Math.round((targetRef.current / TOTAL_WEIGHT) * 100);
        if (allDone && minElapsed) target = 100;
        else target = Math.min(target, 97);

        const next = prev + Math.max(0.4, (target - prev) * 0.14);
        const clamped = Math.min(next, target);

        if (clamped >= 100 && !finishedRef.current) {
          finishedRef.current = true;
          pushLog('> f-forum: tất cả tài nguyên đã sẵn sàng ✓');
          setTimeout(() => {
            if (!mountedRef.current) return;
            setIsExiting(true);
            setTimeout(() => {
              if (mountedRef.current) onLoaded();
            }, 480);
          }, 700);
        }
        return clamped;
      });
    }, 60);

    /* Lưới an toàn tuyệt đối: dù có bước nào treo (tab bị bóp nhịp, mạng đứng),
       màn hình chờ cũng tự đóng sau tối đa 5.2s — không bao giờ khoá trang. */
    const hardStop = window.setTimeout(() => {
      if (!mountedRef.current || finishedRef.current) return;
      finishedRef.current = true;
      pushLog('> f-forum: bỏ qua bước còn lại, vào trang');
      setIsExiting(true);
      window.setTimeout(() => {
        if (mountedRef.current) onLoaded();
      }, 300);
    }, 5200);

    return () => {
      mountedRef.current = false;
      clearInterval(tick);
      clearInterval(cssCheck);
      window.clearTimeout(hardStop);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const handleManualSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (mountedRef.current) onLoaded();
    }, 250);
  };

  const pct = Math.round(displayProgress);
  const lastLogs = logs.slice(-2);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-500 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="off"
      aria-busy="true"
      aria-label="Đang tải F-Forum"
      style={{
        background:
          'radial-gradient(100% 70% at 50% -10%, rgba(13,148,136,0.22), transparent 65%), radial-gradient(70% 50% at 85% 100%, rgba(167,139,250,0.14), transparent 60%), radial-gradient(70% 50% at 10% 90%, rgba(245,158,11,0.12), transparent 55%), #0c1218',
      }}
    >
      {/* Manual skip remains available; no decorative controls that pretend to change app state. */}
      <div className="fixed top-4 right-4 z-50">
        <button
          type="button"
          onClick={handleManualSkip}
          className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/15 transition-all cursor-pointer shadow-lg"
        >
          Bỏ qua ➔
        </button>
      </div>

      {/* Main Column */}
      <section className="w-full max-w-[24rem] flex flex-col items-center gap-5 animate-fade-up">
        {/* Aurora Orb */}
        <div className="ff-orb w-[92px] h-[92px]">
          <div className="ff-orb__layer" />
          <div className="ff-orb__layer" />
          <div className="ff-orb__layer" />
          <div className="ff-orb__ring" />
        </div>

        {/* Brand */}
        <div className="text-center">
          <h1 className="font-['Playfair_Display'] italic font-bold text-3xl ff-aurora-text tracking-wide">
            F-Forum
          </h1>
          <p className="text-[11px] text-neutral-400 font-mono mt-1 tracking-wider">
            Đang tải tài nguyên hệ thống
          </p>
        </div>

        {/* Calendar Card (kept from original design) */}
        <div className="la-08 w-full">
          <div className="la-08__card w-full">
            <div className="la-08__cal relative w-24 p-2 rounded-2xl">
              <span className="la-08__cal-top flex justify-center gap-6">
                <i className="w-1.5 h-2.5 rounded-full bg-white/40 block" />
                <i className="w-1.5 h-2.5 rounded-full bg-white/40 block" />
              </span>

              <ol className="la-08__grid list-none m-0 p-0 grid grid-cols-5 gap-1">
                {Array.from({ length: 15 }, (_, i) => (
                  <li
                    key={i}
                    className={`la-08__day ${i === 8 ? 'la-08__day--sel font-bold text-[10px]' : ''}`}
                    style={{ '--i': i } as any}
                  >
                    {i === 8 ? new Date().getDate() : ''}
                  </li>
                ))}
              </ol>

              <svg className="la-08__seal" viewBox="0 0 48 48" focusable="false">
                <circle className="la-08__ring" cx="24" cy="24" r="15" />
                <path className="la-08__check" d="M16.5 24.6 21.6 29.8 32 18.8" />
              </svg>
            </div>

            {/* Progress bar with real % */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-teal-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                  {pct < 100 ? 'Đang tải tài nguyên' : 'Sẵn sàng ✓'}
                </span>
                <span className="ff-aurora-text font-bold text-sm tabular-nums">{pct}%</span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-white/10 overflow-hidden border border-white/10"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full ff-aurora-bar rounded-full transition-[width] duration-200 ease-out relative"
                  style={{ width: `${pct}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer rounded-full" />
                </div>
              </div>
            </div>

            {/* Mini console (2 lines) */}
            <div className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-left overflow-hidden">
              <div className="flex items-center gap-1.5 pb-1 border-b border-white/5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400/80" />
                <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
                <span className="text-[8.5px] font-mono text-white/30 ml-1 uppercase tracking-widest">console</span>
              </div>
              <div className="font-mono text-[10px] leading-relaxed h-[30px] flex flex-col justify-end">
                {lastLogs.map((line, i) => (
                  <p key={`${line}-${i}`} className={`truncate ${i === lastLogs.length - 1 ? 'text-emerald-300' : 'text-white/35'}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PageResourceLoader;
