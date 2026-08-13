import { Maximize2, Minimize2 } from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';

export default function FullscreenButton() {
  const { isFullscreen, isSupported, toggle } = useFullscreen();

  if (!isSupported) return null;

  return (
    <button
      onClick={toggle}
      className="fixed top-3 right-3 z-[90] flex items-center gap-1.5 rounded-md border-2 border-black bg-storm-dark/90 px-2.5 py-1.5 text-xs font-bold text-white shadow-retro transition-transform active:scale-95"
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      <span className="hidden sm:inline">
        {isFullscreen ? 'Exit' : 'Fullscreen'}
      </span>
    </button>
  );
}
