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
  investigateTarget?: { x: number; y: number } | null;
  investigateTimer?: number;
  facing: number;
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

export interface BloodDecal {
  x: number;
  y: number;
  size: number;
  color: string;
  type: 'POOL' | 'SPLATTER' | 'CASING';
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
}
