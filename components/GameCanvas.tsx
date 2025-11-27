import React, { useEffect, useRef } from 'react';
import * as BABYLON from '@babylonjs/core';
import { GameScene } from '../game/GameScene';
import { GameState } from '../types';

interface GameCanvasProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  onScoreUpdate: (score: number) => void;
  onTimeUpdate: (time: number) => void;
  onLevelUpdate?: (level: number) => void;
  onRestart: (callback: () => void) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  onGameStateChange,
  onScoreUpdate,
  onTimeUpdate,
  onLevelUpdate,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<GameScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BABYLON.Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    engineRef.current = engine;

    const gameScene = new GameScene(engine, canvasRef.current, {
      onGameStateChange,
      onScoreUpdate,
      onTimeUpdate,
      onLevelUpdate,
    });
    sceneRef.current = gameScene;

    // handler che React userà per il restart
    onRestart(() => {
      gameScene.restartGame();
    });

    engine.runRenderLoop(() => {
      if (sceneRef.current) {
        sceneRef.current.render();
      }
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gameScene.dispose();
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sincronizza stato React ↔ motore di gioco
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setGameState(gameState);
    }
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-screen h-screen outline-none"
    />
  );
};

export default GameCanvas;
