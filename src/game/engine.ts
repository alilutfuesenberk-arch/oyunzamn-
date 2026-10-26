import { BossId, PlayerStats } from '../types/game';
import { soundEngine } from '../utils/audio';

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'SOLID' | 'WALL' | 'STEAM_VENT' | 'ELECTRIC' | 'CRUMBLING';
  timer?: number;
  broken?: boolean;
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
}

export interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface BossState {
  id: BossId;
  name: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  phase: number;
  attackTimer: number;
  currentAttack: string;
  telegraphTimer: number;
  isStunned: boolean;
  stunTimer: number;
  facing: number;
  color: string;
}

export interface Enemy {
  id: number;
  type: 'GOBLIN_SNIPER' | 'ORC_BOUNCER';
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  hp: number;
  maxHp: number;
  facing: number;
  patrolMin: number;
  patrolMax: number;
  attackTimer: number;
  alert: boolean;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  isEnemy: boolean;
  damage: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Camera
  private camera = { x: 0, y: 0, shake: 0 };

  // World bounds
  public worldWidth: number = 2400;
  public worldHeight: number = 800;

  // Hitstop
  private hitstopTimer: number = 0;

  // Player State
  public player = {
    x: 100,
    y: 550,
    w: 28,
    h: 52,
    vx: 0,
    vy: 0,
    facing: 1, // 1: right, -1: left
    isGrounded: false,
    isTouchingWall: 0, // -1: left, 1: right, 0: none
    isWallSliding: false,
    canDoubleJump: true,
    hasDoubleJumped: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    dashTimer: 0,
    dashCooldownTimer: 0,
    parryTimer: 0,
    invulnerableTimer: 0,
    comboStep: 0,
    attackTimer: 0,
    attackHitboxActive: false,
    isAttacking: false,
    trail: [] as { x: number; y: number; alpha: number }[],
  };

  // Stats reference
  public stats: PlayerStats;
  private onStatsChange: (stats: PlayerStats) => void;
  private onBossDefeated: (bossId: BossId) => void;

  // Active Boss
  public activeBossId: BossId = 'WEREWOLF_JACK';
  public boss: BossState | null = null;

  // Environment
  public platforms: Platform[] = [];
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public damageNumbers: DamageNumber[] = [];

  // Inputs
  private keys: { [key: string]: boolean } = {};

  constructor(
    canvas: HTMLCanvasElement,
    stats: PlayerStats,
    onStatsChange: (stats: PlayerStats) => void,
    onBossDefeated: (bossId: BossId) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.stats = stats;
    this.onStatsChange = onStatsChange;
    this.onBossDefeated = onBossDefeated;

    this.bindInputs();
    this.loadLevel('WEREWOLF_JACK');
  }

  public setBoss(bossId: BossId) {
    this.activeBossId = bossId;
    this.loadLevel(bossId);
  }

  private loadLevel(bossId: BossId) {
    this.player.x = 120;
    this.player.y = 550;
    this.player.vx = 0;
    this.player.vy = 0;
    this.projectiles = [];
    this.particles = [];
    this.damageNumbers = [];

    // Base ground
    this.platforms = [
      { x: 0, y: 700, w: 2400, h: 100, type: 'SOLID' }, // Floor
      { x: 0, y: 0, w: 50, h: 800, type: 'WALL' }, // Left wall
      { x: 2350, y: 0, w: 50, h: 800, type: 'WALL' }, // Right wall

      // Urban Platforms & Fire Escapes
      { x: 200, y: 580, w: 180, h: 20, type: 'SOLID' },
      { x: 440, y: 480, w: 190, h: 20, type: 'SOLID' },
      { x: 340, y: 350, w: 60, h: 240, type: 'WALL' }, // Tall brick pillar for wall cling!
      { x: 440, y: 320, w: 220, h: 20, type: 'SOLID' },

      // Steam Vent (Jump Pad)
      { x: 740, y: 680, w: 60, h: 20, type: 'STEAM_VENT' },

      // High Scaffolding
      { x: 860, y: 460, w: 180, h: 20, type: 'SOLID' },
      { x: 1100, y: 520, w: 150, h: 18, type: 'CRUMBLING', timer: 0 },
      { x: 1300, y: 420, w: 180, h: 20, type: 'SOLID' },
      { x: 1540, y: 280, w: 50, h: 320, type: 'WALL' }, // Second tall wall for slide/jump!

      // Electric Conduit Hazard
      { x: 1020, y: 685, w: 160, h: 15, type: 'ELECTRIC' },

      // Boss Arena Platforms
      { x: 1650, y: 560, w: 220, h: 20, type: 'SOLID' },
      { x: 1950, y: 450, w: 240, h: 20, type: 'SOLID' },
      { x: 1820, y: 680, w: 60, h: 20, type: 'STEAM_VENT' },
    ];

    // Regular syndicate minions
    this.enemies = [
      {
        id: 1,
        type: 'GOBLIN_SNIPER',
        x: 480,
        y: 440,
        w: 24,
        h: 36,
        vx: 1,
        hp: 45,
        maxHp: 45,
        facing: 1,
        patrolMin: 450,
        patrolMax: 610,
        attackTimer: 100,
        alert: false,
      },
      {
        id: 2,
        type: 'ORC_BOUNCER',
        x: 900,
        y: 640,
        w: 36,
        h: 56,
        vx: 1,
        hp: 90,
        maxHp: 90,
        facing: 1,
        patrolMin: 850,
        patrolMax: 1050,
        attackTimer: 120,
        alert: false,
      },
      {
        id: 3,
        type: 'GOBLIN_SNIPER',
        x: 1340,
        y: 380,
        w: 24,
        h: 36,
        vx: -1,
        hp: 45,
        maxHp: 45,
        facing: -1,
        patrolMin: 1310,
        patrolMax: 1460,
        attackTimer: 80,
        alert: false,
      },
    ];

    // Initialize Boss
    if (bossId === 'WEREWOLF_JACK') {
      this.boss = {
        id: 'WEREWOLF_JACK',
        name: '"Koca Pençe" Jack',
        title: 'Kurtadam Biker Reisi · Hell\'s Hounds MC',
        x: 2050,
        y: 620,
        w: 48,
        h: 75,
        vx: 0,
        vy: 0,
        hp: 550,
        maxHp: 550,
        phase: 1,
        attackTimer: 90,
        currentAttack: 'IDLE',
        telegraphTimer: 0,
        isStunned: false,
        stunTimer: 0,
        facing: -1,
        color: '#f97316',
      };
    } else if (bossId === 'GOLIATH_MEDUSA') {
      this.boss = {
        id: 'GOLIATH_MEDUSA',
        name: 'Goliath & Madam Medusa',
        title: 'Minotor Gladyatör & Gorgon Tefeci',
        x: 2050,
        y: 610,
        w: 58,
        h: 88,
        vx: 0,
        vy: 0,
        hp: 680,
        maxHp: 680,
        phase: 1,
        attackTimer: 100,
        currentAttack: 'IDLE',
        telegraphTimer: 0,
        isStunned: false,
        stunTimer: 0,
        facing: -1,
        color: '#10b981',
      };
    } else if (bossId === 'LORD_VLADISLAUS') {
      this.boss = {
        id: 'LORD_VLADISLAUS',
        name: 'Lord Vladislaus',
        title: 'Vampir Gece Kulübü Lordu · The Crypt',
        x: 2050,
        y: 620,
        w: 42,
        h: 76,
        vx: 0,
        vy: 0,
        hp: 600,
        maxHp: 600,
        phase: 1,
        attackTimer: 80,
        currentAttack: 'IDLE',
        telegraphTimer: 0,
        isStunned: false,
        stunTimer: 0,
        facing: -1,
        color: '#ec4899',
      };
    } else {
      this.boss = {
        id: 'CHIEF_MALAKOR',
        name: 'Başkomiser Malakor',
        title: 'Yozlaşmış Tiefling İblis Amir',
        x: 2050,
        y: 610,
        w: 50,
        h: 84,
        vx: 0,
        vy: 0,
        hp: 800,
        maxHp: 800,
        phase: 1,
        attackTimer: 80,
        currentAttack: 'IDLE',
        telegraphTimer: 0,
        isStunned: false,
        stunTimer: 0,
        facing: -1,
        color: '#ef4444',
      };
    }
  }

  private bindInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.player.jumpBufferTimer = 8; // Jump buffering
      }

      if (e.code === 'KeyJ' || e.code === 'KeyX' || e.code === 'KeyC') {
        this.triggerAttack();
      }

      if (e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.triggerDash();
      }

      if (e.code === 'KeyL' || e.code === 'KeyE') {
        this.triggerParry();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      // Variable jump height
      if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && this.player.vy < -4) {
        this.player.vy *= 0.45;
      }
    });

    window.addEventListener('blur', () => {
      this.keys = {};
    });
  }

  // --- ACTIONS ---

  public triggerAttack() {
    if (this.player.attackTimer > 0) return;

    this.player.isAttacking = true;
    this.player.comboStep = (this.player.comboStep + 1) % 3;
    this.player.attackTimer = 16;
    this.player.attackHitboxActive = true;

    soundEngine.playSwordSlash(this.player.comboStep);

    // Spawn sword arc particles
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x: this.player.x + (this.player.facing === 1 ? this.player.w + 15 : -15),
        y: this.player.y + 15 + (Math.random() * 24 - 12),
        vx: (this.player.facing * 4 + (Math.random() * 4 - 2)),
        vy: (Math.random() * 6 - 3),
        life: 1,
        maxLife: 15,
        color: this.player.comboStep === 2 ? '#38bdf8' : '#06b6d4',
        size: Math.random() * 3 + 2,
      });
    }

    // Check hit against enemies
    const swordBox = {
      x: this.player.facing === 1 ? this.player.x + this.player.w : this.player.x - 65,
      y: this.player.y - 10,
      w: 65,
      h: this.player.h + 20,
    };

    // Enemies
    this.enemies.forEach((enemy) => {
      if (this.checkAABB(swordBox, enemy)) {
        this.dealDamageToEnemy(enemy);
      }
    });

    // Boss
    if (this.boss && this.checkAABB(swordBox, this.boss)) {
      this.dealDamageToBoss(this.boss);
    }
  }

  public triggerDash() {
    if (this.player.dashCooldownTimer > 0 || this.player.dashTimer > 0) return;
    this.player.dashTimer = 14;
    this.player.dashCooldownTimer = this.stats.dashCooldown;
    this.player.invulnerableTimer = 14;
    this.player.vx = this.player.facing * 14;
    this.player.vy = 0;
    soundEngine.playDash();
  }

  public triggerParry() {
    if (!this.stats.canParry || this.player.parryTimer > 0) return;
    this.player.parryTimer = 16;
    this.player.invulnerableTimer = 16;

    // Deflect nearby projectiles
    let parriedAny = false;
    this.projectiles.forEach((p) => {
      const dist = Math.hypot(p.x - (this.player.x + this.player.w / 2), p.y - (this.player.y + this.player.h / 2));
      if (dist < 75 && p.isEnemy) {
        p.isEnemy = false;
        p.vx = -p.vx * 1.5;
        p.vy = -p.vy * 1.5;
        p.color = '#38bdf8';
        parriedAny = true;
      }
    });

    // Boss parry stun check
    if (this.boss && this.boss.telegraphTimer > 0) {
      const distBoss = Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y);
      if (distBoss < 110) {
        this.boss.isStunned = true;
        this.boss.stunTimer = 90;
        this.boss.telegraphTimer = 0;
        this.boss.currentAttack = 'STUNNED';
        parriedAny = true;
        this.camera.shake = 12;
      }
    }

    if (parriedAny) {
      soundEngine.playParry();
      this.hitstopTimer = 3;
      this.addDamageNumber(this.player.x + 10, this.player.y - 20, 'PARRY!', '#38bdf8');
    }
  }

  private dealDamageToEnemy(enemy: Enemy) {
    const isCrit = Math.random() < this.stats.critChance;
    const baseDmg = this.stats.attackPower * (this.player.comboStep === 2 ? 1.5 : 1.0);
    const damage = Math.round(isCrit ? baseDmg * 2 : baseDmg);

    enemy.hp -= damage;
    this.hitstopTimer = 2;
    this.camera.shake = isCrit ? 6 : 3;

    soundEngine.playHitImpact(isCrit);
    this.addDamageNumber(enemy.x + enemy.w / 2, enemy.y, `${damage}${isCrit ? '!' : ''}`, isCrit ? '#f43f5e' : '#fbbf24');

    // Knockback
    enemy.vx = this.player.facing * 5;

    // Defeated
    if (enemy.hp <= 0) {
      this.stats.clues += 12;
      this.onStatsChange({ ...this.stats });
      for (let i = 0; i < 15; i++) {
        this.particles.push({
          x: enemy.x + enemy.w / 2,
          y: enemy.y + enemy.h / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1,
          maxLife: 25,
          color: '#10b981',
          size: Math.random() * 4 + 2,
        });
      }
    }
  }

  private dealDamageToBoss(boss: BossState) {
    if (boss.hp <= 0) return;
    const isCrit = Math.random() < this.stats.critChance;
    const baseDmg = this.stats.attackPower * (this.player.comboStep === 2 ? 1.5 : 1.0);
    const damage = Math.round(isCrit ? baseDmg * 2 : baseDmg);

    boss.hp -= damage;
    this.hitstopTimer = 3;
    this.camera.shake = isCrit ? 8 : 4;

    soundEngine.playHitImpact(isCrit);
    this.addDamageNumber(boss.x + boss.w / 2, boss.y, `${damage}${isCrit ? '!' : ''}`, isCrit ? '#f43f5e' : '#fbbf24');

    // Spawn sparks
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: boss.x + boss.w / 2,
        y: boss.y + boss.h / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        maxLife: 20,
        color: '#facc15',
        size: Math.random() * 3 + 2,
      });
    }

    if (boss.hp <= 0) {
      boss.hp = 0;
      this.camera.shake = 18;
      this.stats.clues += 100;
      this.onStatsChange({ ...this.stats });
      this.onBossDefeated(boss.id);
    }
  }

  private addDamageNumber(x: number, y: number, text: string, color: string) {
    this.damageNumbers.push({ x, y, text, color, life: 30 });
  }

  // --- MAIN LOOP ---

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
    // Hitstop logic
    if (this.hitstopTimer > 0) {
      this.hitstopTimer--;
      return;
    }

    // Cooldown timers
    if (this.player.attackTimer > 0) this.player.attackTimer--;
    if (this.player.dashCooldownTimer > 0) this.player.dashCooldownTimer--;
    if (this.player.dashTimer > 0) this.player.dashTimer--;
    if (this.player.parryTimer > 0) this.player.parryTimer--;
    if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer--;
    if (this.player.jumpBufferTimer > 0) this.player.jumpBufferTimer--;
    if (this.player.coyoteTimer > 0) this.player.coyoteTimer--;

    this.updatePlayerPhysics(dt);
    this.updateBossAI();
    this.updateEnemies();
    this.updateProjectiles();
    this.updateParticles();
    this.updateCamera();
  }

  private updatePlayerPhysics(dt: number) {
    const p = this.player;

    // Afterimage trail when dashing or combo
    if (p.dashTimer > 0 || (p.attackTimer > 0 && p.comboStep === 2)) {
      p.trail.push({ x: p.x, y: p.y, alpha: 0.6 });
    }
    p.trail.forEach((t) => (t.alpha -= 0.08));
    p.trail = p.trail.filter((t) => t.alpha > 0);

    // Normal movement input (if not dashing)
    if (p.dashTimer <= 0) {
      let moveDir = 0;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir += 1;

      if (moveDir !== 0) {
        p.facing = moveDir;
        p.vx += moveDir * 32 * dt * 60;
        const maxSpeed = 7.5;
        p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
      } else {
        p.vx *= 0.82; // Ground friction
      }

      // Gravity
      const gravity = 28 * dt * 60;
      p.vy += gravity;

      // Wall Cling & Slide Logic
      if (p.isTouchingWall !== 0 && !p.isGrounded && p.vy > 0) {
        p.isWallSliding = true;
        p.vy = Math.min(p.vy, 2.5); // Slow slide down wall
        soundEngine.playWallSlide();
        p.canDoubleJump = true; // Wall cling recharges double jump!
      } else {
        p.isWallSliding = false;
      }

      // Jump Logic (with Coyote Time and Jump Buffering)
      if (p.jumpBufferTimer > 0) {
        if (p.isGrounded || p.coyoteTimer > 0) {
          // Normal Jump
          p.vy = -13.5;
          p.isGrounded = false;
          p.coyoteTimer = 0;
          p.jumpBufferTimer = 0;
          p.hasDoubleJumped = false;
          soundEngine.playDoubleJump();
        } else if (p.isWallSliding && this.stats.canWallJump) {
          // Wall Jump (kick off wall away from touching wall)
          p.vy = -13;
          p.vx = -p.isTouchingWall * 9;
          p.facing = -p.isTouchingWall;
          p.jumpBufferTimer = 0;
          soundEngine.playDoubleJump();
          // Spawn wall dust
          for (let i = 0; i < 6; i++) {
            this.particles.push({
              x: p.isTouchingWall === 1 ? p.x + p.w : p.x,
              y: p.y + p.h / 2,
              vx: -p.isTouchingWall * Math.random() * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 1,
              maxLife: 15,
              color: '#94a3b8',
              size: 3,
            });
          }
        } else if (!p.hasDoubleJumped && this.stats.canDoubleJump) {
          // Double Jump!
          p.vy = -12.5;
          p.hasDoubleJumped = true;
          p.jumpBufferTimer = 0;
          soundEngine.playDoubleJump();

          // Double jump burst particles
          for (let i = 0; i < 10; i++) {
            this.particles.push({
              x: p.x + p.w / 2,
              y: p.y + p.h,
              vx: (Math.random() - 0.5) * 6,
              vy: Math.random() * 3 + 2,
              life: 1,
              maxLife: 18,
              color: '#38bdf8',
              size: 3,
            });
          }
        }
      }
    }

    // Apply movement & collision with platforms
    p.x += p.vx;
    this.resolveHorizontalCollision();

    p.y += p.vy;
    this.resolveVerticalCollision();

    // World clamp
    p.x = Math.max(50, Math.min(this.worldWidth - 50 - p.w, p.x));
    if (p.y > this.worldHeight + 100) {
      // Pit respawn
      p.x = 100;
      p.y = 500;
      p.vy = 0;
      this.stats.hp = Math.max(1, this.stats.hp - 20);
      this.onStatsChange({ ...this.stats });
    }
  }

  private resolveHorizontalCollision() {
    const p = this.player;
    p.isTouchingWall = 0;

    for (const plat of this.platforms) {
      if (plat.broken) continue;
      if (this.checkAABB(p, plat)) {
        if (p.vx > 0) {
          p.x = plat.x - p.w;
          p.isTouchingWall = 1;
        } else if (p.vx < 0) {
          p.x = plat.x + plat.w;
          p.isTouchingWall = -1;
        }
        p.vx = 0;
      }
    }
  }

  private resolveVerticalCollision() {
    const p = this.player;
    const wasGrounded = p.isGrounded;
    p.isGrounded = false;

    for (const plat of this.platforms) {
      if (plat.broken) continue;

      if (this.checkAABB(p, plat)) {
        if (p.vy > 0) {
          // Landed on platform
          p.y = plat.y - p.h;
          p.vy = 0;
          p.isGrounded = true;
          p.hasDoubleJumped = false;

          // Special platform triggers
          if (plat.type === 'STEAM_VENT') {
            p.vy = -18.5; // Huge launch upwards!
            p.isGrounded = false;
            soundEngine.playSteamVent();
            this.camera.shake = 6;
            for (let i = 0; i < 12; i++) {
              this.particles.push({
                x: plat.x + plat.w / 2 + (Math.random() - 0.5) * 30,
                y: plat.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 8 - 4,
                life: 1,
                maxLife: 20,
                color: '#e0f2fe',
                size: 4,
              });
            }
          } else if (plat.type === 'ELECTRIC') {
            if (p.invulnerableTimer <= 0) {
              this.damagePlayer(15);
              p.vy = -8;
            }
          } else if (plat.type === 'CRUMBLING') {
            plat.timer = (plat.timer || 0) + 1;
            if (plat.timer > 35) {
              plat.broken = true;
              setTimeout(() => {
                plat.broken = false;
                plat.timer = 0;
              }, 3000);
            }
          }
        } else if (p.vy < 0) {
          // Hit head on bottom of platform
          p.y = plat.y + plat.h;
          p.vy = 0;
        }
      }
    }

    if (wasGrounded && !p.isGrounded) {
      p.coyoteTimer = 7; // Coyote time frame window
    }
  }

  private damagePlayer(amount: number) {
    if (this.player.invulnerableTimer > 0) return;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.player.invulnerableTimer = 45;
    this.camera.shake = 10;
    soundEngine.playHitImpact(true);
    this.onStatsChange({ ...this.stats });
    this.addDamageNumber(this.player.x + 10, this.player.y, `-${amount}`, '#ef4444');
  }

  // --- BOSS AI & ENCOUNTER DESIGN ---

  private updateBossAI() {
    const boss = this.boss;
    if (!boss || boss.hp <= 0) return;

    if (boss.isStunned) {
      boss.stunTimer--;
      if (boss.stunTimer <= 0) {
        boss.isStunned = false;
        boss.currentAttack = 'IDLE';
      }
      return;
    }

    boss.facing = this.player.x < boss.x ? -1 : 1;
    boss.attackTimer--;

    // Behavior based on Boss Type
    if (boss.id === 'WEREWOLF_JACK') {
      this.updateWerewolfJackAI(boss);
    } else if (boss.id === 'GOLIATH_MEDUSA') {
      this.updateGoliathMedusaAI(boss);
    } else if (boss.id === 'LORD_VLADISLAUS') {
      this.updateVladislausAI(boss);
    } else {
      this.updateChiefMalakorAI(boss);
    }

    // Boss gravity & bounds
    boss.vy += 0.8;
    boss.x += boss.vx;
    boss.y += boss.vy;

    if (boss.y > 700 - boss.h) {
      boss.y = 700 - boss.h;
      boss.vy = 0;
      boss.vx *= 0.8;
    }
    boss.x = Math.max(1600, Math.min(2300, boss.x));
  }

  private updateWerewolfJackAI(b: BossState) {
    if (b.attackTimer <= 0) {
      b.attackTimer = 110;
      const roll = Math.random();
      if (roll < 0.45) {
        // LEAP SLAM
        b.currentAttack = 'LEAP_SLAM';
        b.telegraphTimer = 25;
        soundEngine.playBossTelegraph();
      } else if (roll < 0.8) {
        // CLAW DASH
        b.currentAttack = 'CLAW_DASH';
        b.telegraphTimer = 20;
        soundEngine.playBossTelegraph();
      } else {
        // HOWL SHOCKWAVE
        b.currentAttack = 'HOWL';
        b.telegraphTimer = 30;
        soundEngine.playBossTelegraph();
      }
    }

    if (b.telegraphTimer > 0) {
      b.telegraphTimer--;
      if (b.telegraphTimer === 0) {
        // Execute attack!
        if (b.currentAttack === 'LEAP_SLAM') {
          b.vy = -14;
          b.vx = b.facing * 10;
        } else if (b.currentAttack === 'CLAW_DASH') {
          b.vx = b.facing * 16;
          // Spawn claw projectiles
          for (let i = -1; i <= 1; i++) {
            this.projectiles.push({
              x: b.x + b.w / 2,
              y: b.y + b.h / 2,
              vx: b.facing * 9,
              vy: i * 2,
              r: 8,
              color: '#f97316',
              isEnemy: true,
              damage: 20,
            });
          }
        } else if (b.currentAttack === 'HOWL') {
          this.camera.shake = 12;
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            this.projectiles.push({
              x: b.x + b.w / 2,
              y: b.y + b.h / 2,
              vx: Math.cos(angle) * 6,
              vy: Math.sin(angle) * 6,
              r: 7,
              color: '#fb923c',
              isEnemy: true,
              damage: 15,
            });
          }
        }
      }
    }

    // Touch damage with player
    if (this.checkAABB(this.player, b)) {
      this.damagePlayer(18);
    }
  }

  private updateGoliathMedusaAI(b: BossState) {
    if (b.attackTimer <= 0) {
      b.attackTimer = 120;
      const roll = Math.random();
      if (roll < 0.5) {
        b.currentAttack = 'GROUND_STOMP';
        b.telegraphTimer = 30;
      } else {
        b.currentAttack = 'GAZE_BEAM';
        b.telegraphTimer = 35;
      }
      soundEngine.playBossTelegraph();
    }

    if (b.telegraphTimer > 0) {
      b.telegraphTimer--;
      if (b.telegraphTimer === 0) {
        if (b.currentAttack === 'GROUND_STOMP') {
          this.camera.shake = 16;
          // Shockwaves travel left and right along ground
          this.projectiles.push({ x: b.x, y: 685, vx: -8, vy: 0, r: 12, color: '#10b981', isEnemy: true, damage: 22 });
          this.projectiles.push({ x: b.x + b.w, y: 685, vx: 8, vy: 0, r: 12, color: '#10b981', isEnemy: true, damage: 22 });
        } else if (b.currentAttack === 'GAZE_BEAM') {
          for (let i = 0; i < 5; i++) {
            this.projectiles.push({
              x: b.x + b.w / 2,
              y: b.y + 20,
              vx: b.facing * (7 + i * 1.5),
              vy: (Math.random() - 0.5) * 4,
              r: 9,
              color: '#34d399',
              isEnemy: true,
              damage: 18,
            });
          }
        }
      }
    }

    if (this.checkAABB(this.player, b)) {
      this.damagePlayer(20);
    }
  }

  private updateVladislausAI(b: BossState) {
    if (b.attackTimer <= 0) {
      b.attackTimer = 100;
      const roll = Math.random();
      if (roll < 0.4) {
        // Teleport behind player!
        b.currentAttack = 'TELEPORT_SLASH';
        b.telegraphTimer = 25;
      } else {
        b.currentAttack = 'BAT_SWARM';
        b.telegraphTimer = 30;
      }
      soundEngine.playBossTelegraph();
    }

    if (b.telegraphTimer > 0) {
      b.telegraphTimer--;
      if (b.telegraphTimer === 0) {
        if (b.currentAttack === 'TELEPORT_SLASH') {
          b.x = this.player.x + (this.player.facing === 1 ? -90 : 90);
          b.y = this.player.y;
          this.camera.shake = 8;
          this.projectiles.push({
            x: b.x,
            y: b.y + 30,
            vx: b.facing * 12,
            vy: 0,
            r: 16,
            color: '#ec4899',
            isEnemy: true,
            damage: 25,
          });
        } else if (b.currentAttack === 'BAT_SWARM') {
          for (let i = 0; i < 6; i++) {
            this.projectiles.push({
              x: b.x,
              y: b.y + 20,
              vx: b.facing * (5 + i * 1.2),
              vy: Math.sin(i) * 5,
              r: 8,
              color: '#f43f5e',
              isEnemy: true,
              damage: 16,
            });
          }
        }
      }
    }

    if (this.checkAABB(this.player, b)) {
      this.damagePlayer(18);
    }
  }

  private updateChiefMalakorAI(b: BossState) {
    if (b.attackTimer <= 0) {
      b.attackTimer = 90;
      const roll = Math.random();
      if (roll < 0.5) {
        b.currentAttack = 'HELLFIRE_PILLARS';
        b.telegraphTimer = 30;
      } else {
        b.currentAttack = 'GREATSWORD_WAVE';
        b.telegraphTimer = 25;
      }
      soundEngine.playBossTelegraph();
    }

    if (b.telegraphTimer > 0) {
      b.telegraphTimer--;
      if (b.telegraphTimer === 0) {
        if (b.currentAttack === 'HELLFIRE_PILLARS') {
          this.camera.shake = 14;
          // Spawn 3 pillars under and around player
          const targetX = this.player.x;
          for (const offset of [-150, 0, 150]) {
            this.projectiles.push({
              x: targetX + offset,
              y: 700,
              vx: 0,
              vy: -15,
              r: 18,
              color: '#ef4444',
              isEnemy: true,
              damage: 30,
            });
          }
        } else if (b.currentAttack === 'GREATSWORD_WAVE') {
          for (let i = -2; i <= 2; i++) {
            this.projectiles.push({
              x: b.x + b.w / 2,
              y: b.y + b.h / 2,
              vx: b.facing * 10,
              vy: i * 3,
              r: 11,
              color: '#dc2626',
              isEnemy: true,
              damage: 24,
            });
          }
        }
      }
    }

    if (this.checkAABB(this.player, b)) {
      this.damagePlayer(25);
    }
  }

  // --- MINIONS & PROJECTILES ---

  private updateEnemies() {
    this.enemies = this.enemies.filter((e) => e.hp > 0);

    this.enemies.forEach((enemy) => {
      // Patrol
      enemy.x += enemy.vx;
      if (enemy.x > enemy.patrolMax || enemy.x < enemy.patrolMin) {
        enemy.vx *= -1;
        enemy.facing = enemy.vx > 0 ? 1 : -1;
      }

      // Check distance to player for attack
      const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      if (dist < 420) {
        enemy.alert = true;
        enemy.facing = this.player.x > enemy.x ? 1 : -1;
        enemy.attackTimer--;

        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = enemy.type === 'GOBLIN_SNIPER' ? 90 : 120;
          if (enemy.type === 'GOBLIN_SNIPER') {
            // Shoot sniper bolt
            this.projectiles.push({
              x: enemy.x + (enemy.facing === 1 ? enemy.w : 0),
              y: enemy.y + 14,
              vx: enemy.facing * 7,
              vy: -0.5,
              r: 5,
              color: '#a855f7',
              isEnemy: true,
              damage: 14,
            });
          }
        }
      } else {
        enemy.alert = false;
      }

      if (this.checkAABB(this.player, enemy)) {
        this.damagePlayer(12);
      }
    });
  }

  private updateProjectiles() {
    this.projectiles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      // Check hit with player
      if (p.isEnemy) {
        const dist = Math.hypot(p.x - (this.player.x + this.player.w / 2), p.y - (this.player.y + this.player.h / 2));
        if (dist < p.r + 15) {
          this.damagePlayer(p.damage);
          p.x = -999; // destroy
        }
      } else {
        // Player's reflected projectile hits boss
        if (this.boss) {
          const distBoss = Math.hypot(p.x - (this.boss.x + this.boss.w / 2), p.y - (this.boss.y + this.boss.h / 2));
          if (distBoss < p.r + 30) {
            this.dealDamageToBoss(this.boss);
            p.x = -999;
          }
        }
      }
    });

    this.projectiles = this.projectiles.filter((p) => p.x > 0 && p.x < this.worldWidth && p.y > 0 && p.y < this.worldHeight);
  }

  private updateParticles() {
    this.particles.forEach((part) => {
      part.x += part.vx;
      part.y += part.vy;
      part.life++;
    });
    this.particles = this.particles.filter((p) => p.life < p.maxLife);

    this.damageNumbers.forEach((d) => {
      d.y -= 0.8;
      d.life--;
    });
    this.damageNumbers = this.damageNumbers.filter((d) => d.life > 0);
  }

  private updateCamera() {
    // Dynamic camera with smooth lerp, lookahead and screen shake
    const lookaheadX = this.player.vx * 15;
    const targetX = this.player.x + this.player.w / 2 + lookaheadX - this.canvas.width / 2;
    const targetY = this.player.y + this.player.h / 2 - this.canvas.height / 2;

    this.camera.x += (targetX - this.camera.x) * 0.08;
    this.camera.y += (targetY - this.camera.y) * 0.08;

    // Bounds clamp
    this.camera.x = Math.max(0, Math.min(this.worldWidth - this.canvas.width, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.worldHeight - this.canvas.height, this.camera.y));

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

    // Screen shake offset
    const shakeX = (Math.random() - 0.5) * this.camera.shake * 2;
    const shakeY = (Math.random() - 0.5) * this.camera.shake * 2;
    ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

    // 1. Dark 90s City Parallax Background
    this.renderCityBackdrop(ctx);

    // 2. Platforms & Urban Hazards
    this.renderPlatforms(ctx);

    // 3. Enemies & Boss
    this.renderEnemies(ctx);
    this.renderBoss(ctx);

    // 4. Player & Afterimage
    this.renderPlayer(ctx);

    // 5. Projectiles & Particles
    this.renderProjectilesAndParticles(ctx);

    ctx.restore();
  }

  private renderCityBackdrop(ctx: CanvasRenderingContext2D) {
    // Night sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.worldHeight);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.6, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Parallax background buildings
    ctx.fillStyle = '#0b1120';
    for (let i = 0; i < 20; i++) {
      const bx = i * 140;
      const bw = 90 + (i % 3) * 20;
      const bh = 300 + (i % 5) * 60;
      ctx.fillRect(bx, 700 - bh, bw, bh);

      // Flickering yellow/cyan windows
      ctx.fillStyle = i % 2 === 0 ? 'rgba(250, 204, 21, 0.25)' : 'rgba(6, 182, 212, 0.25)';
      for (let wy = 700 - bh + 20; wy < 680; wy += 35) {
        for (let wx = bx + 12; wx < bx + bw - 15; wx += 22) {
          if ((wx + wy) % 5 !== 0) {
            ctx.fillRect(wx, wy, 10, 15);
          }
        }
      }
      ctx.fillStyle = '#0b1120';
    }

    // 90s Neon Signs in background
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
    ctx.fillText('THE CRYPT \'94', 350, 260);

    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.fillText('NOIR NIGHTS ARCADE', 1200, 310);

    ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
    ctx.fillText('HELL\'S HOUNDS MC', 1900, 360);

    // Weather: Continuous light rain lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.lineWidth = 1;
    const rainOffset = (performance.now() * 0.8) % 100;
    for (let rx = this.camera.x; rx < this.camera.x + this.canvas.width + 100; rx += 45) {
      for (let ry = this.camera.y; ry < this.camera.y + this.canvas.height; ry += 65) {
        ctx.beginPath();
        ctx.moveTo(rx, ry + rainOffset);
        ctx.lineTo(rx - 8, ry + rainOffset + 18);
        ctx.stroke();
      }
    }
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D) {
    this.platforms.forEach((plat) => {
      if (plat.broken) return;

      if (plat.type === 'STEAM_VENT') {
        // Steam Vent Grate
        ctx.fillStyle = '#334155';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(plat.x + 8, plat.y + 2, plat.w - 16, 4);

        // Constant steam puffs
        if (Math.random() < 0.4) {
          this.particles.push({
            x: plat.x + Math.random() * plat.w,
            y: plat.y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 4 - 2,
            life: 1,
            maxLife: 20,
            color: 'rgba(224, 242, 254, 0.6)',
            size: 3,
          });
        }
      } else if (plat.type === 'ELECTRIC') {
        // Electric Conduit
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = Math.random() < 0.5 ? '#f43f5e' : '#fbbf24';
        ctx.fillRect(plat.x, plat.y + 4, plat.w, 4);
      } else if (plat.type === 'WALL') {
        // Brick Wall Texture
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      } else {
        // Solid Platform / Scaffolding
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

        // Highlight top rim
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(plat.x, plat.y, plat.w, 3);
      }
    });
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;

    // Afterimage
    p.trail.forEach((t) => {
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(t.x, t.y, p.w, p.h);
      ctx.restore();
    });

    ctx.save();
    // Invulnerability blink
    if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Trenchcoat body
    ctx.fillStyle = '#1e293b'; // Dark leather trenchcoat
    ctx.fillRect(p.x, p.y + 12, p.w, p.h - 12);

    // Glowing runic coat lining
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(p.x + (p.facing === 1 ? p.w - 5 : 0), p.y + 16, 5, p.h - 18);

    // Head & detective collar
    ctx.fillStyle = '#f87171'; // Face skin tone
    ctx.fillRect(p.x + 4, p.y, p.w - 8, 14);

    // Hair
    ctx.fillStyle = '#451a03';
    ctx.fillRect(p.x + 2, p.y - 2, p.w - 4, 6);

    // Eyes
    ctx.fillStyle = '#38bdf8';
    const eyeX = p.facing === 1 ? p.x + p.w - 10 : p.x + 6;
    ctx.fillRect(eyeX, p.y + 4, 4, 3);

    // Wall slide sparks
    if (p.isWallSliding) {
      ctx.fillStyle = '#facc15';
      const sparkX = p.isTouchingWall === 1 ? p.x + p.w : p.x;
      ctx.fillRect(sparkX + (Math.random() - 0.5) * 6, p.y + p.h - 8, 3, 3);
    }

    // Runic Sword & Slashing Arcs
    const swordX = p.facing === 1 ? p.x + p.w - 4 : p.x - 12;
    const swordY = p.y + 18;

    if (p.isAttacking && p.attackTimer > 0) {
      // Extended glowing blade arc
      ctx.strokeStyle = p.comboStep === 2 ? '#38bdf8' : '#06b6d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(
        p.x + p.w / 2,
        p.y + p.h / 2,
        45,
        p.facing === 1 ? -Math.PI / 3 : Math.PI - Math.PI / 3,
        p.facing === 1 ? Math.PI / 3 : Math.PI + Math.PI / 3
      );
      ctx.stroke();
    } else {
      // Sheathed / Held Runic Sabre
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(swordX, swordY, 4, 28);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(swordX - 1, swordY + 6, 6, 4); // Runic hilt
    }

    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    this.enemies.forEach((enemy) => {
      ctx.save();
      if (enemy.type === 'GOBLIN_SNIPER') {
        // Green goblin sniper with goggles
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
        // Purple goggles
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(enemy.x + (enemy.facing === 1 ? enemy.w - 8 : 2), enemy.y + 4, 6, 6);
        // Rifle
        ctx.fillStyle = '#475569';
        const rifleX = enemy.facing === 1 ? enemy.x + enemy.w : enemy.x - 18;
        ctx.fillRect(rifleX, enemy.y + 12, 18, 4);
      } else {
        // Orc bouncer with spiked shoulders
        ctx.fillStyle = '#15803d';
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
        // Spiked vest
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(enemy.x, enemy.y + 12, enemy.w, enemy.h - 12);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(enemy.x + (enemy.facing === 1 ? enemy.w - 6 : 0), enemy.y + 10, 6, 6);
      }

      // HP bar
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(enemy.x - 4, enemy.y - 12, enemy.w + 8, 5);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(enemy.x - 4, enemy.y - 12, (enemy.w + 8) * hpPct, 5);

      ctx.restore();
    });
  }

  private renderBoss(ctx: CanvasRenderingContext2D) {
    const b = this.boss;
    if (!b || b.hp <= 0) return;

    ctx.save();

    // Stunned stars
    if (b.isStunned) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('★ STUNNED ★', b.x - 10, b.y - 20);
    }

    // Telegraph Glow Aura
    if (b.telegraphTimer > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
    }

    // Boss Body
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Distinctive Boss Details
    if (b.id === 'WEREWOLF_JACK') {
      // Leather jacket & claws
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(b.x + 4, b.y + 15, b.w - 8, b.h - 25);
      ctx.fillStyle = '#f97316';
      // Glowing wolf eyes
      ctx.fillRect(b.x + (b.facing === 1 ? b.w - 12 : 6), b.y + 8, 6, 4);
    } else if (b.id === 'GOLIATH_MEDUSA') {
      // Minotaur horns & snake hair
      ctx.fillStyle = '#facc15';
      ctx.fillRect(b.x - 6, b.y - 6, 12, 10);
      ctx.fillRect(b.x + b.w - 6, b.y - 6, 12, 10);
    } else if (b.id === 'LORD_VLADISLAUS') {
      // Purple velvet suit & floating cape
      ctx.fillStyle = '#581c87';
      ctx.fillRect(b.x - 6, b.y + 10, b.w + 12, b.h - 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x + 8, b.y + 6, b.w - 16, 14); // Pale aristocratic face
    } else {
      // Chief Malakor - Tiefling horns and police badge
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(b.x + 6, b.y - 12, 8, 14);
      ctx.fillRect(b.x + b.w - 14, b.y - 12, 8, 14);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(b.x + b.w / 2 - 5, b.y + 24, 10, 10); // Police badge
    }

    // Boss Health Bar on top
    const hpPct = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(b.x - 20, b.y - 18, b.w + 40, 8);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - 20, b.y - 18, (b.w + 40) * hpPct, 8);

    ctx.restore();
  }

  private renderProjectilesAndParticles(ctx: CanvasRenderingContext2D) {
    // Projectiles
    this.projectiles.forEach((p) => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Particles
    this.particles.forEach((part) => {
      ctx.save();
      const alpha = 1 - part.life / part.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x, part.y, part.size, part.size);
      ctx.restore();
    });

    // Floating Damage Numbers
    this.damageNumbers.forEach((d) => {
      ctx.save();
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    });
  }

  private checkAABB(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
}
