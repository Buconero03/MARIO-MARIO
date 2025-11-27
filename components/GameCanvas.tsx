import React, { useEffect, useRef } from 'react';
import * as BABYLON from '@babylonjs/core';
import { GameScene } from '../game/GameScene';
import { GameState } from '../types';

interface GameCanvasProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  onScoreUpdate: (score: number) => void;
  onLivesUpdate: (lives: number) => void;
  onTimeUpdate: (time: number) => void;
  onLevelUpdate?: (level: number) => void;
  onRestart: (callback: () => void) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  onGameStateChange, 
  onScoreUpdate,
  onLivesUpdate,
  onTimeUpdate,
  onLevelUpdate,
  onRestart
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<GameScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Engine
    const engine = new BABYLON.Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true
    });
    engineRef.current = engine;

    // Initialize Game Scene Logic
    const gameScene = new GameScene(engine, canvasRef.current, {
        onGameStateChange,
        onScoreUpdate,
        onLivesUpdate,
        onTimeUpdate,
        onLevelUpdate
    });
    sceneRef.current = gameScene;

    // Register restart handler
    onRestart(() => {
        gameScene.restartGame();
    });

    // Render Loop
    engine.runRenderLoop(() => {
        if (sceneRef.current) {
            sceneRef.current.render();
        }
    });

    // Resize Handler
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

  // Sync React State with Game Engine
  useEffect(() => {
    if (sceneRef.current) {
        sceneRef.current.setGameState(gameState);
    }
  }, [gameState]);

return (
  <canvas
    ref={canvasRef}
    className="block bg-sky-400"
    style={{
      width: '100vw',
      height: '100vh',
      display: 'block',
    }}
  />
);
