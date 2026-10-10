/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useRef, useState, type FC } from 'react';
import './WelcomeSequence.css';

/** Gõ/xoá chỉ khi hover/focus; aria-label ổn định trên button cha. */
export const AuthTypewriter: FC<{ base: string; expanded: string; active: boolean }> = ({ base, expanded, active }) => {
  const [text, setText] = useState(base);
  const clearedForHover = useRef(false);
  const reduceMotion = typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion'));
  const target = active ? expanded : base;
  useEffect(() => {
    if (!active) clearedForHover.current = false;
    if (reduceMotion) return undefined;
    if (active && !clearedForHover.current) {
      const timer = window.setTimeout(() => { clearedForHover.current = true; setText(''); }, 100);
      return () => window.clearTimeout(timer);
    }
    if (text === target) return undefined;
    const next = target.startsWith(text) ? target.slice(0, text.length + 1) : text.slice(0, -1);
    const timer = window.setTimeout(() => setText(next), target.startsWith(text) ? 38 : 30);
    return () => window.clearTimeout(timer);
  }, [active, target, text, reduceMotion]);
  const visible = reduceMotion ? target : text;
  return <span className="auth-typewriter" aria-hidden="true">
    <span className="auth-typewriter__text">{visible}</span>
    {!reduceMotion && visible !== target && <span className="auth-typewriter__caret">|</span>}
    {active && visible === expanded && <span className="auth-typewriter__arrow">→</span>}
  </span>;
};
