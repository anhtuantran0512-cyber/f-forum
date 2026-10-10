/* Full-viewport, pointer-transparent Galaxy Reveal, active only while the password torch beams. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createGalaxyStars, galaxyDpr, liteGalaxyShadow, nextShootingDelay, type GalaxyStar } from './galaxyField';
import './GalaxySky.css';

const LITE_SHADOW = liteGalaxyShadow();
type Meteor = { x: number; y: number; start: number; duration: number; dx: number; dy: number };

export function GalaxySky({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nebulaRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<GalaxyStar[] | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [lite, setLite] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('potator-mode'));
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' &&
    (document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateModes = () => {
      setLite(document.documentElement.classList.contains('potator-mode'));
      setReduced(document.documentElement.classList.contains('reduce-motion') || media.matches);
    };
    const updateVisibility = () => setVisible(!document.hidden);
    const observer = new MutationObserver(updateModes);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    media.addEventListener('change', updateModes);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', updateModes);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!active || lite || reduced || !visible) return undefined;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return undefined;
    const ctx = context;
    const stars = starsRef.current ?? createGalaxyStars();
    starsRef.current = stars;
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = -1000;
    let nextMeteor = performance.now() + nextShootingDelay();
    let meteor: Meteor | null = null;
    let currentX = 0;
    let currentY = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = galaxyDpr(window.devicePixelRatio);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current.x = Math.max(-1, Math.min(1, event.clientX / Math.max(width, 1) * 2 - 1));
      pointerRef.current.y = Math.max(-1, Math.min(1, event.clientY / Math.max(height, 1) * 2 - 1));
    };
    const draw = (time: number) => {
      frame = window.requestAnimationFrame(draw);
      if (time - lastFrame < 1000 / 30) return; // cap even on 120Hz displays
      lastFrame = time;
      ctx.clearRect(0, 0, width, height);
      currentX += (pointerRef.current.x - currentX) * .09;
      currentY += (pointerRef.current.y - currentY) * .09;
      const nebula = nebulaRef.current;
      if (nebula) {
        nebula.style.setProperty('--sky-x', `${(currentX * 9).toFixed(1)}px`);
        nebula.style.setProperty('--sky-y', `${(currentY * 9).toFixed(1)}px`);
      }
      const seconds = time / 1000;
      for (const star of stars) {
        const glow = (1 + Math.sin(seconds * (2 * Math.PI / star.period) + star.phase)) / 2;
        ctx.globalAlpha = .2 + glow * .8;
        ctx.fillStyle = star.warm ? '#fff4e0' : '#ffffff';
        const x = star.x * width + currentX * star.depth + seconds * star.drift;
        const y = star.y * height + currentY * star.depth + seconds * star.drift * .35;
        const radius = star.radius * (.82 + glow * .28);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (star.sparkle && glow > .65) {
          ctx.globalAlpha = (glow - .65) * .9;
          ctx.strokeStyle = '#fff4e0';
          ctx.lineWidth = .7;
          ctx.beginPath();
          ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y);
          ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5);
          ctx.stroke();
        }
      }
      if (!meteor && time >= nextMeteor) {
        meteor = {
          x: (.07 + Math.random() * .62) * width,
          y: Math.random() * height * .31,
          dx: Math.min(width * .28, 300),
          dy: Math.min(height * .29, 240),
          start: time,
          duration: 600 + Math.random() * 400,
        };
      }
      if (meteor) {
        const progress = (time - meteor.start) / meteor.duration;
        if (progress >= 1) {
          meteor = null;
          nextMeteor = time + nextShootingDelay();
        } else {
          const x = meteor.x + meteor.dx * progress;
          const y = meteor.y + meteor.dy * progress;
          const tailX = x - meteor.dx * .26;
          const tailY = y - meteor.dy * .26;
          const trail = ctx.createLinearGradient(tailX, tailY, x, y);
          trail.addColorStop(0, 'rgba(255,244,224,0)');
          trail.addColorStop(1, 'rgba(255,244,224,1)');
          ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
          ctx.strokeStyle = trail;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = '#fff4e0';
          ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [active, lite, reduced, visible]);

  return <div className={`galaxy-sky ${active ? 'galaxy-sky--active' : ''} ${lite ? 'galaxy-sky--lite' : ''} ${reduced ? 'galaxy-sky--reduced' : ''} ${!visible ? 'galaxy-sky--paused' : ''}`}
    aria-hidden="true" data-active={active}>
    <div className="galaxy-sky__void" />
    <div ref={nebulaRef} className="galaxy-sky__nebula" />
    <canvas ref={canvasRef} className="galaxy-sky__canvas" />
    {lite && !reduced && <span className="galaxy-sky__lite-stars" style={{ '--galaxy-lite-stars': LITE_SHADOW } as CSSProperties} />}
  </div>;
}
