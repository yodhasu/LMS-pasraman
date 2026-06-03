# LMS Pasraman Prototype - Teacher Flow + Reset Refactor Plan

> For Hermes: this is a planning doc only. Do not treat completed items below as already implemented.

**Goal:** Fix prototype-phase data reset and teacher authoring behavior, then reshape teacher Materi flow so teachers choose an assigned class first before entering chapter view.

**Architecture:** Keep prototype changes additive and low-risk. First stabilize the existing prototype lifecycle (single-call reset, no mutation-triggered full reloads, no brittle hard guard). Then add class-aware teacher navigation with minimal schema expansion: `classes` + teacher-class assignment. Do not push `class_id` into all progress tables yet unless product requirements actually need per-class progress isolation.

**Tech stack:** Next.js app router, Supabase client, Supabase SQL migrations, React client hooks.

---

## What is verified right now

### Current live code facts
- `resetPrototypeData()` already calls a single RPC: `reset_lms_prototype_data()` in `src/lib/supabase-data.ts:599-609`.
- The reset RPC already does bulk clear + reseed in one DB function in `supabase/migrations/20260602_prototype_reset_rpc.sql`.
- The dashboard still does `window.location.reload()` after successful reset in `src/app/dashboard/page.tsx:65-69`.
- Teacher chapter/material mutations still force full page reload in `src/app/materi/[chapterId]/ChapterClient.tsx:89-128`.
- `Materi` teacher entry is still chapter-first, not class-first, in `src/app/materi/page.tsx`.
- Current schema only has `app_users.class_name` text; there is no `classes` table and no teacher↔class assignment table yet.
- `createEmptyChapter()` still has a duplicate-ID guard that returns an error string (`Gunakan seed script`) in `src/lib/supabase-data.ts:764-812`.

### Product assumptions for next pass
- Prototype mode is active.
- Teacher can teach multiple classes.
- Student likely still belongs to one active class for now.
- Global chapter content is acceptable for this phase.
- Per-class progress/state is NOT yet required unless confirmed later.

---

## Priority order

### P0 - stabilize prototype lifecycle and remove disruptive reload behavior
1. Remove full-page reload after teacher/admin reset success.
2. Remove full-page reload after create/update/delete material and chapter metadata save.
3. Replace reloads with targeted data refresh from hooks/local state.
4. Remove or soften prototype hard-guard behavior that assumes fixed seed shape.
5. Reproduce the "teacher adds bab after reset and gets error" issue with actual browser flow before patching blindly.

### P1 - teacher Materi flow redesign
1. Teacher sees assigned class list first.
2. Teacher clicks a class.
3. Then teacher sees chapter list within that class context.
4. Student flow remains chapter-first and mostly unchanged.

### P2 - schema expansion for teacher multi-class support
1. Add `classes` table.
2. Add `teacher_class_assignments` join table.
3. Add `class_id` relation on users (keep transitional compatibility if needed).
4. Seed at least minimal class + teacher assignment data for prototype/demo.

### P3 - optional later hardening
1. Add per-class filtering on progress/inbox views.
2. Decide whether chapter visibility or assignment is global or per-class.
3. Only if needed: extend progress/submission tables with `class_id`.

---

## Best implementation path

## Phase A - Fix prototype reset and mutation UX first

### Task A1 - audit all mutation-triggered reloads
**Objective:** Replace the current brute-force refresh pattern with explicit state reload.

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/materi/[chapterId]/ChapterClient.tsx`
- Modify: `src/lib/supabase-data.ts`

**Implementation notes:**
- Introduce explicit refresh functions from data hooks where missing.
- For chapter-material mutations, expose a `refreshMaterials()` function from `useChapterMaterials()`.
- For chapter list refresh, expose `refreshChapters()` from `useChapters()`.
- For dashboard progress refresh, expose refresh functions instead of using `window.location.reload()`.
- Keep success messages/toasts, but refresh only the relevant data slices.

**Verification target:**
- Add material -> UI updates without full page refresh.
- Edit material -> UI updates in place.
- Delete material -> item disappears without page jump.
- Reset prototype -> counts return to baseline without manual reload.

### Task A2 - remove hard prototype guard behavior
**Objective:** Stop treating prototype content churn as an error state.

**Files:**
- Modify: `src/lib/supabase-data.ts`
- Search any remaining UI checks in `src/app/**` and `src/components/**`

**Implementation notes:**
- Remove any seed-shape assumptions from UI logic.
- If `createEmptyChapter()` duplicate guard is only there to enforce a rigid seed sequence, replace it with a more reliable next-ID strategy.
- Prefer deriving next chapter ID from max numeric suffix, not from fragile assumptions.
- Error messages should describe real DB conflicts, not tell the teacher to use a seed script during normal authoring.

**Verification target:**
- Teacher can add a new chapter after reset.
- Extra chapters no longer make the prototype feel "invalid".

### Task A3 - reproduce and fix the add-bab-after-reset failure
**Objective:** Confirm the actual failing path before editing the wrong layer.

**Files:**
- Inspect: `src/app/materi/page.tsx`
- Inspect: `src/lib/supabase-data.ts`
- Inspect: Supabase browser console/network when reproducing

**Implementation notes:**
- Run the app.
- Login as teacher/admin.
- Click reset prototype.
- Then add bab from teacher Materi flow.
- Capture exact failing response/message/console error.
- Patch only after the real failing condition is confirmed.

**Verification target:**
- Real reproduction notes recorded.
- Fix validated in-browser, not just assumed from source scan.

---

## Phase B - Add class-aware teacher flow with minimal schema pain

### Task B1 - add classes schema
**Objective:** Create a proper class entity instead of relying on `app_users.class_name` text.

**Files:**
- Create migration: `supabase/migrations/<timestamp>_add_classes_and_teacher_assignments.sql`
- Update docs: `docs/supabase-migration-plan.md`

**Schema proposal:**
```sql
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  semester text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_class_assignments (
  teacher_id uuid not null references public.app_users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (teacher_id, class_id)
);
```

**Important:** adapt key types to the actual `app_users.id` type in the current schema before applying migration.

### Task B2 - bridge users to class_id
**Objective:** Move from `class_name` text to relational class reference without over-migrating.

**Files:**
- Modify migration plan docs
- Create migration touching `app_users`
- Update any auth/profile fetch logic that reads user class data

**Implementation notes:**
- Add nullable `class_id` to `app_users`.
- Keep `class_name` temporarily if needed for transition.
- Backfill `class_id` from existing `class_name` seed values if available.
- Student can remain single-class for now.

### Task B3 - add teacher class queries
**Objective:** Give the frontend a clean source of truth for "kelas saya".

**Files:**
- Modify: `src/lib/supabase-data.ts`
- Maybe add types in: `src/lib/types.ts`

**Implementation notes:**
- Create `useTeacherClasses()` hook.
- Return only classes assigned to the signed-in teacher/admin.
- Admin can either see all classes or use the same assigned-class model for now; pick one explicitly.

### Task B4 - redesign Materi page for teachers
**Objective:** Teacher lands on class list first.

**Files:**
- Modify: `src/app/materi/page.tsx`
- Create if needed: `src/app/materi/kelas/[classId]/page.tsx`
- Possibly create shared class card component

**Implementation notes:**
- Student path: keep current chapter grid.
- Teacher path: render class cards instead of direct chapter cards.
- Clicking class routes into chapter list for that class.
- The chapter list can still show the same global chapters during prototype phase.

**Verification target:**
- Teacher with 2 assigned classes sees 2 class cards first.
- Entering a class shows chapter list.
- Student still sees normal chapter list directly.

---

## Phase C - defer these unless requirement becomes explicit

### Task C1 - per-class progress isolation
Do NOT do this in the same pass unless confirmed necessary.

Would require touching:
- `chapter_progress`
- `scores`
- `task_submissions`
- `pengayaan_submissions`
- `material_progress`
- related RLS/query logic

This is medium-ribet and should stay out of the first prototype fix batch.

---

## Current bugs / needs to fix

### Confirmed
1. **Full page refresh after reset success**
   - File: `src/app/dashboard/page.tsx`
   - Why it matters: breaks prototype flow and makes reset feel heavy.

2. **Full page refresh after teacher material CRUD and metadata save**
   - File: `src/app/materi/[chapterId]/ChapterClient.tsx`
   - Why it matters: every add/edit/delete/save bounces the whole page.

3. **Teacher Materi flow ignores multi-class reality**
   - File: `src/app/materi/page.tsx`
   - Why it matters: current UX assumes a teacher only has one implicit class context.

4. **Schema still models class as plain text**
   - File: current DB schema / migration docs
   - Why it matters: blocks proper teacher-class assignment.

### Suspected but not fully proven yet
5. **Teacher add-bab-after-reset error path**
   - Suspected layers: `createEmptyChapter()` ID/guard logic, stale state after reset, or browser-side state mismatch.
   - Needs real repro next session.

6. **Prototype hard-rule / seed-shape assumption still leaking into teacher authoring**
   - Not fully proven as a single code branch yet.
   - Needs one search + repro pass during implementation.

---

## Next session to-do list (sorted)

### First 15 minutes
1. Start app locally.
2. Reproduce teacher flow in browser.
3. Verify exact add-bab-after-reset failure.
4. Capture console/network evidence.

### Then implement P0
5. Add refresh functions to data hooks.
6. Remove `window.location.reload()` from dashboard reset path.
7. Remove `window.location.reload()` from chapter material CRUD path.
8. Remove `window.location.reload()` from chapter metadata save path.
9. Re-test full prototype authoring flow.

### Then implement P1/P2
10. Add `classes` migration.
11. Add `teacher_class_assignments` migration.
12. Add `class_id` bridge on users.
13. Add teacher class query hook.
14. Convert teacher Materi landing page into assigned-class list.
15. Add class -> chapter route.
16. Re-test teacher with multiple classes.
17. Re-test student flow to ensure no regression.

### Nice-to-have after that
18. Improve reset success UI with returned counts and no forced delay.
19. Add empty states for teacher with no assigned classes.
20. Decide whether admin sees all classes or assigned classes only.

---

## What should NOT be done in the same batch
- Do not add `class_id` to all progress/submission tables yet.
- Do not redesign the whole LMS information architecture.
- Do not introduce per-class custom chapter copies yet.
- Do not refactor RLS broadly until the prototype flow is stable.

---

## Recommended implementation stance
- Prototype reset stays blunt and reliable.
- Teacher CRUD should feel local and immediate, not page-reload based.
- Multi-class teacher support should be additive, not a full DB rewrite.
- Per-class progress is a separate future decision, not a hidden side quest for this batch.
