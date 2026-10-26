import React, { useEffect, useRef, useState } from 'react';
import { IsometricEngine } from './game/isometricEngine';
import { PlayerIsometricState, RunicMaskId } from './types/isometric';
import { soundEngine } from './utils/audio';
import { TitleScreen } from './components/TitleScreen';
import { IsometricHUD } from './components/IsometricHUD';
import { MaskSelectModal } from './components/MaskSelectModal';
import { UnityIsometricModal } from './components/UnityIsometricModal';
import { Trophy, RotateCcw, Flame } from 'lucide-react';

type ScreenState = 'TITLE' | 'PLAYING' | 'VICTORY' | 'GAME_OVER';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<IsometricEngine | null>(null);

  const [screen, setScreen] = useState<ScreenState>('TITLE');
  const [playerState, setPlayerState] = useState<PlayerIsometricState | null>(null);
  const [enemiesRemaining, setEnemiesRemaining] = useState<number>(5);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals
  const [isMaskModalOpen, setIsMaskModalOpen] = useState<boolean>(false);
  const [isUnityModalOpen, setIsUnityModalOpen] = useState<boolean>(false);
  const [selectedMask, setSelectedMask] = useState<RunicMaskId>('WOLF');

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Isometric Engine
  useEffect(() => {
    if (screen === 'PLAYING' && canvasRef.current && !engineRef.current) {
      const engine = new IsometricEngine(canvasRef.current);
      engine.player.mask = selectedMask;

      engine.onStateUpdate = (p) => {
        setPlayerState({ ...p });
        const remaining = engine.enemies.filter((e) => e.state !== 'DEAD').length;
        setEnemiesRemaining(remaining);
      };

      engine.onLevelClear = () => {
        setScreen('VICTORY');
      };

      engine.onGameOver = () => {
        setScreen('GAME_OVER');
      };

      setPlayerState({ ...engine.player });
      engine.start();
      engineRef.current = engine;
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, [screen, selectedMask]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen === 'TITLE' && (e.code === 'Enter' || e.code === 'Space')) {
        handleStartGame();
      } else if (e.code === 'Escape') {
        setIsMaskModalOpen(false);
        setIsUnityModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  const handleStartGame = () => {
    setScreen('PLAYING');
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setScreen('PLAYING');
  };

  const handleSelectMask = (mask: RunicMaskId) => {
    setSelectedMask(mask);
    if (engineRef.current) {
      engineRef.current.player.mask = mask;
    }
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. Title Screen */}
      {screen === 'TITLE' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenUnityExport={() => setIsUnityModalOpen(true)}
          onOpenMaskSelect={() => setIsMaskModalOpen(true)}
        />
      )}

      {/* 2. Isolated Isometric 2.5D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block cursor-crosshair ${screen === 'TITLE' ? 'hidden' : 'block'}`}
      />

      {/* 3. In-Game Hotline Miami HUD */}
      {screen === 'PLAYING' && playerState && (
        <IsometricHUD
          playerState={playerState}
          enemiesRemaining={enemiesRemaining}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenMaskModal={() => setIsMaskModalOpen(true)}
          onOpenUnityModal={() => setIsUnityModalOpen(true)}
          onCycleWeapon={() => engineRef.current?.cycleWeapon()}
        />
      )}

      {/* 4. Victory Screen */}
      {screen === 'VICTORY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/60 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center">
            <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 mb-3 animate-pulse">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-wide mb-1">BÖLGE TEMİZLENDİ!</h2>
            <p className="text-xs text-amber-400 font-mono mb-4 uppercase">
              TÜM DOĞAÜSTÜ MAFYA HEDEFLERİ ETKİSİZ HALE GETİRİLDİ
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 w-full mb-6 text-xs text-slate-300 flex justify-around">
              <div>
                <span className="text-[10px] text-slate-500 block">TOPLAM SKOR</span>
                <span className="text-base font-bold font-mono text-amber-400">{playerState?.score || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">NİHAİ RANK</span>
                <span className="text-base font-bold font-mono text-rose-400">
                  {(playerState?.score || 0) > 2000 ? 'S (PSYCHO)' : 'A+'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleRestart}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Operasyonu Tekrar Oyna
              </button>
              <button
                onClick={() => setScreen('TITLE')}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors"
              >
                Ana Menüye Dön
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Game Over Screen */}
      {screen === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/60 rounded-2xl p-6 text-center shadow-2xl flex flex-col items-center">
            <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-full text-rose-400 mb-3">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-wide mb-1">DEDEKTİF ÖLDÜ</h2>
            <p className="text-xs text-rose-400 font-mono mb-4 uppercase">
              KULÜPTE TUZAĞA DÜŞTÜNÜZ
            </p>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Hotline Miami acımasızdır! Kapıları tekmeleyerek içeri dalın, Space ile takla atın veya silahları düşmana fırlatıp sersemletin.
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleRestart}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Hemen Yeniden Başla (Tek Tuşla Yeniden Doğ)
              </button>
              <button
                onClick={() => setScreen('TITLE')}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors"
              >
                Ana Menü
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modals */}
      <MaskSelectModal
        isOpen={isMaskModalOpen}
        onClose={() => setIsMaskModalOpen(false)}
        selectedMask={selectedMask}
        onSelectMask={handleSelectMask}
      />

      <UnityIsometricModal
        isOpen={isUnityModalOpen}
        onClose={() => setIsUnityModalOpen(false)}
      />
    </div>
  );
}
