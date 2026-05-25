// --- Types for Pasraman LMS (single course, chapter-based) ---

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

// ── Answer records for task/pengayaan submissions ──
export interface TaskAnswer {
  userId: string;
  userName: string;
  answers: Record<string, number>; // questionId → selectedIndex
  score: number;
  submittedAt: string; // ISO timestamp
}

export interface PengayaanAnswer {
  userId: string;
  userName: string;
  link: string;
  submittedAt: string;
}

// ── Chapter Task — now supports MCQ ──
export interface ChapterTask {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  type: 'mcq';
  questions: MCQ[]; // MCQ questions for this task
  answer: TaskAnswer[]; // student submissions
}

export interface Chapter {
  id: string;
  orderIndex: number;
  title: string;
  subtitle: string;
  description: string;
  materialContent: string;
  materialVideoUrl: string | null;
  preTest: MCQ[] | null;
  tasks: ChapterTask[];
  postTestMandatory: MCQ[];
  postTestOptional: {
    instruction: string;
    answer: PengayaanAnswer[]; // student submissions
  } | null;
  coverEmoji: string;
  coverColor: string;
}

// ── Per-chapter progress — ONLY boolean flags ──
export interface ChapterProgressDetail {
  pretest: boolean;
  materi: boolean;
  tugas: boolean;
  posttest: boolean;
  complete: boolean; // auto-computed
}

export interface StudentProgressMap {
  [chapterId: string]: ChapterProgressDetail;
}

// ── Nilai subcollection record ──
export interface ScoreRecord {
  id: string; // doc ID e.g. "bab-1-pretest"
  chapterId: string;
  type: 'pretest' | 'posttest' | 'tugas' | 'pengayaan';
  score: number;
  submittedAt: string;
}

// ── Legacy compat ──
export interface ChapterProgress {
  preTestCompleted: boolean;
  preTestScore: number | null;
  materialCompleted: boolean;
  completedTaskIds: string[];
  postTestMandatoryCompleted: boolean;
  postTestMandatoryScore: number | null;
  postTestOptionalSubmitted: boolean;
  postTestOptionalLink: string | null;
  postTestOptionalScore: number | null;
}

export interface StudentInfo {
  name: string;
  className: string;
  semester: string;
}

export interface TaskInboxItem {
  chapterId: string;
  chapterTitle: string;
  task: ChapterTask;
  status: 'pending' | 'submitted' | 'graded';
  score: number | null;
}
