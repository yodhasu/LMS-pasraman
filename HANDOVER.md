# LMS Pasraman — Handover
> 2026-06-02 | Vela → next session

## What Just Happened

Teacher features implemented + auth cleanup + AGY-reviewed:

1. **Username+password auth** — login pure username (no email visible), internal email `{username}@pasraman.id` handled by Supabase Auth. Migration `20260602_username_password_auth.sql` adds bcrypt password hashing.
2. **Teacher view** — guru001 auto-detects as teacher. Materi page shows "+ Tambah Bab" button. Chapter detail has "✏️ Edit Bab" link.
3. **Material management** — red X delete button on each material box (teacher only), with confirmation dialog.
4. **Bab creation flow** — Tambah Bab → creates placeholder chapter in Supabase → redirects to `/materi/bab-X?teacher=true` with editable fields.
5. **Editable chapter metadata** — title, subtitle, description, coverEmoji, coverColor all inline-editable for teachers with save button.
6. **RLS hardened** — `chapter_materials` and `material_progress` now have proper RLS policies (`20260602_chapter_materials_rls.sql`).

## Current State

- **Deploy-ready:** build passing — TypeScript clean, 15 static pages
- **Repo:** https://github.com/yodhasu/LMS-pasraman (uncommitted changes)
- **Auth:** Supabase Auth, username+password, `app_users` with role (student/teacher/admin)

## DB Schema (Supabase)

```
chapters (id, order_index, title, subtitle, description, cover_emoji, cover_color, ...)
├── chapter_materials (id, chapter_id, section_order, type, content, caption)  ← NEW RLS
├── chapter_tasks (id, chapter_id, title, description, due_date, task_order)
├── mcq_questions (id, chapter_id, task_id, assessment, question_order, ...)
└── pengayaan_prompts (chapter_id, instruction)

app_users (id → auth.users.id, username, password_hash, display_name, role)
├── chapter_progress (user_id, chapter_id, pretest/materi/tugas/posttest, complete)
├── scores (user_id, chapter_id, type, score)
├── material_progress (user_id, material_id, viewed, viewed_at)               ← NEW RLS
├── task_submissions (task_id, user_id, answers, score)
└── pengayaan_submissions (chapter_id, user_id, link)
```

## Auth

- **Login:** username + password → internal email auto-generated → Supabase Auth
- **Test accounts:** `siswa001` / `pasraman123`, `guru001` / `pasraman123`, `santri001` / `pasraman123`
- **Role:** `guru001` should be teacher — run `scripts/seed-teacher.cjs` or fix manually if not

## Key Files (updated)

| File | What changed |
|------|-------------|
| `src/lib/supabase-data.ts` | Removed VALID_CHAPTER_IDS hardcod. Added deleteChapterMaterial, createEmptyChapter, updateChapterMetadata. Dynamic progress map. |
| `src/app/materi/page.tsx` | Tambah Bab button + create flow for teachers |
| `src/app/materi/[chapterId]/ChapterClient.tsx` | Teacher mode with editable fields, ?teacher=true param, useEffect init, error checking on delete/save |
| `src/app/materi/[chapterId]/page.tsx` | Dynamic generateStaticParams fetches all chapter IDs from Supabase at build time |
| `src/components/ChapterContent.tsx` | isTeacher prop, red X delete button on materials |
| `supabase/migrations/20260602_username_password_auth.sql` | Username+password auth migration |
| `supabase/migrations/20260602_chapter_materials_rls.sql` | RLS policies for chapter_materials + material_progress |
| `scripts/seed-teacher.cjs` | Teacher account seeder |

## Deploy Commands

```bash
cd ~/Documents/Code/LMS-pasraman
npm run build
firebase deploy --only hosting
```

## ⚠️ Before Deploy

1. **Run RLS migration** on Supabase: `supabase/migrations/20260602_chapter_materials_rls.sql`
2. **Ensure guru001 is teacher** — `scripts/seed-teacher.cjs` or manual SQL
3. **guru001 password** — if created via dashboard, set password via SQL or reset

## Known Limitations

- **Chapter materials** table may have been created manually — migration includes `create table if not exists` to be safe
- **New chapters beyond bab-6** need rebuild to appear as static pages (generateStaticParams fetches at build time)
- **Delete material** still uses `window.location.reload()` — suboptimal but functional for static export
- **AGY review:** race condition in createEmptyChapter (unlikely with single teacher), unsaved `initDone` anti-pattern fixed to useEffect
