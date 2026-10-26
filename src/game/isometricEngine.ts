import {
  WeaponType,
  WeaponData,
  EnemyEntity,
  DoorEntity,
  DroppedWeapon,
  BloodDecal,
  RunicMaskId,
  PlayerIsometricState,
} from '../types/isometric';
import { soundEngine } from '../utils/audio';

export const WEAPON_DEFS: { [key in WeaponType]: WeaponData } = {
  MAGNUM: {
    type: 'MAGNUM',
    name: '.44 Büyülü Revolver',
    isRanged: true,
    damage: 100,
    ammo: 6,
    maxAmmo: 6,
    fireRate: 18,
    spread: 0.02,
    color: '#f43f5e',
  },
  SHOTGUN: {
    type: 'SHOTGUN',
    name: 'Spas-12 Pompalı',
    isRanged: true,
    damage: 45,
    ammo: 8,
    maxAmmo: 8,
    fireRate: 30,
    spread: 0.22,
    pellets: 6,
    color: '#fbbf24',
  },
  SMG: {
    type: 'SMG',
    name: 'Tec-9 Büyü Makinelisi',
    isRanged: true,
    damage: 35,
    ammo: 30,
    maxAmmo: 30,
    fireRate: 6,
    spread: 0.1,
    color: '#a855f7',
  },
  KATANA: {
    type: 'KATANA',
    name: 'Rünik Katana',
    isRanged: false,
    damage: 100,
    ammo: 0,
    maxAmmo: 0,
    fireRate: 14,
    spread: 0,
    color: '#06b6d4',
  },
  BAT: {
    type: 'BAT',
    name: 'Beyzbol Sopası',
    isRanged: false,
    damage: 55,
    ammo: 0,
    maxAmmo: 0,
    fireRate: 18,
    spread: 0,
    color: '#f59e0b',
  },
  FISTS: {
    type: 'FISTS',
    name: 'Yumruklar',
    isRanged: false,
    damage: 35,
    ammo: 0,
    maxAmmo: 0,
    fireRate: 14,
    spread: 0,
    color: '#cbd5e1',
  },
};

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isEnemy: boolean;
  life: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
}

export interface RoomProp {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'BAR_COUNTER' | 'BILLIARD_TABLE' | 'SOFA' | 'JUKEBOX' | 'SLOT_MACHINE';
  color: string;
}

export class IsometricEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Camera
  public camera = { x: 0, y: 0, shake: 0 };

  // Mouse Screen Position
  public mouse = { x: 0, y: 0, worldX: 0, worldY: 0, isDown: false };

  // Player State - Starts with loaded MAGNUM firearm so shooting works instantly!
  public player: PlayerIsometricState = {
    x: 220,
    y: 220,
    vx: 0,
    vy: 0,
    angle: 0,
    hp: 100,
    maxHp: 100,
    weapon: { ...WEAPON_DEFS.MAGNUM },
    isRolling: false,
    rollTimer: 0,
    attackCooldown: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    mask: 'WOLF',
  };

  // World Elements
  public walls: Wall[] = [];
  public doors: DoorEntity[] = [];
  public enemies: EnemyEntity[] = [];
  public droppedWeapons: DroppedWeapon[] = [];
  public bullets: Bullet[] = [];
  public bloodDecals: BloodDecal[] = [];
  public particles: Particle[] = [];
  public props: RoomProp[] = [];

  // Reloading state
  public isReloading: boolean = false;
  public reloadTimer: number = 0;

  // Visual effects
  public muzzleFlashTimer: number = 0;
  public slashTrail: { x: number; y: number; angle: number; alpha: number }[] = [];
  public hitstopTimer: number = 0;

  // Keys
  private keys: { [key: string]: boolean } = {};

  // Available Weapons for quick switching (1, 2, 3, 4, Q)
  public weaponInventory: WeaponType[] = ['MAGNUM', 'SHOTGUN', 'SMG', 'KATANA'];
  public currentWeaponIndex: number = 0;

  // Callbacks
  public onStateUpdate?: (player: PlayerIsometricState) => void;
  public onLevelClear?: () => void;
  public onGameOver?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initMap();
    this.bindInputs();
  }

  private initMap() {
    this.walls = [
      // Outer perimeter
      { x1: 50, y1: 50, x2: 1250, y2: 50 },
      { x1: 1250, y1: 50, x2: 1250, y2: 1050 },
      { x1: 1250, y1: 1050, x2: 50, y2: 1050 },
      { x1: 50, y1: 1050, x2: 50, y2: 50 },

      // Room 1 (Entrance) to Room 2 Divider with door gap
      { x1: 450, y1: 50, x2: 450, y2: 380 },
      { x1: 450, y1: 500, x2: 450, y2: 1050 },

      // Room 2 to Room 3 (VIP Room) Divider with door gap
      { x1: 850, y1: 50, x2: 850, y2: 530 },
      { x1: 850, y1: 650, x2: 850, y2: 1050 },

      // Billiards room partition
      { x1: 450, y1: 550, x2: 720, y2: 550 },
    ];

    // Furniture Props
    this.props = [
      { x: 550, y: 150, w: 180, h: 35, type: 'BAR_COUNTER', color: '#7c2d12' },
      { x: 120, y: 120, w: 40, h: 50, type: 'JUKEBOX', color: '#db2777' },
      { x: 560, y: 680, w: 120, h: 70, type: 'BILLIARD_TABLE', color: '#065f46' },
      { x: 950, y: 180, w: 160, h: 45, type: 'SOFA', color: '#881337' },
      { x: 950, y: 820, w: 160, h: 45, type: 'SOFA', color: '#881337' },
      { x: 120, y: 350, w: 35, h: 45, type: 'SLOT_MACHINE', color: '#f59e0b' },
      { x: 120, y: 420, w: 35, h: 45, type: 'SLOT_MACHINE', color: '#38bdf8' },
    ];

    // Doors
    this.doors = [
      {
        id: 1,
        x: 450,
        y: 380,
        w: 14,
        h: 120,
        angle: 0,
        targetAngle: 0,
        isOpen: false,
        swingSpeed: 0,
        isKicked: false,
      },
      {
        id: 2,
        x: 850,
        y: 530,
        w: 14,
        h: 120,
        angle: 0,
        targetAngle: 0,
        isOpen: false,
        swingSpeed: 0,
        isKicked: false,
      },
    ];

    // Enemies
    this.enemies = [
      {
        id: 1,
        race: 'GOBLIN_GUNNER',
        name: 'Goblin Tetikçi',
        x: 350,
        y: 280,
        vx: 0,
        vy: 0,
        angle: Math.PI,
        state: 'PATROL',
        hp: 30,
        maxHp: 30,
        weapon: 'SMG',
        ammo: 30,
        patrolPoints: [{ x: 350, y: 200 }, { x: 350, y: 420 }],
        currentPatrolIdx: 0,
        attackCooldown: 35,
        knockdownTimer: 0,
        alertTimer: 0,
        facing: -1,
      },
      {
        id: 2,
        race: 'ORC_BOUNCER',
        name: 'Ork Bar Fedaisi',
        x: 360,
        y: 750,
        vx: 0,
        vy: 0,
        angle: Math.PI / 2,
        state: 'PATROL',
        hp: 85,
        maxHp: 85,
        weapon: 'SHOTGUN',
        ammo: 8,
        patrolPoints: [{ x: 220, y: 750 }, { x: 380, y: 750 }],
        currentPatrolIdx: 0,
        attackCooldown: 45,
        knockdownTimer: 0,
        alertTimer: 0,
        facing: 1,
      },
      {
        id: 3,
        race: 'VAMPIRE_HITMAN',
        name: 'Vampir Tetikçi',
        x: 650,
        y: 320,
        vx: 0,
        vy: 0,
        angle: 0,
        state: 'PATROL',
        hp: 50,
        maxHp: 50,
        weapon: 'MAGNUM',
        ammo: 6,
        patrolPoints: [{ x: 550, y: 320 }, { x: 750, y: 320 }],
        currentPatrolIdx: 0,
        attackCooldown: 30,
        knockdownTimer: 0,
        alertTimer: 0,
        facing: 1,
      },
      {
        id: 4,
        race: 'ORC_BOUNCER',
        name: 'Ork Bilardo Ustası',
        x: 650,
        y: 820,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        state: 'PATROL',
        hp: 80,
        maxHp: 80,
        weapon: 'BAT',
        ammo: 0,
        patrolPoints: [{ x: 550, y: 820 }, { x: 750, y: 820 }],
        currentPatrolIdx: 0,
        attackCooldown: 35,
        knockdownTimer: 0,
        alertTimer: 0,
        facing: 1,
      },
      {
        id: 5,
        race: 'BOSS_JACK',
        name: '"Koca Pençe" Jack (Kurtadam Boss)',
        x: 1080,
        y: 500,
        vx: 0,
        vy: 0,
        angle: Math.PI,
        state: 'PATROL',
        hp: 400,
        maxHp: 400,
        weapon: 'SHOTGUN',
        ammo: 16,
        patrolPoints: [{ x: 1080, y: 280 }, { x: 1080, y: 720 }],
        currentPatrolIdx: 0,
        attackCooldown: 40,
        knockdownTimer: 0,
        alertTimer: 0,
        facing: -1,
      },
    ];

    // Dropped weapons
    this.droppedWeapons = [
      { id: 1, type: 'KATANA', ammo: 0, x: 260, y: 300, vx: 0, vy: 0, isFlying: false, angle: 0.5 },
      { id: 2, type: 'SHOTGUN', ammo: 8, x: 550, y: 450, vx: 0, vy: 0, isFlying: false, angle: 1.2 },
    ];
  }

  // --- INPUT BINDINGS ---
  private bindInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Space: Dodge Roll or Execution!
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleSpaceAction();
      }

      // Quick Weapon Switching: Q, 1, 2, 3, 4
      if (e.code === 'KeyQ') {
        this.cycleWeapon();
      }
      if (e.code === 'Digit1') this.switchWeaponTo('MAGNUM');
      if (e.code === 'Digit2') this.switchWeaponTo('SHOTGUN');
      if (e.code === 'Digit3') this.switchWeaponTo('SMG');
      if (e.code === 'Digit4') this.switchWeaponTo('KATANA');

      // F / E: Interact / Breach Closed Door / Pick up weapon
      if (e.code === 'KeyF' || e.code === 'KeyE') {
        const nearDoor = this.doors.find((d) => {
          if (d.isOpen) return false;
          const dist = Math.hypot(this.player.x - d.x, this.player.y - (d.y + d.h / 2));
          return dist < 70;
        });

        if (nearDoor) {
          this.kickDoor(nearDoor, this.player.angle);
        } else {
          this.pickupNearestWeapon();
        }
      }

      // R: Manual Reload
      if (e.code === 'KeyR') {
        this.reloadWeapon();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;

      // Inverse isometric matrix
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const sx = this.mouse.x - cx + this.camera.x;
      const sy = this.mouse.y - cy + this.camera.y;

      const wx = (sx / 0.866 + sy / 0.5) / 2;
      const wy = (sy / 0.5 - sx / 0.866) / 2;

      this.mouse.worldX = wx;
      this.mouse.worldY = wy;

      this.player.angle = Math.atan2(this.mouse.worldY - this.player.y, this.mouse.worldX - this.player.x);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = true;
        this.triggerAttack();
      } else if (e.button === 2) {
        e.preventDefault();
        this.throwEquippedWeapon();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.mouse.isDown = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public cycleWeapon() {
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weaponInventory.length;
    const type = this.weaponInventory[this.currentWeaponIndex];
    this.switchWeaponTo(type);
  }

  public switchWeaponTo(type: WeaponType) {
    this.player.weapon = { ...WEAPON_DEFS[type] };
    soundEngine.playWeaponThrow();
    if (this.onStateUpdate) this.onStateUpdate(this.player);
  }

  public reloadWeapon() {
    if (!this.player.weapon.isRanged || this.isReloading) return;
    this.isReloading = true;
    this.reloadTimer = 45; // 0.75s reload
    soundEngine.playWeaponThrow();
  }

  // --- ACTIONS ---

  public handleSpaceAction() {
    // Check ground execution
    const nearestKnocked = this.enemies.find((e) => {
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      return e.state === 'KNOCKED_DOWN' && dist < 55;
    });

    if (nearestKnocked) {
      this.executeEnemy(nearestKnocked);
      return;
    }

    // Dodge Roll
    if (this.player.rollTimer <= 0) {
      this.player.isRolling = true;
      this.player.rollTimer = 16;
      this.player.vx = Math.cos(this.player.angle) * 11;
      this.player.vy = Math.sin(this.player.angle) * 11;
      soundEngine.playWeaponThrow();

      // Smoke puff
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: this.player.x,
          y: this.player.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 0,
          maxLife: 20,
          color: 'rgba(148, 163, 184, 0.4)',
          size: Math.random() * 4 + 3,
          alpha: 0.6,
        });
      }
    }
  }

  public triggerAttack() {
    if (this.player.attackCooldown > 0 || this.player.isRolling) return;
    const w = this.player.weapon;

    if (w.isRanged) {
      // Auto-reload if empty
      if (w.ammo <= 0) {
        this.reloadWeapon();
        return;
      }

      w.ammo--;
      this.player.attackCooldown = w.fireRate;
      this.camera.shake = 8;
      this.muzzleFlashTimer = 4;

      // Sound
      if (w.type === 'MAGNUM') soundEngine.playMagnumShot();
      else if (w.type === 'SHOTGUN') soundEngine.playShotgunBlast();
      else soundEngine.playSmgShot();

      // Alert nearby guards
      this.alertEnemiesInRadius(this.player.x, this.player.y, 500);

      // Spawn bullets
      const count = w.pellets || 1;
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * w.spread;
        const bulletAngle = this.player.angle + spread;
        this.bullets.push({
          x: this.player.x + Math.cos(this.player.angle) * 26,
          y: this.player.y + Math.sin(this.player.angle) * 26,
          vx: Math.cos(bulletAngle) * 25,
          vy: Math.sin(bulletAngle) * 25,
          damage: w.damage,
          isEnemy: false,
          life: 45,
          color: '#facc15',
        });
      }

      // Casing
      this.bloodDecals.push({
        x: this.player.x,
        y: this.player.y,
        size: 3,
        color: '#facc15',
        type: 'CASING',
      });
    } else {
      // Katana or Bat Melee
      this.player.attackCooldown = w.fireRate;
      soundEngine.playKatanaSlash();
      this.camera.shake = 4;

      this.slashTrail.push({
        x: this.player.x,
        y: this.player.y,
        angle: this.player.angle,
        alpha: 1.0,
      });

      const reach = w.type === 'KATANA' ? 70 : 48;
      const slashAngle = this.player.angle;

      this.enemies.forEach((enemy) => {
        if (enemy.state === 'DEAD') return;
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        const angleToEnemy = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        let angleDiff = Math.abs(slashAngle - angleToEnemy);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (dist < reach && angleDiff < Math.PI / 2.2) {
          if (w.type === 'KATANA') {
            this.killEnemy(enemy, slashAngle);
          } else {
            this.knockdownEnemy(enemy);
          }
        }
      });

      // Breaching closed doors with melee strikes
      this.doors.forEach((door) => {
        if (!door.isOpen) {
          const dist = Math.hypot(this.player.x - door.x, this.player.y - (door.y + door.h / 2));
          if (dist < reach + 25) {
            this.kickDoor(door, slashAngle);
          }
        }
      });
    }

    if (this.onStateUpdate) this.onStateUpdate(this.player);
  }

  public throwEquippedWeapon() {
    if (this.player.weapon.type === 'FISTS') return;

    const thrownType = this.player.weapon.type;
    const ammoLeft = this.player.weapon.ammo;

    this.droppedWeapons.push({
      id: Date.now(),
      type: thrownType,
      ammo: ammoLeft,
      x: this.player.x + Math.cos(this.player.angle) * 20,
      y: this.player.y + Math.sin(this.player.angle) * 20,
      vx: Math.cos(this.player.angle) * 16,
      vy: Math.sin(this.player.angle) * 16,
      isFlying: true,
      angle: this.player.angle,
    });

    this.player.weapon = { ...WEAPON_DEFS.FISTS };
    soundEngine.playWeaponThrow();

    if (this.onStateUpdate) this.onStateUpdate(this.player);
  }

  public pickupNearestWeapon() {
    let nearest: DroppedWeapon | null = null;
    let minDist = 50;

    this.droppedWeapons.forEach((dw) => {
      const dist = Math.hypot(dw.x - this.player.x, dw.y - this.player.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = dw;
      }
    });

    if (nearest) {
      const n = nearest as DroppedWeapon;
      if (this.player.weapon.type !== 'FISTS') {
        this.droppedWeapons.push({
          id: Date.now(),
          type: this.player.weapon.type,
          ammo: this.player.weapon.ammo,
          x: this.player.x,
          y: this.player.y,
          vx: 0,
          vy: 0,
          isFlying: false,
          angle: Math.random() * Math.PI,
        });
      }

      this.player.weapon = { ...WEAPON_DEFS[n.type], ammo: n.ammo };
      this.droppedWeapons = this.droppedWeapons.filter((w) => w.id !== n.id);
      soundEngine.playWeaponThrow();
      if (this.onStateUpdate) this.onStateUpdate(this.player);
    }
  }

  public executeEnemy(enemy: EnemyEntity) {
    this.killEnemy(enemy, this.player.angle);
    soundEngine.playExecution();
    this.hitstopTimer = 4;
    this.camera.shake = 14;
    this.addScore(400);

    if (this.player.mask === 'VAMPIRE') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    }
  }

  private knockdownEnemy(enemy: EnemyEntity) {
    enemy.state = 'KNOCKED_DOWN';
    enemy.knockdownTimer = 180;
    this.camera.shake = 5;
    soundEngine.playDoorKick();

    if (enemy.weapon !== 'FISTS') {
      this.droppedWeapons.push({
        id: Date.now() + Math.random(),
        type: enemy.weapon,
        ammo: enemy.ammo,
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        isFlying: false,
        angle: Math.random() * Math.PI,
      });
      enemy.weapon = 'FISTS';
    }
  }

  private killEnemy(enemy: EnemyEntity, directionAngle: number) {
    enemy.state = 'DEAD';
    enemy.hp = 0;
    this.camera.shake = 10;
    this.hitstopTimer = 3;

    // Blood splatters
    for (let i = 0; i < 18; i++) {
      const spread = (Math.random() - 0.5) * 1.4;
      const dist = Math.random() * 55 + 10;
      this.bloodDecals.push({
        x: enemy.x + Math.cos(directionAngle + spread) * dist,
        y: enemy.y + Math.sin(directionAngle + spread) * dist,
        size: Math.random() * 8 + 4,
        color: i % 3 === 0 ? '#b91c1c' : '#dc2626',
        type: 'SPLATTER',
      });
    }

    this.bloodDecals.push({
      x: enemy.x,
      y: enemy.y,
      size: 14,
      color: '#991b1b',
      type: 'POOL',
    });

    if (enemy.weapon !== 'FISTS') {
      this.droppedWeapons.push({
        id: Date.now() + Math.random(),
        type: enemy.weapon,
        ammo: enemy.ammo,
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(directionAngle) * 4,
        vy: Math.sin(directionAngle) * 4,
        isFlying: false,
        angle: directionAngle,
      });
    }

    this.player.combo++;
    this.player.comboTimer = 180;
    this.addScore(100 * this.player.combo);
    soundEngine.playComboUp(this.player.combo);

    if (this.player.mask === 'VAMPIRE') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    }

    const aliveCount = this.enemies.filter((e) => e.state !== 'DEAD').length;
    if (aliveCount === 0 && this.onLevelClear) {
      this.onLevelClear();
    }
  }

  private addScore(amount: number) {
    this.player.score += amount;
    if (this.onStateUpdate) this.onStateUpdate(this.player);
  }

  private alertEnemiesInRadius(x: number, y: number, radius: number) {
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'DEAD') return;
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < radius) {
        enemy.state = 'CHASE';
        enemy.alertTimer = 180;
        // Turn towards gunshot sound
        enemy.angle = Math.atan2(y - enemy.y, x - enemy.x);
      }
    });
  }

  // --- GAME LOOP ---
  public start() {
    this.lastTime = performance.now();
    soundEngine.startSynthBgm();

    const loop = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    soundEngine.stopSynthBgm();
  }

  private update(dt: number) {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer--;
      return;
    }

    // Auto-fire while holding mouse button for SMG & rapid weapons
    if (this.mouse.isDown && this.player.weapon.isRanged && this.player.weapon.type === 'SMG') {
      this.triggerAttack();
    }

    // Reload timer
    if (this.isReloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.player.weapon.ammo = this.player.weapon.maxAmmo;
        if (this.onStateUpdate) this.onStateUpdate(this.player);
      }
    }

    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer--;
    if (this.player.attackCooldown > 0) this.player.attackCooldown--;
    if (this.player.rollTimer > 0) {
      this.player.rollTimer--;
      if (this.player.rollTimer === 0) this.player.isRolling = false;
    }

    if (this.player.comboTimer > 0) {
      this.player.comboTimer--;
      if (this.player.comboTimer === 0) {
        this.player.combo = 0;
        if (this.onStateUpdate) this.onStateUpdate(this.player);
      }
    }

    this.slashTrail.forEach((t) => (t.alpha -= 0.1));
    this.slashTrail = this.slashTrail.filter((t) => t.alpha > 0);

    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;
    });
    this.particles = this.particles.filter((p) => p.life < p.maxLife);

    this.updatePlayerMovement(dt);
    this.updateDoors();
    this.updateFlyingWeapons();
    this.updateBullets();
    this.updateEnemies(dt);
    this.updateCamera();
  }

  private updatePlayerMovement(dt: number) {
    const p = this.player;

    if (!p.isRolling) {
      let mx = 0;
      let my = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) my -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) my += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;

      if (mx !== 0 && my !== 0) {
        mx *= 0.7071;
        my *= 0.7071;
      }

      const speed = p.mask === 'WOLF' ? 6.8 : 5.8;
      p.vx = mx * speed;
      p.vy = my * speed;
    }

    // Substep movement & collision to completely prevent wall and closed door tunneling!
    const steps = p.isRolling ? 3 : 2;
    const subVx = p.vx / steps;
    const subVy = p.vy / steps;

    for (let s = 0; s < steps; s++) {
      p.x += subVx;
      this.resolveObstacleCollision(p, 20);

      p.y += subVy;
      this.resolveObstacleCollision(p, 20);
    }

    // High momentum combat roll can breach closed doors
    if (p.isRolling) {
      this.doors.forEach((door) => {
        const dist = Math.hypot(p.x - door.x, p.y - (door.y + door.h / 2));
        if (dist < 45 && !door.isOpen) {
          this.kickDoor(door, p.angle);
        }
      });
    }
  }

  // Returns all physical obstacles (walls, closed doors, open door leaf, and all room objects/props)
  public getSolidObstacles(): {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    isDoor?: boolean;
    isProp?: boolean;
    propType?: string;
  }[] {
    const obstacles: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isDoor?: boolean;
      isProp?: boolean;
      propType?: string;
    }[] = [];

    // All solid walls
    for (const wall of this.walls) {
      obstacles.push({
        x1: wall.x1,
        y1: wall.y1,
        x2: wall.x2,
        y2: wall.y2,
        isDoor: false,
      });
    }

    // Doors: BOTH closed doors AND open door leaves act as solid physical barriers!
    // "kapı açıldığında içinden geçilmesin": when door is open, the open door leaf itself cannot be passed through!
    for (const door of this.doors) {
      if (!door.isOpen) {
        // Closed door blocks the doorway opening
        obstacles.push({
          x1: door.x,
          y1: door.y,
          x2: door.x,
          y2: door.y + door.h,
          isDoor: true,
        });
      } else {
        // Open door leaf: the physical swung wooden slab itself is a solid obstacle!
        obstacles.push({
          x1: door.x,
          y1: door.y,
          x2: door.x + Math.sin(door.angle) * door.h,
          y2: door.y + Math.cos(door.angle) * door.h,
          isDoor: true,
        });
      }
    }

    // All Room Props (Billiard table, Bar counter, Sofas, Jukebox, Slot machines)
    // "etrafta bulunan objelerin içinden geçilmesin"
    for (const prop of this.props) {
      const minX = prop.x;
      const maxX = prop.x + prop.w;
      const minY = prop.y;
      const maxY = prop.y + prop.h;

      obstacles.push(
        { x1: minX, y1: minY, x2: maxX, y2: minY, isProp: true, propType: prop.type },
        { x1: maxX, y1: minY, x2: maxX, y2: maxY, isProp: true, propType: prop.type },
        { x1: maxX, y1: maxY, x2: minX, y2: maxY, isProp: true, propType: prop.type },
        { x1: minX, y1: maxY, x2: minX, y2: minY, isProp: true, propType: prop.type }
      );
    }

    return obstacles;
  }

  // Strict collision resolution against walls, doors (closed and open leaf), and all props
  public resolveObstacleCollision(entity: { x: number; y: number }, radius: number) {
    const obstacles = this.getSolidObstacles();
    for (const obs of obstacles) {
      const l2 = (obs.x2 - obs.x1) * (obs.x2 - obs.x1) + (obs.y2 - obs.y1) * (obs.y2 - obs.y1);
      if (l2 === 0) continue;

      let t = ((entity.x - obs.x1) * (obs.x2 - obs.x1) + (entity.y - obs.y1) * (obs.y2 - obs.y1)) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = obs.x1 + t * (obs.x2 - obs.x1);
      const projY = obs.y1 + t * (obs.y2 - obs.y1);

      const dx = entity.x - projX;
      const dy = entity.y - projY;
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        const overlap = radius - dist;
        if (dist > 0.0001) {
          entity.x += (dx / dist) * overlap;
          entity.y += (dy / dist) * overlap;
        } else {
          entity.x += radius;
        }
      }
    }

    // Strict AABB Box Collision for all room props (tables, bar, sofas, jukebox, slot machines)
    this.resolvePropCollision(entity, radius);
  }

  // Strict AABB solver to guarantee no entity ever clips into props
  public resolvePropCollision(entity: { x: number; y: number }, radius: number) {
    for (const prop of this.props) {
      const minX = prop.x;
      const maxX = prop.x + prop.w;
      const minY = prop.y;
      const maxY = prop.y + prop.h;

      // Find closest point on rectangle to circle center
      const closestX = Math.max(minX, Math.min(entity.x, maxX));
      const closestY = Math.max(minY, Math.min(entity.y, maxY));

      const dx = entity.x - closestX;
      const dy = entity.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = radius - dist;
          entity.x += (dx / dist) * overlap;
          entity.y += (dy / dist) * overlap;
        } else {
          // Inside the prop! Push out along shortest distance
          const dLeft = Math.abs(entity.x - minX);
          const dRight = Math.abs(maxX - entity.x);
          const dTop = Math.abs(entity.y - minY);
          const dBottom = Math.abs(maxY - entity.y);
          const minD = Math.min(dLeft, dRight, dTop, dBottom);

          if (minD === dLeft) entity.x = minX - radius;
          else if (minD === dRight) entity.x = maxX + radius;
          else if (minD === dTop) entity.y = minY - radius;
          else entity.y = maxY + radius;
        }
      }
    }
  }

  // Wall-only raycast: true if blocked by solid concrete walls
  public hasWallCollision(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const wall of this.walls) {
      if (this.lineIntersects(x1, y1, x2, y2, wall.x1, wall.y1, wall.x2, wall.y2)) {
        return true;
      }
    }
    return false;
  }

  // Door raycast: true if intersects closed doorway or open door leaf
  public hasDoorCollision(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const door of this.doors) {
      if (!door.isOpen) {
        if (this.lineIntersects(x1, y1, x2, y2, door.x, door.y, door.x, door.y + door.h)) {
          return true;
        }
      } else {
        const x2Leaf = door.x + Math.sin(door.angle) * door.h;
        const y2Leaf = door.y + Math.cos(door.angle) * door.h;
        if (this.lineIntersects(x1, y1, x2, y2, door.x, door.y, x2Leaf, y2Leaf)) {
          return true;
        }
      }
    }
    return false;
  }

  // Prop raycast: true if intersects or passes through any room objects / furniture
  public hasPropCollision(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const prop of this.props) {
      if (this.lineIntersectsAABB(x1, y1, x2, y2, prop.x, prop.y, prop.w, prop.h)) {
        return true;
      }
    }
    return false;
  }

  // Clear line of sight: returns true ONLY if completely unobstructed (no walls, no doors, no props)
  public hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    if (this.hasWallCollision(x1, y1, x2, y2)) return false;
    if (this.hasDoorCollision(x1, y1, x2, y2)) return false;
    if (this.hasPropCollision(x1, y1, x2, y2)) return false;
    return true;
  }

  private lineIntersectsAABB(x1: number, y1: number, x2: number, y2: number, bx: number, by: number, bw: number, bh: number): boolean {
    const minX = bx;
    const maxX = bx + bw;
    const minY = by;
    const maxY = by + bh;

    if ((x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) ||
        (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)) {
      return true;
    }

    return (
      this.lineIntersects(x1, y1, x2, y2, minX, minY, maxX, minY) ||
      this.lineIntersects(x1, y1, x2, y2, maxX, minY, maxX, maxY) ||
      this.lineIntersects(x1, y1, x2, y2, maxX, maxY, minX, maxY) ||
      this.lineIntersects(x1, y1, x2, y2, minX, maxY, minX, minY)
    );
  }

  private kickDoor(door: DoorEntity, kickAngle: number) {
    door.isOpen = true;
    door.swingSpeed = 0.35;
    door.isKicked = true;
    soundEngine.playDoorKick();
    this.camera.shake = 8;

    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: door.x,
        y: door.y + door.h / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 0,
        maxLife: 25,
        color: '#b45309',
        size: Math.random() * 3 + 2,
        alpha: 1,
      });
    }

    this.enemies.forEach((enemy) => {
      if (enemy.state === 'DEAD') return;
      const dist = Math.hypot(enemy.x - door.x, enemy.y - (door.y + door.h / 2));
      if (dist < 75) {
        this.knockdownEnemy(enemy);
      }
    });
  }

  private updateDoors() {
    this.doors.forEach((door) => {
      if (door.isOpen && door.angle < Math.PI / 2) {
        door.angle += door.swingSpeed;
      }
    });
  }

  private updateFlyingWeapons() {
    this.droppedWeapons.forEach((dw) => {
      if (dw.isFlying) {
        dw.x += dw.vx;
        dw.y += dw.vy;
        dw.vx *= 0.94;
        dw.vy *= 0.94;
        dw.angle += 0.25;

        if (Math.hypot(dw.vx, dw.vy) < 1) {
          dw.isFlying = false;
        }

        this.enemies.forEach((enemy) => {
          if (enemy.state === 'DEAD') return;
          const dist = Math.hypot(enemy.x - dw.x, enemy.y - dw.y);
          if (dist < 35) {
            this.knockdownEnemy(enemy);
            dw.isFlying = false;
          }
        });
      }
    });
  }

  private updateBullets() {
    this.bullets.forEach((b) => {
      const nextX = b.x + b.vx;
      const nextY = b.y + b.vy;

      // Obstacle collision check (strictly tests all walls AND closed doors)
      const obstacles = this.getSolidObstacles();
      let hitObstacle = false;

      for (const obs of obstacles) {
        if (this.lineIntersects(b.x, b.y, nextX, nextY, obs.x1, obs.y1, obs.x2, obs.y2)) {
          hitObstacle = true;
          b.life = 0; // Destroy bullet immediately - cannot pass through walls, doors, or props!

          if (obs.isDoor) {
            // Hit door: if closed, breach it open; if already open leaf, chip wood!
            const hitDoor = this.doors.find((d) => !d.isOpen && Math.abs(d.x - obs.x1) < 2);
            if (hitDoor) {
              this.kickDoor(hitDoor, Math.atan2(b.vy, b.vx));
            }
            for (let i = 0; i < 7; i++) {
              this.particles.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 0,
                maxLife: 18,
                color: i % 2 === 0 ? '#b45309' : '#f59e0b',
                size: Math.random() * 3 + 2,
                alpha: 1,
              });
            }
          } else if (obs.isProp) {
            // Hit furniture / room prop: cannot pass through!
            const pType = obs.propType;
            if (pType === 'BILLIARD_TABLE' || pType === 'BAR_COUNTER') {
              for (let i = 0; i < 6; i++) {
                this.particles.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  life: 0,
                  maxLife: 16,
                  color: '#92400e',
                  size: 2.5,
                  alpha: 1,
                });
              }
            } else if (pType === 'SOFA') {
              for (let i = 0; i < 6; i++) {
                this.particles.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 0,
                  maxLife: 14,
                  color: '#be123c',
                  size: 3,
                  alpha: 1,
                });
              }
            } else {
              // JUKEBOX or SLOT_MACHINE
              for (let i = 0; i < 6; i++) {
                this.particles.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  life: 0,
                  maxLife: 14,
                  color: i % 2 === 0 ? '#38bdf8' : '#facc15',
                  size: 2,
                  alpha: 1,
                });
              }
            }
          } else {
            // Hit concrete wall: rich ricochet sparks
            for (let i = 0; i < 5; i++) {
              this.particles.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 0,
                maxLife: 14,
                color: '#facc15',
                size: 2.5,
                alpha: 1,
              });
            }
          }
          break;
        }
      }

      if (hitObstacle) return;

      b.x = nextX;
      b.y = nextY;
      b.life--;

      // Hit enemies
      if (!b.isEnemy) {
        this.enemies.forEach((enemy) => {
          if (enemy.state === 'DEAD') return;
          const dist = Math.hypot(enemy.x - b.x, enemy.y - b.y);
          if (dist < 24) {
            b.life = 0;
            enemy.hp -= b.damage;
            if (enemy.hp <= 0) {
              this.killEnemy(enemy, Math.atan2(b.vy, b.vx));
            } else {
              soundEngine.playKatanaSlash();
              this.camera.shake = 5;
            }
          }
        });
      } else {
        const dist = Math.hypot(this.player.x - b.x, this.player.y - b.y);
        if (dist < 18 && !this.player.isRolling) {
          b.life = 0;
          this.player.hp -= b.damage;
          this.camera.shake = 14;
          soundEngine.playDoorKick();
          if (this.onStateUpdate) this.onStateUpdate(this.player);

          if (this.player.hp <= 0 && this.onGameOver) {
            this.onGameOver();
          }
        }
      }
    });

    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  private updateEnemies(dt: number) {
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'DEAD') return;

      if (enemy.state === 'KNOCKED_DOWN') {
        enemy.knockdownTimer--;
        if (enemy.knockdownTimer <= 0) {
          enemy.state = 'CHASE';
        }
        return;
      }

      const distToPlayer = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      const angleToPlayer = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);

      let angleDiff = Math.abs(enemy.angle - angleToPlayer);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      const inCone = angleDiff < Math.PI / 2.3 && distToPlayer < 480;

      // Separate collision tests:
      const wallBlocked = this.hasWallCollision(enemy.x, enemy.y, this.player.x, this.player.y);
      const doorBlocked = this.hasDoorCollision(enemy.x, enemy.y, this.player.x, this.player.y);
      const propBlocked = this.hasPropCollision(enemy.x, enemy.y, this.player.x, this.player.y);
      const clearLOS = !wallBlocked && !doorBlocked && !propBlocked;

      // Detection & State Transitions:
      if (!wallBlocked && inCone) {
        if (clearLOS) {
          // Direct, open sighting: Trigger full aggressive CHASE with RED !
          enemy.state = 'CHASE';
          enemy.alertTimer = 180;
          enemy.investigateTarget = null;
        } else if (doorBlocked || propBlocked) {
          // Spotted behind an object (prop) or behind a door:
          // "objelerin arkasından karakteri görürse sarı ünlem ile o tarafa pasif şekilde gider. kapının arkasında kalırsa da yine pasif şekilde kapının arkasında çıkar"
          if (enemy.state !== 'CHASE') {
            enemy.state = 'INVESTIGATE';
            enemy.investigateTarget = { x: this.player.x, y: this.player.y };
            enemy.investigateTimer = 180;
          }
        }
      }

      // If enemy was in active CHASE and player ducks behind an object or door:
      // "kapının arkasında kalırsa da yine pasif şekilde kapının arkasında çıkar"
      if (enemy.state === 'CHASE' && !clearLOS && (doorBlocked || propBlocked)) {
        enemy.state = 'INVESTIGATE';
        enemy.investigateTarget = { x: this.player.x, y: this.player.y };
        enemy.investigateTimer = 180;
      }

      if (enemy.state === 'CHASE') {
        if (clearLOS) {
          enemy.angle = angleToPlayer;

          if (enemy.weapon !== 'FISTS' && enemy.weapon !== 'BAT') {
            // Ranged firearm: Shoot ONLY if player is in direct line of sight!
            enemy.attackCooldown--;
            if (enemy.attackCooldown <= 0 && distToPlayer < 380) {
              enemy.attackCooldown = 55;
              this.bullets.push({
                x: enemy.x + Math.cos(enemy.angle) * 20,
                y: enemy.y + Math.sin(enemy.angle) * 20,
                vx: Math.cos(enemy.angle) * 16,
                vy: Math.sin(enemy.angle) * 16,
                damage: 25,
                isEnemy: true,
                life: 50,
                color: '#ef4444',
              });
              soundEngine.playMagnumShot();
            }
          } else {
            // Melee charge
            const speed = 4.0;
            enemy.x += Math.cos(angleToPlayer) * speed;
            enemy.y += Math.sin(angleToPlayer) * speed;

            if (distToPlayer < 35) {
              enemy.attackCooldown--;
              if (enemy.attackCooldown <= 0) {
                enemy.attackCooldown = 40;
                this.player.hp -= 20;
                this.camera.shake = 10;
                soundEngine.playDoorKick();
                if (this.onStateUpdate) this.onStateUpdate(this.player);
                if (this.player.hp <= 0 && this.onGameOver) this.onGameOver();
              }
            }
          }
        } else {
          // Lost clear LOS: switch to passive investigation
          enemy.state = 'INVESTIGATE';
          enemy.investigateTarget = { x: this.player.x, y: this.player.y };
          enemy.investigateTimer = 180;
        }

        // Breaches closed doors if bumping into them
        this.doors.forEach((door) => {
          if (!door.isOpen) {
            const dist = Math.hypot(enemy.x - door.x, enemy.y - (door.y + door.h / 2));
            if (dist < 40) {
              this.kickDoor(door, enemy.angle);
            }
          }
        });

      } else if (enemy.state === 'INVESTIGATE') {
        // PASSIVE INVESTIGATION (Sarı Ünlem ile o tarafa pasif şekilde gider / kapının arkasına çıkar)
        if (enemy.investigateTarget) {
          const distToTarget = Math.hypot(enemy.investigateTarget.x - enemy.x, enemy.investigateTarget.y - enemy.y);
          const angleToTarget = Math.atan2(enemy.investigateTarget.y - enemy.y, enemy.investigateTarget.x - enemy.x);
          enemy.angle = angleToTarget;

          // Pasif, temkinli yürüyüş hızı (Ateş etmez!)
          if (distToTarget > 22) {
            const passiveSpeed = 1.9;
            enemy.x += Math.cos(angleToTarget) * passiveSpeed;
            enemy.y += Math.sin(angleToTarget) * passiveSpeed;
          } else {
            // Hedefe ulaştı, etrafı arar
            if (enemy.investigateTimer) enemy.investigateTimer--;
            if (!enemy.investigateTimer || enemy.investigateTimer <= 0) {
              enemy.state = 'PATROL';
              enemy.investigateTarget = null;
            }
          }
        }

        // Kapının arkasına çıkarken kapalı kapıya denk gelirse tekmeler/açar
        this.doors.forEach((door) => {
          if (!door.isOpen) {
            const dist = Math.hypot(enemy.x - door.x, enemy.y - (door.y + door.h / 2));
            if (dist < 40) {
              this.kickDoor(door, enemy.angle);
            }
          }
        });

        // Araştırma sırasında karakterle doğrudan görüş açısı (clearLOS) yakalanırsa doğrudan CHASE (Kırmızı !) moduna geçer!
        if (clearLOS && inCone) {
          enemy.state = 'CHASE';
          enemy.alertTimer = 180;
        }

      } else {
        // PATROL state
        const targetPt = enemy.patrolPoints[enemy.currentPatrolIdx];
        const distPt = Math.hypot(targetPt.x - enemy.x, targetPt.y - enemy.y);
        if (distPt < 14) {
          enemy.currentPatrolIdx = (enemy.currentPatrolIdx + 1) % enemy.patrolPoints.length;
        } else {
          const moveAngle = Math.atan2(targetPt.y - enemy.y, targetPt.x - enemy.x);
          enemy.angle = moveAngle;
          enemy.x += Math.cos(moveAngle) * 2;
          enemy.y += Math.sin(moveAngle) * 2;
        }
      }

      // CRITICAL: Prevent enemy from walking through walls, open door leaves, and props!
      this.resolveObstacleCollision(enemy, 18);
    });
  }

  private updateCamera() {
    const lookaheadX = (this.mouse.worldX - this.player.x) * 0.25;
    const lookaheadY = (this.mouse.worldY - this.player.y) * 0.25;

    const isoX = (this.player.x + lookaheadX - (this.player.y + lookaheadY)) * 0.866;
    const isoY = (this.player.x + lookaheadX + (this.player.y + lookaheadY)) * 0.5;

    this.camera.x += (isoX - this.camera.x) * 0.1;
    this.camera.y += (isoY - this.camera.y) * 0.1;

    if (this.camera.shake > 0) {
      this.camera.shake *= 0.85;
      if (this.camera.shake < 0.2) this.camera.shake = 0;
    }
  }

  // --- RENDERING ---

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const shakeX = (Math.random() - 0.5) * this.camera.shake * 2;
    const shakeY = (Math.random() - 0.5) * this.camera.shake * 2;
    ctx.translate(w / 2 - this.camera.x + shakeX, h / 2 - this.camera.y + shakeY);

    // 1. Isometric Checkered Floor
    this.renderFloor(ctx);

    // 2. Decals & Casings
    this.renderDecals(ctx);

    // 3. Furniture Props
    this.renderProps(ctx);

    // 4. Dropped Weapons
    this.renderDroppedWeapons(ctx);

    // 5. Walls & Doors
    this.renderWallsAndDoors(ctx);

    // 6. Enemies
    this.renderEnemies(ctx);

    // 7. Player (WITH VISIBLE MASK ON HEAD!)
    this.renderPlayer(ctx);

    // 8. Katana Slash Trails
    this.renderSlashTrails(ctx);

    // 9. Bullets & Sparks
    this.renderBulletsAndParticles(ctx);

    // 10. Lighting
    this.renderLighting(ctx);

    ctx.restore();

    // 11. Retro Overlay & Reticle
    this.renderRetroOverlay(ctx);
    this.renderCrosshair(ctx);
  }

  private toIso(x: number, y: number) {
    return {
      x: (x - y) * 0.866,
      y: (x + y) * 0.5,
    };
  }

  private renderFloor(ctx: CanvasRenderingContext2D) {
    const tileSize = 60;
    const cols = 20;
    const rows = 18;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = 50 + c * tileSize;
        const wy = 50 + r * tileSize;

        const p1 = this.toIso(wx, wy);
        const p2 = this.toIso(wx + tileSize, wy);
        const p3 = this.toIso(wx + tileSize, wy + tileSize);
        const p4 = this.toIso(wx, wy + tileSize);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        const isAlternate = (r + c) % 2 === 0;
        ctx.fillStyle = isAlternate ? '#090d16' : '#17122b';
        ctx.fill();

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.09)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private renderDecals(ctx: CanvasRenderingContext2D) {
    this.bloodDecals.forEach((decal) => {
      const pos = this.toIso(decal.x, decal.y);
      ctx.save();
      ctx.fillStyle = decal.color;

      if (decal.type === 'POOL') {
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, decal.size * 1.5, decal.size * 0.8, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (decal.type === 'CASING') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(pos.x - 2, pos.y - 1, 4, 2);
      } else {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, decal.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  private renderProps(ctx: CanvasRenderingContext2D) {
    this.props.forEach((prop) => {
      const p1 = this.toIso(prop.x, prop.y);
      const p2 = this.toIso(prop.x + prop.w, prop.y);
      const p3 = this.toIso(prop.x + prop.w, prop.y + prop.h);
      const p4 = this.toIso(prop.x, prop.y + prop.h);

      ctx.save();

      // 1. Volumetric drop shadow on floor
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.moveTo(p1.x + 6, p1.y + 8);
      ctx.lineTo(p2.x + 10, p2.y + 8);
      ctx.lineTo(p3.x + 12, p3.y + 12);
      ctx.lineTo(p4.x + 8, p4.y + 12);
      ctx.closePath();
      ctx.fill();

      if (prop.type === 'BILLIARD_TABLE') {
        const height = 28;
        // 3D Wooden Cabinet Sides
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Top Raised Surface (Wooden Rails)
        const t1 = { x: p1.x, y: p1.y - height };
        const t2 = { x: p2.x, y: p2.y - height };
        const t3 = { x: p3.x, y: p3.y - height };
        const t4 = { x: p4.x, y: p4.y - height };

        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t4.x, t4.y);
        ctx.closePath();
        ctx.fill();

        // Recessed Green Cloth Bed
        const pad = 6;
        const c1 = { x: t1.x + pad, y: t1.y + pad * 0.5 };
        const c2 = { x: t2.x - pad, y: t2.y + pad * 0.5 };
        const c3 = { x: t3.x - pad, y: t3.y - pad * 0.5 };
        const c4 = { x: t4.x + pad, y: t4.y - pad * 0.5 };

        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.fill();

        // 6 Pockets
        ctx.fillStyle = '#022c22';
        [
          c1,
          c2,
          c3,
          c4,
          { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 },
          { x: (c4.x + c3.x) / 2, y: (c4.y + c3.y) / 2 },
        ].forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          ctx.fill();
        });

        // 3D Billiard Balls
        const midX = (c1.x + c3.x) / 2;
        const midY = (c1.y + c3.y) / 2;

        // White cue ball
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(midX - 20, midY - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 8-ball (black)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(midX + 10, midY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Red ball
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(midX + 16, midY - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Yellow ball
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(midX + 14, midY + 4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Gold Corner Caps
        ctx.fillStyle = '#facc15';
        [t1, t2, t3, t4].forEach((pt) => {
          ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
        });
      } else if (prop.type === 'BAR_COUNTER') {
        const height = 30;
        // Oak Counter Base
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Marble Countertop Surface
        const t1 = { x: p1.x, y: p1.y - height };
        const t2 = { x: p2.x, y: p2.y - height };
        const t3 = { x: p3.x, y: p3.y - height };
        const t4 = { x: p4.x, y: p4.y - height };

        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(t1.x - 2, t1.y - 1);
        ctx.lineTo(t2.x + 2, t2.y - 1);
        ctx.lineTo(t3.x + 2, t3.y + 1);
        ctx.lineTo(t4.x - 2, t4.y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Glowing bottles on the counter
        const bottles = [
          { color: '#06b6d4', offset: 0.2 },
          { color: '#ef4444', offset: 0.35 },
          { color: '#22c55e', offset: 0.5 },
          { color: '#f59e0b', offset: 0.65 },
        ];
        bottles.forEach((b) => {
          const bx = t1.x + (t2.x - t1.x) * b.offset;
          const by = t1.y + (t2.y - t1.y) * b.offset;

          // Glowing Aura
          ctx.fillStyle = `${b.color}40`;
          ctx.beginPath();
          ctx.arc(bx, by - 6, 8, 0, Math.PI * 2);
          ctx.fill();

          // Glass Bottle
          ctx.fillStyle = b.color;
          ctx.fillRect(bx - 2, by - 12, 4, 10);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(bx - 1, by - 14, 2, 2);
        });
      } else if (prop.type === 'JUKEBOX') {
        const height = 46;
        // 3D Cabinet Box
        ctx.fillStyle = '#311042';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Neon Arched Tubes
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc((p4.x + p3.x) / 2, p4.y - height + 10, 16, Math.PI, 0);
        ctx.stroke();

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc((p4.x + p3.x) / 2, p4.y - height + 10, 12, Math.PI, 0);
        ctx.stroke();

        // Animated Equalizer Frequency Bars
        const eqColors = ['#f43f5e', '#fbbf24', '#34d399', '#38bdf8'];
        const barBaseX = (p4.x + p3.x) / 2 - 10;
        const barBaseY = p4.y - 12;
        const now = performance.now() * 0.005;

        for (let i = 0; i < 4; i++) {
          const barH = 5 + Math.abs(Math.sin(now + i * 1.2)) * 14;
          ctx.fillStyle = eqColors[i];
          ctx.fillRect(barBaseX + i * 5, barBaseY - barH, 4, barH);
        }
      } else if (prop.type === 'SOFA') {
        const height = 26;
        // 3D Chesterfield Sofa Base
        ctx.fillStyle = '#4c0519';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#881337';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Backrest and Armrest Cushions
        const t1 = { x: p1.x, y: p1.y - height };
        const t2 = { x: p2.x, y: p2.y - height };
        const t3 = { x: p3.x, y: p3.y - height };
        const t4 = { x: p4.x, y: p4.y - height };

        ctx.fillStyle = '#9f1239';
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t4.x, t4.y);
        ctx.closePath();
        ctx.fill();

        // High Tufted Backrest
        ctx.fillStyle = '#be123c';
        ctx.fillRect(t1.x, t1.y - 14, Math.max(10, (t2.x - t1.x) * 0.95), 14);

        // Gold studs / tuft buttons
        ctx.fillStyle = '#facc15';
        for (let s = 0; s < 5; s++) {
          const sx = t1.x + ((t2.x - t1.x) * (s + 1)) / 6;
          ctx.fillRect(sx, t1.y - 8, 2, 2);
        }
      } else if (prop.type === 'SLOT_MACHINE') {
        const height = 48;
        // Arcade Cabinet
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#312e81';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Glowing 777 Marquee
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(p4.x - 2, p4.y - height + 4, 18, 10);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('777', p4.x + 2, p4.y - height + 12);

        // Spinning Reels
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(p4.x - 2, p4.y - height + 16, 18, 14);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(p4.x, p4.y - height + 18, 4, 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(p4.x + 5, p4.y - height + 18, 4, 10);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(p4.x + 10, p4.y - height + 18, 4, 10);
      }

      ctx.restore();
    });
  }

  private renderWallsAndDoors(ctx: CanvasRenderingContext2D) {
    const wallHeight = 65;
    const thickness = 16;

    // 1. Render all 3D Walls with extruded volume, top beveled caps, and drop shadows
    this.walls.forEach((wall) => {
      const dx = wall.x2 - wall.x1;
      const dy = wall.y2 - wall.y1;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;

      const nx = -(dy / len) * (thickness / 2);
      const ny = (dx / len) * (thickness / 2);

      // Base 4 points on the ground plane in isometric space
      const p1a = this.toIso(wall.x1 - nx, wall.y1 - ny);
      const p2a = this.toIso(wall.x2 - nx, wall.y2 - ny);
      const p2b = this.toIso(wall.x2 + nx, wall.y2 + ny);
      const p1b = this.toIso(wall.x1 + nx, wall.y1 + ny);

      // Top 4 points raised by wallHeight
      const t1a = { x: p1a.x, y: p1a.y - wallHeight };
      const t2a = { x: p2a.x, y: p2a.y - wallHeight };
      const t2b = { x: p2b.x, y: p2b.y - wallHeight };
      const t1b = { x: p1b.x, y: p1b.y - wallHeight };

      ctx.save();

      // Ambient Occlusion / Drop Shadow onto the floor
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.moveTo(p1a.x, p1a.y + 4);
      ctx.lineTo(p2a.x, p2a.y + 4);
      ctx.lineTo(p2b.x + 10, p2b.y + 10);
      ctx.lineTo(p1b.x + 10, p1b.y + 10);
      ctx.closePath();
      ctx.fill();

      // Side Face A (Shadow side)
      ctx.fillStyle = '#0a0f1d';
      ctx.beginPath();
      ctx.moveTo(p1a.x, p1a.y);
      ctx.lineTo(p2a.x, p2a.y);
      ctx.lineTo(t2a.x, t2a.y);
      ctx.lineTo(t1a.x, t1a.y);
      ctx.closePath();
      ctx.fill();

      // Front Face B (Lit side facing screen)
      const litGrad = ctx.createLinearGradient(0, t1b.y, 0, p1b.y);
      litGrad.addColorStop(0, '#1e293b');
      litGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = litGrad;

      ctx.beginPath();
      ctx.moveTo(p1b.x, p1b.y);
      ctx.lineTo(p2b.x, p2b.y);
      ctx.lineTo(t2b.x, t2b.y);
      ctx.lineTo(t1b.x, t1b.y);
      ctx.closePath();
      ctx.fill();

      // Vertical sci-fi panel grooves
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      const numSeams = Math.floor(len / 60);
      for (let i = 1; i < numSeams; i++) {
        const ratio = i / numSeams;
        const sx = p1b.x + (p2b.x - p1b.x) * ratio;
        const sy = p1b.y + (p2b.y - p1b.y) * ratio;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - wallHeight);
        ctx.stroke();
      }

      // Glowing Neon Cyan Baseboard Line
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p1b.x, p1b.y);
      ctx.lineTo(p2b.x, p2b.y);
      ctx.stroke();

      // End Caps
      ctx.fillStyle = '#151d2f';
      ctx.beginPath();
      ctx.moveTo(p2a.x, p2a.y);
      ctx.lineTo(p2b.x, p2b.y);
      ctx.lineTo(t2b.x, t2b.y);
      ctx.lineTo(t2a.x, t2a.y);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(p1a.x, p1a.y);
      ctx.lineTo(p1b.x, p1b.y);
      ctx.lineTo(t1b.x, t1b.y);
      ctx.lineTo(t1a.x, t1a.y);
      ctx.closePath();
      ctx.fill();

      // Top Cap (The Roof Ledge in 3D)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(t1a.x, t1a.y);
      ctx.lineTo(t2a.x, t2a.y);
      ctx.lineTo(t2b.x, t2b.y);
      ctx.lineTo(t1b.x, t1b.y);
      ctx.closePath();
      ctx.fill();

      // Inner Ledge Tone
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      const shrink = 2;
      ctx.moveTo(t1a.x + shrink, t1a.y + shrink);
      ctx.lineTo(t2a.x - shrink, t2a.y + shrink);
      ctx.lineTo(t2b.x - shrink, t2b.y - shrink);
      ctx.lineTo(t1b.x + shrink, t1b.y - shrink);
      ctx.closePath();
      ctx.fill();

      // Luminous Neon Top Trim Edge
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t1a.x, t1a.y);
      ctx.lineTo(t2a.x, t2a.y);
      ctx.lineTo(t2b.x, t2b.y);
      ctx.lineTo(t1b.x, t1b.y);
      ctx.closePath();
      ctx.stroke();

      // Top Cap Corner Rivets
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(t1a.x - 2, t1a.y - 2, 4, 4);
      ctx.fillRect(t2a.x - 2, t2a.y - 2, 4, 4);
      ctx.fillRect(t2b.x - 2, t2b.y - 2, 4, 4);
      ctx.fillRect(t1b.x - 2, t1b.y - 2, 4, 4);

      ctx.restore();
    });

    // 2. Render all 3D Doors with wooden slabs, brass handles, jambs, and breach prompts
    this.doors.forEach((door) => {
      const p1 = this.toIso(door.x, door.y);
      const p2 = this.toIso(
        door.x + Math.sin(door.angle) * door.h,
        door.y + Math.cos(door.angle) * door.h
      );

      ctx.save();

      // 3D Doorway Posts / Jambs on both sides of opening
      const postH = 65;
      const leftPost = this.toIso(door.x, door.y);
      const rightPost = this.toIso(door.x, door.y + door.h);

      // Left post
      ctx.fillStyle = '#334155';
      ctx.fillRect(leftPost.x - 4, leftPost.y - postH, 8, postH);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(leftPost.x - 5, leftPost.y - postH, 10, 4);

      // Right post
      ctx.fillStyle = '#334155';
      ctx.fillRect(rightPost.x - 4, rightPost.y - postH, 8, postH);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(rightPost.x - 5, rightPost.y - postH, 10, 4);

      // Render Door Leaf in 3D
      const doorH = 58;

      if (!door.isOpen) {
        // --- CLOSED 3D DOOR SLAB ---
        // Floor drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(p1.x - 3, p1.y, 6, p2.y - p1.y);

        // Volumetric Wood Slab
        const woodGrad = ctx.createLinearGradient(p1.x, p1.y - doorH, p2.x, p2.y);
        woodGrad.addColorStop(0, '#92400e');
        woodGrad.addColorStop(0.5, '#78350f');
        woodGrad.addColorStop(1, '#451a03');

        ctx.fillStyle = woodGrad;
        ctx.beginPath();
        ctx.moveTo(p1.x - 6, p1.y);
        ctx.lineTo(p2.x - 6, p2.y);
        ctx.lineTo(p2.x - 6, p2.y - doorH);
        ctx.lineTo(p1.x - 6, p1.y - doorH);
        ctx.closePath();
        ctx.fill();

        // 3D Beveled Front Face
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(p1.x + 2, p1.y);
        ctx.lineTo(p2.x + 2, p2.y);
        ctx.lineTo(p2.x + 2, p2.y - doorH);
        ctx.lineTo(p1.x + 2, p1.y - doorH);
        ctx.closePath();
        ctx.fill();

        // Recessed Wood Inlay Panels
        ctx.fillStyle = '#3e1a06';
        const midY = (p1.y + p2.y) / 2;
        ctx.fillRect(p1.x - 2, p1.y - doorH + 10, 6, 18);
        ctx.fillRect(p1.x - 2, midY - 10, 6, 22);

        // Polished Golden Brass Handle & Lock Plate
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(p1.x + 3, midY - 6, 8, 5);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(p1.x + 7, midY - 7, 4, 3);

        // Steel Reinforcement Kickplate at bottom
        ctx.fillStyle = '#475569';
        ctx.fillRect(p1.x - 4, p2.y - 12, 10, 8);

        // Golden Outline
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p1.x - 6, p1.y - doorH, 10, doorH);

        // Floating 3D Interaction Prompt if player is near
        const distToPlayer = Math.hypot(this.player.x - door.x, this.player.y - (door.y + door.h / 2));
        if (distToPlayer < 75) {
          const promptY = p1.y - doorH - 22;
          ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(p1.x - 55, promptY, 110, 22, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚪 [E]: KAPIYI KIR', p1.x, promptY + 15);
        }
      } else {
        // --- OPEN / BREACHED SWUNG 3D DOOR LEAF ---
        // Arc floor trail of kicked door
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, Math.hypot(p2.x - p1.x, p2.y - p1.y), 0, door.angle);
        ctx.stroke();
        ctx.setLineDash([]);

        // Swung 3D Door Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y + 4);
        ctx.lineTo(p2.x, p2.y + 4);
        ctx.lineTo(p2.x + 8, p2.y + 10);
        ctx.lineTo(p1.x + 8, p1.y + 10);
        ctx.closePath();
        ctx.fill();

        // 3D Door Thickness
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x, p2.y - doorH);
        ctx.lineTo(p1.x, p1.y - doorH);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y - doorH);
        ctx.lineTo(p2.x, p2.y - doorH);
        ctx.stroke();

        // Golden Handle on swung door
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(p2.x - 3, p2.y - doorH / 2, 6, 6);
      }

      ctx.restore();
    });
  }

  private renderDroppedWeapons(ctx: CanvasRenderingContext2D) {
    this.droppedWeapons.forEach((dw) => {
      const pos = this.toIso(dw.x, dw.y);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(dw.angle);

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-10, 2, 20, 6);

      ctx.fillStyle = WEAPON_DEFS[dw.type].color;
      ctx.fillRect(-10, -3, 20, 6);

      if (dw.ammo > 0) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(4, -2, 3, 3);
      }

      ctx.restore();
    });
  }

  // --- PLAYER RENDERING WITH VISIBLE MASKS ON HEAD ---
  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const pos = this.toIso(p.x, p.y);

    ctx.save();
    ctx.translate(pos.x, pos.y - 15);

    if (p.isRolling) {
      ctx.rotate(p.rollTimer * 0.45);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trenchcoat Tails
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    const coatAngle = p.angle + Math.PI;
    ctx.moveTo(Math.cos(coatAngle - 0.5) * 14, Math.sin(coatAngle - 0.5) * 14);
    ctx.lineTo(Math.cos(coatAngle) * 26, Math.sin(coatAngle) * 26);
    ctx.lineTo(Math.cos(coatAngle + 0.5) * 14, Math.sin(coatAngle + 0.5) * 14);
    ctx.closePath();
    ctx.fill();

    // Trenchcoat Body
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Runic Lapel
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 15, p.angle - 0.7, p.angle + 0.7);
    ctx.stroke();

    // Head Base
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(0, -5, 9, 0, Math.PI * 2);
    ctx.fill();

    // --- VISIBLE RUNIC MASKS ON HEAD ---
    if (p.mask === 'WOLF') {
      // Werewolf Fur Hood & Pointed Wolf Ears & Glowing Amber Eyes!
      ctx.fillStyle = '#78350f'; // Brown-orange wolf fur
      ctx.beginPath();
      ctx.arc(0, -6, 11, 0, Math.PI * 2);
      ctx.fill();

      // Left & Right Pointed Wolf Ears
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-9, -12);
      ctx.lineTo(-5, -20);
      ctx.lineTo(-1, -13);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(1, -13);
      ctx.lineTo(5, -20);
      ctx.lineTo(9, -12);
      ctx.closePath();
      ctx.fill();

      // Glowing Wolf Eyes
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-5, -7, 3, 2.5);
      ctx.fillRect(2, -7, 3, 2.5);
    } else if (p.mask === 'VAMPIRE') {
      // Neon Magenta Vampire Shades & Slick Black Hair & Cape Collar!
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, -9, 9, Math.PI, 0); // Slicked hair
      ctx.fill();

      // Glowing Vampire Sunglasses
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(-7, -7, 6, 3.5);
      ctx.fillRect(1, -7, 6, 3.5);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-1, -6, 2, 1.5); // Bridge
    } else if (p.mask === 'MINOTAUR') {
      // Minotaur Helmet with Curved Golden Horns!
      ctx.fillStyle = '#15803d'; // Heavy armor helmet
      ctx.beginPath();
      ctx.arc(0, -6, 10, 0, Math.PI * 2);
      ctx.fill();

      // Left Horn
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.quadraticCurveTo(-16, -15, -12, -22);
      ctx.stroke();

      // Right Horn
      ctx.beginPath();
      ctx.moveTo(7, -7);
      ctx.quadraticCurveTo(16, -15, 12, -22);
      ctx.stroke();

      // Metal Visor Slit
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(-5, -6, 10, 2);
    } else if (p.mask === 'ELF') {
      // Elf Long Pointed Ears & Glowing Forehead Circlet!
      ctx.fillStyle = '#0284c7';
      // Left Long Pointed Ear
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.lineTo(-17, -8);
      ctx.lineTo(-7, -2);
      ctx.closePath();
      ctx.fill();

      // Right Long Pointed Ear
      ctx.beginPath();
      ctx.moveTo(7, -5);
      ctx.lineTo(17, -8);
      ctx.lineTo(7, -2);
      ctx.closePath();
      ctx.fill();

      // Glowing Forehead Runic Gem
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, -9, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Weapon held in hand
    ctx.rotate(p.angle);
    ctx.fillStyle = p.weapon.color;
    if (p.weapon.isRanged) {
      ctx.fillRect(8, 4, 18, 5);
      if (this.muzzleFlashTimer > 0) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(28, 6, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillRect(6, 6, 28, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(4, 5, 4, 6);
    }

    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    this.enemies.forEach((enemy) => {
      const pos = this.toIso(enemy.x, enemy.y);

      ctx.save();
      ctx.translate(pos.x, pos.y - 12);

      if (enemy.state === 'DEAD') {
        // Dead body on floor with blood pool
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 8, 18, 9, enemy.angle, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3f0c0c';
        ctx.beginPath();
        ctx.ellipse(0, 6, 16, 8, enemy.angle, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      if (enemy.state === 'KNOCKED_DOWN') {
        // Knocked down state
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 8, 18, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, 6, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Execution Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-75, -28, 150, 20, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💀 BAYGIN [SPACE: İNFAZ]', 0, -14);
        ctx.restore();
        return;
      }

      // 1. Isometric Ground Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 15, enemy.race === 'BOSS_JACK' ? 24 : 14, enemy.race === 'BOSS_JACK' ? 12 : 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Vision / Flashlight Cone
      // 2. Vision / Flashlight Cone
      const coneColor = enemy.state === 'CHASE'
        ? 'rgba(239, 68, 68, 0.18)'
        : enemy.state === 'INVESTIGATE'
        ? 'rgba(250, 204, 21, 0.16)'
        : 'rgba(239, 68, 68, 0.05)';

      ctx.fillStyle = coneColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 160, enemy.angle - 0.45, enemy.angle + 0.45);
      ctx.closePath();
      ctx.fill();

      // 3. Alert Status Icon above head (Red ! for Chase, Yellow ! for Investigate behind props/doors)
      if (enemy.state === 'CHASE') {
        // RED exclamation mark for active aggressive chase
        ctx.fillStyle = '#ef4444';
        ctx.font = '900 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 0, enemy.race === 'BOSS_JACK' ? -36 : -26);
      } else if (enemy.state === 'INVESTIGATE') {
        // YELLOW exclamation mark for passive suspicious investigation
        ctx.fillStyle = '#facc15';
        ctx.font = '900 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 0, enemy.race === 'BOSS_JACK' ? -36 : -26);

        // Pulsing amber halo around the yellow exclamation mark
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, enemy.race === 'BOSS_JACK' ? -31 : -21, 9, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Volumetric 3D Character Body by Race
      if (enemy.race === 'ORC_BOUNCER') {
        // Hulking Orc Bouncer (Green skin, spiked pauldrons, tusks)
        ctx.fillStyle = '#14532d'; // Shadow side
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#16a34a'; // Lit torso
        ctx.beginPath();
        ctx.arc(0, -3, 16, 0, Math.PI * 2);
        ctx.fill();

        // Shoulder pads
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-20, -10, 8, 18);
        ctx.fillRect(12, -10, 8, 18);

        // Tusks
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-4, -12, 2, 4);
        ctx.fillRect(2, -12, 2, 4);
      } else if (enemy.race === 'VAMPIRE_HITMAN') {
        // Vampire Hitman (Crimson eyes, stylish black mafia trenchcoat)
        ctx.fillStyle = '#3b0764';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Slicked hair
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -5, 10, Math.PI, 0);
        ctx.fill();

        // Glowing red vampire shades
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-6, -6, 5, 3);
        ctx.fillRect(1, -6, 5, 3);
      } else if (enemy.race === 'BOSS_JACK') {
        // Werewolf Mob Boss "Big Claw" Jack
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, -4, 22, 0, Math.PI * 2);
        ctx.fill();

        // Spiked boss coat
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-18, -10, 36, 20);

        // Gold mafia medallion chain
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -2, 12, 0, Math.PI);
        ctx.stroke();

        // Werewolf Red Eyes
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-8, -12, 5, 3);
        ctx.fillRect(3, -12, 5, 3);
      } else {
        // Goblin Gunner (Small, green, purple bandana, quick)
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(0, -2, 10, 0, Math.PI * 2);
        ctx.fill();

        // Purple bandana
        ctx.fillStyle = '#9333ea';
        ctx.fillRect(-8, -9, 16, 5);

        // Pointed goblin ears
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(-10, -3);
        ctx.lineTo(-16, -5);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(10, -3);
        ctx.lineTo(16, -5);
        ctx.lineTo(9, 0);
        ctx.closePath();
        ctx.fill();
      }

      // Weapon held in hand with directional angle
      ctx.rotate(enemy.angle);
      ctx.fillStyle = WEAPON_DEFS[enemy.weapon].color;
      ctx.fillRect(8, 4, 16, 5);

      ctx.restore();
    });
  }

  private renderSlashTrails(ctx: CanvasRenderingContext2D) {
    this.slashTrail.forEach((t) => {
      const pos = this.toIso(t.x, t.y);
      ctx.save();
      ctx.translate(pos.x, pos.y - 15);
      ctx.rotate(t.angle);

      ctx.strokeStyle = `rgba(6, 182, 212, ${t.alpha * 0.7})`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 48, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.stroke();

      ctx.restore();
    });
  }

  private renderBulletsAndParticles(ctx: CanvasRenderingContext2D) {
    this.bullets.forEach((b) => {
      const pos = this.toIso(b.x, b.y);
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 15, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - 15);
      ctx.lineTo(pos.x - (b.vx - b.vy) * 0.866, pos.y - 15 - (b.vx + b.vy) * 0.5);
      ctx.stroke();

      ctx.restore();
    });

    this.particles.forEach((part) => {
      const pos = this.toIso(part.x, part.y);
      ctx.save();
      ctx.globalAlpha = part.alpha;
      ctx.fillStyle = part.color;
      ctx.fillRect(pos.x, pos.y - 12, part.size, part.size);
      ctx.restore();
    });
  }

  private renderLighting(ctx: CanvasRenderingContext2D) {
    const pPos = this.toIso(this.player.x, this.player.y);

    if (this.muzzleFlashTimer > 0) {
      const flashGrad = ctx.createRadialGradient(pPos.x, pPos.y, 10, pPos.x, pPos.y, 280);
      flashGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      flashGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(pPos.x, pPos.y, 280, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    const lightAngle = this.player.angle;
    const isoDirX = (Math.cos(lightAngle) - Math.sin(lightAngle)) * 0.866;
    const isoDirY = (Math.cos(lightAngle) + Math.sin(lightAngle)) * 0.5;
    const isoAngle = Math.atan2(isoDirY, isoDirX);

    const flashlightGrad = ctx.createRadialGradient(pPos.x, pPos.y, 20, pPos.x, pPos.y, 350);
    flashlightGrad.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
    flashlightGrad.addColorStop(0.7, 'rgba(6, 182, 212, 0.06)');
    flashlightGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

    ctx.fillStyle = flashlightGrad;
    ctx.beginPath();
    ctx.moveTo(pPos.x, pPos.y - 15);
    ctx.arc(pPos.x, pPos.y - 15, 350, isoAngle - 0.55, isoAngle + 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderRetroOverlay(ctx: CanvasRenderingContext2D) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1.5);
    }

    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.65);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  private renderCrosshair(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.mouse.x - 16, this.mouse.y);
    ctx.lineTo(this.mouse.x + 16, this.mouse.y);
    ctx.moveTo(this.mouse.x, this.mouse.y - 16);
    ctx.lineTo(this.mouse.x, this.mouse.y + 16);
    ctx.stroke();

    ctx.restore();
  }

  private lineIntersects(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
}
