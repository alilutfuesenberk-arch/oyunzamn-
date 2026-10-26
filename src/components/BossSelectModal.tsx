import React from 'react';
import { BossId, BossInfo } from '../types/game';
import { Crosshair, Skull, X, ShieldAlert, Flame, Moon, Compass } from 'lucide-react';
import bossesPoster from '../assets/images/bosses_gallery_poster_1793016296165.jpg';

interface BossSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBossId: BossId;
  onSelectBoss: (bossId: BossId) => void;
}

export const BOSS_LIST: BossInfo[] = [
  {
    id: 'WEREWOLF_JACK',
    name: '"Koca Pençe" Jack',
    title: 'Kurtadam Biker Reisi · Hell\'s Hounds MC',
    location: 'Tersane Hurdalığı (Sector 4)',
    maxHp: 550,
    themeColor: '#f97316',
    description: 'Deri ceketli, fönlü saçlı 90\'lar motor çetesi reisi. Akrobatik sıçramalar, üçlü pençe savurması ve sersemletici uluma dalgaları yayar.',
  },
  {
    id: 'GOLIATH_MEDUSA',
    name: 'Goliath & Madam Medusa',
    title: 'Minotor Gladyatör & Gorgon Tefeci',
    location: 'Yeraltı Dövüş Kulübü & Banka Kasası',
    maxHp: 680,
    themeColor: '#10b981',
    description: 'Yıkıcı çift boss dinamiği. Goliath zemini sarsarak şok dalgaları gönderirken, Madam Medusa taşlaştıran yeşil ışınlar saçar.',
  },
  {
    id: 'LORD_VLADISLAUS',
    name: 'Lord Vladislaus',
    title: 'Vampir Gece Kulübü Lordu · The Crypt',
    location: 'Neon Synthwave Gece Kulübü (The Crypt)',
    maxHp: 600,
    themeColor: '#ec4899',
    description: 'Kadife takım elbiseli asil vampir. Yarasa sisi halinde ışınlanır, oyuncunun arkasına sızarak kan bıçağı ve disko lazerleri savurur.',
  },
  {
    id: 'CHIEF_MALAKOR',
    name: 'Başkomiser Malakor',
    title: 'Yozlaşmış Tiefling İblis Amir',
    location: 'Karakol Çatısı & Kadim Kasa',
    maxHp: 800,
    themeColor: '#ef4444',
    description: 'Belediyeyi ve kartelleri birbirine bağlayan boynuzlu iblis amir. Cehennem alevi sütunları fırlatır ve dev alevli kılıcıyla alanı tarar.',
  },
];

export const BossSelectModal: React.FC<BossSelectModalProps> = ({
  isOpen,
  onClose,
  activeBossId,
  onSelectBoss,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">GRIMSTONE '94 ÇOKLU BOSS ARENALARI</h2>
              <p className="text-xs text-slate-400">4 farklı doğaüstü sendika liderini ve özel dövüş mekaniklerini seçin.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Showcase Banner */}
        <div className="relative h-44 overflow-hidden border-b border-slate-800">
          <img
            src={bossesPoster}
            alt="Supernatural Bosses"
            className="w-full h-full object-cover object-top opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          <div className="absolute bottom-3 left-6">
            <span className="text-[11px] font-mono tracking-widest text-amber-400 uppercase">Vaka Dosyası: Doğaüstü Kartel</span>
            <h3 className="text-base font-bold text-slate-100">Şehrin 4 Büyük Suç Baronu</h3>
          </div>
        </div>

        {/* Boss Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-y-auto">
          {BOSS_LIST.map((boss) => {
            const isSelected = activeBossId === boss.id;
            return (
              <div
                key={boss.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/60 border-rose-500 shadow-lg ring-1 ring-rose-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-100" style={{ color: boss.themeColor }}>
                        {boss.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">{boss.title}</p>
                    </div>

                    <div className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                      {boss.maxHp} HP
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>{boss.location}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{boss.description}</p>
                </div>

                <button
                  onClick={() => {
                    onSelectBoss(boss.id);
                    onClose();
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                    isSelected
                      ? 'bg-rose-600 text-white hover:bg-rose-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {isSelected ? 'Aktif Arenada Savaştasınız' : 'Bu Boss İle Karşılaş'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400 flex items-center justify-between">
          <span>Her boss; telegraf animasyonları, savuşturulabilir saldırılar ve hitstop mekaniği içerir.</span>
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
