import { useEffect, useState } from 'react';
import type { NotificationData } from '../types';

interface NotificationToastProps {
  notification: NotificationData | null;
}

/**
 * Animated toast notification for collection events and mission updates.
 * Fades in, auto-dismisses after 3 seconds.
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
    <div style={{
      position: 'absolute',
      top: 80,
      right: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: `rgba(0,0,0,0.7)`,
      padding: '10px 18px',
      borderRadius: 10,
      border: `1px solid ${current.color}44`,
      backdropFilter: 'blur(8px)',
      pointerEvents: 'none',
      zIndex: 60,
      animation: 'slideInRight 0.3s ease-out',
      maxWidth: 320,
    }}>
      <span style={{ fontSize: 22 }}>{current.icon}</span>
      <div>
        <div style={{
          fontSize: 13,
          color: '#e0e0e0',
          fontFamily: "'Courier New', monospace",
          fontWeight: 600,
        }}>
          {current.message}
        </div>
      </div>
    </div>
  );
}
