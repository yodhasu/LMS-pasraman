'use client';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  useChapters, useChapterMaterials, useStudentProgress, markChapterStep,
  saveScore, submitTaskAnswer, submitPengayaanLink,
  saveChapterBatch, deleteChapter,
} from '@/lib/supabase-data';
import { useAuth, LmsUser } from '@/lib/AuthContext';
import MCQTest from '@/components/MCQTest';
import ChapterContent from '@/components/ChapterContent';
import { useState, useEffect } from 'react';
import { ChapterProgressDetail, Chapter, ChapterMaterial, ChapterTask, MCQ, PengayaanAnswer } from '@/lib/types';
import MCQResult from '@/components/MCQResult';
import FileUpload from '@/components/FileUpload';

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

// ── Helpers ──
function freshId(): string {
  return crypto.randomUUID();
}

export default function ChapterClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;
  const isTeacherMode = searchParams.get('teacher') === 'true';

  const { classId: userClassId, role } = useAuth();
  const isTeacher = role === 'teacher' || role === 'admin';
  // Students see only their class's chapters for correct index/lock logic;
  // teachers see all chapters regardless.
  const visibleClassId = isTeacher ? undefined : userClassId;
  const { chapters, loading: chLoading } = useChapters(0, visibleClassId);
  const { progress, user, loaded: progressLoaded, refreshProgress } = useStudentProgress(visibleClassId);
  const { materials, matProgress, loading: matLoading } = useChapterMaterials(chapterId);
  const [pretestResult, setPretestResult] = useState<{ score: number; answers: Record<string, number> } | null>(null);
  const [posttestResult, setPosttestResult] = useState<{ score: number; answers: Record<string, number> } | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  const teacherMode = isTeacher && isTeacherMode;
  const teacherView = isTeacher;

  // ── Global loading: spinner sampai SEMUA data siap ──
  const [pageReady, setPageReady] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (chLoading || matLoading || !progressLoaded) return;
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) { setPageReady(true); return; } // chapter not found — let fallback render handle it
    setPageReady(true);
  }, [chLoading, matLoading, progressLoaded, chapters, chapterId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const chapter = chapters.find(c => c.id === chapterId);
  const cIdx = chapter ? chapters.findIndex(c => c.id === chapterId) : -1;
  const prevChapter = (cIdx > 0 && chapter) ? chapters[cIdx - 1] : null;
  const prevCompleted = !prevChapter || (progress[prevChapter.id]?.complete ?? false);
  const isLocked = !!chapter && !prevCompleted && !teacherView;

  const prog: ChapterProgressDetail = chapter
    ? (progress[chapterId] || { ...EMPTY_PROGRESS })
    : { ...EMPTY_PROGRESS };

  // ── Batch edit state ──
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverEmoji, setEditCoverEmoji] = useState('');
  const [editCoverColor, setEditCoverColor] = useState('');

  const [editMaterials, setEditMaterials] = useState<(ChapterMaterial & { _tmp?: boolean })[]>([]);
  const [editPretestEnabled, setEditPretestEnabled] = useState(false);
  const [editPretestQuestions, setEditPretestQuestions] = useState<(MCQ & { _tmp?: boolean })[]>([]);
  const [editPosttestEnabled, setEditPosttestEnabled] = useState(false);
  const [editPosttestQuestions, setEditPosttestQuestions] = useState<(MCQ & { _tmp?: boolean })[]>([]);
  const [editTasks, setEditTasks] = useState<(ChapterTask)[]>([]);
  const [editPengayaanEnabled, setEditPengayaanEnabled] = useState(false);
  const [editPengayaanText, setEditPengayaanText] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Init edit state from DB data ──
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!chapter || matLoading || dataLoaded) return;
    setEditTitle(chapter.title);
    setEditSubtitle(chapter.subtitle ?? '');
    setEditDescription(chapter.description ?? '');
    setEditCoverEmoji(chapter.coverEmoji);
    setEditCoverColor(chapter.coverColor);
    setEditMaterials(materials.map((m, i) => ({ ...m, sectionOrder: m.sectionOrder ?? i })));
    setEditPretestEnabled(!!(chapter.preTest && chapter.preTest.length > 0));
    setEditPretestQuestions(chapter.preTest?.map(q => ({ ...q })) ?? []);
    setEditPosttestEnabled(!!(chapter.postTestMandatory && chapter.postTestMandatory.length > 0));
    setEditPosttestQuestions(chapter.postTestMandatory?.map(q => ({ ...q })) ?? []);
    setEditTasks(chapter.tasks ? chapter.tasks.map(t => ({ ...t, questions: t.questions.map(q => ({ ...q })) })) : []);
    setEditPengayaanEnabled(!!chapter.postTestOptional);
    setEditPengayaanText(chapter.postTestOptional?.instruction ?? '');
    setDataLoaded(true);
  }, [chapter, matLoading, dataLoaded, materials]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Computed ──
  const hasPreTest = chapter && chapter.preTest && chapter.preTest.length > 0;
  const preTestStepDone = !hasPreTest || prog.pretest;
  const materialStepDone = prog.materi || false;
  const tasksAllDone = chapter && chapter.tasks.length === 0 || prog.tugas;
  const postTestStepDone = prog.posttest || false;
  const postTestUnlocked = teacherView || (materialStepDone && tasksAllDone);
  const optionalUnlocked = teacherView || postTestStepDone;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Siswa';

  // ── Student handlers ──
  const handlePreTestComplete = async (score: number, answers: Record<string, number>) => {
    if (user) {
      setPretestResult({ score, answers });
      await markChapterStep(user.uid, chapterId, 'pretest');
      await saveScore(user.uid, chapterId, 'pretest', score);
      await refreshProgress(user.uid);
    }
  };

  const handleMaterialDone = async () => {
    if (!user) return;
    await markChapterStep(user.uid, chapterId, 'materi');
    await refreshProgress(user.uid);
  };

  const handleTugasComplete = (taskIdx: number) => async (score: number, answers: Record<string, number>) => {
    if (!user || !chapter) return;
    const submitted = await submitTaskAnswer(chapterId, taskIdx, user.uid, displayName, answers, score);
    if (!submitted) return; // submission failed — don't mark as completed
    // Mark this task as completed locally so multi-task chapters don't block
    const nextCompleted = { ...completedTasks, [taskIdx]: true };
    setCompletedTasks(nextCompleted);
    // Check remaining tasks using stale chapter data + local completedTasks
    const hasOtherPending = chapter.tasks.some((task, i) => {
      if (i === taskIdx || nextCompleted[i]) return false;
      return !(task.answer || []).some(a => a.userId === user.uid);
    });
    if (!hasOtherPending) {
      await markChapterStep(user.uid, chapterId, 'tugas');
    }
    await refreshProgress(user.uid);
  };

  const handlePostTestComplete = async (score: number, answers: Record<string, number>) => {
    if (user) {
      setPosttestResult({ score, answers });
      await markChapterStep(user.uid, chapterId, 'posttest');
      await saveScore(user.uid, chapterId, 'posttest', score);
      await refreshProgress(user.uid);
    }
  };

  // ── Teacher: Material editors ──
  const addMaterial = () => {
    setEditMaterials(prev => [...prev, {
      id: freshId(), chapterId, sectionOrder: prev.length, type: 'text', content: '', caption: null, _tmp: true,
    } as ChapterMaterial & { _tmp?: boolean }]);
  };

  const updateMaterial = (idx: number, patch: Partial<ChapterMaterial>) => {
    setEditMaterials(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  };

  const removeMaterial = (idx: number) => {
    setEditMaterials(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Teacher: Question editors (pretest/posttest) ──
  const addQuestion = (setter: React.Dispatch<React.SetStateAction<(MCQ & { _tmp?: boolean })[]>>) => {
    setter(prev => [...prev, {
      id: freshId(), question: '', options: ['', '', '', ''], correctIndex: 0, _tmp: true,
    }]);
  };

  const updateQuestion = (
    setter: React.Dispatch<React.SetStateAction<(MCQ & { _tmp?: boolean })[]>>,
    idx: number, patch: Partial<MCQ>,
  ) => {
    setter(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const removeQuestion = (
    setter: React.Dispatch<React.SetStateAction<(MCQ & { _tmp?: boolean })[]>>,
    idx: number,
  ) => {
    setter(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Teacher: Task editors ──
  const addTask = () => {
    setEditTasks(prev => [...prev, {
      id: freshId(), title: '', description: '', dueDate: null, type: 'mcq', questions: [], answer: [],
    }]);
  };

  const updateTask = (idx: number, patch: Partial<ChapterTask>) => {
    setEditTasks(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } as ChapterTask : t));
  };

  const removeTask = (idx: number) => {
    setEditTasks(prev => prev.filter((_, i) => i !== idx));
  };

  const addTaskQuestion = (taskIdx: number) => {
    setEditTasks(prev => prev.map((t, i) => i === taskIdx ? {
      ...t, questions: [...t.questions, { id: freshId(), question: '', options: ['', '', '', ''], correctIndex: 0 }],
    } as ChapterTask : t));
  };

  const updateTaskQuestion = (taskIdx: number, qIdx: number, patch: Partial<MCQ>) => {
    setEditTasks(prev => prev.map((t, i) => i === taskIdx ? {
      ...t, questions: t.questions.map((q, j) => j === qIdx ? { ...q, ...patch } : q),
    } as ChapterTask : t));
  };

  const removeTaskQuestion = (taskIdx: number, qIdx: number) => {
    setEditTasks(prev => prev.map((t, i) => i === taskIdx ? {
      ...t, questions: t.questions.filter((_, j) => j !== qIdx),
    } as ChapterTask : t));
  };

  // ── Save batch ──
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMsg(null);

    const result = await saveChapterBatch(chapterId, {
      metadata: {
        title: editTitle,
        subtitle: editSubtitle,
        description: editDescription,
        cover_emoji: editCoverEmoji,
        cover_color: editCoverColor,
      },
      pengayaan: { instruction: editPengayaanText, enabled: editPengayaanEnabled },
      materials: editMaterials.map((m, i) => ({
        id: m.id,
        section_order: m.sectionOrder ?? i,
        type: m.type,
        content: m.content,
        caption: m.caption,
      })),
      tasks: editTasks.map((t, i) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        due_date: t.dueDate,
        task_order: i,
        submission_type: t.type,
        questions: t.questions.map((q, qi) => ({
          id: q.id,
          question_order: qi,
          question: q.question,
          options: q.options,
          correct_index: q.correctIndex,
        })),
      })),
      pretest: editPretestEnabled ? editPretestQuestions.map((q, i) => ({
        id: q.id,
        question_order: i,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
      })) : [],
      posttest: editPosttestEnabled ? editPosttestQuestions.map((q, i) => ({
        id: q.id,
        question_order: i,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
      })) : [],
    });

    setSaving(false);
    if (result.ok) {
      setSaveMsg('✅ Bab berhasil disimpan');
      setTimeout(() => { setSaveMsg(null); router.push('/materi'); }, 1500);
    } else {
      setSaveMsg(result.message || 'Gagal menyimpan perubahan.');
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  // ── Delete chapter ──
  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const result = await deleteChapter(chapterId);
      if (result.ok) {
        router.push('/materi');
      } else {
        setSaveMsg(result.message || 'Gagal menghapus bab.');
        setDeleting(false);
        setConfirmDelete(false);
      }
    } catch {
      setSaveMsg('Terjadi kesalahan koneksi saat menghapus.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // ═══════════════════════════════════════════
  // GLOBAL LOADING — spinner sampai semua siap
  // ═══════════════════════════════════════════
  if (!pageReady) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
          <p className="text-xs text-[#5C7A6E]">Memuat data...</p>
        </div>
      </div>
    );
  }

  // ── Page-ready fallback states ──
  if (!chapter) {
    if (chapters.length === 0) {
      return (
        <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
          <span className="text-6xl">📭</span>
          <h1 className="text-xl font-bold">Belum Ada Materi</h1>
          <p className="text-sm text-[#5C7A6E]">Database masih kosong.</p>
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

  // ═══════════════════════════════════════════
  // TEACHER EDIT MODE (batch-save)
  // ═══════════════════════════════════════════
  if (teacherMode) {
    return (
      <>
      <div className="max-w-2xl mx-auto space-y-5 pb-8">
        <div className="flex items-center justify-between">
          <Link href="/materi" className="inline-flex items-center gap-1.5 text-sm text-[#5C7A6E] hover:text-[#1F3D30]">
            ← Kembali ke Materi
          </Link>
        </div>

        {/* ── Chapter Metadata ── */}
        <div className={`rounded-2xl bg-gradient-to-br ${editCoverColor || 'from-green-100 to-emerald-200'} p-5`}>
          <p className="text-xs font-bold uppercase tracking-wide text-[#1F3D30]/60">Bab {cIdx + 1} — Edit Mode</p>
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
              <label className="text-[10px] font-semibold uppercase text-[#1F3D30]/50">Warna Cover</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  ['from-green-100 to-emerald-200', '🟢'],
                  ['from-emerald-100 to-teal-200', '💚'],
                  ['from-orange-100 to-amber-200', '🟠'],
                  ['from-violet-100 to-purple-200', '🟣'],
                  ['from-rose-100 to-pink-200', '🌸'],
                  ['from-sky-100 to-blue-200', '🔵'],
                  ['from-amber-100 to-yellow-200', '💛'],
                  ['from-gray-100 to-slate-200', '⚪'],
                ].map(([color, emoji]) => (
                  <button key={color} onClick={() => setEditCoverColor(color)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs border-2 transition-all ${
                      editCoverColor === color ? 'border-[#1F3D30] scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: `linear-gradient(to bottom right, ${color.replace('from-', '').replace(' to-', ', ').replace(/-/g, ' ').replace(/\d+/g, '').trim()})` }}>
                    <span className="drop-shadow-sm">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pre-Test Editor ── */}
        <TeacherQuestionEditor
          title="📝 Pre-Test"
          disabledMessage="Pre-test dinonaktifkan. Siswa akan langsung masuk ke materi."
          enabled={editPretestEnabled}
          onToggle={() => setEditPretestEnabled(!editPretestEnabled)}
          questions={editPretestQuestions}
          onAdd={() => addQuestion(setEditPretestQuestions)}
          onUpdate={(i, p) => updateQuestion(setEditPretestQuestions, i, p)}
          onRemove={i => removeQuestion(setEditPretestQuestions, i)}
        />

        {/* ── Materials Section Editor ── */}
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#1F3D30]">📚 Materi (Section)</h3>
            <button onClick={addMaterial}
              className="px-3 py-1.5 text-xs font-semibold bg-[#1F3D30] text-white rounded-lg hover:bg-[#2A5A44]">+ Tambah Section</button>
          </div>
          <div className="space-y-3">
            {editMaterials.map((mat, i) => (
              <div key={mat.id} className="border border-[#1F3D30]/10 rounded-xl p-3 bg-[#FBF8F4]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-[#5C7A6E]">Section {i + 1}</span>
                  <button onClick={() => removeMaterial(i)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold">🗑️ Hapus</button>
                </div>
                <div className="flex gap-2 mb-2">
                  {['text', 'image', 'video', 'embed', 'file'].map(t => (
                    <button key={t} onClick={() => updateMaterial(i, { type: t as ChapterMaterial['type'] })}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${
                        mat.type === t ? 'bg-[#1F3D30] text-white border-[#1F3D30]' : 'bg-white text-[#5C7A6E] border-[#d4dcd0]'
                      }`}>{t}</button>
                  ))}
                </div>
                {mat.type === 'text' ? (
                  <textarea value={mat.content} onChange={e => updateMaterial(i, { content: e.target.value })}
                    rows={3} className="w-full px-3 py-2 text-sm border border-[#d4dcd0] rounded-lg resize-none"
                    placeholder="Markdown content..." />
                ) : (
                  <div className="space-y-2">
                    <input value={mat.content} onChange={e => updateMaterial(i, { content: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-[#d4dcd0] rounded-lg" placeholder="URL..." />
                    <FileUpload
                      maxSize={200 * 1024 * 1024}
                      uploadType="teacher"
                      onUploadSuccess={(result) => {
                        updateMaterial(i, {
                          content: result.fileUrl,
                          fileUrl: result.fileUrl,
                          fileName: result.fileName,
                          fileSize: result.fileSize,
                        });
                      }}
                    />
                    {mat.fileUrl && (
                      <p className="text-[10px] text-emerald-700">File: {mat.fileName ?? mat.fileUrl}</p>
                    )}
                  </div>
                )}
                {mat.type !== 'text' && (
                  <input value={mat.caption ?? ''} onChange={e => updateMaterial(i, { caption: e.target.value || null })}
                    className="w-full px-3 py-2 text-sm border border-[#d4dcd0] rounded-lg mt-2" placeholder="Caption (optional)" />
                )}
              </div>
            ))}
            {editMaterials.length === 0 && (
              <p className="text-xs text-[#8A9E95] text-center py-4">Belum ada materi. Klik &quot;+ Tambah Section&quot; untuk mulai.</p>
            )}
          </div>
        </div>

        {/* ── Tugas Editor ── */}
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#1F3D30]">📋 Tugas (Soal Esai/MCQ)</h3>
            <button onClick={addTask}
              className="px-3 py-1.5 text-xs font-semibold bg-[#1F3D30] text-white rounded-lg hover:bg-[#2A5A44]">+ Tambah Tugas</button>
          </div>
          <div className="space-y-4">
            {editTasks.map((task, ti) => (
              <div key={task.id} className="border border-[#1F3D30]/10 rounded-xl p-3 bg-[#FBF8F4]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-[#5C7A6E]">Tugas {ti + 1}</span>
                  <button onClick={() => removeTask(ti)}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold">🗑️ Hapus Tugas</button>
                </div>
                <div className="space-y-2">
                  <input value={task.title} onChange={e => updateTask(ti, { title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#d4dcd0] rounded-lg" placeholder="Judul tugas" />
                  <textarea value={task.description} onChange={e => updateTask(ti, { description: e.target.value })}
                    rows={2} className="w-full px-3 py-2 text-sm border border-[#d4dcd0] rounded-lg resize-none" placeholder="Deskripsi tugas" />
                  <input type="date" value={task.dueDate ?? ''} onChange={e => updateTask(ti, { dueDate: e.target.value || null })}
                    className="w-full px-3 py-2 text-sm border border-[#d4dcd0] rounded-lg" />
                </div>
                <div className="flex gap-2 mb-2">
                  {['mcq', 'text', 'file'].map(t => (
                    <button key={t} onClick={() => updateTask(ti, { type: t as ChapterTask['type'] })}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${
                        task.type === t ? 'bg-[#1F3D30] text-white border-[#1F3D30]' : 'bg-white text-[#5C7A6E] border-[#d4dcd0]'
                      }`}>
                      {t === 'mcq' ? '✅ MCQ' : t === 'text' ? '📝 Isian' : '📎 Upload File'}
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  {task.type === 'mcq' ? (
                    <>
                      <span className="text-[10px] font-bold uppercase text-[#5C7A6E] block">Soal Tugas ({task.questions.length})</span>
                      {task.questions.map((q, qi) => (
                        <TeacherQuestionItem key={q.id} idx={qi}
                          question={q}
                          onChange={(patch) => updateTaskQuestion(ti, qi, patch)}
                          onRemove={() => removeTaskQuestion(ti, qi)}
                        />
                      ))}
                      <button onClick={() => addTaskQuestion(ti)}
                        className="text-xs text-[#1F3D30] font-semibold hover:underline">+ Tambah Soal</button>
                    </>
                  ) : task.type === 'text' ? (
                    <p className="text-xs text-[#5C7A6E]">📝 Siswa akan menjawab dalam bentuk teks/paragraf.</p>
                  ) : (
                    <p className="text-xs text-[#5C7A6E]">📎 Siswa akan mengupload file sebagai jawaban tugas.</p>
                  )}
                </div>
              </div>
            ))}
            {editTasks.length === 0 && (
              <p className="text-xs text-[#8A9E95] text-center py-4">Belum ada tugas.</p>
            )}
          </div>
        </div>

        {/* ── Post-Test Editor ── */}
        <TeacherQuestionEditor
          title="📝 Post-Test Wajib"
          disabledMessage="Post-test dinonaktifkan. Siswa akan menyelesaikan bab tanpa post-test."
          enabled={editPosttestEnabled}
          onToggle={() => setEditPosttestEnabled(!editPosttestEnabled)}
          questions={editPosttestQuestions}
          onAdd={() => addQuestion(setEditPosttestQuestions)}
          onUpdate={(i, p) => updateQuestion(setEditPosttestQuestions, i, p)}
          onRemove={i => removeQuestion(setEditPosttestQuestions, i)}
        />

        {/* ── Pengayaan Editor ── */}
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#1F3D30]">🌟 Tugas Pengayaan (Opsional)</h3>
            <button onClick={() => setEditPengayaanEnabled(!editPengayaanEnabled)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                editPengayaanEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
              {editPengayaanEnabled ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
          {editPengayaanEnabled && (
            <textarea value={editPengayaanText} onChange={e => setEditPengayaanText(e.target.value)}
              rows={5} className="w-full px-3 py-2 text-sm border border-[#d4dcd0] rounded-lg resize-none"
              placeholder="### Tugas Pengayaan...&#10;&#10;Tulis instruksi tugas pengayaan di sini (markdown)." />
          )}
        </div>

        {/* ── Save / Delete ── */}
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-4">
          <div className="flex items-center gap-3">
            <button onClick={handleDelete} disabled={deleting}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                confirmDelete ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}>
              {deleting ? 'Menghapus...' : confirmDelete ? 'Klik lagi untuk konfirmasi' : '🗑️ Hapus Bab Ini'}
            </button>
            <div className="flex-1" />
            <button onClick={handleSaveAll} disabled={saving}
              className="px-6 py-2.5 bg-[#1F3D30] text-white rounded-xl text-sm font-semibold hover:bg-[#2A5A44] transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
            </button>
          </div>
          {saveMsg && (
            <div className="mt-2 text-center text-xs font-medium"
              style={{ color: saveMsg.startsWith('✅') ? '#059669' : '#dc2626' }}>
              {saveMsg}
            </div>
          )}
        </div>
      </div>
    </>
  );
  }

  // ═══════════════════════════════════════════
  // STUDENT / VIEW MODE
  // ═══════════════════════════════════════════
  return (
    <>
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
      <div className={`rounded-2xl bg-gradient-to-br ${chapter.coverColor} p-5`}>
        <p className="text-xs font-bold uppercase tracking-wide text-[#1F3D30]/60">Bab {cIdx + 1}</p>
        <h1 className="text-xl lg:text-2xl font-bold mt-1">{chapter.title}</h1>
        <p className="text-sm text-[#1F3D30]/70 mt-1">{chapter.subtitle}</p>
      </div>

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
        <div className="bg-white rounded-2xl border border-[#1F3D30]/5 px-5 py-3 flex items-center gap-2">
          <span className="text-xs text-[#8A9E95]">Pre-test tidak diaktifkan oleh guru. Mulai langsung dari materi.</span>
        </div>
      )}

      {/* Materi */}
      <SectionCard step={hasPreTest ? 2 : 1} title="Materi" description={teacherView ? "Preview dan edit isi bab." : "Pelajari materi bab ini dengan saksama."} done={teacherView ? true : materialStepDone} unlocked={teacherView || preTestStepDone}>
        <ChapterContent
          chapterId={chapterId}
          materials={materials}
          matProgress={matProgress}
          materialStepDone={materialStepDone}
          onMaterialDone={handleMaterialDone}
          isTeacher={teacherView}
        />
      </SectionCard>

      {/* Tugas */}
      {chapter.tasks.length > 0 && (
        <SectionCard step={hasPreTest ? 3 : 2} title="Tugas" description={teacherView ? "Preview tugas siswa untuk bab ini." : "Kerjakan tugas berikut untuk melanjutkan."} done={teacherView ? true : tasksAllDone} unlocked={teacherView || materialStepDone}>
          <div className="ml-11 space-y-4">
            {chapter.tasks.map((task, tIdx) => {
              const thisTaskDone = tasksAllDone || (completedTasks[tIdx]) || (task.answer || []).some(a => a.userId === user?.uid);
              return (
              <div key={task.id} className={`p-4 rounded-xl border ${thisTaskDone ? 'border-emerald-200 bg-emerald-50' : 'border-[#1F3D30]/5 bg-[#FBF8F4]'}`}>
                <div className="mb-3">
                  <p className="font-semibold text-sm">{task.title}</p>
                  <p className="text-xs text-[#5C7A6E] mt-0.5">{task.description}</p>
                  {task.dueDate && <p className="text-xs font-medium text-[#C8A84E] mt-1">Deadline: {new Date(task.dueDate).toLocaleDateString('id-ID')}</p>}
                </div>
                {teacherView ? (
                  <p className="text-sm text-[#5C7A6E]">
                    {task.type === 'mcq' ? `${task.questions.length} soal tugas tersedia.` :
                     task.type === 'text' ? '📝 Tugas isian teks' :
                     '📎 Tugas upload file'}
                  </p>
                ) : !thisTaskDone ? (
                  task.type === 'mcq' ? (
                    <MCQTest questions={task.questions} type="tugas" onComplete={handleTugasComplete(tIdx)} />
                  ) : task.type === 'text' ? (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        className="w-full px-3 py-2 border border-[#d4dcd0] rounded-xl text-sm resize-none"
                        placeholder="Tulis jawaban Anda di sini..."
                      />
                      <button
                        className="px-4 py-2 bg-[#1F3D30]/50 text-white rounded-xl text-sm font-semibold cursor-not-allowed">
                        Kirim Jawaban
                      </button>
                      <p className="text-[10px] text-[#8A9E95]">Tugas isian teks belum tersedia.</p>
                    </div>
                  ) : (
                    <FileUpload
                      maxSize={50 * 1024 * 1024}
                      uploadType="student"
                      label="Upload file tugas"
                      onUploadSuccess={async (result) => {
                        if (!user || !chapter) return;
                        await submitTaskAnswer(
                          chapterId, tIdx, user.uid, displayName,
                          {}, 0, null,
                          { fileUrl: result.fileUrl, fileName: result.fileName, fileSize: result.fileSize }
                        );
                        const nextCompleted = { ...completedTasks, [tIdx]: true };
                        setCompletedTasks(nextCompleted);
                        const hasOtherPending = chapter.tasks.some((task, i) => {
                          if (i === tIdx || nextCompleted[i]) return false;
                          return !(task.answer || []).some(a => a.userId === user.uid);
                        });
                        if (!hasOtherPending) {
                          await markChapterStep(user.uid, chapterId, 'tugas');
                        }
                        refreshProgress(user.uid);
                      }}
                    />
                  )
                ) : (
                  <p className="text-sm text-emerald-700 font-medium">✅ Tugas sudah dikerjakan</p>
                )}
              </div>
              );
            })}
          </div>
        </SectionCard>
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
  </>
  );
}

// ── Teacher Question Editor Sub-components ──

function TeacherQuestionEditor({ title, disabledMessage, enabled, onToggle, questions, onAdd, onUpdate, onRemove }: {
  title: string;
  disabledMessage: string;
  enabled: boolean;
  onToggle: () => void;
  questions: (MCQ & { _tmp?: boolean })[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<MCQ>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#1F3D30]/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#1F3D30]">{title}</h3>
        <div className="flex items-center gap-2">
          <button onClick={onAdd}
            className="px-3 py-1.5 text-xs font-semibold bg-[#1F3D30] text-white rounded-lg hover:bg-[#2A5A44]">+ Tambah Soal</button>
          <button onClick={onToggle}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
            {enabled ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>
      </div>
      {enabled ? (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <TeacherQuestionItem key={q.id} idx={i} question={q} onChange={p => onUpdate(i, p)} onRemove={() => onRemove(i)} />
          ))}
          {questions.length === 0 && (
            <p className="text-xs text-[#8A9E95] text-center py-2">Belum ada soal. Klik &quot;+ Tambah Soal&quot; untuk mulai.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#8A9E95]">{disabledMessage}</p>
      )}
    </div>
  );
}

function TeacherQuestionItem({ idx, question, onChange, onRemove }: {
  idx: number;
  question: MCQ;
  onChange: (patch: Partial<MCQ>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-[#1F3D30]/10 rounded-xl p-3 bg-[#FBF8F4]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase text-[#5C7A6E]">Soal {idx + 1}</span>
        <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 font-semibold">🗑️ Hapus</button>
      </div>
      <input value={question.question} onChange={e => onChange({ question: e.target.value })}
        className="w-full px-3 py-2 text-sm border border-[#d4dcd0] rounded-lg mb-2" placeholder="Teks pertanyaan..." />
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((opt, oi) => (
          <div key={oi} className="flex items-center gap-1.5">
            <input type="radio" checked={question.correctIndex === oi}
              onChange={() => onChange({ correctIndex: oi })}
              className="accent-[#1F3D30]" />
            <input value={opt} onChange={e => {
              const newOpts = [...question.options];
              newOpts[oi] = e.target.value;
              onChange({ options: newOpts });
            }} className="flex-1 px-2 py-1.5 text-sm border border-[#d4dcd0] rounded-lg" placeholder={`Opsi ${String.fromCharCode(65 + oi)}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pengayaan Sub-component ──
function PengayaanSection({ step, chapterId, postTestOptional, unlocked, user, displayName, teacherView }: {
  step: number;
  chapterId: string;
  postTestOptional: NonNullable<Chapter['postTestOptional']>;
  unlocked: boolean;
  user: LmsUser | null;
  displayName: string;
  teacherView: boolean;
}) {
  const myAnswer = user ? postTestOptional.answer?.find((a: PengayaanAnswer) => a.userId === user.uid) : null;
  const [submittedLocally, setSubmittedLocally] = useState(false);
  const submitted = !!myAnswer || submittedLocally;
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !link || submitting) return;
    setSubmitting(true);
    await submitPengayaanLink(chapterId, user.uid, displayName, link);
    setSubmittedLocally(true);
    setLink('');
    setSubmitting(false);
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
          <div className="space-y-2">
            <div className="flex gap-2">
              <input type="url" placeholder="Link Google Drive / YouTube" value={link}
                onChange={e => setLink(e.target.value)}
                className="flex-1 px-3 py-2 border border-[#d4dcd0] rounded-xl text-sm" />
              <button onClick={handleSubmit} disabled={!link || submitting}
                className="px-4 py-2 bg-[#C8A84E] text-white rounded-xl text-sm font-semibold disabled:opacity-50">{submitting ? '⏳...' : 'Submit'}</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8A9E95] uppercase font-semibold">Atau</span>
              <div className="flex-1 h-px bg-[#d4dcd0]" />
            </div>
            <FileUpload
              maxSize={50 * 1024 * 1024}
              uploadType="student"
              label="Upload file pengayaan"
              onUploadSuccess={async (result) => {
                if (!user) return;
                await submitPengayaanLink(
                  chapterId, user.uid, displayName, '',
                  { fileUrl: result.fileUrl, fileName: result.fileName, fileSize: result.fileSize }
                );
                setSubmittedLocally(true);
              }}
            />
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
