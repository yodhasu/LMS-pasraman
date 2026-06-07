'use client';

import { useChapters, useStudentProgress, createEmptyChapter, useTeacherClasses } from '@/lib/supabase-data';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MateriPage() {
  const { role, classId: userClassId } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const isTeacher = role === 'teacher' || role === 'admin';
  const { classes } = useTeacherClasses();
  const { chapters, loading } = useChapters(0, isTeacher ? selectedClassId : userClassId);
  const { progress } = useStudentProgress(isTeacher ? undefined : userClassId);
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleCreateBab = async () => {
    setCreating(true);
    setCreateMsg(null);
    const result = await createEmptyChapter(selectedClassId ?? undefined);
    setCreating(false);
    setCreateMsg(result.message);
    if (result.ok && result.id) {
      setTimeout(() => router.push(`/materi/${result.id}?teacher=true`), 800);
    } else {
      setTimeout(() => setCreateMsg(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">📚 Materi</h1>
          <p className="text-sm text-[#5C7A6E] mt-0.5">Susila & Etika Hindu — {chapters.length} Bab</p>
        </div>
        {isTeacher && (
          <button
            onClick={handleCreateBab}
            disabled={creating}
            className="px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? '⏳' : '+ Tambah Bab'}
          </button>
        )}
      </div>

      {createMsg && (
        <div className={`text-sm font-medium px-4 py-2 rounded-xl ${
          createMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {createMsg}
        </div>
      )}

      {/* Class selector — hanya untuk teacher */}
      {isTeacher && classes.length > 0 && (
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
          {selectedClass && (
            <p className="text-xs text-emerald-600 font-medium mt-2">
              ✅ Melihat materi sebagai guru — <strong>{selectedClass.name}</strong>
            </p>
          )}
        </div>
      )}

      {/* Kalo guru belum pilih kelas, kasih pengingat */}
      {isTeacher && !selectedClassId && classes.length > 0 && (
        <div className="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-2xl">
          👆 Pilih kelas terlebih dahulu untuk melihat materi sesuai kelas yang lo ajar.
        </div>
      )}

      {chapters.length === 0 && (
        <div className="bg-amber-50 text-amber-700 text-sm px-4 py-6 rounded-2xl text-center">
          {isTeacher
            ? '👆 Pilih kelas terlebih dahulu untuk melihat materi.'
            : 'Kamu belum terdaftar di kelas mana pun. Hubungi guru untuk mendapatkan kelas.'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {chapters.map((chapter, i) => {
          const prog = progress[chapter.id];
          const isCompleted = prog?.complete;
          const isAvailable = i === 0 || (chapters[i - 1] && progress[chapters[i - 1].id]?.complete);
          const isLocked = !isTeacher && !isAvailable && !isCompleted;

          if (isLocked) {
            return (
              <div key={chapter.id} className="relative">
                <div className="rounded-2xl border border-[#1F3D30]/5 bg-white/50 p-4 flex flex-col items-center text-center opacity-50">
                  <span className="text-3xl mb-2 grayscale">{chapter.coverEmoji}</span>
                  <p className="text-sm font-bold text-[#1F3D30] line-clamp-2">{chapter.title}</p>
                  <p className="text-xs text-[#8A9E95] mt-1">Bab {i + 1}</p>
                  <div className="mt-2 text-xl">🔒</div>
                </div>
              </div>
            );
          }

          const teacherQuery = isTeacher
            ? `?teacher=true${selectedClassId ? `&class=${selectedClassId}` : ''}`
            : '';

          return (
            <Link key={chapter.id} href={`/materi/${chapter.id}${teacherQuery}`}
              className="rounded-2xl border border-[#1F3D30]/5 bg-white hover:border-[#1F3D30]/15 hover:shadow-sm transition-all p-4 flex flex-col items-center text-center group">
              <span className="text-3xl mb-2">{chapter.coverEmoji}</span>
              <p className="text-sm font-bold text-[#1F3D30] line-clamp-2 group-hover:text-[#1F3D30]/80">{chapter.title}</p>
              <p className="text-xs text-[#5C7A6E] mt-1">Bab {i + 1}</p>
              {isCompleted && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">✓ Selesai</div>
              )}
              {!isCompleted && isAvailable && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold">
                  {prog?.materi ? '📝 Ada Tugas' : '📖 Belum Mulai'}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
