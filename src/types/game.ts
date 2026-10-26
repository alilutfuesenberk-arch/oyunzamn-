export type GameMode = 'TITLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  clues: number;
  attackPower: number;
  critChance: number;
  dashCooldown: number;
  canDoubleJump: boolean;
  canWallJump: boolean;
  canParry: boolean;
  unlockedSkills: string[];
}

export interface SkillNode {
  id: string;
  name: string;
  category: 'BLADE' | 'MOBILITY' | 'ARCANE';
  description: string;
  cost: number;
  unlocked: boolean;
  prerequisiteId?: string;
}

export type BossId = 'WEREWOLF_JACK' | 'GOLIATH_MEDUSA' | 'LORD_VLADISLAUS' | 'CHIEF_MALAKOR';

export interface BossInfo {
  id: BossId;
  name: string;
  title: string;
  location: string;
  maxHp: number;
  themeColor: string;
  description: string;
}

export interface DialogueChoice {
  text: string;
  tone: 'LAW_AND_ORDER' | 'SYNDICATE_TRUCE' | 'CHAOS_OVERCHARGE';
  nextNodeId?: string;
  clueReward?: number;
  outcomeNote?: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  speakerRole: string;
  avatarIcon: string;
  text: string;
  choices: DialogueChoice[];
}

export interface CaseEnding {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tone: string;
  unlocked: boolean;
}
