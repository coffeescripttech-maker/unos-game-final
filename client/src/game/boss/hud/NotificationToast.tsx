import { useEffect, useState } from 'react';
import type { NotificationData } from '../types';

interface NotificationToastProps {
  notification: NotificationData | null;
}

/**
 * Animated toast notification for collection events and mission updates.
 * Uses the game's retro card style.
 */
export default function NotificationToast({ notification }: NotificationToastProps) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<NotificationData | null>(null);

  useEffect(() => {
    if (!notification) return;
    if (!current || notification.id !== current.id || notification.timestamp !== current.timestamp) {
      setCurrent(notification);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, current]);

  if (!visible || !current) return null;

  return (
    <div
      className="absolute top-20 right-3 z-50 flex items-center gap-3 bg-ocean-deep/95 border-3 border-black shadow-retro px-4 py-2 pointer-events-none max-w-[320px] animate-fade-in-up"
      style={{ borderColor: `${current.color}44` }}
    >
      <span className="text-2xl">{current.icon}</span>
      <div className="font-body text-sm text-white font-semibold">
        {current.message}
      </div>
    </div>
  );
}
