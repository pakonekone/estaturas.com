'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';

interface FamosoData {
  id: string;
  nombre: string;
  estaturaCm: number;
  profesion?: string;
  pais?: string;
  bandera?: string;
}

interface Props {
  famosos: FamosoData[];
}

interface Question {
  famoso: FamosoData;
  options: number[];
  correct: number;
}

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

const generateQuestion = (famoso: FamosoData, allFamosos: FamosoData[]): Question => {
  const correct = famoso.estaturaCm;
  const others = allFamosos
    .filter(f => f.id !== famoso.id)
    .map(f => f.estaturaCm);
  
  // Generate 2 plausible wrong answers (±5-25cm)
  const offsets = shuffle([5, 8, 10, 12, 15, 18, 20, 23]).slice(0, 4);
  const candidates = [
    ...offsets.map((o, i) => correct + (i % 2 === 0 ? o : -o)),
    ...others.slice(0, 2),
  ].filter(h => h > 140 && h < 230 && h !== correct);

  const wrongs = shuffle(candidates).slice(0, 2);
  const options = shuffle([correct, ...wrongs]);
  
  return { famoso, options, correct };
};

const TOTAL_QUESTIONS = 5;
const STORAGE_KEY = 'estaturas_quiz_best';

const QuizEstatura: FC<Props> = ({ famosos }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    setBestScore(saved);
    startQuiz();
  }, []);

  const startQuiz = useCallback(() => {
    const picks = shuffle(famosos).slice(0, TOTAL_QUESTIONS);
    setQuestions(picks.map(f => generateQuestion(f, famosos)));
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
    setStreak(0);
  }, [famosos]);

  const handleAnswer = (h: number) => {
    if (selected !== null) return;
    setSelected(h);
    const q = questions[current];
    if (h === q.correct) {
      setScore(s => s + 1);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
    setTimeout(() => {
      if (current + 1 >= TOTAL_QUESTIONS) {
        const finalScore = h === q.correct ? score + 1 : score;
        setFinished(true);
        if (finalScore > bestScore) {
          setBestScore(finalScore);
          localStorage.setItem(STORAGE_KEY, String(finalScore));
        }
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1200);
  };

  const shareResult = () => {
    const text = `🎯 Adiviné la estatura de ${score}/${TOTAL_QUESTIONS} famosos. ¿Puedes superarme? estaturas.com/quiz`;
    navigator.share?.({ text }) ?? navigator.clipboard?.writeText(text);
  };

  if (questions.length === 0) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
    </div>
  );

  if (finished) {
    const pct = Math.round((score / TOTAL_QUESTIONS) * 100);
    const emoji = score === TOTAL_QUESTIONS ? '🏆' : score >= 3 ? '🎯' : score >= 2 ? '😅' : '😬';
    return (
      <div className="bg-slate-900 rounded-2xl p-8 text-center space-y-6">
        <div className="text-6xl">{emoji}</div>
        <div>
          <h3 className="text-3xl font-bold text-white">{score}/{TOTAL_QUESTIONS}</h3>
          <p className="text-slate-400 mt-1">
            {score === TOTAL_QUESTIONS ? '¡Perfecto! Eres un experto en estaturas' :
             score >= 3 ? '¡Muy bien! Conoces bien a tus famosos' :
             score >= 2 ? 'No está mal. ¡Practica más!' :
             'Parece que las estaturas te sorprenden'}
          </p>
        </div>
        {score > bestScore && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg px-4 py-2 text-yellow-400 text-sm font-medium">
            🏆 ¡Nuevo récord personal!
          </div>
        )}
        <div className="text-sm text-slate-500">
          Mejor puntuación: {bestScore}/{TOTAL_QUESTIONS}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={startQuiz}
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            🔄 Jugar de nuevo
          </button>
          <button onClick={shareResult}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            📤 Compartir resultado
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
      {/* Progress */}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
              i < current ? 'bg-brand-500' : i === current ? 'bg-brand-400 animate-pulse' : 'bg-slate-600'
            }`} />
          ))}
        </div>
        <div className="flex items-center gap-4">
          {streak >= 2 && (
            <span className="text-orange-400 text-sm font-medium">🔥 ×{streak}</span>
          )}
          <span className="text-slate-400 text-sm">{score} / {current}</span>
        </div>
      </div>

      {/* Question */}
      <div className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-slate-400 text-sm uppercase tracking-wider">¿Cuánto mide?</p>
          <h3 className="text-2xl font-bold text-white">{q.famoso.nombre}</h3>
          <p className="text-slate-500 text-sm">
            {q.famoso.profesion} {q.famoso.bandera}
          </p>
        </div>

        {/* Silhouette hint */}
        <div className="flex justify-center">
          <svg width="60" height="100" viewBox="0 0 60 100">
            <circle cx="30" cy="12" r="10" fill="#64748b" />
            <rect x="15" y="24" width="30" height="38" rx="6" fill="#64748b" />
            <rect x="15" y="62" width="12" height="30" rx="4" fill="#64748b" />
            <rect x="33" y="62" width="12" height="30" rx="4" fill="#64748b" />
          </svg>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3">
          {q.options.map(h => {
            const isCorrect = h === q.correct;
            const isSelected = h === selected;
            let btnClass = 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:border-slate-600';
            if (selected !== null) {
              if (isCorrect) btnClass = 'border border-green-500 bg-green-500/20 text-green-400';
              else if (isSelected) btnClass = 'border border-red-500 bg-red-500/20 text-red-400';
              else btnClass = 'border border-slate-700 bg-slate-800 text-slate-500';
            }
            return (
              <button key={h} onClick={() => handleAnswer(h)} disabled={selected !== null}
                className={`w-full px-4 py-3.5 rounded-xl font-semibold text-lg transition-all ${btnClass} disabled:cursor-default`}>
                {h} cm
                <span className="ml-2 text-sm font-normal opacity-70">
                  ({Math.floor(h / 2.54 / 12)}'{Math.round((h / 2.54) % 12)}")
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizEstatura;
