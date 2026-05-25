'use client';

import { useAuth } from '@/lib/AuthContext';
import { useChapters, useStudentProgress, useNilai, computeTaskInbox, seedChapters } from '@/lib/firestore-data';
import Link from 'next/link';
import { useState } from 'react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { chapters, loading: chLoading } = useChapters();
  const { progress } = useStudentProgress();
  const { scores } = useNilai();
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  if (chLoading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  const totalBab = chapters.length;
  const completedBab = chapters.filter(c => progress[c.id]?.complete).length;
  const pct = totalBab > 0 ? Math.round((completedBab / totalBab) * 100) : 0;

  const currentChapter = chapters.find(c => {
    const p = progress[c.id];
    return p && !p.complete;
  }) || chapters[0];

  const currentProgress = currentChapter ? progress[currentChapter.id] : undefined;
  const cIdx = currentChapter ? chapters.findIndex(c => c.id === currentChapter.id) : 0;

  const inbox = computeTaskInbox(chapters, progress, user?.uid);
  const pendingTasks = inbox.filter(i => i.status === 'pending');

  const steps = currentChapter ? [
    { label: 'Pre-Test', done: currentProgress?.pretest || !currentChapter.preTest },
    { label: 'Materi', done: currentProgress?.materi },
    { label: 'Tugas', done: currentChapter.tasks.length === 0 || (currentProgress?.tugas ?? false) },
    { label: 'Post-Test Wajib', done: currentProgress?.posttest },
  ] : [];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Siswa';

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg(null);
    const result = await seedChapters();
    setSeedMsg(result.message);
    setSeeding(false);
    setTimeout(() => setSeedMsg(null), 4000);
  };

  // Score averages from nilai subcollection
  const pretestScores = scores.filter(s => s.type === 'pretest');
  const posttestScores = scores.filter(s => s.type === 'posttest');
  const avgPretest = pretestScores.length > 0 ? Math.round(pretestScores.reduce((a, b) => a + b.score, 0) / pretestScores.length) : null;
  const avgPosttest = posttestScores.length > 0 ? Math.round(posttestScores.reduce((a, b) => a + b.score, 0) / posttestScores.length) : null;
  const pengayaanCount = scores.filter(s => s.type === 'pengayaan').length;
  const tugasDone = scores.filter(s => s.type === 'tugas').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Om Swastyastu, {displayName} 🙏</h1>
            <p className="text-sm text-[#5C7A6E] mt-0.5">Lanjutkan belajar Susila Hindu</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs text-[#5C7A6E] hover:text-[#1F3D30] underline underline-offset-2 disabled:opacity-50 flex-shrink-0"
            title="Hapus semua data & isi ulang materi"
          >
            {seeding ? '⏳' : '🔁 Reset Data'}
          </button>
        </div>
        {seedMsg && (
          <div className={`mt-2 text-xs font-medium px-3 py-1.5 rounded-lg ${seedMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {seedMsg}
          </div>
        )}
      </div>

      {chapters.length > 0 && chapters.length !== 6 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-center">
          <p className="text-sm font-semibold text-amber-800">⚠️ Data tidak normal: {chapters.length} bab (seharusnya 6)</p>
          <p className="text-xs text-amber-600 mt-1">Klik &quot;🔁 Reset Data&quot; di kanan atas untuk memperbaiki.</p>
        </div>
      )}

      {!currentChapter ? (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-8 text-center space-y-4">
          {chapters.length === 0 ? (
            <>
              <p className="text-lg">📭 Belum ada materi</p>
              <p className="text-sm text-[#5C7A6E]">Database masih kosong. Klik &quot;Reset Data&quot; di kanan atas atau tombol di bawah untuk mengisi materi.</p>
              <button onClick={handleSeed} disabled={seeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] disabled:opacity-50 transition-colors">
                {seeding ? '⏳ Mengisi materi...' : '🌱 Seed Data Materi'}
              </button>
            </>
          ) : chapters.length !== 6 ? (
            <>
              <p className="text-lg">⚠️ Data Tidak Normal</p>
              <p className="text-sm text-[#5C7A6E]">Terdeteksi {chapters.length} bab (seharusnya 6). Klik &quot;Reset Data&quot; di kanan atas untuk memperbaiki.</p>
            </>
          ) : (
            <p className="text-lg">🎉 Semua bab sudah selesai!</p>
          )}
        </div>
      ) : (
        <>
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors">
                    Lanjutkan Belajar →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#1F3D30]/5 overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${currentChapter.coverColor}`} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#C8A84E] uppercase tracking-wide">Bab {cIdx + 1} — Sedang Dipelajari</p>
                  <h2 className="text-lg font-bold mt-1">{currentChapter.title}</h2>
                  <p className="text-sm text-[#5C7A6E] mt-1">{currentChapter.subtitle}</p>
                </div>
                <span className="text-4xl">{currentChapter.coverEmoji}</span>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                {steps.map((s, i) => {
                  const isSkipped = s.label === 'Pre-Test' && !currentChapter.preTest;
                  return (
                    <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                      isSkipped ? 'bg-gray-50 text-gray-400 line-through' :
                      s.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      <span>{isSkipped ? '—' : s.done ? '✓' : i + 1}</span>
                      <span>{isSkipped ? 'Tanpa Pre-Test' : s.label}</span>
                    </div>
                  );
                })}
              </div>
              <Link href={`/materi/${currentChapter.id}`}
                className="mt-4 block w-full text-center py-2.5 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A4D3E] transition-colors">
                Buka Bab →
              </Link>
            </div>
          </div>
        </>
      )}

      {pendingTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">📝 Tugas Menunggu</h3>
            <Link href="/tugas" className="text-xs font-semibold text-[#1F3D30] hover:underline">Lihat semua →</Link>
          </div>
          <div className="space-y-2">
            {pendingTasks.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#FBF8F4]">
                <span className="text-lg mt-0.5">⏳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.task.title}</p>
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

      <div className="grid grid-cols-2 gap-3">
        <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-3 hover:border-[#1F3D30]/15 transition-colors bg-white">
          <p className="text-lg font-bold text-[#1F3D30]">{avgPretest ?? '—'}</p>
          <p className="text-[10px] text-[#5C7A6E] uppercase">Pre-Test Avg</p>
        </Link>
        <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-3 hover:border-[#1F3D30]/15 transition-colors bg-white">
          <p className="text-lg font-bold text-[#1F3D30]">{avgPosttest ?? '—'}</p>
          <p className="text-[10px] text-[#5C7A6E] uppercase">Post-Test Avg</p>
        </Link>
        <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-3 hover:border-[#1F3D30]/15 transition-colors bg-white">
          <p className="text-lg font-bold text-[#1F3D30]">{pengayaanCount}</p>
          <p className="text-[10px] text-[#5C7A6E] uppercase">Pengayaan</p>
        </Link>
        <Link href="/nilai" className="rounded-2xl border border-[#1F3D30]/5 p-3 hover:border-[#1F3D30]/15 transition-colors bg-white">
          <p className="text-lg font-bold text-[#1F3D30]">{tugasDone}</p>
          <p className="text-[10px] text-[#5C7A6E] uppercase">Tugas Done</p>
        </Link>
      </div>
    </div>
  );
}
