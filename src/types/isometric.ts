export type WeaponType = 'FISTS' | 'KATANA' | 'BAT' | 'MAGNUM' | 'SHOTGUN' | 'SMG';

export interface WeaponData {
  type: WeaponType;
  name: string;
  isRanged: boolean;
  damage: number;
  ammo: number;
  maxAmmo: number;
  fireRate: number; // frames between attacks
  spread: number;
  pellets?: number;
  color: string;
}

export type EnemyState = 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'ATTACK' | 'KNOCKED_DOWN' | 'DEAD';

export type EnemyRace = 'ORC_BOUNCER' | 'GOBLIN_GUNNER' | 'VAMPIRE_HITMAN' | 'BOSS_JACK';

export interface EnemyEntity {
  id: number;
  race: EnemyRace;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  state: EnemyState;
  hp: number;
  maxHp: number;
  weapon: WeaponType;
  ammo: number;
  patrolPoints: { x: number; y: number }[];
  currentPatrolIdx: number;
  attackCooldown: number;
  knockdownTimer: number;
  alertTimer: number;
  alertAnimTimer?: number;
  prevAlertState?: EnemyState;
  investigateTarget?: { x: number; y: number } | null;
  investigateTimer?: number;
  facing: number;
}

export type DestructibleType = 'PLANT_POT' | 'FLOOR_LAMP' | 'GLASS_TABLE';

export interface DestructibleProp {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: DestructibleType;
  hp: number;
  isBroken: boolean;
  brokenTimer?: number;
}

export interface DoorEntity {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  targetAngle: number;
  isOpen: boolean;
  swingSpeed: number;
  isKicked: boolean;
}

export interface DroppedWeapon {
  id: number;
  type: WeaponType;
  ammo: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isFlying: boolean;
  angle: number;
}

export type BloodDecalType =
  | 'PIXEL_POOL'
  | 'PIXEL_SPLATTER'
  | 'PIXEL_SPRAY'
  | 'GIB_CHUNK'
  | 'POOL'
  | 'SPLATTER'
  | 'CASING';

export interface PixelBloodBlock {
  dx: number;
  dy: number;
  w: number;
  h: number;
  color: string;
}

export interface BloodDecal {
  x: number;
  y: number;
  size: number;
  color: string;
  type: BloodDecalType;
  angle?: number;
  blocks?: PixelBloodBlock[];
}

export type RunicMaskId = 'WOLF' | 'VAMPIRE' | 'MINOTAUR' | 'ELF';

export interface RunicMask {
  id: RunicMaskId;
  name: string;
  title: string;
  icon: string;
  bonus: string;
  color: string;
}

export interface ShellCasing {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  angle: number;
  vAngle: number;
  color: string;
  bounces: number;
  settled: boolean;
  caliber: 'MAGNUM' | 'SHOTGUN' | 'SMG';
}

export interface BloodyFootprint {
  x: number;
  y: number;
  angle: number;
  alpha: number;
  isLeft: boolean;
  color: string;
}

export interface PlayerIsometricState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  weapon: WeaponData;
  isRolling: boolean;
  rollTimer: number;
  attackCooldown: number;
  score: number;
  combo: number;
  comboTimer: number;
  mask: RunicMaskId;
  bloodOnBoots?: number;
}

