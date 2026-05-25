'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { Chapter, ChapterProgressDetail, ScoreRecord, StudentProgressMap, TaskInboxItem } from '@/lib/types';

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

function toMCQ(row: QuestionRow) {
  return {
    id: row.id,
    question: row.question,
    options: Array.isArray(row.options) ? row.options as string[] : [],
    correctIndex: row.correct_index,
  };
}

async function ensureAppUser(user: User) {
  const email = user.email ?? `${user.uid}@unknown.local`;
  const { error } = await supabase
    .from('app_users')
    .upsert({
      firebase_uid: user.uid,
      email,
      display_name: user.displayName ?? email.split('@')[0],
      role: 'student',
    }, { onConflict: 'firebase_uid' });

  if (error) console.error('ensureAppUser failed:', error);
}

export function useChapters() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [chaptersRes, tasksRes, questionsRes, promptsRes, taskSubsRes, pengayaanSubsRes] = await Promise.all([
        supabase.from('chapters').select('*').order('order_index'),
        supabase.from('chapter_tasks').select('*').order('task_order'),
        supabase.from('mcq_questions').select('*').order('question_order'),
        supabase.from('pengayaan_prompts').select('*'),
        supabase.from('task_submissions').select('*'),
        supabase.from('pengayaan_submissions').select('*'),
      ]);

      const error = chaptersRes.error || tasksRes.error || questionsRes.error || promptsRes.error || taskSubsRes.error || pengayaanSubsRes.error;
      if (error) {
        console.error('useChapters supabase error:', error);
        if (!cancelled) setLoading(false);
        return;
      }

      const questions = (questionsRes.data ?? []) as QuestionRow[];
      const taskSubs = (taskSubsRes.data ?? []) as TaskSubmissionRow[];
      const pengayaanSubs = (pengayaanSubsRes.data ?? []) as PengayaanSubmissionRow[];

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
            materialContent: chapter.material_content ?? '',
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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      await ensureAppUser(user!);
      const { data, error } = await supabase
        .from('chapter_progress')
        .select('*')
        .eq('user_id', user!.uid);

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

    load();
    return () => { cancelled = true; };
  }, [user]);

  return { progress, user };
}

export function useNilai() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      await ensureAppUser(user!);
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', user!.uid)
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

    load();
    return () => { cancelled = true; };
  }, [user]);

  return { scores, user };
}

export async function markChapterStep(
  userId: string,
  chapterId: string,
  step: 'pretest' | 'materi' | 'tugas' | 'posttest',
): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (user) await ensureAppUser(user);

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
    const user = auth.currentUser;
    if (user) await ensureAppUser(user);

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

export async function seedChapters(): Promise<{ ok: boolean; message: string }> {
  return { ok: false, message: 'Seed Supabase content via scripts/seed-supabase-content.cjs from the terminal.' };
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
