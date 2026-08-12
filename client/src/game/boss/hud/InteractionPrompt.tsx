/**
 * Floating "Press E" interaction prompt.
 * Appears when player is near an interactable object.
 */
export default function InteractionPrompt({
  text,
  visible,
}: {
  text: string;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '50%',
      left: '50%',
      transform: 'translate(-50%, 80px)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'rgba(0,0,0,0.6)',
      padding: '8px 18px',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.2)',
      backdropFilter: 'blur(6px)',
      pointerEvents: 'none',
      zIndex: 60,
      animation: 'floatUp 1.5s ease-in-out infinite',
    }}>
      <span style={{
        background: 'rgba(78,205,196,0.3)',
        border: '1px solid #4ecdc4',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4ecdc4',
        fontFamily: "'Courier New', monospace",
      }}>
        E
      </span>
      <span style={{
        fontSize: 13,
        color: '#e0e0e0',
        fontFamily: "'Courier New', monospace",
      }}>
        {text}
      </span>
    </div>
  );
}
