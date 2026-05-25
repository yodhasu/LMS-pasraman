# LMS Pasraman — Handover
> 2025-05-25 | Yuu → next session

## What Just Happened

Refactor besar — 3 bug fixed + schema restructuring:

1. **Nilai dipisah dari progress** — skor sekarang di `users/{uid}/nilai/{ch-type}`, progress cuma boolean
2. **Tugas jadi MCQ** — sebelumnya cuma tombol "Tandai Selesai", sekarang render MCQTest kayak postTest
3. **Answer tracking** — submission murid tercatat di `materi/{ch}/tasks[{idx}].answer[]` dan `postTestOptional.answer[]`

## Current State

- **Deployed:** https://lmspasraman.web.app ✅
- **Repo:** https://github.com/yodhasu/LMS-pasraman (commit `ec01ce8`)
- **Build:** passing — TypeScript clean, 15 static pages

## Firestore Schema

```
materi/{bab-1..bab-6}
├── preTest: MCQ[] | null
├── tasks: [{ id, title, description, dueDate, type: "mcq", questions: MCQ[], answer: TaskAnswer[] }]
├── postTestMandatory: MCQ[]
├── postTestOptional: { instruction, answer: PengayaanAnswer[] } | null
└── ... (materialContent, videoUrl, coverEmoji, etc.)

users/{uid}
├── displayName, email, role
└── progress: {
      "bab-1": { pretest: bool, materi: bool, tugas: bool, posttest: bool, complete: bool },
      ...
    }

users/{uid}/nilai/{babId}-{type}
└── { chapterId, type: "pretest"|"posttest"|"tugas"|"pengayaan", score, submittedAt }
```

### Answer Types
- **TaskAnswer:** `{ userId, userName, answers: {qId: selectedIndex}, score, submittedAt }`
- **PengayaanAnswer:** `{ userId, userName, link, submittedAt }`

## Key Files

| File | Role |
|------|------|
| `src/lib/types.ts` | All types: MCQ, ChapterTask, ChapterProgressDetail, ScoreRecord, TaskAnswer, PengayaanAnswer |
| `src/lib/mock-data.ts` | Seed data — CHAPTERS export with MCQ tasks + empty answer arrays |
| `src/lib/firestore-data.ts` | Hooks: useChapters, useStudentProgress, **useNilai** (new); mutations: markChapterStep, saveScore, submitTaskAnswer, submitPengayaanLink, seedChapters |
| `src/components/MCQTest.tsx` | MCQ widget — callback: `onComplete(score, answers)`; supports type='tugas' |
| `src/app/materi/[chapterId]/ChapterClient.tsx` | Chapter view — all progress from Firestore, tasks render MCQTest, pengayaan submits to answer[] |
| `src/app/dashboard/page.tsx` | Dashboard — uses useNilai for score cards, computeTaskInbox with userId |
| `src/app/nilai/page.tsx` | Nilai page — groups useNilai scores by chapter |
| `src/app/tugas/page.tsx` | Tugas inbox — uses computeTaskInbox(chapters, progress, userId) |

## Auth / Login

- siswa001@pasraman.id / pasraman123
- guru001@pasraman.id / pasraman123
- Domain otomatis: username → username@pasraman.id

## Deploy Commands

```bash
cd ~/Documents/Code/LMS-pasraman
npm run build
firebase deploy --only hosting
```

## ⚠️ Known: Reset Data Required

User yang udah ada progress lama harus klik **"🔁 Reset Data"** di dashboard — struktur `users/{uid}` dan `materi` berubah total dari versi sebelumnya.

## Potential Next Steps

- [ ] Tes end-to-end: login → seed → kerjakan bab 1 lengkap (pre-test → materi → tugas MCQ → post-test → pengayaan) → cek bab 2 unlock → cek nilai page
- [ ] Teacher view / grading interface
- [ ] Firestore security rules (currently test mode)
- [ ] Tugas page: tampilkan jawaban MCQ yang sudah di-submit
