import React from 'react';
import { DialogueNode, CaseEnding } from '../types/game';
import { MessageSquare, Award, X, Sparkles, BookOpen, CheckCircle } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface DialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClues: (amount: number) => void;
}

const DIALOGUE_NODES: { [id: string]: DialogueNode } = {
  start: {
    id: 'start',
    speaker: 'Gary "Dörtayak" Squealer',
    speakerRole: 'Goblin Muhbir & Zorunlu Temizlik Görevlisi',
    avatarIcon: '🧌',
    text: 'Dedektif Vance! Şükürler olsun... Bak, depodaki kan kristali soygunu hakkında bildiğim her şeyi anlatırım. Ama 14 çocuğum var, okul harçları tavan yaptı! Bana polis koruması ve birkaç delil primi ayarlayacak mısın, yoksa beni kurtadamların önüne mi atacaksın?',
    choices: [
      {
        text: '"Kurallara göre oynayacağız Gary. İfadeyi imzala, seni tanık koruma programına alalım."',
        tone: 'LAW_AND_ORDER',
        nextNodeId: 'gary_law',
        clueReward: 25,
        outcomeNote: 'Yasa & Düzen puanı kazandınız. Gary resmi ifade verdi.',
      },
      {
        text: '"Kurtadamlarla savaş istemiyorum. Bana Jack\'in mekanının anahtarını ver, aranızdaki husumeti kapatayım."',
        tone: 'SYNDICATE_TRUCE',
        nextNodeId: 'gary_truce',
        clueReward: 35,
        outcomeNote: 'Sendika Barışı puanı kazandınız. Çetelerle temas kuruldu.',
      },
      {
        text: '"Bana kristalin nerede olduğunu söyle hemen! O büyüyü kılıcıma yükleyip şehri ateşe vereceğim!"',
        tone: 'CHAOS_OVERCHARGE',
        nextNodeId: 'gary_chaos',
        clueReward: 40,
        outcomeNote: 'Okült Kaos puanı kazandınız. Yasak rün fısıltıları arttı.',
      },
    ],
  },
  gary_law: {
    id: 'gary_law',
    speaker: 'Gary "Dörtayak" Squealer',
    speakerRole: 'Goblin Muhbir & Zorunlu Temizlik Görevlisi',
    avatarIcon: '🧌',
    text: 'Pekala şef, resmi olsun. Kan kristalleri Tersane\'deki Hell\'s Hounds motor kulübünde tutuluyor. Başkomiser Malakor da bu işin içinde! Dosyayı masaya koyarsan bütün karakol birbirine girer.',
    choices: [
      {
        text: 'Karakol çatısına çıkıp Malakor ile yüzleş (Final Karşılaşması).',
        tone: 'LAW_AND_ORDER',
        nextNodeId: 'resolved',
      },
    ],
  },
  gary_truce: {
    id: 'gary_truce',
    speaker: 'Gary "Dörtayak" Squealer',
    speakerRole: 'Goblin Muhbir & Zorunlu Temizlik Görevlisi',
    avatarIcon: '🧌',
    text: 'Akıllıca dedektif... Vampir Lordu Vladislaus da tersanedeki teslimatı bekliyor. İki tarafa da haklarını verirsek sokaklarda tek damla kan dökülmeden rünik ticaret devam eder.',
    choices: [
      {
        text: 'Sendika barış anlaşmasını mühürle.',
        tone: 'SYNDICATE_TRUCE',
        nextNodeId: 'resolved',
      },
    ],
  },
  gary_chaos: {
    id: 'gary_chaos',
    speaker: 'Gary "Dörtayak" Squealer',
    speakerRole: 'Goblin Muhbir & Zorunlu Temizlik Görevlisi',
    avatarIcon: '🧌',
    text: 'Deli bu adam... Tam bir çılgın! Al kristal kodunu: 0x94-VOID! Ama o güç serbest kaldığında şehrin neon şebekesi çökecek ve antik iblisler sokaklara taşacak!',
    choices: [
      {
        text: 'Yasak rünü serbest bırak ve geceyi kaosa boğ.',
        tone: 'CHAOS_OVERCHARGE',
        nextNodeId: 'resolved',
      },
    ],
  },
  resolved: {
    id: 'resolved',
    speaker: 'Dedektif Raymond Vance',
    speakerRole: 'Büyü Suçları Masası',
    avatarIcon: '🕵️',
    text: 'Soruşturma tamamlandı. Kararlarım vaka dosyasına kaydedildi ve Grimstone şehrinin kaderi belirlendi.',
    choices: [],
  },
};

const CASE_ENDINGS: CaseEnding[] = [
  {
    id: 'LAW_ORDER',
    title: 'Son 1: Sert Polis & Tavizsiz Düzen',
    subtitle: 'Hardboiled Lone Wolf · Yasa ve Nizam',
    description: 'Rüşvet tekliflerini ve mafya anlaşmalarını reddettiniz. Başkomiser Malakor\'un yolsuzluk ağını çökerttiniz, sendika liderlerini demir parmaklıklar ardına kilitlediniz. Ray Vance rozetini masaya bırakıp yağmurlu neon sokaklara gururla yürüdü.',
    tone: 'LAW_AND_ORDER',
    unlocked: false,
  },
  {
    id: 'SYNDICATE_TRUCE',
    title: 'Son 2: Grimstone Şehir Barışı',
    subtitle: 'Pragmatik Denge · Sendika Ateşkesi',
    description: 'Ork, elf ve vampir kartelleri arasında kırılgan ama barışçıl bir denge kurdunuz. Sokaklarda kan dökülmesi engellendi, herkes payını aldı ve Grimstone 90\'ların neon gecelerinde yaşamaya devam etti.',
    tone: 'SYNDICATE_TRUCE',
    unlocked: false,
  },
  {
    id: 'CHAOS_OVERCHARGE',
    title: 'Son 3: Okült Aşırı Yükleme',
    subtitle: 'Geceyarısı Kaosu · Kadim Kıyamet',
    description: 'Yasak kan kristalinin sınırlarını zorladınız. Şehrin tüm trafoları mor alevlerle patladı, iblisler serbest kaldı ve kurallar tamamen silindi. Artık yeni ve vahşi bir büyü çağı başladı.',
    tone: 'CHAOS_OVERCHARGE',
    unlocked: false,
  },
];

export const DialogueModal: React.FC<DialogueModalProps> = ({
  isOpen,
  onClose,
  onAddClues,
}) => {
  const [currentNodeId, setCurrentNodeId] = React.useState<string>('start');
  const [selectedTone, setSelectedTone] = React.useState<string>('LAW_AND_ORDER');
  const [endings, setEndings] = React.useState<CaseEnding[]>(CASE_ENDINGS);
  const [activeTab, setActiveTab] = React.useState<'INTERROGATION' | 'ENDINGS'>('INTERROGATION');

  if (!isOpen) return null;

  const node = DIALOGUE_NODES[currentNodeId] || DIALOGUE_NODES['start'];

  const handleChoose = (choice: { text: string; tone: string; nextNodeId?: string; clueReward?: number }) => {
    setSelectedTone(choice.tone);
    if (choice.clueReward) {
      onAddClues(choice.clueReward);
      soundEngine.playParry();
    }

    if (choice.nextNodeId) {
      setCurrentNodeId(choice.nextNodeId);
      if (choice.nextNodeId === 'resolved') {
        // Unlock corresponding ending!
        setEndings((prev) =>
          prev.map((e) => (e.tone === choice.tone ? { ...e, unlocked: true } : e))
        );
      }
    }
  };

  const resetInterrogation = () => {
    setCurrentNodeId('start');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-wide">SORGU ODASI & ÇOKLU SONLAR</h2>
              <p className="text-xs text-slate-400">Şüphelileri sorgulayın, tercihlerinizle vakanın nihai sonucunu belirleyin.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTab('INTERROGATION')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'INTERROGATION' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Canlı Sorgu
              </button>
              <button
                onClick={() => setActiveTab('ENDINGS')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'ENDINGS' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                3 Vaka Sonu
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'INTERROGATION' ? (
          /* Live Interrogation View */
          <div className="p-6 flex flex-col gap-5 overflow-y-auto">
            {/* Speaker Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-4">
              <div className="text-3xl p-2.5 bg-slate-800 border border-slate-700 rounded-xl shrink-0">
                {node.avatarIcon}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">{node.speaker}</h3>
                  <span className="text-xs text-amber-400 font-mono">({node.speakerRole})</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  "{node.text}"
                </p>
              </div>
            </div>

            {/* Choices */}
            {node.choices.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Vance'in Soruşturma Kararı:
                </span>
                {node.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => handleChoose(choice)}
                    className="p-3.5 rounded-lg text-left text-xs bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 text-slate-200 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <span className="font-medium">{choice.text}</span>
                    {choice.clueReward && (
                      <span className="shrink-0 ml-3 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/50 border border-amber-800 text-amber-300 group-hover:border-amber-500">
                        +{choice.clueReward} Delil
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex flex-col items-center justify-center text-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <h4 className="text-sm font-bold text-emerald-200">Sorgu Karara Bağlandı!</h4>
                <p className="text-xs text-slate-300 max-w-md">
                  Vaka kararı kaydedildi. "3 Vaka Sonu" sekmesinden açılan nihai sonunuzu görüntüleyebilirsiniz.
                </p>
                <button
                  onClick={resetInterrogation}
                  className="mt-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors"
                >
                  Sorguyu Yeniden Başlat
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Endings Showcase */
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="text-xs text-slate-400 mb-1">
              Sorgudaki ahlaki kararlarınız vakanın sonunu doğrudan belirler. Seçimlerinizi yaparak tüm sonları açabilirsiniz.
            </div>

            <div className="flex flex-col gap-3">
              {endings.map((ending) => (
                <div
                  key={ending.id}
                  className={`p-4 rounded-xl border transition-all ${
                    ending.unlocked
                      ? 'bg-slate-800/60 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                      : 'bg-slate-950/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <span>{ending.title}</span>
                    </h3>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                        ending.unlocked
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {ending.unlocked ? 'AÇILDI' : 'KİLİTLİ'}
                    </span>
                  </div>

                  <p className="text-xs text-amber-300/90 font-medium mb-1.5">{ending.subtitle}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{ending.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400 flex items-center justify-between">
          <span>Seçilen son, Unity projesinde GameEndingsManager ile kaydedilir.</span>
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
