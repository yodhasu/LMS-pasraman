# LMS Pasraman — Handover
> 2026-06-03 | Vela → next session (Vercel Migration)

## What Just Happened

Bulk teacher CRUD + batch-save + Vercel migration:

1. **Batch-save CRUD** — all chapter edits in local state, saved via single RPC `save_chapter_batch`. No more per-field API calls.
2. **Inline editing** — no modals, no redirects. Teacher edits directly on the page.
3. **Color picker** — 8 visual color buttons instead of manual Tailwind class input.
4. **Post-test label fix** — correctly shows "Post-test dinonaktifkan".
5. **Toast + redirect** — after save, toast 1.5s then redirect to `/materi`.
6. **Rate-limit login** — 5 failed attempts → 60s lock, reset on success.
7. **Multiple tasks bug fix** — `handleTugasComplete` skips correct task index.
8. **Preview guru fix** — `isTeacher={teacherView}` instead of hardcoded `false`.
9. **Firebase removed** — no more `firebase.json`, `.firebaserc`, `firestore.rules`. Full Supabase.
10. **Vercel ready** — `output: 'export'` removed, standard Next.js build. 16 static pages.

## Current State

- **Build:** passing — TypeScript clean, 16 pages (15 static + 1 SSG with `generateStaticParams`)
- **Repo:** https://github.com/yodhasu/LMS-pasraman
- **Live (old):** `lmspasraman.web.app` (Firebase — will be decommissioned)
- **Live (new):** deploy via Vercel (connect repo in Vercel dashboard)
- **Auth:** Supabase Auth, username+password, `app_users` with role (student/teacher/admin)
- **Envs needed for Vercel:**
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://qohkwhtgazvhcygqnehg.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`

## DB Schema (Supabase)

```
chapters (id, order_index, title, subtitle, description, cover_emoji, cover_color, ...)
├── chapter_materials (id, chapter_id, section_order, type, content, caption)
├── chapter_tasks (id, chapter_id, title, description, due_date, task_order)
├── mcq_questions (id, chapter_id, task_id, assessment, question_order, ...)
└── pengayaan_prompts (chapter_id, instruction)

app_users (id → auth.users.id, username, password_hash, display_name, role)
├── chapter_progress (user_id, chapter_id, pretest/materi/tugas/posttest, complete)
├── scores (user_id, chapter_id, type, score)
├── material_progress (user_id, material_id, viewed, viewed_at)
├── task_submissions (task_id, user_id, answers, score)
└── pengayaan_submissions (chapter_id, user_id, link)
```

### RPC Functions
- `verify_user_password(text, text)` — auth helper (username, password_hash)
- `create_app_user(text, text, text)` — create user with role
- `is_teacher_or_admin()` — role check
- `save_chapter_batch(uuid, jsonb, jsonb, jsonb, jsonb)` — atomic batch save
- `delete_chapter_cascade(uuid)` — delete chapter + all relations
- `reset_lms_prototype_data(uuid)` — full prototype reset

## Auth

- **Login:** username + password → internal email auto-generated → Supabase Auth
- **Test accounts:** `siswa001` / `pasraman123`, `guru001` / `pasraman123`, `santri001` / `pasraman123`
- **Role:** `guru001` = teacher

## Key Files (updated)

| File | What changed |
|------|-------------|
| `next.config.ts` | Removed `output: 'export'`, `images.unoptimized`. Clean for Vercel. |
| `ChapterClient.tsx` | Batch-save state, inline editor, Simpan Perubahan + Hapus Bab at bottom |
| `src/app/materi/[chapterId]/page.tsx` | `generateStaticParams` fetches all chapter IDs from Supabase |
| `src/lib/supabase-data.ts` | Batch save/delete RPCs, data hooks |
| `src/lib/AuthContext.tsx` | Rate-limit login (5 attempts → 60s lock) |
| `src/components/MaterialSection.tsx` | Inline editable materials |
| `src/components/QuestionEditor.tsx` | Inline question editor |
| `src/components/ColorPicker.tsx` | 8-color visual picker |
| `src/components/MCQResult.tsx` | Show correct answers for wrong questions only |
| `firebase.json` | **DELETED** — no longer Firebase-hosted |
| `.firebaserc` | **DELETED** |
| `firestore.rules` | **DELETED** |

## Deploy Commands

```bash
cd ~/Documents/Code/LMS-pasraman
pnpm build
vercel --prod
```

**OR:** connect GitHub repo to Vercel dashboard → auto-deploys on push to main.

## ⚠️ Before Deploy to Vercel

1. **Set env vars in Vercel dashboard:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. **Connect repo** at https://vercel.com → Add New Project → Import `yodhasu/LMS-pasraman`
3. **Run RLS migration** on Supabase if not yet applied
4. **No firebase.json needed** — Vercel handles routing natively
5. **Dynamic routes** (`[chapterId]`) work via `generateStaticParams` + on-demand SSR for new chapters

## Known Limitations

- **Seeded passwords** (`pasraman123`) hardcoded in migration files — should use env vars
- **Correct answer keys** exposed to anon via RLS on `mcq_questions` — needs a student/teacher view split
- **Remove `window.location.reload()`** in dashboard reset — should use React state refresh
- **Teacher multi-class flow** — schema planned but not implemented (see `docs/plans/`)
- **AGY review:** race condition in `createEmptyChapter` (unlikely with single teacher)
