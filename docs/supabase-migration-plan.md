# LMS Pasraman — Supabase Migration Plan

## Goal

Move LMS Pasraman's relational learning data from Firestore to Supabase PostgreSQL while keeping Firebase Auth and Firebase Hosting.

## Architecture

```txt
Next.js static app on Firebase Hosting
  ├─ Firebase Auth: login/session/UID
  └─ Supabase PostgreSQL: chapters, tasks, questions, progress, scores, submissions
```

The frontend sends the Firebase ID token to Supabase through `@supabase/supabase-js`:

```ts
createClient(url, publishableKey, {
  accessToken: async () => (await auth.currentUser?.getIdToken(false)) ?? null,
})
```

## Manual Supabase prerequisite

In Supabase dashboard:

1. Open project `qohkwhtgazvhcygqnehg`.
2. Auth → Third-party Auth.
3. Add Firebase provider.
4. Firebase Project ID: `lmspasraman`.
5. Firebase users need custom claim:

```json
{ "role": "authenticated" }
```

Without that custom claim, Supabase treats Firebase requests as `anon`, so `to authenticated` RLS policies won't apply.

## Files added

- `supabase/migrations/20260525_initial_lms_pasraman_schema.sql`

## Data model

### `app_users`

Firebase user mirror. Uses `firebase_uid text primary key`, not Supabase `auth.users.id`.

Fields:

- `firebase_uid`
- `email`
- `username`
- `display_name`
- `role`: `student | teacher | admin`
- `class_name`
- `semester`

### Content tables

- `chapters`
- `chapter_tasks`
- `mcq_questions`
- `pengayaan_prompts`

Firestore nested chapter fields become normalized rows:

- `materi/{chapter}.preTest[]` → `mcq_questions` where `assessment = 'pretest'`
- `materi/{chapter}.postTestMandatory[]` → `mcq_questions` where `assessment = 'posttest'`
- `materi/{chapter}.tasks[]` → `chapter_tasks`
- `materi/{chapter}.tasks[].questions[]` → `mcq_questions` where `assessment = 'tugas'`
- `materi/{chapter}.postTestOptional.instruction` → `pengayaan_prompts`

### Student state tables

- `chapter_progress`
- `scores`
- `task_submissions`
- `pengayaan_submissions`

Firestore nested/subcollection data becomes relational:

- `users/{uid}.progress.{chapter}` → `chapter_progress`
- `users/{uid}/nilai/{chapter-type}` → `scores`
- `materi/{chapter}.tasks[].answer[]` → `task_submissions`
- `materi/{chapter}.postTestOptional.answer[]` → `pengayaan_submissions`

## RLS model

Helper:

```sql
public.current_firebase_uid() = auth.jwt()->>'sub'
```

Rule shape:

- Students can read/write their own progress, scores, and submissions.
- Teachers/admins can read/manage all student state.
- Signed-in users can read learning content.
- Teachers/admins can manage learning content.

## Known MVP trade-off

`mcq_questions.correct_index` remains readable by authenticated users because the current frontend grades MCQs client-side. This matches existing behavior but is not exam-secure.

Better later:

- hide `correct_index` behind a view
- add an RPC function for grading
- let frontend submit answers only, server returns score

For this MVP migration, keeping frontend behavior stable is the better move.

## Execution order

1. Confirm Firebase third-party auth integration in Supabase dashboard.
2. Set Firebase custom claim `{ role: 'authenticated' }` for existing users.
3. Apply SQL migration to Supabase.
4. Generate Supabase TS types.
5. Install frontend dependency:

```bash
pnpm add @supabase/supabase-js
```

6. Add env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qohkwhtgazvhcygqnehg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

7. Add `src/lib/supabase.ts`.
8. Add a Supabase data adapter matching current `firestore-data.ts` exports.
9. Seed content from `src/lib/mock-data.ts` or `scripts/seed-firestore.ts` into Supabase.
10. Switch app imports from Firestore adapter to Supabase adapter.
11. Build and test locally.
12. Deploy Firebase Hosting.

## Verification checklist

- Supabase tables exist.
- RLS enabled on all public tables.
- Firebase-authenticated user can read chapters.
- Student can only read own `chapter_progress`, `scores`, `task_submissions`, `pengayaan_submissions`.
- Teacher/admin can read all student rows.
- `npm run build` passes.
- Existing login still works on Firebase Hosting.
- Dashboard, Materi, Tugas, Nilai still render.
