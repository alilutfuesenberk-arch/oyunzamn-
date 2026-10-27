import {
  WeaponType,
  WeaponData,
  EnemyEntity,
  DoorEntity,
  DroppedWeapon,
  BloodDecal,
  BloodDecalType,
  PixelBloodBlock,
  RunicMaskId,
  PlayerIsometricState,
  DestructibleProp,
  ShellCasing,
  BloodyFootprint,
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
  public destructibles: DestructibleProp[] = [];
  public shellCasings: ShellCasing[] = [];
  public footprints: BloodyFootprint[] = [];
  private playerFootstepTimer: number = 0;
  private playerStepFoot: boolean = false;

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

    // Destructible Environmental Objects (Saksı, Lamba, Cam Masa)
    this.destructibles = [
      // Saksılar (Terracotta Plant Pots)
      { id: 101, x: 90, y: 80, w: 26, h: 26, type: 'PLANT_POT', hp: 1, isBroken: false },
      { id: 102, x: 400, y: 80, w: 26, h: 26, type: 'PLANT_POT', hp: 1, isBroken: false },
      { id: 103, x: 400, y: 600, w: 26, h: 26, type: 'PLANT_POT', hp: 1, isBroken: false },
      { id: 104, x: 90, y: 980, w: 26, h: 26, type: 'PLANT_POT', hp: 1, isBroken: false },
      { id: 105, x: 1200, y: 980, w: 26, h: 26, type: 'PLANT_POT', hp: 1, isBroken: false },

      // Lambalar (Art-Deco Floor Lamps)
      { id: 201, x: 490, y: 90, w: 22, h: 22, type: 'FLOOR_LAMP', hp: 1, isBroken: false },
      { id: 202, x: 790, y: 90, w: 22, h: 22, type: 'FLOOR_LAMP', hp: 1, isBroken: false },
      { id: 203, x: 780, y: 680, w: 22, h: 22, type: 'FLOOR_LAMP', hp: 1, isBroken: false },
      { id: 204, x: 890, y: 90, w: 22, h: 22, type: 'FLOOR_LAMP', hp: 1, isBroken: false },
      { id: 205, x: 1200, y: 90, w: 22, h: 22, type: 'FLOOR_LAMP', hp: 1, isBroken: false },

      // Cam Masalar (Tempered Glass Coffee Tables)
      { id: 301, x: 260, y: 480, w: 46, h: 32, type: 'GLASS_TABLE', hp: 1, isBroken: false },
      { id: 302, x: 980, y: 250, w: 48, h: 32, type: 'GLASS_TABLE', hp: 1, isBroken: false },
      { id: 303, x: 980, y: 750, w: 48, h: 32, type: 'GLASS_TABLE', hp: 1, isBroken: false },
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
    soundEngine.playReloadSlide();
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
      // Tactical dry-fire click & reload prompt if empty chamber
      if (w.ammo <= 0) {
        soundEngine.playDryFire();
        this.reloadWeapon();
        return;
      }

      w.ammo--;
      this.player.attackCooldown = w.fireRate;
      this.camera.shake = w.type === 'SHOTGUN' ? 12 : w.type === 'MAGNUM' ? 9 : 5;
      this.muzzleFlashTimer = 5;

      // Realistic kinetic firearm recoil kickback
      const recoilDist = w.type === 'SHOTGUN' ? 2.8 : w.type === 'MAGNUM' ? 1.6 : 0.8;
      this.player.x -= Math.cos(this.player.angle) * recoilDist;
      this.player.y -= Math.sin(this.player.angle) * recoilDist;
      this.resolveObstacleCollision(this.player, 20);

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

      // Realistic 3D Bouncing Brass Shell Casing
      this.spawnCasing(this.player.x, this.player.y, this.player.angle, w.type as 'MAGNUM' | 'SHOTGUN' | 'SMG');

      // Expanding Muzzle Gunsmoke Cloud at barrel tip
      this.spawnGunsmoke(
        this.player.x + Math.cos(this.player.angle) * 26,
        this.player.y + Math.sin(this.player.angle) * 26,
        this.player.angle
      );
    } else {
      // Katana or Bat Melee
      this.player.attackCooldown = w.fireRate;
      soundEngine.playKatanaSlash();
      this.camera.shake = 5;

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
          this.hitstopTimer = 4; // Impact freeze frame
          if (w.type === 'KATANA') {
            this.killEnemy(enemy, slashAngle);
          } else {
            this.spawnDamageBlood(enemy.x, enemy.y, slashAngle, 1.2);
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

      // Shattering destructible objects with melee strikes (saksı, lamba, cam masa)
      this.destructibles.forEach((destr) => {
        if (!destr.isBroken) {
          const cx = destr.x + destr.w / 2;
          const cy = destr.y + destr.h / 2;
          const dist = Math.hypot(this.player.x - cx, this.player.y - cy);
          if (dist < reach + 20) {
            this.breakDestructible(destr, slashAngle);
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
    this.killEnemy(enemy, this.player.angle, true);
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

  private addBloodDecal(decal: BloodDecal) {
    this.bloodDecals.push(decal);
    // Keep up to 1800 decals permanently painted across the nightclub floor
    if (this.bloodDecals.length > 1800) {
      this.bloodDecals.shift();
    }
  }

  // Generate 90s crunchy pixel clusters for blood decals
  private createPixelCluster(width: number, height: number, density: number, colors: string[]): PixelBloodBlock[] {
    const blocks: PixelBloodBlock[] = [];
    const step = 3; // 3px virtual pixel snap for authentic 90s arcade look
    const halfW = width / 2;
    const halfH = height / 2;

    for (let x = -halfW; x <= halfW; x += step) {
      for (let y = -halfH; y <= halfH; y += step) {
        const distNorm = (x * x) / (halfW * halfW) + (y * y) / (halfH * halfH);
        if (distNorm <= 1.0 && Math.random() < density) {
          const color =
            distNorm < 0.4
              ? colors[colors.length - 1] // Dark coagulated center
              : distNorm < 0.75
              ? colors[Math.min(1, colors.length - 1)]
              : colors[0]; // Arterial rim

          blocks.push({
            dx: Math.round(x),
            dy: Math.round(y),
            w: step,
            h: step,
            color,
          });
        }
      }
    }
    return blocks;
  }

  // Directional arterial spray streak
  private createPixelSprayBlocks(length: number, angle: number): PixelBloodBlock[] {
    const blocks: PixelBloodBlock[] = [];
    const step = 3;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const normCos = -sinA;
    const normSin = cosA;

    const colors = ['#dc2626', '#b91c1c', '#7f1d1d', '#450a0a'];
    const numSteps = Math.floor(length / step);

    for (let i = 0; i < numSteps; i++) {
      const dist = i * step;
      const spread = (Math.random() - 0.5) * (dist * 0.35 + 4);
      const px = Math.round(cosA * dist + normCos * spread);
      const py = Math.round(sinA * dist + normSin * spread);

      const w = Math.random() > 0.4 ? 3 : 4;
      const h = Math.random() > 0.4 ? 3 : 2;
      const colIdx = Math.min(colors.length - 1, Math.floor(Math.random() * colors.length));

      blocks.push({
        dx: px,
        dy: py,
        w,
        h,
        color: colors[colIdx],
      });
    }
    return blocks;
  }

  // 1. When a character or enemy is INJURED (shot or struck non-lethally)
  public spawnDamageBlood(x: number, y: number, hitAngle: number, intensity: number = 1.0) {
    soundEngine.playBloodSplat();

    // Floor dripping pixel puddle beneath wounded character
    const poolBlocks = this.createPixelCluster(
      14 * intensity,
      10 * intensity,
      0.85,
      ['#dc2626', '#991b1b', '#450a0a']
    );
    this.addBloodDecal({
      x,
      y,
      size: 10 * intensity,
      color: '#991b1b',
      type: 'PIXEL_POOL',
      blocks: poolBlocks,
    });

    // Directional arterial spray splatters shooting outward along hit direction
    const sprayCount = Math.floor(4 * intensity);
    for (let i = 0; i < sprayCount; i++) {
      const sprayAngle = hitAngle + (Math.random() - 0.5) * 0.9;
      const sprayLen = Math.random() * 28 + 14;
      const sprayBlocks = this.createPixelSprayBlocks(sprayLen, sprayAngle);
      this.addBloodDecal({
        x: x + Math.cos(sprayAngle) * 6,
        y: y + Math.sin(sprayAngle) * 6,
        size: sprayLen,
        color: '#dc2626',
        type: 'PIXEL_SPRAY',
        angle: sprayAngle,
        blocks: sprayBlocks,
      });
    }

    // Crunchy scattered pixel droplets
    const dropCount = Math.floor(6 * intensity);
    for (let i = 0; i < dropCount; i++) {
      const dist = Math.random() * 32 + 8;
      const ang = hitAngle + (Math.random() - 0.5) * 1.5;
      const dropBlocks = this.createPixelCluster(6, 6, 0.9, ['#ef4444', '#b91c1c']);
      this.addBloodDecal({
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        size: 5,
        color: '#b91c1c',
        type: 'PIXEL_SPLATTER',
        blocks: dropBlocks,
      });
    }

    // High-velocity airborne blood particles
    const particleCount = Math.floor(10 * intensity);
    for (let i = 0; i < particleCount; i++) {
      const pAngle = hitAngle + (Math.random() - 0.5) * 1.2;
      const pSpeed = Math.random() * 6 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        life: 0,
        maxLife: 16,
        color: i % 2 === 0 ? '#dc2626' : '#991b1b',
        size: Math.random() * 2.5 + 2,
        alpha: 1,
      });
    }
  }

  // 2. When an entity is KILLED or EXECUTED (Ultra-Violent 90s Arcade Gore Explosion)
  public spawnDeathGoreExplosion(x: number, y: number, lethalAngle: number, isExecution: boolean = false) {
    soundEngine.playBloodSplat();
    const multiplier = isExecution ? 1.6 : 1.2;

    // A. Massive multi-stepped pixelated death pool under the corpse
    const deathPoolBlocks = this.createPixelCluster(
      36 * multiplier,
      24 * multiplier,
      0.92,
      ['#dc2626', '#b91c1c', '#7f1d1d', '#450a0a', '#3f0c0c']
    );
    this.addBloodDecal({
      x,
      y,
      size: 28 * multiplier,
      color: '#450a0a',
      type: 'PIXEL_POOL',
      blocks: deathPoolBlocks,
    });

    // B. High-velocity arterial spray arcs radiating along lethal blow trajectory
    const sprayCount = isExecution ? 10 : 7;
    for (let i = 0; i < sprayCount; i++) {
      const sprayAngle = lethalAngle + (Math.random() - 0.5) * 1.6;
      const sprayLen = (Math.random() * 45 + 25) * multiplier;
      const sprayBlocks = this.createPixelSprayBlocks(sprayLen, sprayAngle);
      this.addBloodDecal({
        x: x + Math.cos(sprayAngle) * 8,
        y: y + Math.sin(sprayAngle) * 8,
        size: sprayLen,
        color: '#dc2626',
        type: 'PIXEL_SPRAY',
        angle: sprayAngle,
        blocks: sprayBlocks,
      });
    }

    // C. Scattered chunky pixel giblets (meat/bone chunks)
    const gibCount = isExecution ? 8 : 5;
    for (let i = 0; i < gibCount; i++) {
      const gibAngle = Math.random() * Math.PI * 2;
      const gibDist = (Math.random() * 40 + 12) * multiplier;
      const gibBlocks: PixelBloodBlock[] = [
        { dx: -2, dy: -2, w: 4, h: 4, color: '#450a0a' },
        { dx: -1, dy: -1, w: 3, h: 3, color: '#991b1b' },
        { dx: 0, dy: 0, w: 2, h: 2, color: '#dc2626' },
        { dx: 1, dy: 1, w: 2, h: 2, color: '#ef4444' },
      ];
      this.addBloodDecal({
        x: x + Math.cos(gibAngle) * gibDist,
        y: y + Math.sin(gibAngle) * gibDist,
        size: 6,
        color: '#991b1b',
        type: 'GIB_CHUNK',
        blocks: gibBlocks,
      });
    }

    // D. Additional scattered splatter droplets around the kill zone
    for (let i = 0; i < 14; i++) {
      const dropAngle = lethalAngle + (Math.random() - 0.5) * 2.2;
      const dropDist = Math.random() * 60 + 10;
      const dropBlocks = this.createPixelCluster(8, 7, 0.85, ['#ef4444', '#dc2626', '#991b1b']);
      this.addBloodDecal({
        x: x + Math.cos(dropAngle) * dropDist,
        y: y + Math.sin(dropAngle) * dropDist,
        size: 7,
        color: '#dc2626',
        type: 'PIXEL_SPLATTER',
        blocks: dropBlocks,
      });
    }

    // E. Volumetric dynamic blood burst particles flying outwards
    const particleCount = isExecution ? 36 : 24;
    for (let i = 0; i < particleCount; i++) {
      const pAngle = lethalAngle + (Math.random() - 0.5) * 1.8;
      const pSpeed = Math.random() * 9 + 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        life: 0,
        maxLife: Math.floor(Math.random() * 12 + 16),
        color: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#b91c1c' : '#450a0a',
        size: Math.random() * 3 + 2,
        alpha: 1,
      });
    }
  }

  private killEnemy(enemy: EnemyEntity, directionAngle: number, isExecution: boolean = false) {
    enemy.state = 'DEAD';
    enemy.hp = 0;
    this.camera.shake = isExecution ? 14 : 10;
    this.hitstopTimer = isExecution ? 4 : 3;

    // 90s Arcade Ultra-Violent Blood & Gore Explosion
    this.spawnDeathGoreExplosion(enemy.x, enemy.y, directionAngle, isExecution);

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
        if (enemy.state !== 'CHASE') {
          enemy.alertAnimTimer = 22;
          soundEngine.playAlertAlarm();
        }
        enemy.state = 'CHASE';
        enemy.alertTimer = 180;
        // Turn towards gunshot sound
        enemy.angle = Math.atan2(y - enemy.y, x - enemy.x);
      }
    });
  }

  // Break environmental objects (saksı, lamba, cam masa) when shot or collided with
  public breakDestructible(prop: DestructibleProp, hitAngle: number = 0) {
    if (prop.isBroken) return;
    prop.isBroken = true;
    prop.brokenTimer = 0;
    this.camera.shake = 6;

    const cx = prop.x + prop.w / 2;
    const cy = prop.y + prop.h / 2;

    if (prop.type === 'GLASS_TABLE') {
      soundEngine.playGlassShatter();
      // Burst sparkling crystalline glass shards in all directions
      for (let i = 0; i < 28; i++) {
        const pAngle = hitAngle + (Math.random() - 0.5) * Math.PI * 1.6;
        const pSpeed = Math.random() * 8 + 3;
        this.particles.push({
          x: cx + (Math.random() - 0.5) * prop.w,
          y: cy + (Math.random() - 0.5) * prop.h,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          life: 0,
          maxLife: 26,
          color: i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#bae6fd' : '#ffffff',
          size: Math.random() * 3.5 + 1.5,
          alpha: 1,
        });
      }
      // Scattered glass shard decals on the floor
      for (let i = 0; i < 5; i++) {
        this.bloodDecals.push({
          x: cx + (Math.random() - 0.5) * (prop.w + 14),
          y: cy + (Math.random() - 0.5) * (prop.h + 14),
          size: 2,
          color: '#38bdf8',
          type: 'CASING',
        });
      }
    } else if (prop.type === 'PLANT_POT') {
      soundEngine.playPotterySmash();
      // Terracotta shards, rich soil clods, and vibrant green leaves
      for (let i = 0; i < 24; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = Math.random() * 6.5 + 2;
        const pColor = i % 4 === 0 ? '#b45309' : i % 4 === 1 ? '#d97706' : i % 4 === 2 ? '#22c55e' : '#78350f';
        this.particles.push({
          x: cx + (Math.random() - 0.5) * prop.w,
          y: cy + (Math.random() - 0.5) * prop.h,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          life: 0,
          maxLife: 24,
          color: pColor,
          size: Math.random() * 3.5 + 2,
          alpha: 1,
        });
      }
      // Soil decal on floor
      this.bloodDecals.push({
        x: cx,
        y: cy,
        size: 14,
        color: 'rgba(120, 53, 15, 0.65)',
        type: 'POOL',
      });
    } else if (prop.type === 'FLOOR_LAMP') {
      soundEngine.playLampExplode();
      // Electrical sparks, bulb glass, and metallic pole pieces
      for (let i = 0; i < 26; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = Math.random() * 7 + 2;
        const pColor = i % 4 === 0 ? '#facc15' : i % 4 === 1 ? '#38bdf8' : i % 4 === 2 ? '#ffffff' : '#94a3b8';
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          life: 0,
          maxLife: 22,
          color: pColor,
          size: Math.random() * 3 + 1.5,
          alpha: 1,
        });
      }
    }
  }

  // Spawn 3D Bouncing Brass Cartridge with Physical Trajectory
  public spawnCasing(x: number, y: number, fireAngle: number, caliber: 'MAGNUM' | 'SHOTGUN' | 'SMG') {
    // Eject to the right/rear of the barrel
    const ejectAngle = fireAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.45;
    const ejectSpeed = Math.random() * 2.2 + 2.0;

    this.shellCasings.push({
      id: Date.now() + Math.random(),
      x,
      y,
      z: 16,
      vx: Math.cos(ejectAngle) * ejectSpeed,
      vy: Math.sin(ejectAngle) * ejectSpeed,
      vz: Math.random() * 2.5 + 2.5,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.5 + 0.3,
      color: caliber === 'SHOTGUN' ? '#dc2626' : caliber === 'MAGNUM' ? '#f59e0b' : '#eab308',
      bounces: 0,
      settled: false,
      caliber,
    });

    if (this.shellCasings.length > 200) {
      this.shellCasings.shift();
    }
  }

  // Spawn Expanding Translucent Gunsmoke Cloud at Muzzle Tip
  public spawnGunsmoke(x: number, y: number, fireAngle: number) {
    for (let i = 0; i < 4; i++) {
      const spread = (Math.random() - 0.5) * 0.45;
      const speed = Math.random() * 2.4 + 1.0;
      this.particles.push({
        x: x + Math.cos(fireAngle) * 4,
        y: y + Math.sin(fireAngle) * 4,
        vx: Math.cos(fireAngle + spread) * speed,
        vy: Math.sin(fireAngle + spread) * speed,
        life: 0,
        maxLife: 28 + Math.floor(Math.random() * 14),
        color: 'rgba(215, 220, 230, 0.38)',
        size: Math.random() * 3 + 2.5,
        alpha: 0.55,
      });
    }
  }

  // 3D Ballistic Bouncing Physics for Brass Shell Casings
  private updateShellCasings() {
    this.shellCasings.forEach((c) => {
      if (c.settled) return;

      c.x += c.vx;
      c.y += c.vy;
      c.z += c.vz;
      c.vz -= 0.42; // Gravity
      c.angle += c.vAngle;

      if (c.z <= 0) {
        c.z = 0;
        c.bounces++;
        if (c.bounces <= 3 && Math.abs(c.vz) > 0.9) {
          c.vz = -c.vz * 0.42;
          c.vx *= 0.6;
          c.vy *= 0.6;
          c.vAngle *= 0.6;
          soundEngine.playCasingDrop();
        } else {
          c.settled = true;
          c.vz = 0;
          c.vx = 0;
          c.vy = 0;
          c.vAngle = 0;
          soundEngine.playCasingDrop();
        }
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

      // Realistic plume expansion & friction deceleration for smoke particles
      if (p.color.startsWith('rgba(215, 220, 230') || p.color.startsWith('rgba(148, 163, 184')) {
        p.size += 0.16;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
    });
    this.particles = this.particles.filter((p) => p.life < p.maxLife);

    this.updateShellCasings();
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

    // Environmental destructible objects (saksı, lamba, cam masa) shatter when player passes through/collides
    this.destructibles.forEach((destr) => {
      if (destr.isBroken) return;
      const cx = destr.x + destr.w / 2;
      const cy = destr.y + destr.h / 2;
      const dist = Math.hypot(p.x - cx, p.y - cy);
      const hitRadius = 22 + Math.max(destr.w, destr.h) / 2;
      if (dist < hitRadius) {
        this.breakDestructible(destr, Math.atan2(p.vy, p.vx));
      }
    });

    // Detect stepping into blood puddles (saturates combat boots with blood)
    const inBloodPuddle = this.bloodDecals.some((d) => {
      if (d.type === 'PIXEL_POOL' || d.type === 'POOL') {
        return Math.hypot(p.x - d.x, p.y - d.y) < (d.size || 16) + 10;
      }
      return false;
    });
    if (inBloodPuddle) {
      p.bloodOnBoots = 14;
    }

    // Footstep audio cadence & bloody boot prints tracking
    const moveSpeed = Math.hypot(p.vx, p.vy);
    if (moveSpeed > 0.8 && !p.isRolling) {
      this.playerFootstepTimer += moveSpeed;

      if (this.playerFootstepTimer >= 22) {
        this.playerFootstepTimer = 0;
        this.playerStepFoot = !this.playerStepFoot;

        // Ground surface detection for realistic acoustic feedback
        let surface: 'wood' | 'carpet' | 'tile' = 'tile';
        if (p.x >= 850) {
          surface = 'carpet'; // VIP Lounge thick crimson carpet
        } else if (p.x >= 450 && p.y > 540) {
          surface = 'carpet'; // Emerald billiard tournament carpet
        } else if (p.x >= 450 && p.y < 240) {
          surface = 'wood'; // Bar polished oak parquet
        }

        soundEngine.playFootstep(surface);

        // Stamp bloody boot tread prints onto clean nightclub floor
        if (p.bloodOnBoots && p.bloodOnBoots > 0) {
          const moveAngle = Math.atan2(p.vy, p.vx);
          const sideAngle = moveAngle + Math.PI / 2;
          const footOffset = this.playerStepFoot ? 6 : -6;
          const fpX = p.x + Math.cos(sideAngle) * footOffset - Math.cos(moveAngle) * 4;
          const fpY = p.y + Math.sin(sideAngle) * footOffset - Math.sin(moveAngle) * 4;

          this.footprints.push({
            x: fpX,
            y: fpY,
            angle: moveAngle,
            alpha: Math.min(0.85, (p.bloodOnBoots / 14) * 0.9),
            isLeft: !this.playerStepFoot,
            color: '#7f1d1d',
          });

          if (this.footprints.length > 300) {
            this.footprints.shift();
          }

          p.bloodOnBoots--;
        }
      }
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

  // Prop raycast: true if intersects or passes through any room objects / furniture or intact opaque props
  public hasPropCollision(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const prop of this.props) {
      if (this.lineIntersectsAABB(x1, y1, x2, y2, prop.x, prop.y, prop.w, prop.h)) {
        return true;
      }
    }
    // Saksı ve lambalar kırılana kadar arkalarını kısmen perdeler; cam masa şeffaftır (görüşü engellemez)
    for (const d of this.destructibles) {
      if (!d.isBroken && d.type !== 'GLASS_TABLE') {
        if (this.lineIntersectsAABB(x1, y1, x2, y2, d.x, d.y, d.w, d.h)) {
          return true;
        }
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

      // Check collision against unbroken destructible environmental objects (saksı, lamba, cam masa)
      // "Oyun dünyasındaki belirli çevresel objelere ateş edildiğinde parçalanma animasyonu ve kırılma ses efekti ekle"
      for (const destr of this.destructibles) {
        if (destr.isBroken) continue;
        if (this.lineIntersectsAABB(b.x, b.y, nextX, nextY, destr.x, destr.y, destr.w, destr.h)) {
          b.life = 0;
          this.breakDestructible(destr, Math.atan2(b.vy, b.vx));
          return;
        }
      }

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
            const hitAngle = Math.atan2(b.vy, b.vx);

            // Realistic exit wound arterial squib mist spraying out behind target
            for (let i = 0; i < 7; i++) {
              const exitAngle = hitAngle + (Math.random() - 0.5) * 0.55;
              const exitSpeed = Math.random() * 8 + 4;
              this.particles.push({
                x: enemy.x + Math.cos(hitAngle) * 6,
                y: enemy.y + Math.sin(hitAngle) * 6,
                vx: Math.cos(exitAngle) * exitSpeed,
                vy: Math.sin(exitAngle) * exitSpeed,
                life: 0,
                maxLife: 15,
                color: i % 2 === 0 ? '#b91c1c' : '#7f1d1d',
                size: Math.random() * 2.5 + 1.5,
                alpha: 0.95,
              });
            }

            // Ballistic knockback impulse
            const knockback = b.damage >= 100 ? 7 : b.damage > 40 ? 4.5 : 2.5;
            enemy.x += Math.cos(hitAngle) * knockback;
            enemy.y += Math.sin(hitAngle) * knockback;
            this.resolveObstacleCollision(enemy, 18);

            // Impact freeze frame (hitstop)
            this.hitstopTimer = b.damage >= 100 ? 3 : 2;

            if (enemy.hp <= 0) {
              this.killEnemy(enemy, hitAngle);
            } else {
              soundEngine.playKatanaSlash();
              this.camera.shake = 6;
              // 90s Arcade Pixelated Blood Splatters on non-lethal injury
              this.spawnDamageBlood(enemy.x, enemy.y, hitAngle, 1.0);
            }
          }
        });
      } else {
        const dist = Math.hypot(this.player.x - b.x, this.player.y - b.y);
        if (dist < 18 && !this.player.isRolling) {
          b.life = 0;
          this.player.hp -= b.damage;
          this.camera.shake = 14;
          this.hitstopTimer = 3;
          soundEngine.playDoorKick();
          const hitAngle = Math.atan2(b.vy, b.vx);

          // Exit wound squib mist behind player
          for (let i = 0; i < 8; i++) {
            const exitAngle = hitAngle + (Math.random() - 0.5) * 0.6;
            const exitSpeed = Math.random() * 7 + 3;
            this.particles.push({
              x: this.player.x + Math.cos(hitAngle) * 6,
              y: this.player.y + Math.sin(hitAngle) * 6,
              vx: Math.cos(exitAngle) * exitSpeed,
              vy: Math.sin(exitAngle) * exitSpeed,
              life: 0,
              maxLife: 16,
              color: '#dc2626',
              size: Math.random() * 2.5 + 2,
              alpha: 1,
            });
          }

          // Player kinetic knockback
          this.player.x += Math.cos(hitAngle) * 4;
          this.player.y += Math.sin(hitAngle) * 4;
          this.resolveObstacleCollision(this.player, 20);

          // 90s Arcade Pixelated Blood Splatters when player takes damage
          this.spawnDamageBlood(this.player.x, this.player.y, hitAngle, 1.4);

          if (this.onStateUpdate) this.onStateUpdate(this.player);

          if (this.player.hp <= 0) {
            this.spawnDeathGoreExplosion(this.player.x, this.player.y, hitAngle, true);
            if (this.onGameOver) {
              this.onGameOver();
            }
          }
        }
      }
    });

    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  private updateEnemies(dt: number) {
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'DEAD') return;
      const previousState = enemy.state;

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
              this.spawnCasing(enemy.x, enemy.y, enemy.angle, 'SMG');
              this.spawnGunsmoke(
                enemy.x + Math.cos(enemy.angle) * 20,
                enemy.y + Math.sin(enemy.angle) * 20,
                enemy.angle
              );
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

                // 90s Arcade Pixelated Blood Splatters on melee strike injury
                this.spawnDamageBlood(this.player.x, this.player.y, angleToPlayer, 1.3);

                if (this.onStateUpdate) this.onStateUpdate(this.player);
                if (this.player.hp <= 0) {
                  this.spawnDeathGoreExplosion(this.player.x, this.player.y, angleToPlayer, true);
                  if (this.onGameOver) this.onGameOver();
                }
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

      // Trigger 90s Arcade Pop-in Animation & Sound effect upon state change
      if (enemy.state === 'CHASE' && previousState !== 'CHASE') {
        enemy.alertAnimTimer = 22;
        soundEngine.playAlertAlarm();
      } else if (enemy.state === 'INVESTIGATE' && previousState !== 'INVESTIGATE') {
        enemy.alertAnimTimer = 22;
        soundEngine.playAlertSuspicion();
      }

      if (enemy.alertAnimTimer && enemy.alertAnimTimer > 0) {
        enemy.alertAnimTimer--;
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

    // 1.5 Bloody Combat Bootprints
    this.renderFootprints(ctx);

    // 2. Decals & Blood Pools
    this.renderDecals(ctx);

    // 2.5 3D Bouncing Brass Bullet Shell Casings
    this.renderShellCasings(ctx);

    // 3. Furniture Props
    this.renderProps(ctx);

    // 3.5 Destructible Environmental Objects (Saksı, Lamba, Cam Masa)
    this.renderDestructibles(ctx);

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
    const time = performance.now() * 0.002;

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

        const isAlt = (r + c) % 2 === 0;

        // --- ZONE 1: VIP LOUNGE (wx >= 850) ---
        if (wx >= 850) {
          // Deep crimson royal velvet carpet
          ctx.fillStyle = isAlt ? '#4c0519' : '#390413';
          ctx.fill();

          // Subtle woven diamond pattern
          ctx.strokeStyle = isAlt ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Center gold embroidery dot on select tiles
          if ((r * 3 + c) % 4 === 0) {
            const center = this.toIso(wx + tileSize / 2, wy + tileSize / 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(center.x - 1.5, center.y - 1.5, 3, 3);
          }

          // Gold braided border on VIP entrance and perimeter
          if (c === 14 || r === 0 || r === rows - 1 || c === cols - 1) {
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
        // --- ZONE 2: CENTER CLUB ROOM (450 <= wx < 850) ---
        else if (wx >= 450) {
          // Dancefloor area (High-energy dynamic neon grid)
          if (wx >= 510 && wx <= 750 && wy >= 240 && wy <= 540) {
            const dancePhase = Math.sin(time * 2 + c * 0.8 + r * 0.8);
            const danceTileIndex = (r + c + Math.floor(time * 1.5)) % 4;
            const danceColors = [
              '#ec4899', // Hot Pink
              '#06b6d4', // Cyan
              '#8b5cf6', // Violet
              '#10b981', // Emerald
            ];
            const baseColor = danceColors[danceTileIndex];

            // Lit glass dancefloor tile
            ctx.fillStyle = dancePhase > 0 ? `${baseColor}35` : '#181028';
            ctx.fill();

            // Vibrant Neon Edge Glow
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = dancePhase > 0.4 ? 2 : 1;
            ctx.stroke();

            // Inner neon square for depth
            const innerP1 = this.toIso(wx + 8, wy + 8);
            const innerP2 = this.toIso(wx + tileSize - 8, wy + 8);
            const innerP3 = this.toIso(wx + tileSize - 8, wy + tileSize - 8);
            const innerP4 = this.toIso(wx + 8, wy + tileSize - 8);
            ctx.beginPath();
            ctx.moveTo(innerP1.x, innerP1.y);
            ctx.lineTo(innerP2.x, innerP2.y);
            ctx.lineTo(innerP3.x, innerP3.y);
            ctx.lineTo(innerP4.x, innerP4.y);
            ctx.closePath();
            ctx.strokeStyle = `${baseColor}55`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          // Bar zone (Polished oak hardwood floor)
          else if (wy < 240) {
            ctx.fillStyle = isAlt ? '#261408' : '#1c0f06';
            ctx.fill();

            // Wood plank grain line
            const midTop = this.toIso(wx + tileSize / 2, wy);
            const midBot = this.toIso(wx + tileSize / 2, wy + tileSize);
            ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(midTop.x, midTop.y);
            ctx.lineTo(midBot.x, midBot.y);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.strokeRect(p1.x, p1.y, 1, 1);
          }
          // Billiards Lounge (Dark emerald tournament carpet)
          else if (wy > 540) {
            ctx.fillStyle = isAlt ? '#064e3b' : '#022c22';
            ctx.fill();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            // Dark corridor tiles
            ctx.fillStyle = isAlt ? '#090d16' : '#121024';
            ctx.fill();
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        // --- ZONE 3: ENTRANCE & ARCADE HALL (wx < 450) ---
        else {
          ctx.fillStyle = isAlt ? '#090d16' : '#161128';
          ctx.fill();
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.09)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Atmospheric Nightclub Smoke / Haze Drifting across the floor
    this.renderAtmosphericSmoke(ctx, time);
  }

  // Floating ambient nightclub haze / smoke puffs
  private renderAtmosphericSmoke(ctx: CanvasRenderingContext2D, time: number) {
    const smokePuffs = [
      { x: 300, y: 350, r: 85, color: 'rgba(147, 51, 234, 0.06)', speed: 0.2 },
      { x: 650, y: 400, r: 110, color: 'rgba(6, 182, 212, 0.07)', speed: 0.15 },
      { x: 600, y: 750, r: 90, color: 'rgba(16, 185, 129, 0.05)', speed: 0.18 },
      { x: 1050, y: 500, r: 120, color: 'rgba(244, 63, 94, 0.06)', speed: 0.12 },
      { x: 200, y: 700, r: 80, color: 'rgba(56, 189, 248, 0.05)', speed: 0.22 },
    ];

    smokePuffs.forEach((puff, idx) => {
      const driftX = Math.sin(time * puff.speed + idx * 1.5) * 35;
      const driftY = Math.cos(time * (puff.speed * 0.8) + idx) * 20;
      const pos = this.toIso(puff.x + driftX, puff.y + driftY);

      const grad = ctx.createRadialGradient(pos.x, pos.y, 5, pos.x, pos.y, puff.r);
      grad.addColorStop(0, puff.color);
      grad.addColorStop(0.7, puff.color.replace(/0\.\d+\)/, '0.02)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, puff.r, puff.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderDecals(ctx: CanvasRenderingContext2D) {
    this.bloodDecals.forEach((decal) => {
      const pos = this.toIso(decal.x, decal.y);
      ctx.save();

      if (decal.type === 'CASING') {
        // Metallic Brass Bullet Casing with shadow
        ctx.fillStyle = '#b45309';
        ctx.fillRect(pos.x - 2, pos.y, 5, 2);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(pos.x - 2, pos.y - 1, 4, 2);
        ctx.restore();
        return;
      }

      // 90s Arcade Pixelated Blood Blocks
      if (decal.blocks && decal.blocks.length > 0) {
        for (let i = 0; i < decal.blocks.length; i++) {
          const b = decal.blocks[i];
          ctx.fillStyle = b.color;
          ctx.fillRect(pos.x + b.dx, pos.y + b.dy, b.w, b.h);
        }
        ctx.restore();
        return;
      }

      // Procedural pixelated fallback for legacy decal definitions
      if (decal.type === 'PIXEL_POOL' || decal.type === 'POOL') {
        const s = decal.size;
        // Stepped pixelated gore puddle
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(pos.x - s, pos.y - s * 0.45, s * 2, s * 0.9);
        ctx.fillRect(pos.x - s * 0.7, pos.y - s * 0.7, s * 1.4, s * 1.4);

        ctx.fillStyle = '#991b1b';
        ctx.fillRect(pos.x - s * 0.6, pos.y - s * 0.3, s * 1.2, s * 0.6);
        ctx.fillRect(pos.x - s * 0.45, pos.y - s * 0.5, s * 0.9, s * 1.0);

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(pos.x - s * 0.3, pos.y - s * 0.15, s * 0.6, s * 0.35);
      } else if (decal.type === 'GIB_CHUNK') {
        ctx.fillStyle = '#3f0c0c';
        ctx.fillRect(pos.x - 3, pos.y - 3, 6, 6);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(pos.x - 2, pos.y - 2, 4, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(pos.x - 1, pos.y - 1, 2, 2);
      } else {
        // Splatters / droplets
        const s = Math.max(3, decal.size);
        ctx.fillStyle = decal.color || '#dc2626';
        ctx.fillRect(pos.x - s * 0.5, pos.y - s * 0.5, s, s);
        ctx.fillRect(pos.x - s * 0.8, pos.y - 1, s * 0.5, s * 0.6);
        ctx.fillRect(pos.x + 2, pos.y - s * 0.4, s * 0.4, s * 0.5);
      }

      ctx.restore();
    });
  }

  // Render Bloody Combat Bootprints on clean nightclub floor
  private renderFootprints(ctx: CanvasRenderingContext2D) {
    this.footprints.forEach((fp) => {
      const pos = this.toIso(fp.x, fp.y);
      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Rotate to match movement direction in isometric space
      const isoDirX = (Math.cos(fp.angle) - Math.sin(fp.angle)) * 0.866;
      const isoDirY = (Math.cos(fp.angle) + Math.sin(fp.angle)) * 0.5;
      const isoAngle = Math.atan2(isoDirY, isoDirX);
      ctx.rotate(isoAngle);

      ctx.globalAlpha = fp.alpha;
      ctx.fillStyle = fp.color;

      // Combat boot tread geometry (forefoot sole + heel pad + lugs)
      ctx.fillRect(-2.5, -6, 5, 6);
      ctx.fillRect(-2, 2, 4, 3.5);

      // Dark tread grooving
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(-2, -5, 4, 1);
      ctx.fillRect(-2, -3, 4, 1);
      ctx.fillRect(-2, -1, 4, 1);

      ctx.restore();
    });
  }

  // Render 3D Bouncing Brass Bullet Shell Casings
  private renderShellCasings(ctx: CanvasRenderingContext2D) {
    this.shellCasings.forEach((c) => {
      const groundPos = this.toIso(c.x, c.y);
      const airPos = this.toIso(c.x, c.y - c.z);

      ctx.save();

      // 1. Drop shadow on floor with elevation blur
      if (c.z > 0.5) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.12, 0.45 - c.z * 0.018)})`;
        ctx.beginPath();
        ctx.ellipse(groundPos.x, groundPos.y, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Casing cylinder in air or at rest on ground
      ctx.translate(airPos.x, airPos.y);
      ctx.rotate(c.angle);

      if (c.caliber === 'SHOTGUN') {
        // Red plastic 12-gauge hull with brass rim & primer
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-4, -2, 8, 4);
        ctx.fillStyle = '#f59e0b'; // Brass rim
        ctx.fillRect(-5, -2, 2.5, 4);
        ctx.fillStyle = '#78350f'; // Primer dimple
        ctx.fillRect(-5, -0.75, 1, 1.5);
      } else {
        // Brass metallic cartridge (Magnum or SMG)
        const w = c.caliber === 'MAGNUM' ? 6.5 : 4.5;
        const h = c.caliber === 'MAGNUM' ? 2.5 : 2;

        const grad = ctx.createLinearGradient(-w / 2, -h / 2, -w / 2, h / 2);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.4, '#f59e0b');
        grad.addColorStop(1, '#92400e');

        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Primer flash indent
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-w / 2, -0.5, 1, 1);
      }

      ctx.restore();
    });
  }

  private renderProps(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.003;

    this.props.forEach((prop) => {
      const p1 = this.toIso(prop.x, prop.y);
      const p2 = this.toIso(prop.x + prop.w, prop.y);
      const p3 = this.toIso(prop.x + prop.w, prop.y + prop.h);
      const p4 = this.toIso(prop.x, prop.y + prop.h);

      ctx.save();

      // 1. Volumetric floor drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.beginPath();
      ctx.moveTo(p1.x + 6, p1.y + 8);
      ctx.lineTo(p2.x + 12, p2.y + 8);
      ctx.lineTo(p3.x + 14, p3.y + 14);
      ctx.lineTo(p4.x + 8, p4.y + 14);
      ctx.closePath();
      ctx.fill();

      if (prop.type === 'BILLIARD_TABLE') {
        const height = 30;
        // 3D Wooden Cabinet Sides with dark stain
        ctx.fillStyle = '#2d1405';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#5c2707';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Mahogany Rails
        const t1 = { x: p1.x, y: p1.y - height };
        const t2 = { x: p2.x, y: p2.y - height };
        const t3 = { x: p3.x, y: p3.y - height };
        const t4 = { x: p4.x, y: p4.y - height };

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t4.x, t4.y);
        ctx.closePath();
        ctx.fill();

        // Inlaid Mother-of-Pearl Sighting Dots on Rails
        ctx.fillStyle = '#f8fafc';
        for (let s = 1; s <= 3; s++) {
          const ptL = { x: t1.x + (t4.x - t1.x) * (s / 4), y: t1.y + (t4.y - t1.y) * (s / 4) };
          const ptR = { x: t2.x + (t3.x - t2.x) * (s / 4), y: t2.y + (t3.y - t2.y) * (s / 4) };
          ctx.fillRect(ptL.x - 1, ptL.y - 1, 2, 2);
          ctx.fillRect(ptR.x - 1, ptR.y - 1, 2, 2);
        }

        // Recessed Tournament Green Cloth Bed
        const pad = 7;
        const c1 = { x: t1.x + pad, y: t1.y + pad * 0.5 };
        const c2 = { x: t2.x - pad, y: t2.y + pad * 0.5 };
        const c3 = { x: t3.x - pad, y: t3.y - pad * 0.5 };
        const c4 = { x: t4.x + pad, y: t4.y - pad * 0.5 };

        // Plush velvet felt gradient
        const feltGrad = ctx.createLinearGradient(c1.x, c1.y, c3.x, c3.y);
        feltGrad.addColorStop(0, '#065f46');
        feltGrad.addColorStop(1, '#047857');
        ctx.fillStyle = feltGrad;
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.fill();

        // 6 Leather Drop Pockets with brass rims
        ctx.fillStyle = '#022c22';
        const pockets = [
          c1, c2, c3, c4,
          { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 },
          { x: (c4.x + c3.x) / 2, y: (c4.y + c3.y) / 2 },
        ];
        pockets.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        // 3D Billiard Balls
        const midX = (c1.x + c3.x) / 2;
        const midY = (c1.y + c3.y) / 2;

        // White cue ball with glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(midX - 22, midY - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // 8-ball (black)
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(midX + 8, midY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(midX + 7, midY - 1, 2, 2);

        // Rack of colorful billiard balls
        const balls = [
          { dx: 14, dy: -6, color: '#ef4444' }, // Red
          { dx: 14, dy: 6, color: '#f59e0b' },  // Yellow
          { dx: 20, dy: -10, color: '#3b82f6' }, // Blue
          { dx: 20, dy: 0, color: '#a855f7' },   // Purple
          { dx: 20, dy: 10, color: '#10b981' },  // Green
        ];
        balls.forEach((b) => {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(midX + b.dx, midY + b.dy, 2.8, 0, Math.PI * 2);
          ctx.fill();
          // Specular glint
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(midX + b.dx - 1, midY + b.dy - 1, 1, 1);
        });

        // Blue Chalk Cube resting on the rail
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(t4.x + 14, t4.y - 4, 4, 4);

        // Wooden Pool Cue lying along the rail
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(t1.x + 8, t1.y - 1);
        ctx.lineTo(t2.x - 8, t2.y - 1);
        ctx.stroke();
        // White cue tip
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(t2.x - 14, t2.y - 1);
        ctx.lineTo(t2.x - 8, t2.y - 1);
        ctx.stroke();

        // Brass Corner Caps
        ctx.fillStyle = '#f59e0b';
        [t1, t2, t3, t4].forEach((pt) => {
          ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
        });

        // Dual Overhead Hanging Brass Pool Lamps
        const lamp1X = midX - 18;
        const lamp2X = midX + 18;
        const lampY = midY - 38;

        // Lamp suspension wires
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lamp1X, lampY - 24);
        ctx.lineTo(lamp1X, lampY);
        ctx.moveTo(lamp2X, lampY - 24);
        ctx.lineTo(lamp2X, lampY);
        ctx.stroke();

        // Conical brass/green lampshades
        [lamp1X, lamp2X].forEach((lx) => {
          ctx.fillStyle = '#065f46';
          ctx.beginPath();
          ctx.moveTo(lx, lampY);
          ctx.lineTo(lx - 12, lampY + 10);
          ctx.lineTo(lx + 12, lampY + 10);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(lx - 13, lampY + 10, 26, 2);

          // Warm conical light pool illuminating the felt
          const lampCone = ctx.createRadialGradient(lx, lampY + 11, 2, lx, midY, 35);
          lampCone.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
          lampCone.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = lampCone;
          ctx.beginPath();
          ctx.ellipse(lx, midY, 35, 18, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (prop.type === 'BAR_COUNTER') {
        const height = 32;
        // Dark Mahogany Counter Base
        ctx.fillStyle = '#2b1004';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#5c2206';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Polished Brass Foot Rail along counter bottom
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p1.x + 3, p1.y - 6);
        ctx.lineTo(p4.x, p4.y - 6);
        ctx.lineTo(p3.x - 3, p3.y - 6);
        ctx.stroke();

        // Polished White-Veined Marble Countertop
        const t1 = { x: p1.x, y: p1.y - height };
        const t2 = { x: p2.x, y: p2.y - height };
        const t3 = { x: p3.x, y: p3.y - height };
        const t4 = { x: p4.x, y: p4.y - height };

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(t1.x - 3, t1.y - 2);
        ctx.lineTo(t2.x + 3, t2.y - 2);
        ctx.lineTo(t3.x + 3, t3.y + 2);
        ctx.lineTo(t4.x - 3, t4.y + 2);
        ctx.closePath();
        ctx.fill();

        // Marble edge highlight
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Delicate Marble Grey Veins
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(t1.x + 25, t1.y);
        ctx.lineTo(t1.x + 40, t1.y + 3);
        ctx.lineTo(t1.x + 55, t1.y - 1);
        ctx.moveTo(t4.x + 70, t4.y - 1);
        ctx.lineTo(t4.x + 85, t4.y + 2);
        ctx.stroke();

        // 3 Chrome & Red Velvet Bar Stools in Front of Bar
        for (let s = 0; s < 3; s++) {
          const stoolX = p4.x + (p3.x - p4.x) * (0.25 + s * 0.28);
          const stoolY = p4.y + (p3.y - p4.y) * (0.25 + s * 0.28) + 14;

          // Stool base on floor
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.ellipse(stoolX, stoolY, 7, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Chrome stem
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(stoolX, stoolY);
          ctx.lineTo(stoolX, stoolY - 22);
          ctx.stroke();

          // Chrome circular footrest ring
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(stoolX, stoolY - 9, 5, 2.5, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Padded Crimson Leather Seat
          ctx.fillStyle = '#991b1b';
          ctx.beginPath();
          ctx.ellipse(stoolX, stoolY - 22, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.ellipse(stoolX, stoolY - 23, 6, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bottles & Glasses on the counter
        const bottles = [
          { color: '#06b6d4', offset: 0.15, h: 12 }, // Curacao
          { color: '#ef4444', offset: 0.28, h: 14 }, // Campari
          { color: '#10b981', offset: 0.42, h: 13 }, // Absinthe
          { color: '#f59e0b', offset: 0.58, h: 15 }, // Whiskey
          { color: '#a855f7', offset: 0.72, h: 11 }, // Violette
          { color: '#f8fafc', offset: 0.85, h: 14 }, // Vodka
        ];
        bottles.forEach((b) => {
          const bx = t1.x + (t2.x - t1.x) * b.offset;
          const by = t1.y + (t2.y - t1.y) * b.offset;

          // Bottle Aura Glow
          ctx.fillStyle = `${b.color}45`;
          ctx.beginPath();
          ctx.arc(bx, by - 6, 8, 0, Math.PI * 2);
          ctx.fill();

          // Glass Bottle Body
          ctx.fillStyle = b.color;
          ctx.fillRect(bx - 2.5, by - b.h, 5, b.h - 3);
          // Narrow Neck & Cork
          ctx.fillRect(bx - 1.2, by - b.h - 4, 2.4, 4);
          ctx.fillStyle = '#d97706';
          ctx.fillRect(bx - 1.2, by - b.h - 5, 2.4, 2);
        });

        // Stainless Steel Cocktail Shaker
        const shakerX = t1.x + (t2.x - t1.x) * 0.48;
        const shakerY = t1.y + (t2.y - t1.y) * 0.48;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(shakerX - 3, shakerY - 11, 6, 10);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(shakerX - 2, shakerY - 14, 4, 3);

        // Martini Glass with Lime Wedge
        const glassX = t1.x + (t2.x - t1.x) * 0.35;
        const glassY = t1.y + (t2.y - t1.y) * 0.35;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(glassX - 4, glassY - 8);
        ctx.lineTo(glassX, glassY - 2);
        ctx.lineTo(glassX + 4, glassY - 8);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#f43f5e';
        ctx.fill();
        // Stem
        ctx.beginPath();
        ctx.moveTo(glassX, glassY - 2);
        ctx.lineTo(glassX, glassY);
        ctx.stroke();
      } else if (prop.type === 'JUKEBOX') {
        const height = 48;
        // 3D Cabinet Body
        ctx.fillStyle = '#2e0854';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#4a0e78';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        const jCenterX = (p4.x + p3.x) / 2;
        const jCenterY = p4.y - height / 2;

        // Glowing Animated Arch Bubble Tubes
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(jCenterX, p4.y - height + 12, 17, Math.PI, 0);
        ctx.stroke();

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(jCenterX, p4.y - height + 12, 13, Math.PI, 0);
        ctx.stroke();

        // Rising Jukebox Bubbles
        ctx.fillStyle = '#fef08a';
        for (let b = 0; b < 4; b++) {
          const bubbleY = p4.y - 6 - ((time * 40 + b * 9) % 36);
          ctx.beginPath();
          ctx.arc(jCenterX - 14, bubbleY, 1.5, 0, Math.PI * 2);
          ctx.arc(jCenterX + 14, bubbleY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Multi-Band Animated Equalizer Display
        const eqColors = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];
        const barBaseX = jCenterX - 14;
        const barBaseY = p4.y - 14;

        for (let i = 0; i < 6; i++) {
          const barH = 4 + Math.abs(Math.sin(time * 3 + i * 1.1)) * 16;
          ctx.fillStyle = eqColors[i];
          ctx.fillRect(barBaseX + i * 5, barBaseY - barH, 4, barH);
        }

        // Song Title Slips & Chrome Speaker Grille
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(jCenterX - 12, p4.y - height + 16, 24, 7);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(jCenterX - 10, p4.y - height + 18, 20, 3);

        // Vibrant Jukebox Floor Glow
        const jukeGlow = ctx.createRadialGradient(p4.x, p4.y, 4, p4.x, p4.y, 35);
        jukeGlow.addColorStop(0, 'rgba(236, 72, 153, 0.35)');
        jukeGlow.addColorStop(1, 'rgba(236, 72, 153, 0)');
        ctx.fillStyle = jukeGlow;
        ctx.beginPath();
        ctx.ellipse(p4.x, p4.y, 35, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (prop.type === 'SOFA') {
        const height = 28;
        // 3D Chesterfield Sofa Base (Deep Crimson Velvet)
        ctx.fillStyle = '#380411';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#6e0c26';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Rolled Arms & High Tufted Backrest
        const t1 = { x: p1.x, y: p1.y - height };
        const t2 = { x: p2.x, y: p2.y - height };
        const t3 = { x: p3.x, y: p3.y - height };
        const t4 = { x: p4.x, y: p4.y - height };

        // Velvet Cushion Seat Surface
        ctx.fillStyle = '#881337';
        ctx.beginPath();
        ctx.moveTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t4.x, t4.y);
        ctx.closePath();
        ctx.fill();

        // 3 Deep Cushion Creases
        ctx.strokeStyle = '#4c0519';
        ctx.lineWidth = 1.5;
        for (let c = 1; c <= 2; c++) {
          const cTop = { x: t1.x + (t2.x - t1.x) * (c / 3), y: t1.y + (t2.y - t1.y) * (c / 3) };
          const cBot = { x: t4.x + (t3.x - t4.x) * (c / 3), y: t4.y + (t3.y - t4.y) * (c / 3) };
          ctx.beginPath();
          ctx.moveTo(cTop.x, cTop.y);
          ctx.lineTo(cBot.x, cBot.y);
          ctx.stroke();
        }

        // Diamond-Tufted Backrest
        const backW = Math.max(10, (t2.x - t1.x) * 0.95);
        ctx.fillStyle = '#9f1239';
        ctx.fillRect(t1.x, t1.y - 16, backW, 16);

        // Gold Diamond Button Tufts
        ctx.fillStyle = '#facc15';
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 6; col++) {
            const bx = t1.x + (backW * (col + (row % 2) * 0.5 + 0.5)) / 7;
            const by = t1.y - 12 + row * 6;
            ctx.fillRect(bx - 1, by - 1, 2, 2);
          }
        }

        // Rolled Scroll Armrests
        ctx.fillStyle = '#be123c';
        ctx.beginPath();
        ctx.arc(t1.x + 3, t1.y - 4, 6, 0, Math.PI * 2);
        ctx.arc(t2.x - 3, t2.y - 4, 6, 0, Math.PI * 2);
        ctx.fill();

        // Silk Throw Cushions (Gold & Teal)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(t1.x + 8, t1.y - 8, 10, 8);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(t2.x - 18, t2.y - 8, 10, 8);
      } else if (prop.type === 'SLOT_MACHINE') {
        const height = 50;
        // 3D Cabinet Box
        ctx.fillStyle = '#17122b';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.lineTo(p1.x, p1.y - height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#2d1b4e';
        ctx.beginPath();
        ctx.moveTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p3.x, p3.y - height);
        ctx.lineTo(p4.x, p4.y - height);
        ctx.closePath();
        ctx.fill();

        // Chrome Side Lever with Red Ball Knob
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y - height * 0.55);
        ctx.lineTo(p3.x + 8, p3.y - height * 0.7);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p3.x + 8, p3.y - height * 0.7, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Flashing "777" Jackpot Marquee Topper
        const isFlash = Math.sin(time * 5) > 0;
        ctx.fillStyle = isFlash ? '#f59e0b' : '#b45309';
        ctx.fillRect(p4.x - 3, p4.y - height + 3, 20, 11);
        ctx.fillStyle = isFlash ? '#ffffff' : '#fef08a';
        ctx.font = '900 9px monospace';
        ctx.fillText('777', p4.x + 1, p4.y - height + 12);

        // Animated Spinning CRT Reels Screen
        ctx.fillStyle = '#020617';
        ctx.fillRect(p4.x - 3, p4.y - height + 16, 20, 16);

        // 3 Reels with animated cycling symbols
        const reelSymbols = ['#ef4444', '#facc15', '#38bdf8', '#10b981'];
        for (let r = 0; r < 3; r++) {
          const symIdx = (Math.floor(time * 3 + r * 2)) % reelSymbols.length;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(p4.x - 1 + r * 6, p4.y - height + 18, 5, 12);
          ctx.fillStyle = reelSymbols[symIdx];
          ctx.fillRect(p4.x + r * 6, p4.y - height + 21, 3, 6);
        }

        // Metal Coin Payout Tray with Gold Coins
        ctx.fillStyle = '#475569';
        ctx.fillRect(p4.x - 2, p4.y - 8, 18, 6);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(p4.x + 4, p4.y - 5, 2, 0, Math.PI * 2);
        ctx.arc(p4.x + 8, p4.y - 5, 2, 0, Math.PI * 2);
        ctx.arc(p4.x + 12, p4.y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  private renderDestructibles(ctx: CanvasRenderingContext2D) {
    this.destructibles.forEach((d) => {
      const p1 = this.toIso(d.x, d.y);
      const p2 = this.toIso(d.x + d.w, d.y);
      const p3 = this.toIso(d.x + d.w, d.y + d.h);
      const p4 = this.toIso(d.x, d.y + d.h);

      const midX = (p1.x + p3.x) / 2;
      const midY = (p1.y + p3.y) / 2;

      ctx.save();

      if (d.type === 'PLANT_POT') {
        if (!d.isBroken) {
          // --- INTACT SAKSI (Potted Tropical Plant) ---
          // 1. Soft Floor Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(midX, midY + 4, 16, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Terracotta Pot Body (3D Cylinder)
          const potH = 22;
          const potRadius = 11;
          const potRimY = midY - potH;

          // Side shaded face
          const potGrad = ctx.createLinearGradient(midX - potRadius, potRimY, midX + potRadius, midY);
          potGrad.addColorStop(0, '#c2410c');
          potGrad.addColorStop(0.5, '#9a3412');
          potGrad.addColorStop(1, '#431407');

          ctx.fillStyle = potGrad;
          ctx.beginPath();
          ctx.ellipse(midX, midY, potRadius * 0.8, 5, 0, 0, Math.PI);
          ctx.lineTo(midX - potRadius, potRimY);
          ctx.ellipse(midX, potRimY, potRadius, 6, 0, Math.PI, 0, true);
          ctx.closePath();
          ctx.fill();

          // Terracotta Pot Upper Rim Band
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.ellipse(midX, potRimY, potRadius, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#9a3412';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Rich dark soil bed
          ctx.fillStyle = '#291404';
          ctx.beginPath();
          ctx.ellipse(midX, potRimY, potRadius - 2, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // 3. Lush Green Foliage (Fanned out tropical leaves)
          const leafAngles = [-0.8, -0.4, 0, 0.4, 0.8, 1.3, 2.2, 2.8, 3.6, 4.2];
          leafAngles.forEach((ang, idx) => {
            const length = 18 + (idx % 3) * 6;
            const curve = (idx % 2 === 0 ? 1 : -1) * 8;
            const lx = midX + Math.cos(ang) * length;
            const ly = potRimY - 6 + Math.sin(ang) * (length * 0.6) - 8;

            ctx.fillStyle = idx % 2 === 0 ? '#16a34a' : '#22c55e';
            ctx.beginPath();
            ctx.moveTo(midX, potRimY - 3);
            ctx.quadraticCurveTo(midX + Math.cos(ang) * (length * 0.5) + curve, potRimY - 14, lx, ly);
            ctx.quadraticCurveTo(midX + Math.cos(ang) * (length * 0.5) - curve, potRimY - 6, midX, potRimY - 3);
            ctx.closePath();
            ctx.fill();

            // Leaf central spine highlight
            ctx.strokeStyle = '#86efac';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(midX, potRimY - 3);
            ctx.quadraticCurveTo(midX + Math.cos(ang) * (length * 0.5), potRimY - 10, lx, ly);
            ctx.stroke();
          });
        } else {
          // --- SHATTERED SAKSI ---
          // Scattered dark soil puddle
          ctx.fillStyle = 'rgba(67, 20, 7, 0.7)';
          ctx.beginPath();
          ctx.ellipse(midX, midY, 18, 9, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Broken Terracotta Shards
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.moveTo(midX - 10, midY - 3);
          ctx.lineTo(midX - 4, midY - 9);
          ctx.lineTo(midX - 2, midY - 2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#9a3412';
          ctx.beginPath();
          ctx.moveTo(midX + 3, midY - 6);
          ctx.lineTo(midX + 11, midY - 2);
          ctx.lineTo(midX + 6, midY + 3);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(midX - 6, midY + 2);
          ctx.lineTo(midX + 1, midY + 5);
          ctx.lineTo(midX - 3, midY + 7);
          ctx.closePath();
          ctx.fill();

          // Torn, snapped leaves on floor
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.ellipse(midX - 12, midY + 4, 8, 3, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(midX + 10, midY + 3, 9, 3, 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (d.type === 'FLOOR_LAMP') {
        if (!d.isBroken) {
          // --- INTACT FLOOR LAMP ---
          // 1. Warm/Cyan Radial Floor Lighting Pool
          const lightGlow = ctx.createRadialGradient(midX, midY, 4, midX, midY, 65);
          lightGlow.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
          lightGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
          lightGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = lightGlow;
          ctx.beginPath();
          ctx.ellipse(midX, midY, 65, 36, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Base Plate (Brass / Chrome disc)
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.ellipse(midX, midY + 1, 10, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.ellipse(midX, midY, 9, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // 3. Tall Chrome Stand Pole
          const lampH = 50;
          const poleTopY = midY - lampH;
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(midX, midY);
          ctx.lineTo(midX, poleTopY);
          ctx.stroke();

          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(midX - 1, midY);
          ctx.lineTo(midX - 1, poleTopY);
          ctx.stroke();

          // Decorative brass fittings
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(midX - 3, midY - 14, 6, 3);
          ctx.fillRect(midX - 3, poleTopY + 6, 6, 4);

          // 4. Glowing Art-Deco Spherical Glass Shade & Bulb
          const shadeRadius = 9;
          // Outer halo
          const shadeAura = ctx.createRadialGradient(midX, poleTopY, 2, midX, poleTopY, shadeRadius + 8);
          shadeAura.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
          shadeAura.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
          shadeAura.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = shadeAura;
          ctx.beginPath();
          ctx.arc(midX, poleTopY, shadeRadius + 8, 0, Math.PI * 2);
          ctx.fill();

          // Inner Glass Globe
          const globeGrad = ctx.createRadialGradient(midX - 2, poleTopY - 3, 1, midX, poleTopY, shadeRadius);
          globeGrad.addColorStop(0, '#ffffff');
          globeGrad.addColorStop(0.3, '#fef08a');
          globeGrad.addColorStop(0.8, '#38bdf8');
          globeGrad.addColorStop(1, '#0284c7');
          ctx.fillStyle = globeGrad;
          ctx.beginPath();
          ctx.arc(midX, poleTopY, shadeRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // --- BROKEN / FALLEN FLOOR LAMP ---
          // Crushed base plate on floor
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.ellipse(midX, midY, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Severed snapped metal pole lying angled on the ground
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(midX, midY);
          ctx.lineTo(midX + 24, midY - 6);
          ctx.stroke();

          // Shattered glass globe remnants and sparks
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(midX + 22, midY - 8, 4, 3);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(midX + 26, midY - 5, 3, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(midX + 18, midY - 3, 2, 2);
        }
      } else if (d.type === 'GLASS_TABLE') {
        const tableH = 18;
        if (!d.isBroken) {
          // --- INTACT TEMPERED GLASS TABLE ---
          // 1. Drop shadow of table frame and glass on floor
          ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
          ctx.beginPath();
          ctx.moveTo(p1.x + 3, p1.y + 5);
          ctx.lineTo(p2.x + 3, p2.y + 5);
          ctx.lineTo(p3.x + 3, p3.y + 5);
          ctx.lineTo(p4.x + 3, p4.y + 5);
          ctx.closePath();
          ctx.fill();

          // 2. 4 Tubular Chrome Legs
          const legRadius = 2.5;
          const corners = [p1, p2, p3, p4];
          corners.forEach((pt) => {
            ctx.fillStyle = '#334155';
            ctx.fillRect(pt.x - legRadius, pt.y - tableH, legRadius * 2, tableH);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(pt.x - legRadius + 1, pt.y - tableH, 1.5, tableH);
          });

          // 3. Polished Chrome Rim Frame at table height
          const t1 = { x: p1.x, y: p1.y - tableH };
          const t2 = { x: p2.x, y: p2.y - tableH };
          const t3 = { x: p3.x, y: p3.y - tableH };
          const t4 = { x: p4.x, y: p4.y - tableH };

          // 4. Tempered Translucent Glass Top
          ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.beginPath();
          ctx.moveTo(t1.x, t1.y);
          ctx.lineTo(t2.x, t2.y);
          ctx.lineTo(t3.x, t3.y);
          ctx.lineTo(t4.x, t4.y);
          ctx.closePath();
          ctx.fill();

          // 5. Beveled Metallic Chrome Edges
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(t1.x, t1.y);
          ctx.lineTo(t2.x, t2.y);
          ctx.lineTo(t3.x, t3.y);
          ctx.lineTo(t4.x, t4.y);
          ctx.closePath();
          ctx.stroke();

          // 6. Glossy Specular Diagonal Glass Sheen Glints
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const g1x = t1.x + (t2.x - t1.x) * 0.3;
          const g1y = t1.y + (t2.y - t1.y) * 0.3;
          const g2x = t4.x + (t3.x - t4.x) * 0.7;
          const g2y = t4.y + (t3.y - t4.y) * 0.7;
          ctx.moveTo(g1x, g1y);
          ctx.lineTo(g2x, g2y);
          ctx.stroke();

          // Chrome Corner Studs
          ctx.fillStyle = '#f8fafc';
          [t1, t2, t3, t4].forEach((pt) => {
            ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
          });
        } else {
          // --- SHATTERED GLASS TABLE ---
          // Collapsed bent chrome frame
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x - 5, p2.y + 2);
          ctx.lineTo(p3.x - 4, p3.y - 1);
          ctx.lineTo(p4.x + 2, p4.y);
          ctx.closePath();
          ctx.stroke();

          // Fallen detached chrome legs
          ctx.fillStyle = '#64748b';
          ctx.fillRect(p1.x + 4, p1.y - 2, 12, 3);
          ctx.fillRect(p3.x - 14, p3.y + 2, 10, 3);

          // Sparkling shattered glass crystals scattered on the floor
          const shards = [
            { dx: -12, dy: -6, color: '#38bdf8', w: 5, h: 3 },
            { dx: -4, dy: -2, color: '#bae6fd', w: 6, h: 4 },
            { dx: 6, dy: -8, color: '#ffffff', w: 4, h: 3 },
            { dx: 14, dy: 4, color: '#38bdf8', w: 7, h: 3 },
            { dx: -8, dy: 6, color: '#e0f2fe', w: 5, h: 4 },
            { dx: 2, dy: 3, color: '#ffffff', w: 6, h: 3 },
            { dx: 10, dy: -2, color: '#0284c7', w: 4, h: 4 },
          ];
          shards.forEach((s) => {
            ctx.fillStyle = s.color;
            ctx.fillRect(midX + s.dx, midY + s.dy, s.w, s.h);
          });
        }
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

  // --- PLAYER RENDERING WITH DETAILED 90s CYBERPUNK ACTION HERO VISUALS & VISIBLE MASKS ---
  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const pos = this.toIso(p.x, p.y);
    const time = performance.now() * 0.003;
    const isMoving = Math.hypot(p.vx, p.vy) > 0.4;
    const walkPhase = isMoving ? Math.sin(time * 18) : 0;

    ctx.save();
    ctx.translate(pos.x, pos.y - 15);

    // Roll rotation and motion blur afterimages
    if (p.isRolling) {
      ctx.rotate(p.rollTimer * 0.45);
      // Motion blur afterimage trail
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.beginPath();
      ctx.arc(-p.vx * 2, -p.vy * 2, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1. Isometric Ground Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Animated Walking Legs (Combat Boots & Stride)
    if (!p.isRolling) {
      const legStride = walkPhase * 6;
      // Movement direction angle
      const moveAngle = isMoving ? Math.atan2(p.vy, p.vx) : p.angle;
      const legDx = Math.cos(moveAngle);
      const legDy = Math.sin(moveAngle);

      // Left Leg
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-legDx * legStride - 4, 12 - legDy * legStride * 0.5, 4, 2.5, moveAngle, 0, Math.PI * 2);
      ctx.fill();
      // Silver boot buckle
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-legDx * legStride - 5, 11 - legDy * legStride * 0.5, 2, 2);

      // Right Leg
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(legDx * legStride + 4, 12 + legDy * legStride * 0.5, 4, 2.5, moveAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(legDx * legStride + 3, 11 + legDy * legStride * 0.5, 2, 2);
    }

    // 3. Flowing 90s Leather Trenchcoat Tails (Reacts dynamically to motion)
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    const coatAngle = p.angle + Math.PI;
    const flutter = isMoving ? Math.sin(time * 15) * 4 : 0;
    ctx.moveTo(Math.cos(coatAngle - 0.55) * 14, Math.sin(coatAngle - 0.55) * 14);
    ctx.lineTo(Math.cos(coatAngle) * (26 + flutter), Math.sin(coatAngle) * (26 + flutter));
    ctx.lineTo(Math.cos(coatAngle + 0.55) * 14, Math.sin(coatAngle + 0.55) * 14);
    ctx.closePath();
    ctx.fill();

    // Trenchcoat Leather Folds & Highlights
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(Math.cos(coatAngle - 0.3) * 12, Math.sin(coatAngle - 0.3) * 12);
    ctx.lineTo(Math.cos(coatAngle) * (22 + flutter * 0.7), Math.sin(coatAngle) * (22 + flutter * 0.7));
    ctx.lineTo(Math.cos(coatAngle + 0.3) * 12, Math.sin(coatAngle + 0.3) * 12);
    ctx.closePath();
    ctx.fill();

    // 4. Trenchcoat Torso & Belt
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();

    // Popped Leather Collar & Epaulets
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    // Silver Shoulder Rivets
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-12, -4, 2.5, 2.5);
    ctx.fillRect(10, -4, 2.5, 2.5);

    // Leather Utility Belt & Buckle
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, 4, 20, 3.5);
    ctx.fillStyle = '#f59e0b'; // Gold buckle
    ctx.fillRect(-2.5, 3.5, 5, 4.5);

    // Glowing Cyan Runic Lapel Trim
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15, p.angle - 0.75, p.angle + 0.75);
    ctx.stroke();

    // 5. Head Base
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(0, -5, 9, 0, Math.PI * 2);
    ctx.fill();

    // 6. VISIBLE RUNIC MASKS ON HEAD
    if (p.mask === 'WOLF') {
      // Werewolf Fur Hood with Tufted Ears & Glowing Amber Eyes!
      ctx.fillStyle = '#5c2206';
      ctx.beginPath();
      ctx.arc(0, -6, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(0, -6, 10, 0, Math.PI * 2);
      ctx.fill();

      // Sharp Wolf Ears (Left & Right)
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(-6, -23);
      ctx.lineTo(-2, -13);
      ctx.closePath();
      ctx.fill();
      // Inner pink ear tuft
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.moveTo(-8, -13);
      ctx.lineTo(-6, -19);
      ctx.lineTo(-4, -13);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(2, -13);
      ctx.lineTo(6, -23);
      ctx.lineTo(10, -12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.moveTo(4, -13);
      ctx.lineTo(6, -19);
      ctx.lineTo(8, -13);
      ctx.closePath();
      ctx.fill();

      // Feral Wolf Snout & Fangs
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -3, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -2, 2, 2.5);
      ctx.fillRect(1, -2, 2, 2.5);

      // Glowing Amber Eyes with Movement Streak
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(-6, -8, 4, 3);
      ctx.fillRect(2, -8, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -7, 2, 1.5);
      ctx.fillRect(3, -7, 2, 1.5);

      // Eye light trail when moving
      if (isMoving) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.fillRect(-p.vx * 1.5 - 5, -p.vy * 1.5 - 7, 3, 2);
        ctx.fillRect(-p.vx * 1.5 + 3, -p.vy * 1.5 - 7, 3, 2);
      }
    } else if (p.mask === 'VAMPIRE') {
      // Neon Magenta Vampire Shades & Slick Black Hair & Dracula Collar
      // High Vampire Popped Collar
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(-15, -18);
      ctx.lineTo(-8, -12);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(12, -4);
      ctx.lineTo(15, -18);
      ctx.lineTo(8, -12);
      ctx.closePath();
      ctx.fill();

      // Slicked Black Hair
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0, -9, 10, Math.PI, 0);
      ctx.fill();
      // Hair sheen highlight
      ctx.fillStyle = '#334155';
      ctx.fillRect(-5, -12, 10, 2);

      // Sharp White Fangs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -2, 1.5, 3);
      ctx.fillRect(1.5, -2, 1.5, 3);

      // Glowing Neon Pink Vampire Sunglasses with Horizontal Lens Flare!
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(-8, -8, 7, 4);
      ctx.fillRect(1, -8, 7, 4);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-1, -7, 2, 2);

      // Horizontal Sunglasses Lens Flare Glint
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.lineTo(14, -6);
      ctx.stroke();
    } else if (p.mask === 'MINOTAUR') {
      // Spartan/Minotaur War-Helm with Curved Golden Horns & Emerald Visor
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(0, -6, 11, 0, Math.PI * 2);
      ctx.fill();

      // Heavy Horns (Left & Right Curved Gold)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.quadraticCurveTo(-18, -16, -14, -25);
      ctx.stroke();
      // Brass Horn Rings
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-11, -12);
      ctx.lineTo(-9, -15);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(8, -6);
      ctx.quadraticCurveTo(18, -16, 14, -25);
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(11, -12);
      ctx.lineTo(9, -15);
      ctx.stroke();

      // Glowing Emerald Cyber-Visor Slit with Scanlines
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-6, -7, 12, 3);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(-3, -6, 6, 1);

      // Golden Septum Nose Ring
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -1, 2.5, 0, Math.PI);
      ctx.stroke();
    } else if (p.mask === 'ELF') {
      // Slender Pointed Elf Ears & Glowing Forehead Circlet & Silver Hair
      // Silver Hair Tufts
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, -8, 10, Math.PI, 0);
      ctx.fill();

      // Long Slender Pointed Elf Ears with Gold Cuffs
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.lineTo(-19, -9);
      ctx.lineTo(-7, -2);
      ctx.closePath();
      ctx.fill();
      // Gold Ear Cuff
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-12, -7, 2.5, 2.5);

      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.moveTo(7, -5);
      ctx.lineTo(19, -9);
      ctx.lineTo(7, -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(10, -7, 2.5, 2.5);

      // Runic Forehead Diadem & Glowing Sapphire Gem
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -6, 9, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, -10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -11, 2, 2);
    }

    // 7. Active Weapon in Hand (Distinct models for Magnum, Shotgun, SMG, Katana)
    ctx.rotate(p.angle);

    if (p.weapon.type === 'KATANA') {
      // Curved Carbon Steel Katana with Glowing Cyan Edge
      ctx.fillStyle = '#09090b'; // Tsuka (Handle)
      ctx.fillRect(4, 5, 8, 4);
      // Gold Tsuba (Guard)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(11, 3, 2.5, 8);
      // Steel Blade with Cyan Runic Edge
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(13, 5, 26, 3);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(13, 4, 26, 1.5);
    } else if (p.weapon.type === 'SHOTGUN') {
      // Heavy Combat 12-Gauge Pump Shotgun
      ctx.fillStyle = '#78350f'; // Wooden Stock
      ctx.fillRect(4, 5, 8, 5);
      ctx.fillStyle = '#1e293b'; // Receiver
      ctx.fillRect(12, 4, 12, 6);
      ctx.fillStyle = '#475569'; // Dual Barrels & Magazine Tube
      ctx.fillRect(24, 4, 16, 4.5);
      ctx.fillStyle = '#0f172a'; // Pump Grip
      ctx.fillRect(18, 6, 8, 4);
    } else if (p.weapon.type === 'SMG') {
      // Tactical Submachine Gun with Extended Mag
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, 4, 18, 5);
      // Extended Banana Magazine
      ctx.fillStyle = '#334155';
      ctx.fillRect(12, 8, 4, 8);
      // Barrel & Suppressor
      ctx.fillStyle = '#64748b';
      ctx.fillRect(24, 5, 8, 3.5);
    } else {
      // Heavy Magnum Revolver with Cylinder
      ctx.fillStyle = '#78350f'; // Rosewood Grip
      ctx.fillRect(5, 6, 6, 5);
      ctx.fillStyle = '#cbd5e1'; // Chrome Frame & Fluted Cylinder
      ctx.fillRect(10, 4, 8, 6);
      ctx.fillStyle = '#94a3b8'; // Long Heavy Barrel
      ctx.fillRect(18, 5, 14, 4);

      // Subtle Laser Aiming Sight
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 7);
      ctx.lineTo(120, 7);
      ctx.stroke();
    }

    // Dynamic Muzzle Flash Starburst
    if (this.muzzleFlashTimer > 0) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(36, 6, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(36, 6, 7, 0, Math.PI * 2);
      ctx.fill();
      // Sparks
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(36, -8);
      ctx.lineTo(36, 20);
      ctx.moveTo(22, 6);
      ctx.lineTo(50, 6);
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- ENEMY RENDERING WITH DETAILED FACTION VISUALS & BOSS DETAILS ---
  private renderEnemies(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.003;

    this.enemies.forEach((enemy) => {
      const pos = this.toIso(enemy.x, enemy.y);

      ctx.save();
      ctx.translate(pos.x, pos.y - 12);

      if (enemy.state === 'DEAD') {
        // Dead body on floor with pixel gore pool
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 8, 18, 9, enemy.angle, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2d0606';
        ctx.beginPath();
        ctx.ellipse(0, 6, 16, 8, enemy.angle, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      if (enemy.state === 'KNOCKED_DOWN') {
        // Knocked down state with classic 90s cartoon swirling dizzy stars!
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 8, 18, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, 6, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Groaning head
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(10, 3, 6, 0, Math.PI * 2);
        ctx.fill();

        // Animated Swirling Dizzy Stars (⭐) in 3D Ellipse Orbit above head
        const starOrbitTime = time * 5;
        for (let s = 0; s < 3; s++) {
          const starAngle = starOrbitTime + (s * (Math.PI * 2)) / 3;
          const starX = Math.cos(starAngle) * 16;
          const starY = -18 + Math.sin(starAngle) * 6;

          // 5-point yellow star
          ctx.fillStyle = '#facc15';
          ctx.fillRect(starX - 2, starY - 2, 4, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(starX - 1, starY - 1, 2, 2);
        }

        // Execution Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-75, -34, 150, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💀 BAYGIN [SPACE: İNFAZ]', 0, -19);
        ctx.restore();
        return;
      }

      // 1. Isometric Ground Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
      ctx.beginPath();
      const shadowW = enemy.race === 'BOSS_JACK' ? 26 : enemy.race === 'ORC_BOUNCER' ? 20 : 15;
      const shadowH = shadowW * 0.5;
      ctx.ellipse(0, 16, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Vision / Flashlight Cone
      const coneColor =
        enemy.state === 'CHASE'
          ? 'rgba(239, 68, 68, 0.22)'
          : enemy.state === 'INVESTIGATE'
          ? 'rgba(250, 204, 21, 0.18)'
          : 'rgba(239, 68, 68, 0.05)';

      ctx.fillStyle = coneColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 160, enemy.angle - 0.45, enemy.angle + 0.45);
      ctx.closePath();
      ctx.fill();

      // 3. Alert Status Icon above head (90s Arcade Elastic Pop-in)
      if (enemy.state === 'CHASE' || enemy.state === 'INVESTIGATE') {
        const isChase = enemy.state === 'CHASE';
        const iconY = enemy.race === 'BOSS_JACK' ? -38 : -28;
        const anim = enemy.alertAnimTimer ?? 0;

        let scale = 1.0;
        if (anim > 0) {
          const t = (22 - anim) / 22;
          scale = t < 0.35 ? Math.max(0.1, t * 4.5) : 1.58 - (t - 0.35) * 0.89;
        }

        ctx.save();
        ctx.translate(0, iconY);

        if (anim > 0) {
          const ringRadius = (22 - anim) * 2.4;
          const ringAlpha = (anim / 22) * 0.85;
          ctx.strokeStyle = isChase ? `rgba(239, 68, 68, ${ringAlpha})` : `rgba(250, 204, 21, ${ringAlpha})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, -6, ringRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = isChase ? `rgba(254, 202, 202, ${ringAlpha * 0.7})` : `rgba(254, 240, 138, ${ringAlpha * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -6, ringRadius * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.scale(scale, scale);

        // Comic 90s drop shadow & black border
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = '900 22px "Impact", "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 2, -4);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText('!', 0, -6);

        ctx.fillStyle = isChase ? '#ef4444' : '#facc15';
        ctx.fillText('!', 0, -6);

        // Specular glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1, -16, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Volumetric Character Body & Race Detailing
      if (enemy.race === 'ORC_BOUNCER') {
        // Hulking Orc Bouncer (Green muscular bulk, spiked pauldrons, tusks, studded vest)
        ctx.fillStyle = '#14532d'; // Shadow side
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#16a34a'; // Lit torso
        ctx.beginPath();
        ctx.arc(0, -3, 17, 0, Math.PI * 2);
        ctx.fill();

        // Studded Black Leather Biker Vest
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-14, -8, 28, 18);
        ctx.fillStyle = '#e2e8f0';
        // Vest studs
        for (let s = -10; s <= 10; s += 5) {
          ctx.fillRect(s, -4, 2, 2);
          ctx.fillRect(s, 4, 2, 2);
        }

        // Heavy Spiked Iron Pauldrons (Shoulder Pads)
        ctx.fillStyle = '#334155';
        ctx.fillRect(-22, -11, 9, 20);
        ctx.fillRect(13, -11, 9, 20);
        // Spikes
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-24, -8, 3, 3);
        ctx.fillRect(-24, 2, 3, 3);
        ctx.fillRect(21, -8, 3, 3);
        ctx.fillRect(21, 2, 3, 3);

        // Prominent Curved Ivory Tusks & Red Glowing Eyes
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-5, -13, 3, 5);
        ctx.fillRect(2, -13, 3, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-7, -9, 3, 2);
        ctx.fillRect(4, -9, 3, 2);
      } else if (enemy.race === 'VAMPIRE_HITMAN') {
        // Vampire Hitman / Cyber Thug (Mafia suit, red silk tie, cyber shades)
        ctx.fillStyle = '#1e1b4b'; // Midnight Navy Suit
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // White Dress Shirt & Red Tie
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-3, -7, 6, 12);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-1.5, -4, 3, 8);

        // Slicked Raven Hair
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(0, -6, 10, Math.PI, 0);
        ctx.fill();

        // Cybernetic Red Visor HUD with Horizontal Scanline
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-7, -7, 14, 3.5);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(-2, -6, 4, 1.5);
      } else if (enemy.race === 'BOSS_JACK') {
        // Werewolf Mob Boss "Big Claw" Jack (Fur coat, pinstripe suit, gold chain, lit cigar!)
        ctx.fillStyle = '#5c2206';
        ctx.beginPath();
        ctx.arc(0, 0, 27, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.arc(0, -4, 23, 0, Math.PI * 2);
        ctx.fill();

        // White Fur-Trimmed Mafia Overcoat
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-22, -12, 44, 24);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-20, -10, 40, 20);

        // Crimson Pinstripe Suit Inlay
        ctx.fillStyle = '#881337';
        ctx.fillRect(-12, -8, 24, 18);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(-6, 10);
        ctx.moveTo(6, -8);
        ctx.lineTo(6, 10);
        ctx.stroke();

        // Solid Gold Mob Boss Chain Necklace with Ruby Pendant
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, -1, 14, 0, Math.PI);
        ctx.stroke();
        // Ruby Medallion
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3, 11, 6, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, 12, 2, 2);

        // Werewolf Feral Eyes
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-9, -13, 6, 3.5);
        ctx.fillRect(3, -13, 6, 3.5);

        // Lit Cuban Cigar clamped in teeth with glowing cherry & smoke wisp!
        ctx.fillStyle = '#78350f';
        ctx.fillRect(8, -5, 10, 3);
        ctx.fillStyle = '#f97316'; // Glowing cherry ember
        ctx.fillRect(17, -5, 3, 3);

        // Rising animated smoke curl
        const smokeY = -5 - ((time * 30) % 20);
        const smokeX = 18 + Math.sin(time * 6) * 3;
        ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Goblin Gunner (Small, green, purple bandana, twitching pointed ears)
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(0, -2, 10, 0, Math.PI * 2);
        ctx.fill();

        // Purple bandana with knot tails
        ctx.fillStyle = '#9333ea';
        ctx.fillRect(-8, -9, 16, 5);
        ctx.fillRect(7, -7, 5, 4);

        // Pointed Goblin Ears
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(-10, -3);
        ctx.lineTo(-17, -6);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(10, -3);
        ctx.lineTo(17, -6);
        ctx.lineTo(9, 0);
        ctx.closePath();
        ctx.fill();
      }

      // 5. Weapon held in hand with directional angle
      ctx.rotate(enemy.angle);
      ctx.fillStyle = WEAPON_DEFS[enemy.weapon].color;
      ctx.fillRect(8, 4, 17, 5);
      // Gun barrel tip
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(23, 5, 3, 3);

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

    // Dynamic Nightclub Overhead Spotlights sweeping gracefully across dancefloor
    const clubTime = performance.now() * 0.0012;
    const danceCenter = this.toIso(630, 390);

    // Cyan Dancefloor Spotlight beam
    const spot1X = danceCenter.x + Math.sin(clubTime) * 130;
    const spot1Y = danceCenter.y + Math.cos(clubTime * 0.8) * 65;
    const spot1Grad = ctx.createRadialGradient(spot1X, spot1Y, 5, spot1X, spot1Y, 115);
    spot1Grad.addColorStop(0, 'rgba(6, 182, 212, 0.16)');
    spot1Grad.addColorStop(0.6, 'rgba(6, 182, 212, 0.05)');
    spot1Grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = spot1Grad;
    ctx.beginPath();
    ctx.ellipse(spot1X, spot1Y, 115, 58, 0, 0, Math.PI * 2);
    ctx.fill();

    // Magenta Dancefloor Spotlight beam
    const spot2X = danceCenter.x + Math.cos(clubTime * 1.1) * 120;
    const spot2Y = danceCenter.y + Math.sin(clubTime * 0.9) * 60;
    const spot2Grad = ctx.createRadialGradient(spot2X, spot2Y, 5, spot2X, spot2Y, 125);
    spot2Grad.addColorStop(0, 'rgba(236, 72, 153, 0.16)');
    spot2Grad.addColorStop(0.6, 'rgba(236, 72, 153, 0.05)');
    spot2Grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
    ctx.fillStyle = spot2Grad;
    ctx.beginPath();
    ctx.ellipse(spot2X, spot2Y, 125, 62, 0, 0, Math.PI * 2);
    ctx.fill();

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
    if (w <= 0 || h <= 0) return;

    ctx.save();

    // 1. Subtle Chromatic Aberration (1994 Electron Gun Convergence Drift)
    // Red channel shift to the left (-2px) and Cyan channel shift to the right (+2px)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.09;
    ctx.drawImage(this.canvas, -2, 0);
    ctx.drawImage(this.canvas, 2, 0);
    ctx.restore();

    // 2. Dense CRT Horizontal Raster Scanlines
    const scanlineStep = 3;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    for (let y = 0; y < h; y += scanlineStep) {
      ctx.fillRect(0, y, w, 1.25);
    }

    // 3. Trinitron Aperture Grille / Subpixel Phosphor Column Mask
    ctx.fillStyle = 'rgba(0, 0, 0, 0.038)';
    for (let x = 0; x < w; x += 3) {
      ctx.fillRect(x, 0, 1, h);
    }

    // 4. VHS Tape Tracking Hum Bar (Slow vertical rolling scan line distortion)
    const now = performance.now();
    const vhsBarY = ((now * 0.045) % (h + 140)) - 70;
    const vhsGrad = ctx.createLinearGradient(0, vhsBarY, 0, vhsBarY + 70);
    vhsGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vhsGrad.addColorStop(0.3, 'rgba(6, 182, 212, 0.035)');
    vhsGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
    vhsGrad.addColorStop(0.7, 'rgba(236, 72, 153, 0.035)');
    vhsGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = vhsGrad;
    ctx.fillRect(0, vhsBarY, w, 70);

    // 5. Bottom VCR Head-Switching Jitter Line (Classic 1994 VHS tracking artifact)
    if (h > 60) {
      const headNoiseH = 6;
      const headNoiseY = h - headNoiseH;
      const jitterOffset = Math.sin(now * 0.03) * 2.5 + (Math.random() - 0.5) * 1.5;
      ctx.save();
      ctx.drawImage(this.canvas, 0, headNoiseY, w, headNoiseH, jitterOffset, headNoiseY, w, headNoiseH);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, h - 3, w, 3);
      ctx.restore();
    }

    // 6. Deep CRT Edge Darkening & Radial Tube Vignette
    const vigRadius = Math.hypot(w / 2, h / 2);
    const vigGrad = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.3,
      w / 2, h / 2, vigRadius
    );
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.52, 'rgba(0, 0, 0, 0.16)');
    vigGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.48)');
    vigGrad.addColorStop(0.9, 'rgba(0, 0, 0, 0.78)');
    vigGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.94)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    // 7. Worn-out 1994 Curved Glass Tube Corner Bezels (Simulating physical curved monitor housing)
    const cornerSize = Math.min(75, Math.min(w, h) * 0.09);

    // Top-Left corner shadow
    const tlGrad = ctx.createRadialGradient(cornerSize, cornerSize, 0, 0, 0, cornerSize * 1.4);
    tlGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    tlGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = tlGrad;
    ctx.fillRect(0, 0, cornerSize, cornerSize);

    // Top-Right corner shadow
    const trGrad = ctx.createRadialGradient(w - cornerSize, cornerSize, 0, w, 0, cornerSize * 1.4);
    trGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    trGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = trGrad;
    ctx.fillRect(w - cornerSize, 0, cornerSize, cornerSize);

    // Bottom-Left corner shadow
    const blGrad = ctx.createRadialGradient(cornerSize, h - cornerSize, 0, 0, h, cornerSize * 1.4);
    blGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    blGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = blGrad;
    ctx.fillRect(0, h - cornerSize, cornerSize, cornerSize);

    // Bottom-Right corner shadow
    const brGrad = ctx.createRadialGradient(w - cornerSize, h - cornerSize, 0, w, h, cornerSize * 1.4);
    brGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    brGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
    ctx.fillStyle = brGrad;
    ctx.fillRect(w - cornerSize, h - cornerSize, cornerSize, cornerSize);

    // 8. Faint CRT Cyan Phosphor Afterglow Tint
    ctx.fillStyle = 'rgba(6, 182, 212, 0.015)';
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
