import { useState, useEffect, useCallback } from 'react';

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => void;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => void;
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const supported = !!(
      document.fullscreenEnabled ||
      (doc as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ||
      (doc as Document & { msFullscreenEnabled?: boolean }).msFullscreenEnabled
    );
    setIsSupported(supported);

    const handleChange = () => {
      const doc = document as FullscreenDocument;
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    document.addEventListener('msfullscreenchange', handleChange);
    handleChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
      document.removeEventListener('msfullscreenchange', handleChange);
    };
  }, []);

  const enter = useCallback(async () => {
    const el = document.documentElement as FullscreenElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } catch {
      // Ignore: user gesture may be required or fullscreen not allowed
    }
  }, []);

  const exit = useCallback(async () => {
    const doc = document as FullscreenDocument;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) {
      void exit();
    } else {
      void enter();
    }
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, isSupported, enter, exit, toggle };
}
