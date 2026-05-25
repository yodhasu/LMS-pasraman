'use client';

import { useEffect, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Chapter, ChapterProgressDetail, StudentProgressMap, TaskInboxItem } from '@/lib/types';
import { onAuthStateChanged, User } from 'firebase/auth';

// ── Constants ──
const VALID_CHAPTER_IDS = ['bab-1', 'bab-2', 'bab-3', 'bab-4', 'bab-5', 'bab-6'];

const DEFAULT_PROGRESS: ChapterProgressDetail = {
  pretest: false, pretestScore: null,
  materi: false,
  tugas: false,
  posttest: false, posttestScore: null,
  complete: false,
  pengayaanLink: null, pengayaanScore: null,
};

// ── Chapters (read-only from Firestore) ──
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

// ── Student Progress (reads progress map from users/{uid}) ──
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
            pretestScore: typeof raw.pretestScore === 'number' ? raw.pretestScore : null,
            materi: raw.materi === true,
            tugas: raw.tugas === true,
            posttest: raw.posttest === true,
            posttestScore: typeof raw.posttestScore === 'number' ? raw.posttestScore : null,
            complete: raw.complete === true,
            pengayaanLink: raw.pengayaanLink || null,
            pengayaanScore: typeof raw.pengayaanScore === 'number' ? raw.pengayaanScore : null,
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

// ── Mark a chapter step as done (persisted to Firestore) ──
export async function markChapterStep(
  userId: string,
  chapterId: string,
  step: 'pretest' | 'materi' | 'tugas' | 'posttest',
  score?: number
) {
  const ref = doc(db, 'users', userId);

  // Read current progress
  const userSnap = await getDoc(ref);
  const allProgress = userSnap.exists() ? (userSnap.data().progress || {}) : {};
  const current: ChapterProgressDetail = allProgress[chapterId]
    ? { ...DEFAULT_PROGRESS, ...allProgress[chapterId] }
    : { ...DEFAULT_PROGRESS };

  // Apply step
  current[step] = true;
  if (score !== undefined) {
    if (step === 'pretest') current.pretestScore = score;
    if (step === 'posttest') current.posttestScore = score;
  }

  // Auto-compute 'complete'
  current.complete =
    current.pretest === true &&
    current.materi === true &&
    current.tugas === true &&
    current.posttest === true;

  await updateDoc(ref, {
    [`progress.${chapterId}`]: current,
  });
}

// ── Save pengayaan link ──
export async function savePengayaanLink(userId: string, chapterId: string, link: string) {
  const ref = doc(db, 'users', userId);
  const userSnap = await getDoc(ref);
  const allProgress = userSnap.exists() ? (userSnap.data().progress || {}) : {};
  const current: ChapterProgressDetail = allProgress[chapterId]
    ? { ...DEFAULT_PROGRESS, ...allProgress[chapterId] }
    : { ...DEFAULT_PROGRESS };

  current.pengayaanLink = link;
  await updateDoc(ref, {
    [`progress.${chapterId}`]: current,
  });
}

// ── Seed chapters (returns result for UI feedback) ──
export async function seedChapters(): Promise<{ ok: boolean; message: string }> {
  try {
    const { CHAPTERS } = await import('./mock-data');

    // Clear existing
    const existingSnap = await getDocs(collection(db, 'materi'));
    const deletions = existingSnap.docs.map(d =>
      setDoc(doc(db, 'materi', d.id), { _deleted: true, orderIndex: -1 })
    );
    await Promise.allSettled(deletions);

    // Write fresh
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
      items.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        task,
        status: prog.tugas ? 'submitted' : 'pending',
        score: null,
      });
    }
    if (chapter.postTestOptional && prog.pengayaanLink) {
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
        status: (prog.pengayaanScore ?? null) !== null ? 'graded' : 'submitted',
        score: prog.pengayaanScore ?? null,
      });
    }
  }
  return items;
}
