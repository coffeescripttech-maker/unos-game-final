import { useNavigate } from 'react-router-dom';
import BossLevel from '../game/boss/BossLevel';

/**
 * Page wrapper for the 2D-styled R3F boss level.
 */
export default function BossPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/');
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="absolute inset-0 bg-[#060a1a]">
      <BossLevel onComplete={handleComplete} onExit={handleExit} />
    </div>
  );
}
