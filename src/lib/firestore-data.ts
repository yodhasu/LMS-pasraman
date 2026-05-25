'use client';

import { useEffect, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, arrayUnion, onSnapshot
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Chapter, ChapterProgressDetail, StudentProgressMap, ScoreRecord, TaskInboxItem, TaskAnswer, PengayaanAnswer } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';

// ── Constants ──
const VALID_CHAPTER_IDS = ['bab-1', 'bab-2', 'bab-3', 'bab-4', 'bab-5', 'bab-6'];

const DEFAULT_PROGRESS: ChapterProgressDetail = {
  pretest: false, materi: false, tugas: false, posttest: false, complete: false,
};

// ── Chapters ──
export function useChapters() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = collection(db, 'materi');
    const unsub = onSnapshot(q, (snap) => {
      const list: Chapter[] = [];
      snap.forEach((d) => {
        if (!VALID_CHAPTER_IDS.includes(d.id)) return;
        const data = d.data();
        list.push({
          id: d.id,
          orderIndex: data.orderIndex ?? 0,
          title: data.title ?? '',
          subtitle: data.subtitle ?? '',
          description: data.description ?? '',
          materialContent: data.materialContent ?? '',
          materialVideoUrl: data.materialVideoUrl ?? null,
          preTest: data.preTest ?? null,
          tasks: data.tasks ?? [],
          postTestMandatory: data.postTestMandatory ?? [],
          postTestOptional: data.postTestOptional ?? null,
          coverEmoji: data.coverEmoji ?? '📖',
          coverColor: data.coverColor ?? 'from-green-100 to-emerald-200',
        });
      });
      list.sort((a, b) => a.orderIndex - b.orderIndex);
      setChapters(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { chapters, loading };
}

// ── Student Progress (boolean only, no scores) ──
export function useStudentProgress() {
  const [progress, setProgress] = useState<StudentProgressMap>({});
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const progressMap = data.progress || {};
        const mapped: StudentProgressMap = {};
        for (const chapterId of VALID_CHAPTER_IDS) {
          const raw = progressMap[chapterId] || {};
          mapped[chapterId] = {
            pretest: raw.pretest === true,
            materi: raw.materi === true,
            tugas: raw.tugas === true,
            posttest: raw.posttest === true,
            complete: raw.complete === true,
          };
        }
        setProgress(mapped);
      } else {
        setProgress({});
      }
    });
    return () => unsub();
  }, [user]);

  return { progress, user };
}

// ── Nilai / Scores (separate subcollection) ──
export function useNilai() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'users', user.uid, 'nilai');
    const unsub = onSnapshot(q, (snap) => {
      const list: ScoreRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          chapterId: data.chapterId ?? '',
          type: data.type ?? 'posttest',
          score: data.score ?? 0,
          submittedAt: data.submittedAt ?? '',
        });
      });
      setScores(list);
    });
    return () => unsub();
  }, [user]);

  return { scores, user };
}

// ── Save score to nilai subcollection ──
export async function saveScore(
  userId: string,
  chapterId: string,
  type: 'pretest' | 'posttest' | 'tugas' | 'pengayaan',
  score: number
) {
  const docId = `${chapterId}-${type}`;
  const ref = doc(db, 'users', userId, 'nilai', docId);
  await setDoc(ref, {
    chapterId,
    type,
    score,
    submittedAt: new Date().toISOString(),
  });
}

// ── Mark a chapter step as done (progress boolean only) ──
export async function markChapterStep(
  userId: string,
  chapterId: string,
  step: 'pretest' | 'materi' | 'tugas' | 'posttest'
) {
  const ref = doc(db, 'users', userId);
  const userSnap = await getDoc(ref);
  const allProgress = userSnap.exists() ? (userSnap.data().progress || {}) : {};
  const current: ChapterProgressDetail = allProgress[chapterId]
    ? { ...DEFAULT_PROGRESS, ...allProgress[chapterId] }
    : { ...DEFAULT_PROGRESS };

  current[step] = true;
  current.complete =
    current.pretest === true &&
    current.materi === true &&
    current.tugas === true &&
    current.posttest === true;

  await updateDoc(ref, {
    [`progress.${chapterId}`]: current,
  });
}

// ── Submit task answer to chapter doc ──
export async function submitTaskAnswer(
  chapterId: string,
  taskId: string,
  answer: TaskAnswer
) {
  const chapterRef = doc(db, 'materi', chapterId);
  const snap = await getDoc(chapterRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const tasks = data.tasks || [];
  const idx = tasks.findIndex((t: any) => t.id === taskId);
  if (idx === -1) return;

  // Add answer to the task's answer array
  const existingAnswers = tasks[idx].answer || [];
  // Remove previous submission from same user
  const filtered = existingAnswers.filter((a: any) => a.userId !== answer.userId);
  filtered.push(answer);
  tasks[idx].answer = filtered;

  await updateDoc(chapterRef, { tasks });
}

// ── Submit pengayaan link to chapter doc ──
export async function submitPengayaanAnswer(
  chapterId: string,
  answer: PengayaanAnswer
) {
  const chapterRef = doc(db, 'materi', chapterId);
  const snap = await getDoc(chapterRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const postTestOptional = data.postTestOptional;
  if (!postTestOptional) return;

  const existing = postTestOptional.answer || [];
  const filtered = existing.filter((a: any) => a.userId !== answer.userId);
  filtered.push(answer);
  postTestOptional.answer = filtered;

  await updateDoc(chapterRef, { postTestOptional });
}

// ── Seed chapters ──
export async function seedChapters(): Promise<{ ok: boolean; message: string }> {
  try {
    const { CHAPTERS } = await import('./mock-data');

    const existingSnap = await getDocs(collection(db, 'materi'));
    const deletions = existingSnap.docs.map(d =>
      setDoc(doc(db, 'materi', d.id), { _deleted: true, orderIndex: -1 })
    );
    await Promise.allSettled(deletions);

    const writes = CHAPTERS.map((chapter: Chapter) => {
      const { id, ...data } = chapter;
      return setDoc(doc(db, 'materi', id), data);
    });
    await Promise.all(writes);

    return { ok: true, message: `✅ ${CHAPTERS.length} bab berhasil diisi ulang` };
  } catch (err: any) {
    console.error('seedChapters failed:', err);
    return { ok: false, message: `❌ Gagal: ${err.message || 'unknown error'}` };
  }
}

// ── Compute task inbox ──
export function computeTaskInbox(
  chapters: Chapter[],
  progress: StudentProgressMap
): TaskInboxItem[] {
  const items: TaskInboxItem[] = [];
  for (const chapter of chapters) {
    const prog = progress[chapter.id];
    if (!prog) continue;
    for (const task of chapter.tasks) {
      const submitted = (task.answer || []).length;
      items.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        task,
        status: submitted > 0 ? 'submitted' : 'pending',
        score: null,
      });
    }
    if (chapter.postTestOptional) {
      const submitted = (chapter.postTestOptional.answer || []).length;
      if (submitted > 0) {
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
