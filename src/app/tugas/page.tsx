'use client';

import { useChapters, useStudentProgress, computeTaskInbox, useTeacherTasks, useTeacherClasses } from '@/lib/supabase-data';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { useState } from 'react';

export default function TugasPage() {
  const { role } = useAuth();
  const isTeacher = role === 'teacher' || role === 'admin';

  // ── TEACHER VIEW ──
  if (isTeacher) return <TeacherTugasView />;

  // ── STUDENT VIEW ──
  return <StudentTugasView />;
}

// ═══════════════════════════════════════════════════════════════
// TEACHER VIEW
// ═══════════════════════════════════════════════════════════════
function TeacherTugasView() {
  const { classes } = useTeacherClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { tasks, loading } = useTeacherTasks(selectedClassId);

  const submittedTotal = tasks.reduce((s, t) => s + t.submittedCount, 0);
  const studentCount = tasks.length > 0 ? tasks[0].totalStudents : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">📝 Tugas — Guru</h1>
        <p className="text-sm text-[#5C7A6E] mt-0.5">Lihat pengumpulan tugas siswa per kelas</p>
      </div>

      {/* Class selector */}
      <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-4">
        <label className="block text-[13px] font-semibold text-[#3a5e4a] mb-2">Pilih Kelas</label>
        <select
          value={selectedClassId ?? ''}
          onChange={e => setSelectedClassId(e.target.value || null)}
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
          <p className="text-lg">👆 Pilih kelas untuk melihat tugas</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-8 text-center">
          <p className="text-lg">📭 Belum ada tugas di kelas ini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Summary */}
          <p className="text-xs text-[#5C7A6E] font-medium px-1">
            {tasks.length} tugas · {submittedTotal}/{studentCount * tasks.length} pengumpulan
          </p>

          {/* Task list */}
          {tasks.map(task => {
            const completionPct = studentCount > 0
              ? Math.round((task.submittedCount / studentCount) * 100)
              : 0;

            return (
              <Link
                key={task.id}
                href={`/tugas/${task.id}?class=${selectedClassId}`}
                className="block p-4 rounded-2xl bg-white border border-[#1F3D30]/5 hover:border-[#1F3D30]/15 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5 flex-shrink-0">
                    {task.type === 'pengayaan' ? '🌟' : '📝'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1F3D30] truncate">{task.title}</p>
                    <p className="text-xs text-[#5C7A6E] mt-0.5 truncate">
                      {task.chapterEmoji} {task.chapterTitle}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] font-medium text-[#8A9E95]">
                        {task.submittedCount}/{task.totalStudents} siswa
                      </span>
                      {task.submittedCount > 0 && (
                        <div className="flex-1 max-w-[120px] h-1.5 bg-[#e8efe4] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1F3D30] rounded-full transition-all"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-[#8A9E95] flex-shrink-0">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STUDENT VIEW (unchanged)
// ═══════════════════════════════════════════════════════════════
function StudentTugasView() {
  const { chapters, loading } = useChapters();
  const { progress } = useStudentProgress();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  const inbox = computeTaskInbox(chapters, progress, user?.uid);
  const pending = inbox.filter(i => i.status === 'pending');
  const submitted = inbox.filter(i => i.status === 'submitted' || i.status === 'graded');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold">📝 Tugas</h1>
        <p className="text-sm text-[#5C7A6E] mt-0.5">Semua tugas yang perlu dikerjakan</p>
      </div>

      {pending.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-[#5C7A6E] uppercase tracking-wide">⏳ Belum Dikerjakan ({pending.length})</h2>
          {pending.map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white border border-[#1F3D30]/5 flex items-start gap-3">
              <span className="text-xl mt-0.5">⏳</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.task.title}</p>
                <p className="text-xs text-[#5C7A6E] mt-0.5">{item.task.description}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#C8A84E] bg-[#C8A84E]/10 px-2 py-0.5 rounded-full">{item.chapterTitle}</span>
                  {item.task.dueDate && (
                    <span className="text-[11px] font-medium text-red-500">Deadline: {new Date(item.task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                </div>
                <Link href={`/materi/${item.chapterId}`} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#1F3D30] hover:underline">
                  Buka Bab →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#1F3D30]/5">
          <span className="text-4xl">🎉</span>
          <p className="text-sm font-semibold mt-2">Tidak ada tugas!</p>
          <p className="text-xs text-[#5C7A6E] mt-1">Semua tugas sudah dikerjakan.</p>
        </div>
      )}

      {submitted.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-sm text-[#5C7A6E] uppercase tracking-wide">✅ Sudah Dikerjakan ({submitted.length})</h2>
          {submitted.map((item, i) => (
            <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3 ${item.status === 'graded' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#1F3D30]/5'}`}>
              <span className="text-xl mt-0.5">{item.status === 'graded' ? '✅' : '📤'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{item.task.title}</p>
                  {item.status === 'graded' && item.score !== null && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Nilai: {item.score}</span>
                  )}
                </div>
                <p className="text-xs text-[#5C7A6E] mt-0.5">{item.chapterTitle}</p>
                {item.status === 'submitted' && <span className="inline-block text-[11px] text-[#8A9E95] mt-1.5">Menunggu dinilai guru...</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
