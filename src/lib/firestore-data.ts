'use client';

import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Chapter, ChapterProgress, StudentProgressMap, TaskInboxItem } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';

// ── Chapters ──
const VALID_CHAPTER_IDS = ['bab-1', 'bab-2', 'bab-3', 'bab-4', 'bab-5', 'bab-6'];

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

// ── Student Progress ──
export function useStudentProgress() {
  const [progress, setProgress] = useState<StudentProgressMap>({});
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const completedChapters: string[] = data.completedChapters || [];
        const scores: Record<string, Record<string, number | null>> = data.scores || {};
        const mapped: StudentProgressMap = {};
        for (const chapterId of VALID_CHAPTER_IDS) {
          const s = scores[chapterId] || {};
          mapped[chapterId] = {
            preTestCompleted: false,
            preTestScore: s.pretest ?? null,
            materialCompleted: false,
            completedTaskIds: [],
            postTestMandatoryCompleted: completedChapters.includes(chapterId),
            postTestMandatoryScore: s.posttest ?? null,
            postTestOptionalSubmitted: false,
            postTestOptionalLink: null,
            postTestOptionalScore: s.pengayaan ?? null,
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

// ── Save score ──
export async function saveScore(
  userId: string,
  chapterId: string,
  scoreType: 'pretest' | 'posttest' | 'pengayaan' | 'tugas',
  score: number
) {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, {
    [`scores.${chapterId}.${scoreType}`]: score,
  });
}

// ── Mark chapter as completed ──
export async function markChapterCompleted(userId: string, chapterId: string) {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, {
    completedChapters: arrayUnion(chapterId),
  });
}

// ── Seed chapters ──
export async function seedChapters() {
  const { CHAPTERS } = await import('./mock-data');
  
  const existingSnap = await getDocs(collection(db, 'materi'));
  const cleanup = existingSnap.docs
    .filter(d => !VALID_CHAPTER_IDS.includes(d.id))
    .map(d => setDoc(doc(db, 'materi', d.id), { _junk: true, orderIndex: -1 }));
  await Promise.allSettled(cleanup);
  
  const batch = [];
  for (const chapter of CHAPTERS) {
    const { id, ...data } = chapter;
    batch.push(setDoc(doc(db, 'materi', id), data));
  }
  await Promise.all(batch);
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
      items.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        task,
        status: prog.completedTaskIds.includes(task.id) ? 'submitted' : 'pending',
        score: null,
      });
    }
    if (chapter.postTestOptional && prog.postTestOptionalSubmitted) {
      items.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        task: {
          id: `opt-${chapter.id}`,
          title: 'Tugas Pengayaan: ' + chapter.title,
          description: chapter.postTestOptional.instruction,
          dueDate: null,
          type: 'submission_link',
        },
        status: prog.postTestOptionalScore !== null ? 'graded' : 'submitted',
        score: prog.postTestOptionalScore,
      });
    }
  }
  return items;
}
