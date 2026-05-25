'use client';

import { useChapters, useStudentProgress } from '@/lib/firestore-data';

export default function NilaiPage() {
  const { chapters, loading } = useChapters();
  const { progress } = useStudentProgress();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  const chaptersWithScores = chapters.map((c, i) => {
    const p = progress[c.id];
    return {
      chapter: c, idx: i,
      pretest: p?.pretestScore ?? null,
      posttest: p?.posttestScore ?? null,
      pengayaan: p?.pengayaanScore ?? null,
      tugas: p?.pengayaanScore ?? null,
      isDone: p?.complete ?? false,
    };
  });

  const scoredChapters = chaptersWithScores.filter(c => c.posttest !== null);
  const avgScore = scoredChapters.length > 0
    ? Math.round(scoredChapters.reduce((sum, c) => sum + (c.posttest || 0), 0) / scoredChapters.length)
    : null;

  const scoreItems = (label: string, score: number | null, color: string) => (
    <div className={`text-center p-2 rounded-xl ${score !== null ? color : 'bg-gray-50'}`}>
      <p className="text-[10px] text-[#8A9E95] font-medium uppercase">{label}</p>
      <p className="text-lg font-bold text-[#1F3D30]">{score !== null ? score : '—'}</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">📊 Nilai</h1>
          <p className="text-sm text-[#5C7A6E] mt-0.5">Rekap nilai per bab</p>
        </div>
        {avgScore !== null && (
          <div className="text-right">
            <p className="text-3xl font-bold text-[#1F3D30]">{avgScore}</p>
            <p className="text-xs text-[#5C7A6E]">Rata-rata</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {chaptersWithScores.map(({ chapter, idx, pretest, posttest, pengayaan, tugas, isDone }) => {
          const hasScores = pretest !== null || posttest !== null;
          const delta = pretest !== null && posttest !== null ? posttest - pretest : null;

          if (!isDone && !hasScores) {
            return (
              <div key={chapter.id} className="p-4 rounded-2xl bg-white border border-[#1F3D30]/5 flex items-center gap-4">
                <span className="text-2xl flex-shrink-0">{chapter.coverEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{chapter.title}</p>
                  <p className="text-xs text-[#8A9E95]">Bab {idx + 1} — Belum dikerjakan</p>
                </div>
                <span className="text-sm text-[#8A9E95]">—</span>
              </div>
            );
          }

          return (
            <div key={chapter.id} className="rounded-2xl bg-white border border-[#1F3D30]/5 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${chapter.coverColor}`} />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">{chapter.coverEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">Bab {idx + 1}: {chapter.title}</p>
                    {isDone && <span className="text-[11px] text-emerald-600 font-medium">✓ Selesai</span>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {scoreItems('Pre-Test', pretest, 'bg-amber-50')}
                  {scoreItems('Post-Test', posttest, 'bg-emerald-50')}
                  {scoreItems('Pengayaan', pengayaan, 'bg-purple-50')}
                  {scoreItems('Tugas', tugas, 'bg-blue-50')}
                </div>
                {delta !== null && (
                  <div className="mt-3 text-center py-2 rounded-xl bg-emerald-50">
                    <p className="text-xs text-emerald-700">📈 Pre-Test {pretest} → Post-Test {posttest} <span className="font-bold">(+{delta})</span></p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
