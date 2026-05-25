const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '..', 'src', 'lib', 'mock-data.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const sandbox = {
  exports: {},
  require: () => ({}),
  console,
};
vm.runInNewContext(js, sandbox, { filename: sourcePath });

const chapters = sandbox.exports.CHAPTERS;
if (!Array.isArray(chapters)) {
  throw new Error('CHAPTERS export not found');
}

function lit(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonb(value) {
  return `${lit(JSON.stringify(value))}::jsonb`;
}

const lines = [];
lines.push('delete from public.pengayaan_submissions;');
lines.push('delete from public.task_submissions;');
lines.push('delete from public.scores;');
lines.push('delete from public.chapter_progress;');
lines.push('delete from public.pengayaan_prompts;');
lines.push('delete from public.mcq_questions;');
lines.push('delete from public.chapter_tasks;');
lines.push('delete from public.chapters;');

let chapterCount = 0;
let taskCount = 0;
let questionCount = 0;
let promptCount = 0;

for (const chapter of chapters) {
  chapterCount++;
  lines.push(`insert into public.chapters (id, order_index, title, subtitle, description, material_content, material_video_url, cover_emoji, cover_color) values (${lit(chapter.id)}, ${chapter.orderIndex ?? 0}, ${lit(chapter.title)}, ${lit(chapter.subtitle ?? '')}, ${lit(chapter.description ?? '')}, ${lit(chapter.materialContent ?? '')}, ${lit(chapter.materialVideoUrl)}, ${lit(chapter.coverEmoji ?? '📖')}, ${lit(chapter.coverColor ?? 'from-green-100 to-emerald-200')});`);

  const pre = Array.isArray(chapter.preTest) ? chapter.preTest : [];
  pre.forEach((q, idx) => {
    questionCount++;
    lines.push(`insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values (${lit(q.id)}, ${lit(chapter.id)}, null, 'pretest', ${idx}, ${lit(q.question)}, ${jsonb(q.options ?? [])}, ${q.correctIndex ?? 0});`);
  });

  const tasks = Array.isArray(chapter.tasks) ? chapter.tasks : [];
  tasks.forEach((task, taskIdx) => {
    taskCount++;
    lines.push(`insert into public.chapter_tasks (id, chapter_id, title, description, due_date, task_order) values (${lit(task.id)}, ${lit(chapter.id)}, ${lit(task.title)}, ${lit(task.description ?? '')}, ${lit(task.dueDate)}, ${taskIdx});`);
    const questions = Array.isArray(task.questions) ? task.questions : [];
    questions.forEach((q, idx) => {
      questionCount++;
      lines.push(`insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values (${lit(q.id)}, ${lit(chapter.id)}, ${lit(task.id)}, 'tugas', ${idx}, ${lit(q.question)}, ${jsonb(q.options ?? [])}, ${q.correctIndex ?? 0});`);
    });
  });

  const post = Array.isArray(chapter.postTestMandatory) ? chapter.postTestMandatory : [];
  post.forEach((q, idx) => {
    questionCount++;
    lines.push(`insert into public.mcq_questions (id, chapter_id, task_id, assessment, question_order, question, options, correct_index) values (${lit(q.id)}, ${lit(chapter.id)}, null, 'posttest', ${idx}, ${lit(q.question)}, ${jsonb(q.options ?? [])}, ${q.correctIndex ?? 0});`);
  });

  if (chapter.postTestOptional?.instruction) {
    promptCount++;
    lines.push(`insert into public.pengayaan_prompts (chapter_id, instruction) values (${lit(chapter.id)}, ${lit(chapter.postTestOptional.instruction)});`);
  }
}

console.error(JSON.stringify({ chapterCount, taskCount, questionCount, promptCount }));
process.stdout.write(lines.join('\n'));
