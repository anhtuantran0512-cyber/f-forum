/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Navbar } from '../Navbar';
import { HomeView } from '../views/HomeView';
import type { DimensionView, User } from '../../types';

interface LandingHomePreviewProps {
  currentUser: User | null;
  onNavigate: (view: DimensionView) => void;
  onOpenLogin: () => void;
}

interface PreviewViewport {
  width: number;
  height: number;
  scale: number;
}

const noop = () => {};

/**
 * A scaled, non-interactive window containing the actual app Navbar and HomeView.
 * Its inner viewport keeps the browser's real responsive breakpoints, so this
 * is the same home screen at the current device size, not a hand-drawn mockup.
 */
export const LandingHomePreview: React.FC<LandingHomePreviewProps> = ({ currentUser, onNavigate, onOpenLogin }) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<PreviewViewport>(() => ({
    width: typeof window === 'undefined' ? 1440 : Math.max(1, window.innerWidth),
    height: typeof window === 'undefined' ? 900 : Math.max(1, window.innerHeight),
    scale: 1,
  }));

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const measure = () => {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const scale = Math.min(1, stage.clientWidth / width);
      setViewport((previous) =>
        previous.width === width && previous.height === height && Math.abs(previous.scale - scale) < 0.002
          ? previous
          : { width, height, scale },
      );
    };

    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(stage);
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <figure className="ff-home-demo" aria-label="Bản xem trước giao diện trang chủ F-Forum">
      <div className="ff-home-demo__shell">
        <div className="ff-home-demo__window">
          <div className="ff-home-demo__chrome" aria-hidden="true">
            <div className="ff-home-demo__dots">
              <span />
              <span />
              <span />
            </div>
            <span className="ff-home-demo__address">F-Forum <span aria-hidden="true">/</span> Trang chủ</span>
            <span className="ff-home-demo__badge">
              <span aria-hidden="true" /> Học · Hỏi · Chia sẻ
            </span>
          </div>

          <div
            ref={stageRef}
            className="ff-home-demo__stage"
            style={{ height: `${viewport.height * viewport.scale}px` }}
          >
            <div
              className="ff-home-demo__screen ff-view-home"
              aria-hidden="true"
              inert
              style={{
                width: `${viewport.width}px`,
                height: `${viewport.height}px`,
                transform: `scale(${viewport.scale})`,
              }}
            >
              <Navbar
                currentView="home"
                onViewChange={onNavigate}
                currentUser={currentUser}
                onOpenLoginModal={onOpenLogin}
                onLogout={noop}
                isChatOpen={false}
                onToggleChat={noop}
                unreadChatCount={0}
                onOpenProfile={noop}
                onOpenFocusMode={noop}
              />
              <div className="content-layer relative z-[1] h-full w-full">
                <HomeView onNavigate={onNavigate} onOpenLanding={() => onNavigate('landing')} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="ff-home-demo__caption">
        Bản xem trước dùng trực tiếp không gian học tập F-Forum — nơi nhịp Học · Hỏi · Chia sẻ bắt đầu ngay từ bàn học chính.
      </figcaption>
    </figure>
  );
};

export default LandingHomePreview;
