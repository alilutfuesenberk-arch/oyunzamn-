import React from 'react';
import { PlayerStats, BossInfo } from '../types/game';
import { Shield, Sparkles, Zap, Crosshair, Award, Code2, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface HUDProps {
  stats: PlayerStats;
  currentBoss: BossInfo;
  onOpenSkillTree: () => void;
  onOpenBossSelect: () => void;
  onOpenDialogue: () => void;
  onOpenUnityExport: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  currentBoss,
  onOpenSkillTree,
  onOpenBossSelect,
  onOpenDialogue,
  onOpenUnityExport,
  isMuted,
  onToggleMute,
}) => {
  const hpPct = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const manaPct = Math.max(0, Math.min(100, (stats.mana / stats.maxMana) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 select-none">
      {/* Top Bar: Detective Badge & Meters */}
      <div className="flex items-start justify-between">
        {/* Left Status Cluster */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/85 border border-slate-800 p-2.5 rounded-lg shadow-xl backdrop-blur-sm">
          {/* 90s Police Shield Badge */}
          <div className="w-11 h-12 bg-amber-500/20 border border-amber-500/50 rounded flex flex-col items-center justify-center text-amber-400 font-bold text-xs tracking-tighter">
            <Shield className="w-5 h-5 mb-0.5" />
            <span>94 PD</span>
          </div>

          <div className="flex flex-col gap-1.5 w-44">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="tracking-wide">RAY VANCE</span>
              <span className="font-mono tabular-nums text-emerald-400">{stats.hp} / {stats.maxHp} HP</span>
            </div>
            {/* HP Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
                style={{ width: `${hpPct}%` }}
              />
            </div>

            {/* Mana Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-150"
                style={{ width: `${manaPct}%` }}
              />
            </div>
          </div>

          {/* Clues / Currency */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 text-xs font-mono tabular-nums">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{stats.clues} DELİL</span>
          </div>
        </div>

        {/* Center: Boss Indicator */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 border border-slate-800 px-3.5 py-1.5 rounded-lg shadow-xl">
          <Crosshair className="w-4 h-4 text-rose-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-rose-400 tracking-wide uppercase">{currentBoss.name}</span>
            <span className="text-[10px] text-slate-400">{currentBoss.title}</span>
          </div>
          <button
            onClick={onOpenBossSelect}
            className="ml-2 px-2 py-1 text-[11px] font-medium bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-200 rounded transition-colors"
          >
            Değiştir
          </button>
        </div>

        {/* Right Navigation & Tools */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onOpenSkillTree}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border border-cyan-800/80 text-cyan-300 rounded-lg text-xs font-medium transition-colors shadow-lg"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Beceri Ağacı</span>
          </button>

          <button
            onClick={onOpenDialogue}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border border-amber-800/80 text-amber-300 rounded-lg text-xs font-medium transition-colors shadow-lg"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Sorgu & Sonlar</span>
          </button>

          <button
            onClick={onOpenUnityExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border border-indigo-700/80 text-indigo-300 rounded-lg text-xs font-medium transition-colors shadow-lg"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Unity C# Scriptleri</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition-colors"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Bottom Controls Cheatsheet */}
      <div className="flex items-center justify-between">
        <div className="pointer-events-auto bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 flex items-center gap-3">
          <span className="font-semibold text-slate-200">Kontroller:</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">A / D</kbd> Hareket</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Space</kbd> Zıpla / Çift Zıpla</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Duvar + Space</kbd> Duvara Tutun & Sıçra</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">J</kbd> Kılıç Kombosu</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">K</kbd> Buhar Atılması</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">L</kbd> Rünik Savuşturma</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 font-mono">
          <span>60 FPS · DİNAMİK KAMERA · HITSTOP AKTİF</span>
        </div>
      </div>
    </div>
  );
};
