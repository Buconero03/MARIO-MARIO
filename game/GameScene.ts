
import * as BABYLON from '@babylonjs/core';
import { GameState } from '../types';

interface GameCallbacks {
  onGameStateChange: (state: GameState) => void;
  onScoreUpdate: (score: number) => void;
  onLivesUpdate: (lives: number) => void;
  onTimeUpdate: (time: number) => void;
  onLevelUpdate?: (level: number) => void;
}

interface EnemyMetadata {
  type: 'enemy';
  subtype: 'normal' | 'spiky' | 'ghoul' | 'fish' | 'koopa';
  dead: boolean;
  direction: number;
  speed: number;
  initialPos: BABYLON.Vector3;
  animTime: number; 
}

interface BlockMetadata {
    type: 'question' | 'brick' | 'ground' | 'lava';
    content: 'coin' | 'flower';
    active: boolean;
    originalY: number;
}

interface Fireball {
    mesh: BABYLON.Mesh;
    velocity: BABYLON.Vector3;
    active: boolean;
}

const LEVEL_MAPS = [
    // LEVEL 1 - PLAIN & SIMPLE
    [
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".............................................................................................................................................................................................................C..C.............................................F........",
        ".....................................................................................?......................................................................?......S......?................................###..###...........................................###........",
        "...........................................?......?.................................###...................................................................#####..#####..#####......................T.........###..###.........T...................K...........#####........",
        "..............?.................?.........###....###.......................T.......#####......T.......................?......T...........T.................#####..#####..#####.......T.............###........###..###........###.........T.......###..........#######.......",
        ".............###...............###.......#####..#####.....................###.....#######....###.....................###....###.........###................#####..#####..#####......###...........#####.......###..###.......#####.......###......#####.........#######.......",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        "#######################################################################################################################################################################################################################################################################"
    ],
    // LEVEL 2 - UNDERGROUND CASTLE
    [
        "############################################################################################################################################################################################################################################################################################################",
        "############################################################################################################################################################################################################################################################################################################",
        "................................................................................................................................................................................................................................................................................................############",
        "................................................................................................................................................................................................................................................................................................############",
        "................................................................................................................................................................................................................................................................................................############",
        "..........................?.................................................................................................................................................................................................................................................................................",
        ".........................###................................................S...................................................................................................S...........................................................................................................................",
        "...........................................................................###.................................................................................................###..........................................................................................................................",
        "..........................................?......?........................#####...............................................................................................#####.........................................................................................................................",
        "...........S.............................###....###......................#######..................................###.........###...................###......................#######.............................................................................................................F..........",
        "..........###...........S...............................................#########...........###.............................................................................#########..........................................................................................................###..........",
        ".......................###....................................................................................................................................................................................................................................................................#####.........",
        "####...#########...#########...#L#...#######...################...#########...#########...#########...#########...#########...#########...####L#L#L####...#########...#####...#####...#####...#########...#########...#########...###L#L#L###...#########...#########...#########...#########...#########...#######........."
    ],
    // LEVEL 3 - THE HAUNTED PEAKS
    [
        ".......................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................",
        ".......................................................................................C.C.C...........................................................................................................................................",
        ".......................................................................................#####...........................................................................................................................................",
        "...........................................G...........?..............................#######.................................................................................................................................F........",
        "........................G...............#######.......###................G...........#########..........G.......................G.......................G.......................G.............................................#........",
        "P......................###.............#########.....#####..............###.........###########........###.....................###.....................###.....................###.....................###....................#........",
        "#####....###..........#####.....###...###########...#######....###.....#####.......#############......#####......###..........#####......###..........#####......###..........#####......###..........#####......###..........#........"
    ],
    // LEVEL 4 - THE DEEP BLUE (Underwater)
    [
        "#######################################################################################################################################################################################################################################################################",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        "......................................F...........................F.........................F..........................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................F..........................F...........................F....................................................F................................F..................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        "P..............................###...........................................................................###..............................................................................................................................................F........",
        "####..........................#####.......................###...............................................#####.......................###............................................................................................................................",
        ".........................................................#####...................F.....................................................#####...................F.......................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        "#######################################################################################################################################################################################################################################################################"
    ],
    // LEVEL 5 - KOOPA CAVE
    [
        "#######################################################################################################################################################################################################################################################################",
        "#######################################################################################################################################################################################################################################################################",
        "#######################################################################################################################################################################################################################################################################",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        ".......................................................................................................................................................................................................................................................................",
        "..........................K............................................................................................................................................................................................................................................",
        ".........................###................................................K...................................................................................................K.............................................................................F........",
        "...........................................................................###.................................................................................................###............................................................................###........",
        "..........................................?......?........................#####...............................................................................................#####..........................................................................#####.......",
        "P..........K.............................###....###......................#######..................................###.........###...................###......................#######........................................................................#######.......",
        "###.......###...........K...............................................#########...........###.............................................................................#########......................................................................................",
        ".......................###.............................................................................................................................................................................................................................................",
        "#####...#########...#########...#L#L#.......#######...################...#########...#########...#########...#########...#########...#########...####LL#L#LL####...#########...#####...#####...#####...#########...#########...#########...###L#L#L###...#########...#########"
    ]
];

export class GameScene {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;
  private player: BABYLON.Mesh;
  private camera: BABYLON.FollowCamera;
  private callbacks: GameCallbacks;

  // Game State
  private velocity: BABYLON.Vector3 = BABYLON.Vector3.Zero();
  private isGrounded: boolean = false;
  private canJump: boolean = false;
  private jumpTimer: number = 0;
  private lives: number = 10; 
  private score: number = 0;
  private levelTime: number = 300;
  private currentLevelIdx: number = 0;
  private isGameOver: boolean = false;
  private checkPointX: number = 2;
  private lastSolidX: number = 2;

  // Inputs
  private inputMap: { [key: string]: boolean } = {};

  // Level Elements
  private blocks: BABYLON.Mesh[] = [];
  private enemies: BABYLON.Mesh[] = [];
  private items: BABYLON.Mesh[] = [];
  private fireballs: Fireball[] = [];
  private solidTiles: Set<string> = new Set();
  
  // Power Ups
  private hasFireFlower: boolean = false;

  // Physics Constants
  private GRAVITY = -60.0;
  private MOVE_SPEED = 9.0;
  private JUMP_FORCE = 26.0;
  private FRICTION_GROUND = 0.8; 
  private FRICTION_AIR = 0.95; 

  // AABB Physics
  private playerWidth = 0.6; 
  private playerHeight = 0.8; 

  // Materials
  private materials: { [key: string]: BABYLON.StandardMaterial } = {};

  constructor(engine: BABYLON.Engine, canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.engine = engine;
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.scene = new BABYLON.Scene(engine);
    this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1); // Black background

    // Initialize
    this.initMaterials();
    this.setupLights();
    this.player = this.createPlayer();
    this.camera = this.setupCamera();
    this.setupInputs();
    
    // Load first level
    this.loadLevel(this.currentLevelIdx);

    // Game Loop
    this.scene.onBeforeRenderObservable.add(() => {
        if (!this.isGameOver) {
            this.update();
        }
    });
  }

  private initMaterials() {
    const createMat = (name: string, color: BABYLON.Color3, emissive: BABYLON.Color3 = BABYLON.Color3.Black()) => {
        const mat = new BABYLON.StandardMaterial(name, this.scene);
        mat.diffuseColor = color;
        mat.emissiveColor = emissive;
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        this.materials[name] = mat;
        return mat;
    };

    createMat("ground", new BABYLON.Color3(0.3, 0.3, 0.3));
    createMat("wall", new BABYLON.Color3(0.5, 0.25, 0.0));
    createMat("grass", new BABYLON.Color3(0.1, 0.4, 0.1));
    createMat("question", new BABYLON.Color3(0.8, 0.6, 0.0), new BABYLON.Color3(0.2, 0.15, 0.0));
    createMat("questionEmpty", new BABYLON.Color3(0.4, 0.3, 0.2));
    createMat("brick", new BABYLON.Color3(0.4, 0.1, 0.1));
    createMat("pipe", new BABYLON.Color3(0.0, 0.6, 0.0));
    createMat("coin", new BABYLON.Color3(1, 0.8, 0), new BABYLON.Color3(0.4, 0.3, 0));
    createMat("goomba", new BABYLON.Color3(0.6, 0.1, 0.1));
    createMat("spiky", new BABYLON.Color3(0.1, 0.1, 0.8));
    createMat("ghoul", new BABYLON.Color3(0.1, 0.6, 0.1)); 
    createMat("fish", new BABYLON.Color3(0.8, 0.2, 0.2));
    createMat("koopa", new BABYLON.Color3(0.2, 0.8, 0.2));
    createMat("flag", new BABYLON.Color3(0.1, 0.8, 0.1), new BABYLON.Color3(0.1, 0.4, 0.1));
    createMat("lava", new BABYLON.Color3(1, 0.2, 0), new BABYLON.Color3(0.8, 0.1, 0));
    createMat("fireball", new BABYLON.Color3(1, 0.5, 0), new BABYLON.Color3(1, 0.2, 0));
    createMat("flower", new BABYLON.Color3(1, 0.5, 0), new BABYLON.Color3(0.5, 0.2, 0));
  }

  private setupLights() {
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.8;
    const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, -1), this.scene);
    dir.intensity = 0.5;
  }

  private setupCamera() {
    const camera = new BABYLON.FollowCamera("camera", new BABYLON.Vector3(0, 0, -10), this.scene);
    camera.radius = 12; 
    camera.heightOffset = 2; 
    camera.rotationOffset = 180;
    camera.cameraAcceleration = 0.08;
    camera.maxCameraSpeed = 20;
    camera.lockedTarget = this.player;
    camera.fov = 0.8;
    return camera;
  }

  private createPlayer() {
    const collider = BABYLON.MeshBuilder.CreateBox("playerCollider", {
        width: this.playerWidth,
        height: this.playerHeight,
        depth: 0.5
    }, this.scene);
    collider.isVisible = false;
    collider.position.y = 5;

    const plane = BABYLON.MeshBuilder.CreatePlane("playerSprite", {width: 1.0, height: 1.0}, this.scene);
    plane.parent = collider;
    plane.position.y = 0; 
    
    const texture = new BABYLON.DynamicTexture("playerTex", {width: 64, height: 64}, this.scene, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
    texture.hasAlpha = true;
    
    const mat = new BABYLON.StandardMaterial("playerMat", this.scene);
    mat.diffuseTexture = texture;
    mat.emissiveColor = new BABYLON.Color3(1,1,1);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    plane.material = mat;

    this.updatePlayerSprite(texture, false, false, false);
    return collider;
  }

  private updatePlayerSprite(texture: BABYLON.DynamicTexture, run: boolean, jump: boolean, fire: boolean) {
     const ctx = texture.getContext();
     ctx.clearRect(0,0,64,64);

     const R = fire ? "#FF8800" : "#D82800"; 
     const B = fire ? "#AA0000" : "#0040D0"; 
     const S = "#FC9838"; 
     const H = "#5C2C00"; 
     const W = "#FFFFFF"; 

     const p = (x: number, y: number, c: string) => {
         ctx.fillStyle = c;
         ctx.fillRect(x*4, (15-y)*4, 4, 4);
     };

     if (jump) {
        // JUMP FRAME
        [
            [3,13,R],[4,13,R],[5,13,R],[6,13,R],[7,13,R], 
            [2,12,R],[3,12,R],[4,12,R],[5,12,R],[6,12,R],[7,12,R],
            [2,11,H],[3,11,H],[4,11,H],[5,11,S],[6,11,S], 
            [1,10,H],[2,10,H],[3,10,H],[5,10,S],[6,10,S],[7,10,S],
            [2,9,H],[5,9,H],[8,9,S],
            [2,8,R],[3,8,B],[4,8,R],[5,8,R],[6,8,R], 
            [1,7,R],[2,7,R],[3,7,B],[4,7,R],[5,7,R],[6,7,R],[8,7,W],
            [1,6,R],[2,6,R],[3,6,B],[4,6,B],[5,6,B],[6,6,R],[7,6,W],[8,6,W],
            [3,5,B],[4,5,B],[5,5,B],[6,5,W],[7,5,W],[8,5,W],
            [2,4,B],[3,4,B],[4,4,B],
            [1,3,H],[2,3,H],[3,3,H], 
        ].forEach(d => p(d[0] as number, d[1] as number, d[2] as string));
     } else if (run) {
        // RUN FRAME
        [
            [3,13,R],[4,13,R],[5,13,R],[6,13,R],[7,13,R], 
            [2,12,R],[3,12,R],[4,12,R],[5,12,R],[6,12,R],[7,12,R],
            [2,11,H],[3,11,H],[4,11,H],[5,11,S],[6,11,S], 
            [1,10,H],[2,10,H],[3,10,H],[5,10,S],[6,10,S],[7,10,S],
            [2,9,H],[5,9,H],
            [2,8,R],[3,8,R],[4,8,R],[5,8,B],[6,8,R], 
            [1,7,R],[2,7,R],[3,7,R],[4,7,B],[5,7,B],[6,7,R],[7,7,W],
            [2,6,W],[3,6,R],[4,6,B],[5,6,B],[6,6,B],[7,6,R],[8,6,W],
            [2,5,W],[3,5,W],[4,5,B],[5,5,B],[6,5,B],
            [1,4,H],[2,4,H],[3,4,H],[5,4,B],[6,4,B],
            [5,3,H],[6,3,H],[7,3,H] 
        ].forEach(d => p(d[0] as number, d[1] as number, d[2] as string));
     } else {
        // IDLE FRAME
        [
            [3,13,R],[4,13,R],[5,13,R],[6,13,R],[7,13,R], 
            [2,12,R],[3,12,R],[4,12,R],[5,12,R],[6,12,R],[7,12,R],
            [2,11,H],[3,11,H],[4,11,H],[5,11,S],[6,11,S], 
            [1,10,H],[2,10,H],[3,10,H],[5,10,S],[6,10,S],[7,10,S],
            [2,9,H],[5,9,H],
            [3,8,R],[4,8,R],[5,8,R], 
            [2,7,R],[3,7,R],[4,7,R],[5,7,R],[6,7,B],[7,7,R],
            [1,6,W],[2,6,R],[3,6,B],[4,6,B],[5,6,R],[6,6,R],[7,6,R],[8,6,W],
            [1,5,W],[2,5,W],[3,5,B],[4,5,B],[5,5,B],[6,5,W],[7,5,W],[8,5,W],
            [3,4,B],[4,4,B],
            [1,3,H],[2,3,H],[3,3,H],[5,3,H],[6,3,H],[7,3,H] 
        ].forEach(d => p(d[0] as number, d[1] as number, d[2] as string));
     }

     texture.update();
  }

  private setupInputs() {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.code;
      if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
        this.inputMap[key] = true;
        
        if ((key === 'Space' || key === 'ArrowUp' || key === 'KeyW') && this.canJump) {
            this.velocity.y = this.JUMP_FORCE;
            // In water, jumping is just swimming up
            if (this.currentLevelIdx === 3) { // Level 4 is underwater
                this.canJump = true; // Infinite jumps in water
            } else {
                this.canJump = false; 
            }
        }
        
        if ((key === 'ShiftLeft' || key === 'KeyZ') && this.hasFireFlower) {
            this.shootFireball();
        }

      } else if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
        this.inputMap[key] = false;
        
        if ((key === 'Space' || key === 'ArrowUp' || key === 'KeyW') && this.velocity.y > 0) {
            this.velocity.y *= 0.5; 
        }
      }
    });
  }

  private validateAndFixLevel(mapData: string[]): string[] {
    const map = mapData.map(row => row.split('')); 
    const height = map.length;
    const width = map[0].length;
    
    let gapCount = 0;
    let lastSafeY = 2; 

    for (let x = 0; x < width; x++) {
        let colHasSolid = false;
        
        for (let row = 0; row < height; row++) {
            const char = map[row][x];
             if (['#', 'K', '?', 'T'].includes(char)) { 
                 colHasSolid = true;
                 lastSafeY = (height - 1) - row; 
                 break;
             }
        }

        if (colHasSolid) {
            gapCount = 0;
        } else {
            gapCount++;
            if (gapCount > 4) {
                const fixX = x - 2; 
                const fixRow = (height - 1) - lastSafeY; 
                
                if (fixRow >= 0 && fixRow < height) {
                    map[fixRow][fixX] = '#'; 
                    gapCount = 0;
                }
            }
        }
    }

    return map.map(row => row.join(''));
  }

  private loadLevel(levelIdx: number) {
    this.blocks.forEach(b => b.dispose());
    this.enemies.forEach(e => e.dispose());
    this.items.forEach(i => i.dispose());
    this.fireballs.forEach(f => f.mesh.dispose());
    this.fireballs = [];
    this.blocks = [];
    this.enemies = [];
    this.items = [];
    this.solidTiles.clear();
    
    if (levelIdx >= LEVEL_MAPS.length) {
        this.callbacks.onGameStateChange(GameState.VICTORY);
        return;
    }
    
    this.currentLevelIdx = levelIdx;
    this.callbacks.onLevelUpdate?.(levelIdx + 1);

    // Apply Level Specific Physics
    if (levelIdx === 3) { // Underwater (Level 4)
        this.GRAVITY = -10.0;
        this.FRICTION_AIR = 0.98;
    } else {
        this.GRAVITY = -60.0;
        this.FRICTION_AIR = 0.95;
    }

    const rawMap = LEVEL_MAPS[levelIdx];
    // Safety check: if level map undefined, try to fallback or don't process
    if (!rawMap) return;

    const map = this.validateAndFixLevel(rawMap);
    
    const mapHeight = map.length;
    const mapWidth = map[0].length;

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const char = map[y][x];
            const worldX = x;
            const worldY = (mapHeight - 1) - y; 

            if (char === '.') continue;

            if (char === 'P') {
                this.player.position.set(worldX, worldY + 1, 0);
                this.velocity.set(0,0,0);
                this.checkPointX = worldX;
                this.lastSolidX = worldX;
                continue;
            }

            if (char === '#' || char === '?' || char === 'K' || char === 'L') {
                let matName = "ground";
                let type: BlockMetadata['type'] = 'ground';

                if (char === '#') {
                    matName = levelIdx === 1 ? "wall" : "ground"; 
                    if (y < mapHeight-1 && map[y+1][x] === '.') matName = "grass";
                } else if (char === '?') {
                    matName = "question";
                    type = 'question';
                } else if (char === 'K') { 
                    matName = "brick";
                    type = 'brick';
                } else if (char === 'L') {
                    matName = "lava";
                    type = 'lava';
                }

                this.solidTiles.add(`${worldX},${worldY}`);

                const box = BABYLON.MeshBuilder.CreateBox("blk", {size: 1}, this.scene);
                box.position.set(worldX, worldY, 0);
                box.material = this.materials[matName];
                
                box.metadata = {
                    type,
                    content: Math.random() > 0.8 ? 'flower' : 'coin',
                    active: true,
                    originalY: worldY
                } as BlockMetadata;

                this.blocks.push(box);
            }

            if (char === 'T') {
                const pipe = BABYLON.MeshBuilder.CreateCylinder("pipe", {diameter: 1.8, height: 2}, this.scene);
                pipe.position.set(worldX + 0.5, worldY + 0.5, 0);
                pipe.material = this.materials["pipe"];
                this.solidTiles.add(`${worldX},${worldY}`);
                this.solidTiles.add(`${worldX+1},${worldY}`); 
                this.blocks.push(pipe);
            }

            if (char === 'E' || char === 'S' || char === 'G' || char === 'F' || char === 'K') {
                let matName = "goomba";
                let subtype: EnemyMetadata['subtype'] = 'normal';
                
                if (char === 'S') {
                    matName = "spiky";
                    subtype = 'spiky';
                } else if (char === 'G') {
                    matName = "ghoul";
                    subtype = 'ghoul';
                } else if (char === 'F') {
                    matName = "fish";
                    subtype = 'fish';
                } else if (char === 'K') {
                    matName = "koopa";
                    subtype = 'koopa';
                }

                const enemy = BABYLON.MeshBuilder.CreateSphere("enemy", {diameter: 0.8}, this.scene);
                enemy.position.set(worldX, worldY + 0.5, 0);
                enemy.material = this.materials[matName];
                
                enemy.metadata = {
                    type: 'enemy',
                    subtype,
                    dead: false,
                    direction: -1,
                    speed: subtype === 'ghoul' ? 4.0 : 2.5, // Ghouls are faster
                    initialPos: enemy.position.clone(),
                    animTime: 0
                } as EnemyMetadata;

                this.enemies.push(enemy);
            }

            if (char === 'C') {
                const coin = BABYLON.MeshBuilder.CreateCylinder("coin", {diameter: 0.6, height: 0.1, tessellation: 16}, this.scene);
                coin.rotation.x = Math.PI / 2;
                coin.position.set(worldX, worldY, 0);
                coin.material = this.materials["coin"];
                coin.metadata = { type: 'coin' };
                this.items.push(coin);
            }

            if (char === 'F') {
                const pole = BABYLON.MeshBuilder.CreateCylinder("pole", {diameter: 0.2, height: 6}, this.scene);
                pole.position.set(worldX, worldY + 3, 0);
                pole.material = this.materials["wall"];
                
                const flag = BABYLON.MeshBuilder.CreateBox("flag", {width: 2, height: 1.5, depth: 0.1}, this.scene);
                flag.position.set(worldX + 1, worldY + 5, 0);
                flag.material = this.materials["flag"];
                
                const trigger = BABYLON.MeshBuilder.CreateBox("flagTrigger", {width: 1, height: 10, depth: 1}, this.scene);
                trigger.position.set(worldX, worldY + 5, 0);
                trigger.isVisible = false;
                trigger.metadata = { type: 'flag' };
                this.items.push(trigger);
            }
        }
    }
    
    // Safe default spawn if 'P' not found
    if (this.player.position.x === 0 && this.player.position.y === 5) {
         this.player.position.set(2, 5, 0);
         this.checkPointX = 2;
         this.lastSolidX = 2;
    }
    
    this.velocity.set(0,0,0);
    this.levelTime = 400;
  }

  // --- GAME LOOP ---
  private update() {
    let dt = this.engine.getDeltaTime() / 1000;
    if (dt > 0.1) dt = 0.1; 

    // SUB-STEPPING PHYSICS
    // Perform multiple small physics steps to prevent tunneling/snagging at high velocity/gravity
    const stepSize = 0.01; // 10ms
    while (dt > 0) {
        const deltaTime = Math.min(dt, stepSize);
        this.updatePlayerPhysics(deltaTime);
        this.updateEntities(deltaTime);
        dt -= deltaTime;
    }

    this.updateVisuals(this.engine.getDeltaTime() / 1000);
    
    this.camera.position.x = Math.max(this.camera.position.x, this.player.position.x); 
    
    if (this.player.position.y < -5) {
        this.die();
    }

    this.levelTime -= this.engine.getDeltaTime() / 1000;
    this.callbacks.onTimeUpdate(this.levelTime);
    if (this.levelTime <= 0) this.die();
  }

  // --- PHYSICS ENGINE (AABB TILE BASED) ---
  private updatePlayerPhysics(dt: number) {
    this.velocity.y += this.GRAVITY * dt;

    const speed = this.inputMap['ShiftLeft'] ? this.MOVE_SPEED * 1.5 : this.MOVE_SPEED;
    let dx = 0;
    if (this.inputMap['ArrowLeft'] || this.inputMap['KeyA']) dx = -1;
    if (this.inputMap['ArrowRight'] || this.inputMap['KeyD']) dx = 1;

    if (dx !== 0) {
        this.velocity.x = BABYLON.Scalar.Lerp(this.velocity.x, dx * speed, 10 * dt);
        this.player.getChildMeshes()[0].scaling.x = dx < 0 ? -1 : 1; 
    } else {
        const friction = this.isGrounded ? this.FRICTION_GROUND : this.FRICTION_AIR;
        this.velocity.x *= Math.pow(friction, dt * 60);
        if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
    }

    this.player.position.x += this.velocity.x * dt;
    this.checkCollisionsX();

    this.player.position.y += this.velocity.y * dt;
    this.checkCollisionsY();

    if (this.isGrounded) {
        if (this.player.position.x > this.checkPointX) {
            this.checkPointX = Math.floor(this.player.position.x);
        }
        // Update last solid ground for safe respawn
        this.lastSolidX = Math.floor(this.player.position.x);
    }
  }

  private checkCollisionsX() {
    const x = this.player.position.x;
    const y = this.player.position.y;
    const halfW = this.playerWidth / 2;

    const left = Math.round(x - halfW);
    const right = Math.round(x + halfW);
    
    // Check collision at Head and Center-Body.
    // We intentionally ignore the feet area (y - 0.something) to prevent snagging on floor seams.
    const top = Math.round(y + 0.3);
    const center = Math.round(y); 

    if (this.velocity.x > 0) {
        if (this.isSolid(right, top) || this.isSolid(right, center)) {
            this.player.position.x = (right - 0.5) - halfW - 0.001;
            this.velocity.x = 0;
        }
    }
    else if (this.velocity.x < 0) {
        if (this.isSolid(left, top) || this.isSolid(left, center)) {
            this.player.position.x = (left + 0.5) + halfW + 0.001;
            this.velocity.x = 0;
        }
    }
  }

  private checkCollisionsY() {
    const x = this.player.position.x;
    const y = this.player.position.y;
    const halfW = this.playerWidth / 2;
    const halfH = this.playerHeight / 2;

    const left = Math.round(x - halfW + 0.1); 
    const right = Math.round(x + halfW - 0.1); 
    const top = Math.round(y + halfH);
    const bottom = Math.round(y - halfH);

    this.isGrounded = false;

    if (this.velocity.y > 0) {
        if (this.isSolid(left, top) || this.isSolid(right, top)) {
            this.player.position.y = (top - 0.5) - halfH - 0.001;
            this.velocity.y = 0;
            this.activateBlock(left, top);
            this.activateBlock(right, top);
        }
    }
    else if (this.velocity.y <= 0) {
        if (this.isSolid(left, bottom) || this.isSolid(right, bottom)) {
            if (this.isLava(left, bottom) || this.isLava(right, bottom)) {
                this.die();
                return;
            }
            // Add slight margin (0.001 -> 0.01) to keep feet further from floor center
            this.player.position.y = (bottom + 0.5) + halfH + 0.01;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.canJump = true;
        }
    }
  }

  private isSolid(x: number, y: number): boolean {
    return this.solidTiles.has(`${x},${y}`);
  }

  private isLava(x: number, y: number): boolean {
    const block = this.blocks.find(b => Math.round(b.position.x) === x && Math.round(b.position.y) === y);
    return block?.metadata?.type === 'lava';
  }

  private activateBlock(x: number, y: number) {
    const block = this.blocks.find(b => Math.round(b.position.x) === x && Math.round(b.position.y) === y);
    if (!block || !block.metadata.active) return;
    
    if (block.metadata.type === 'question' || block.metadata.type === 'brick') {
        const anim = new BABYLON.Animation("bump", "position.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const keys = [
            { frame: 0, value: y },
            { frame: 5, value: y + 0.5 },
            { frame: 10, value: y }
        ];
        anim.setKeys(keys);
        block.animations = [anim];
        this.scene.beginAnimation(block, 0, 10, false);

        if (block.metadata.type === 'question') {
            block.material = this.materials["questionEmpty"];
            block.metadata.active = false;
            
            if (block.metadata.content === 'coin') {
                this.score += 100;
                this.callbacks.onScoreUpdate(this.score);
                this.spawnFloatingText("+100", block.position);
            } else if (block.metadata.content === 'flower') {
                this.spawnPowerUp(block.position);
            }
        }
    }
  }
  
  private spawnPowerUp(pos: BABYLON.Vector3) {
      const flower = BABYLON.MeshBuilder.CreatePlane("flower", {size: 0.8}, this.scene);
      flower.position = pos.clone().add(new BABYLON.Vector3(0, 1, 0));
      const mat = this.materials["flower"];
      flower.material = mat;
      flower.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      
      this.items.push(flower);
      flower.metadata = { type: 'flower' };
  }
  
  private shootFireball() {
      if (this.fireballs.length > 2) return; 
      
      const fbMesh = BABYLON.MeshBuilder.CreateSphere("fb", {diameter: 0.4}, this.scene);
      fbMesh.position = this.player.position.clone();
      fbMesh.material = this.materials["fireball"];
      const dir = this.player.getChildMeshes()[0].scaling.x;
      
      this.fireballs.push({
          mesh: fbMesh,
          velocity: new BABYLON.Vector3(dir * 12, -2, 0),
          active: true
      });
  }

  private updateEntities(dt: number) {
    this.enemies.forEach(e => {
        if (!e.metadata || e.metadata.dead) return;

        // Use Math.round for consistency
        if (!this.isSolid(Math.round(e.position.x), Math.round(e.position.y - 0.6))) {
             // Only apply full gravity if NOT a fish. Fish swim.
             if (e.metadata.subtype !== 'fish') {
                 e.position.y += this.GRAVITY * dt * 0.5; 
             }
        } else {
             e.position.y = Math.round(e.position.y - 0.6) + 0.5 + 0.4; // snap to ground
        }

        e.position.x += e.metadata.direction * e.metadata.speed * dt;

        const checkX = e.position.x + (e.metadata.direction * 0.6);
        if (this.isSolid(Math.round(checkX), Math.round(e.position.y))) {
            e.metadata.direction *= -1;
        }

        if (this.player.intersectsMesh(e, true)) {
            const isStomp = this.velocity.y < 0 && (this.player.position.y > e.position.y + 0.3);
            
            if (isStomp && e.metadata.subtype !== 'spiky') {
                this.killEnemy(e);
                this.velocity.y = 15; 
            } else {
                this.die();
            }
        }
        
        e.metadata.animTime += dt * 10;
        e.scaling.y = 1 + Math.sin(e.metadata.animTime) * 0.1;
        e.scaling.x = 1 - Math.sin(e.metadata.animTime) * 0.05;
    });

    this.items.forEach((item, i) => {
        if (item.metadata?.type === 'coin') {
            item.rotation.y += dt * 3;
            if (this.player.intersectsMesh(item, false)) {
                item.dispose();
                this.items.splice(i, 1);
                this.score += 50;
                this.callbacks.onScoreUpdate(this.score);
            }
        } else if (item.metadata?.type === 'flower') {
             if (this.player.intersectsMesh(item, false)) {
                item.dispose();
                this.items.splice(i, 1);
                this.hasFireFlower = true;
                const tex = (this.player.getChildMeshes()[0].material as BABYLON.StandardMaterial).diffuseTexture as BABYLON.DynamicTexture;
                this.updatePlayerSprite(tex, false, false, true);
             }
        } else if (item.metadata?.type === 'flag') {
             if (this.player.intersectsMesh(item, false)) {
                 this.nextLevel();
             }
        }
    });
    
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
        const fb = this.fireballs[i];
        // Fireball physics is normal even underwater for now
        fb.velocity.y += -60.0 * dt; 
        fb.mesh.position.addInPlace(fb.velocity.scale(dt));
        
        if (fb.mesh.position.y < -5) { fb.active = false; }
        const bx = Math.round(fb.mesh.position.x);
        const by = Math.round(fb.mesh.position.y - 0.2);
        if (this.isSolid(bx, by)) {
            fb.velocity.y = 10; 
        }
        const wx = Math.round(fb.mesh.position.x + (fb.velocity.x > 0 ? 0.3 : -0.3));
        const wy = Math.round(fb.mesh.position.y);
        if (this.isSolid(wx, wy)) {
            fb.active = false;
        }

        this.enemies.forEach(e => {
            if (!e.metadata.dead && fb.mesh.intersectsMesh(e, false)) {
                this.killEnemy(e);
                fb.active = false;
            }
        });

        if (!fb.active) {
            fb.mesh.dispose();
            this.fireballs.splice(i, 1);
        }
    }
  }

  private killEnemy(e: BABYLON.Mesh) {
      e.metadata.dead = true;
      e.isPickable = false;
      e.scaling.y = 0.2;
      e.position.y -= 0.3;
      setTimeout(() => e.dispose(), 500);
      this.score += 200;
      this.callbacks.onScoreUpdate(this.score);
  }
  
  private spawnFloatingText(text: string, pos: BABYLON.Vector3) {
  }

  private updateVisuals(dt: number) {
      const tex = (this.player.getChildMeshes()[0].material as BABYLON.StandardMaterial).diffuseTexture as BABYLON.DynamicTexture;
      const isRunning = Math.abs(this.velocity.x) > 0.5;
      const isJumping = !this.isGrounded;
      
      this.updatePlayerSprite(tex, isRunning, isJumping, this.hasFireFlower);
      
      if (isJumping) {
          this.player.getChildMeshes()[0].scaling.y = BABYLON.Scalar.Lerp(this.player.getChildMeshes()[0].scaling.y, 1.2, dt * 10);
      } else {
          this.player.getChildMeshes()[0].scaling.y = BABYLON.Scalar.Lerp(this.player.getChildMeshes()[0].scaling.y, 1.0, dt * 20);
      }
  }

  private die() {
      this.lives--; 
      this.callbacks.onLivesUpdate(this.lives);
      
      if (this.lives <= 0) {
          this.isGameOver = true;
          this.callbacks.onGameStateChange(GameState.GAME_OVER);
      } else {
          // Smart Respawn:
          // If fell in a pit (Y < -2), go to last solid ground.
          // If hit an enemy, just bounce up and back a bit to avoid instant death loop.
          
          if (this.player.position.y < -2) {
              this.player.position.set(this.lastSolidX, 5, 0);
          } else {
              this.player.position.y += 2;
              // Push back slightly opposite to velocity or just safe distance
              // Using current checkpoint as a fallback if bounce is weird
              this.player.position.x = Math.max(this.player.position.x - 2, this.checkPointX); 
          }
          
          this.velocity.set(0,0,0);
          this.hasFireFlower = false; 
          const tex = (this.player.getChildMeshes()[0].material as BABYLON.StandardMaterial).diffuseTexture as BABYLON.DynamicTexture;
          this.updatePlayerSprite(tex, false, false, false);
      }
  }
  
  private nextLevel() {
      this.currentLevelIdx++;
      if (this.currentLevelIdx >= LEVEL_MAPS.length) {
          this.callbacks.onGameStateChange(GameState.VICTORY);
      } else {
          this.checkPointX = 2; 
          this.loadLevel(this.currentLevelIdx);
      }
  }

  public render() {
    this.scene.render();
  }
  
  public setGameState(state: GameState) {
  }
  
  public restartGame() {
      this.lives = 10;
      this.score = 0;
      this.currentLevelIdx = 0;
      this.checkPointX = 2;
      this.isGameOver = false;
      this.loadLevel(0);
      this.callbacks.onLivesUpdate(this.lives);
      this.callbacks.onScoreUpdate(0);
  }

  public dispose() {
    this.scene.dispose();
  }
}
