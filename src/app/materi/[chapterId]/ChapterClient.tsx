'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useChapters, useStudentProgress, saveScore, markChapterCompleted } from '@/lib/firestore-data';
import { useAuth } from '@/lib/AuthContext';
import MCQTest from '@/components/MCQTest';
import YouTubeEmbed from '@/components/YouTubeEmbed';

function SectionCard({ step, title, description, done, unlocked, children }: {
  step: number; title: string; description: string; done: boolean; unlocked: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl border p-5 ${!unlocked ? 'opacity-50' : done ? 'border-emerald-200' : 'border-[#1F3D30]/5'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done ? 'bg-emerald-50 text-emerald-700' : unlocked ? 'bg-[#1F3D30] text-white' : 'bg-gray-100 text-gray-400'
        }`}>
          {done ? '✓' : unlocked ? step : '🔒'}
        </div>
        <div>
          <h3 className="font-bold text-[#1F3D30]">{title}</h3>
          <p className="text-xs text-[#5C7A6E]">{description}</p>
        </div>
      </div>
      {unlocked && children}
      {!unlocked && <p className="text-xs text-[#8A9E95] ml-11">Selesaikan langkah sebelumnya untuk membuka.</p>}
    </div>
  );
}

export default function ChapterClient() {
  const params = useParams();
  const chapterId = params.chapterId as string;
  const { chapters, loading } = useChapters();
  const { progress, user } = useStudentProgress();

  const chapter = chapters.find(c => c.id === chapterId);
  const cIdx = chapter ? chapters.findIndex(c => c.id === chapterId) : -1;
  const prevChapter = (cIdx > 0 && chapter) ? chapters[cIdx - 1] : null;
  const prevCompleted = !prevChapter || (progress[prevChapter.id]?.postTestMandatoryCompleted ?? false);
  const isLocked = !!chapter && !prevCompleted;
  const prog: Record<string, any> = chapter ? (progress[chapterId] || {}) : {};

  // ALL hooks before conditional returns
  const [preTestDone, setPreTestDone] = useState(false);
  const [materialDone, setMaterialDone] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [postTestDone, setPostTestDone] = useState(prog.postTestMandatoryCompleted ?? false);
  const [optionalLink, setOptionalLink] = useState('');
  const [optionalSubmitted, setOptionalSubmitted] = useState(false);

  // Loading
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  // Not found / empty
  if (!chapter) {
    if (chapters.length === 0) {
      return (
        <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
          <span className="text-6xl">📭</span>
          <h1 className="text-xl font-bold">Belum Ada Materi</h1>
          <p className="text-sm text-[#5C7A6E]">Database masih kosong. Kembali ke dashboard untuk mengisi materi.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors">
            ← Kembali ke Dashboard
          </Link>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <span className="text-6xl">🔍</span>
        <h1 className="text-xl font-bold">Bab Tidak Ditemukan</h1>
        <p className="text-sm text-[#5C7A6E]">Bab dengan ID "{chapterId}" tidak tersedia.</p>
        <Link href="/materi" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors">
          ← Kembali ke Materi
        </Link>
      </div>
    );
  }

  // Locked
  if (isLocked) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <span className="text-6xl">🔒</span>
        <h1 className="text-xl font-bold">{chapter.title}</h1>
        <p className="text-sm text-[#5C7A6E]">Selesaikan Bab {cIdx} terlebih dahulu untuk membuka bab ini.</p>
        {prevChapter && (
          <Link href={`/materi/${prevChapter.id}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors">
            ← Kembali ke Bab {cIdx}
          </Link>
        )}
      </div>
    );
  }

  // Computed
  const hasPreTest = chapter.preTest && chapter.preTest.length > 0;
  const preTestStepDone = !hasPreTest || preTestDone;
  const materialStepDone = materialDone;
  const tasksAllDone = chapter.tasks.length === 0 || chapter.tasks.every((t: any) => completedTasks.includes(t.id));
  const postTestUnlocked = materialStepDone && tasksAllDone;
  const optionalUnlocked = postTestDone;

  const handlePreTestComplete = (score: number) => {
    setPreTestDone(true);
    if (user) saveScore(user.uid, chapterId, 'pretest', score);
  };

  const handlePostTestComplete = (score: number) => {
    setPostTestDone(true);
    if (user) {
      saveScore(user.uid, chapterId, 'posttest', score);
      markChapterCompleted(user.uid, chapterId);
    }
  };

  // Render
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <Link href="/materi" className="inline-flex items-center gap-1.5 text-sm text-[#5C7A6E] hover:text-[#1F3D30]">
        ← Kembali ke Materi
      </Link>

      <div className={`rounded-2xl bg-gradient-to-br ${chapter.coverColor} p-5`}>
        <p className="text-xs font-bold uppercase tracking-wide text-[#1F3D30]/60">Bab {cIdx + 1}</p>
        <h1 className="text-xl lg:text-2xl font-bold mt-1">{chapter.title}</h1>
        <p className="text-sm text-[#1F3D30]/70 mt-1">{chapter.subtitle}</p>
      </div>

      {hasPreTest ? (
        <SectionCard step={1} title="Pre-Test" description="Kerjakan pre-test untuk mengukur pemahaman awal." done={preTestStepDone} unlocked={true}>
          {!preTestStepDone ? (
            <MCQTest questions={chapter.preTest!} type="pre" onComplete={handlePreTestComplete} />
          ) : (
            <div className="ml-11 text-sm text-emerald-700 font-medium">✅ Pre-test selesai — Skor: {prog.preTestScore ?? '-'}</div>
          )}
        </SectionCard>
      ) : (
        <SectionCard step={1} title="Tanpa Pre-Test" description="Guru tidak mengaktifkan pre-test untuk bab ini." done={true} unlocked={true} />
      )}

      <SectionCard step={hasPreTest ? 2 : 1} title="Materi" description="Pelajari materi bab ini dengan saksama." done={materialStepDone} unlocked={preTestStepDone}>
        <div className="ml-11 space-y-4">
          {chapter.materialVideoUrl && <YouTubeEmbed url={chapter.materialVideoUrl} />}
          <div className="p-4 bg-[#FBF8F4] rounded-xl border border-[#1F3D30]/5">
            <ReactMarkdown>{chapter.materialContent}</ReactMarkdown>
          </div>
          {!materialStepDone && (
            <button onClick={() => setMaterialDone(true)}
              className="px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors">
              ✓ Saya sudah membaca materi
            </button>
          )}
          {materialStepDone && <p className="text-sm text-emerald-700 font-medium">✅ Materi sudah dibaca</p>}
        </div>
      </SectionCard>

      {chapter.tasks.length > 0 && (
        <SectionCard step={hasPreTest ? 3 : 2} title="Tugas" description="Kerjakan tugas berikut untuk melanjutkan." done={tasksAllDone} unlocked={materialStepDone}>
          <div className="ml-11 space-y-3">
            {chapter.tasks.map((t: any) => {
              const isDone = completedTasks.includes(t.id);
              return (
                <div key={t.id} className={`p-3 rounded-xl border ${isDone ? 'border-emerald-200 bg-emerald-50' : 'border-[#1F3D30]/5 bg-[#FBF8F4]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{t.title}</p>
                      <p className="text-xs text-[#5C7A6E] mt-0.5">{t.description}</p>
                      {t.dueDate && <p className="text-xs font-medium text-[#C8A84E] mt-1">Deadline: {new Date(t.dueDate).toLocaleDateString('id-ID')}</p>}
                    </div>
                    {!isDone ? (
                      <button onClick={() => setCompletedTasks(prev => [...prev, t.id])}
                        className="px-3 py-1.5 bg-[#1F3D30] text-white rounded-lg text-xs font-semibold">Tandai Selesai</button>
                    ) : (
                      <span className="text-emerald-700 text-xs font-semibold">✓ Selesai</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <SectionCard step={hasPreTest ? (chapter.tasks.length > 0 ? 4 : 3) : (chapter.tasks.length > 0 ? 3 : 2)}
        title="Post-Test Wajib" description="Kerjakan post-test untuk menyelesaikan bab." done={postTestDone} unlocked={postTestUnlocked}>
        {!postTestDone ? (
          <MCQTest questions={chapter.postTestMandatory} type="post" onComplete={handlePostTestComplete} />
        ) : (
          <div className="ml-11 text-sm text-emerald-700 font-medium">✅ Post-test selesai — Bab tuntas! 🎉</div>
        )}
      </SectionCard>

      {chapter.postTestOptional && (
        <SectionCard step={hasPreTest ? (chapter.tasks.length > 0 ? 5 : 4) : (chapter.tasks.length > 0 ? 4 : 3)}
          title="Tugas Pengayaan (Opsional)" description="Tugas tambahan untuk memperdalam pemahaman." done={optionalSubmitted} unlocked={optionalUnlocked}>
          <div className="ml-11 space-y-3">
            <div className="p-4 bg-[#FBF8F4] rounded-xl border border-[#1F3D30]/5">
              <ReactMarkdown>{chapter.postTestOptional.instruction}</ReactMarkdown>
            </div>
            {!optionalSubmitted ? (
              <div className="flex gap-2">
                <input type="url" placeholder="Link Google Drive / YouTube" value={optionalLink}
                  onChange={e => setOptionalLink(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#d4dcd0] rounded-xl text-sm" />
                <button onClick={() => setOptionalSubmitted(true)} disabled={!optionalLink}
                  className="px-4 py-2 bg-[#C8A84E] text-white rounded-xl text-sm font-semibold disabled:opacity-50">Submit</button>
              </div>
            ) : (
              <p className="text-sm text-emerald-700 font-medium">✅ Tugas pengayaan sudah dikumpulkan</p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
