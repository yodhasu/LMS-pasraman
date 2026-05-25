// --- Types for Pasraman LMS (single course, chapter-based) ---

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ChapterTask {
  id: string;
  title: string;
  description: string;
  dueDate: string | null; // ISO date string
  type: 'submission_link' | 'reading' | 'quiz_embedded';
}

export interface Chapter {
  id: string;
  orderIndex: number;
  title: string;
  subtitle: string; // short description for grid card
  description: string; // longer markdown description
  materialContent: string; // markdown content
  materialVideoUrl: string | null;
  preTest: MCQ[] | null; // null = guru tidak mengaktifkan pre-test untuk bab ini
  tasks: ChapterTask[];
  postTestMandatory: MCQ[]; // PG — locked until material + tasks done
  postTestOptional: { // guru-decided, variatif — submit link
    instruction: string; // markdown
  } | null;
  coverEmoji: string;
  coverColor: string; // tailwind gradient classes e.g. 'from-amber-100 to-orange-200'
}

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

export interface StudentProgressMap {
  [chapterId: string]: ChapterProgress;
}

export interface TaskInboxItem {
  chapterId: string;
  chapterTitle: string;
  task: ChapterTask;
  status: 'pending' | 'submitted' | 'graded';
  score: number | null;
}
