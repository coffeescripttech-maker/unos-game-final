import { useNavigate } from 'react-router-dom';
import BossLevel from '../game/boss/BossLevel';

/**
 * Page wrapper for the 3D Boss Level (R3F).
 */
export default function BossPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/');
  };

  return (
    <div className="absolute inset-0" style={{ background: '#0a1628' }}>
      {/* Full-screen R3F boss level */}
      <BossLevel onComplete={handleComplete} />

      {/* ESC hint */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 60,
          fontSize: 10,
          color: 'rgba(255,255,255,0.2)',
          fontFamily: "'Courier New', monospace",
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        ESC to look around
      </div>
    </div>
  );
}
