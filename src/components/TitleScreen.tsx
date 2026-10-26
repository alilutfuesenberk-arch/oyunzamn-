import React from 'react';
import { Play, Code2, Flame, Shield, Sparkles } from 'lucide-react';
import coverImg from '../assets/images/hotline_isometric_cover_1793019053980.jpg';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenUnityExport: () => void;
  onOpenMaskSelect: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenUnityExport,
  onOpenMaskSelect,
}) => {
  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-between p-6 select-none overflow-hidden font-sans">
      {/* Background Graphic */}
      <div className="absolute inset-0 z-0">
        <img
          src={coverImg}
          alt="Grimstone 94 Overdose Hotline Miami"
          className="w-full h-full object-cover object-center opacity-55 scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/45" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/60 to-slate-950" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 w-full max-w-6xl flex items-center justify-between py-2">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/85 border border-slate-800 rounded-xl text-xs font-mono text-amber-400 backdrop-blur-md">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>PRECINCT 94 · OPERASYON DOSYASI</span>
        </div>

        <div className="text-xs font-mono text-slate-400 flex items-center gap-3 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
          <span>HOTLINE 130 BPM SYNTH</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 font-bold">CANLI</span>
        </div>
      </div>

      {/* Center Hero Lockup */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl my-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-950/70 border border-rose-800/80 rounded-full text-rose-300 text-xs font-semibold mb-4 backdrop-blur-md shadow-lg">
          <Flame className="w-3.5 h-3.5 text-rose-400 fill-current animate-pulse" />
          <span>İzometrik 2.5D Hotline Miami Tarzı Doğaüstü Aksiyon</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-3 drop-shadow-2xl">
          GRIMSTONE '94: <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400">OVERDOSE</span>
        </h1>

        <p className="text-base md:text-lg text-slate-200 max-w-2xl leading-relaxed mb-8 drop-shadow">
          Kapıları tekmele, katanayla mermileri sektir, pompalı tüfekle ork mafyasını dağıt ve yere serdiğin düşmanları infaz et.
          Yüksek tempolu refleks dövüşü, 360° nişan alma ve eksiksiz Unity C# mimarisi.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onStartGame}
            className="flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-sm tracking-wide rounded-xl shadow-xl shadow-rose-600/30 transition-all transform hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>KULÜBE BASKIN YAP (START)</span>
          </button>

          <button
            onClick={onOpenMaskSelect}
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-600/80 text-amber-300 font-bold text-sm rounded-xl transition-all shadow-md"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Rünik Maske Seç</span>
          </button>

          <button
            onClick={onOpenUnityExport}
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-indigo-700/80 text-indigo-300 font-bold text-sm rounded-xl transition-all shadow-md"
          >
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>Unity C# Scriptleri</span>
          </button>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-950/85 border border-slate-800 rounded-xl px-6 py-3 backdrop-blur-md flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3 shadow-xl">
        <div className="flex items-center gap-4">
          <span className="font-bold text-amber-400">HOTLINE KONTROLLER:</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">WASD</kbd> Hareket</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Sol Tık</kbd> Saldır / Ateş</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Sağ Tık</kbd> Silah Fırlat</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Space</kbd> İnfaz / Takla</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">F</kbd> Silah Al</span>
        </div>

        <div className="font-mono text-slate-400">
          ENTER VEYA SPACE İLE BAŞLA
        </div>
      </div>
    </div>
  );
};
