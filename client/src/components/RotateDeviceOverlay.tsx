import { useEffect, useState } from 'react';

function isPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  const angle = (screen.orientation?.angle ?? window.orientation ?? 0) as number;
  // 0 or 180 degrees => portrait; 90 or -90 => landscape
  return angle === 0 || angle === 180;
}

export default function RotateDeviceOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      const portrait = isPortrait();
      // Only prompt on narrow/touch-sized viewports; desktop portrait is fine.
      const mobileSized = window.innerWidth < 1024 && Math.min(window.innerWidth, window.innerHeight) < 600;
      setShow(portrait && mobileSized);
    };

    check();
    window.addEventListener('resize', check);
    screen.orientation?.addEventListener?.('change', check);

    return () => {
      window.removeEventListener('resize', check);
      screen.orientation?.removeEventListener?.('change', check);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-storm-dark text-white px-6 text-center">
      <div className="text-6xl mb-4 animate-bounce">📱↔️🖥️</div>
      <h2 className="text-2xl font-display mb-2">Rotate your device</h2>
      <p className="text-base font-body text-ocean-light max-w-xs">
        UNOS plays best in landscape mode for the full storm experience.
      </p>
    </div>
  );
}
