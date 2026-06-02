'use client';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  useChapters, useChapterMaterials, useStudentProgress, markChapterStep,
  saveScore, submitTaskAnswer, submitPengayaanLink, markMaterialViewed,
  deleteChapterMaterial, updateChapterMetadata, createChapterMaterial, updateChapterMaterial,
} from '@/lib/supabase-data';
import { useAuth } from '@/lib/AuthContext';
import MCQTest from '@/components/MCQTest';
import ChapterContent from '@/components/ChapterContent';
import { useState, useEffect } from 'react';
import { ChapterProgressDetail, Chapter } from '@/lib/types';
import MCQResult from '@/components/MCQResult';

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
  const searchParams = useSearchParams();
  const chapterId = params.chapterId as string;
  const isTeacherMode = searchParams.get('teacher') === 'true';

  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const { chapters, loading } = useChapters(dataRefreshKey);
  const { progress, user, refreshProgress } = useStudentProgress();
  const { role } = useAuth();
  const { materials, matProgress, loading: matLoading } = useChapterMaterials(chapterId, dataRefreshKey);
  const [pretestResult, setPretestResult] = useState<{ score: number; answers: Record<string, number> } | null>(null);
  const [posttestResult, setPosttestResult] = useState<{ score: number; answers: Record<string, number> } | null>(null);

  // ── Teacher edit state ──
  const isTeacher = role === 'teacher' || role === 'admin';
  const teacherMode = isTeacher && isTeacherMode;
  const teacherView = isTeacher;
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverEmoji, setEditCoverEmoji] = useState('');
  const [editCoverColor, setEditCoverColor] = useState('');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const chapter = chapters.find(c => c.id === chapterId);
  const cIdx = chapter ? chapters.findIndex(c => c.id === chapterId) : -1;
  const prevChapter = (cIdx > 0 && chapter) ? chapters[cIdx - 1] : null;
  const prevCompleted = !prevChapter || (progress[prevChapter.id]?.complete ?? false);
  const isLocked = !!chapter && !prevCompleted && !teacherView;

  const prog: ChapterProgressDetail = chapter
    ? (progress[chapterId] || { ...EMPTY_PROGRESS })
    : { ...EMPTY_PROGRESS };

  // ── Init edit fields when chapter loads ──
  useEffect(() => {
    if (chapter) {
      setEditTitle(chapter.title);
      setEditSubtitle(chapter.subtitle);
      setEditDescription(chapter.description);
      setEditCoverEmoji(chapter.coverEmoji);
      setEditCoverColor(chapter.coverColor);
    }
  }, [chapter?.id]);

  const refreshChapterData = () => setDataRefreshKey((key) => key + 1);

  const handleDeleteMaterial = async (materialId: string) => {
    const ok = await deleteChapterMaterial(materialId);
    if (ok) {
      refreshChapterData();
    } else {
      alert('Gagal menghapus materi. Coba lagi.');
    }
  };

  const handleCreateMaterial = async (data: { type: Chapter['materials'][number]['type']; content: string; caption?: string | null }) => {
    const ok = await createChapterMaterial(chapterId, data);
    if (ok) {
      refreshChapterData();
    } else {
      alert('Gagal menambah materi. Coba lagi.');
    }
  };

  const handleUpdateMaterial = async (materialId: string, data: { type: Chapter['materials'][number]['type']; content: string; caption?: string | null }) => {
    const ok = await updateChapterMaterial(materialId, data);
    if (ok) {
      refreshChapterData();
    } else {
      alert('Gagal mengubah materi. Coba lagi.');
    }
  };

  const handleSaveMetadata = async () => {
    setSaveError(null);
    if (!chapterReadyForStudent) {
      setSaveError('Lengkapi pre-test, materi, tugas, dan post-test sebelum menyimpan bab untuk siswa.');
      return;
    }
    setEditing(true);
    const ok = await updateChapterMetadata(chapterId, {
      title: editTitle,
      subtitle: editSubtitle,
      description: editDescription,
      coverEmoji: editCoverEmoji,
      coverColor: editCoverColor,
    });
    setEditing(false);
    if (ok) {
      setSaved(true);
      refreshChapterData();
      setTimeout(() => setSaved(false), 1800);
    } else {
      alert('Gagal menyimpan. Coba lagi.');
    }
  };

  if (loading || matLoading) {
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
  const hasPreTest = !!chapter.preTest && chapter.preTest.length > 0;
  const preTestStepDone = prog.pretest;
  const materialStepDone = prog.materi || false;
  const tasksAllDone = prog.tugas;
  const postTestStepDone = prog.posttest || false;
  const postTestUnlocked = teacherView || materialStepDone && tasksAllDone;
  const optionalUnlocked = teacherView || postTestStepDone;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Siswa';
  const hasMaterials = materials.length > 0;
  const hasTasks = chapter.tasks.length > 0;
  const tasksHaveQuestions = hasTasks && chapter.tasks.every((task) => task.questions.length > 0);
  const hasPostTest = chapter.postTestMandatory.length > 0;
  const chapterReadyForStudent = hasPreTest && hasMaterials && tasksHaveQuestions && hasPostTest;
  const readinessItems = [
    { label: 'Pre-test', done: hasPreTest },
    { label: 'Materi', done: hasMaterials },
    { label: 'Tugas + soal', done: tasksHaveQuestions },
    { label: 'Post-test', done: hasPostTest },
  ];

  // ── Handlers ──
  const handlePreTestComplete = async (score: number, answers: Record<string, number>) => {
    if (user) {
      setPretestResult({ score, answers });
      await markChapterStep(user.uid, chapterId, 'pretest');
      await saveScore(user.uid, chapterId, 'pretest', score);
      refreshProgress(user.uid);
    }
  };

  const handleMaterialDone = async () => {
    if (!user || materials.length === 0) return;
    await Promise.all(materials.map((material) => markMaterialViewed(user.uid, material.id)));
    await markChapterStep(user.uid, chapterId, 'materi');
    refreshChapterData();
    refreshProgress(user.uid);
  };

  const handleTugasComplete = (taskIdx: number) => async (score: number, answers: Record<string, number>) => {
    if (user) {
      await submitTaskAnswer(chapterId, taskIdx, user.uid, displayName, answers, score);
      await saveScore(user.uid, chapterId, 'tugas', score);

      const allTasksSubmitted = chapter.tasks.every((task, index) => (
        index === taskIdx || (task.answer || []).some(a => a.userId === user.uid)
      ));
      if (allTasksSubmitted) {
        await markChapterStep(user.uid, chapterId, 'tugas');
      }
      refreshChapterData();
      refreshProgress(user.uid);
    }
  };

  const handlePostTestComplete = async (score: number, answers: Record<string, number>) => {
    if (user) {
      await saveScore(user.uid, chapterId, 'posttest', score);
      if (score >= 70) {
        setPosttestResult({ score, answers });
        await markChapterStep(user.uid, chapterId, 'posttest');
        refreshProgress(user.uid);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <Link href="/materi" className="inline-flex items-center gap-1.5 text-sm text-[#5C7A6E] hover:text-[#1F3D30]">
          ← Kembali ke Materi
        </Link>
        {isTeacher && !teacherMode && (
          <Link href={`/materi/${chapterId}?teacher=true`}
            className="text-xs font-semibold text-[#1F3D30] hover:underline">
            ✏️ Edit Bab
          </Link>
        )}
      </div>

      {/* Chapter Header */}
      <div className={`rounded-2xl bg-gradient-to-br ${teacherMode ? editCoverColor : chapter.coverColor} p-5`}>
        <p className="text-xs font-bold uppercase tracking-wide text-[#1F3D30]/60">Bab {cIdx + 1}</p>
        {teacherMode ? (
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#1F3D30]/50">Cover Emoji</label>
              <input value={editCoverEmoji} onChange={e => setEditCoverEmoji(e.target.value)}
                className="block w-20 px-2 py-1 text-sm border border-[#1F3D30]/20 rounded-lg bg-white/60 mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#1F3D30]/50">Judul Bab</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="block w-full px-3 py-2 text-lg font-bold border border-[#1F3D30]/20 rounded-lg bg-white/60 mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#1F3D30]/50">Subtitle</label>
              <input value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-[#1F3D30]/20 rounded-lg bg-white/60 mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#1F3D30]/50">Deskripsi</label>
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2}
                className="block w-full px-3 py-2 text-sm border border-[#1F3D30]/20 rounded-lg bg-white/60 mt-0.5 resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#1F3D30]/50">Warna Cover (Tailwind gradient)</label>
              <input value={editCoverColor} onChange={e => setEditCoverColor(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-[#1F3D30]/20 rounded-lg bg-white/60 mt-0.5"
                placeholder="from-green-100 to-emerald-200" />
            </div>
            <button onClick={handleSaveMetadata} disabled={editing || !chapterReadyForStudent}
              className="px-4 py-2 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors disabled:opacity-50">
              {editing ? 'Menyimpan...' : saved ? '✅ Tersimpan!' : chapterReadyForStudent ? '💾 Simpan Metadata' : 'Lengkapi Bab Dulu'}
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-xl lg:text-2xl font-bold mt-1">{chapter.title}</h1>
            <p className="text-sm text-[#1F3D30]/70 mt-1">{chapter.subtitle}</p>
          </>
        )}
      </div>

      {isTeacher && (
        <div className="rounded-2xl border border-[#1F3D30]/5 bg-white p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#1F3D30]">Kesiapan Bab untuk Siswa</p>
              <p className="text-xs text-[#5C7A6E] mt-0.5">Guru dan siswa melihat konteks bab yang sama. Progress siswa tidak berlaku untuk guru.</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${chapterReadyForStudent ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {chapterReadyForStudent ? 'Siap' : 'Draft'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {readinessItems.map((item) => (
              <div key={item.label} className={`rounded-xl px-3 py-2 text-xs font-semibold ${item.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {item.done ? '✓' : '○'} {item.label}
              </div>
            ))}
          </div>
          {!chapterReadyForStudent && (
            <p className="text-xs text-[#8A6D2B]">Lengkapi semua bagian sebelum bab dianggap siap dipakai siswa.</p>
          )}
          {saveError && <p className="text-xs font-medium text-red-600">{saveError}</p>}
        </div>
      )}

      {/* Pre-test */}
      {hasPreTest ? (
        <SectionCard step={1} title="Pre-Test" description={teacherView ? "Preview soal pre-test siswa." : "Kerjakan pre-test untuk mengukur pemahaman awal."} done={teacherView ? true : preTestStepDone} unlocked={true}>
          {teacherView ? (
            <div className="ml-11 text-sm text-[#5C7A6E]">{chapter.preTest!.length} soal pre-test tersedia.</div>
          ) : pretestResult ? (
            <MCQResult type="pre" score={pretestResult.score} answers={pretestResult.answers} questions={chapter.preTest!} />
          ) : !preTestStepDone ? (
            <MCQTest questions={chapter.preTest!} type="pre" onComplete={handlePreTestComplete} />
          ) : (
            <div className="ml-11 text-sm text-emerald-700 font-medium">✅ Pre-test selesai</div>
          )}
        </SectionCard>
      ) : (
        <SectionCard step={1} title="Pre-Test Belum Dikonfigurasi" description="Bab belum siap untuk siswa karena pre-test wajib belum tersedia." done={false} unlocked={teacherView} />
      )}

      {/* Materi */}
      <SectionCard step={hasPreTest ? 2 : 1} title="Materi" description={teacherView ? "Preview dan edit isi bab." : "Pelajari materi bab ini dengan saksama."} done={teacherView ? true : materialStepDone} unlocked={teacherView || preTestStepDone}>
        <ChapterContent
          chapterId={chapterId}
          materials={materials}
          matProgress={matProgress}
          materialStepDone={materialStepDone}
          onMaterialDone={handleMaterialDone}
          isTeacher={teacherMode}
          onDeleteMaterial={handleDeleteMaterial}
          onCreateMaterial={handleCreateMaterial}
          onUpdateMaterial={handleUpdateMaterial}
        />
      </SectionCard>

      {/* Tugas */}
      {chapter.tasks.length > 0 ? (
        <SectionCard step={hasPreTest ? 3 : 2} title="Tugas" description={teacherView ? "Preview tugas siswa untuk bab ini." : "Kerjakan tugas berikut untuk melanjutkan."} done={teacherView ? true : tasksAllDone} unlocked={teacherView || materialStepDone}>
          <div className="ml-11 space-y-4">
            {chapter.tasks.map((task, tIdx) => (
              <div key={task.id} className={`p-4 rounded-xl border ${tasksAllDone ? 'border-emerald-200 bg-emerald-50' : 'border-[#1F3D30]/5 bg-[#FBF8F4]'}`}>
                <div className="mb-3">
                  <p className="font-semibold text-sm">{task.title}</p>
                  <p className="text-xs text-[#5C7A6E] mt-0.5">{task.description}</p>
                  {task.dueDate && <p className="text-xs font-medium text-[#C8A84E] mt-1">Deadline: {new Date(task.dueDate).toLocaleDateString('id-ID')}</p>}
                </div>
                {teacherView ? (
                  <p className="text-sm text-[#5C7A6E]">{task.questions.length} soal tugas tersedia.</p>
                ) : !tasksAllDone ? (
                  <MCQTest questions={task.questions} type="tugas" onComplete={handleTugasComplete(tIdx)} />
                ) : (
                  <p className="text-sm text-emerald-700 font-medium">✅ Tugas sudah dikerjakan</p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard step={hasPreTest ? 3 : 2} title="Tugas Belum Dikonfigurasi" description="Bab belum siap untuk siswa karena tugas wajib belum tersedia." done={false} unlocked={teacherView || materialStepDone} />
      )}

      {/* Post-test Wajib */}
      <SectionCard step={hasPreTest ? (chapter.tasks.length > 0 ? 4 : 3) : (chapter.tasks.length > 0 ? 3 : 2)}
        title="Post-Test Wajib" description={teacherView ? "Preview post-test siswa." : "Kerjakan post-test untuk menyelesaikan bab."} done={teacherView ? true : postTestStepDone} unlocked={postTestUnlocked}>
        {teacherView ? (
          <div className="ml-11 text-sm text-[#5C7A6E]">{chapter.postTestMandatory.length} soal post-test tersedia.</div>
        ) : posttestResult ? (
          <MCQResult type="post" score={posttestResult.score} answers={posttestResult.answers} questions={chapter.postTestMandatory} />
        ) : !postTestStepDone ? (
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
          teacherView={teacherView}
        />
      )}
    </div>
  );
}

// ── Pengayaan sub-component ──
function PengayaanSection({ step, chapterId, postTestOptional, unlocked, user, displayName, teacherView }: {
  step: number;
  chapterId: string;
  postTestOptional: NonNullable<Chapter['postTestOptional']>;
  unlocked: boolean;
  user: any;
  displayName: string;
  teacherView: boolean;
}) {
  const myAnswer = user ? postTestOptional.answer?.find((a: any) => a.userId === user.uid) : null;
  const [submittedLocally, setSubmittedLocally] = useState(false);
  const submitted = !!myAnswer || submittedLocally;
  const [link, setLink] = useState('');

  const handleSubmit = async () => {
    if (!user || !link) return;
    await submitPengayaanLink(chapterId, user.uid, displayName, link);
    setSubmittedLocally(true);
    setLink('');
  };

  return (
    <SectionCard step={step} title="Tugas Pengayaan (Opsional)"
      description={teacherView ? "Preview tugas pengayaan siswa." : "Tugas tambahan untuk memperdalam pemahaman."} done={teacherView ? true : submitted} unlocked={unlocked}>
      <div className="ml-11 space-y-3">
        <div className="p-4 bg-[#FBF8F4] rounded-xl border border-[#1F3D30]/5">
          <ReactMarkdown>{postTestOptional.instruction}</ReactMarkdown>
        </div>
        {teacherView ? (
          <p className="text-sm text-[#5C7A6E]">{postTestOptional.answer?.length ?? 0} submission pengayaan tercatat.</p>
        ) : !submitted ? (
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
