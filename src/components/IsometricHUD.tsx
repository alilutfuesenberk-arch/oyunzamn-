import React from 'react';
import { PlayerIsometricState, RunicMaskId } from '../types/isometric';
import { Shield, Volume2, VolumeX, Code2, Crosshair, Flame, Skull, RefreshCw } from 'lucide-react';

interface IsometricHUDProps {
  playerState: PlayerIsometricState;
  enemiesRemaining: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenMaskModal: () => void;
  onOpenUnityModal: () => void;
  onCycleWeapon?: () => void;
}

export const IsometricHUD: React.FC<IsometricHUDProps> = ({
  playerState,
  enemiesRemaining,
  isMuted,
  onToggleMute,
  onOpenMaskModal,
  onOpenUnityModal,
  onCycleWeapon,
}) => {
  const hpPct = Math.max(0, Math.min(100, (playerState.hp / playerState.maxHp) * 100));

  let rank = 'D';
  if (playerState.score > 2500) rank = 'S';
  else if (playerState.score > 1800) rank = 'A+';
  else if (playerState.score > 1200) rank = 'A';
  else if (playerState.score > 700) rank = 'B';
  else if (playerState.score > 300) rank = 'C';

  const maskLabels: { [key in RunicMaskId]: { name: string; icon: string; color: string } } = {
    WOLF: { name: 'Kurtadam Maskesi', icon: '🐺', color: '#f97316' },
    VAMPIRE: { name: 'Vampir Gözlüğü', icon: '🧛', color: '#ec4899' },
    MINOTAUR: { name: 'Minotor Siperliği', icon: '🐂', color: '#10b981' },
    ELF: { name: 'Elf Rünik Lensi', icon: '🧝', color: '#06b6d4' },
  };

  const activeMaskInfo = maskLabels[playerState.mask] || maskLabels.WOLF;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 select-none font-sans">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between">
        {/* Left: Detective Vance Status Cluster */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/90 border border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
          {/* Active Mask Avatar */}
          <div
            onClick={onOpenMaskModal}
            className="w-12 h-14 bg-slate-900 border-2 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            style={{ borderColor: activeMaskInfo.color }}
            title="Maskeyi Değiştir"
          >
            <span className="text-2xl">{activeMaskInfo.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-tighter" style={{ color: activeMaskInfo.color }}>
              MASKE
            </span>
          </div>

          <div className="flex flex-col gap-1.5 w-48">
            <div className="flex items-center justify-between text-xs font-bold text-slate-100">
              <span className="tracking-wide">DET. RAY VANCE</span>
              <span className="font-mono tabular-nums text-rose-400">{playerState.hp} HP</span>
            </div>

            {/* Health Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-150"
                style={{ width: `${hpPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium">
              <span style={{ color: activeMaskInfo.color }}>{activeMaskInfo.name}</span>
              <button
                onClick={onOpenMaskModal}
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
              >
                Değiştir
              </button>
            </div>
          </div>
        </div>

        {/* Center: Hotline Miami Combo Banner */}
        <div className="pointer-events-auto flex flex-col items-center">
          {playerState.combo > 1 ? (
            <div className="flex flex-col items-center animate-bounce">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-600/90 border-2 border-rose-400 text-white rounded-lg shadow-lg shadow-rose-600/40">
                <Flame className="w-5 h-5 fill-current animate-pulse text-amber-300" />
                <span className="text-sm font-black tracking-wider uppercase">
                  COMBO x{playerState.combo}
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-400 tracking-widest mt-1 uppercase font-bold drop-shadow">
                PSYCHO DETECTIVE STREAK
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-950/85 border border-slate-800 rounded-lg text-slate-300 text-xs shadow-lg">
              <Skull className="w-4 h-4 text-rose-500" />
              <span>KALAN DÜŞMAN: <b className="text-rose-400 font-mono text-sm">{enemiesRemaining}</b></span>
            </div>
          )}
        </div>

        {/* Right: Weapon & Score Cluster */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Active Weapon Card (Click or Q to cycle) */}
          <div
            onClick={onCycleWeapon}
            className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 cursor-pointer p-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 transition-colors"
            title="Silah Değiştirmek İçin Tıkla veya Q tuşuna bas"
          >
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono">[Q İLE DEĞİŞTİR]</span>
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                  {playerState.weapon.name}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                {playerState.weapon.isRanged
                  ? `${playerState.weapon.ammo} / ${playerState.weapon.maxAmmo} MERMİ (R: DOLDUR)`
                  : 'YAKIN DÖVÜŞ (SOL TIK)'}
              </span>
            </div>

            <div
              className="w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-xs"
              style={{
                backgroundColor: `${playerState.weapon.color}25`,
                borderColor: playerState.weapon.color,
                color: playerState.weapon.color,
              }}
            >
              <Crosshair className="w-5 h-5" />
            </div>
          </div>

          {/* Rank Badge */}
          <div className="w-12 h-14 bg-gradient-to-b from-amber-500 to-rose-600 rounded-xl p-0.5 shadow-xl flex flex-col items-center justify-center text-slate-950">
            <span className="text-[9px] font-black uppercase tracking-tighter">RANK</span>
            <span className="text-2xl font-black font-mono leading-none">{rank}</span>
          </div>

          {/* Action Tools */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={onOpenUnityModal}
              className="px-3 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Code2 className="w-4 h-4" />
              <span>Unity C#</span>
            </button>

            <button
              onClick={onToggleMute}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition-colors flex items-center justify-center"
              title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Hotline Miami Action Cheatsheet */}
      <div className="flex items-center justify-between">
        <div className="pointer-events-auto bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-300 flex items-center gap-4 shadow-xl backdrop-blur-md">
          <span className="font-bold text-amber-400">HOTLINE KONTROLLER:</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">WASD</kbd> Hareket</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Sol Tık</kbd> Ateş / Kılıç</span>
          <span><kbd className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded text-amber-300 font-bold">E / F</kbd> Kapı Kır</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">1-4 / Q</kbd> Silah Seç</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Space</kbd> Takla / İnfaz</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Sağ Tık</kbd> Silah Fırlat</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">R</kbd> Şarjör</span>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-xl text-xs font-mono text-slate-300">
          SKOR: <span className="text-amber-400 font-bold tabular-nums text-sm">{playerState.score}</span>
        </div>
      </div>
    </div>
  );
};
