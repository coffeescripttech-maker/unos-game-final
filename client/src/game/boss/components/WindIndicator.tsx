import * as THREE from 'three';

interface WindIndicatorProps {
  /** Angle from boat to eye (radians), used to derive storm push direction */
  windAngle: number;
  windSpeed: number;
  stormIntensity: number;
  isInEye: boolean;
}

/**
 * Wind / storm-push indicator.
 * Rendered as an HTML overlay (no 3D) so it's always crisp and readable.
 * Shows a rotating arrow pointing toward the storm's pull and a wind-strength bar.
 */
export default function WindIndicator({ windAngle, windSpeed, stormIntensity, isInEye }: WindIndicatorProps) {
  if (isInEye || stormIntensity < 0.1) return null;

  // Arrow points FROM storm toward boat (wind pushes boat away from eye)
  // storm is at angle = atan2(boat.x, boat.z - eye.z) + PI
  const arrowDeg = (windAngle * 180) / Math.PI;
  const intensity = Math.round(Math.min(windSpeed, 120));
  const bars = Math.ceil((stormIntensity) * 5);

  return (
    <div className="absolute bottom-4 left-3 retro-card !p-2 !bg-storm-dark/90 border-storm-light/40 flex flex-col gap-1 pointer-events-none font-body text-[10px] text-storm-light shadow-[0_0_10px_rgba(6,214,160,0.12)]">
      <div className="flex items-center gap-1.5">
        <span>💨</span>
        <span className="uppercase tracking-wider text-accent-yellow">Wind</span>
      </div>

      {/* Arrow + direction */}
      <div className="flex items-center justify-center w-10 h-10 mx-auto relative">
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: `rotate(${arrowDeg}deg)` }}>
          {/* Arrow body */}
          <polygon points="18,4 22,16 18,14 14,16" fill="#4ecdc4" opacity="0.9" />
          {/* Arrow shaft */}
          <rect x="16.5" y="14" width="3" height="12" fill="#4ecdc4" opacity="0.7" />
          {/* Tail notch */}
          <polygon points="14,26 18,22 22,26" fill="#4ecdc4" opacity="0.5" />
        </svg>
      </div>

      {/* Intensity bars */}
      <div className="flex gap-0.5 justify-center">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-sm transition-colors duration-200 ${
              i < bars ? 'bg-accent-yellow' : 'bg-storm-mid'
            }`}
            style={{ height: `${6 + i * 2}px` }}
          />
        ))}
      </div>

      <div className="text-center text-white tabular-nums">{intensity} km/h</div>
    </div>
  );
}
