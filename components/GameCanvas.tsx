// components/GameCanvas.tsx
import React, { useEffect, useRef } from "react";
import * as BABYLON from "@babylonjs/core";
import { GameState } from "../types";

interface GameCanvasProps {
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  onScoreUpdate: (coins: number) => void;
  onLivesUpdate: (lives: number) => void;
  onTimeUpdate: (time: number) => void;
  onLevelUpdate: (level: number) => void;
  onRestart: (fn: () => void) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  onGameStateChange,
  onScoreUpdate,
  onLivesUpdate,
  onTimeUpdate,
  onLevelUpdate,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);

  // stato “di gioco” interno
  const coinsRef = useRef(0);
  const livesRef = useRef(3);
  const timeRef = useRef(300);
  const playerRef = useRef<BABYLON.Mesh | null>(null);
  const groundedRef = useRef(false);
  const velocityYRef = useRef(0);
  const inputRef = useRef<Record<string, boolean>>({});

  // crea scena una sola volta
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BABYLON.Engine(canvasRef.current, true);
    engineRef.current = engine;

    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;

    scene.gravity = new BABYLON.Vector3(0, -30, 0);
    scene.collisionsEnabled = true;

    const camera = new BABYLON.FollowCamera(
      "cam",
      new BABYLON.Vector3(0, 5, -10),
      scene
    );
    camera.radius = 15;
    camera.heightOffset = 5;
    camera.rotationOffset = 0;
    camera.attachControl(canvasRef.current, true);

    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    light.intensity = 0.9;

    // terreno
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 200, height: 40 },
      scene
    );
    ground.position.y = 0;
    ground.checkCollisions = true;

    // qualche piattaforma
    const plat1 = BABYLON.MeshBuilder.CreateBox(
      "plat1",
      { width: 10, depth: 4, height: 1 },
      scene
    );
    plat1.position.set(10, 4, 0);
    plat1.checkCollisions = true;

    const plat2 = BABYLON.MeshBuilder.CreateBox(
      "plat2",
      { width: 10, depth: 4, height: 1 },
      scene
    );
    plat2.position.set(25, 8, 0);
    plat2.checkCollisions = true;

    // player
    const player = BABYLON.MeshBuilder.CreateBox(
      "player",
      { size: 1.2 },
      scene
    );
    player.position.set(0, 3, 0);
    playerRef.current = player;

    player.checkCollisions = true;
    camera.lockedTarget = player;

    // “monete”
    const coinMat = new BABYLON.StandardMaterial("coinMat", scene);
    coinMat.emissiveColor = new BABYLON.Color3(1, 0.85, 0);

    const coins: BABYLON.Mesh[] = [];
    const coinPositions = [
      new BABYLON.Vector3(10, 6, 0),
      new BABYLON.Vector3(25, 10, 0),
      new BABYLON.Vector3(5, 3, 0),
    ];
    coinPositions.forEach((pos, i) => {
      const c = BABYLON.MeshBuilder.CreateCylinder(
        "coin" + i,
        { diameter: 0.8, height: 0.2 },
        scene
      );
      c.position = pos;
      c.rotation.z = Math.PI / 2;
      c.material = coinMat;
      coins.push(c);
    });

    // input tastiera
    scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.key.toLowerCase();
      if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
        inputRef.current[key] = true;
      } else {
        inputRef.current[key] = false;
      }
    });

    // funzione di restart per il menu
    onRestart(() => {
      coinsRef.current = 0;
      livesRef.current = 3;
      timeRef.current = 300;
      velocityYRef.current = 0;
      if (playerRef.current) {
        playerRef.current.position.set(0, 3, 0);
      }
      coins.forEach((c) => (c.isVisible = true));
      onScoreUpdate(0);
      onLivesUpdate(3);
      onTimeUpdate(300);
      onLevelUpdate(1);
    });

    // loop di gioco
    let lastTime = performance.now();

    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // aggiorna timer solo in PLAYING
      if (gameState === GameState.PLAYING) {
        timeRef.current -= dt;
        if (timeRef.current < 0) timeRef.current = 0;
        onTimeUpdate(timeRef.current);

        if (timeRef.current <= 0) {
          onGameStateChange(GameState.GAME_OVER);
        }
      }

      const playerMesh = playerRef.current;
      if (playerMesh && gameState === GameState.PLAYING) {
        const moveSpeed = 8;
        const input = inputRef.current;

        let moveX = 0;
        if (input["a"] || input["arrowleft"]) moveX -= 1;
        if (input["d"] || input["arrowright"]) moveX += 1;

        playerMesh.position.x += moveX * moveSpeed * dt;

        // gravità / salto
        velocityYRef.current += scene.gravity.y * dt;
        playerMesh.position.y += velocityYRef.current * dt;

        // collisione terra molto semplice
        if (playerMesh.position.y < 1) {
          playerMesh.position.y = 1;
          velocityYRef.current = 0;
          groundedRef.current = true;
        }

        // salto
        if ((input[" "] || input["space"]) && groundedRef.current) {
          groundedRef.current = false;
          velocityYRef.current = 12;
        }

        // raccolta monete
        coins.forEach((coin) => {
          if (!coin.isVisible) return;
          const dist = BABYLON.Vector3.Distance(
            playerMesh.position,
            coin.position
          );
          if (dist < 1.2) {
            coin.isVisible = false;
            coinsRef.current += 1;
            onScoreUpdate(coinsRef.current);
          }
        });

        // caduta nel vuoto = perdi una vita
        if (playerMesh.position.y < -10) {
          livesRef.current -= 1;
          onLivesUpdate(livesRef.current);
          playerMesh.position.set(0, 3, 0);
          velocityYRef.current = 0;
          groundedRef.current = false;

          if (livesRef.current <= 0) {
            onGameStateChange(GameState.GAME_OVER);
          }
        }

        // livello “completato” se vai oltre x>30
        if (playerMesh.position.x > 30) {
          onLevelUpdate(2);
          onGameStateChange(GameState.VICTORY);
        }
      }

      scene.render();
    });

    const resize = () => engine.resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, [onGameStateChange, onLevelUpdate, onLivesUpdate, onRestart, onScoreUpdate, onTimeUpdate, gameState]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100vw", height: "100vh", display: "block" }}
    />
  );
};
