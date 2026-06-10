'use client';

import { useAuth } from '@/lib/AuthContext';
import {
  useChapters, useStudentProgress, useNilai, useTeacherClasses,
  useClassProgress, useTeacherTasks,
  computeTaskInbox, resetUserProgress, resetPrototypeData,
} from '@/lib/supabase-data';
import Link from 'next/link';
import { useState } from 'react';

// ── Shared types ──
type StepKey = 'preTestCount' | 'materiCount' | 'tugasCount' | 'postTestCount';
const STEP_KEYS: StepKey[] = ['preTestCount', 'materiCount', 'tugasCount', 'postTestCount'];
const STEP_LABELS = ['Pre-Test', 'Materi', 'Tugas', 'Post-Test'] as const;
const STEP_EMOJIS = ['📋', '📖', '📝', '📊'];

// ── Reusable mini components ──

/** Single row: emoji + label + dots + count. Designed for scanning at a glance. */
function StepRow({ label, emoji, done, total }: { label: string; emoji: string; done: number; total: number }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="w-7 text-center text-base shrink-0">{emoji}</span>
      <span className="w-[72px] text-sm font-medium text-[#1F3D30] shrink-0">{label}</span>
      <div className="flex-1 flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-2.5 rounded-full transition-colors ${
              i < done ? 'bg-emerald-500' : 'bg-[#E8E4DD]'
            }`}
          />
        ))}
      </div>
      <span className="w-10 text-right text-sm font-bold text-[#1F3D30] shrink-0">
        {done}/{total}
      </span>
    </div>
  );
}

/** Big horizontal progress bar with percentage label. */
function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-[#1F3D30]">{label}</span>
        <span className="font-bold text-[#1F3D30]">{pct}%</span>
      </div>
      <div className="h-4 bg-[#E8E4DD] rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// MAIN DASHBOARD PAGE
// ══════════════════════════════════════
export default function DashboardPage() {
  const { user, role, loading: authLoading } = useAuth();
  const { classes: teacherClasses, loading: clsLoading } = useTeacherClasses();
  const { chapters, loading: chLoading } = useChapters();
  const { progress: studentProgress } = useStudentProgress();
  const { scores } = useNilai();
  const isTeacher = role === 'teacher' || role === 'admin';

  // Teacher-only hooks (called conditionally but always hooks-safe)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { progress: classProgress, loading: progLoading } = useClassProgress(selectedClassId);
  const { tasks: teacherTasks, loading: tasksLoading } = useTeacherTasks(selectedClassId);

  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Siswa';
  const loading = authLoading || chLoading || clsLoading;

  // ══════ HANDLERS ══════

  const handleReset = async () => {
    if (!user?.uid) return;
    setConfirmReset(false);
    setResetting(true);
    setResetMsg(null);
    const result = isTeacher
      ? await resetPrototypeData()
      : await resetUserProgress(user.uid);
    setResetMsg(result.message);
    setResetting(false);
    if (result.ok) {
      setTimeout(() => {
        setResetMsg(null);
        window.location.reload();
      }, 1200);
    }
  };

  // ══════ SCORE STATS (shared) ══════
  const pretestScores = scores.filter(s => s.type === 'pretest');
  const posttestScores = scores.filter(s => s.type === 'posttest');
  const avgPretest = pretestScores.length > 0
    ? Math.round(pretestScores.reduce((a, b) => a + b.score, 0) / pretestScores.length)
    : null;
  const avgPosttest = posttestScores.length > 0
    ? Math.round(posttestScores.reduce((a, b) => a + b.score, 0) / posttestScores.length)
    : null;
  const pengayaanCount = scores.filter(s => s.type === 'pengayaan').length;
  const tugasDone = scores.filter(s => s.type === 'tugas').length;

  // ══════ COMPUTED VALUES ══════

  // Student
  const totalBab = chapters.length;
  const completedBab = chapters.filter(c => studentProgress[c.id]?.complete).length;
  const pct = totalBab > 0 ? Math.round((completedBab / totalBab) * 100) : 0;
  const currentChapter = chapters.find(c => {
    const p = studentProgress[c.id];
    return p && !p.complete;
  }) || chapters[0];
  const currentProgress = currentChapter ? studentProgress[currentChapter.id] : undefined;
  const cIdx = currentChapter ? chapters.findIndex(c => c.id === currentChapter.id) : 0;
  const inbox = computeTaskInbox(chapters, studentProgress, user?.uid);
  const pendingTasks = inbox.filter(i => i.status === 'pending');
  const steps = currentChapter ? [
    ...(currentChapter.preTest && currentChapter.preTest.length > 0
      ? [{ label: 'Pre-Test', done: currentProgress?.pretest ?? false }]
      : []),
    { label: 'Materi', done: currentProgress?.materi ?? false },
    ...(currentChapter.tasks.length > 0
      ? [{ label: 'Tugas', done: currentProgress?.tugas ?? false }]
      : []),
    { label: 'Post-Test', done: currentProgress?.posttest ?? false },
  ] : [];

  // Teacher
  const currentCh = classProgress?.chapters.find(c => c.completeCount < classProgress.totalStudents);
  const currentChIndex = currentCh ? (classProgress?.chapters.indexOf(currentCh) ?? 0) : -1;
  const ungradedTasks = (teacherTasks ?? []).filter(t => t.submittedCount > t.gradedCount);

  // ══════ LOADING ══════
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  // ════════════════════════════════════
  // TEACHER: CLASS DETAIL VIEW
  // ════════════════════════════════════
  if (isTeacher && selectedClassId && classProgress) {
    const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
    const loadingDetail = progLoading || tasksLoading;

    return (
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Back */}
        <button
          onClick={() => setSelectedClassId(null)}
          className="flex items-center gap-2 text-sm font-semibold text-[#5C7A6E] hover:text-[#1F3D30] transition-colors"
        >
          ← Kembali
        </button>

        {/* Class header */}
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[#1F3D30]">
            👥 {selectedClass?.name}
          </h1>
          <p className="text-sm text-[#5C7A6E] mt-0.5">
            {classProgress.totalStudents} siswa — {classProgress.totalChapters} bab
          </p>
        </div>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
          </div>
        ) : (
          <>

            {/* ── Overall progress bar ── */}
            <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
              <ProgressBar
                pct={classProgress.overallPct}
                label={`${classProgress.completedChapters} dari ${classProgress.totalChapters} bab selesai`}
              />
            </div>

            {/* ── Current chapter step breakdown ── */}
            {currentCh && (
              <div className="bg-white rounded-2xl border border-[#1F3D30]/5 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                <div className="p-5">
                  <p className="text-xs font-semibold text-[#C8A84E] uppercase tracking-wider mb-2">
                    Bab {currentChIndex + 1} — Sedang Dipelajari
                  </p>
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{currentCh.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base lg:text-lg font-bold text-[#1F3D30]">{currentCh.title}</h2>
                      {currentCh.subtitle && (
                        <p className="text-xs text-[#5C7A6E]">{currentCh.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-[#E8E4DD]/60 pt-2">
                    {STEP_LABELS.map((label, i) => (
                      <StepRow
                        key={label}
                        label={label}
                        emoji={STEP_EMOJIS[i]}
                        done={currentCh[STEP_KEYS[i]]}
                        total={classProgress.totalStudents}
                      />
                    ))}
                  </div>
                  <Link
                    href={`/materi?class=${selectedClassId}`}
                    className="mt-4 block w-full text-center py-3 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors"
                  >
                    Buka Materi →
                  </Link>
                </div>
              </div>
            )}

            {/* ── All chapters mini grid ── */}
            <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
              <h3 className="font-bold text-[#1F3D30] mb-3">📖 Semua Bab</h3>
              <div className="grid grid-cols-2 gap-2">
                {classProgress.chapters.map((ch, i) => {
                  const allDone = ch.completeCount === classProgress.totalStudents;
                  const someDone = ch.preTestCount > 0 || ch.materiCount > 0 || ch.tugasCount > 0 || ch.postTestCount > 0;
                  return (
                    <div
                      key={ch.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-sm ${
                        allDone ? 'bg-emerald-50'
                          : someDone ? 'bg-amber-50'
                          : 'bg-[#FBF8F4]'
                      }`}
                    >
                      <span className="text-base">{allDone ? '✅' : someDone ? '⏳' : '⬜'}</span>
                      <span className="font-medium text-[#1F3D30] truncate">Bab {i + 1}</span>
                    </div>
                  );
                })}
              </div>
              <Link
                href={`/materi?class=${selectedClassId}`}
                className="mt-3 block w-full text-center py-2.5 bg-[#FBF8F4] text-[#1F3D30] rounded-xl text-sm font-semibold hover:bg-[#F0EAE2] transition-colors"
              >
                Kelola Materi →
              </Link>
            </div>

            {/* ── Pending grading ── */}
            {ungradedTasks.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
                <h3 className="font-bold text-[#1F3D30] mb-3">📝 Perlu Dinilai</h3>
                <div className="space-y-2">
                  {ungradedTasks.slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      href={`/tugas/${task.id}?class=${selectedClassId}`}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[#FBF8F4] hover:bg-[#F0EAE2] transition-colors"
                    >
                      <span className="text-lg mt-0.5">⏳</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1F3D30] truncate">{task.title}</p>
                        <p className="text-xs text-[#5C7A6E]">{task.chapterTitle}</p>
                        <p className="text-xs font-medium text-amber-600 mt-0.5">
                          {task.submittedCount - task.gradedCount} dari {task.submittedCount} siswa belum dinilai
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#1F3D30] whitespace-nowrap">Nilai →</span>
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/tugas?class=${selectedClassId}`}
                  className="mt-3 block w-full text-center py-2.5 bg-[#FBF8F4] text-[#1F3D30] rounded-xl text-sm font-semibold hover:bg-[#F0EAE2] transition-colors"
                >
                  Lihat Semua Tugas →
                </Link>
              </div>
            )}

          </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════
  // TEACHER: CLASS LIST (default)
  // ════════════════════════════════════
  if (isTeacher) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header + Reset */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-[#1F3D30]">Om Swastyastu, {displayName} 🙏</h1>
              <p className="text-sm text-[#5C7A6E] mt-0.5">Kelola kelas belajar</p>
            </div>
            {confirmReset ? (
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-xs text-red-600 bg-red-100 rounded-xl px-3 py-1.5 font-semibold disabled:opacity-50"
                >
                  {resetting ? '⏳' : '⚠️ Yakin, Reset'}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-[#5C7A6E] underline underline-offset-2"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                disabled={resetting}
                className="text-xs text-[#5C7A6E] hover:text-[#1F3D30] underline underline-offset-2 disabled:opacity-50 flex-shrink-0"
                title="Balikin seluruh data prototype ke baseline awal"
              >
                {resetting ? '⏳' : '🔁 Reset Prototype'}
              </button>
            )}
          </div>
          {resetMsg && (
            <div className={`mt-2 text-xs font-medium px-3 py-1.5 rounded-lg ${
              resetMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {resetMsg}
            </div>
          )}
        </div>

        {/* Class cards */}
        {teacherClasses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-8 text-center">
            <p className="text-lg">📭 Belum ada kelas</p>
            <p className="text-sm text-[#5C7A6E] mt-2">Hubungi admin untuk menambahkan kelas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="font-bold text-[#1F3D30] text-sm">📚 Kelas yang Diampu</h2>
            {teacherClasses.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className="w-full text-left bg-white rounded-2xl border border-[#1F3D30]/5 p-5 hover:border-[#1F3D30]/15 transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#1F3D30]/5 flex items-center justify-center text-3xl shrink-0">
                    🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base lg:text-lg font-bold text-[#1F3D30]">{cls.name}</p>
                    <p className="text-sm text-[#5C7A6E] mt-0.5">👥 Klik untuk lihat progress</p>
                  </div>
                  <span className="text-lg text-[#5C7A6E]">→</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-4 bg-white hover:border-[#1F3D30]/15 transition-colors">
            <p className="text-lg font-bold text-[#1F3D30]">{avgPretest ?? '—'}</p>
            <p className="text-xs text-[#5C7A6E]">Pre-Test Avg</p>
          </Link>
          <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-4 bg-white hover:border-[#1F3D30]/15 transition-colors">
            <p className="text-lg font-bold text-[#1F3D30]">{avgPosttest ?? '—'}</p>
            <p className="text-xs text-[#5C7A6E]">Post-Test Avg</p>
          </Link>
          <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-4 bg-white hover:border-[#1F3D30]/15 transition-colors">
            <p className="text-lg font-bold text-[#1F3D30]">{pengayaanCount}</p>
            <p className="text-xs text-[#5C7A6E]">Pengayaan</p>
          </Link>
          <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-4 bg-white hover:border-[#1F3D30]/15 transition-colors">
            <p className="text-lg font-bold text-[#1F3D30]">{tugasDone}</p>
            <p className="text-xs text-[#5C7A6E]">Tugas Done</p>
          </Link>
        </div>

      </div>
    );
  }

  // ════════════════════════════════════
  // STUDENT DASHBOARD
  // ════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-[#1F3D30]">Om Swastyastu, {displayName} 🙏</h1>
            <p className="text-sm text-[#5C7A6E] mt-0.5">Lanjutkan belajar Susila Hindu</p>
          </div>
          {confirmReset ? (
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="text-xs text-red-600 bg-red-100 rounded-xl px-3 py-1.5 font-semibold disabled:opacity-50"
              >
                {resetting ? '⏳' : '⚠️ Yakin, Reset'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="text-xs text-[#5C7A6E] underline underline-offset-2"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              disabled={resetting}
              className="text-xs text-[#5C7A6E] hover:text-[#1F3D30] underline underline-offset-2 disabled:opacity-50 flex-shrink-0"
              title="Hapus semua progress & nilai, mulai dari awal lagi"
            >
              {resetting ? '⏳' : '🔁 Mulai Awal'}
            </button>
          )}
        </div>
        {resetMsg && (
          <div className={`mt-2 text-xs font-medium px-3 py-1.5 rounded-lg ${
            resetMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {resetMsg}
          </div>
        )}
      </div>

      {/* Empty / no chapters */}
      {!currentChapter ? (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-8 text-center space-y-4">
          {totalBab === 0 ? (
            <>
              <p className="text-lg">📭 Belum ada materi</p>
              <p className="text-sm text-[#5C7A6E]">Sepertinya database materi belum terisi. Hubungi guru/admin untuk mengisi data.</p>
            </>
          ) : (
            <p className="text-lg">🎉 Semua bab sudah selesai!</p>
          )}
        </div>
      ) : (
        <>

          {/* Progress ring */}
          <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-6 flex items-center gap-6">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#E8E4DD" strokeWidth="8" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1F3D30" strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={`${pct * 2.136} 213.6`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-[#1F3D30]">{pct}%</span>
              </div>
            </div>
            <div>
              <p className="font-bold text-lg text-[#1F3D30]">{completedBab} dari {totalBab} bab selesai</p>
              <p className="text-sm text-[#5C7A6E]">
                {totalBab - completedBab === 0 ? '🎉 Semua bab sudah selesai!' : `Tinggal ${totalBab - completedBab} bab lagi!`}
              </p>
              {pct > 0 && pct < 100 && (
                <div className="mt-3">
                  <Link href={`/materi/${currentChapter.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors">
                    Lanjutkan Belajar →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Current chapter card */}
          <div className="bg-white rounded-2xl border border-[#1F3D30]/5 overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${currentChapter.coverColor}`} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#C8A84E] uppercase tracking-wide">Bab {cIdx + 1} — Sedang Dipelajari</p>
                  <h2 className="text-lg font-bold mt-1 text-[#1F3D30]">{currentChapter.title}</h2>
                  <p className="text-sm text-[#5C7A6E] mt-1">{currentChapter.subtitle}</p>
                </div>
                <span className="text-4xl">{currentChapter.coverEmoji}</span>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                {steps.map((s) => (
                  <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    s.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    <span>{s.done ? '✓' : '○'}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
              <Link href={`/materi/${currentChapter.id}`}
                className="mt-4 block w-full text-center py-2.5 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors">
                Buka Bab →
              </Link>
            </div>
          </div>

        </>
      )}

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#1F3D30]">📝 Tugas Menunggu</h3>
            <Link href="/tugas" className="text-xs font-semibold text-[#1F3D30] hover:underline">Lihat semua →</Link>
          </div>
          <div className="space-y-2">
            {pendingTasks.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#FBF8F4]">
                <span className="text-lg mt-0.5">⏳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1F3D30] truncate">{item.task.title}</p>
                  <p className="text-xs text-[#5C7A6E]">{item.chapterTitle}</p>
                  {item.task.dueDate && (
                    <p className="text-xs font-medium text-[#C8A84E] mt-1">
                      Deadline: {new Date(item.task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-4 bg-white hover:border-[#1F3D30]/15 transition-colors">
          <p className="text-lg font-bold text-[#1F3D30]">{avgPretest ?? '—'}</p>
          <p className="text-xs text-[#5C7A6E]">Pre-Test Avg</p>
        </Link>
        <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-4 bg-white hover:border-[#1F3D30]/15 transition-colors">
          <p className="text-lg font-bold text-[#1F3D30]">{avgPosttest ?? '—'}</p>
          <p className="text-xs text-[#5C7A6E]">Post-Test Avg</p>
        </Link>
        <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-4 bg-white hover:border-[#1F3D30]/15 transition-colors">
          <p className="text-lg font-bold text-[#1F3D30]">{pengayaanCount}</p>
          <p className="text-xs text-[#5C7A6E]">Pengayaan</p>
        </Link>
        <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-4 bg-white hover:border-[#1F3D30]/15 transition-colors">
          <p className="text-lg font-bold text-[#1F3D30]">{tugasDone}</p>
          <p className="text-xs text-[#5C7A6E]">Tugas Done</p>
        </Link>
      </div>

    </div>
  );
}
