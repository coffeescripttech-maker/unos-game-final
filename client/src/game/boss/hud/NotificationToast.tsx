import { useEffect, useState } from 'react';
import type { NotificationData } from '../types';

interface NotificationToastProps {
  notification: NotificationData | null;
}

/**
 * Compact animated toast for collection events and mission updates.
 * Keyed strictly on the `notification` prop: whenever a new toast arrives
 * the timer restarts and hides it after ~2.5s. Keeping the effect free of
 * other state (and without sticky refs) makes it SafeMode/StrictMode-proof —
 * the double-invoked cleanup can never eat the hide timer.
 */
export default function NotificationToast({ notification }: NotificationToastProps) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<NotificationData | null>(null);

  useEffect(() => {
    if (!notification) return;
    setCurrent(notification);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [notification]);

  if (!visible || !current) return null;

  return (
    <div
      className="absolute top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-ocean-deep/95 border-2 border-black shadow-retro px-3 py-1 pointer-events-none max-w-[90%] animate-fade-in-up"
      style={{ borderColor: `${current.color}55` }}
    >
      <span className="text-sm leading-none">{current.icon}</span>
      <span className="font-body text-xs text-white font-semibold truncate">
        {current.message}
      </span>
    </div>
  );
}