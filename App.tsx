import React, { useState, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState } from './types';
import { Trophy, Skull, Play, Timer, Coins, Flag, Heart } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  
  // Ref to the game engine to reset it
  const restartGameRef = useRef<() => void>(() => {});

  const handleGameStateChange = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  const handleScoreUpdate = useCallback((newCoins: number) => {
    setScore(newCoins);
  }, []);

  const handleLivesUpdate = useCallback((count: number) => {
    setLives(count);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setTimeLeft(Math.round(time));
  }, []);
  
  const handleLevelUpdate = useCallback((level: number) => {
    setCurrentLevel(level);
  }, []);

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    setLives(3);
    setCurrentLevel(1);
    restartGameRef.current();
  };

  return (
      <div className="relative w-screen h-screen font-sans select-none text-white overflow-hidden">

      {/* Game Viewport */}
      <div className="absolute inset-0 z-0 bg-sky-400">
        <GameCanvas 
          gameState={gameState} 
          onGameStateChange={handleGameStateChange}
          onScoreUpdate={handleScoreUpdate}
          onLivesUpdate={handleLivesUpdate}
          onTimeUpdate={handleTimeUpdate}
          onLevelUpdate={handleLevelUpdate}
          onRestart={(fn) => { restartGameRef.current = fn; }}
        />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* HUD - Only visible when playing */}
        {gameState === GameState.PLAYING && (
          <div className="p-6 flex justify-between items-start w-full max-w-6xl mx-auto">
            <div className="flex gap-4">
              {/* LIVES */}
              <div className="bg-red-600/80 backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center gap-3 border-2 border-red-400/50 shadow-lg">
                <Heart size={28} fill="currentColor" className="animate-pulse" />
                <span className="text-3xl font-black tracking-tighter">{lives}</span>
              </div>

              {/* COINS */}
              <div className="bg-black/60 backdrop-blur-md text-yellow-400 px-5 py-3 rounded-2xl flex items-center gap-3 border-2 border-yellow-400/30 shadow-lg">
                <Coins size={28} className="drop-shadow-glow" />
                <span className="text-3xl font-black tracking-tighter">{score}</span>
              </div>

              {/* TIME */}
              <div className="bg-black/60 backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center gap-3 border-2 border-white/20 shadow-lg">
                <Timer size={28} />
                <span className={`text-3xl font-black tracking-tighter ${timeLeft < 50 ? 'text-red-500 animate-pulse' : ''}`}>
                  {timeLeft}
                </span>
              </div>
            </div>
            
            {/* LEVEL info */}
            <div className="bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-2xl border-2 border-white/20 shadow-lg flex items-center gap-3">
               <Flag size={24} className="text-green-400" />
               <span className="text-xl font-black tracking-wider">WORLD 1-{currentLevel}</span>
            </div>
          </div>
        )}

        {/* Main Menu */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
            <div className="text-center bg-white p-10 rounded-[2rem] shadow-2xl max-w-lg w-full border-8 border-blue-500 transform transition-all">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-700 mb-2 drop-shadow-sm leading-tight">
                SUPER<br/>BABYLON
              </h1>
              <div className="text-2xl font-bold text-blue-600 mb-8 tracking-widest">ODYSSEY</div>
              
              <div className="bg-gray-100 p-6 rounded-xl mb-8 text-left space-y-2 border-2 border-gray-200">
                <p className="text-gray-600 font-bold flex items-center gap-2"><span className="bg-gray-800 text-white px-2 rounded">WASD</span> or <span className="bg-gray-800 text-white px-2 rounded">Arrows</span> to Move</p>
                <p className="text-gray-600 font-bold flex items-center gap-2"><span className="bg-red-500 text-white px-3 rounded">SPACE</span> to Jump (Hold for higher)</p>
              </div>

              <button 
                onClick={startGame}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-3xl font-black py-5 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-[0_6px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1.5"
              >
                <Play fill="currentColor" size={32} /> START GAME
              </button>
            </div>
          </div>
        )}

        {/* Game Over */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto">
             <div className="text-center bg-gray-900 p-10 rounded-3xl shadow-2xl max-w-md w-full border-4 border-red-600 text-white animate-bounce-short">
              <Skull className="w-24 h-24 mx-auto text-red-500 mb-6" />
              <h2 className="text-6xl font-black text-red-500 mb-2 tracking-tight">DIED</h2>
              <p className="text-gray-400 mb-8 text-xl font-medium">Lives Remaining: 0</p>
              <button 
                onClick={startGame}
                className="w-full bg-white text-black hover:bg-gray-200 text-2xl font-bold py-4 px-8 rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-[0_4px_0_rgb(156,163,175)] active:shadow-none active:translate-y-1"
              >
                TRY AGAIN
              </button>
            </div>
          </div>
        )}

        {/* Victory */}
        {gameState === GameState.VICTORY && (
          <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/90 backdrop-blur-md pointer-events-auto">
             <div className="text-center bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full border-8 border-yellow-300">
              <Trophy className="w-24 h-24 mx-auto text-yellow-500 mb-4 drop-shadow-lg" />
              <h2 className="text-5xl font-black text-yellow-500 mb-2">YOU WIN!</h2>
              <p className="text-gray-400 font-bold tracking-widest uppercase mb-6">All 10 Levels Cleared</p>
              <div className="my-8 space-y-3 bg-yellow-50 p-6 rounded-xl border border-yellow-100">
                <div className="text-xl font-bold text-gray-800 flex justify-between">
                  <span>Coins Collected:</span>
                  <span>{score}</span>
                </div>
                <div className="text-xl font-bold text-gray-800 flex justify-between">
                  <span>Lives Bonus:</span>
                  <span>{lives * 200}</span>
                </div>
                <div className="text-xl font-bold text-gray-800 flex justify-between">
                  <span>Time Bonus:</span>
                  <span>{timeLeft * 50}</span>
                </div>
                <div className="h-px bg-yellow-200 my-2"></div>
                <div className="text-4xl font-black text-green-600 pt-1 flex justify-between">
                  <span>Total:</span>
                  <span>{score * 100 + timeLeft * 50 + lives * 200}</span>
                </div>
              </div>
              <button 
                onClick={startGame}
                className="w-full bg-green-500 hover:bg-green-600 text-white text-2xl font-bold py-5 px-8 rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-[0_6px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1.5"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
