'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Chapter, ChapterMaterial, ChapterProgressDetail, AdminUserRow, ClassChapterProgress, ClassEntry, ClassProgressResult, CreateUserInput, MaterialProgressMap, QuestionView, ScoreRecord, StudentProgressMap, StudentSubmissionView, TaskInboxItem, TeacherTaskItem } from '@/lib/types';
import { CHAPTERS } from './mock-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const DEFAULT_PROGRESS: ChapterProgressDetail = {
  pretest: false,
  materi: false,
  tugas: false,
  posttest: false,
  complete: false,
};

type QuestionRow = {
  id: string;
  chapter_id: string;
  task_id: string | null;
  assessment: 'pretest' | 'posttest' | 'tugas' | 'pengayaan';
  question_order: number;
  question: string;
  options: unknown;
  correct_index: number;
};

type TaskSubmissionRow = {
  task_id: string;
  user_id: string;
  user_name: string | null;
  answers: unknown;
  score: number | null;
  submitted_at: string;
};

type PengayaanSubmissionRow = {
  chapter_id: string;
  user_id: string;
  user_name: string | null;
  link: string;
  submitted_at: string;
};

// Raw PostgREST response types (snake_case — API contract)
type RawChapter = {
  id: string;
  order_index: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  material_content: string | null;
  material_video_url: string | null;
  cover_emoji: string | null;
  cover_color: string | null;
  [key: string]: unknown;
};

type RawChapterTask = {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  task_order: number;
  [key: string]: unknown;
};

type RawPrompt = {
  chapter_id: string;
  instruction: string;
  [key: string]: unknown;
};

/** Fetch from Supabase REST API with anon key only — no Bearer token.
 *  This avoids 401 errors when the auth token is expired but still
 *  attached by supabase-js. Safe for tables with anon-accessible RLS. */
async function anonFetch<T>(path: string): Promise<{ data: T[] | null; error: { message: string; status: number } | null }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      return { data: null, error: { message: `HTTP ${res.status}: ${res.statusText}`, status: res.status } };
    }
    return { data: await res.json(), error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e), status: 0 } };
  }
}

function toMCQ(row: QuestionRow) {
  return {
    id: row.id,
    question: row.question,
    options: Array.isArray(row.options) ? row.options as string[] : [],
    correctIndex: row.correct_index,
  };
}

function normalizeUser(user: User | null) {
  if (!user) return null;
  return {
    id: user.id,
    uid: user.id,
    email: user.email ?? null,
    displayName:
      typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name :
      typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name :
      user.email?.split('@')[0] ?? null,
  };
}

async function currentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export function useChapters(refreshKey: number | string = 0, classId?: string | null) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // Student with no class assignment — empty state
      if (classId === null) {
        if (!cancelled) { setChapters([]); setLoading(false); }
        return;
      }

      // Phase 1: anon-accessible tables via raw fetch (no Bearer token).
      // Using raw fetch avoids 401 when supabase-js attaches an expired Bearer.
      const chaptersPath = classId
        ? `chapters?select=*&class_id=eq.${classId}&order=order_index.asc`
        : 'chapters?select=*&order=order_index.asc';
      const [chaptersRes, tasksRes, questionsRes, promptsRes] = await Promise.all([
        anonFetch<RawChapter>(chaptersPath),
        anonFetch<RawChapterTask>('chapter_tasks?select=*&order=task_order.asc'),
        anonFetch<QuestionRow>('mcq_questions?select=*&order=question_order.asc'),
        anonFetch<RawPrompt>('pengayaan_prompts?select=*'),
      ]);

      // Critical tables must succeed — without them the app is unusable
      if (chaptersRes.error) {
        console.error('useChapters: chapters fetch failed', chaptersRes.error);
        if (!cancelled) setLoading(false);
        return;
      }
      if (tasksRes.error) {
        console.error('useChapters: chapter_tasks fetch failed', tasksRes.error);
        if (!cancelled) setLoading(false);
        return;
      }
      if (questionsRes.error) {
        console.error('useChapters: mcq_questions fetch failed', questionsRes.error);
        if (!cancelled) setLoading(false);
        return;
      }
      if (promptsRes.error) {
        console.error('useChapters: pengayaan_prompts fetch failed', promptsRes.error);
        if (!cancelled) setLoading(false);
        return;
      }

      // Phase 2: auth-dependent tables — fetched via supabase-js (supports auth).
      // If these fail (401/403), chapters still load without submission data.
      const [taskSubsRes, pengayaanSubsRes] = await Promise.all([
        supabase.from('task_submissions').select('*'),
        supabase.from('pengayaan_submissions').select('*'),
      ]);

      const questions = (questionsRes.data ?? []) as QuestionRow[];
      let taskSubs: TaskSubmissionRow[] = [];
      let pengayaanSubs: PengayaanSubmissionRow[] = [];

      if (taskSubsRes.error) {
        console.warn('useChapters: task_submissions non-critical error:', taskSubsRes.error.message);
      } else {
        taskSubs = (taskSubsRes.data ?? []) as TaskSubmissionRow[];
      }

      if (pengayaanSubsRes.error) {
        console.warn('useChapters: pengayaan_submissions non-critical error:', pengayaanSubsRes.error.message);
      } else {
        pengayaanSubs = (pengayaanSubsRes.data ?? []) as PengayaanSubmissionRow[];
      }

      const list: Chapter[] = (chaptersRes.data ?? [])
        .map((chapter) => {
          const chapterTasks = (tasksRes.data ?? [])
            .filter((task) => task.chapter_id === chapter.id)
            .map((task) => ({
              id: task.id,
              title: task.title,
              description: task.description ?? '',
              dueDate: task.due_date,
              type: 'mcq' as const,
              questions: questions
                .filter((q) => q.task_id === task.id && q.assessment === 'tugas')
                .sort((a, b) => a.question_order - b.question_order)
                .map(toMCQ),
              answer: taskSubs
                .filter((submission) => submission.task_id === task.id)
                .map((submission) => ({
                  userId: submission.user_id,
                  userName: submission.user_name ?? '',
                  answers: typeof submission.answers === 'object' && submission.answers !== null ? submission.answers as Record<string, number> : {},
                  score: submission.score ?? 0,
                  submittedAt: submission.submitted_at,
                })),
            }));

          const prompt = (promptsRes.data ?? []).find((p) => p.chapter_id === chapter.id);

          return {
            id: chapter.id,
            orderIndex: chapter.order_index,
            title: chapter.title,
            subtitle: chapter.subtitle ?? '',
            description: chapter.description ?? '',
            materials: [], // loaded separately via useChapterMaterials
            materialVideoUrl: chapter.material_video_url,
            coverEmoji: chapter.cover_emoji ?? '📖',
            coverColor: chapter.cover_color ?? 'from-green-100 to-emerald-200',
            preTest: questions
              .filter((q) => q.chapter_id === chapter.id && q.assessment === 'pretest')
              .sort((a, b) => a.question_order - b.question_order)
              .map(toMCQ),
            tasks: chapterTasks,
            postTestMandatory: questions
              .filter((q) => q.chapter_id === chapter.id && q.assessment === 'posttest')
              .sort((a, b) => a.question_order - b.question_order)
              .map(toMCQ),
            postTestOptional: prompt ? {
              instruction: prompt.instruction,
              answer: pengayaanSubs
                .filter((submission) => submission.chapter_id === chapter.id)
                .map((submission) => ({
                  userId: submission.user_id,
                  userName: submission.user_name ?? '',
                  link: submission.link,
                  submittedAt: submission.submitted_at,
                })),
            } : null,
          };
        });

      if (!cancelled) {
        setChapters(list);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey, classId]);

  return { chapters, loading };
}

/** Call verify_user_password RPC. Returns user_id + email on match, null on failure. */
export async function verifyUsernamePassword(
  username: string,
  password: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const { data, error } = await supabase.rpc('verify_user_password', {
      username_input: username,
      password_input: password,
    });
    if (error) {
      console.error('verifyUsernamePassword RPC error:', error);
      return null;
    }
    // RPC returns table(user_id uuid, email text) — supabase-js returns array of rows
    const rows = data as { user_id: string; email: string }[] | null;
    if (!rows || rows.length === 0) return null;
    return { userId: rows[0].user_id, email: rows[0].email };
  } catch (err) {
    console.error('verifyUsernamePassword failed:', err);
    return null;
  }
}

export function useStudentProgress(classId?: string | null) {
  const [progress, setProgress] = useState<StudentProgressMap>({});
  const [user, setUser] = useState<ReturnType<typeof normalizeUser>>(null);

  async function load(userId: string) {
    // Get chapter IDs — filtered by class if student has one
    let query = supabase.from('chapters').select('id').order('order_index', { ascending: true });
    if (classId) query = query.eq('class_id', classId);
    const { data: chapterList } = await query;

    const allChapterIds = (chapterList ?? []).map(c => c.id);

    const { data, error } = await supabase
      .from('chapter_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('useStudentProgress supabase error:', error);
      return;
    }

    const mapped: StudentProgressMap = {};
    for (const chapterId of allChapterIds) {
      const row = data?.find((item) => item.chapter_id === chapterId);
      mapped[chapterId] = row ? {
        pretest: row.pretest === true,
        materi: row.materi === true,
        tugas: row.tugas === true,
        posttest: row.posttest === true,
        complete: row.complete === true,
      } : { ...DEFAULT_PROGRESS };
    }

    setProgress(mapped);
  }

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const normalized = normalizeUser(data.user ?? null);
      setUser(normalized);
      if (normalized) load(normalized.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const normalized = normalizeUser(session?.user ?? null);
      setUser(normalized);
      setProgress({});
      if (normalized) load(normalized.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { progress, user, refreshProgress: load };
}

type RawChapterMaterial = {
  id: string;
  chapter_id: string;
  section_order: number;
  type: string;
  content: string;
  caption: string | null;
};

type RawMaterialProgress = {
  material_id: string;
  viewed: boolean;
  viewed_at: string | null;
};

export function useChapterMaterials(chapterId: string | null, refreshKey: number | string = 0) {
  const [materials, setMaterials] = useState<ChapterMaterial[]>([]);
  const [matProgress, setMatProgress] = useState<MaterialProgressMap>({});
  const [loading, setLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!chapterId) { setLoading(false); return; }
    let cancelled = false;

    async function load(userId: string | null) {
      setLoading(true);
      const [matRes, progRes] = await Promise.all([
        supabase
          .from('chapter_materials')
          .select('*')
          .eq('chapter_id', chapterId)
          .order('section_order', { ascending: true }),
        userId
          ? supabase.from('material_progress').select('*').eq('user_id', userId)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;

      const list: ChapterMaterial[] = [];
      if (matRes.error) {
        console.error('useChapterMaterials: chapter_materials fetch failed', matRes.error);
      } else {
        for (const r of (matRes.data ?? []) as RawChapterMaterial[]) {
          list.push({
            id: r.id,
            chapterId: r.chapter_id,
            sectionOrder: r.section_order,
            type: r.type as ChapterMaterial['type'],
            content: r.content,
            caption: r.caption,
          });
        }
      }
      setMaterials(list);

      const progMap: MaterialProgressMap = {};
      if (progRes && !progRes.error && progRes.data) {
        for (const row of progRes.data as RawMaterialProgress[]) {
          progMap[row.material_id] = { viewed: row.viewed, viewedAt: row.viewed_at };
        }
      }
      setMatProgress(progMap);
      setLoading(false);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) load(data.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) load(session?.user?.id ?? null);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [chapterId, refreshKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { materials, matProgress, loading };
}

export async function markMaterialViewed(
  userId: string,
  materialId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('material_progress')
      .upsert(
        { user_id: userId, material_id: materialId, viewed: true, viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,material_id' }
      );
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('markMaterialViewed failed:', err);
    return false;
  }
}

export function useNilai() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [user, setUser] = useState<ReturnType<typeof normalizeUser>>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(userId: string) {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('useNilai supabase error:', error);
        return;
      }

      const mapped: ScoreRecord[] = (data ?? []).map((row) => ({
        id: `${row.chapter_id}-${row.type}`,
        chapterId: row.chapter_id,
        type: row.type,
        score: row.score,
        submittedAt: row.submitted_at,
      }));

      if (!cancelled) setScores(mapped);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const normalized = normalizeUser(data.user ?? null);
      setUser(normalized);
      if (normalized) load(normalized.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const normalized = normalizeUser(session?.user ?? null);
      setUser(normalized);
      setScores([]);
      if (normalized) load(normalized.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { scores, user };
}

export async function markChapterStep(
  userId: string,
  chapterId: string,
  step: 'pretest' | 'materi' | 'tugas' | 'posttest',
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chapter_progress')
      .upsert({ user_id: userId, chapter_id: chapterId, [step]: true }, { onConflict: 'user_id,chapter_id' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('markChapterStep supabase failed:', err);
    return false;
  }
}

export async function saveScore(
  userId: string,
  chapterId: string,
  type: 'pretest' | 'posttest' | 'tugas' | 'pengayaan',
  score: number,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scores')
      .upsert({ user_id: userId, chapter_id: chapterId, type, score, submitted_at: new Date().toISOString() }, { onConflict: 'user_id,chapter_id,type' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('saveScore supabase failed:', err);
    return false;
  }
}

export async function submitTaskAnswer(
  chapterId: string,
  taskIndex: number,
  userId: string,
  userName: string,
  answers: Record<string, number>,
  score: number,
): Promise<boolean> {
  try {
    const { data: tasks, error: taskError } = await supabase
      .from('chapter_tasks')
      .select('id')
      .eq('chapter_id', chapterId)
      .order('task_order');

    if (taskError) throw taskError;
    const taskId = tasks?.[taskIndex]?.id;
    if (!taskId) throw new Error(`Task index ${taskIndex} not found for ${chapterId}`);

    const { error } = await supabase
      .from('task_submissions')
      .upsert({ task_id: taskId, user_id: userId, user_name: userName, answers, score, submitted_at: new Date().toISOString() }, { onConflict: 'task_id,user_id' });

    if (error) throw error;

    // Also sync to scores table so teacher /nilai view sees it
    await saveScore(userId, chapterId, 'tugas', score);

    return true;
  } catch (err) {
    console.error('submitTaskAnswer supabase failed:', err);
    return false;
  }
}

export async function submitPengayaanLink(
  chapterId: string,
  userId: string,
  userName: string,
  link: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pengayaan_submissions')
      .upsert({ chapter_id: chapterId, user_id: userId, user_name: userName, link, submitted_at: new Date().toISOString() }, { onConflict: 'chapter_id,user_id' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('submitPengayaanLink supabase failed:', err);
    return false;
  }
}

export async function resetUserProgress(userId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const tables = ['chapter_progress', 'scores', 'task_submissions', 'pengayaan_submissions', 'material_progress'] as const;
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) throw error;
    }
    return { ok: true, message: '✅ Progress berhasil di-reset! Mulai dari awal lagi yuk.' };
  } catch (err) {
    console.error('resetUserProgress failed:', err);
    return { ok: false, message: '⚠️ Gagal reset progress. Coba refresh atau login ulang.' };
  }
}

export async function resetPrototypeData(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('reset_lms_prototype_data');
    if (error) throw error;
    return {
      ok: true,
      message: `✅ Data prototype di-reset. ${data?.chapter_count ?? 0} bab / ${data?.material_count ?? 0} materi aktif.`,
    };
  } catch (err) {
    console.error('resetPrototypeData failed:', err);
    return { ok: false, message: '⚠️ Gagal reset data prototype. Cek console atau role guru/admin.' };
  }
}

export async function seedChapters(): Promise<{ ok: boolean; message: string }> {
  try {
    // Try seeding via supabase-js — works if user has teacher/admin role
    const { error: deleteErr } = await supabase.from('chapters').delete().neq('id', '');
    if (deleteErr) throw deleteErr;

    const { error: insertErr } = await supabase.from('chapters').insert(
      CHAPTERS.map(ch => ({
        id: ch.id,
        order_index: ch.orderIndex,
        title: ch.title,
        subtitle: ch.subtitle,
        description: ch.description,
        material_content: '',
        material_video_url: ch.materialVideoUrl,
        cover_emoji: ch.coverEmoji,
        cover_color: ch.coverColor,
      }))
    );
    if (insertErr) throw insertErr;

    return { ok: true, message: '✅ Data berhasil di-reset!' };
  } catch {
    return {
      ok: false,
      message: '⚠️ Reset dari UI hanya untuk guru/admin. Jalankan: cd LMS-pasraman && env $(grep -v \'^#\' .env.local | xargs) node scripts/seed-supabase-content.cjs',
    };
  }
}

export function computeTaskInbox(
  chapters: Chapter[],
  progress: StudentProgressMap,
  userId?: string,
): TaskInboxItem[] {
  const items: TaskInboxItem[] = [];
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const prog = progress[chapter.id];
    if (!prog) continue;

    const isUnlocked = i === 0 || (progress[chapters[i - 1].id]?.complete ?? false);
    if (!isUnlocked) continue;

    const safeTasks = Array.isArray(chapter.tasks) ? chapter.tasks : [];
    for (const task of safeTasks) {
      const myAnswer = task.answer?.find(a => a.userId === userId);
      items.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        task,
        status: myAnswer ? (myAnswer.score !== null ? 'graded' : 'submitted') : 'pending',
        score: myAnswer?.score ?? null,
      });
    }

    if (chapter.postTestOptional) {
      const myAnswer = chapter.postTestOptional.answer?.find(a => a.userId === userId);
      items.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        task: {
          id: `opt-${chapter.id}`,
          title: 'Tugas Pengayaan: ' + chapter.title,
          description: chapter.postTestOptional.instruction,
          dueDate: null,
          type: 'mcq',
          questions: [],
          answer: [],
        },
        status: myAnswer ? 'submitted' : 'pending',
        score: null,
      });
    }
  }
  return items;
}

// ── Teacher Batch CRUD ────────────────────────────────────────

export async function saveChapterBatch(
  chapterId: string,
  data: {
    metadata: Record<string, string>;
    pengayaan: { instruction: string | null; enabled: boolean };
    materials: Array<{ id?: string; section_order: number; type: string; content: string; caption: string | null }>;
    tasks: Array<{
      id?: string; title: string; description: string; due_date: string | null; task_order: number;
      questions: Array<{ id?: string; question_order: number; question: string; options: string[]; correct_index: number }>;
    }>;
    pretest: Array<{ id?: string; question_order: number; question: string; options: string[]; correct_index: number }>;
    posttest: Array<{ id?: string; question_order: number; question: string; options: string[]; correct_index: number }>;
  },
): Promise<{ ok: boolean; message: string }> {
  try {
    const { data: result, error } = await supabase.rpc('save_chapter_batch', {
      p_chapter_id: chapterId,
      p_metadata: data.metadata,
      p_pengayaan: data.pengayaan,
      p_materials: data.materials,
      p_tasks: data.tasks,
      p_pretest: data.pretest,
      p_posttest: data.posttest,
    });
    if (error) throw error;
    return result as { ok: boolean; message: string };
  } catch (err) {
    console.error('saveChapterBatch failed:', err);
    return { ok: false, message: 'Gagal menyimpan perubahan.' };
  }
}

export async function deleteChapter(chapterId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { data: result, error } = await supabase.rpc('delete_chapter', {
      p_chapter_id: chapterId,
    });
    if (error) throw error;
    return result as { ok: boolean; message: string };
  } catch (err) {
    console.error('deleteChapter failed:', err);
    return { ok: false, message: 'Gagal menghapus bab.' };
  }
}

export async function deleteChapterMaterial(materialId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chapter_materials')
      .delete()
      .eq('id', materialId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteChapterMaterial failed:', err);
    return false;
  }
}

export async function createChapterMaterial(
  chapterId: string,
  data: { type: ChapterMaterial['type']; content: string; caption?: string | null },
): Promise<boolean> {
  try {
    const { data: last, error: lastErr } = await supabase
      .from('chapter_materials')
      .select('section_order')
      .eq('chapter_id', chapterId)
      .order('section_order', { ascending: false })
      .limit(1);
    if (lastErr) throw lastErr;

    const nextOrder = last && last.length > 0 ? ((last[0].section_order ?? 0) + 1) : 0;

    const { error } = await supabase
      .from('chapter_materials')
      .insert({
        chapter_id: chapterId,
        section_order: nextOrder,
        type: data.type,
        content: data.content,
        caption: data.caption ?? null,
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('createChapterMaterial failed:', err);
    return false;
  }
}

export async function updateChapterMaterial(
  materialId: string,
  data: { type?: ChapterMaterial['type']; content?: string; caption?: string | null },
): Promise<boolean> {
  try {
    const update: Record<string, unknown> = {};
    if (data.type !== undefined) update.type = data.type;
    if (data.content !== undefined) update.content = data.content;
    if (data.caption !== undefined) update.caption = data.caption;
    if (Object.keys(update).length === 0) return true;

    const { error } = await supabase
      .from('chapter_materials')
      .update(update)
      .eq('id', materialId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('updateChapterMaterial failed:', err);
    return false;
  }
}

export async function createEmptyChapter(classId?: string): Promise<{ ok: boolean; id?: string; message: string }> {
  try {
    // Generate proper UUID
    const babId = crypto.randomUUID();

    const insertData: Record<string, unknown> = {
      id: babId,
      order_index: 1,
      title: 'Bab Baru',
      subtitle: 'Deskripsi singkat bab ini',
      description: 'Tulis deskripsi lengkap bab di sini.',
      material_content: '',
      material_video_url: null,
      cover_emoji: '📖',
      cover_color: 'from-green-100 to-emerald-200',
    };

    if (classId) {
      insertData.class_id = classId;
      // Find next order_index for this class
      const { data: existing } = await supabase
        .from('chapters')
        .select('order_index')
        .eq('class_id', classId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        insertData.order_index = (existing[0].order_index ?? 0) + 1;
      }
    }

    const { error: insertErr } = await supabase
      .from('chapters')
      .insert(insertData);

    if (insertErr) throw insertErr;

    return { ok: true, id: babId, message: '✅ Bab baru berhasil dibuat!' };
  } catch (err) {
    console.error('createEmptyChapter failed:', err);
    return { ok: false, message: '⚠️ Gagal membuat bab baru.' };
  }
}

export async function updateChapterMetadata(
  chapterId: string,
  data: { title?: string; subtitle?: string; description?: string; coverEmoji?: string; coverColor?: string },
): Promise<boolean> {
  try {
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.subtitle !== undefined) update.subtitle = data.subtitle;
    if (data.description !== undefined) update.description = data.description;
    if (data.coverEmoji !== undefined) update.cover_emoji = data.coverEmoji;
    if (data.coverColor !== undefined) update.cover_color = data.coverColor;

    if (Object.keys(update).length === 0) return true;

    const { error } = await supabase
      .from('chapters')
      .update(update)
      .eq('id', chapterId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('updateChapterMetadata failed:', err);
    return false;
  }
}

// ── Class System Hooks ─────────────────────────────────────────

export function useTeacherClasses() {
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const myId = userData.user?.id;
      if (!myId) {
        if (!cancelled) { setClasses([]); setLoading(false); }
        return;
      }

      // Get classes via teacher_class_assignments
      const { data: assignments, error } = await supabase
        .from('teacher_class_assignments')
        .select('classes(*)')
        .eq('teacher_id', myId);

      if (error) {
        console.error('useTeacherClasses failed:', error);
        if (!cancelled) setLoading(false);
        return;
      }

      const mapped: ClassEntry[] = (assignments ?? [])
        .map(a => {
          const c = Array.isArray(a.classes) ? a.classes[0] : a.classes;
          return {
            id: c?.id ?? '',
            name: c?.name ?? '',
            description: c?.description ?? '',
            teacherId: c?.teacher_id ?? '',
            semester: c?.semester ?? '',
            createdAt: c?.created_at ?? '',
            updatedAt: c?.updated_at ?? '',
          };
        });

      if (!cancelled) {
        setClasses(mapped);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return { classes, loading, refreshClasses: () => setRefreshKey(k => k + 1) };
}

export function useStudentsByClass(classId: string | null, refreshKey: number = 0) {
  const [students, setStudents] = useState<Array<{ id: string; username: string; displayName: string | null }>>([]);
  const [loading, setLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, display_name')
        .eq('class_id', classId)
        .eq('role', 'student')
        .order('username', { ascending: true });

      if (error) {
        console.error('useStudentsByClass failed:', error);
        if (!cancelled) setLoading(false);
        return;
      }

      const mapped = (data ?? []).map(r => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
      }));

      if (!cancelled) {
        setStudents(mapped);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [classId, refreshKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { students, loading };
}

export function useClassProgress(classId: string | null) {
  const [result, setResult] = useState<ClassProgressResult | null>(null);
  const [loading, setLoading] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!classId) { setResult(null); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);

      // 1. Get students in this class
      const { data: students } = await supabase
        .from('app_users')
        .select('id')
        .eq('class_id', classId)
        .eq('role', 'student');

      if (!students || students.length === 0) {
        if (!cancelled) {
          setResult({ totalStudents: 0, chapters: [], overallPct: 0, completedChapters: 0, totalChapters: 0 });
          setLoading(false);
        }
        return;
      }

      const studentIds = students.map(s => s.id);

      // 2. Get chapters for this class
      const { data: chapters, error: chErr } = await supabase
        .from('chapters')
        .select('id, title, subtitle, cover_emoji, cover_color, order_index')
        .eq('class_id', classId)
        .order('order_index', { ascending: true });

      if (chErr || !chapters) {
        console.error('useClassProgress: chapters fetch failed', chErr);
        if (!cancelled) setLoading(false);
        return;
      }

      // 3. Get chapter_progress for these students
      const { data: progress, error: prErr } = await supabase
        .from('chapter_progress')
        .select('chapter_id, pretest, materi, tugas, posttest, complete')
        .in('user_id', studentIds);

      if (prErr) {
        console.error('useClassProgress: progress fetch failed', prErr);
        if (!cancelled) setLoading(false);
        return;
      }

      // 4. Aggregate per chapter
      const totalStudents = studentIds.length;
      const chapterStats: ClassChapterProgress[] = chapters.map(ch => {
        const rows = (progress ?? []).filter(p => p.chapter_id === ch.id);
        return {
          id: ch.id,
          orderIndex: ch.order_index,
          title: ch.title,
          subtitle: ch.subtitle || '',
          emoji: ch.cover_emoji || '📖',
          color: ch.cover_color || '#1F3D30',
          preTestCount: rows.filter(p => p.pretest === true).length,
          materiCount: rows.filter(p => p.materi === true).length,
          tugasCount: rows.filter(p => p.tugas === true).length,
          postTestCount: rows.filter(p => p.posttest === true).length,
          completeCount: rows.filter(p => p.complete === true).length,
        };
      });

      // Chapter is "completed" when ALL students finished it
      const completedChapters = chapterStats.filter(c => c.completeCount === totalStudents).length;
      const totalPossible = totalStudents * 5 * chapters.length;
      const actualDone = chapterStats.reduce((sum, ch) =>
        sum + ch.preTestCount + ch.materiCount + ch.tugasCount + ch.postTestCount + ch.completeCount, 0);

      if (!cancelled) {
        setResult({
          totalStudents,
          chapters: chapterStats,
          overallPct: totalPossible > 0 ? Math.round((actualDone / totalPossible) * 100) : 0,
          completedChapters,
          totalChapters: chapters.length,
        });
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [classId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { progress: result, loading };
}

export async function createClass(
  name: string,
  description: string,
  semester: string,
  teacherId: string,
): Promise<{ ok: boolean; id?: string; message: string }> {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert({ name, description, semester, teacher_id: teacherId })
      .select('id')
      .single();

    if (error) throw error;
    return { ok: true, id: data.id, message: '✅ Kelas berhasil dibuat!' };
  } catch (err) {
    console.error('createClass failed:', err);
    return { ok: false, message: '⚠️ Gagal membuat kelas.' };
  }
}

export async function updateClass(
  classId: string,
  data: { name?: string; description?: string; semester?: string },
): Promise<{ ok: boolean; message: string }> {
  try {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.semester !== undefined) update.semester = data.semester;

    if (Object.keys(update).length === 0) return { ok: true, message: 'Tidak ada perubahan.' };

    const { error } = await supabase
      .from('classes')
      .update(update)
      .eq('id', classId);

    if (error) throw error;
    return { ok: true, message: '✅ Kelas berhasil diperbarui!' };
  } catch (err) {
    console.error('updateClass failed:', err);
    return { ok: false, message: '⚠️ Gagal memperbarui kelas.' };
  }
}

export async function deleteClass(classId: string): Promise<{ ok: boolean; message: string }> {
  try {
    // Unassign all students first
    const { error: unassignErr } = await supabase
      .from('app_users')
      .update({ class_id: null })
      .eq('class_id', classId);
    if (unassignErr) throw unassignErr;

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) throw error;
    return { ok: true, message: '✅ Kelas berhasil dihapus.' };
  } catch (err) {
    console.error('deleteClass failed:', err);
    return { ok: false, message: '⚠️ Gagal menghapus kelas.' };
  }
}

export async function addStudentToClass(
  userId: string,
  classId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('app_users')
      .update({ class_id: classId })
      .eq('id', userId)
      .eq('role', 'student');

    if (error) throw error;
    return { ok: true, message: '✅ Siswa berhasil ditambahkan ke kelas.' };
  } catch (err) {
    console.error('addStudentToClass failed:', err);
    return { ok: false, message: '⚠️ Gagal menambahkan siswa ke kelas.' };
  }
}

export async function removeStudentFromClass(
  userId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('app_users')
      .update({ class_id: null })
      .eq('id', userId);

    if (error) throw error;
    return { ok: true, message: '✅ Siswa berhasil dikeluarkan dari kelas.' };
  } catch (err) {
    console.error('removeStudentFromClass failed:', err);
    return { ok: false, message: '⚠️ Gagal mengeluarkan siswa dari kelas.' };
  }
}

export async function fetchUnassignedStudents(): Promise<Array<{ id: string; username: string; displayName: string | null }>> {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, display_name')
      .is('class_id', null)
      .eq('role', 'student')
      .order('username', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(r => ({ id: r.id, username: r.username, displayName: r.display_name }));
  } catch (err) {
    console.error('fetchUnassignedStudents failed:', err);
    return [];
  }
}

// ── Teacher Tugas Hooks ──────────────────────────────────────

export function useTeacherTasks(classId: string | null) {
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!classId) { setTasks([]); setLoading(false); setError(null); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // 1. Chapters for this class
      const { data: chapters, error: chErr } = await supabase
        .from('chapters')
        .select('id, title, cover_emoji')
        .eq('class_id', classId)
        .order('order_index');

      if (chErr) {
        console.error('useTeacherTasks: chapters fetch failed', chErr);
        if (!cancelled) { setError('Gagal memuat data bab. Silakan coba lagi.'); setTasks([]); setLoading(false); }
        return;
      }

      if (!chapters?.length) {
        if (!cancelled) { setTasks([]); setLoading(false); }
        return;
      }

      const chapterIds = chapters.map(c => c.id);

      // 2. Students count
      const { count: totalStudents } = await supabase
        .from('app_users')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('role', 'student');

      const studentCount = totalStudents ?? 0;

      // 3. chapter_tasks for those chapters
      const { data: chapterTasks } = await supabase
        .from('chapter_tasks')
        .select('id, title, description, chapter_id')
        .in('chapter_id', chapterIds)
        .order('task_order');

      // 4. pengayaan_prompts
      const { data: pengayaanPrompts } = await supabase
        .from('pengayaan_prompts')
        .select('chapter_id, instruction')
        .in('chapter_id', chapterIds);

      // 5. Task submission counts
      const taskIds = (chapterTasks ?? []).map(t => t.id);
      const taskSubmissionCounts: Record<string, { total: number; graded: number }> = {};

      if (taskIds.length > 0) {
        const { data: submissions } = await supabase
          .from('task_submissions')
          .select('task_id, score')
          .in('task_id', taskIds);

        for (const s of submissions ?? []) {
          if (!taskSubmissionCounts[s.task_id]) taskSubmissionCounts[s.task_id] = { total: 0, graded: 0 };
          taskSubmissionCounts[s.task_id].total++;
          if (s.score !== null) taskSubmissionCounts[s.task_id].graded++;
        }
      }

      // 6. Pengayaan submission counts
      const pengayaanCounts: Record<string, number> = {};
      const penChapterIds = (pengayaanPrompts ?? []).map(p => p.chapter_id);
      if (penChapterIds.length > 0) {
        const { data: penSubs } = await supabase
          .from('pengayaan_submissions')
          .select('chapter_id')
          .in('chapter_id', penChapterIds);

        for (const s of penSubs ?? []) {
          if (!pengayaanCounts[s.chapter_id]) pengayaanCounts[s.chapter_id] = 0;
          pengayaanCounts[s.chapter_id]++;
        }
      }

      // Build flat list
      const chapterMap = new Map(chapters.map(c => [c.id, c]));
      const result: TeacherTaskItem[] = [];

      for (const task of chapterTasks ?? []) {
        const ch = chapterMap.get(task.chapter_id);
        result.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: task.description,
          chapterId: task.chapter_id,
          chapterTitle: ch?.title ?? '',
          chapterEmoji: ch?.cover_emoji ?? '📖',
          totalStudents: studentCount,
          submittedCount: taskSubmissionCounts[task.id]?.total ?? 0,
          gradedCount: taskSubmissionCounts[task.id]?.graded ?? 0,
        });
      }

      for (const prompt of pengayaanPrompts ?? []) {
        const ch = chapterMap.get(prompt.chapter_id);
        result.push({
          id: `pengayaan_${prompt.chapter_id}`,
          type: 'pengayaan',
          title: `Tugas Pengayaan: ${ch?.title ?? ''}`,
          description: prompt.instruction,
          chapterId: prompt.chapter_id,
          chapterTitle: ch?.title ?? '',
          chapterEmoji: ch?.cover_emoji ?? '📖',
          totalStudents: studentCount,
          submittedCount: pengayaanCounts[prompt.chapter_id] ?? 0,
          gradedCount: 0, // pengayaan doesn't have auto-grading
        });
      }

      if (!cancelled) {
        setTasks(result);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [classId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { tasks, loading, error };
}

export function useTaskGradingDetail(
  identifier: string,          // taskId or "pengayaan_<chapterId>"
  classId: string,
) {
  const [questions, setQuestions] = useState<QuestionView[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmissionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!classId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const isPengayaan = identifier.startsWith('pengayaan_');

        // Get all students in class
        const { data: students, error: stuErr } = await supabase
          .from('app_users')
          .select('id, username, display_name')
          .eq('class_id', classId)
          .eq('role', 'student')
          .order('username');

        if (stuErr) {
          console.error('useTaskGradingDetail: students fetch failed', stuErr);
          if (!cancelled) { setError('Gagal memuat data siswa.'); setLoading(false); }
          return;
        }

        if (isPengayaan) {
          const chapterId = identifier.replace('pengayaan_', '');

          const { data: chapter, error: chErr } = await supabase
            .from('chapters')
            .select('title')
            .eq('id', chapterId)
            .maybeSingle();

          const { data: prompt, error: prErr } = await supabase
            .from('pengayaan_prompts')
            .select('instruction')
            .eq('chapter_id', chapterId)
            .maybeSingle();

          if (chErr) console.error('useTaskGradingDetail: chapter fetch failed', chErr);
          if (prErr) console.error('useTaskGradingDetail: prompt fetch failed', prErr);

          const { data: penSubs } = await supabase
            .from('pengayaan_submissions')
            .select('user_id, link, submitted_at')
            .eq('chapter_id', chapterId);

          const subMap = new Map((penSubs ?? []).map(s => [s.user_id, s]));

          const viewList: StudentSubmissionView[] = (students ?? []).map(s => {
            const sub = subMap.get(s.id);
            return {
              studentId: s.id,
              studentName: s.display_name ?? s.username,
              username: s.username,
              submitted: !!sub,
              link: sub?.link,
              submittedAt: sub?.submitted_at,
            };
          });

          if (!cancelled) {
            setTitle(`Tugas Pengayaan: ${chapter?.title ?? ''}`);
            setDescription(prompt?.instruction ?? '');
            setQuestions([]);
            setSubmissions(viewList);
            setLoading(false);
          }
          return;
        }

        // Regular task
        const [taskRes, questionsRes, subsRes] = await Promise.all([
          supabase.from('chapter_tasks').select('title, description, chapter_id').eq('id', identifier).maybeSingle(),
          supabase.from('mcq_questions').select('id, question, options, correct_index')
            .eq('task_id', identifier).eq('assessment', 'tugas').order('question_order'),
          supabase.from('task_submissions').select('user_id, answers, score, submitted_at').eq('task_id', identifier),
        ]);

        if (cancelled) return;

        if (taskRes.error) {
          console.error('useTaskGradingDetail: task fetch failed', taskRes.error);
          if (!cancelled) { setError('Tugas tidak ditemukan.'); setLoading(false); }
          return;
        }

        const mappedQuestions: QuestionView[] = (questionsRes.data ?? []).map(q => ({
          id: q.id,
          question: q.question,
          options: Array.isArray(q.options) ? q.options.map(o => String(o)) : [],
          correctIndex: q.correct_index,
        }));

        const subMap = new Map((subsRes.data ?? []).map(s => [s.user_id, s]));

        const viewList: StudentSubmissionView[] = (students ?? []).map(s => {
          const sub = subMap.get(s.id);
          return {
            studentId: s.id,
            studentName: s.display_name ?? s.username,
            username: s.username,
            submitted: !!sub,
            answers: sub?.answers as Record<string, number> | undefined,
            score: sub?.score,
            submittedAt: sub?.submitted_at,
          };
        });

        if (!cancelled) {
          setTitle(taskRes.data?.title ?? '');
          setDescription(taskRes.data?.description ?? '');
          setQuestions(mappedQuestions);
          setSubmissions(viewList);
          setLoading(false);
        }
      } catch (err) {
        console.error('useTaskGradingDetail: unexpected error', err);
        if (!cancelled) { setError('Terjadi kesalahan. Silakan coba lagi.'); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [identifier, classId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { title, description, questions, submissions, loading, error };
}

// ── Admin: Fetch all classes (for user assignment dropdown) ──

export function useAllClasses() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.from('classes').select('id, name').order('name').then(({ data, error }) => {
      if (cancelled) return;
      if (error) { console.error('useAllClasses error:', error); setLoading(false); return; }
      setClasses(data ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return { classes, loading };
}

// ── Admin User Management Hooks ──

export function useAllUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('admin_get_users');
    if (rpcErr) {
      console.error('useAllUsers RPC error:', rpcErr);
      setError('Gagal memuat data user.');
      setLoading(false);
      return;
    }
    const mapped: AdminUserRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      username: r.username ?? '',
      displayName: r.display_name ?? r.username ?? '',
      role: r.role ?? 'student',
      classId: r.class_id ?? null,
      className: r.class_name ?? null,
      createdAt: r.created_at ?? '',
    }));
    setUsers(mapped);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return { users, loading, error, refresh: load };
}

export async function adminCreateUser(
  input: CreateUserInput,
): Promise<{ ok: boolean; userId?: string; password?: string; message: string }> {
  try {
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message);
    return data;
  } catch (err: any) {
    console.error('adminCreateUser error:', err);
    return { ok: false, message: `⚠️ Gagal membuat user: ${err.message ?? 'unknown error'}` };
  }
}

export async function adminUpdateUser(
  userId: string,
  data: { displayName?: string; role?: string; classId?: string | null },
): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.rpc('admin_update_user', {
      p_user_id: userId,
      p_display_name: data.displayName ?? null,
      p_role: data.role ?? null,
      p_class_id: data.classId ?? null,
    });
    if (error) throw error;
    return { ok: true, message: '✅ User berhasil diperbarui!' };
  } catch (err: any) {
    console.error('adminUpdateUser error:', err);
    return { ok: false, message: `⚠️ Gagal memperbarui user: ${err.message ?? 'unknown error'}` };
  }
}

export async function adminDeleteUser(userId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
    if (error) throw error;
    const result = data as { ok: boolean; message: string } | null;
    return result ?? { ok: false, message: '⚠️ Gagal menghapus user.' };
  } catch (err: any) {
    console.error('adminDeleteUser error:', err);
    return { ok: false, message: `⚠️ Gagal menghapus user: ${err.message ?? 'unknown error'}` };
  }
}

export async function adminResetPassword(userId: string): Promise<{ ok: boolean; password?: string; message: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_reset_password', { p_user_id: userId });
    if (error) throw error;
    const result = data as { ok: boolean; message: string; password?: string } | null;
    return result ?? { ok: false, message: '⚠️ Gagal reset password.' };
  } catch (err: any) {
    console.error('adminResetPassword error:', err);
    return { ok: false, message: `⚠️ Gagal reset password: ${err.message ?? 'unknown error'}` };
  }
}
