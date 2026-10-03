/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';

interface PageResourceLoaderProps {
  onLoaded: () => void;
  minDurationMs?: number;
}

export const PageResourceLoader: React.FC<PageResourceLoaderProps> = ({
  onLoaded,
  minDurationMs = 650,
}) => {
  const [progress, setProgress] = useState(0);
  const [loadedImages, setLoadedImages] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const startTime = Date.now();
    const setProgressAtLeast = (next: number) => {
      if (mounted) setProgress((current) => Math.max(current, Math.min(100, next)));
    };

    const waitForImages = async () => {
      const images = Array.from(document.images);
      const pendingImages = images.filter((image) => !image.complete);
      let finished = images.length - pendingImages.length;
      if (mounted) {
        setTotalImages(images.length);
        setLoadedImages(finished);
      }
      setProgressAtLeast(20);

      if (pendingImages.length === 0) {
        setProgressAtLeast(65);
        return;
      }

      await Promise.all(pendingImages.map((image) => new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          image.removeEventListener('load', finish);
          image.removeEventListener('error', finish);
          finished += 1;
          if (mounted) setLoadedImages(finished);
          setProgressAtLeast(20 + Math.round((finished / images.length) * 45));
          resolve();
        };
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
        /* A failed or stalled third-party image should not hold the screen forever. */
        timers.push(setTimeout(finish, 10000));
      })));
      setProgressAtLeast(65);
    };

    const loadResources = async () => {
      setProgressAtLeast(5);
      if (document.readyState === 'loading') {
        await new Promise<void>((resolve) => {
          document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        });
      }
      setProgressAtLeast(15);

      await waitForImages();

      if ('fonts' in document) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise<void>((resolve) => timers.push(setTimeout(resolve, 8000))),
          ]);
        } catch {
          /* Font failures are settled like other failed resources. */
        }
      }
      setProgressAtLeast(82);

      if (document.readyState !== 'complete') {
        await Promise.race([
          new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true })),
          new Promise<void>((resolve) => timers.push(setTimeout(resolve, 10000))),
        ]);
      }
      setProgressAtLeast(94);

      const remaining = Math.max(0, minDurationMs - (Date.now() - startTime));
      await new Promise<void>((resolve) => timers.push(setTimeout(resolve, remaining)));
      if (!mounted) return;
      setProgress(100);
      setIsReady(true);
      timers.push(setTimeout(() => {
        if (!mounted) return;
        setIsExiting(true);
        timers.push(setTimeout(() => {
          if (mounted) onLoaded();
        }, 300));
      }, 250));
    };

    void loadResources();
    return () => {
      mounted = false;
      timers.forEach(clearTimeout);
    };
  }, [minDurationMs, onLoaded]);

  const handleSkip = () => {
    setIsExiting(true);
    window.setTimeout(onLoaded, 180);
  };

  return (
    <div
      className={`la-08 fixed inset-0 z-[9999] flex items-center justify-center bg-[#0c1218] p-4 transition-opacity duration-300 ${isExiting ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      data-state={isReady ? 'ready' : 'loading'}
      role="status"
      aria-live="polite"
    >
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101820]/95 p-6 text-center shadow-[0_25px_60px_rgba(0,0,0,.6)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/[0.08] text-teal-200">
          <div className={`h-9 w-9 rounded-full border-[3px] border-teal-200/20 border-t-teal-300 ${isReady ? '' : 'animate-spin'}`} aria-hidden="true" />
        </div>
        <h1 className="text-sm font-bold text-white">{isReady ? 'F-Forum đã sẵn sàng' : 'Đang tải tài nguyên'}</h1>
        <p className="mt-1 text-xs text-white/50">Kiểm tra giao diện, hình ảnh và phông chữ</p>

        <div className="mt-6 flex items-center justify-between text-[11px] font-mono text-teal-200">
          <span>{isReady ? 'Hoàn tất' : 'Tiến độ'}</span>
          <span aria-live="polite">{progress}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Tiến độ tải tài nguyên"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-300 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 min-h-4 text-[10px] text-white/40">
          {totalImages > 0 ? `${loadedImages}/${totalImages} hình ảnh đã sẵn sàng` : 'Đang kiểm tra phông chữ và giao diện'}
        </p>

        {!isReady && (
          <button type="button" onClick={handleSkip} className="mt-5 rounded-full border border-white/10 px-4 py-2 text-xs text-white/55 transition hover:border-white/20 hover:text-white">
            Bỏ qua
          </button>
        )}
        {isReady && <p className="mt-4 text-[11px] text-emerald-200">Tài nguyên đã tải xong.</p>}
      </section>
    </div>
  );
};

export default PageResourceLoader;
