import { useState } from 'react';
import { usePhaserEvent } from '../../hooks/usePhaserEvent';
import { useGameContext } from '../../contexts/GameContext';
import { GAME_EVENTS } from '@shared/events';
import { LEVEL_CONFIGS, LEVEL_ORDER } from '@shared/constants';
import type { HUDLevelInfoPayload } from '@shared/events';
import type { LevelId, LevelProgress } from '@shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardImage,
  CardTitle
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LevelCardDef {
  id: LevelId;
  stage: string;
  title: string;
  description: string;
  theme: string;
  emoji: string;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  unlockHint: string;
}

const CARD_META: Record<
  LevelId,
  {
    stage: string;
    description: string;
    theme: string;
    emoji: string;
    bgImage?: string;
  }
> = {
  tutorial: {
    stage: 'Tutorial',
    description:
      'Learn the basics of navigation and interaction at the research base.',
    theme: 'Research Base',
    emoji: '🔬',
    bgImage: '/images/Tutorial BG.png'
  },
  evaporation: {
    stage: 'Level 1',
    description:
      'Raise ocean temperature to trigger evaporation and fuel the storm.',
    theme: 'Evaporation',
    emoji: '🌊',
    bgImage: '/images/Stage 1 — Evaporation BG.png'
  },
  condensation: {
    stage: 'Level 2',
    description: 'Guide vapor particles into cloud formations high above.',
    theme: 'Condensation',
    emoji: '☁️',
    bgImage: '/images/Stage 2 — Condensation BG.png'
  },
  pressure: {
    stage: 'Level 3',
    description:
      'Place low and high pressure systems to create powerful winds.',
    theme: 'Air Pressure',
    emoji: '🌬️',
    bgImage: '/images/Stage 3 — Pressure BG.png'
  },
  rotation: {
    stage: 'Level 4',
    description: 'Apply the Coriolis effect to create cyclonic rotation.',
    theme: 'Coriolis Effect',
    emoji: '🌀',
    bgImage: '/images/Stage 4 — Rotation BG.png'
  },
  typhoon: {
    stage: 'Level 5',
    description: 'Combine all elements to form a complete typhoon.',
    theme: 'Typhoon Formation',
    emoji: '⚡',
    bgImage: '/images/Stage 5 — Typhoon BG.png'
  },
  boss: {
    stage: 'Final Mission',
    description:
      'Survive the typhoon in your research vessel through the storm.',
    theme: 'Survival',
    emoji: '🏆',
    bgImage: '/images/Stage 6 — Boss BG.png'
  }
};

/** Image source for a card: uses local bgImage if set, otherwise falls back to placeholder */
function cardImageSrc(
  meta: (typeof CARD_META)[LevelId],
  title: string
): string {
  return (
    meta.bgImage ??
    `https://avatar.vercel.sh/${title}?text=${encodeURIComponent(title)}&size=320&bg=1a1a3e&color=ffd166`
  );
}

export default function LevelSelectCards() {
  const { game, progress } = useGameContext();
  const [visible, setVisible] = useState(false);

  usePhaserEvent(GAME_EVENTS.HUD_LEVEL_INFO, (payload: HUDLevelInfoPayload) => {
    setVisible(payload.name === 'World Map');
  });

  usePhaserEvent(GAME_EVENTS.NAVIGATE_HOME, () => setVisible(false));

  if (!visible) return null;

  const cards: LevelCardDef[] = LEVEL_ORDER.map(id => {
    const config = LEVEL_CONFIGS[id];
    const meta = CARD_META[id];
    const lp: LevelProgress | undefined = progress[id];
    const isUnlocked =
      !config.unlockRequirement ||
      !!progress[config.unlockRequirement]?.completed;
    const unlockHint = config.unlockRequirement
      ? `Complete "${LEVEL_CONFIGS[config.unlockRequirement]?.name ?? config.unlockRequirement}" first`
      : '';
    return {
      id,
      stage: meta?.stage ?? id,
      title: config.name,
      description: meta?.description ?? config.description,
      theme: meta?.theme ?? '',
      emoji: meta?.emoji ?? '📋',
      unlocked: isUnlocked,
      completed: lp?.completed ?? false,
      stars: lp?.stars ?? 0,
      unlockHint
    };
  });

  const handleSelect = (id: LevelId) => {
    if (!game) return;
    setVisible(false);
    game.events.emit(GAME_EVENTS.NAVIGATE_LEVEL, id);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto py-20 px-4 pointer-events-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-5xl w-full pointer-events-auto">
        {cards.map(card => {
          const locked = !card.unlocked;
          return (
            <Card
              key={card.id}
              className={cn(
                'flex flex-col overflow-hidden transition-all duration-150',
                locked
                  ? 'border-storm-light/20'
                  : card.completed
                    ? 'border-accent-green/60 hover:shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:-translate-y-1'
                    : 'hover:shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:-translate-y-1'
              )}>
              <div className="relative">
                <CardImage
                  src={cardImageSrc(CARD_META[card.id], card.title)}
                  alt={card.title}
                  overlay={!locked}
                  className={locked ? 'brightness-75 grayscale' : ''}
                />
                <div className="absolute top-3 left-3 z-40">
                  <Badge
                    variant={
                      locked ? 'locked' : card.completed ? 'success' : 'default'
                    }>
                    {locked
                      ? '🔒 Locked'
                      : card.completed
                        ? `★ ${card.stars}/3`
                        : card.stage}
                  </Badge>
                </div>
              </div>

              <CardHeader>
                <CardAction>
                  <span className="text-xl">{card.emoji}</span>
                  <span
                    className={cn(
                      'font-body text-[10px] uppercase tracking-widest',
                      locked ? 'text-white/30' : 'text-accent-yellow/70'
                    )}>
                    {card.theme}
                  </span>
                </CardAction>
                <CardTitle className={locked ? 'text-white/40' : ''}>
                  {card.title}
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>

              <CardFooter className="mt-auto">
                {locked ? (
                  <Button variant="locked" size="full" disabled>
                    🔒 {card.unlockHint || 'Locked'}
                  </Button>
                ) : card.completed ? (
                  <Button
                    variant="success"
                    size="full"
                    onClick={() => handleSelect(card.id)}>
                    ★ Replay
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="full"
                    onClick={() => handleSelect(card.id)}>
                    ▶ Start
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
