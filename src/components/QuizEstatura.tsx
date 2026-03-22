'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';

interface FamosoData {
  id: string; nombre: string; estaturaCm: number;
  profesion?: string; pais?: string; bandera?: string; color?: string;
}
interface Question { famoso: FamosoData; options: number[]; correct: number; }
interface Props { famosos: FamosoData[]; }

const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);
const TOTAL = 7;
const STORAGE_KEY = 'estaturas_quiz_best';

const cmToFtIn = (cm: number) => {
  const i = cm / 2.54, ft = Math.floor(i / 12);
  return `${ft}'${Math.round(i % 12)}"`;
};

const genQ = (f: FamosoData, all: FamosoData[]): Question => {
  const c = f.estaturaCm;
  const wrongs = shuffle([
    ...shuffle([3,5,7,8,10,12,15,18,20]).slice(0,6).map((o,i) => c + (i%2===0?o:-o)),
    ...all.filter(x=>x.id!==f.id).map(x=>x.estaturaCm),
  ].filter(h => h>140 && h<235 && h!==c)).slice(0,2);
  return { famoso: f, options: shuffle([c,...wrongs]), correct: c };
};

const QuizEstatura: FC<Props> = ({ famosos }) => {
  const [qs, setQs] = useState<Question[]>([]);
  const [cur, setCur] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState(0);
  const [streak, setStreak] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBest(parseInt(localStorage.getItem(STORAGE_KEY)||'0'));
    startQuiz();
  }, []);

  const startQuiz = useCallback(() => {
    const picks = shuffle(famosos).slice(0, TOTAL);
    setQs(picks.map(f => genQ(f, famosos)));
    setCur(0); setScore(0); setSelected(null); setDone(false); setStreak(0);
    setFadeIn(true);
  }, [famosos]);

  const handleAnswer = (h: number) => {
    if (selected !== null || transitioning) return;
    setSelected(h);
    const q = qs[cur];
    const correct = h === q.correct;
    const newScore = correct ? score + 1 : score;
    const newStreak = correct ? streak + 1 : 0;
    if (correct) setScore(s => s+1);
    setStreak(newStreak);

    setTimeout(() => {
      setTransitioning(true);
      setFadeIn(false);
      setTimeout(() => {
        if (cur + 1 >= TOTAL) {
          setDone(true);
          if (newScore > best) {
            setBest(newScore);
            localStorage.setItem(STORAGE_KEY, String(newScore));
          }
        } else {
          setCur(c => c+1);
          setSelected(null);
        }
        setFadeIn(true);
        setTransitioning(false);
      }, 250);
    }, 1100);
  };

  const shareResult = () => {
    const emojis = Array.from({length:TOTAL},(_, i) => i < score ? '✅' : '❌').join('');
    const text = `${emojis}\nAdiviné la estatura de ${score}/${TOTAL} famosos en estaturas.com ¿Puedes superarme?`;
    if (navigator.share) navigator.share({ text, url: 'https://estaturas.com/quiz' });
    else navigator.clipboard?.writeText(text + '\nhttps://estaturas.com/quiz');
  };

  if (qs.length === 0) return (
    <div className="flex items-center justify-center h-56">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-sky-500 border-t-transparent" />
    </div>
  );

  if (done) {
    const pct = score / TOTAL;
    const emoji = pct === 1 ? '🏆' : pct >= 0.7 ? '🎯' : pct >= 0.4 ? '😅' : '😬';
    const msg = pct === 1 ? '¡Perfecto! Eres un experto en estaturas 🎉' :
      pct >= 0.7 ? '¡Muy bien! Conoces bien a tus famosos' :
      pct >= 0.4 ? 'No está mal. ¡Practica más!' : 'Las estaturas te sorprenden…';
    const isNewBest = score >= best;

    return (
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0d1117, #0f172a)', border: '1px solid rgba(148,163,184,0.1)' }}>
        <div className="p-8 text-center space-y-5">
          <div className="text-6xl">{emoji}</div>
          <div>
            <p className="text-5xl font-black text-white">{score}<span className="text-stone-500 font-normal text-2xl">/{TOTAL}</span></p>
            <p className="text-stone-400 mt-2">{msg}</p>
          </div>

          {/* Score bar */}
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(148,163,184,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${(score/TOTAL)*100}%`, background: 'linear-gradient(to right, #d97706, #34d399)' }} />
          </div>

          {isNewBest && score > 0 && (
            <div className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24' }}>
              🏆 ¡Nuevo récord personal!
            </div>
          )}
          {!isNewBest && best > 0 && (
            <p className="text-stone-600 text-sm">Tu récord: {best}/{TOTAL}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={startQuiz}
              className="flex-1 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
              🔄 Jugar de nuevo
            </button>
            <button onClick={shareResult}
              className="flex-1 py-3 rounded-xl font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0' }}>
              📤 Compartir resultado
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = qs[cur];
  const silH = Math.round((q.famoso.estaturaCm / 210) * 100);
  const silW = Math.round(silH * 0.4);
  const color = q.famoso.color || '#60a5fa';

  return (
    <div ref={containerRef}
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: 'linear-gradient(135deg, #0d1117, #0f172a)', border: '1px solid rgba(148,163,184,0.1)' }}>

      {/* Progress bar */}
      <div className="h-1" style={{ background: 'rgba(148,163,184,0.08)' }}>
        <div className="h-full transition-all duration-500"
          style={{ width: `${((cur)/TOTAL)*100}%`, background: 'linear-gradient(to right, #d97706, #f59e0b)' }} />
      </div>

      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
        <div className="flex gap-1">
          {Array.from({length:TOTAL}).map((_,i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < cur ? 'scale-100' : i === cur ? 'scale-125 animate-pulse' : 'opacity-30'
            }`} style={{ background: i < cur ? '#34d399' : i === cur ? '#f59e0b' : '#334155' }} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          {streak >= 2 && <span className="text-orange-400 text-sm font-bold">🔥 ×{streak}</span>}
          <span className="text-stone-500 text-sm font-mono">{cur + 1} / {TOTAL}</span>
        </div>
      </div>

      {/* Question */}
      <div className="p-6"
        style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.25s ease', transform: fadeIn ? 'none' : 'translateY(8px)' }}>

        <div className="flex flex-col items-center gap-6 mb-8">
          {/* Silhouette */}
          <div className="relative">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full blur-xl opacity-30"
              style={{ width: `${silW*1.2}px`, height: '16px', background: color }} />
            <svg width={silW} height={silH} viewBox="0 0 40 100">
              <defs>
                <linearGradient id="quiz-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.35" />
                </linearGradient>
              </defs>
              <ellipse cx="20" cy="7.5" rx="7.5" ry="8" fill="url(#quiz-grad)" />
              <rect x="17" y="15.5" width="6" height="3.5" rx="1" fill="url(#quiz-grad)" />
              <path d="M17,19 Q4,20 3,26 L37,26 Q36,20 23,19 Z" fill="url(#quiz-grad)" />
              <path d="M3,26 L0,54 L7,54 L8,26 Z" fill="url(#quiz-grad)" />
              <path d="M37,26 L40,54 L33,54 L32,26 Z" fill="url(#quiz-grad)" />
              <path d="M8,26 L32,26 L30,58 L10,58 Z" fill="url(#quiz-grad)" />
              <path d="M10,57 L20,57 L19.5,100 L10,100 Z" fill="url(#quiz-grad)" />
              <path d="M20,57 L30,57 L30,100 L20.5,100 Z" fill="url(#quiz-grad)" />
            </svg>
          </div>

          {/* Name */}
          <div className="text-center">
            <p className="text-stone-500 text-xs uppercase tracking-widest mb-1">¿Cuánto mide?</p>
            <h3 className="text-2xl font-black text-white">{q.famoso.nombre}</h3>
            <p className="text-stone-500 text-sm mt-1">{q.famoso.profesion} {q.famoso.bandera}</p>
          </div>
        </div>

        {/* Options */}
        <div className="grid gap-3">
          {q.options.map(h => {
            const isCorrect = h === q.correct;
            const isSelected = h === selected;
            const revealed = selected !== null;
            let bg = 'rgba(30,41,59,0.6)';
            let border = 'rgba(148,163,184,0.15)';
            let textColor = '#e2e8f0';
            if (revealed && isCorrect)  { bg = 'rgba(52,211,153,0.15)'; border = 'rgba(52,211,153,0.5)'; textColor = '#34d399'; }
            if (revealed && isSelected && !isCorrect) { bg = 'rgba(248,113,113,0.15)'; border = 'rgba(248,113,113,0.5)'; textColor = '#f87171'; }
            if (revealed && !isCorrect && !isSelected) { textColor = '#475569'; }

            return (
              <button key={h} onClick={() => handleAnswer(h)} disabled={revealed}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-default disabled:hover:scale-100"
                style={{ background: bg, border: `1px solid ${border}`, color: textColor }}>
                <span className="text-xl">{h} cm</span>
                <span className="text-sm opacity-70 font-normal">{cmToFtIn(h)}</span>
                {revealed && isCorrect && <span className="text-green-400 ml-2">✓</span>}
                {revealed && isSelected && !isCorrect && <span className="text-red-400 ml-2">✗</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizEstatura;
