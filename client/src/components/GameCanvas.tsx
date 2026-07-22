import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { useGameContext } from '../contexts/GameContext';
import { GAME_WIDTH, GAME_HEIGHT, SCENES } from '@shared/constants';

// Scenes
import { BootScene } from '../game/scenes/BootScene';
import { PreloadScene } from '../game/scenes/PreloadScene';
import { MainMenuScene } from '../game/scenes/MainMenuScene';
import { WorldMapScene } from '../game/scenes/WorldMapScene';
import { TutorialScene } from '../game/scenes/TutorialScene';
import { EvaporationScene } from '../game/scenes/EvaporationScene';
import { CondensationScene } from '../game/scenes/CondensationScene';
import { PressureScene } from '../game/scenes/PressureScene';
import { RotationScene } from '../game/scenes/RotationScene';
import { TyphoonScene } from '../game/scenes/TyphoonScene';
import { BossScene } from '../game/scenes/BossScene';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameInstRef = useRef<Phaser.Game | null>(null);
  const { setGame } = useGameContext();

  useEffect(() => {
    if (gameInstRef.current || !containerRef.current) return;
    ////
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: containerRef.current,
      backgroundColor: '#0A2472',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [
        BootScene,
        PreloadScene,
        MainMenuScene,
        WorldMapScene,
        TutorialScene,
        EvaporationScene,
        CondensationScene,
        PressureScene,
        RotationScene,
        TyphoonScene,
        BossScene
      ],
      render: {
        pixelArt: false,
        antialias: true
      }
    };

    const game = new Phaser.Game(config);
    gameInstRef.current = game;
    setGame(game);

    return () => {
      game.destroy(true);
      gameInstRef.current = null;
      setGame(null);
    };
  }, [setGame]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
      id="game-container"
    />
  );
}
