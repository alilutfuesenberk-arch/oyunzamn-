import React from 'react';
import { RunicMask, RunicMaskId } from '../types/isometric';
import { Shield, Sparkles, X, Check, Flame, Eye, Footprints, Zap } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface MaskSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMask: RunicMaskId;
  onSelectMask: (mask: RunicMaskId) => void;
}

export const MASKS: RunicMask[] = [
  {
    id: 'WOLF',
    name: 'Kurtadam Deri Ceketi',
    title: 'Hızlı Refleks & Yırtıcı Atılma',
    icon: '🐺',
    bonus: 'Hareket hızını %25 artırır ve takla atılmasını daha uzun mesafeli yapar.',
    color: '#f97316',
  },
  {
    id: 'VAMPIRE',
    name: 'Vampir Gece Gözlüğü',
    title: 'Kan Sömürüsü & Can Yenileme',
    icon: '🧛',
    bonus: 'Her öldürülen düşmandan +20 Can yeniler ve kan sıçrama menzilini ikiye katlar.',
    color: '#ec4899',
  },
  {
    id: 'MINOTAUR',
    name: 'Minotor Çelik Siperliği',
    title: 'Kapı Kırma & Zırh',
    icon: '🐂',
    bonus: 'Kapıları yavaşlamadan parçalayarak odaya dalar ve ilk mermi hasarını bloklar.',
    color: '#10b981',
  },
  {
    id: 'ELF',
    name: 'Elf Rünik Lensi',
    title: 'Duvar Arkası Görüşü',
    icon: '🧝',
    bonus: 'Düşmanların görüş konilerini ve ayak seslerini kapıların arkasından açığa çıkarır.',
    color: '#06b6d4',
  },
];

export const MaskSelectModal: React.FC<MaskSelectModalProps> = ({
  isOpen,
  onClose,
  selectedMask,
  onSelectMask,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">RÜNİK MASKE & EFSUN SEÇİMİ</h2>
              <p className="text-xs text-slate-400">Hotline Miami tarzı özel pasif yetenek sağlayan dedektif maskenizi seçin.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mask Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {MASKS.map((m) => {
            const isSelected = selectedMask === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onSelectMask(m.id);
                  soundEngine.playWeaponThrow();
                  onClose();
                }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-slate-800/80 border-rose-500 shadow-xl ring-2 ring-rose-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 bg-slate-900 border border-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                        {m.icon}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100" style={{ color: m.color }}>
                          {m.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">{m.title}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="p-1 rounded-full bg-rose-500 text-white">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-2">{m.bonus}</p>
                </div>

                <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                  {isSelected ? 'KUŞANILDI' : 'SEÇMEK İÇİN TIKLA'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400 flex items-center justify-between">
          <span>Maskeler her yeni operasyon başlangıcında veya menüden serbestçe değiştirilebilir.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
