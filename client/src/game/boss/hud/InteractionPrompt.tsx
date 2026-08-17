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
    <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-20 z-50 flex items-center gap-2 bg-ocean-deep/90 border-3 border-black shadow-retro px-4 py-2 pointer-events-none animate-float">
      <span className="bg-accent-yellow/20 border border-accent-yellow text-accent-yellow rounded px-2 py-0.5 font-body text-xs font-bold">
        E
      </span>
      <span className="font-body text-sm text-white">
        {text}
      </span>
    </div>
  );
}
