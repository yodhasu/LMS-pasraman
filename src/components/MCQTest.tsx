'use client';
import { useState } from 'react';
import { MCQ } from '@/lib/types';

interface Props {
  questions: MCQ[];
  type?: 'pre' | 'post';
  onComplete?: (score: number) => void;
}

export default function MCQTest({ questions, type = 'post', onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctIndex) correct++;
    });
    const s = Math.round((correct / questions.length) * 100);
    setScore(s);
    setSubmitted(true);
    if (onComplete) onComplete(s);
  };

  const allAnswered = questions.every(q => answers[q.id] !== undefined);
  const isPre = type === 'pre';

  if (submitted && score !== null) {
    const passed = score >= 70;
    return (
      <div className={`p-5 rounded-2xl border-2 ${passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="text-center">
          <div className="text-3xl mb-2">{passed ? (isPre ? '👏' : '🎉') : '📚'}</div>
          <h3 className="text-lg font-bold mb-1">
            {isPre
              ? `Skor Pre-Test: ${score}`
              : passed
              ? 'Selamat, kamu lulus!'
              : 'Belum lulus, coba lagi'}
          </h3>
          <p className="text-sm text-[#5C7A6E] mb-3">
            {isPre ? 'Pre-test berhasil dikerjakan. Lanjut ke materi ya!' : passed ? 'Post-test selesai. Bab ini tuntas!' : 'KKM: 70. Kamu bisa mengulangi.'}
          </p>
          <div className="space-y-1.5 text-left">
            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const correct = userAns === q.correctIndex;
              return (
                <div key={q.id} className={`p-2.5 rounded-lg text-xs ${correct ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <p className="font-semibold mb-0.5">{i + 1}. {q.question}</p>
                  <p>Jawaban: <span className={correct ? 'text-emerald-700' : 'text-red-700'}>{q.options[userAns]}</span></p>
                  {!correct && <p className="text-emerald-700 text-[11px]">✓ {q.options[q.correctIndex]}</p>}
                </div>
              );
            })}
          </div>
          {!passed && !isPre && (
            <button
              onClick={() => { setSubmitted(false); setAnswers({}); setScore(null); }}
              className="mt-4 px-5 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors"
            >
              Ulangi Post-Test
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#C8A84E]/10 border border-[#C8A84E]/20">
        <p className="text-sm font-semibold text-[#8A6D2B]">
          {isPre ? '📋 Pre-Test' : '📋 Post-Test'} — {questions.length} soal pilihan ganda
        </p>
        <p className="text-xs text-[#5C7A6E] mt-0.5">
          {isPre ? 'Kerjakan dulu ya, lalu lanjut ke materi.' : 'KKM: 70. Jawab semua soal lalu kumpulkan.'}
        </p>
      </div>
      {questions.map((q, i) => (
        <div key={q.id} className="p-4 rounded-xl bg-white border border-[#1F3D30]/5">
          <p className="font-semibold text-sm mb-3">{i + 1}. {q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  answers[q.id] === oi
                    ? 'border-[#1F3D30] bg-[#1F3D30]/5'
                    : 'border-[#1F3D30]/10 hover:border-[#1F3D30]/20'
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === oi}
                  onChange={() => setAnswers({ ...answers, [q.id]: oi })}
                  className="hidden"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    answers[q.id] === oi ? 'border-[#1F3D30]' : 'border-[#1F3D30]/20'
                  }`}
                >
                  {answers[q.id] === oi && <div className="w-2 h-2 rounded-full bg-[#1F3D30]" />}
                </div>
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          allAnswered
            ? 'bg-[#1F3D30] text-white hover:bg-[#2A5A44]'
            : 'bg-[#1F3D30]/10 text-[#5C7A6E] cursor-not-allowed'
        }`}
      >
        {allAnswered ? 'Kumpulkan Jawaban' : `Jawab semua soal (${Object.keys(answers).length}/${questions.length})`}
      </button>
    </div>
  );
}
