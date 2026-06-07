'use client';

import { useAuth } from '@/lib/AuthContext';
import { useChapters, useNilai, useTeacherClasses, useStudentsByClass } from '@/lib/supabase-data';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function NilaiPage() {
  const { role } = useAuth();
  const isTeacher = role === 'teacher' || role === 'admin';

  const { scores } = useNilai();

  // Teacher: class state
  const { classes } = useTeacherClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { students } = useStudentsByClass(selectedClassId);
  const { chapters, loading: chLoading } = useChapters(0, isTeacher ? selectedClassId : undefined);

  // Teacher: batch scores
  const [classScores, setClassScores] = useState<Record<string, Record<string, { pretest?: number; posttest?: number; tugas?: number; pengayaan?: number }>>>({});
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    if (!selectedClassId || !isTeacher) return;
    let cancelled = false;

    async function load() {
      setBatchLoading(true);
      // Use already-fetched students from useStudentsByClass
      const userIds = students.map(s => s.id);
      if (userIds.length === 0) {
        if (!cancelled) { setClassScores({}); setBatchLoading(false); }
        return;
      }

      const { data: scoreRows, error: scoreErr } = await supabase
        .from('scores')
        .select('*')
        .in('user_id', userIds)
        .order('submitted_at', { ascending: false });

      if (cancelled) return;

      if (scoreErr) {
        console.error('useNilai/teacher: scores fetch failed', scoreErr);
        if (!cancelled) setBatchLoading(false);
        return;
      }

      // Group scores by user → chapter
      const byUser: Record<string, Record<string, { pretest?: number; posttest?: number; tugas?: number; pengayaan?: number }>> = {};
      for (const s of (scoreRows ?? [])) {
        if (!byUser[s.user_id]) byUser[s.user_id] = {};
        if (!byUser[s.user_id][s.chapter_id]) byUser[s.user_id][s.chapter_id] = {};
        byUser[s.user_id][s.chapter_id][s.type as keyof typeof byUser[string][string]] = s.score;
      }
      if (!cancelled) {
        setClassScores(byUser);
        setBatchLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [selectedClassId, isTeacher]);

  if (chLoading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  // ── STUDENT VIEW (unchanged) ──
  if (!isTeacher) {
    return <StudentView chapters={chapters} scores={scores} />;
  }

  // ── TEACHER VIEW ──
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">📊 Nilai — Guru</h1>
          <p className="text-sm text-[#5C7A6E] mt-0.5">Lihat nilai siswa per kelas</p>
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-1.5">Pilih Kelas</label>
        <select
          value={selectedClassId ?? ''}
          onChange={e => {
            const val = e.target.value;
            setSelectedClassId(val || null);
            setClassScores({});
          }}
          className="w-full max-w-xs px-4 py-3 border border-[#d4dcd0] rounded-xl text-[15px] bg-white focus:outline-none focus:border-[#C8A84E] transition-colors"
        >
          <option value="">— Pilih kelas —</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} {c.semester ? `(${c.semester})` : ''}</option>
          ))}
        </select>
      </div>

      {!selectedClassId ? (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-8 text-center">
          <p className="text-lg">👆 Pilih kelas untuk melihat nilai siswa</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-8 text-center">
          <p className="text-lg">📭 Belum ada siswa di kelas ini</p>
        </div>
      ) : batchLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {students.map(student => (
            <StudentScoreCard
              key={student.id}
              student={student}
              chapters={chapters}
              chapterScores={classScores[student.id] ?? {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Student View (original unchanged) ──
function StudentView({ chapters, scores }: { chapters: any[]; scores: any[] }) {
  const chapterScores: Record<string, { pretest?: number; posttest?: number; tugas?: number; pengayaan?: number }> = {};
  for (const s of scores) {
    if (!chapterScores[s.chapterId]) chapterScores[s.chapterId] = {};
    chapterScores[s.chapterId][s.type as keyof typeof chapterScores[string]] = s.score;
  }

  const chaptersWithScores = chapters.map((c, i) => {
    const cs = chapterScores[c.id] || {};
    const isDone = cs.posttest !== undefined;
    return { chapter: c, idx: i, ...cs, isDone };
  });

  const posttestValues = chaptersWithScores.filter((c: any) => c.posttest !== undefined).map((c: any) => c.posttest!);
  const avgScore = posttestValues.length > 0
    ? Math.round(posttestValues.reduce((a: number, b: number) => a + b, 0) / posttestValues.length)
    : null;

  const scoreItem = (label: string, score: number | undefined, color: string) => (
    <div className={`text-center p-2 rounded-xl ${score !== undefined ? color : 'bg-gray-50'}`}>
      <p className="text-[10px] text-[#8A9E95] font-medium uppercase">{label}</p>
      <p className="text-lg font-bold text-[#1F3D30]">{score !== undefined ? score : '—'}</p>
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
        {chaptersWithScores.map(({ chapter, idx, pretest, posttest, tugas, pengayaan, isDone }: any) => {
          const hasScores = pretest !== undefined || posttest !== undefined || tugas !== undefined;
          const delta = pretest !== undefined && posttest !== undefined ? posttest - pretest : null;

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
                  {scoreItem('Pre-Test', pretest, 'bg-amber-50')}
                  {scoreItem('Post-Test', posttest, 'bg-emerald-50')}
                  {scoreItem('Pengayaan', pengayaan, 'bg-purple-50')}
                  {scoreItem('Tugas', tugas, 'bg-blue-50')}
                </div>
                {delta !== null && (
                  <div className="mt-3 text-center py-2 rounded-xl bg-emerald-50">
                    <p className="text-xs text-emerald-700">📈 Pre-Test {pretest} → Post-Test {posttest} <span className="font-bold">({delta >= 0 ? '+' : ''}{delta})</span></p>
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

// ── Teacher: Student Score Card ──
function StudentScoreCard({
  student,
  chapters,
  chapterScores,
}: {
  student: { id: string; username: string; displayName: string | null };
  chapters: any[];
  chapterScores: Record<string, { pretest?: number; posttest?: number; tugas?: number; pengayaan?: number }>;
}) {
  const [expanded, setExpanded] = useState(false);

  const scoreCount = Object.values(chapterScores).reduce((sum, cs) => {
    return sum + (cs.pretest !== undefined ? 1 : 0) + (cs.posttest !== undefined ? 1 : 0) + (cs.tugas !== undefined ? 1 : 0) + (cs.pengayaan !== undefined ? 1 : 0);
  }, 0);

  const allScoreValues = Object.values(chapterScores).flatMap(cs => [cs.pretest, cs.posttest, cs.tugas, cs.pengayaan]).filter((s): s is number => s !== undefined);
  const avgScore = allScoreValues.length > 0
    ? Math.round(allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-[#1F3D30]/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-[#FBF8F4] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-[#1F3D30] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {(student.displayName ?? student.username)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{student.displayName ?? student.username}</p>
          <p className="text-xs text-[#8A9E95]">@{student.username} · {scoreCount} nilai</p>
        </div>
        <div className="text-right flex-shrink-0">
          {avgScore !== null && (
            <p className="text-lg font-bold text-[#1F3D30]">{avgScore}</p>
          )}
        </div>
        <span className="text-sm text-[#8A9E95]">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {chapters.map((chapter: any, i: number) => {
            const cs = chapterScores[chapter.id];
            if (!cs || (cs.pretest === undefined && cs.posttest === undefined && cs.tugas === undefined && cs.pengayaan === undefined)) {
              return null;
            }

            return (
              <div key={chapter.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[#FBF8F4] text-sm">
                <span className="text-xs font-semibold text-[#8A9E95] uppercase w-14">Bab {i + 1}</span>
                <span className="flex-1 truncate text-[#1F3D30] font-medium">{chapter.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">
                  {cs.pretest !== undefined ? `Pre: ${cs.pretest}` : '—'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                  {cs.tugas !== undefined ? `Tgs: ${cs.tugas}` : '—'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                  {cs.posttest !== undefined ? `Post: ${cs.posttest}` : '—'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">
                  {cs.pengayaan !== undefined ? `Peng: ${cs.pengayaan}` : '—'}
                </span>
              </div>
            );
          })}
          {scoreCount === 0 && (
            <p className="text-xs text-[#8A9E95] text-center py-3">Belum ada nilai</p>
          )}
        </div>
      )}
    </div>
  );
}
