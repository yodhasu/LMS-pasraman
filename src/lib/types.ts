// --- Types for Pasraman LMS (single course, chapter-based) ---

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

// ── Answer/submission records ──
export interface TaskAnswer {
  userId: string;
  userName: string;
  score: number;
  answers: Record<string, number>; // questionId -> selectedIndex
  submittedAt: string; // ISO
}

export interface PengayaanAnswer {
  userId: string;
  userName: string;
  link: string;
  submittedAt: string; // ISO
}

// ── Chapter task — now MCQ by default ──
export interface ChapterTask {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  type: 'mcq';                                // tugas = MCQ (sama kayak postTest)
  questions: MCQ[];                           // the MCQ questions
  answer: TaskAnswer[];                       // who submitted what
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
    answer: PengayaanAnswer[];                // who submitted what
  } | null;
  coverEmoji: string;
  coverColor: string;
}

// ── Progress: boolean-only, no scores ──
export interface ChapterProgressDetail {
  pretest: boolean;
  materi: boolean;
  tugas: boolean;
  posttest: boolean;
  complete: boolean;                          // auto: all four true
}

export interface StudentProgressMap {
  [chapterId: string]: ChapterProgressDetail;
}

// ── Nilai / scores — separate subcollection ──
export interface ScoreRecord {
  id: string;                                 // doc id e.g. "bab-1-pretest"
  chapterId: string;
  type: 'pretest' | 'posttest' | 'tugas' | 'pengayaan';
  score: number;
  submittedAt: string;
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
