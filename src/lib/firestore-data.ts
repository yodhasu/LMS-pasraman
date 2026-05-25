'use client';

import { useEffect, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot,
  arrayUnion, Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Chapter, ChapterProgressDetail, StudentProgressMap, TaskInboxItem, ScoreRecord, TaskAnswer, PengayaanAnswer } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';

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

// ── Student Progress (boolean only) ──
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

// ── Nilai (score subcollection) ──
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
      list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      setScores(list);
    });
    return () => unsub();
  }, [user]);

  return { scores, user };
}

// ── Mark chapter step as done (no score — boolean only) ──
// Uses atomic dot-notation updates to avoid race conditions.
export async function markChapterStep(
  userId: string,
  chapterId: string,
  step: 'pretest' | 'materi' | 'tugas' | 'posttest',
): Promise<boolean> {
  try {
    const ref = doc(db, 'users', userId);

    // Step 1: atomically set the step flag + reset complete flag
    // (complete will be recalculated in step 2)
    await updateDoc(ref, {
      [`progress.${chapterId}.${step}`]: true,
      [`progress.${chapterId}.complete`]: false,
    });

    // Step 2: re-read and set complete if all 4 steps are done
    const userSnap = await getDoc(ref);
    const progressMap = userSnap.exists() ? (userSnap.data().progress || {}) : {};
    const current = progressMap[chapterId] || {};

    if (current.pretest && current.materi && current.tugas && current.posttest) {
      await updateDoc(ref, {
        [`progress.${chapterId}.complete`]: true,
      });
    }
    return true;
  } catch (err) {
    console.error('markChapterStep failed:', err);
    return false;
  }
}

// ── Save score to nilai subcollection ──
export async function saveScore(
  userId: string,
  chapterId: string,
  type: 'pretest' | 'posttest' | 'tugas' | 'pengayaan',
  score: number,
): Promise<boolean> {
  try {
    const docId = `${chapterId}-${type}`;
    const ref = doc(db, 'users', userId, 'nilai', docId);
    await setDoc(ref, {
      chapterId,
      type,
      score,
      submittedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('saveScore failed:', err);
    return false;
  }
}

// ── Submit task answer to chapter doc ──
export async function submitTaskAnswer(
  chapterId: string,
  taskIndex: number,
  userId: string,
  userName: string,
  answers: Record<string, number>,
  score: number,
): Promise<boolean> {
  try {
    const ref = doc(db, 'materi', chapterId);
    const answer: TaskAnswer = {
      userId,
      userName,
      answers,
      score,
      submittedAt: new Date().toISOString(),
    };
    await updateDoc(ref, {
      [`tasks.${taskIndex}.answer`]: arrayUnion(answer),
    });
    return true;
  } catch (err) {
    console.error('submitTaskAnswer failed:', err);
    return false;
  }
}

// ── Submit pengayaan link to chapter doc ──
export async function submitPengayaanLink(
  chapterId: string,
  userId: string,
  userName: string,
  link: string,
): Promise<boolean> {
  try {
    const ref = doc(db, 'materi', chapterId);
    const answer: PengayaanAnswer = {
      userId,
      userName,
      link,
      submittedAt: new Date().toISOString(),
    };
    await updateDoc(ref, {
      'postTestOptional.answer': arrayUnion(answer),
    });
    return true;
  } catch (err) {
    console.error('submitPengayaanLink failed:', err);
    return false;
  }
}

// ── Seed chapters ──
export async function seedChapters(): Promise<{ ok: boolean; message: string }> {
  try {
    const { CHAPTERS } = await import('./mock-data');
    const existingSnap = await getDocs(collection(db, 'materi'));
    // Batch-delete all existing docs (instead of _deleted marker)
    const batchSize = 500; // Firestore batch limit
    for (let i = 0; i < existingSnap.docs.length; i += batchSize) {
      const batchDocs = existingSnap.docs.slice(i, i + batchSize);
      const deletions = batchDocs.map(d =>
        setDoc(doc(db, 'materi', d.id), { _deleted: true })
      );
      await Promise.allSettled(deletions);
    }
    // Write fresh data
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

// ── Compute task inbox (only for unlocked chapters) ──
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

    // Only show tasks for unlocked chapters:
    // bab-1 is always unlocked; others require previous chapter complete
    const isUnlocked = i === 0 || (progress[chapters[i - 1].id]?.complete ?? false);
    if (!isUnlocked) continue;

    // Tasks
    for (const task of chapter.tasks) {
      const myAnswer = task.answer?.find(a => a.userId === userId);
      items.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        task,
        status: myAnswer ? (myAnswer.score !== null ? 'graded' : 'submitted') : 'pending',
        score: myAnswer?.score ?? null,
      });
    }

    // Pengayaan
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
