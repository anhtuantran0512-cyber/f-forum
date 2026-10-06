/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';

const FLIP_DURATION_MS = 620;

interface FlipDigitProps {
  digit: string;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return true;
  const systemPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const appPreference = document.documentElement.classList.contains('reduce-motion');
  return systemPreference || appPreference;
};

/** One physical split-flap leaf. It only animates when its real value changes. */
const FlipDigit: React.FC<FlipDigitProps> = ({ digit }) => {
  const [displayDigit, setDisplayDigit] = useState(digit);
  const [previousDigit, setPreviousDigit] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (displayDigit === digit) return;

    let finishTimer: number | undefined;
    const startTimer = window.setTimeout(() => {
      if (prefersReducedMotion()) {
        setDisplayDigit(digit);
        setPreviousDigit(digit);
        setIsFlipping(false);
        return;
      }

      setPreviousDigit(displayDigit);
      setIsFlipping(true);
      finishTimer = window.setTimeout(() => {
        setDisplayDigit(digit);
        setPreviousDigit(digit);
        setIsFlipping(false);
      }, FLIP_DURATION_MS);
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
    };
  }, [digit, displayDigit]);

  /* Keep the old face visible until the effect starts the real flap. */
  const topDigit = isFlipping ? digit : displayDigit;
  const bottomDigit = isFlipping ? previousDigit : displayDigit;

  return (
    <span className={`ff-flip-timer__digit${isFlipping ? ' is-flipping' : ''}`} aria-hidden="true">
      <span className="ff-flip-timer__face ff-flip-timer__face--top">
        <span>{topDigit}</span>
      </span>
      <span className="ff-flip-timer__face ff-flip-timer__face--bottom">
        <span>{bottomDigit}</span>
      </span>
      {isFlipping && (
        <>
          <span
            key={`top-${previousDigit}-${digit}`}
            className="ff-flip-timer__leaf ff-flip-timer__leaf--top"
            aria-hidden="true"
          >
            <span>{previousDigit}</span>
          </span>
          <span
            key={`bottom-${previousDigit}-${digit}`}
            className="ff-flip-timer__leaf ff-flip-timer__leaf--bottom"
            aria-hidden="true"
          >
            <span>{digit}</span>
          </span>
        </>
      )}
      <span className="ff-flip-timer__seam" aria-hidden="true" />
    </span>
  );
};

export interface FlipClockDigitsProps {
  /** Seconds from the shared focus session; no independent timer state. */
  seconds: number;
  isBreak?: boolean;
  /** The large Focus HUD face uses the same real split-flap digits as the compact chip. */
  size?: 'compact' | 'hero';
}

/**
 * Split-flap face shared by the floating chip and Focus HUD. The parent supplies
 * seconds from the real shared session, so this component never owns a clock.
 */
export const FlipClockDigits: React.FC<FlipClockDigitsProps> = ({ seconds, isBreak = false, size = 'compact' }) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const remainingSeconds = String(safeSeconds % 60).padStart(2, '0');
  const groups = [hours, minutes, remainingSeconds];

  return (
    <span className={`ff-flip-timer${isBreak ? ' is-break' : ''}${size === 'hero' ? ' ff-flip-timer--hero' : ''}`} aria-hidden="true">
      {groups.map((group, groupIndex) => {
        const digits = group.split('');
        return (
          <React.Fragment key={`group-${groupIndex}`}>
            {groupIndex > 0 && <span className="ff-flip-timer__colon">:</span>}
            <span className="ff-flip-timer__group">
              {digits.map((digit, index) => (
                <FlipDigit
                  key={`${groupIndex}-${digits.length - index - 1}`}
                  digit={digit}
                />
              ))}
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
};

export default FlipClockDigits;
