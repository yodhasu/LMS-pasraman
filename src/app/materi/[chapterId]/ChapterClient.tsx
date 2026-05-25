'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  useChapters, useStudentProgress, markChapterStep,
  saveScore, submitTaskAnswer, submitPengayaanLink
} from '@/lib/supabase-data';
import { useAuth } from '@/lib/AuthContext';
import MCQTest from '@/components/MCQTest';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { useState } from 'react';
import { ChapterProgressDetail, Chapter } from '@/lib/types';

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

const EMPTY_PROGRESS: ChapterProgressDetail = {
  pretest: false, materi: false, tugas: false, posttest: false, complete: false,
};

export default function ChapterClient() {
  const params = useParams();
  const chapterId = params.chapterId as string;
  const { chapters, loading } = useChapters();
  const { progress, user } = useStudentProgress();

  const chapter = chapters.find(c => c.id === chapterId);
  const cIdx = chapter ? chapters.findIndex(c => c.id === chapterId) : -1;
  const prevChapter = (cIdx > 0 && chapter) ? chapters[cIdx - 1] : null;
  const prevCompleted = !prevChapter || (progress[prevChapter.id]?.complete ?? false);
  const isLocked = !!chapter && !prevCompleted;

  const prog: ChapterProgressDetail = chapter
    ? (progress[chapterId] || { ...EMPTY_PROGRESS })
    : { ...EMPTY_PROGRESS };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

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
        <p className="text-sm text-[#5C7A6E]">Bab dengan ID &quot;{chapterId}&quot; tidak tersedia.</p>
        <Link href="/materi" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors">
          ← Kembali ke Materi
        </Link>
      </div>
    );
  }

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

  // ── Computed ──
  const hasPreTest = chapter.preTest && chapter.preTest.length > 0;
  const preTestStepDone = !hasPreTest || prog.pretest;
  const materialStepDone = prog.materi || false;
  const tasksAllDone = chapter.tasks.length === 0 || prog.tugas;
  const postTestStepDone = prog.posttest || false;
  const postTestUnlocked = materialStepDone && tasksAllDone;
  const optionalUnlocked = postTestStepDone;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Siswa';

  // ── Handlers ──
  const handlePreTestComplete = (score: number, _answers: Record<string, number>) => {
    if (user) {
      markChapterStep(user.uid, chapterId, 'pretest');
      saveScore(user.uid, chapterId, 'pretest', score);
    }
  };

  const handleMaterialDone = () => {
    if (user) markChapterStep(user.uid, chapterId, 'materi');
  };

  const handleTugasComplete = (taskIdx: number) => async (score: number, answers: Record<string, number>) => {
    if (user) {
      await submitTaskAnswer(chapterId, taskIdx, user.uid, displayName, answers, score);
      await saveScore(user.uid, chapterId, 'tugas', score);

      // Mark tugas step done if this was the last pending task
      // (for single-task chapters this is always true; for multi-task we check all)
      const hasPendingTasks = chapter.tasks.some((task) => {
        const submitted = (task.answer || []).some(a => a.userId === user.uid);
        return !submitted;
      });
      // Since arrayUnion is async, the task we just submitted to may not show
      // our answer yet in the snapshot — treat it as submitted optimistically
      if (!hasPendingTasks || chapter.tasks.length === 1) {
        await markChapterStep(user.uid, chapterId, 'tugas');
      }
    }
  };

  const handlePostTestComplete = (score: number, _answers: Record<string, number>) => {
    if (user) {
      markChapterStep(user.uid, chapterId, 'posttest');
      saveScore(user.uid, chapterId, 'posttest', score);
    }
  };

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

      {/* Pre-test */}
      {hasPreTest ? (
        <SectionCard step={1} title="Pre-Test" description="Kerjakan pre-test untuk mengukur pemahaman awal." done={preTestStepDone} unlocked={true}>
          {!preTestStepDone ? (
            <MCQTest questions={chapter.preTest!} type="pre" onComplete={handlePreTestComplete} />
          ) : (
            <div className="ml-11 text-sm text-emerald-700 font-medium">✅ Pre-test selesai</div>
          )}
        </SectionCard>
      ) : (
        <SectionCard step={1} title="Tanpa Pre-Test" description="Guru tidak mengaktifkan pre-test untuk bab ini." done={true} unlocked={true} />
      )}

      {/* Materi */}
      <SectionCard step={hasPreTest ? 2 : 1} title="Materi" description="Pelajari materi bab ini dengan saksama." done={materialStepDone} unlocked={preTestStepDone}>
        <div className="ml-11 space-y-4">
          {chapter.materialVideoUrl && <YouTubeEmbed url={chapter.materialVideoUrl} />}
          <div className="p-4 bg-[#FBF8F4] rounded-xl border border-[#1F3D30]/5">
            <ReactMarkdown>{chapter.materialContent}</ReactMarkdown>
          </div>
          {!materialStepDone && (
            <button onClick={handleMaterialDone}
              className="px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors">
              ✓ Saya sudah membaca materi
            </button>
          )}
          {materialStepDone && <p className="text-sm text-emerald-700 font-medium">✅ Materi sudah dibaca</p>}
        </div>
      </SectionCard>

      {/* Tugas — now MCQ! */}
      {chapter.tasks.length > 0 && (
        <SectionCard step={hasPreTest ? 3 : 2} title="Tugas" description="Kerjakan tugas berikut untuk melanjutkan." done={tasksAllDone} unlocked={materialStepDone}>
          <div className="ml-11 space-y-4">
            {chapter.tasks.map((task, tIdx) => (
              <div key={task.id} className={`p-4 rounded-xl border ${tasksAllDone ? 'border-emerald-200 bg-emerald-50' : 'border-[#1F3D30]/5 bg-[#FBF8F4]'}`}>
                <div className="mb-3">
                  <p className="font-semibold text-sm">{task.title}</p>
                  <p className="text-xs text-[#5C7A6E] mt-0.5">{task.description}</p>
                  {task.dueDate && <p className="text-xs font-medium text-[#C8A84E] mt-1">Deadline: {new Date(task.dueDate).toLocaleDateString('id-ID')}</p>}
                </div>
                {!tasksAllDone ? (
                  <MCQTest questions={task.questions} type="tugas" onComplete={handleTugasComplete(tIdx)} />
                ) : (
                  <p className="text-sm text-emerald-700 font-medium">✅ Tugas sudah dikerjakan</p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Post-test Wajib */}
      <SectionCard step={hasPreTest ? (chapter.tasks.length > 0 ? 4 : 3) : (chapter.tasks.length > 0 ? 3 : 2)}
        title="Post-Test Wajib" description="Kerjakan post-test untuk menyelesaikan bab." done={postTestStepDone} unlocked={postTestUnlocked}>
        {!postTestStepDone ? (
          <MCQTest questions={chapter.postTestMandatory} type="post" onComplete={handlePostTestComplete} />
        ) : (
          <div className="ml-11 text-sm text-emerald-700 font-medium">
            ✅ Post-test selesai{prog.complete && ' — Bab tuntas! 🎉'}
          </div>
        )}
      </SectionCard>

      {/* Tugas Pengayaan (Opsional) */}
      {chapter.postTestOptional && (
        <PengayaanSection
          step={hasPreTest ? (chapter.tasks.length > 0 ? 5 : 4) : (chapter.tasks.length > 0 ? 4 : 3)}
          chapterId={chapterId}
          postTestOptional={chapter.postTestOptional}
          unlocked={optionalUnlocked}
          user={user}
          displayName={displayName}
        />
      )}
    </div>
  );
}

// ── Pengayaan sub-component ──
function PengayaanSection({ step, chapterId, postTestOptional, unlocked, user, displayName }: {
  step: number;
  chapterId: string;
  postTestOptional: NonNullable<Chapter['postTestOptional']>;
  unlocked: boolean;
  user: any;
  displayName: string;
}) {
  const myAnswer = user ? postTestOptional.answer?.find((a: any) => a.userId === user.uid) : null;
  const submitted = !!myAnswer;
  const [link, setLink] = useState('');

  const handleSubmit = async () => {
    if (!user || !link) return;
    await submitPengayaanLink(chapterId, user.uid, displayName, link);
  };

  return (
    <SectionCard step={step} title="Tugas Pengayaan (Opsional)"
      description="Tugas tambahan untuk memperdalam pemahaman." done={submitted} unlocked={unlocked}>
      <div className="ml-11 space-y-3">
        <div className="p-4 bg-[#FBF8F4] rounded-xl border border-[#1F3D30]/5">
          <ReactMarkdown>{postTestOptional.instruction}</ReactMarkdown>
        </div>
        {!submitted ? (
          <div className="flex gap-2">
            <input type="url" placeholder="Link Google Drive / YouTube" value={link}
              onChange={e => setLink(e.target.value)}
              className="flex-1 px-3 py-2 border border-[#d4dcd0] rounded-xl text-sm" />
            <button onClick={handleSubmit} disabled={!link}
              className="px-4 py-2 bg-[#C8A84E] text-white rounded-xl text-sm font-semibold disabled:opacity-50">Submit</button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-emerald-700 font-medium">✅ Tugas pengayaan sudah dikumpulkan</p>
            {myAnswer?.link && (
              <a href={myAnswer.link} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#1F3D30] underline mt-1 inline-block">📎 Lihat submission</a>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
