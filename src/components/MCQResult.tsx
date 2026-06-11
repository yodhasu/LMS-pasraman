'use client';

import { MCQ } from '@/lib/types';
import { useState } from 'react';

interface Props {
  type: 'pre' | 'post';
  score: number;
  answers: Record<string, number>;
  questions: MCQ[];
}

export default function MCQResult({ type, score, answers, questions }: Props) {
  const [open, setOpen] = useState(true);
  const passed = score >= 70;
  const correct = questions.filter(q => answers[q.id] === q.correctIndex).length;

  return (
    <div className="ml-11">
      {/* Header — always visible */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-emerald-700 font-medium">
            ✅ {type === 'pre' ? 'Pre-test' : 'Post-test'} selesai
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {score}
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs text-[#5C7A6E] hover:text-[#1F3D30] font-medium transition-colors"
        >
          <span>{open ? 'Sembunyikan' : '🔍 Lihat Hasil'}</span>
          <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </button>
      </div>

      {/* Summary line */}
      <p className="text-xs text-[#8A9E95] mt-1">
        {correct} dari {questions.length} soal benar
      </p>

      {/* Expandable details */}
      {open && (
        <div className="mt-3 space-y-2">
          {questions.map((q, i) => {
            const userAns = answers[q.id];
            const isCorrect = userAns === q.correctIndex;
            return (
              <div key={q.id} className={`p-3 rounded-xl text-xs border ${
                isCorrect
                  ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-red-50 border-red-100'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{isCorrect ? '✅' : '❌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1F3D30] mb-1">{i + 1}. {q.question}</p>
                    <p className={isCorrect ? 'text-emerald-700' : 'text-red-700'}>
                      Jawabanmu: {userAns !== undefined ? (q.options[userAns] || '(jawaban tidak terekam)') : '(tidak dijawab)'}
                    </p>
                    {!isCorrect && (
                      <p className="text-emerald-700 mt-0.5">✓ Jawaban benar: {q.options[q.correctIndex]}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
