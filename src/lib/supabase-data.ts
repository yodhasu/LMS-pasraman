'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Chapter, ChapterMaterial, ChapterProgressDetail, MaterialProgressMap, ScoreRecord, StudentProgressMap, TaskInboxItem } from '@/lib/types';
import { CHAPTERS } from './mock-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const VALID_CHAPTER_IDS = ['bab-1', 'bab-2', 'bab-3', 'bab-4', 'bab-5', 'bab-6'];
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

export function useChapters() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // Phase 1: anon-accessible tables via raw fetch (no Bearer token).
      // Using raw fetch avoids 401 when supabase-js attaches an expired Bearer.
      const [chaptersRes, tasksRes, questionsRes, promptsRes] = await Promise.all([
        anonFetch<RawChapter>('chapters?select=*&order=order_index.asc'),
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
        .filter((chapter) => VALID_CHAPTER_IDS.includes(chapter.id))
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
  }, []);

  return { chapters, loading };
}

export function useStudentProgress() {
  const [progress, setProgress] = useState<StudentProgressMap>({});
  const [user, setUser] = useState<ReturnType<typeof normalizeUser>>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(userId: string) {
      const { data, error } = await supabase
        .from('chapter_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('useStudentProgress supabase error:', error);
        return;
      }

      const mapped: StudentProgressMap = {};
      for (const chapterId of VALID_CHAPTER_IDS) {
        const row = data?.find((item) => item.chapter_id === chapterId);
        mapped[chapterId] = row ? {
          pretest: row.pretest === true,
          materi: row.materi === true,
          tugas: row.tugas === true,
          posttest: row.posttest === true,
          complete: row.complete === true,
        } : { ...DEFAULT_PROGRESS };
      }

      if (!cancelled) setProgress(mapped);
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
      setProgress({});
      if (normalized) load(normalized.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { progress, user };
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

export function useChapterMaterials(chapterId: string | null) {
  const [materials, setMaterials] = useState<ChapterMaterial[]>([]);
  const [matProgress, setMatProgress] = useState<MaterialProgressMap>({});
  const [loading, setLoading] = useState(true);

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
  }, [chapterId]);

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
      if (myAnswer) {
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
          status: 'submitted',
          score: null,
        });
      }
    }
  }
  return items;
}
