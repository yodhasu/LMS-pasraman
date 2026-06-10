'use client';

import { useTaskGradingDetail } from '@/lib/supabase-data';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState, useEffect } from 'react';

export default function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ class?: string }>;
}) {
  const { taskId } = use(params);
  const { class: classId } = use(searchParams);
  const { role } = useAuth();
  const router = useRouter();

  const isTeacher = role === 'teacher' || role === 'admin';

  useEffect(() => {
    if (isTeacher && !classId && role !== null) {
      router.push('/tugas');
    }
  }, [classId, isTeacher, role, router]);

  if (!isTeacher) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-lg">🔒 Halaman ini hanya untuk guru</p>
        <Link href="/tugas" className="text-sm text-[#1F3D30] hover:underline mt-2 inline-block">Kembali →</Link>
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  return <TaskDetailContent taskId={taskId} classId={classId} />;
}

function TaskDetailContent({ taskId, classId }: { taskId: string; classId: string }) {
  const { title, description, questions, submissions, loading, error } = useTaskGradingDetail(taskId, classId);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const isPengayaan = taskId.startsWith('pengayaan_');

  const submittedCount = submissions.filter(s => s.submitted).length;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-[#e8efe4] border-t-[#1F3D30] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <Link href="/tugas" className="text-sm text-[#5C7A6E] hover:text-[#1F3D30] transition-colors inline-flex items-center gap-1">
          ← Kembali
        </Link>
        <div className="bg-red-50 text-red-700 text-sm px-4 py-6 rounded-2xl text-center">
          <span className="text-2xl block mb-2">⚠️</span>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back + header */}
      <div>
        <Link href="/tugas" className="text-sm text-[#5C7A6E] hover:text-[#1F3D30] transition-colors inline-flex items-center gap-1">
          ← Kembali
        </Link>
        <h1 className="text-xl lg:text-2xl font-bold mt-2">{title}</h1>
        {description && (
          <p className="text-sm text-[#5C7A6E] mt-1">{description}</p>
        )}
        <p className="text-xs text-[#8A9E95] mt-1">
          {submissions.length} siswa · {submittedCount} mengumpulkan · {isPengayaan ? 'Tugas Pengayaan' : `${questions.length} soal`}
        </p>
      </div>

      {isPengayaan ? (
        /* ── Pengayaan view ── */
        <div className="space-y-2">
          {submissions.map(student => (
            <div
              key={student.studentId}
              className="rounded-2xl bg-white border border-[#1F3D30]/5 overflow-hidden"
            >
              <button
                onClick={() => setExpandedStudent(
                  expandedStudent === student.studentId ? null : student.studentId
                )}
                disabled={!student.submitted}
                className={`w-full p-4 flex items-center gap-4 text-left transition-colors
                  ${student.submitted ? 'hover:bg-[#FBF8F4] cursor-pointer' : 'cursor-default opacity-70'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#1F3D30] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {student.studentName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{student.studentName}</p>
                  <p className="text-xs text-[#8A9E95]">@{student.username}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {student.submitted ? (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">✓ Dikumpulkan</span>
                  ) : (
                    <span className="text-xs text-[#8A9E95]">Belum mengerjakan</span>
                  )}
                </div>
                {student.submitted && (
                  <span className="text-sm text-[#8A9E95]">{expandedStudent === student.studentId ? '▲' : '▼'}</span>
                )}
              </button>

              {expandedStudent === student.studentId && student.submitted && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="ml-14 p-3 rounded-xl bg-[#FBF8F4]">
                    <p className="text-xs font-semibold text-[#5C7A6E] uppercase tracking-wide mb-1">Link Pengayaan</p>
                    <a
                      href={student.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#1F3D30] font-medium hover:underline break-all"
                    >
                      {student.link}
                    </a>
                    {student.submittedAt && (
                      <p className="text-[11px] text-[#8A9E95] mt-2">
                        Dikumpulkan {new Date(student.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ── MCQ view ── */
        <div className="space-y-2">
          {submissions.map(student => {
            const isExpanded = expandedStudent === student.studentId;
            let correctCount = 0;
            const totalQuestions = questions.length;

            if (student.submitted && student.answers && questions.length > 0) {
              for (const q of questions) {
                const studentChoice = student.answers[q.id];
                if (studentChoice === q.correctIndex) correctCount++;
              }
            }

            return (
              <div
                key={student.studentId}
                className="rounded-2xl bg-white border border-[#1F3D30]/5 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedStudent(isExpanded ? null : student.studentId)}
                  disabled={!student.submitted}
                  className={`w-full p-4 flex items-center gap-4 text-left transition-colors
                    ${student.submitted ? 'hover:bg-[#FBF8F4] cursor-pointer' : 'cursor-default opacity-70'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1F3D30] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {student.studentName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{student.studentName}</p>
                    <p className="text-xs text-[#8A9E95]">@{student.username}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {student.submitted ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          {correctCount}/{totalQuestions}
                        </span>
                        {student.score !== null && (
                          <span className="text-xs font-bold text-[#1F3D30] bg-[#e8efe4] px-2 py-1 rounded-full">
                            {student.score}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#8A9E95]">Belum mengerjakan</span>
                    )}
                  </div>
                  {student.submitted && (
                    <span className="text-sm text-[#8A9E95]">{isExpanded ? '▲' : '▼'}</span>
                  )}
                </button>

                {isExpanded && student.submitted && (
                  <div className="px-4 pb-4 space-y-3">
                    {questions.map((q, qi) => {
                      const studentChoice = student.answers?.[q.id];
                      const isCorrect = studentChoice === q.correctIndex;

                      return (
                        <div key={q.id} className="ml-14 p-3 rounded-xl bg-[#FBF8F4]">
                          <p className="text-sm font-semibold text-[#1F3D30]">
                            {qi + 1}. {q.question}
                          </p>
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt, oi) => {
                              const isSelected = studentChoice === oi;
                              const isCorrectOpt = q.correctIndex === oi;

                              let optClass = 'px-3 py-1.5 rounded-lg text-sm border transition-all';
                              if (isSelected && isCorrectOpt) {
                                optClass += ' bg-emerald-100 border-emerald-300 text-emerald-800 font-medium';
                              } else if (isSelected && !isCorrectOpt) {
                                optClass += ' bg-red-50 border-red-200 text-red-700 font-medium';
                              } else if (isCorrectOpt) {
                                optClass += ' bg-emerald-50 border-emerald-200 text-emerald-700';
                              } else {
                                optClass += ' border-[#d4dcd0] text-[#5C7A6E]';
                              }

                              const label = String.fromCharCode(65 + oi); // A, B, C, D

                              return (
                                <div key={oi} className={optClass}>
                                  <span className="font-semibold mr-2">{label}.</span>
                                  {opt}
                                  {isSelected && isCorrectOpt && ' ✓'}
                                  {isSelected && !isCorrectOpt && ' ✗'}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {isCorrect !== undefined && (
                              <span className={`text-[11px] font-semibold ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isCorrect ? '✓ Benar' : '✗ Salah'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Summary bar */}
                    <div className="ml-14 p-3 rounded-xl bg-[#1F3D30]/5 flex items-center justify-between">
                      <span className="text-sm text-[#5C7A6E]">Nilai</span>
                      <span className="text-lg font-bold text-[#1F3D30]">
                        {student.score !== null ? student.score : '—'}
                      </span>
                    </div>

                    {student.submittedAt && (
                      <p className="ml-14 text-[11px] text-[#8A9E95]">
                        Dikumpulkan {new Date(student.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
