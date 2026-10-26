import React from 'react';
import { PlayerStats, SkillNode } from '../types/game';
import { Zap, Sword, Wind, Sparkles, X, CheckCircle2, Lock } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface SkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onUpdateStats: (newStats: PlayerStats) => void;
}

const INITIAL_SKILLS: SkillNode[] = [
  // BLADE MASTERY
  {
    id: 'blade_range',
    name: 'Astral Kılıç Menzili',
    category: 'BLADE',
    description: 'Rünik polis kılıcının vuruş menzilini %35 artırır ve darbe yayını genişletir.',
    cost: 25,
    unlocked: false,
  },
  {
    id: 'blade_crit',
    name: 'Rünik Kritik Darbe',
    category: 'BLADE',
    description: 'Kritik vuruş şansını %15\'ten %35\'e yükseltir ve kıvılcım patlaması yaratır.',
    cost: 40,
    unlocked: false,
    prerequisiteId: 'blade_range',
  },
  {
    id: 'blade_finisher',
    name: '3. Kombo İnfazı',
    category: 'BLADE',
    description: '3 adımlı kılıç kombosunun son vuruşuna %60 ekstra hasar ve geri itme ekler.',
    cost: 60,
    unlocked: false,
    prerequisiteId: 'blade_crit',
  },

  // URBAN MOBILITY
  {
    id: 'mobility_double_jump',
    name: 'Efsunlu Çift Zıplama',
    category: 'MOBILITY',
    description: 'Havada astral sıçrama yaparak ikinci bir zıplama hakkı kazandırır.',
    cost: 20,
    unlocked: true, // Baseline
  },
  {
    id: 'mobility_wall_jump',
    name: 'Yangın Merdiveni Tutunması',
    category: 'MOBILITY',
    description: 'Tuğla duvarlarda ve dikey yüzeylerde kayma ve zıt duvara sıçrama gücü verir.',
    cost: 35,
    unlocked: true, // Baseline
  },
  {
    id: 'mobility_hyper_dash',
    name: 'Buhar Atılması (Hyper Dash)',
    category: 'MOBILITY',
    description: 'Atılma (dash) bekleme süresini kısaltır ve dokunulmazlık süresini uzatır.',
    cost: 50,
    unlocked: false,
    prerequisiteId: 'mobility_wall_jump',
  },

  // ARCANE ARTS
  {
    id: 'arcane_parry',
    name: 'Rünik Savuşturma (Parry)',
    category: 'ARCANE',
    description: 'Gelen mermileri ve yakın dövüş saldırılarını savuşturup düşmanı sersemletir.',
    cost: 30,
    unlocked: true,
  },
  {
    id: 'arcane_shield',
    name: 'Kutsal Su Kalkanı',
    category: 'ARCANE',
    description: 'Dedektif Vance\'in maksimum canını 100\'den 150\'ye çıkarır.',
    cost: 45,
    unlocked: false,
    prerequisiteId: 'arcane_parry',
  },
  {
    id: 'arcane_clues',
    name: 'Dedektif Sezgisi',
    category: 'ARCANE',
    description: 'Düşmanlardan ve bosslardan elde edilen delil miktarını iki katına çıkarır.',
    cost: 55,
    unlocked: false,
    prerequisiteId: 'arcane_shield',
  },
];

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  isOpen,
  onClose,
  stats,
  onUpdateStats,
}) => {
  const [skills, setSkills] = React.useState<SkillNode[]>(INITIAL_SKILLS);

  if (!isOpen) return null;

  const handleUnlock = (skill: SkillNode) => {
    if (stats.clues < skill.cost) return;
    if (skill.unlocked) return;

    // Check prerequisite
    if (skill.prerequisiteId) {
      const prereq = skills.find((s) => s.id === skill.prerequisiteId);
      if (prereq && !prereq.unlocked) return;
    }

    const updated = skills.map((s) => (s.id === skill.id ? { ...s, unlocked: true } : s));
    setSkills(updated);

    // Apply stat buffs
    const newStats = { ...stats, clues: stats.clues - skill.cost };
    if (skill.id === 'blade_range') newStats.attackPower += 8;
    if (skill.id === 'blade_crit') newStats.critChance += 0.2;
    if (skill.id === 'blade_finisher') newStats.attackPower += 12;
    if (skill.id === 'mobility_hyper_dash') newStats.dashCooldown = 18;
    if (skill.id === 'arcane_shield') {
      newStats.maxHp = 150;
      newStats.hp = Math.min(newStats.hp + 50, 150);
    }

    newStats.unlockedSkills.push(skill.id);
    onUpdateStats(newStats);
    soundEngine.playParry();
  };

  const categories = [
    { key: 'BLADE', title: 'Kılıç Ustalığı', icon: Sword, color: 'text-cyan-400', border: 'border-cyan-500/30' },
    { key: 'MOBILITY', title: 'Sokak Akrobasisi', icon: Wind, color: 'text-amber-400', border: 'border-amber-500/30' },
    { key: 'ARCANE', title: 'Doğaüstü Sezgi', icon: Sparkles, color: 'text-purple-400', border: 'border-purple-500/30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/70 border border-cyan-800 rounded-lg text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">DEDEKTİF BÜYÜ VE BECERİ AĞACI</h2>
              <p className="text-xs text-slate-400">Toplanan deliller ile Ray Vance'in rünik yeteneklerini geliştirin.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/40 border border-amber-800/80 rounded text-amber-300 font-mono text-xs">
              <Sparkles className="w-4 h-4" />
              <span>{stats.clues} DELİL MEVCUT</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Skill Branches */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6 overflow-y-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const branchSkills = skills.filter((s) => s.category === cat.key);
            return (
              <div key={cat.key} className={`flex flex-col gap-3 p-4 rounded-xl bg-slate-950/50 border ${cat.border}`}>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                  <Icon className={`w-4 h-4 ${cat.color}`} />
                  <h3 className={`text-sm font-bold tracking-wide ${cat.color}`}>{cat.title}</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {branchSkills.map((skill) => {
                    const isAffordable = stats.clues >= skill.cost;
                    const prereq = skill.prerequisiteId ? skills.find((s) => s.id === skill.prerequisiteId) : null;
                    const isLocked = prereq ? !prereq.unlocked : false;

                    return (
                      <div
                        key={skill.id}
                        className={`p-3.5 rounded-lg border transition-all ${
                          skill.unlocked
                            ? 'bg-slate-800/40 border-emerald-500/40'
                            : isLocked
                            ? 'bg-slate-950/30 border-slate-800 opacity-60'
                            : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-200">{skill.name}</span>
                          {skill.unlocked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                          ) : (
                            <span className="text-[11px] font-mono text-amber-300 shrink-0">{skill.cost} Delil</span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">{skill.description}</p>

                        {!skill.unlocked && (
                          <button
                            disabled={!isAffordable || isLocked}
                            onClick={() => handleUnlock(skill)}
                            className={`w-full py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                              isLocked
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : isAffordable
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isLocked ? 'Önceki Beceri Gerekli' : isAffordable ? 'Kilidi Aç' : 'Yetersiz Delil'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
          <span>Tüm yetenekler doğrudan canlı 2D fizik motoruna anında etki eder.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
