'use client';

import { useChapters, useStudentProgress, computeTaskInbox } from '@/lib/firestore-data';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';

export default function TugasPage() {
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
