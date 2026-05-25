const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

const sourcePath = path.join(__dirname, '..', 'src', 'lib', 'mock-data.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const sandbox = { exports: {}, require: () => ({}), console };
vm.runInNewContext(js, sandbox, { filename: sourcePath });
const chapters = sandbox.exports.CHAPTERS;
if (!Array.isArray(chapters)) throw new Error('CHAPTERS export not found');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

function questionRow(chapterId, taskId, assessment, question, questionOrder) {
  return {
    id: question.id,
    chapter_id: chapterId,
    task_id: taskId,
    assessment,
    question_order: questionOrder,
    question: question.question,
    options: question.options ?? [],
    correct_index: question.correctIndex ?? 0,
  };
}

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function main() {
  await must('delete pengayaan_prompts', supabase.from('pengayaan_prompts').delete().neq('chapter_id', '__never__'));
  await must('delete mcq_questions', supabase.from('mcq_questions').delete().neq('id', '__never__'));
  await must('delete chapter_tasks', supabase.from('chapter_tasks').delete().neq('id', '__never__'));
  await must('delete chapters', supabase.from('chapters').delete().neq('id', '__never__'));

  const chapterRows = chapters.map((chapter) => ({
    id: chapter.id,
    order_index: chapter.orderIndex ?? 0,
    title: chapter.title,
    subtitle: chapter.subtitle ?? '',
    description: chapter.description ?? '',
    material_content: chapter.materialContent ?? '',
    material_video_url: chapter.materialVideoUrl ?? null,
    cover_emoji: chapter.coverEmoji ?? '📖',
    cover_color: chapter.coverColor ?? 'from-green-100 to-emerald-200',
  }));

  const taskRows = [];
  const questionRows = [];
  const promptRows = [];

  for (const chapter of chapters) {
    (Array.isArray(chapter.preTest) ? chapter.preTest : []).forEach((question, index) => {
      questionRows.push(questionRow(chapter.id, null, 'pretest', question, index));
    });

    (Array.isArray(chapter.tasks) ? chapter.tasks : []).forEach((task, taskIndex) => {
      taskRows.push({
        id: task.id,
        chapter_id: chapter.id,
        title: task.title,
        description: task.description ?? '',
        due_date: task.dueDate ?? null,
        task_order: taskIndex,
      });

      (Array.isArray(task.questions) ? task.questions : []).forEach((question, index) => {
        questionRows.push(questionRow(chapter.id, task.id, 'tugas', question, index));
      });
    });

    (Array.isArray(chapter.postTestMandatory) ? chapter.postTestMandatory : []).forEach((question, index) => {
      questionRows.push(questionRow(chapter.id, null, 'posttest', question, index));
    });

    if (chapter.postTestOptional?.instruction) {
      promptRows.push({ chapter_id: chapter.id, instruction: chapter.postTestOptional.instruction });
    }
  }

  await must('insert chapters', supabase.from('chapters').insert(chapterRows));
  if (taskRows.length) await must('insert chapter_tasks', supabase.from('chapter_tasks').insert(taskRows));
  if (questionRows.length) await must('insert mcq_questions', supabase.from('mcq_questions').insert(questionRows));
  if (promptRows.length) await must('insert pengayaan_prompts', supabase.from('pengayaan_prompts').insert(promptRows));

  console.log(JSON.stringify({
    chapters: chapterRows.length,
    chapter_tasks: taskRows.length,
    mcq_questions: questionRows.length,
    pengayaan_prompts: promptRows.length,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
