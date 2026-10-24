import React from 'react';
import { CuBong, type CuBongMood } from './CuBong';

export interface ScholarSpiritBridgeProps {
  mood?: CuBongMood;
  size?: number;
  lookX?: number;
  className?: string;
  badgeText?: string;
  onTap?: () => void;
  interactive?: boolean;
}

export const ScholarSpiritBridge: React.FC<ScholarSpiritBridgeProps> = ({
  mood = 'idle',
  size = 120,
  lookX = 0,
  className = '',
  badgeText,
  onTap,
  interactive = true,
}) => {
  return (
    <div
      className={`scholar-spirit-bridge flex items-center justify-center ${className}`}
      onClick={onTap}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <CuBong
        mood={mood}
        size={size}
        lookX={lookX}
        signText={badgeText}
        decorative={!interactive}
      />
    </div>
  );
};

export default ScholarSpiritBridge;
